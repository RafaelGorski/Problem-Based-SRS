// Guards the consolidated test runner + Skills Health Dashboard contract.
//
// The daily-eval agent brief depends on this contract literally:
//   pwsh -File run-tests.ps1 -NoOpen           runs all four default suites
//   pwsh -File run-tests.ps1 -IncludeSkillBehavior   adds the provider-gated LLM suites
//   docs/skills-health.json                    machine-readable snapshot it parses
// If any of that drifts, the agent silently reports on a suite that never ran.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSnapshot,
  measureLineBudget,
  renderDashboard,
  writeDashboard,
  HARD_CAP_LINES,
  SOFT_WATCH_LINES,
  KNOWN_SUITES,
} from "../../scripts/build-health-dashboard.mjs";
import { countLines } from "../lib/skills.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNNER = fs.readFileSync(path.join(REPO_ROOT, "run-tests.ps1"), "utf8");

/** A representative run: three suites pass, one is provider-gated away. */
const SAMPLE = {
  startedAt: "2026-07-30T23:00:00.000Z",
  durationSeconds: 57.1,
  suites: [
    { name: "Plugin validation", command: "python scripts/build-plugin.py validate", state: "passed", tests: 1, pass: 1, fail: 0, skipped: 0, seconds: 0.3 },
    { name: "Canvas extension", command: "npm test", state: "passed", tests: 215, pass: 215, fail: 0, skipped: 0, seconds: 1.4 },
    { name: "Skill evals", command: "pwsh evals/scripts/run-tests.ps1", state: "passed", tests: 70, pass: 70, fail: 0, skipped: 0, seconds: 0.4 },
    { name: "Canvas e2e", command: "npm run test:e2e", state: "passed", tests: 18, pass: 18, fail: 0, skipped: 0, seconds: 55 },
    { name: "Skill behavior (LLM)", command: "npm run test:skill-behavior", state: "skipped", reason: "no provider API key set" },
  ],
};

describe("run-tests.ps1 — daily-eval runner contract", () => {
  test("declares the -NoOpen and -IncludeSkillBehavior switches", () => {
    for (const flag of ["$NoOpen", "$IncludeSkillBehavior"]) {
      assert.match(
        RUNNER,
        new RegExp(`\\[switch\\]\\${flag}\\b`),
        `run-tests.ps1 must declare a [switch]${flag} parameter — the daily-eval brief invokes it.`,
      );
    }
  });

  test("orchestrates all four default suites", () => {
    for (const cmd of [
      "scripts/build-plugin.py validate",
      "npm test --prefix",
      "evals/scripts/run-tests.ps1",
      "npm run test:e2e --prefix",
    ]) {
      assert.ok(RUNNER.includes(cmd), `run-tests.ps1 must invoke "${cmd}" as a default suite.`);
    }
  });

  test("runs the e2e suite by default (only -SkipE2E opts out)", () => {
    assert.match(RUNNER, /\[switch\]\$SkipE2E\b/, "an explicit -SkipE2E opt-out must exist");
    assert.ok(
      !/if\s*\(\s*-not\s+\$IncludeE2E\s*\)/.test(RUNNER),
      "the e2e suite must be opt-out, not opt-in — the brief states nothing is skipped by default.",
    );
  });

  test("auto-installs canvas node_modules and Chromium when missing", () => {
    assert.match(RUNNER, /npm install --prefix/, "must install node_modules on first run");
    assert.match(RUNNER, /playwright install chromium/, "must install the browser on first run");
  });

  test("gates the LLM suites on a provider key and skips instead of failing", () => {
    for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]) {
      assert.ok(RUNNER.includes(key), `provider gating must consider ${key}`);
    }
    assert.match(
      RUNNER,
      /elseif \(-not \$providerKey\)[\s\S]{0,400}Add-SkippedSuite/,
      "a missing API key must produce a SKIPPED suite, never a failure.",
    );
  });

  test("writes both dashboard artifacts and exits non-zero on failure", () => {
    assert.match(RUNNER, /scripts\/build-health-dashboard\.mjs/, "must invoke the dashboard generator");
    assert.match(RUNNER, /-not \$NoOpen/, "-NoOpen must suppress opening the browser");
    assert.match(RUNNER, /exit 1/, "a failing suite must exit non-zero");
  });
});

describe("skills-health snapshot", () => {
  test("totals every suite and marks the run passed", () => {
    const snap = buildSnapshot(SAMPLE, REPO_ROOT);
    assert.equal(snap.schema, "skills-health/1");
    assert.equal(snap.overall.state, "passed");
    assert.equal(snap.overall.tests, 304);
    assert.equal(snap.overall.pass, 304);
    assert.equal(snap.overall.fail, 0);
    assert.equal(snap.overall.suites, 5);
    assert.equal(snap.overall.suitesRun, 4);
    assert.equal(snap.overall.suitesSkipped, 1);
    assert.equal(snap.overall.durationSeconds, 57.1);
  });

  test("a single failing suite fails the whole run", () => {
    const failing = {
      ...SAMPLE,
      suites: [...SAMPLE.suites.slice(0, 3), { name: "Canvas e2e", state: "failed", tests: 18, pass: 17, fail: 1, seconds: 55 }],
    };
    const snap = buildSnapshot(failing, REPO_ROOT);
    assert.equal(snap.overall.state, "failed");
    assert.equal(snap.overall.suitesFailed, 1);
    assert.equal(snap.overall.fail, 1);
  });

  test("keeps a per-suite entry for every known suite name it is given", () => {
    const snap = buildSnapshot({ suites: KNOWN_SUITES.map((name) => ({ name, state: "skipped" })) }, REPO_ROOT);
    assert.deepEqual(snap.suites.map((s) => s.name), KNOWN_SUITES);
  });
});

