# FR.06.2.2: Adoption outcome scored against pre-registration

## Requirement

**ID:** FR.06.2.2
**Title:** Adoption outcome scored against pre-registration
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #311 — Record the participant outcome against the pre-registered threshold
**Wave:** 4 — Coordination roots close

### Statement

The system shall score the adoption outcome against the pre-registered contract without amending it, and shall publish a not-met verdict unchanged when that is the result.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.2 | The maintainer needs the adoption threshold, window and outcome rule pre-registered before observation begins. |
| Customer Problem | CP.06 | The backlog is entirely self-generated |
| Issue | #311 | Record the participant outcome against the pre-registered threshold |

## Problem addressed

An experiment that runs but is never scored leaves the announcement free to claim whatever it likes. The outcome must be computed by the pre-registered rule and recorded, including when it fails.

**Observed on 2026-09-28:** No outcome record exists because no experiment has run. The risk being guarded against is specific: scoring after the fact, or quietly relaxing the threshold once the sessions come in below it.

## Acceptance Criteria

- [ ] The verdict is computed by the pre-registered rule, from the raw session data
- [ ] The threshold at scoring time is byte-identical to the threshold at pre-registration
- [ ] A not-met outcome is recorded as an outcome, not as a reason to re-run
- [ ] The raw per-session data is stored alongside the verdict
- [ ] A synthetic below-threshold set produces a not-met verdict (negative test)

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node evals/tools/adoption-experiment.mjs --score
node --test evals/tests/adoption-experiment.test.mjs
```

- `node evals/tools/adoption-experiment.mjs --score` → Verdict plus the raw session data it was computed from.
- `node --test evals/tests/adoption-experiment.test.mjs` → Below-threshold fixture yields not-met; threshold immutability asserted.

### App track — explicitly out of scope

Scoring is arithmetic over recorded sessions. The rendered evidence is #142's per-participant screenshots, referenced here rather than re-captured.

## Sequencing

| | |
|---|---|
| **Wave** | 4 — Coordination roots close |
| **Blocked by** | #142, #309 |
| **Blocks** | #314 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
