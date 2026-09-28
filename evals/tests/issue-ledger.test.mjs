import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  analyzeIssueBody,
  attributeVersion,
  buildLedger,
  classifyVersionMentions,
  cli,
  compareVersions,
  defaultRunner,
  detectRepo,
  extractChecklistBoxes,
  formatReport,
  hasCitation,
  hasExplicitBlocker,
  issueCitationMentions,
  ledgerFindingCodes,
  normalizeResult,
  normalizeVersion,
  parseArgs,
  parseChecklistLine,
  parseRepoFromRemoteUrl,
  REPO_ROOT,
  readCanvasVersion,
  readIssueFromBodyFile,
  readTrainVersions,
  releaseClaimMarkers,
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

  it("detects issue citations for optional live validation", () => {
    assert.deepEqual(issueCitationMentions("Blocked on #299 and see #145."), [299, 145]);
    assert.deepEqual(issueCitationMentions("No issue here."), []);
  });

  it("detects release claim markers before closure", () => {
    assert.equal(releaseClaimMarkers("<!-- release-claim train=none -->").length, 1);
    assert.equal(releaseClaimMarkers("<!-- release-claim train=none --><!-- release-claim train=plugin version=v2.7 -->").length, 2);
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

  it("flags duplicate release-claim markers as their own closure finding", () => {
    const analyzed = analyzeIssueBody(
      "<!-- release-claim train=none -->\n<!-- release-claim train=plugin version=v2.7 -->\n- [x] Evidence in `README.md`",
      "2.7.0",
    );
    assert.equal(analyzed.counts.duplicateReleaseClaimMarkers, 2);
    assert.deepEqual(analyzed.findings.duplicateReleaseClaimMarkers, [
      "<!-- release-claim train=none -->",
      "<!-- release-claim train=plugin version=v2.7 -->",
    ]);
  });
});

