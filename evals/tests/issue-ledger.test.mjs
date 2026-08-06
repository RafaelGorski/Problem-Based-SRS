import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  analyzeIssueBody,
  attributeVersion,
  classifyVersionMentions,
  compareVersions,
  hasCitation,
  hasExplicitBlocker,
  normalizeVersion,
  parseArgs,
  parseChecklistLine,
  readCanvasVersion,
  readTrainVersions,
  toBaselines,
} from "../tools/issue-ledger.mjs";

describe("version helpers", () => {
  it("normalizes two-part and three-part versions", () => {
    assert.deepEqual(normalizeVersion("2.6"), [2, 6, 0]);
    assert.deepEqual(normalizeVersion("2.6.1"), [2, 6, 1]);
  });

  it("compares normalized versions", () => {
    assert.equal(compareVersions("2.5.0", "2.6.0"), -1);
    assert.equal(compareVersions("2.6", "2.6.0"), 0);
    assert.equal(compareVersions("2.6.2", "2.6.1"), 1);
  });
});

describe("line classifiers", () => {
  it("detects citations in checkbox lines", () => {
    assert.equal(hasCitation("done in #108"), true);
    assert.equal(hasCitation("see https://example.com"), true);
    assert.equal(hasCitation("ran `node --test evals/tests/*.test.mjs`"), true);
    assert.equal(hasCitation("just done"), false);
  });

  it("detects explicit blockers for open boxes", () => {
    assert.equal(hasExplicitBlocker("Blocked on #91"), true);
    assert.equal(hasExplicitBlocker("blocked by https://example.com/ticket"), true);
    assert.equal(hasExplicitBlocker("waiting on #91"), false);
  });

  it("parses checkbox lines and superseded version mentions", () => {
    const parsed = parseChecklistLine("- [ ] Cut v2.5.0 before closing", "2.6.0");
    assert.ok(parsed);
    assert.equal(parsed.checked, false);
    assert.deepEqual(parsed.supersededVersions, ["2.5.0"]);
  });
});

describe("issue body analysis", () => {
  it("passes when all boxes are ticked with citations", () => {
    const body = [
      "- [x] done in #108",
      "- [x] runbook updated in `docs/release-verification.md`",
    ].join("\n");
    const analyzed = analyzeIssueBody(body, "2.6.0");
    assert.equal(analyzed.counts.open, 0);
    assert.equal(analyzed.counts.tickedWithoutCitation, 0);
    assert.equal(analyzed.counts.openWithoutBlocker, 0);
    assert.equal(analyzed.counts.supersededVersionMentions, 0);
  });

  it("fails an unticked box without explicit blocker", () => {
    const analyzed = analyzeIssueBody("- [ ] still pending", "2.6.0");
    assert.equal(analyzed.counts.open, 1);
    assert.equal(analyzed.counts.openWithoutBlocker, 1);
  });

  it("accepts an unticked box with explicit blocker", () => {
    const analyzed = analyzeIssueBody("- [ ] Blocked on #91 until re-crawl lands", "2.6.0");
    assert.equal(analyzed.counts.open, 1);
    assert.equal(analyzed.counts.openWithoutBlocker, 0);
  });

  it("flags ticked boxes that have no citation", () => {
    const analyzed = analyzeIssueBody("- [x] completed", "2.6.0");
    assert.equal(analyzed.counts.tickedWithoutCitation, 1);
  });

  it("flags boxes that still name a superseded version", () => {
    const analyzed = analyzeIssueBody("- [ ] release link points at v2.5", "2.6.0");
    assert.equal(analyzed.counts.supersededVersionMentions, 1);
  });
});

