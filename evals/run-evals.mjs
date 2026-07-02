#!/usr/bin/env node
// Live skill-eval runner.
//
// For each case in cases/*.case.mjs it:
//   1. loads the canonical action markdown (skills/problem-based-srs/reference/<action>.md),
//   2. builds a hermetic prompt and runs it through the Copilot CLI (headless),
//   3. grades the output with a deterministic rubric, and
//   4. optionally asks an LLM judge to score qualitative criteria.
//
// These evals call the real model, so they are OPT-IN. They run only when the
// copilot CLI is available AND either RUN_SKILL_EVALS=1 is set or --force is passed.
//
// Usage:
//   node run-evals.mjs                 # run all cases (needs RUN_SKILL_EVALS=1)
//   node run-evals.mjs --force         # run even without the env flag
//   node run-evals.mjs customer-needs  # run one case by name
//   node run-evals.mjs --no-judge      # skip the LLM judge, rubric only
//   node run-evals.mjs --model gpt-5.4 # choose the model

import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runCopilot, isCopilotAvailable } from "./lib/copilot-sdk.mjs";
import { loadAction, defaultSkillsRoot } from "./lib/skills.mjs";
import { gradeRubric, llmJudge } from "./lib/graders.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(HERE, "cases");

function parseArgs(argv) {
  const opts = { force: false, judge: true, model: undefined, timeoutMs: 240000, verbose: 0, filters: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") opts.force = true;
    else if (a === "--no-judge") opts.judge = false;
    else if (a === "--model") opts.model = argv[++i];
    else if (a === "--timeout") opts.timeoutMs = Number(argv[++i]) * 1000;
    else if (a === "--verbose" || a === "-v") opts.verbose += 1;
    else if (a === "-vv") opts.verbose += 2;
    else if (!a.startsWith("--")) opts.filters.push(a);
  }
  return opts;
}

async function loadCases(filters) {
  const files = (await readdir(CASES_DIR)).filter((f) => f.endsWith(".case.mjs"));
  const cases = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(CASES_DIR, f)).href);
    const c = mod.default;
    if (!c || !c.name) continue;
    if (filters.length && !filters.includes(c.name)) continue;
    cases.push(c);
  }
  return cases.sort((a, b) => a.name.localeCompare(b.name));
}

function fmtPct(x) {
  return `${(x * 100).toFixed(0)}%`;
}

