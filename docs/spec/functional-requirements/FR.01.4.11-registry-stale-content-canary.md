# FR.01.4.11: Registry stale-content canary

## Requirement

**ID:** FR.01.4.11
**Title:** Registry stale-content canary
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #302 — Prove the re-crawl republished current content, with the stale-content canary
**Wave:** 3 — Content proof and external signal

### Statement

The system shall detect a registry page that names a shipped skill while serving an older copy of it, and shall prove that detection against a known-stale canary fixture.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The maintainer needs the registry listing verified as refreshed, not assumed to be. |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #302 | Prove the re-crawl republished current content, with the stale-content canary |

## Problem addressed

Names agreeing is the cheap half of the check. The listing can advertise the right skill while serving an older copy of it — an outdated description, or sections the page never renders. Only a content comparison catches that.

**Observed on 2026-09-28:** Captured 2026-07-31, the `problem-based-srs` page was missing the **Identifier Notation (CANONICAL)** section and still taught `FR-001`, the notation the methodology replaced. The listing named the skill correctly throughout. A names-only check would have passed.

## Acceptance Criteria

- [ ] The shipped `SKILL.md` sections are compared against the rendered registry page
- [ ] The canonical Identifier Notation section is present on the published page
- [ ] The retired `FR-001` hyphen notation is **absent** from the published page
- [ ] The stale-content canary fixture is reported as stale, proving the check is falsifiable
- [ ] Version-unverifiable is emitted as a **notice**, not as a finding, and does not affect the exit code

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node scripts/check-distribution.mjs --strict
node --test evals/tests/registry-listing-content.test.mjs
node --test evals/tests/skills-static.test.mjs
```

- `node scripts/check-distribution.mjs --strict` → `registry-skill-stale` cleared, with the notice channel rendered under "Not verified this run".
- `node --test evals/tests/registry-listing-content.test.mjs` → Canary fixture reported stale; notice channel separated from findings.
- `node --test evals/tests/skills-static.test.mjs` → Confirms the notation the page is compared against is the canonical one.

### App track — explicitly out of scope

The comparison is between parsed page content and shipped markdown. A screenshot records appearance, which is the weaker claim this requirement exists to replace.

## Sequencing

| | |
|---|---|
| **Wave** | 3 — Content proof and external signal |
| **Blocked by** | #301 |
| **Blocks** | #140 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
