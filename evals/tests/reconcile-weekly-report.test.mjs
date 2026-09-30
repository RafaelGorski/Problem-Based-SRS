import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { reconcileWeeklyReport, runReconciliation, selectPreviousReport } from "../../scripts/reconcile-weekly-report.mjs";

const issue = {
  html_url: "https://github.com/RafaelGorski/Problem-Based-SRS/issues/289",
  created_at: "2026-09-24T18:52:09Z",
  body: `# Weekly release report — 2026-09-24
| Train | Latest published | Planned Thursday target | Ready now? | Status |
| --- | --- | --- | --- | --- |
| Plugin | v2.7 | v2.7 | No | Already published |
| Canvas | v1.1.4 | v1.1.5 | Yes | Ready |`,
};
const releases = [
  { tag_name: "v1.1.5", name: "srs-navigator 1.1.5", published_at: "2026-09-24T21:57:43Z", html_url: "https://github.com/example/v1.1.5" },
  { tag_name: "v2.7", name: "Version 2.7", published_at: "2026-09-19T15:16:44Z", html_url: "https://github.com/example/v2.7" },
  { tag_name: "v1.1.4", name: "srs-navigator 1.1.4", published_at: "2026-08-20T19:29:16Z", html_url: "https://github.com/example/v1.1.4" },
];

describe("weekly release reconciliation", () => {
  it("reconciles both release trains against the report's historical UTC week", () => {
    const result = reconcileWeeklyReport(issue, releases);
    assert.equal(result.status, "reconciled");
    assert.equal(result.inferredPeriod, true);
    assert.equal(result.isoWeek, "2026-W39");
    assert.equal(result.periodStart, "2026-09-21T00:00:00.000Z");
    assert.equal(result.periodEnd, "2026-09-27T23:59:59Z");
    assert.equal(result.matches.length, 3);
    assert.deepEqual(result.discrepancies, []);
    assert.match(result.source, /all pages/);
  });

  it("rejects omitted in-window releases and distinguishes trains", () => {
    const added = { tag_name: "v2.8", name: "Version 2.8", published_at: "2026-09-27T23:59:59Z" };
    const result = reconcileWeeklyReport(issue, [...releases, added]);
    assert.equal(result.status, "discrepancies");
    assert.match(result.discrepancies[0], /plugin: published v2\.8 .* omitted/);
    assert.equal(reconcileWeeklyReport(issue, [...releases, { ...added, published_at: "2026-09-28T00:00:00Z" }]).status, "reconciled");
  });

  it("rejects reports that misstate published releases or their reporting period", () => {
    const period = "**Report period:** 2026-W39 · 2026-09-21T00:00:00.000Z through 2026-09-27T23:59:59Z (UTC)";
    assert.equal(reconcileWeeklyReport({ ...issue, body: `${period}\n${issue.body}` }, releases).inferredPeriod, false);
    assert.match(reconcileWeeklyReport({ ...issue, body: issue.body.replace("v2.7 | v2.7", "v2.9 | v2.7") }, releases).discrepancies[0], /latest published v2\.9/);
    assert.throws(() => reconcileWeeklyReport({ ...issue, created_at: "not-a-date" }, releases), /creation timestamp/);
    assert.throws(() => reconcileWeeklyReport({ ...issue, body: `**Report period:** 2026-W38 · 2026-09-21T00:00:00.000Z through 2026-09-27T23:59:59Z (UTC)\n${issue.body}` }, releases), /disagrees/);
    assert.throws(() => reconcileWeeklyReport({ ...issue, body: "No train table" }, releases), /train row/);
  });

  it("selects precisely the prior completed week's report", () => {
    const prior = { ...issue, title: "Weekly release report for 2026-09-24" };
    assert.equal(selectPreviousReport([prior], new Date("2026-10-01T15:00:00Z")), prior);
    assert.throws(() => selectPreviousReport([], new Date("2026-10-01T15:00:00Z")), /found 0/);
    assert.throws(() => selectPreviousReport([prior, prior], new Date("2026-10-01T15:00:00Z")), /found 2/);
  });

  it("refuses duplicate or malformed published records rather than silently passing", () => {
    assert.throws(() => reconcileWeeklyReport(issue, [...releases, releases[0]]), /Duplicate published release/);
    assert.throws(() => reconcileWeeklyReport(issue, [{ ...releases[0], published_at: "invalid" }]), /invalid published_at/);
    assert.ok(reconcileWeeklyReport(issue, [{ ...releases[0], name: "" }]).discrepancies.some((item) => /Unclassified/.test(item)));
    assert.match(reconcileWeeklyReport(issue, [{ ...releases[0], tag_name: "v1.1.6" }]).discrepancies.at(-1), /omitted/);
  });

  it("refuses unsupported latest tags, ready targets without tags, and ambiguous train tables", () => {
    const future = { ...releases[1], published_at: "2026-09-26T00:00:00Z" };
    assert.match(reconcileWeeklyReport(issue, [future, ...releases.slice(0, 1), releases[2]]).discrepancies[0], /latest published v2\.7/);
    assert.match(reconcileWeeklyReport(issue, [{ ...releases[1], name: "srs-navigator 2.7" }, releases[0], releases[2]]).discrepancies[0], /latest published v2\.7/);
    assert.match(reconcileWeeklyReport({ ...issue, body: issue.body.replace("v1.1.5 | Yes", "n/a | Yes") }, releases).discrepancies[0], /ready without a planned tag/);
    assert.match(reconcileWeeklyReport({ ...issue, body: issue.body.replace("v1.1.5 | Yes", "N/A | YES") }, releases).discrepancies[0], /ready without a planned tag/);
    assert.throws(() => reconcileWeeklyReport({ ...issue, body: `${issue.body}\n| Canvas | v1.1.4 | v1.1.5 | Yes | repeated |` }, releases), /exactly one/);
  });

  it("exercises the CLI contract without network calls", () => {
    const prior = { ...issue, number: 289, title: "Weekly release report for 2026-09-24" };
    const calls = [];
    const api = (args) => {
      calls.push(args.join(" "));
      if (args.at(-1).includes("/issues?")) return [[prior]];
      if (args[1]?.includes("/issues/289")) return prior;
      return [releases];
    };
    const output = [];
    assert.equal(runReconciliation(["--previous"], { api, now: new Date("2026-10-01T15:00:00Z"), write: (line) => output.push(JSON.parse(line)) }), 0);
    assert.equal(output[0].status, "reconciled");
    assert.ok(calls.some((call) => call.includes("per_page=100")));
    assert.equal(runReconciliation(["289"], { api: (args) => args[1]?.includes("/issues/") ? prior : [[...releases, { ...releases[0], tag_name: "v1.1.6" }]], write() {} }), 1);
    assert.throws(() => runReconciliation(["bogus"], { api }), /Usage/);
    assert.throws(() => runReconciliation(["289"], { api: (args) => args[1]?.includes("/issues/") ? prior : {} }), /paginated array/);
  });

  it("keeps prior-week reconciliation and issue evidence in the scheduled workflow", () => {
    const workflow = readFileSync(fileURLToPath(new URL("../../.github/workflows/thursday-release-report.yml", import.meta.url)), "utf8");
    assert.match(workflow, /node scripts\/reconcile-weekly-report\.mjs --previous > reconciliation\.json/);
    assert.match(workflow, /gh issue comment "\$number" --body-file reconciliation\.md/);
    assert.match(workflow, /exit "\$status"/);
  });
});