function truncate(text, max) {
  const s = String(text ?? "");
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n… [truncated ${s.length - max} more chars]`;
}

function indent(text, pad = "      ") {
  return String(text ?? "")
    .split("\n")
    .map((l) => pad + l)
    .join("\n");
}

function logVerboseInputs(c, prompt, skill, opts) {
  if (opts.verbose < 1) return;
  console.log(`\n----- [${c.name}] inputs -----`);
  console.log(`  skill:      ${c.skill} (${skill.text.length} chars)`);
  console.log(`  fixture:    ${c.fixture ?? "(none)"}`);
  console.log(`  threshold:  ${c.threshold ?? 0.7}`);
  console.log(`  rubric:     ${c.rubric?.length ?? 0} checks` +
    (c.judgeCriteria?.length ? `, judge: ${c.judgeCriteria.length} criteria` : ""));
  const promptCap = opts.verbose >= 2 ? 1e9 : 1200;
  console.log(`  prompt (${prompt.length} chars):`);
  console.log(indent(truncate(prompt, promptCap)));
}

function logVerboseRun(c, run, opts) {
  if (opts.verbose < 1) return;
  console.log(`\n----- [${c.name}] run -----`);
  console.log(`  exit code:  ${run.code}`);
  console.log(`  duration:   ${(run.durationMs / 1000).toFixed(1)}s`);
  console.log(`  model:      ${run.result?.model ?? "(unknown)"}`);
  if (run.result?.usage) console.log(`  usage:      ${JSON.stringify(run.result.usage)}`);
  if (run.skills?.length) console.log(`  skills:     ${run.skills.map((s) => s.name).join(", ")}`);
  if (run.toolCalls?.length) {
    console.log(`  tool calls: ${run.toolCalls.length}`);
    for (const t of run.toolCalls) console.log(`      - ${t.name ?? t.tool ?? JSON.stringify(t)}`);
  }
  if (run.stderr && run.stderr.trim()) {
    console.log(`  stderr:`);
    console.log(indent(truncate(run.stderr, opts.verbose >= 2 ? 1e9 : 800)));
  }
  const artifactCap = opts.verbose >= 2 ? 1e9 : 2000;
  console.log(`  artifact (${(run.text || "").length} chars):`);
  console.log(indent(truncate(run.text || "(empty)", artifactCap)));
}

async function runCase(c, opts, skillsRoot) {
  const skill = await loadAction(c.skill, { skillsRoot });
  const prompt = await c.buildPrompt(skill.text);
  logVerboseInputs(c, prompt, skill, opts);

  const run = await runCopilot(prompt, { model: opts.model, timeoutMs: opts.timeoutMs, cwd: HERE });
  const artifact = run.text || "";
  logVerboseRun(c, run, opts);

  const rubric = gradeRubric(artifact, c.rubric, { threshold: c.threshold ?? 0.7 });

  let judge = null;
  if (opts.judge && Array.isArray(c.judgeCriteria) && c.judgeCriteria.length) {
    try {
      judge = await llmJudge(artifact, {
        criteria: c.judgeCriteria,
        threshold: c.threshold ?? 0.7,
        model: opts.model,
        invoke: (p, o) => runCopilot(p, { ...o, timeoutMs: opts.timeoutMs, cwd: HERE }),
      });
    } catch (err) {
      judge = { score: 0, reasoning: `judge error: ${err.message}`, passed: false };
    }
  }

  const passed = rubric.passed && (judge ? judge.passed : true);
  return { name: c.name, artifact, rubric, judge, passed, durationMs: run.durationMs, usage: run.result?.usage };
}

function printReport(results, opts = { verbose: 0 }) {
  console.log("\n================ Skill Eval Report ================\n");
  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`[${status}] ${r.name}  rubric=${fmtPct(r.rubric.ratio)} (${r.rubric.score}/${r.rubric.maxScore})` +
      (r.judge ? `  judge=${fmtPct(r.judge.score)}` : "") +
      `  ${(r.durationMs / 1000).toFixed(1)}s`);
    for (const item of r.rubric.results) {
      // In verbose mode show every check; otherwise only failures.
      if (!item.pass || opts.verbose >= 1) {
        const mark = item.pass ? "ok " : (item.required ? "REQ" : "x  ");
        const tag = item.required ? " (required)" : "";
        console.log(`      [${mark}] ${item.id}${tag}: ${item.description} — ${item.detail}`);
      }
    }
    if (r.judge && (opts.verbose >= 1 || !r.judge.passed)) {
      console.log(`       judge (${fmtPct(r.judge.score)}): ${r.judge.reasoning}`);
    }
  }
  const passCount = results.filter((r) => r.passed).length;
  console.log(`\n${passCount}/${results.length} cases passed.\n`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const gate = opts.force || process.env.RUN_SKILL_EVALS === "1";

  if (!isCopilotAvailable()) {
    console.error("copilot CLI not found on PATH. Install @github/copilot to run live evals.");
    process.exit(2);
  }
  if (!gate) {
    console.log("Live skill evals are opt-in (they call the model).");
    console.log("Run with RUN_SKILL_EVALS=1 or pass --force. Use scripts\\run-evals.ps1 for convenience.");
    process.exit(0);
  }

  const skillsRoot = defaultSkillsRoot();
  const cases = await loadCases(opts.filters);
  if (!cases.length) {
    console.error("No matching eval cases found.");
    process.exit(2);
  }

  console.log(`Running ${cases.length} skill eval(s)${opts.model ? ` on ${opts.model}` : ""}...`);
  const results = [];
  for (const c of cases) {
    process.stdout.write(`  • ${c.name} ... `);
    try {
      const r = await runCase(c, opts, skillsRoot);
      console.log(r.passed ? "pass" : "fail");
      results.push(r);
    } catch (err) {
      console.log(`error: ${err.message}`);
      results.push({ name: c.name, passed: false, rubric: { ratio: 0, score: 0, maxScore: 0, results: [] }, judge: null, durationMs: 0 });
    }
  }

  printReport(results, opts);
  process.exit(results.every((r) => r.passed) ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
