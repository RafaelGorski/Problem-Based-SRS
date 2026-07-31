// A test suite that self-skips when its credentials are absent is useful locally and
// dangerous in CI: the run is green, the badge is green, and nothing was verified.
// The LLM-backed skill-behavior suite is exactly that shape, so the two things worth
// guarding are (a) it actually runs somewhere on a schedule, with a hard failure when
// the secret is missing, and (b) the local runner's opt-in flags mean what they say.
//
// The runner had two concrete defects this pins shut:
//   1. One switch enabled two suites with different prerequisites, so asking for the
//      provider-gated suite also launched a runner that needs a `copilot` CLI.
//   2. The live runner was invoked without --force, and run-evals.mjs exits 0 when it
//      is neither forced nor env-gated — a suite reported PASS having evaluated nothing.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const RUNNER = read("run-tests.ps1");
const WORKFLOW_PATH = ".github/workflows/skill-behavior.yml";
const WORKFLOW = read(WORKFLOW_PATH);
const RUN_EVALS = read("evals/run-evals.mjs");

/** Declared [switch]$Name parameters, in declaration order. */
export function switchParams(ps1) {
  return [...ps1.matchAll(/\[switch\]\$(\w+)/g)].map((m) => m[1]);
}

/**
 * The body of the `param(...)` block only — helper functions further down also take
 * [switch] parameters and must not be mistaken for command-line flags.
 */
export function paramBlock(ps1) {
  const start = ps1.indexOf("\nparam(");
  if (start === -1) return "";
  const close = ps1.indexOf("\n)", start);
  return close === -1 ? "" : ps1.slice(start, close);
}

/** Top-level YAML keys, used to assert workflow structure without a YAML parser. */
export function topLevelKeys(yaml) {
  return [...yaml.matchAll(/^([A-Za-z_][\w-]*):/gm)].map((m) => m[1]);
}

/**
 * Drop whole-line `#` comments. The branches below are asserted on their *code*: a
 * comment explaining why the live evals need --force must not read as the behavior
 * branch invoking them.
 */
export function stripPsComments(ps1) {
  return ps1
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
}

