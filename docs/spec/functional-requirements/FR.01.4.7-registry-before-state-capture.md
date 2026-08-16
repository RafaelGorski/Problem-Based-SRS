## FR.01.4.7: Registry Before-State Capture

## Requirement

**ID:** FR.01.4.7
**Title:** Capture the registry before-state by parsed content and submit the re-crawl
**Priority:** Should Have
**Status:** Draft

### Statement

The maintainer shall capture the machine-readable registry state as **parsed observations**
before re-submitting the repository to the skills.sh registry, and shall record the
submission timestamp in UTC, so that a later run can be compared against a recorded
starting point rather than asserted to have changed.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The listing must be refreshed **and verified as refreshed**, not assumed |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #173 | The sub-issue that owns the capture and submission |

## Problems found (2026-08-16)

1. **The drift is unchanged.** `node scripts/check-distribution.mjs --strict` exits **1**
   with a single finding: the listing advertises **8 skills this repository does not
   ship** — `business-context`, `complexity-analysis`, `customer-needs`,
   `customer-problems`, `functional-requirements`, `software-glance`, `software-vision`,
   `zigzag-validator`. All were consolidated into `problem-based-srs` by #50.
2. **No before-state has ever been captured.** `distribution-before.json` does not exist,
   so nothing a later run produced could be demonstrated to differ from it.
3. **The blocker cleared long ago.** Plugin `v2.6` published 2026-08-05; this item has no
   remaining predecessor and has simply not been started.
4. **All 9 of #173's acceptance boxes are open** with no named blocker.

## Acceptance Criteria

- [ ] `distribution-before.json` is captured **before** re-submission and attached, and it
      contains the parsed `observations.registry` block — not a prose summary of it.
- [ ] The before-state records the advertised names, the declared count, the parsed count,
      the description comparison, and the matched/expected heading sets.
- [ ] The skills.sh submission timestamp is recorded in **UTC** on the issue.
- [ ] The distinction between exit code and findings is recorded explicitly: a warning
      means the comparison did not run and is not a pass.
- [ ] If the submission cannot be completed, the external boxes stay **open** and each
      names that blocker. A repository-side change is not completion.

## Verification

### Skills track — CLI

```bash
node scripts/check-distribution.mjs --json > distribution-before.json
node scripts/check-distribution.mjs --strict; echo "exit=$?"   # expect 1, 8 phantom skills

# Manual action: re-submit at https://www.skills.sh; record the UTC timestamp.

node --test evals/tests/registry-listing-content.test.mjs evals/tests/distribution-surfaces.test.mjs
```

The offline parser fixtures stay green throughout — they prove the reader, not the surface.

### App track — Playwright: bounded, and not the gate

The local suite never fetches skills.sh. Only the landing page the listing points at is
in scope:

```bash
cd .github/extensions/srs-navigator && npx playwright test --project=site
```

A manual browser screenshot of the listing may be attached as a **human observation**; the
parsed `observations.registry` values are the gate.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
