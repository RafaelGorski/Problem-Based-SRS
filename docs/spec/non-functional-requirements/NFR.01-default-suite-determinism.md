# NFR.01: Default suite determinism

## Requirement

**ID:** NFR.01
**Title:** Default suite determinism
**Category:** Reliability
**Priority:** Must Have
**Status:** Draft

### Statement

The default test suite shall produce identical results on every run from the same commit, without network access or provider credentials.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.03.2 | A contributor needs identical results from the same commit across consecutive runs, so a difference means a regression. |
| Customer Problem | CP.03 | The default verification runner is red, so no green claim is falsifiable |
| Applies To FRs | FR.03.1.1, FR.04.1.21 | Requirements this quality attribute constrains |

## Measurement Criteria

- **Target:** Two consecutive runs from one commit report identical per-suite totals
- **Minimum Acceptable:** Zero tracked files modified by a run
- **Measurement Method:** Run the consolidated suite twice from a clean checkout and diff the totals and `git status --porcelain`

## Acceptance Criteria

- [ ] Two consecutive runs from the same commit report identical totals
- [ ] `git status --porcelain` is empty after each run
- [ ] Provider-gated suites report as skipped, not failed, when credentials are absent

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-28*
