# FR.04.1.16: Canvas release-claim restatement

## Requirement

**ID:** FR.04.1.16
**Title:** Canvas release-claim restatement
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #306 — Restate every canvas release claim to v1.1.5 and republish archive-derived evidence
**Wave:** 1 — Restore proof and correct the claims

### Statement

The system shall restate every canvas release claim at the version actually published, and shall fail the check when a claim names a version with no release behind it.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #306 | Restate every canvas release claim to v1.1.5 and republish archive-derived evidence |

## Problem addressed

Issues carry machine-readable `release-claim` markers naming superseded canvas versions. Because the named releases are published, the closure gate returns a clean verdict for a release the issue no longer targets — the gate passes on the wrong artifact.

**Observed on 2026-09-28:** Canvas v1.1.5 is the current published release, but batch issues still carry markers and prose naming earlier versions. The ledger counts superseded version mentions across #138, #162 and #176. A clean verdict against a stale tag is worse than a red one, because it looks like evidence.

## Acceptance Criteria

- [ ] Every `release-claim` marker in the batch names the current published release for its train
- [ ] `issue-ledger.mjs` reports **0 superseded version mentions** across the batch
- [ ] No issue carries more than one `release-claim` marker
- [ ] The previous marker value is recorded on each edited issue
- [ ] **No acceptance box is ticked as a side effect** — restating a target is not evidence the target was met

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
gh release list --limit 10
node evals/tools/issue-ledger.mjs 138 139 145 148 149 162 176 --json ledger-canvas.json
node scripts/release-train.mjs --tag v1.1.5
node --test evals/tests/release-claim-census.test.mjs
```

- `gh release list --limit 10` → Current published tags for both trains, establishing what the markers should name.
- `node evals/tools/issue-ledger.mjs 138 139 145 148 149 162 176 --json ledger-canvas.json` → Zero superseded version mentions, and one marker per issue.
- `node scripts/release-train.mjs --tag v1.1.5` → Verdict `canvas`, proving the restated tag resolves to exactly one train.
- `node --test evals/tests/release-claim-census.test.mjs` → Census green across the batch.

### App track — explicitly out of scope

Marker restatement is issue metadata. The visual claim it unblocks is captured by #305; duplicating that screenshot here would prove nothing additional.

## Sequencing

| | |
|---|---|
| **Wave** | 1 — Restore proof and correct the claims |
| **Blocked by** | #293 |
| **Blocks** | #138, #139, #315 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
