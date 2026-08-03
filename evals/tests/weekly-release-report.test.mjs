import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  assessCanvasRelease,
  assessPluginRelease,
  buildReportMarkdown,
  CANVAS_RELEASE_PART,
} from "../../scripts/weekly-release-report.mjs";

describe("weekly-release-report", () => {
  it("keeps the plugin train waiting until a new version is prepared", () => {
    const status = assessPluginRelease({
      currentVersion: "2.6.0",
      latestReleaseTag: "v2.6",
      hasUnreleasedChanges: true,
      changelogReady: true,
    });
    assert.equal(status.ready, false);
    assert.match(status.reason, /already the latest published plugin release/);
  });

  it("marks the plugin train ready only when the changelog is prepared", () => {
    const status = assessPluginRelease({
      currentVersion: "2.7.0",
      latestReleaseTag: "v2.6",
      hasUnreleasedChanges: true,
      changelogReady: true,
    });
    assert.equal(status.ready, true);
    assert.equal(status.targetTag, "v2.7");
  });

  it("blocks the plugin train when the changelog section is missing", () => {
    const status = assessPluginRelease({
      currentVersion: "2.7.0",
      latestReleaseTag: "v2.6",
      hasUnreleasedChanges: true,
      changelogReady: false,
    });
    assert.equal(status.ready, false);
    assert.match(status.reason, /CHANGELOG\.md does not yet contain/);
  });

  it("marks the canvas train ready when unreleased commits exist", () => {
    const status = assessCanvasRelease({
      currentVersion: "1.2.3",
      nextPlannedVersion: "1.2.4",
      hasUnreleasedChanges: true,
    });
    assert.equal(status.ready, true);
    assert.equal(status.targetTag, "v1.2.4");
    assert.match(status.reason, new RegExp(`release-canvas\\.yml \\(${CANVAS_RELEASE_PART}`));
  });

  it("states plainly that Thursday's release does not wait for approval", () => {
    const markdown = buildReportMarkdown({
      reportDate: "2026-08-06",
      plugin: {
        latestReleaseTag: "v2.6",
        currentVersion: "2.7.0",
        targetTag: "v2.7",
        ready: true,
        reason: "Ready.",
        commits: [{ sha: "abc1234", subject: "Prepare plugin release" }],
        files: ["CHANGELOG.md"],
      },
      canvas: {
        latestReleaseTag: "v1.2.3",
        currentVersion: "1.2.3",
        targetTag: "v1.2.4",
        ready: true,
        reason: "Ready.",
        commits: [{ sha: "def5678", subject: "Ship canvas change" }],
        files: ["VERSION"],
      },
    });
    assert.match(markdown, /scheduled release still runs at 16:00 BRT even if approval does not arrive in time/i);
  });
});