describe("empty acceptance ledgers", () => {
  it("fails the ledger gate when an included issue has no acceptance boxes", () => {
    const bodies = new Map([
      [301, "Issue has no acceptance checklist."],
      [302, "- [ ] Blocked on #301 until its evidence is reconciled."],
    ]);
    const run = (_command, args) => {
      const number = Number(args[2]);
      return {
        status: 0,
        stdout: JSON.stringify({
          number,
          title: `Issue ${number}`,
          url: `https://github.com/example/project/issues/${number}`,
          body: bodies.get(number),
        }),
        stderr: "",
      };
    };
    const options = { repo: "example/project", root: REPO_ROOT };
    const empty = buildLedger({ ...options, issues: [301] }, run);
    assert.equal(empty.issues[0].counts.total, 0);
    assert.equal(empty.totals.emptyLedgers, 1);
    assert.equal(empty.ok, false);
    assert.match(formatReport(empty), /empty acceptance ledger: yes/);

    const accounted = buildLedger({ ...options, issues: [302] }, run);
    assert.equal(accounted.issues[0].counts.total, 1);
    assert.equal(accounted.totals.emptyLedgers, 0);
    assert.equal(accounted.ok, true, formatReport(accounted));
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

  it("falls back to the extension package when VERSION is absent", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "issue-ledger-version-"));
    const pkg = path.join(dir, ".github", "extensions", "srs-navigator");
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ version: "9.8.7" }));
    try {
        assert.equal(readCanvasVersion(dir), "9.8.7");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns null when no canvas version source exists", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "issue-ledger-no-version-"));
    try {
        assert.equal(readCanvasVersion(dir), null);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// Regression guard for the defect found on 2026-08-07 (#156): six live issue bodies were
// rewritten into a single paragraph with no newlines. `parseChecklistLine`'s line anchoring
// made every box in those bodies invisible, so the ledger reported "0 boxes" for an issue that
// actually carried 14 — indistinguishable from an issue that genuinely has none. Reverting
// `analyzeIssueBody`/`extractChecklistBoxes` to line-based splitting fails every test below.
describe("checklist boxes are found regardless of line formatting", () => {
  const collapsed =
    "Some intro text. - [x] done in #108 and cited here - [ ] Blocked on #91 until re-crawl lands " +
    "- [ ] still pending with no blocker - [x] completed with no citation";

  it("extracts every marker from a body with no newlines", () => {
    const boxes = extractChecklistBoxes(collapsed);
    assert.equal(boxes.length, 4);
    assert.deepEqual(boxes.map((b) => b.checked), [true, false, false, true]);
  });

  it("delimits box text by the next marker, not by a newline", () => {
    const boxes = extractChecklistBoxes(collapsed);
    assert.equal(boxes[0].text, "done in #108 and cited here");
    assert.equal(boxes[1].text, "Blocked on #91 until re-crawl lands");
  });

  it("matches the marker count gh reports for a collapsed body", () => {
    const markerCount = [...collapsed.matchAll(/- \[[ xX]\]/g)].length;
    assert.equal(extractChecklistBoxes(collapsed).length, markerCount);
  });

  it("attributes citations and blockers on a collapsed body the same as a line-anchored one", () => {
    const analyzed = analyzeIssueBody(collapsed, "2.6.0");
    assert.equal(analyzed.counts.total, 4);
    assert.equal(analyzed.counts.checked, 2);
    assert.equal(analyzed.counts.open, 2);
    assert.equal(analyzed.counts.openWithoutBlocker, 1, "only the unblocked open box should flag");
    assert.equal(analyzed.counts.tickedWithoutCitation, 1, "only the uncited ticked box should flag");
  });

  it("reports zero boxes distinctly for a body with genuinely none", () => {
    const analyzed = analyzeIssueBody("Just prose, no checklist markers at all.", "2.6.0");
    assert.equal(analyzed.counts.total, 0);
    assert.equal(analyzed.counts.unparseable, 0);
  });

  it("keeps well-formed multi-line bodies parsing identically", () => {
    const multiline = [
      "- [x] done in #108 and cited here",
      "- [ ] Blocked on #91 until re-crawl lands",
      "- [ ] still pending with no blocker",
      "- [x] completed with no citation",
    ].join("\n");
    assert.deepEqual(analyzeIssueBody(multiline, "2.6.0").counts, analyzeIssueBody(collapsed, "2.6.0").counts);
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

  it("accepts a local body file for offline reconciliation", () => {
    const args = parseArgs([
      "--body-file",
      "issue.md",
      "--issue-number",
      "145",
      "--title",
      "Reconcile ledger",
      "--repo",
      "owner/repo",
    ]);
    assert.equal(path.basename(args.bodyFile), "issue.md");
    assert.equal(args.issueNumber, 145);
    assert.equal(args.title, "Reconcile ledger");
  });

  it("rejects an invalid offline issue number", () => {
    assert.throws(() => parseArgs(["--body-file", "issue.md", "--issue-number", "-1"]), /non-negative integer/);
  });

  it("accepts citation validation as an explicit gate option", () => {
    const args = parseArgs(["69", "--validate-citations"]);
    assert.equal(args.validateCitations, true);
  });
});

describe("offline body-file ledgers", () => {
  it("builds a ledger from a local body without calling gh", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "issue-ledger-body-"));
    const file = path.join(dir, "145.md");
    fs.writeFileSync(file, "- [x] Evidence in `evals/tools/issue-ledger.mjs`\n- [ ] Blocked on #299 pending coordinator post.\n");
    try {
      const issue = readIssueFromBodyFile(file, 145, "Reconcile #145", "owner/repo");
      assert.equal(issue.number, 145);
      assert.equal(issue.title, "Reconcile #145");
      assert.equal(issue.url, "https://github.com/owner/repo/issues/145");
      assert.match(issue.body, /Blocked on #299/);

      const record = buildLedger({
        root: REPO_ROOT,
        repo: "owner/repo",
        bodyFile: file,
        issueNumber: 145,
        title: "Reconcile #145",
        issues: [],
      }, () => {
        throw new Error("gh should not be called for --body-file");
      });
      assert.equal(record.ok, true, formatReport(record));
      assert.equal(record.issues[0].counts.total, 2);
      assert.equal(record.issues[0].counts.checked, 1);
      assert.equal(record.issues[0].counts.openWithoutBlocker, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("can validate cited issues and report dangling citations", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "issue-ledger-citations-"));
    const file = path.join(dir, "145.md");
    fs.writeFileSync(file, "- [ ] Blocked on #299 pending coordinator post.\n- [x] Evidence in #404 and `evals/tools/issue-ledger.mjs`.\n");
    const run = (_command, args) => {
      const number = Number(args[2]);
      if (number === 299) {
        return {
          status: 0,
          stdout: JSON.stringify({ number, title: "Coordinator", url: "https://github.com/owner/repo/issues/299", body: "- [x] ok in #145" }),
          stderr: "",
        };
      }
      return { status: 1, stdout: "", stderr: "not found" };
    };

    try {
      const record = buildLedger({
        root: REPO_ROOT,
        repo: "owner/repo",
        bodyFile: file,
        issueNumber: 145,
        title: "Reconcile #145",
        issues: [],
        validateCitations: true,
      }, run);
      assert.equal(record.ok, false);
      assert.deepEqual(record.issues[0].findings.danglingIssueCitations, ["#404"]);
      assert.ok(ledgerFindingCodes(record).includes("dangling-issue-citation"));
      assert.match(formatReport(record), /dangling issue citations: 1/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs the body-file CLI without fetching an issue", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "issue-ledger-cli-"));
    const file = path.join(dir, "145.md");
    fs.writeFileSync(file, "- [x] Evidence in `evals/tools/issue-ledger.mjs`\n");
    let stdout = "";
    let stderr = "";
    try {
      const status = cli([
        "--body-file",
        file,
        "--issue-number",
        "145",
        "--title",
        "Reconcile #145",
        "--repo",
        "owner/repo",
        "--json",
        "-",
        "--quiet",
      ], {
        stdout: { write: (chunk) => { stdout += chunk; } },
        stderr: { write: (chunk) => { stderr += chunk; } },
        run: () => {
          throw new Error("gh should not be called");
        },
      });
      assert.equal(status, 0, stderr);
      assert.equal(stderr, "");
      assert.equal(JSON.parse(stdout).issues[0].number, 145);

      stderr = "";
      assert.equal(cli(["145", "--body-file", file], {
        stdout: { write() {} },
        stderr: { write: (chunk) => { stderr += chunk; } },
      }), 1);
      assert.match(stderr, /cannot be combined/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes CLI JSON to a file and reports CLI argument/build errors", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "issue-ledger-cli-json-"));
    const body = path.join(dir, "145.md");
    const json = path.join(dir, "ledger.json");
    fs.writeFileSync(body, "- [x] Evidence in `evals/tools/issue-ledger.mjs`\n");
    let stderr = "";
    try {
      assert.equal(cli([
        "--body-file",
        body,
        "--issue-number",
        "145",
        "--repo",
        "owner/repo",
        "--json",
        json,
        "--quiet",
      ], {
        stdout: { write() {} },
        stderr: { write: (chunk) => { stderr += chunk; } },
      }), 0, stderr);
      assert.equal(JSON.parse(fs.readFileSync(json, "utf8")).issues[0].number, 145);

      stderr = "";
      assert.equal(cli(["--repo"], {
        stdout: { write() {} },
        stderr: { write: (chunk) => { stderr += chunk; } },
      }), 1);
      assert.match(stderr, /needs a value/);

      stderr = "";
      assert.equal(cli(["--help"], {
        stdout: { write() {} },
        stderr: { write: (chunk) => { stderr += chunk; } },
      }), 0);
      assert.match(stderr, /Usage:/);

      stderr = "";
      assert.equal(cli([], {
        stdout: { write() {} },
        stderr: { write: (chunk) => { stderr += chunk; } },
      }), 1);
      assert.match(stderr, /Usage:/);

      stderr = "";
      assert.equal(cli(["999", "--repo", "owner/repo"], {
        stdout: { write() {} },
        stderr: { write: (chunk) => { stderr += chunk; } },
        run: () => ({ status: 1, stdout: "", stderr: "not found" }),
      }), 1);
      assert.match(stderr, /failed to read #999/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("process and repository helpers", () => {
  it("normalizes spawned process errors and runs a simple command", () => {
    assert.deepEqual(normalizeResult({ error: new Error("missing"), stdout: "", stderr: "" }), {
      status: 127,
      stdout: "",
      stderr: "missing",
    });
    const result = defaultRunner(process.execPath, ["-e", "process.stdout.write('ok')"], { cwd: REPO_ROOT });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "ok");
  });

  it("parses GitHub remotes and handles an undetectable repository", () => {
    assert.equal(parseRepoFromRemoteUrl("git@github.com:owner/repo.git"), "owner/repo");
    assert.equal(parseRepoFromRemoteUrl("https://github.com/owner/repo"), "owner/repo");
    assert.equal(parseRepoFromRemoteUrl("not a remote"), null);
    assert.equal(detectRepo(REPO_ROOT, () => ({ status: 0, stdout: "git@github.com:owner/repo.git\n", stderr: "" })), "owner/repo");
    assert.equal(detectRepo(REPO_ROOT, () => ({ status: 1, stdout: "", stderr: "" })), null);
  });
});
