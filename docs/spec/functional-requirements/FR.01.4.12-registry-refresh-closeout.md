# FR.01.4.12: Registry refresh close-out

## Requirement

**ID:** FR.01.4.12
**Title:** Registry refresh close-out
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #140 — Coordinate the skills.sh registry refresh and parsed-content verification
**Wave:** 4 — Coordination roots close

### Statement

The system shall close the registry-refresh thread only when a parsed after-state shows both the listing and its per-skill pages matching what the repository ships.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The maintainer needs the registry listing verified as refreshed, not assumed to be. |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #140 | Coordinate the skills.sh registry refresh and parsed-content verification |

## Problem addressed

This issue coordinates the registry refresh end to end: the before-state was captured, the request was made, time elapsed, and the result was verified by content. It closes only when all four are true and recorded.

**Observed on 2026-09-28:** The listing still advertises eight retired skills. The issue currently carries open children across three passes (#173, #190, #184, #303, and the #147 sub-tree) restating the same steps, so no single child is the evidence of record.

## Acceptance Criteria

- [ ] The listing advertises exactly the skills the repository ships (**zero** retired entries)
- [ ] `registry-skill-stale` is clear, evaluated separately from `registry-listing-drift`
- [ ] Before-state, request time, elapsed time and after-state are all recorded
- [ ] Exactly one active child remains under this issue
- [ ] Closure cites a parsed after-state, not an exit code

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node scripts/check-distribution.mjs --strict
node evals/tools/issue-ledger.mjs 140 147 173 175 184 187 190 195 303 304 --json ledger-140.json
```

- `node scripts/check-distribution.mjs --strict` → Zero registry findings; notices rendered separately.
- `node evals/tools/issue-ledger.mjs 140 147 173 175 184 187 190 195 303 304 --json ledger-140.json` → One active child; zero unblocked open boxes.

### App track — explicitly out of scope

Registry state is verified by parsed payload. This is deliberate: the by-eye check is what let the 2026-07-31 stale content pass unnoticed.

## Sequencing

| | |
|---|---|
| **Wave** | 4 — Coordination roots close |
| **Blocked by** | #301, #302 |
| **Blocks** | #318 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
