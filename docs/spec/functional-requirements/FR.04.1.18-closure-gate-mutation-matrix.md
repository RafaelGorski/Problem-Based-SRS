# FR.04.1.18: Closure-gate mutation matrix

## Requirement

**ID:** FR.04.1.18
**Title:** Closure-gate mutation matrix
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #297 — Execute the closure-gate mutation matrix and prove each failure mode
**Wave:** 1 — Restore proof and correct the claims

### Statement

The system shall demonstrate, for each declared closure-gate failure mode, a mutation that the gate rejects, so that a green verdict is falsifiable rather than assumed.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #297 | Execute the closure-gate mutation matrix and prove each failure mode |

## Problem addressed

The closure gate that every issue in this batch is supposed to close against has never been falsified. A gate that has only ever returned green proves nothing about the cases it claims to catch.

**Observed on 2026-09-28:** No recorded run demonstrates the gate rejecting an open box without a blocker, a ticked box without a citation, a stale version claim, or a duplicated release-claim marker. Until each failure mode is produced deliberately, a clean verdict is indistinguishable from a gate that cannot fail.

## Acceptance Criteria

- [ ] Every declared failure mode is produced deliberately and its rejection recorded with an exit code
- [ ] Each fixture trips exactly one mode; cross-tripping is reported as a defect in the gate
- [ ] The matrix runs from committed fixtures, not from ad-hoc edits to live issues
- [ ] The real batch is evaluated against the matrix and its current trips are recorded
- [ ] Reverting any single guard causes the corresponding fixture to pass, proving the guard is load-bearing

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node --test evals/tests/issue-ledger.test.mjs
node evals/tools/issue-ledger.mjs 138 139 140 142 145 147 148 149 --json ledger-batch.json
node --test evals/tests/release-issue-gate.test.mjs
```

- `node --test evals/tests/issue-ledger.test.mjs` → Exit 0 across the full fixture matrix.
- `node evals/tools/issue-ledger.mjs 138 139 140 142 145 147 148 149 --json ledger-batch.json` → Ledger JSON for the live batch, with the tripped modes listed per issue.
- `node --test evals/tests/release-issue-gate.test.mjs` → Gate behaviour under each mutated fixture, one assertion per failure mode.

### App track — explicitly out of scope

The closure gate operates on issue metadata. No rendered surface changes, so the browser is explicitly out of scope for this requirement.

## Sequencing

| | |
|---|---|
| **Wave** | 1 — Restore proof and correct the claims |
| **Blocked by** | #292 |
| **Blocks** | #149, #318 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
