# FR.06.1.7 — Run the declared observation window from published bytes and file the outcome

**Priority:** Could Have
**Status:** Draft
**Owning issue:** #148 (parent), #178/#188/#197 (execution children)

## Statement

The maintainer shall gate the adoption observation on a completed and validated
contract, and shall record explicitly whether the issue makes a release claim, so the
experiment cannot open against placeholder criteria.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.1 | The methodology must be shown to help someone outside this repository |
| Customer Problem | CP.06 | The backlog is entirely self-generated |
| Parent issue | #148 | The observation this issue gates |

## Required gating

- [ ] The observation window may not open until `node evals/tools/adoption-experiment.mjs
      --validate` reports the contract complete (all fields filled, not placeholders).
- [ ] The issue carries an explicit "not a release claim" record, or exactly one valid
      marker.
- [ ] Both hard predecessors are named as blockers on every box that depends on them:
      the registry re-crawl (#140/#147 chain) and the archive-derived `/live` proof
      (#138/#176 chain).
- [ ] A null result is recorded in advance as an acceptable outcome of the window — the
      experiment is not deemed to have failed merely because adoption did not occur.

## Current verification state

`evals/tools/adoption-experiment.mjs` and its validator exist and are covered by
`evals/tests/adoption-experiment.test.mjs`, so the gating mechanism itself is real and
tested. The contract fields it validates are, as of this writing, still placeholders —
predeclaring the actual adoption threshold and experiment parameters is tracked
separately (see #185). Running an actual external observation window requires a genuine
external participant outside this repository and cannot be fabricated or simulated in
this session; that action remains open, blocked on both hard predecessors above and on
the contract being completed.

## Plan

See `docs/spec/remediation-plan.md`.
