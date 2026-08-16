## FR.01.3.13: Live Provenance from the Published Archive

## Requirement

**ID:** FR.01.3.13
**Title:** Capture `/live` provenance rendered from the published canvas archive
**Priority:** Must Have
**Status:** Draft

### Statement

The release verification process shall capture the `/live` graph evidence from a server
booted out of the **extracted published canvas archive**, and shall accompany every capture
with a provenance record naming the extracted path, the archive version and the SHA-256 of
that archive's `extension.mjs`, so that no rendering claim about a published release rests
on a checkout build.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The published artifact must be shown to render, not assumed to |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Non-functional | NFR.07 | Evidence must identify the artifact it was produced from |
| Issue | #176 | The sub-issue that owns this capture |

## Problems found (2026-08-16)

1. **The capture has never once come from published bytes.** Every `/live` PNG in the
   record was rendered from a checkout, which proves the checkout and nothing else.
2. **The target release moved.** Canvas published `v1.1.2` and `v1.1.3` on 2026-08-13,
   two versions past the `v1.1.1` the acceptance text still names.
3. **All 12 of #176's acceptance boxes are open**, 11 with no named blocker.

## Acceptance Criteria

- [ ] Both assets of the **current** canvas release are downloaded and each SHA-256 is
      recorded before extraction.
- [ ] `verify-canvas-archive.mjs` accepts both the `.zip` and the `.tar.gz`, and the two
      contain the same normalized file paths — no `canvas-asset-mismatch`.
- [ ] The `/live` PNG is captured against a server booted by `open-archive-canvas.mjs`
      from the **extracted archive directory**, never from `.github/extensions/`.
- [ ] `provenance.json` is attached alongside the PNG, naming the extracted path, the
      archive version, and the SHA-256 of that archive's `extension.mjs`.
- [ ] The capture shows canonical dotted notation (`CP.01` / `CN.01.1` / `FR.01.1.1`)
      with the health bar rendered — not hyphen legacy identifiers.
- [ ] The negative control is exercised once: booting the tool against a `.github/` path
      is refused, and the refusal output is recorded.

## Verification

### App track — Playwright with screenshots

```bash
gh release download <current-tag> -p 'srs-navigator-*' -D /tmp/canvas-archive
node evals/tools/verify-canvas-archive.mjs /tmp/canvas-archive/srs-navigator-<v>.zip
node evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator \
  --provenance /tmp/canvas-archive/provenance.json
cd .github/extensions/srs-navigator
CANVAS_URL="<url printed above>" npx playwright test --project=canvas
```

Attach `test-results/live-dotted-notation.png` **together with** `provenance.json`.
A PNG without its provenance record is evidence for an unknown artifact.

### Skills track — CLI

```bash
node evals/tools/verify-canvas-archive.mjs <zip> && node evals/tools/verify-canvas-archive.mjs <tar.gz>
node scripts/check-distribution.mjs --strict; echo "exit=$?"
```

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
