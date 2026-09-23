## NFR.04: Time to First Rendered Graph

## Requirement

**ID:** NFR.04
**Title:** Time to First Rendered Graph
**Category:** Usability
**Priority:** Must Have
**Status:** Draft

### Statement

A new user following the documented recipe on a clean machine shall reach a rendered
specification graph within 5 minutes of median elapsed time.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.07.1, CN.07.2 | One executable first run; adoption against a contract |
| Applies To FRs | FR.07.1.1, FR.07.2.1 | Executable first run; adoption outcome |

## Measurement Criteria

- **Target:** median install-to-first-`/live` under **5 minutes**
- **Minimum Acceptable:** the recipe completes **in one pass** — currently it cannot, because `docs/docs.html` omits the canvas install
- **Current measured value:** **not measurable** — the documented path does not execute
- **Measurement Method:** timed run on a clean profile with no checkout and no `node_modules`, from the installed artifact

## Acceptance Criteria

- [ ] The recipe completes in one pass on a clean profile
- [ ] Elapsed time is recorded per run, not estimated
- [ ] Median across recorded runs is under 5 minutes
- [ ] The completion rate — runs reaching a graph divided by runs attempted — is recorded alongside the time
- [ ] A participant-originated run is included, not only maintainer replay

---
*Created: 2026-09-23*