describe("max context — line budget", () => {
  const budget = measureLineBudget(REPO_ROOT);

  test("measures SKILL.md and every reference file", () => {
    const files = budget.files.map((f) => f.file);
    assert.ok(files.includes("skills/problem-based-srs/SKILL.md"));
    for (const ref of ["problems.md", "needs.md", "functional-requirements.md", "validate.md"]) {
      assert.ok(
        files.includes(`skills/problem-based-srs/reference/${ref}`),
        `reference/${ref} must appear in the line budget`,
      );
    }
  });

  test("uses the repo's own countLines metric, front matter excluded", () => {
    const entry = budget.files.find((f) => f.file.endsWith("SKILL.md"));
    const raw = fs.readFileSync(path.join(REPO_ROOT, "skills/problem-based-srs/SKILL.md"), "utf8");
    // Front matter must not be counted: the raw file is strictly longer than the body.
    assert.ok(entry.lines < countLines(raw), "front matter must be excluded from the budget");
    assert.ok(entry.lines > 0);
  });

  test("no skill file exceeds the hard cap", () => {
    const over = budget.files.filter((f) => f.state === "over");
    assert.deepEqual(
      over.map((f) => `${f.file} (${f.lines})`),
      [],
      `skill files over the ${HARD_CAP_LINES}-line hard cap`,
    );
  });

  test("classifies ok / watch / over against the documented thresholds", () => {
    assert.equal(HARD_CAP_LINES, 600);
    assert.equal(SOFT_WATCH_LINES, 500);
    for (const f of budget.files) {
      const expected = f.lines > HARD_CAP_LINES ? "over" : f.lines > SOFT_WATCH_LINES ? "watch" : "ok";
      assert.equal(f.state, expected, `${f.file} (${f.lines} lines) classified ${f.state}`);
    }
  });
});

// CI once ran only the plugin validation step, so ~230 deterministic tests never
// executed on a pull request. These assertions keep every suite wired to CI.
describe("CI — every suite runs on push and pull request", () => {
  const CI = fs.readFileSync(path.join(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");

  test("triggers on pull requests, not only on manual dispatch", () => {
    assert.match(CI, /^on:/m);
    assert.match(CI, /^\s{2}pull_request:/m, "CI must run on pull_request");
    assert.match(CI, /^\s{2}push:/m, "CI must run on push");
  });

  test("runs the canvas unit suite and the deterministic skill evals", () => {
    assert.match(CI, /run: npm test\b/, "CI must run the canvas suite (npm test)");
    assert.match(
      CI,
      /node --test evals\/tests\/\*\.test\.mjs/,
      "CI must run every evals/tests/*.test.mjs — a directory argument is not supported by node --test.",
    );
  });

  test("runs plugin validation", () => {
    assert.match(CI, /python scripts\/build-plugin\.py validate/);
  });

  test("runs the Playwright visual suite", () => {
    assert.match(CI, /npm run test:e2e/, "CI must run the e2e suite");
    assert.match(CI, /playwright install .*chromium/, "the e2e job must install a browser");
    assert.match(CI, /npm ci\b/, "the e2e job needs the locked dependencies");
  });
});

describe("dashboard rendering", () => {
  const snap = buildSnapshot(SAMPLE, REPO_ROOT);
  const html = renderDashboard(snap);

  test("renders every suite with its counts", () => {
    for (const s of SAMPLE.suites) assert.ok(html.includes(s.name), `${s.name} missing from the page`);
    assert.ok(html.includes(">304<"), "overall test total must be shown");
  });

  test("reuses the site stylesheet so the page stays on-brand", () => {
    assert.match(html, /assets\/site\.css/);
    assert.match(html, /<a href="index\.html">/, "must link back to the landing page");
  });

  test("escapes untrusted suite text", () => {
    const evil = buildSnapshot({ suites: [{ name: "<img src=x onerror=alert(1)>", state: "passed" }] }, REPO_ROOT);
    const out = renderDashboard(evil);
    assert.ok(!out.includes("<img src=x"), "suite names must be HTML-escaped");
    assert.ok(out.includes("&lt;img src=x"), "escaped form must be present");
  });

  test("writes both artifacts to the output directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skills-health-"));
    try {
      const { jsonPath, htmlPath } = writeDashboard(SAMPLE, { root: REPO_ROOT, outDir: dir });
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      assert.equal(parsed.overall.tests, 304);
      assert.ok(Array.isArray(parsed.maxContext.files) && parsed.maxContext.files.length > 0);
      assert.match(fs.readFileSync(htmlPath, "utf8"), /Skills Health/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
