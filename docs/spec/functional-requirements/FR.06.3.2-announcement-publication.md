# FR.06.3.2: Announcement publication on a green gate

## Requirement

**ID:** FR.06.3.2
**Title:** Announcement publication on a green gate
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #314 — Publish the announcement once every surface agrees, at the versions actually published
**Wave:** 5 — Announcement

### Statement

The system shall publish the announcement only on a green parity gate, citing the versions actually published and the adoption outcome exactly as recorded.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.3 | The maintainer needs the announcement withheld until every surface agrees at the versions actually published. |
| Customer Problem | CP.06 | The backlog is entirely self-generated |
| Issue | #314 | Publish the announcement once every surface agrees, at the versions actually published |

## Problem addressed

The announcement must state what shipped, at the versions actually published, and must not claim an adoption outcome that was not measured.

**Observed on 2026-09-28:** Plugin v2.7 and canvas v1.1.5 are published. Until #313's gate is green and #311 has filed an outcome, any announcement would be asserting both the versions and the evidence.

## Acceptance Criteria

- [ ] The announcement names plugin **2.7.0** and canvas **1.1.5** as separate trains
- [ ] The adoption outcome is quoted as recorded, including a not-met verdict
- [ ] The #313 gate verdict is green and attached, timestamped immediately before publication
- [ ] Every cited version resolves to a published release after publication
- [ ] No claim in the announcement lacks a cited source

## Verification

**Track:** App (Playwright) + Skills (CLI)

### Skills track — CLI

```bash
node scripts/check-release-issue-gate-cli.mjs --announcement
node scripts/check-distribution.mjs --strict
```

- `node scripts/check-release-issue-gate-cli.mjs --announcement` → Green verdict, timestamped immediately before publication.
- `node scripts/check-distribution.mjs --strict` → Post-publication run confirming every cited version resolves.

### App track — Playwright with screenshots

```bash
cd .github/extensions/srs-navigator
npx playwright test site.test.mjs --project=site
```

- **Screenshot of the published site** showing the announced versions as a visitor sees them, captured after publication.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 5 — Announcement |
| **Blocked by** | #313, #311, #315 |
| **Blocks** | #318 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
