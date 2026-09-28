# FR.04.1.19: Closure-time batch reconciliation

## Requirement

**ID:** FR.04.1.19
**Title:** Closure-time batch reconciliation
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #318 — Reconcile the batch against live evidence immediately before closure
**Wave:** 6 — Ledger reconciliation

### Statement

The system shall re-derive batch membership from live state at closure time, and shall abort closure when membership changed after the final ledger was taken.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #318 | Reconcile the batch against live evidence immediately before closure |

## Problem addressed

Live state moves during verification. A ledger built at the start of a session and acted on at the end can close issues on evidence that has since changed.

**Observed on 2026-09-28:** This has already happened: in a prior pass #146 was open at 13:11 and closed as NOT_PLANNED by 13:35 within the same verification session. Membership must therefore be re-derived at closure time, not carried forward.

## Acceptance Criteria

- [ ] Membership is re-derived from live state at closure time
- [ ] Zero open boxes without a blocker; zero ticked boxes without a citation
- [ ] Every parent has exactly **one** active child
- [ ] The session-start to closure-time diff is recorded
- [ ] Closure aborts if membership changes after the final ledger (negative test)

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node evals/tools/issue-ledger.mjs --batch --json ledger-closure.json
node --test evals/tests/issue-ledger.test.mjs
node scripts/check-release-issue-gate-cli.mjs --batch
```

- `node evals/tools/issue-ledger.mjs --batch --json ledger-closure.json` → Closure-time ledger with membership derivation timestamp.
- `node --test evals/tests/issue-ledger.test.mjs` → Includes the membership-changed abort case.
- `node scripts/check-release-issue-gate-cli.mjs --batch` → Verdict and exit code at closure time.

### App track — explicitly out of scope

Ledger reconciliation is issue metadata. The rendered evidence it cites was captured by #305, #308, #142 and #314.

## Sequencing

| | |
|---|---|
| **Wave** | 6 — Ledger reconciliation |
| **Blocked by** | #138, #139, #140, #297, #314, #315, #316 |
| **Blocks** | #149 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
