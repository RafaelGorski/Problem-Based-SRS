## FR.01.4.8: Re-crawl Content Verification

## Requirement

**ID:** FR.01.4.8
**Title:** Verify the re-crawl by parsed-content diff and prove the run was a read
**Priority:** Should Have
**Status:** Draft

### Statement

The maintainer shall confirm the skills.sh refresh by diffing the parsed
`observations.registry` blocks of the before and after captures, shall verify the
substantive content axis — that the rendered body carries the current `SKILL.md`
description and all expected `##` sections — and shall prove the run was an actual read
rather than an unreachable surface, before recording the drift as resolved.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The listing must be refreshed **and verified as refreshed** |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #175 | The sub-issue that owns the content verification |

## Problems found (2026-08-16)

1. **A clean run would prove only that eight names disappeared.** The substantive axis —
   whether the page still teaches retired hyphen notation — is currently reported by
   nothing that gates the result.
2. **A warning is not a pass, and it exits 0.** `surface-unreachable`,
   `registry-listing-unreadable` and `registry-listing-partial` all exit 0 by design.
   Reading `$?` alone would file an unreadable response as a clean one.
3. **One axis is structurally unverifiable and must be recorded as such.** Today's run
   raises the notice `registry-skill-version-unverifiable`: skills.sh publishes no
   `softwareVersion`. The value it would compare against is the skill's own
   `metadata.version` (`1.3`), **never** the plugin release version (`2.6.0`).
4. **All 14 of #175's acceptance boxes are open** with no named blocker.

## Acceptance Criteria

- [ ] `distribution-after.json` is captured after the crawl visibly changed, and a **diff
      of the two `observations.registry` blocks** is attached — not a prose summary.
- [ ] Advertised skill count and declared count are both **1**; the sole name is
      `problem-based-srs`.
- [ ] `registry-listing-drift` clears — none of the 8 phantom skills remains.
- [ ] `registry-skill-stale` remains **absent**: the rendered body carries the current
      `SKILL.md` description and **all expected** `##` sections, including
      *Identifier Notation (CANONICAL)*.
- [ ] The page does not teach `FR-001` / `CN-001` outside the explicit accepted-legacy
      compatibility section.
- [ ] **No registry-scoped warning is raised.** A warning means the comparison did not
      run, and a comparison that did not run is not a pass.
- [ ] The version axis is filed as `registry-skill-version-unverifiable` — an accepted
      unverified observation, explicitly not agreement, and explicitly compared against
      `metadata.version`, not the release version.

## Verification

### Skills track — CLI

```bash
node scripts/check-distribution.mjs --json > distribution-after.json
node scripts/check-distribution.mjs --strict; echo "exit=$?"
# diff the parsed blocks, not the rendered prose
node --test evals/tests/registry-listing-content.test.mjs
```

Read the **findings** separately from the exit code. This is the item where that
distinction decides the verdict.

### App track — Playwright: explicitly not the gate

The local suite drives a loopback canvas server and the local landing page; it never
fetches skills.sh. The `site` capture is attached to show the install block visitors land
on, and nothing more.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
