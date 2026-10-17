import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/skill-behavior.yml"), "utf8");
const scenario = fs.readFileSync(path.join(here, "skill-behavior/scenarios.test.mjs"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, ".github/extensions/srs-navigator/package.json"), "utf8"));

function hasScheduledCanaryContract(yaml, source) {
  const start = source.indexOf('it("scenario 1: autopilot + clear README');
  const end = source.indexOf('it("scenario 2:', start);
  const canary = start < 0 || end < 0 ? "" : source.slice(start, end);
  return (
    /schedule:[\s\S]{0,250}- cron:/.test(yaml) &&
    /ANTHROPIC_API_KEY:\s*\$\{\{\s*secrets\.ANTHROPIC_API_KEY\s*\}\}/.test(yaml) &&
    /::error title=Missing ANTHROPIC_API_KEY/.test(yaml) &&
    /exit 1/.test(yaml) &&
    /SRS_SKILL_BEHAVIOR_MODELS:\s*claude-3-5-haiku-latest/.test(yaml) &&
    /write-skill-behavior-summary\.mjs/.test(yaml) &&
    /actions\/upload-artifact@v4/.test(yaml) &&
    /--test-reporter=tap/.test(packageJson.scripts["test:skill-behavior"]) &&
    /scenario 1: autopilot \+ clear README still runs the interview before writing CPs/.test(canary) &&
    /question >= 0/.test(canary) &&
    /write < 0 \|\| question < write/.test(canary) &&
    /PROVIDERS\[provider\]\.label/.test(source)
  );
}

describe("scheduled credentialed Discovery-Interview canary", () => {
  it("runs a required real-provider scenario and publishes a nonzero-count identity summary", () => {
    assert.ok(
      hasScheduledCanaryContract(workflow, scenario),
      "the weekly workflow must require its Anthropic model canary, guard interview-before-write, and publish execution evidence",
    );
  });

  it("pins TAP output so the scheduled summary can count executed tests", () => {
    assert.match(packageJson.scripts["test:skill-behavior"], /--test-reporter=tap/);
  });

  it("negative control: weakening the interview assertion makes the guard fail", () => {
    const weakened = scenario.replace("question >= 0", "question >= -1");
    assert.notEqual(weakened, scenario, "the mutation must change the canary");
    assert.equal(
      hasScheduledCanaryContract(workflow, weakened),
      false,
      "the workflow contract must reject a canary that no longer requires ask_user",
    );
  });

  it("negative control: dropping the scheduled model or summary is detected", () => {
    assert.equal(
      hasScheduledCanaryContract(
        workflow.replace("SRS_SKILL_BEHAVIOR_MODELS: claude-3-5-haiku-latest", ""),
        scenario,
      ),
      false,
    );
    assert.equal(
      hasScheduledCanaryContract(workflow.replace("write-skill-behavior-summary.mjs", "summary-removed.mjs"), scenario),
      false,
    );
    assert.equal(
      hasScheduledCanaryContract(workflow.replace("exit 1", "exit 0"), scenario),
      false,
    );
  });
});
