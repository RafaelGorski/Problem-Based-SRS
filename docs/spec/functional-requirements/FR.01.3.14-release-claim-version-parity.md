## FR.01.3.14: Release-Claim Version Parity

## Requirement

**ID:** FR.01.3.14
**Title:** Restate the canvas release claim to the current published version
**Priority:** Must Have
**Status:** Draft

### Statement

An issue's machine-readable `release-claim` marker shall name the same release its
acceptance text asks to be proven, so that the closure gate cannot return a clean verdict
for a release the issue no longer targets.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The published artifact must be shown to render, not assumed to |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #138 | The issue whose marker and text disagree |

## Problems found (2026-08-16)

1. **The marker contradicts the issue's own title.** #138 is now titled *"Prove /live
   provenance from the current published canvas archive"*, yet its marker still reads:

   ```
   <!-- release-claim train=canvas version=v1.1.1 -->
   ```

2. **The named release is two versions behind.** `gh release list` shows canvas
   **v1.1.1** (2026-08-07), **v1.1.2** and **v1.1.3** (both 2026-08-13). `VERSION` and the
   extension `package.json` both read `1.1.3`.
3. **The gate would clear on the wrong artifact.** Because `v1.1.1` *is* published, the
   closure guard would return a clean verdict for #138 while the evidence the issue asks
   for — provenance from the **current** archive — had never been produced.
4. **The stale text is extensive.** `issue-ledger.mjs` counts **9 superseded version
   mentions** on #138 and **4** on #162, all naming `1.1.1`.

## Acceptance Criteria

- [ ] #138's marker names the **current** published canvas release, and the previous
      marker value is recorded on the issue so the edit is auditable.
- [ ] `issue-ledger.mjs 138` reports **0 superseded version mentions**; the 9 stale
      mentions are restated, not deleted wholesale.
- [ ] `issue-ledger.mjs 162 176` likewise reports 0 superseded version mentions.
- [ ] `closure-evidence.mjs --prospective 138` returns a verdict against the current
      release, and the verdict is recorded with its exit code.
- [ ] The recovery commands quoted in the issue body reference the current tag, so a
      maintainer following them does not operate on a superseded release.
- [ ] No acceptance box is ticked as a side effect of the restatement; restating the
      target is not evidence that the target was met.

## Verification

### Skills track — CLI

```bash
gh release list --limit 5                                  # identify the current canvas tag
node evals/tools/issue-ledger.mjs 138 162 176 --json ledger-canvas.json
node evals/tools/closure-evidence.mjs --prospective 138 --json closure-138.json
```

### App track — Playwright with screenshots

The restatement is metadata, but the claim it enables is visual. Once restated, the
evidence is captured from the current published archive:

```bash
gh release download <current-tag> -p 'srs-navigator-*' -D /tmp/canvas-archive
node evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator --provenance /tmp/canvas-archive/provenance.json
cd .github/extensions/srs-navigator
CANVAS_URL="<url printed above>" npx playwright test --project=canvas
```

Attach the PNG with its `provenance.json`, whose recorded archive version must match the
restated marker.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
