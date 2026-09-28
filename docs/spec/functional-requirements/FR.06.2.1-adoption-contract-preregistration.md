# FR.06.2.1: Adoption contract pre-registration

## Requirement

**ID:** FR.06.2.1
**Title:** Adoption contract pre-registration
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #309 — Pre-register the adoption contract: threshold, window and outcome rule
**Wave:** 2 — Verify the mechanisms

### Statement

The system shall pre-register the adoption experiment's success contract, including its not-met verdict, before any data is collected.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.2 | The maintainer needs the adoption threshold, window and outcome rule pre-registered before observation begins. |
| Customer Problem | CP.06 | The backlog is entirely self-generated |
| Issue | #309 | Pre-register the adoption contract: threshold, window and outcome rule |

## Problem addressed

An adoption result chosen after the data arrives is not evidence. The threshold, the observation window and the rule that maps the observation to a verdict must exist, in writing, before the first participant runs anything.

**Observed on 2026-09-28:** No pre-registered contract exists. The daily eval proposes 5 sessions in 2 weeks with >= 4/5 completing and a median time-to-first-graph <= 5 minutes, but that target lives in a report, not in a committed contract the experiment is bound to.

## Acceptance Criteria

- [ ] A committed contract states participant count, window, threshold and outcome rule
- [ ] The **failure** verdict is stated as explicitly as the success verdict
- [ ] The measurement method is timed observation, with "first graph rendered" defined
- [ ] The experiment tooling reads the threshold from the committed contract
- [ ] Editing the threshold after the window opens fails the guard (negative test)

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node --test evals/tests/adoption-experiment.test.mjs
node evals/tools/adoption-experiment.mjs --validate
```

- `node --test evals/tests/adoption-experiment.test.mjs` → Exit 0, including the post-hoc-edit negative case.
- `node evals/tools/adoption-experiment.mjs --validate` → Contract parses and every required field is present.

### App track — explicitly out of scope

Pre-registration is a document. The rendered evidence belongs to #142, which runs against this contract.

## Sequencing

| | |
|---|---|
| **Wave** | 2 — Verify the mechanisms |
| **Blocked by** | #308 |
| **Blocks** | #142, #311 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
