# NFR.02: Evidence reproducibility

## Requirement

**ID:** NFR.02
**Title:** Evidence reproducibility
**Category:** Maintainability
**Priority:** Must Have
**Status:** Draft

### Statement

Every closure claim shall carry a re-runnable command and a stored artifact, so that a reviewer can reproduce the claim without the original author.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Applies To FRs | every FR in this pass | Requirements this quality attribute constrains |

## Measurement Criteria

- **Target:** 100% of ticked acceptance boxes cite a command and an artifact
- **Minimum Acceptable:** Zero ticked boxes without a citation
- **Measurement Method:** The batch ledger reports ticked boxes without citations as a failure mode

## Acceptance Criteria

- [ ] Every ticked acceptance box cites a command and an artifact
- [ ] Screenshots are attached with provenance identifying the version rendered
- [ ] CLI transcripts record the command, its exit code and its totals

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-28*