describe("run-tests.ps1 — opt-in suites have independent switches", () => {
  it("declares both switches on the command line, not just one", () => {
    const declared = switchParams(paramBlock(RUNNER));
    assert.ok(
      declared.includes("IncludeSkillBehavior"),
      `-IncludeSkillBehavior must be a command-line switch; found: ${declared.join(", ")}`,
    );
    assert.ok(
      declared.includes("IncludeLiveEvals"),
      "-IncludeLiveEvals must be its own switch: the live evals need an authenticated " +
        "`copilot` CLI while the behavior suite needs a provider API key, so one flag " +
        "cannot correctly gate both",
    );
  });

  it("gates the behavior suite on the behavior switch alone", () => {
    assert.match(
      RUNNER,
      /if \(-not \$IncludeSkillBehavior\)[\s\S]{0,400}?Add-SkippedSuite 'Skill behavior/,
      "the behavior suite must be skipped for -IncludeSkillBehavior specifically",
    );
    const behaviorBranch = stripPsComments(
      RUNNER.slice(
        RUNNER.indexOf("if (-not $IncludeSkillBehavior)"),
        RUNNER.indexOf("if (-not $IncludeLiveEvals)"),
      ),
    );
    assert.ok(
      !behaviorBranch.includes("run-evals.mjs"),
      "-IncludeSkillBehavior must no longer decide anything about the live evals",
    );
  });

  it("gates the live evals on the live switch alone", () => {
    const liveBranch = stripPsComments(RUNNER.slice(RUNNER.indexOf("if (-not $IncludeLiveEvals)")));
    assert.match(
      liveBranch,
      /Add-SkippedSuite 'Live skill evals/,
      "the live evals must report themselves skipped when not requested",
    );
    assert.ok(
      !liveBranch.includes("test:skill-behavior"),
      "-IncludeLiveEvals must not drag in the provider-gated behavior suite",
    );
  });

  it("checks the prerequisite each suite actually has", () => {
    assert.match(
      RUNNER,
      /Test-ProviderKey/,
      "the behavior suite is gated on a provider API key",
    );
    assert.match(
      RUNNER,
      /Get-Command copilot -ErrorAction SilentlyContinue/,
      "the live evals must check for the `copilot` CLI, not for an API key: a key does " +
        "not make an unauthenticated CLI work",
    );
  });

  it("forces the live runner so a requested suite cannot silently no-op", () => {
    assert.match(
      RUN_EVALS,
      /opts\.force \|\| process\.env\.RUN_SKILL_EVALS === "1"/,
      "run-evals.mjs still gates on --force / RUN_SKILL_EVALS — if this changes, revisit " +
        "the runner invocation below",
    );
    const liveBranch = stripPsComments(RUNNER.slice(RUNNER.indexOf("if (-not $IncludeLiveEvals)")));
    assert.match(
      liveBranch,
      /run-evals\.mjs'\)\s+--force/,
      "run-tests.ps1 must pass --force: without it run-evals.mjs prints an explanation, " +
        "exits 0, and the dashboard records a passing suite that evaluated zero cases",
    );
  });

  it("documents both switches in the header comment", () => {
    const header = RUNNER.slice(0, RUNNER.indexOf("[CmdletBinding()]"));
    assert.match(header, /-IncludeSkillBehavior/, "the header must document the switch");
    assert.match(header, /-IncludeLiveEvals/, "the header must document the new switch");
    assert.match(
      header,
      /copilot` CLI|copilot CLI/,
      "the header must say what the live evals need, so the flag is not tried blindly",
    );
  });
});

describe("scheduled workflow — the LLM suite runs somewhere real", () => {
  it("exists as a workflow", () => {
    assert.ok(fs.existsSync(path.join(repoRoot, WORKFLOW_PATH)), `${WORKFLOW_PATH} must exist`);
    const keys = topLevelKeys(WORKFLOW);
    for (const k of ["name", "permissions", "concurrency", "jobs"]) {
      assert.ok(keys.includes(k), `${WORKFLOW_PATH} must declare a top-level \`${k}\``);
    }
  });

  it("runs on a schedule, not only when someone remembers", () => {
    assert.match(
      WORKFLOW,
      /^\s*schedule:/m,
      "the whole point is unattended verification; a dispatch-only workflow provides none",
    );
    assert.match(
      WORKFLOW,
      /cron:\s*"[^"]+"/,
      "the schedule needs a concrete cron expression",
    );
  });

  it("still allows a manual run", () => {
    assert.match(WORKFLOW, /workflow_dispatch:/, "on-demand runs must stay possible");
  });

  it("fails loudly when the provider secret is missing", () => {
    assert.match(
      WORKFLOW,
      /::error title=Missing ANTHROPIC_API_KEY/,
      "a missing secret must surface as an annotated error",
    );
    assert.match(
      WORKFLOW,
      /exit 1/,
      "and must fail the job: a green run in which every scenario self-skipped is worse " +
        "than a red one, because it looks like coverage",
    );
  });

  it("passes the secret into the suite it gates", () => {
    assert.match(
      WORKFLOW,
      /ANTHROPIC_API_KEY:\s*\$\{\{\s*secrets\.ANTHROPIC_API_KEY\s*\}\}/,
      "the key must reach the step that runs the suite",
    );
    assert.match(
      WORKFLOW,
      /npm run test:skill-behavior/,
      "the workflow must run the provider-gated suite",
    );
  });

  it("bounds cost and concurrency", () => {
    assert.match(
      WORKFLOW,
      /timeout-minutes:\s*\d+/,
      "a hung provider call must not hold a runner for six hours",
    );
    assert.match(
      WORKFLOW,
      /cancel-in-progress:\s*true/,
      "a scheduled run and a manual run must not race into the same provider quota",
    );
  });

  it("keeps the evidence a failed model run produces", () => {
    assert.match(WORKFLOW, /actions\/upload-artifact@v4/, "logs must be uploaded");
    assert.match(WORKFLOW, /if:\s*always\(\)/, "including when the suite failed");
    assert.match(WORKFLOW, /retention-days:\s*\d+/, "with an explicit retention window");
  });

  it("forces the live evals when it opts into them", () => {
    assert.match(
      WORKFLOW,
      /run-evals\.mjs --force/,
      "the workflow has the same silent-no-op hazard as the local runner",
    );
  });

  it("requests no more permission than it needs", () => {
    assert.match(
      WORKFLOW,
      /permissions:\s*\n\s*contents:\s*read/,
      "the suite only reads the repository",
    );
  });
});

describe("negative canaries", () => {
  it("switchParams reads only the parameter block, not helper functions", () => {
    const sample = "\nparam(\n  [switch]$A,\n  [switch]$B\n)\nfunction F { param([switch]$C) }";
    assert.deepEqual(switchParams(paramBlock(sample)), ["A", "B"]);
    assert.deepEqual(switchParams(sample), ["A", "B", "C"], "the raw scan does see $C");
  });

  it("paramBlock returns empty when there is no param block", () => {
    assert.equal(paramBlock("Write-Host 'hi'"), "");
  });

  it("topLevelKeys ignores nested keys", () => {
    assert.deepEqual(topLevelKeys("on:\n  push:\n    branches: [main]\njobs:\n  a:\n"), [
      "on",
      "jobs",
    ]);
  });

  it("stripPsComments removes explanation without touching code", () => {
    const sample = "# run-evals.mjs is mentioned here\nnode run-evals.mjs --force\n";
    const stripped = stripPsComments(sample);
    assert.ok(!stripped.includes("mentioned here"), "the comment must go");
    assert.ok(stripped.includes("node run-evals.mjs --force"), "the code must stay");
  });

  it("a runner that dropped --force fails the assertion made above", () => {
    const mutated = RUNNER.replace(/run-evals\.mjs'\)\s+--force/, "run-evals.mjs')");
    const liveBranch = stripPsComments(mutated.slice(mutated.indexOf("if (-not $IncludeLiveEvals)")));
    assert.ok(
      !/run-evals\.mjs'\)\s+--force/.test(liveBranch),
      "the check must actually notice the missing flag",
    );
  });

  it("a workflow that only warns about the missing secret fails the check", () => {
    const mutated = WORKFLOW.replace(/exit 1/g, "exit 0");
    assert.ok(!/exit 1/.test(mutated), "the check must actually notice a softened failure");
  });
});
