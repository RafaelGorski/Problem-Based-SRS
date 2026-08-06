/**
 * Sandboxed scenario runner for Problem-Based SRS skill-behavior tests.
 *
 * Adapted from pbakaus/impeccable's skill-behavior/harness.mjs. Differences:
 *   - Targets the current AI SDK: tools use `inputSchema` and generateText
 *     uses `stopWhen` with a step-count condition.
 *   - Cross-platform: the canonical skill is COPIED into the workspace (Windows
 *     symlinks need privilege), and the optional shell tool runs through the
 *     OS default shell.
 *
 * Each scenario:
 *   1. prepareWorkspace() — temp dir; copies the canonical skill's SKILL.md and
 *      reference/*.md into <ws>/reference (+ SKILL.md), and seeds fixture files.
 *   2. runTurn() — inlines SKILL.md as the system prompt and runs generateText
 *      with workspace-scoped tools (read, write, list, run_command, ask_user).
 *   3. Every tool call is recorded into a `trace` the tests assert on.
 *
 * The trace is the source of truth, not the model's free-form reply.
 */
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { simulatedSrsAnswer } from "./fixtures.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const SKILL_DIR = path.join(REPO_ROOT, "skills", "problem-based-srs");
const SKILL_MD = path.join(SKILL_DIR, "SKILL.md");
const REFERENCE_DIR = path.join(SKILL_DIR, "reference");
const MAX_CMD_OUTPUT_BYTES = 200_000;

/** Read SKILL.md, strip YAML frontmatter, and prepend a short harness preamble. */
function loadSkillBody() {
  let md = fs.readFileSync(SKILL_MD, "utf8");
  if (md.startsWith("---")) {
    const end = md.indexOf("\n---", 3);
    if (end !== -1) md = md.slice(end + 4).trimStart();
  }
  const preamble = [
    "You are the Problem-Based SRS skill, operating inside a workspace.",
    "The skill's reference files are in ./reference/ (e.g. ./reference/problems.md).",
    "Save artifacts under ./.spec/ using the write tool.",
    "When you need to ask the user something, you MUST use the ask_user tool.",
    "",
  ].join("\n");
  return preamble + md.trim();
}

export const SKILL_BODY = loadSkillBody();

/**
 * Create a temp workspace and prepopulate it with the skill + fixture files.
 * `files` maps workspace-relative paths to contents (e.g. README.md, .spec/...).
 */
export function prepareWorkspace({ files = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srs-skill-test-"));
  // Make the skill's reference files loadable by the agent's read tool.
  fs.cpSync(REFERENCE_DIR, path.join(dir, "reference"), { recursive: true });
  fs.copyFileSync(SKILL_MD, path.join(dir, "SKILL.md"));
  for (const [name, contents] of Object.entries(files)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  return dir;
}

export function cleanupWorkspace(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort — the OS reaps temp dirs.
  }
}

function safeResolve(root, userPath) {
  if (typeof userPath !== "string" || !userPath.length) return { error: "path is required" };
  if (userPath.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(userPath)) {
    return { error: "absolute paths are not allowed" };
  }
  const resolved = path.resolve(root, userPath);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || rel.split(path.sep).includes("..")) {
    return { error: "path escapes the workspace" };
  }
  return resolved;
}

function execShell(workspace, command, timeoutMs = 20_000) {
  return new Promise((resolve) => {
    const proc = spawn(command, { cwd: workspace, shell: true });
    let stdout = "";
    let stderr = "";
    const cap = (cur, str) =>
      cur.length + str.length > MAX_CMD_OUTPUT_BYTES ? cur + str.slice(0, MAX_CMD_OUTPUT_BYTES - cur.length) : cur + str;
    proc.stdout.on("data", (c) => (stdout = cap(stdout, c.toString())));
    proc.stderr.on("data", (c) => (stderr = cap(stderr, c.toString())));
    const timer = setTimeout(() => {
      proc.kill();
      resolve({ exitCode: null, stdout, stderr: stderr + "\n[TIMED OUT]" });
    }, timeoutMs);
    proc.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stdout, stderr });
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ exitCode: null, stdout, stderr: stderr + `\n[SPAWN ERROR] ${String(err)}` });
    });
  });
}

/**
 * Build workspace-scoped tools + the trace they write into.
 * Returns `{ tools, trace }`; the trace mutates in place as the agent runs.
 */