// Regression guard for the defect found on 2026-08-06: every version mention was compared
// against the plugin manifest, so a canvas issue naming its own tag `v1.1.1` was reported as a
// stale claim purely because 1.1.1 < 2.6.0. A canvas release issue could therefore never reach
// a clean ledger. Mutating `attributeVersion` back to a single global baseline fails these.
describe("version mentions are measured per release train", () => {
  const TRAINS = { plugin: "2.6.0", canvas: "1.1.0" };

  it("does not treat a canvas tag as a stale plugin claim", () => {
    const analyzed = analyzeIssueBody("- [ ] A release tagged v1.1.1 exists", TRAINS);
    assert.equal(
      analyzed.counts.supersededVersionMentions,
      0,
      "v1.1.1 is the canvas train's next tag, not a version the plugin moved past",
    );
    assert.equal(analyzed.counts.unattributedVersionMentions, 0);
  });

  it("still flags a plugin version the manifest moved past", () => {
    const analyzed = analyzeIssueBody("- [ ] release link points at v2.5", TRAINS);
    assert.deepEqual(analyzed.findings.supersededVersionMentions, ["2.5"]);
  });

  it("flags a canvas version the canvas train moved past", () => {
    const analyzed = analyzeIssueBody("- [ ] still ships v1.0.5", TRAINS);
    assert.deepEqual(analyzed.findings.supersededVersionMentions, ["1.0.5"]);
  });

  it("treats the currently advertised version of each train as current", () => {
    const analyzed = analyzeIssueBody(
      ["- [ ] plugin v2.6 is published", "- [ ] canvas v1.1.0 is published"].join("\n"),
      TRAINS,
    );
    assert.equal(analyzed.counts.supersededVersionMentions, 0);
  });

  it("reports a version no train claims instead of failing it", () => {
    const analyzed = analyzeIssueBody("- [ ] migrate off v9.9.9", TRAINS);
    assert.equal(analyzed.counts.supersededVersionMentions, 0, "not a stale claim");
    assert.deepEqual(analyzed.findings.unattributedVersionMentions, ["9.9.9"]);
  });

  it("attributes a mention to the train sharing its major series", () => {
    assert.equal(attributeVersion("1.1.1", TRAINS), "1.1.0");
    assert.equal(attributeVersion("2.5", TRAINS), "2.6.0");
    assert.equal(attributeVersion("9.9.9", TRAINS), null);
  });

  it("accepts a bare string baseline for backward compatibility", () => {
    assert.deepEqual(toBaselines("2.6.0"), ["2.6.0"]);
    assert.deepEqual(toBaselines(TRAINS), ["2.6.0", "1.1.0"]);
    const parsed = parseChecklistLine("- [ ] Cut v2.5.0 before closing", "2.6.0");
    assert.deepEqual(parsed.supersededVersions, ["2.5.0"]);
  });

  it("separates superseded from unattributed on one line", () => {
    const { superseded, unattributed } = classifyVersionMentions(
      "v2.5 and v1.1.1 and v9.9",
      TRAINS,
    );
    assert.deepEqual(superseded, ["2.5"]);
    assert.deepEqual(unattributed, ["9.9"]);
  });
});

describe("train baselines are read from the files the pipelines own", () => {
  it("reads a canvas version and both trains from the repository", () => {
    const canvas = readCanvasVersion();
    assert.match(canvas, /^\d+\.\d+\.\d+$/, "VERSION must be a dotted canvas version");
    const trains = readTrainVersions();
    assert.equal(trains.canvas, canvas);
    assert.match(trains.plugin, /^\d+\.\d+/);
    assert.notEqual(
      normalizeVersion(trains.plugin)[0],
      normalizeVersion(trains.canvas)[0],
      "the two trains occupy different major series; if that changes, the ledger's " +
        "attribution rule needs revisiting rather than silently mis-attributing tags",
    );
  });
});

describe("argument parsing", () => {
  it("accepts numeric issue numbers and known options", () => {
    const args = parseArgs(["69", "91", "--repo", "owner/repo", "--json", "-", "--quiet"]);
    assert.deepEqual(args.issues, [69, 91]);
    assert.equal(args.repo, "owner/repo");
    assert.equal(args.json, "-");
    assert.equal(args.quiet, true);
  });

  it("rejects non-numeric issue identifiers", () => {
    assert.throws(() => parseArgs(["abc"]), /invalid issue number/);
  });
});
