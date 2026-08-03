import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  analyzeIssueBody,
  compareVersions,
  hasCitation,
  hasExplicitBlocker,
  normalizeVersion,
  parseArgs,
  parseChecklistLine,
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
