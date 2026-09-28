# FR.04.1.21: Final closure ordering

## Requirement

**ID:** FR.04.1.21
**Title:** Final closure ordering
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #319 — Close last, on a green ledger and a green runner in the same session
**Wave:** 8 — Final ordering

### Statement

The system shall close the batch's final issue only when the ledger and the test runner are both green at the same commit in the same session.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #319 | Close last, on a green ledger and a green runner in the same session |

## Problem addressed

This issue exists to enforce ordering: it is the last thing closed, and it may only close when the ledger and the test runner are both green **in one session**. Separately-green artifacts from different commits do not compose into a green claim.

**Observed on 2026-09-28:** Today the runner is red (1,287/1,299) and the ledger is unreconciled. Historically these have been reported green at different times, which is precisely the composition error this issue guards against.

## Acceptance Criteria

- [ ] #149 is closed on a green ledger
- [ ] `run-tests.ps1 -NoOpen` exits 0 at the **same commit** as the ledger
- [ ] Both artifacts record that shared commit SHA
- [ ] No batch issue other than this one remains open
- [ ] This issue is closed last, citing both artifacts

## Verification

**Track:** Skills (CLI) + App

### Skills track — CLI

```bash
pwsh -File run-tests.ps1 -NoOpen
node evals/tools/issue-ledger.mjs --batch --json ledger-final.json
gh issue list --state open --limit 100
```

- `pwsh -File run-tests.ps1 -NoOpen` → Exit 0 with the commit SHA recorded in the transcript.
- `node evals/tools/issue-ledger.mjs --batch --json ledger-final.json` → Green ledger stamped with the same SHA.
- `gh issue list --state open --limit 100` → Only this issue remains from the batch.

### App track — Playwright with screenshots

```bash
cd .github/extensions/srs-navigator
npx playwright test --project=site --project=canvas
```

- **Final screenshots of both the site and the canvas** at the closing commit, as the end-state record for the batch.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 8 — Final ordering |
| **Blocked by** | #149, #292 |
| **Blocks** | — |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
