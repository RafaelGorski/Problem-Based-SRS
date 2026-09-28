# FR.01.4.9: Dated parsed registry before-state

## Requirement

**ID:** FR.01.4.9
**Title:** Dated parsed registry before-state
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #300 — Capture and store the parsed registry before-state, dated before any re-crawl
**Wave:** 1 — Restore proof and correct the claims

### Statement

The system shall capture a dated, parsed before-state of the registry listing prior to re-submission, so that any later refresh can be measured against it.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The maintainer needs the registry listing verified as refreshed, not assumed to be. |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #300 | Capture and store the parsed registry before-state, dated before any re-crawl |

## Problem addressed

A re-crawl cannot be shown to have changed anything unless the state before it was captured and dated. Without a stored before-state, an unchanged listing and a successful refresh are indistinguishable.

**Observed on 2026-09-28:** Today's `node scripts/check-distribution.mjs --strict` reached skills.sh and reported that the listing still advertises **eight retired skills** against the single consolidated skill the repository ships. That finding is reported but never stored, so tomorrow's run has nothing to diff against.

## Acceptance Criteria

- [ ] A dated before-state artifact exists containing the **parsed** registry entries, not console output
- [ ] The eight retired entries are listed by name
- [ ] The capture records both a timestamp and the commit it was taken at
- [ ] The capture demonstrably predates the re-crawl request recorded in #301
- [ ] An unreadable page is stored as `unreadable`, never as an empty-but-clean listing

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node scripts/check-distribution.mjs --strict
node --test evals/tests/distribution-drift.test.mjs
node --test evals/tests/registry-listing-content.test.mjs
```

- `node scripts/check-distribution.mjs --strict` → Full findings list; exit code recorded separately from the findings (the monitor is advisory by design).
- `node --test evals/tests/distribution-drift.test.mjs` → Exit 0 — the parser's own contract holds before its output is trusted as a baseline.
- `node --test evals/tests/registry-listing-content.test.mjs` → Confirms unreadable states are surfaced as warnings rather than silently clean.

### App track — explicitly out of scope

The before-state is a parsed third-party payload. A screenshot of skills.sh would prove only what the page looked like, not what the parser read, so the CLI capture is the stronger evidence and the browser is out of scope.

## Sequencing

| | |
|---|---|
| **Wave** | 1 — Restore proof and correct the claims |
| **Blocked by** | #292 |
| **Blocks** | #301 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
