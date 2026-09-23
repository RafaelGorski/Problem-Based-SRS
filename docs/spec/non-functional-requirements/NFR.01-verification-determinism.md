## NFR.01: Verification Determinism

## Requirement

**ID:** NFR.01
**Title:** Verification Determinism
**Category:** Reliability
**Priority:** Must Have
**Status:** Draft

### Statement

The default verification suite shall produce identical pass/fail results across consecutive
runs on an unchanged tree, and shall complete within 180 seconds.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.1, CN.02.1 | Green baseline; verification that leaves the tree untouched |
| Applies To FRs | FR.01.1.1, FR.02.1.1 | Clean-checkout baseline and tracked-state immutability |

## Measurement Criteria

- **Target:** two consecutive runs on an unchanged tree report identical counts
- **Minimum Acceptable:** any difference between runs is explained by a named non-deterministic input
- **Runtime target:** ≤ 180 s (measured 2026-09-23: **113.1 s**, within budget)
- **Measurement Method:** run `run-tests.ps1 -NoOpen` twice, diff the printed summaries

## Acceptance Criteria

- [ ] Two consecutive runs report identical pass/fail counts
- [ ] The second run is not green solely because the first repaired state (the current lockfile defect)
- [ ] Total runtime stays at or under 180 seconds
- [ ] LLM suites report `SKIPPED` distinctly from `PASS` when no provider key is present

---
*Created: 2026-09-23*
