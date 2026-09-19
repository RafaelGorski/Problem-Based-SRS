# FR.01.4.7 — Capture the registry before-state by parsed content and submit the re-crawl

**Priority:** Should Have
**Status:** Draft
**Owning issue:** #140 (parent), #173/#184/#190 (execution children)

## Statement

The maintainer shall capture the machine-readable registry state as parsed observations
before re-submitting to skills.sh, shall record the submission timestamp in UTC, and
shall record explicitly whether the issue makes a release claim.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The listing must be refreshed **and verified as refreshed**, not assumed |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Parent issue | #140 | The re-crawl this issue captures and submits |

## Required capture

- [ ] `distribution-before.json` is captured before re-submission, containing the parsed
      `observations.registry` block (advertised names, declared count, parsed count, the
      description comparison, matched/expected heading sets) — not a prose summary.
- [ ] The skills.sh submission timestamp is recorded in UTC.
- [ ] The issue carries an explicit "not a release claim" record, or exactly one valid
      marker.
- [ ] The exit-code/findings distinction is recorded: a warning means the comparison did
      not run and is not a pass.
- [ ] If the submission cannot be completed, the affected boxes stay open and each names
      that blocker; a repository-side change alone is not completion.

## Current verification state

`node scripts/check-distribution.mjs` (real, live run) currently reports one finding:
the skills.sh listing advertises 8 skills this repository does not ship
(`business-context`, `complexity-analysis`, `customer-needs`, `customer-problems`,
`functional-requirements`, `software-glance`, `software-vision`, `zigzag-validator`).
This output **is** the before-state; a `distribution-before.json` snapshot captured from
an identical run should be attached to the live issue at re-submission time.

Re-submission itself (`https://www.skills.sh`) is a genuine third-party action outside
this repository and this session — it requires an actual visit to and interaction with a
website not under this repository's control, and cannot be simulated or fabricated here.
This item remains open, blocked on that external action, until it is performed by the
maintainer.

## Plan

See `docs/spec/remediation-plan.md`.
