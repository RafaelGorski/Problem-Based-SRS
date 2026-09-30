import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessClaims,
  formatReport,
  main,
  parseClaim,
  parseArgs,
  readFixture,
} from "../tools/closure-evidence.mjs";
import { classifyBatchVerdict, classifyIssueVerdict } from "../lib/closure-verdict.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = readFixture(path.join(root, "evals/fixtures/closure-2026-08-04.json"));

describe("release claim markers", () => {
  it("normalizes plugin tags but preserves canvas patch tags", () => {
    assert.deepEqual(parseClaim("<!-- release-claim train=plugin version=v2.6.0 -->"), {
      ok: true, train: "plugin", version: "v2.6.0", tag: "v2.6",
    });
    assert.equal(parseClaim("<!-- release-claim train=canvas version=v1.1.1 -->").tag, "v1.1.1");
  });
  it("rejects missing, duplicate, malformed, and ambiguous markers", () => {
    for (const body of [
      "", "<!-- release-claim train=plugin version=v2.6 --> <!-- release-claim train=canvas version=v1.1.1 -->",
      "<!-- release-claim train=other version=v2.6 -->", "<!-- release-claim train=canvas version=v1.1 -->",
    ]) assert.equal(parseClaim(body).ok, false);
  });
  it("accepts an explicit 'no release' declaration and treats it as satisfied without matching a published release", () => {
    const claim = parseClaim("<!-- release-claim train=none -->");
    assert.equal(claim.ok, true);
    assert.equal(claim.noRelease, true);
    const result = assessClaims({
      issues: [{ number: 999, state: "open", body: "<!-- release-claim train=none -->" }],
      releases: fixture.releases,
      prospective: [999],
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  });
});

describe("closure verdict classification", () => {
  it("returns only claim, non-claim, or undecidable for every state", () => {
    const claim = parseClaim("<!-- release-claim train=plugin version=v2.6 -->");
    const nonClaim = parseClaim("<!-- release-claim train=none -->");
    assert.equal(classifyIssueVerdict({ claim, state: "open" }), "claim");
    assert.equal(
      classifyIssueVerdict({ claim, state: "open", prospective: true, releasePublished: true }),
      "claim",
    );
    assert.equal(classifyIssueVerdict({ claim, state: "closed", releasePublished: true }), "claim");
    assert.equal(
      classifyIssueVerdict({ claim, state: "closed", releasePublished: false }),
      "undecidable",
    );
    assert.equal(
      classifyIssueVerdict({ claim, state: "open", prospective: true }),
      "undecidable",
    );
    assert.equal(classifyIssueVerdict({ claim: { ok: false }, state: "open" }), "undecidable");
    assert.equal(classifyIssueVerdict({ claim: nonClaim, state: "open" }), "non-claim");
    assert.equal(classifyIssueVerdict({ claim, state: "unknown" }), "undecidable");
    assert.equal(classifyIssueVerdict(), "undecidable");
  });

  it("reduces a non-empty assessment to exactly one batch verdict", () => {
    assert.equal(classifyBatchVerdict({ findings: [{}], checked: [] }), "undecidable");
    assert.equal(classifyBatchVerdict({ findings: [], checked: [{ verdict: "claim" }] }), "claim");
    assert.equal(classifyBatchVerdict({ findings: [], checked: [{ verdict: "non-claim" }] }), "non-claim");
    assert.equal(classifyBatchVerdict(), "undecidable");
  });

  it("classifies #139's explicit no-release marker as a non-claim", () => {
    const result = assessClaims({
      issues: [{ number: 139, state: "open", body: "<!-- release-claim train=none -->" }],
      releases: [],
    });
    assert.equal(result.verdict, "non-claim");
    assert.equal(result.checked[0].verdict, "non-claim");
    assert.equal(result.ok, true);
  });

  it("refuses an empty issue batch instead of returning a vacuous clean verdict", () => {
    const result = assessClaims({ issues: [], releases: [] });
    assert.equal(result.verdict, "undecidable");
    assert.equal(result.ok, false);
    assert.equal(result.findings[0].id, "issue-set-empty");
    assert.match(formatReport(result), /Verdict: undecidable[\s\S]*\*\*batch\*\*/);
  });

  it("marks a requested prospective issue missing from the query as undecidable", () => {
    const result = assessClaims({ issues: [], releases: [], prospective: [209] });
    assert.equal(result.verdict, "undecidable");
    assert.equal(result.ok, false);
    assert.deepEqual(result.findings, [{
      issue: 209,
      id: "issue-unreadable",
      detail: "issue #209 was not supplied",
    }]);
  });

  it("marks records with an unknown state undecidable", () => {
    const result = assessClaims({
      issues: [{ number: 207, state: "unknown", body: "<!-- release-claim train=none -->" }],
      releases: [],
    });
    assert.equal(result.verdict, "undecidable");
    assert.equal(result.checked[0].verdict, "undecidable");
    assert.equal(result.findings[0].id, "issue-state-indeterminate");
  });

  it("does not treat a closed issue as a prospective open issue", () => {
    const result = assessClaims({
      issues: [{
        number: 208,
        state: "closed",
        body: "<!-- release-claim train=plugin version=v2.6 -->",
      }],
      releases: [],
      prospective: [208],
    });
    assert.equal(result.verdict, "undecidable");
    assert.equal(result.findings[0].id, "issue-state-indeterminate");
    assert.match(result.findings[0].detail, /must be open/);
  });

  it("returns a stable verdict and fails only when the verdict is undecidable", () => {
    const closedClaim = {
      number: 206,
      state: "closed",
      body: "<!-- release-claim train=plugin version=v2.6 -->",
    };
    const withRelease = {
      issues: [closedClaim],
      releases: [{ tagName: "v2.6", name: "Version 2.6", isDraft: false, isPrerelease: false }],
    };
    assert.deepEqual(assessClaims(withRelease), assessClaims(withRelease));
    assert.equal(assessClaims(withRelease).verdict, "claim");
    assert.equal(assessClaims({ issues: [closedClaim], releases: [] }).verdict, "undecidable");

    const output = [];
    const originalLog = console.log;
    console.log = (message) => output.push(String(message));
    try {
      assert.equal(main(["--fixture", path.join(root, "evals/fixtures/closure-2026-08-04.json")]), 1);
    } finally {
      console.log = originalLog;
    }
    assert.match(output.join("\n"), /Verdict: undecidable/);
  });

  it("exits successfully for a determinate non-claim fixture", () => {
    const temp = fs.mkdtempSync(path.join(root, "evals", "fixtures", "closure-nonclaim-"));
    const file = path.join(temp, "fixture.json");
    const output = [];
    const originalLog = console.log;
    try {
      fs.writeFileSync(
        file,
        JSON.stringify({
          issues: [{ number: 139, state: "open", body: "<!-- release-claim train=none -->" }],
          releases: [],
        }),
      );
      console.log = (message) => output.push(String(message));
      assert.equal(main(["--fixture", file, "--json"]), 0);
      fs.writeFileSync(
        file,
        JSON.stringify({
          issues: [{
            number: 139,
            state: "open",
            body: "<!-- release-claim train=plugin version=v2.7 -->",
          }],
          releases: [],
        }),
      );
      assert.equal(main(["--fixture", file, "--json"]), 0);
    } finally {
      console.log = originalLog;
      fs.rmSync(temp, { recursive: true, force: true });
    }
    assert.match(output.join("\n"), /"verdict": "non-claim"/);
    assert.match(output.join("\n"), /"verdict": "claim"/);
  });

  it("reports command errors as an undecidable verdict", () => {
    const output = [];
    const errors = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (message) => output.push(String(message));
    console.error = (message) => errors.push(String(message));
    try {
      assert.equal(main(["--not-an-option"]), 1);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
    assert.match(errors.join("\n"), /unknown option/);
    assert.deepEqual(output, ["Verdict: undecidable"]);
  });
});

describe("closure evidence is deterministic", () => {
  it("replays the four closed-but-unpublished claims from the recorded fixture", () => {
    const result = assessClaims(fixture);
    assert.equal(result.ok, false);
    assert.equal(result.verdict, "undecidable");
    assert.deepEqual(result.findings.map((f) => f.issue), [89, 90, 129, 130]);
  });
  it("evaluates open issues in prospective mode", () => {
    const result = assessClaims({
      issues: fixture.issues,
      releases: fixture.releases,
      prospective: [137, 138],
    });
    assert.deepEqual(result.findings.map((f) => f.issue), [137, 138]);
    const released = assessClaims({
      issues: fixture.issues,
      releases: [
        ...fixture.releases,
        { tagName: "v2.6", name: "Version 2.6", isDraft: false, isPrerelease: false },
        { tagName: "v1.1.1", name: "srs-navigator 1.1.1", isDraft: false, isPrerelease: false },
      ],
      prospective: [137, 138],
    });
    assert.equal(released.ok, true);
  });
  it("fails when a published release is removed, then passes after restoration", () => {
    const passing = {
      issues: [
        { number: 137, state: "open", body: "<!-- release-claim train=plugin version=v2.6 -->" },
        { number: 138, state: "open", body: "<!-- release-claim train=canvas version=v1.1.1 -->" },
      ],
      releases: [
        { tagName: "v2.6", name: "Version 2.6", isDraft: false, isPrerelease: false },
        { tagName: "v1.1.1", name: "srs-navigator 1.1.1", isDraft: false, isPrerelease: false },
      ],
      prospective: [137, 138],
    };
    const removed = { ...passing, releases: passing.releases.slice(0, 1) };
    const failed = assessClaims(removed);
    assert.equal(failed.ok, false);
    assert.deepEqual(failed.findings.map((f) => f.issue), [138]);
    const restored = assessClaims(passing);
    assert.equal(restored.ok, true);
  });
  it("parses prospective issue numbers without allowing an implicit repository-wide scan", () => {
    assert.deepEqual(parseArgs(["--prospective", "137", "138"]), {
      json: false, fixture: null, prospective: [137, 138], issueNumbers: [],
    });
  });
  it("requires the declared train and ignores draft or prerelease releases", () => {
    const issue = { number: 1, state: "closed", body: "<!-- release-claim train=plugin version=v2.6 -->" };
    assert.equal(assessClaims({ issues: [issue], releases: [{ tagName: "v2.6", name: "srs-navigator 2.6", isDraft: false, isPrerelease: false }] }).ok, false);
    assert.equal(assessClaims({ issues: [issue], releases: [{ tagName: "v2.6", name: "Version 2.6", isDraft: true, isPrerelease: false }] }).ok, false);
  });
});

// Regression guard for the parity bug found on 2026-08-15 (#172): audit mode skipped every open
// issue entirely, so a batch of nine open parent issues — none carrying a well-formed marker —
// returned exit 0 ("every checked release claim has a matching published release") having
// examined zero of them, while `--prospective` over the identical input returned exit 1 naming
// seven as indeterminate. Reverting `assessClaims` to only examine closed issues in audit mode
// fails every test below.
describe("audit and prospective verdicts agree on identical input (#172)", () => {
  const openIndeterminate = [
    { number: 201, state: "open", body: "" },
    { number: 202, state: "open", body: "<!-- release-claim train=plugin version=v2.6 --> <!-- release-claim train=canvas version=v1.1.1 -->" },
  ];

  it("audit mode is not vacuously clean over open issues with no marker or a duplicate one", () => {
    const audit = assessClaims({ issues: openIndeterminate, releases: [] });
    assert.equal(audit.mode, "audit");
    assert.equal(audit.ok, false, "audit must examine open issues' markers, not only closed ones");
    assert.deepEqual(audit.findings.map((f) => f.issue).sort(), [201, 202]);
  });

  it("audit and prospective return the same verdict class over the same open issues", () => {
    const audit = assessClaims({ issues: openIndeterminate, releases: [] });
    const prospective = assessClaims({ issues: openIndeterminate, releases: [], prospective: [201, 202] });
    assert.equal(audit.ok, prospective.ok);
    assert.deepEqual(audit.findings.map((f) => f.issue).sort(), prospective.findings.map((f) => f.issue).sort());
  });

  it("reports how many claims were actually evaluated, so a clean run over zero is not silent", () => {
    const result = assessClaims({ issues: [], releases: [] });
    assert.equal(result.ok, false);
    assert.equal(result.verdict, "undecidable");
    assert.equal(result.evaluated, 0);
  });

  it("does not hold a well-formed open claim to publication in audit mode, only to readability", () => {
    // An open issue with a valid marker naming an unpublished release is not itself a
    // contradiction — it has not been closed on that claim yet. Only a missing/duplicate/
    // malformed marker, or an actually-closed claim with no matching release, is a finding.
    const issue = { number: 203, state: "open", body: "<!-- release-claim train=plugin version=v9.9 -->" };
    const audit = assessClaims({ issues: [issue], releases: [] });
    assert.equal(audit.ok, true);
    assert.equal(audit.evaluated, 1);
  });

  it("still holds a closed claim in audit mode and a prospective target to publication", () => {
    const closed = { number: 204, state: "closed", body: "<!-- release-claim train=plugin version=v9.9 -->" };
    const auditClosed = assessClaims({ issues: [closed], releases: [] });
    assert.equal(auditClosed.ok, false);

    const openSame = { number: 205, state: "open", body: "<!-- release-claim train=plugin version=v9.9 -->" };
    const prospectiveOpen = assessClaims({ issues: [openSame], releases: [], prospective: [205] });
    assert.equal(prospectiveOpen.ok, false);
  });
});
