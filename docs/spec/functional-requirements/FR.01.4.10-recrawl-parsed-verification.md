# FR.01.4.10: Re-crawl verified by parsed content

## Requirement

**ID:** FR.01.4.10
**Title:** Re-crawl verified by parsed content
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #301 — Verify the re-crawl by parsed content rather than by exit code
**Wave:** 2 — Verify the mechanisms

### Statement

The system shall verify a registry re-crawl by comparing parsed page content against the shipped skills, and shall not treat a successful submission as evidence of refresh.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The maintainer needs the registry listing verified as refreshed, not assumed to be. |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #301 | Verify the re-crawl by parsed content rather than by exit code |

## Problem addressed

An exit code from the distribution monitor answers whether the check ran, not whether the listing is current. Closing the registry work on an exit code would record a refresh that may never have happened.

**Observed on 2026-09-28:** The monitor deliberately exits 0 on warnings, so a page it could not parse and a page that is genuinely clean produce the same code. `registry-listing-drift` clearing proves only that the **names** line up; `registry-skill-stale` is the finding that proves content was actually re-published.

## Acceptance Criteria

- [ ] The re-crawl request is recorded with a timestamp
- [ ] The after-state is a **parsed** capture, diffed by entry name against #300's before-state
- [ ] `registry-listing-drift` and `registry-skill-stale` are evaluated and reported **separately**
- [ ] Unreadable states are reported as not-verified and do not satisfy any acceptance box
- [ ] Elapsed time between request and observed change is recorded

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node scripts/check-distribution.mjs --strict
node --test evals/tests/registry-listing-content.test.mjs
node --test evals/tests/distribution-drift.test.mjs
```

- `node scripts/check-distribution.mjs --strict` → After-state findings, captured with a timestamp.
- `node --test evals/tests/registry-listing-content.test.mjs` → Unreadable-vs-stale separation holds.
- `node --test evals/tests/distribution-drift.test.mjs` → Parser contract green, so the diff is trustworthy.

### App track — explicitly out of scope

Verification is by parsed payload, deliberately not by page appearance — a screenshot would reintroduce exactly the by-eye check this requirement replaces.

## Sequencing

| | |
|---|---|
| **Wave** | 2 — Verify the mechanisms |
| **Blocked by** | #300 |
| **Blocks** | #302, #140 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
