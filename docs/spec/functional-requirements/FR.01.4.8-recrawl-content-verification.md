# FR.01.4.8 — Re-crawl verification by parsed-content diff

**Priority:** Should Have
**Status:** Draft
**Owning issue:** #175 (parent), #195 (execution child)

## Statement

The re-crawl verification shall compare the registry's parsed content against the
recorded before-state and against what the repository actually ships — entry names
**and** the shipped skill's description and section headings — and shall report an
unreadable page as unverified rather than as a pass.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The listing must be refreshed **and verified as refreshed**, not assumed |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |

## Why a name-only diff is insufficient

`registry-listing-drift` compares entry **names** only. Clearing that finding proves the
eight retired names disappeared; it does not prove the surviving page's description or
section headings match what the repository ships, nor that it no longer teaches retired
notation (e.g. hyphenated `FR-001` IDs). `registry-skill-stale` is the finding that
covers the substantive axis, and it must be shown to have actually run (not silently
skipped) rather than merely absent from the findings list.

`registry-listing-unreadable` and `registry-skill-unreadable` are warnings that exit 0 by
design — a broken parser and a genuinely clean listing are indistinguishable from the
exit code alone, so a run reporting either must be recorded as **unverified**, not passed.

## Required comparison

1. A before-state capture (`distribution-before.json`, produced by the #140/#173/#184/#190
   chain) exists prior to any post-submission comparison.
2. The post-submission run's parsed `observations.registry` block is diffed against that
   before-state, and the diff is attached — not a prose summary of it.
3. The entry list is confirmed to contain exactly the skills this repository ships.
4. The shipped skill's page description and section headings (including **Identifier
   Notation (CANONICAL)**) are compared against the skill's own frontmatter, and the
   comparison is recorded explicitly rather than inferred from a clean exit code.
5. The elapsed time between submission and verification is recorded; a run showing no
   change before the registry's own crawl interval has elapsed is recorded as *not yet
   crawled*, not as a failed re-crawl.

## Current verification state

`evals/tests/registry-listing-content.test.mjs` and `evals/tests/distribution-surfaces.test.mjs`
already exercise the parser and the warning/notice/finding severity channels as
deterministic offline unit tests. What remains outside this repository's control is the
live re-crawl itself: `scripts/check-distribution.mjs` still reports
`registry-listing-drift` against the live skills.sh page as of this writing (8 phantom
skills advertised) — the registry has not yet been re-submitted, and re-submission is a
genuine third-party action (`https://www.skills.sh`) that this repository's tooling
cannot perform or simulate.

## Plan

See `docs/spec/remediation-plan.md` for the batch-wide sequencing this item depends on.
