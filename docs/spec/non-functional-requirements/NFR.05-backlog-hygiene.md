# NFR.05: Backlog hygiene

## Requirement

**ID:** NFR.05
**Title:** Backlog hygiene
**Category:** Maintainability
**Priority:** Must Have
**Status:** Draft

### Statement

Each open parent issue shall have at most one active child, so that the backlog does not restate the same work across passes.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Applies To FRs | FR.04.1.19, FR.04.1.20 | Requirements this quality attribute constrains |

## Measurement Criteria

- **Target:** <= 1 active child per open parent
- **Minimum Acceptable:** Every additional child explicitly marked superseded, naming what replaces it
- **Measurement Method:** The batch ledger counts active children per parent and reports parents carrying more than one

## Acceptance Criteria

- [ ] No open parent carries more than one active child
- [ ] Every superseded child names what supersedes it
- [ ] The ledger fails when a parent gains a second active child

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-28*
