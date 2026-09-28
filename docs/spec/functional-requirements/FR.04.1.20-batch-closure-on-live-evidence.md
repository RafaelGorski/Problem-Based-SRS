# FR.04.1.20: Batch closure on live evidence

## Requirement

**ID:** FR.04.1.20
**Title:** Batch closure on live evidence
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #149 — Close the release, registry, adoption, and ledger batch only on live evidence
**Wave:** 7 — Batch closure

### Statement

The system shall close the batch only when every constituent issue carries a re-checkable evidence artifact, and shall record the closure verdict with the ledger it was computed from.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #149 | Close the release, registry, adoption, and ledger batch only on live evidence |

## Problem addressed

This is the batch's closing issue. It must close on a green ledger produced from live state, with every constituent issue's evidence attached and re-checkable.

**Observed on 2026-09-28:** The batch currently spans 57 open issues across four levels of nesting, with the same work restated by up to four children per parent. Closing it on anything other than a re-derived ledger would record a completion that did not happen.

## Acceptance Criteria

- [ ] #318's reconciliation is green and was produced in the same session as closure
- [ ] #297's mutation matrix has falsified every declared failure mode
- [ ] Every constituent issue has an attached, re-checkable evidence artifact
- [ ] The closure verdict is recorded with the ledger it was computed from
- [ ] Every superseded duplicate is closed with an explicit reference to what supersedes it

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node evals/tools/issue-ledger.mjs --batch --json ledger-final.json
node scripts/check-release-issue-gate-cli.mjs --batch
pwsh -File run-tests.ps1 -NoOpen
```

- `node evals/tools/issue-ledger.mjs --batch --json ledger-final.json` → Green ledger, produced in the closing session.
- `node scripts/check-release-issue-gate-cli.mjs --batch` → Recorded verdict with exit code.
- `pwsh -File run-tests.ps1 -NoOpen` → Exit 0 in the **same session** as the ledger, linking the batch claim to a green runner.

### App track — explicitly out of scope

Batch closure is an accounting action over evidence captured elsewhere. Every visual artifact it cites was produced by an upstream issue and is attached by reference.

## Sequencing

| | |
|---|---|
| **Wave** | 7 — Batch closure |
| **Blocked by** | #318, #297, #140 |
| **Blocks** | #319 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
