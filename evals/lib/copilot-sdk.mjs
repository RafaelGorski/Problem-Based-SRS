// Thin wrapper around the GitHub Copilot CLI (`@github/copilot`) used as a
// programmatic SDK for skill evaluations. The CLI runs headlessly via
//   copilot -p "<prompt>" --allow-all-tools --output-format json
// and streams newline-delimited JSON (JSONL) events on stdout. This module
// turns that stream into structured results.
//
// Every function that touches the process boundary accepts an injectable
// implementation (spawnImpl / execFileImpl) so the harness is unit-testable
// without invoking the real CLI.

import { spawn, execFileSync } from "node:child_process";

/**
 * Parse a JSONL stream (one JSON object per line) into an array of events.
 * Non-JSON lines (banners, blank lines, partial writes) are ignored.
 * @param {string} text
 * @returns {object[]}
 */
export function parseJsonl(text) {
  const events = [];
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line[0] !== "{") continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Ignore non-JSON / partially-flushed lines.
    }
  }
  return events;
}

/**
 * Extract the assistant's final answer text from parsed events. Prefers the
 * non-ephemeral `assistant.message` events (which carry the complete content)
 * and falls back to concatenating streamed `assistant.message_delta` chunks.
 * @param {object[]} events
 * @returns {string}
 */
export function extractAssistantText(events) {
  const finals = (events ?? [])
    .filter((e) => e && e.type === "assistant.message" && e.data && typeof e.data.content === "string")
    .map((e) => e.data.content);
  if (finals.length) return finals.join("\n").trim();

  const deltas = (events ?? [])
    .filter((e) => e && e.type === "assistant.message_delta" && e.data && typeof e.data.deltaContent === "string")
    .map((e) => e.data.deltaContent);
  return deltas.join("").trim();
}

/**
 * Return the skills the CLI loaded for the session. The CLI may emit
 * `session.skills_loaded` multiple times as sources resolve; the last one wins.
 * @param {object[]} events
 * @returns {Array<{name:string, description?:string, source?:string, enabled?:boolean, path?:string}>}
 */
export function extractLoadedSkills(events) {
  let skills = [];
  for (const e of events ?? []) {
    if (e && e.type === "session.skills_loaded" && e.data && Array.isArray(e.data.skills)) {
      skills = e.data.skills;
    }
  }
  return skills;
}

/**
 * Collect every tool request the assistant issued during the run.
 * @param {object[]} events
 * @returns {object[]}
 */
export function extractToolCalls(events) {
  const calls = [];
  for (const e of events ?? []) {
    if (e && e.type === "assistant.message" && e.data && Array.isArray(e.data.toolRequests)) {
      for (const req of e.data.toolRequests) calls.push(req);
    }
  }
  return calls;
}

/**
 * Return the terminal `result` event (usage, exitCode, sessionId), if present.
 * @param {object[]} events
 * @returns {object|null}
 */
export function extractResult(events) {
  const list = events ?? [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i] && list[i].type === "result") return list[i];
  }
  return null;
}

/**
 * Build the argv for a headless copilot invocation.
 * @param {string} prompt
 * @param {{model?:string, outputFormat?:"json"|"text", extraArgs?:string[]}} [opts]
 * @returns {string[]}
 */
export function buildCopilotArgs(prompt, opts = {}) {
  const { model, outputFormat = "json", extraArgs = [] } = opts;
  const args = ["-p", String(prompt ?? ""), "--allow-all-tools", "--no-color", "--output-format", outputFormat];
  if (model) args.push("--model", model);
  return args.concat(extraArgs);
}

/**
 * Detect whether the copilot CLI is on PATH and runnable.
 * @param {{execFileImpl?:Function, command?:string}} [opts]
 * @returns {boolean}
 */
export function isCopilotAvailable(opts = {}) {
  const { execFileImpl = execFileSync, command = "copilot" } = opts;
  try {
    execFileImpl(command, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a headless copilot prompt and return a structured result.
 *
 * @param {string} prompt
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {string} [opts.model]
 * @param {number} [opts.timeoutMs]
 * @param {"json"|"text"} [opts.outputFormat]
 * @param {string[]} [opts.extraArgs]
 * @param {Function} [opts.spawnImpl]   injectable child_process.spawn
 * @param {string} [opts.command]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @returns {Promise<{code:number|null, stdout:string, stderr:string, events:object[], text:string, result:object|null, skills:object[], toolCalls:object[], durationMs:number}>}
 */
export function runCopilot(prompt, opts = {}) {
  const {
    cwd = process.cwd(),
    model,
    timeoutMs = 180000,
    outputFormat = "json",
    extraArgs = [],
    spawnImpl = spawn,
    command = "copilot",
    env = process.env,
  } = opts;

  const args = buildCopilotArgs(prompt, { model, outputFormat, extraArgs });

  return new Promise((resolve, reject) => {
    const started = Date.now();
    let settled = false;
    const settle = (fn) => (arg) => { if (!settled) { settled = true; fn(arg); } };
    const done = settle(resolve);
    const fail = settle(reject);

    let child;
    try {
      child = spawnImpl(command, args, { cwd, env, shell: false });
    } catch (err) {
      fail(err);
      return;
    }

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch { /* already gone */ }
      fail(new Error(`copilot timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });

    child.on("error", (err) => {
      clearTimeout(timer);
      fail(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const events = outputFormat === "json" ? parseJsonl(stdout) : [];
      const text = outputFormat === "json" ? extractAssistantText(events) : stdout.trim();
      done({
        code,
        stdout,
        stderr,
        events,
        text,
        result: extractResult(events),
        skills: extractLoadedSkills(events),
        toolCalls: extractToolCalls(events),
        durationMs: Date.now() - started,
      });
    });
  });
}