export function makeTools(workspace, simulatedUser = {}) {
  const trace = {
    toolCalls: [],
    commandLines: [],
    commandOutputs: [],
    readPaths: [],
    writePaths: [],
    listPaths: [],
    questionCalls: [],
    questionAnswers: [],
  };
  function record(name, input) {
    const call = { name, input, mutatedPaths: [] };
    trace.toolCalls.push(call);
    if (name === "run_command" && typeof input?.command === "string") trace.commandLines.push(input.command);
    if (name === "read" && typeof input?.path === "string") trace.readPaths.push(input.path);
    if (name === "write" && typeof input?.path === "string") trace.writePaths.push(input.path);
    if (name === "list" && typeof input?.path === "string") trace.listPaths.push(input.path);
    if (name === "ask_user") trace.questionCalls.push(input);
    return call;
  }

  const tools = {
    read: tool({
      description: "Read a file from the workspace. Path must be workspace-relative.",
      inputSchema: z.object({ path: z.string().describe("Workspace-relative file path.") }),
      execute: async ({ path: p }) => {
        record("read", { path: p });
        const resolved = safeResolve(workspace, p);
        if (typeof resolved !== "string") return `Error: ${resolved.error}`;
        if (!fs.existsSync(resolved)) return `File not found: ${p}`;
        if (fs.statSync(resolved).isDirectory()) return `Path is a directory: ${p}. Use list.`;
        return fs.readFileSync(resolved, "utf8");
      },
    }),
    write: tool({
      description: "Write or overwrite a file in the workspace. Creates parent directories.",
      inputSchema: z.object({
        path: z.string().describe("Workspace-relative file path."),
        contents: z.string().describe("Full file contents."),
      }),
      execute: async ({ path: p, contents }) => {
        const call = record("write", { path: p, contents });
        const resolved = safeResolve(workspace, p);
        if (typeof resolved !== "string") return `Error: ${resolved.error}`;
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, contents ?? "");
        call.mutatedPaths = [p.replace(/\\/g, "/")];
        return `Wrote ${Buffer.byteLength(contents ?? "", "utf8")} bytes to ${p}`;
      },
    }),
    list: tool({
      description: "List a workspace directory. Defaults to the workspace root.",
      inputSchema: z.object({ path: z.string().default(".").describe("Workspace-relative directory.") }),
      execute: async ({ path: p }) => {
        record("list", { path: p });
        const resolved = safeResolve(workspace, p);
        if (typeof resolved !== "string") return `Error: ${resolved.error}`;
        if (!fs.existsSync(resolved)) return `Not found: ${p}`;
        if (!fs.statSync(resolved).isDirectory()) return `Not a directory: ${p}`;
        const entries = fs.readdirSync(resolved).map((name) =>
          fs.statSync(path.join(resolved, name)).isDirectory() ? `${name}/` : name,
        );
        return entries.length ? entries.join("\n") : "(empty)";
      },
    }),
    run_command: tool({
      description: "Run a shell command in the workspace root (e.g. to inspect files).",
      inputSchema: z.object({ command: z.string().describe("The shell command to execute.") }),
      execute: async ({ command }) => {
        record("run_command", { command });
        const res = await execShell(workspace, command);
        const out = `exit=${res.exitCode}\n${res.stdout ? `stdout:\n${res.stdout}` : ""}${res.stderr ? `\nstderr:\n${res.stderr}` : ""}`;
        trace.commandOutputs.push(out);
        return out;
      },
    }),
    ask_user: tool({
      description:
        "Ask the user 1-4 structured questions and wait for answers. Use this for the mandatory Discovery Interview and any clarification, instead of asking in prose.",
      inputSchema: z.object({
        questions: z
          .array(
            z.object({
              header: z.string().optional(),
              question: z.string(),
              options: z
                .array(z.object({ label: z.string(), description: z.string().optional() }))
                .optional(),
              multiSelect: z.boolean().optional(),
            }),
          )
          .min(1)
          .max(4),
      }),
      execute: async ({ questions }) => {
        record("ask_user", { questions });
        const answers = {};
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const custom =
            typeof simulatedUser.answer === "function"
              ? await simulatedUser.answer(q, i, { workspace, trace })
              : undefined;
          answers[q.question] = custom ?? simulatedSrsAnswer(q);
        }
        trace.questionAnswers.push(answers);
        return JSON.stringify({ answers });
      },
    }),
  };
  return { tools, trace };
}

/** Run one scenario turn against a model. */
export async function runTurn({ workspace, model, userPrompt, priorMessages = [], maxSteps = 10, simulatedUser = {} }) {
  const { tools, trace } = makeTools(workspace, simulatedUser);
  const messages = [...priorMessages, { role: "user", content: userPrompt }];
  let result;
  try {
    result = await generateText({
      model,
      system: SKILL_BODY,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
    });
  } catch (err) {
    throw new Error(`LLM behavior turn failed before completing: ${String(err)}`, { cause: err });
  }
  const generated = result.response?.messages ?? [];
  return {
    trace,
    text: result.text ?? "",
    finishReason: result.finishReason,
    usage: result.usage,
    responseMessages: [...messages, ...generated],
  };
}

/* ---- Declarative trace helpers (keep assertions readable) ---- */

export function commandsMatching(trace, substring) {
  return trace.commandLines.filter((c) => c.toLowerCase().includes(substring.toLowerCase()));
}

export function readsMatching(trace, substring) {
  return trace.readPaths.filter((p) => p.toLowerCase().includes(substring.toLowerCase()));
}

/** True if a file was loaded via read OR via a shell command (cat/type/Get-Content). */
export function fileLoaded(trace, filename) {
  return readsMatching(trace, filename).length > 0 || commandsMatching(trace, filename).length > 0;
}

/** Index of the first tool call matching a predicate, or -1. */
export function firstCall(trace, predicate) {
  return trace.toolCalls.findIndex(predicate);
}

/** Index of the first write whose path matches `pattern`, or -1. */
export function firstWrite(trace, pattern) {
  return firstCall(
    trace,
    ({ name, input }) => name === "write" && pattern.test((input?.path ?? "").replace(/\\/g, "/")),
  );
}

/** Index of the first ask_user call, or -1. */
export function firstQuestion(trace) {
  return firstCall(trace, ({ name }) => name === "ask_user");
}

export function summarizeTrace(trace) {
  return {
    totalCalls: trace.toolCalls.length,
    byName: trace.toolCalls.reduce((acc, c) => ((acc[c.name] = (acc[c.name] ?? 0) + 1), acc), {}),
    commandLines: trace.commandLines,
    readPaths: trace.readPaths,
    writePaths: trace.writePaths,
    questionCount: trace.questionCalls.length,
    questionAnswers: trace.questionAnswers,
  };
}

export function traceMessage(trace) {
  return JSON.stringify(summarizeTrace(trace), null, 2);
}
