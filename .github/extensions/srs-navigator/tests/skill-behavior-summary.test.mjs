import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatSummary, parseTapSummary } from "../scripts/skill-behavior-summary.mjs";
import "../scripts/write-skill-behavior-summary.mjs";

const scriptPath = fileURLToPath(new URL("../scripts/write-skill-behavior-summary.mjs", import.meta.url));
const passingTap = [
  "# tests 3",
  "# pass 2",
  "# fail 0",
  "# cancelled 0",
  "# skipped 1",
  "# todo 0",
].join("\n");

describe("scheduled skill-behavior summary", () => {
  it("counts only executed scenarios and retains provider/model identity", () => {
    assert.deepEqual(parseTapSummary(passingTap), {
      tests: 3,
      pass: 2,
      fail: 0,
      cancelled: 0,
      skipped: 1,
      todo: 0,
      executed: 2,
    });
    const summary = formatSummary(passingTap, {
      provider: "Anthropic",
      model: "claude-3-5-haiku-latest",
    });
    assert.match(summary, /Anthropic \/ `claude-3-5-haiku-latest`/);
    assert.match(summary, /Scenarios executed: 2/);
    assert.doesNotMatch(summary, /API_KEY|secret|token/i);
  });

  it("rejects absent or malformed TAP totals instead of publishing a false pass", () => {
    assert.throws(() => parseTapSummary(""), /missing "# tests/);
    assert.throws(() => parseTapSummary(passingTap.replace("# fail 0", "# fail nope")), /missing "# fail/);
    assert.throws(
      () => parseTapSummary(passingTap.replace("# pass 2", "# pass 1")),
      /counts are inconsistent/,
    );
  });

  it("rejects a run where every provider-gated scenario skipped", () => {
    const skipped = passingTap
      .replace("# pass 2", "# pass 0")
      .replace("# skipped 1", "# skipped 3");
    assert.throws(() => parseTapSummary(skipped), /No skill-behavior scenarios executed/);
  });

  it("requires a visible provider and model label", () => {
    assert.throws(() => formatSummary(passingTap, { provider: "", model: "claude-test" }), /identity/);
  });

  it("writes the workflow summary and fails closed when execution is empty", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "srs-behavior-summary-"));
    const tapPath = path.join(temp, "run.tap");
    const summaryPath = path.join(temp, "summary.md");
    const env = {
      ...process.env,
      SRS_SKILL_BEHAVIOR_PROVIDER: "Anthropic",
      SRS_SKILL_BEHAVIOR_MODEL: "claude-3-5-haiku-latest",
      GITHUB_STEP_SUMMARY: summaryPath,
    };
    try {
      fs.writeFileSync(tapPath, passingTap);
      const passed = spawnSync(process.execPath, [scriptPath, tapPath], { encoding: "utf8", env });
      assert.equal(passed.status, 0, passed.stderr);
      assert.match(fs.readFileSync(summaryPath, "utf8"), /Scenarios executed: 2/);

      const withoutSummaryFile = { ...env };
      delete withoutSummaryFile.GITHUB_STEP_SUMMARY;
      const local = spawnSync(process.execPath, [scriptPath, tapPath], {
        encoding: "utf8",
        env: withoutSummaryFile,
      });
      assert.equal(local.status, 0, local.stderr);

      fs.writeFileSync(
        tapPath,
        passingTap.replace("# pass 2", "# pass 0").replace("# skipped 1", "# skipped 3"),
      );
      const skipped = spawnSync(process.execPath, [scriptPath, tapPath], { encoding: "utf8", env });
      assert.notEqual(skipped.status, 0);
      assert.match(skipped.stderr, /No skill-behavior scenarios executed/);

      fs.writeFileSync(tapPath, passingTap.replace("# pass 2", "# pass 1").replace("# fail 0", "# fail 1"));
      const failed = spawnSync(process.execPath, [scriptPath, tapPath], { encoding: "utf8", env });
      assert.notEqual(failed.status, 0);
      assert.match(failed.stdout, /failed: 1/);

      const usage = spawnSync(process.execPath, [scriptPath], { encoding: "utf8", env });
      assert.notEqual(usage.status, 0);
      assert.match(usage.stderr, /Usage: node write-skill-behavior-summary\.mjs/);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
