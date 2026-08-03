import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RELEASE_CRON_UTC,
  REPORT_CRON_UTC,
} from "../../scripts/weekly-release-report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const REPORT_WORKFLOW = read(".github/workflows/thursday-release-report.yml");
const RELEASE_WORKFLOW = read(".github/workflows/thursday-release.yml");
const CREATE_RELEASE_WORKFLOW = read(".github/workflows/create-release.yml");

function firstCron(workflow) {
  return workflow.match(/cron:\s*"([^"]+)"/)?.[1] ?? null;
}

describe("Thursday release cadence", () => {
  it("schedules the report for Thursday noon BRT", () => {
    assert.equal(firstCron(REPORT_WORKFLOW), REPORT_CRON_UTC);
    assert.match(REPORT_WORKFLOW, /workflow_dispatch:/);
  });

  it("schedules the release for Thursday 16:00 BRT", () => {
    assert.equal(firstCron(RELEASE_WORKFLOW), RELEASE_CRON_UTC);
    assert.match(RELEASE_WORKFLOW, /workflow_dispatch:/);
  });

  it("keeps the report four hours ahead of the release", () => {
    const [reportMinute, reportHour, , , reportDay] = REPORT_CRON_UTC.split(" ");
    const [releaseMinute, releaseHour, , , releaseDay] = RELEASE_CRON_UTC.split(" ");
    assert.equal(reportDay, "4");
    assert.equal(releaseDay, "4");
    assert.equal(reportMinute, releaseMinute);
    assert.equal(Number(releaseHour) - Number(reportHour), 4);
  });

  it("dispatches both release trains from the Thursday workflow", () => {
    assert.match(RELEASE_WORKFLOW, /gh workflow run create-release\.yml/);
    assert.match(RELEASE_WORKFLOW, /gh workflow run release-canvas\.yml/);
  });

  it("keeps the plugin release workflow off tag-push automation", () => {
    assert.match(CREATE_RELEASE_WORKFLOW, /workflow_dispatch:/);
    assert.doesNotMatch(CREATE_RELEASE_WORKFLOW, /push:\s*\n\s*tags:/);
  });

  it("keeps both Thursday workflows on the default branch", () => {
    assert.match(REPORT_WORKFLOW, /github\.ref_name != github\.event\.repository\.default_branch/);
    assert.match(RELEASE_WORKFLOW, /github\.ref_name != github\.event\.repository\.default_branch/);
  });
});
