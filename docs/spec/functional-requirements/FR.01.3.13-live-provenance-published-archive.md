## FR.01.3.13: `/live` provenance captured from the current published canvas archive

## Requirement

**ID:** FR.01.3.13
**Title:** `/live` provenance captured from the current published canvas archive
**Priority:** Must Have
**Status:** Draft
**Parent issue:** [#138](https://github.com/RafaelGorski/Problem-Based-SRS/issues/138)
**Sequence position:** Phase 3 — after FR.01.3.12

### Statement

Every screenshot filed as canvas release evidence shall be rendered by the extension extracted
from the **currently published archive** — not the repository checkout and not a superseded
release — shall be accompanied by a provenance record binding it to that archive's hash, and the
anti-checkout guard shall be exercised rather than assumed.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The canvas train must publish the version the repository advertises |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Non-functional | NFR.07, NFR.08 | Screenshot provenance; deterministic green gate |

## Problems found (2026-08-15)

1. **The parent's blocking premise is now false, and the parent still asserts it.** #138 was
   written when `v1.1.1` did not exist. `v1.1.1` published on **2026-08-07**, followed by `v1.1.2`
   and `v1.1.3` on **2026-08-13**. `closure-evidence.mjs --prospective 138 146` now exits **0** —
   the release blocker is gone — yet #138 still reads as though the release is pending, carrying
   **4 superseded version mentions** against the canvas baseline of `1.1.3`.

2. **Evidence captured to #138's current text would attest the wrong artifact.** The issue names
   `v1.1.1`. Capturing provenance for `v1.1.1` today would prove a release that has been
   superseded twice, while the version the repository advertises — `1.1.3` — remains unproven.

3. **No `/live` capture has ever come from a published archive.** Every screenshot to date renders
   out of `lib/` via the checkout server. `open-archive-canvas.mjs --provenance` ships and remains
   **unused for evidence**, so the parent's central claim still has no admissible proof.

4. **The anti-checkout guard is still assumed.** The boot tool's refusal to serve a `.github/`
   path has never been exercised and recorded. The one mechanism preventing a checkout capture
   from being mistaken for release evidence has never been observed working.

5. **The archive to be proven is internally inconsistent.** The published canvas assets were cut
   from a tree whose `package-lock.json` names `1.1.0` while the release names `1.1.3`. Provenance
   evidence gathered before FR.01.3.12 lands would faithfully attest an artifact that contradicts
   itself.

6. **#138's ledger names no blocker.** **16 boxes, 0 checked, 16 open-without-blocker.** The
   release-existence blocker it was waiting on has cleared and nothing recorded the change, so the
   issue looks stalled when it is in fact ready.

7. **Nothing is watching.** Because `VERSION` equals the published tag,
   `check-distribution.mjs --strict` raises **no canvas finding at all** — its single finding is
   the registry listing. Only this issue is tracking whether the capture happens.

## Acceptance Criteria

### The screenshot proves the currently published bytes

- [ ] A `/live` graph PNG is captured against a server booted by `open-archive-canvas.mjs` from the
      **extracted archive directory** of the **current** canvas release — not `serve-canvas.mjs`,
      not the checkout, not a superseded tag.
- [ ] `--provenance` writes a record naming the extracted path, the archive version, and the
      SHA-256 of that archive's `extension.mjs`, attached **alongside** the PNG. A PNG without its
      provenance record is evidence for an unknown artifact.
- [ ] The provenance SHA-256 matches the hash of the downloaded asset before extraction, linking
      the capture to the published bytes end to end.
- [ ] The capture shows nodes in canonical dotted notation (`CP.01` / `CN.01.1` / `FR.01.1.1`)
      with the health bar rendered — not hyphen legacy IDs.
- [ ] The version shown in the capture equals `VERSION`, the release tag, and the extension
      `package.json` — all four agree.

### The guard is exercised, not assumed

- [ ] `open-archive-canvas.mjs` is pointed at the repository checkout once and **refuses**; the
      refusal output is attached verbatim.
- [ ] The refusal is shown to be the tool's own guard rather than an unrelated error: the path
      exists, permissions are fine, and the message is explicit about the `.github/` boundary.

### The recovery is rehearsed before it is needed

- [ ] The orphan-tag state is reproduced in a controlled way and the documented recovery is run end
      to end; the transcript is attached.
- [ ] The rehearsal demonstrates that the bump script **skips** a version whose tag already exists,
      and that deleting the orphan tag makes that version publishable again.
- [ ] `check-distribution.mjs` is shown reporting `release-tag-without-release` for that state, so
      the monitor and the runbook are proven to agree.

### #138 closes on current evidence

- [ ] #138's text is restated against the current baseline; the ledger reports **0
      superseded-version-mentions** and **0 open-without-blocker**.
- [ ] `closure-evidence.mjs 138 146` and its prospective form both return **exit 0** and agree.
- [ ] `check-distribution.mjs --strict` shows no `canvas-asset-drift`, `canvas-asset-mismatch`, or
      `release-tag-without-release`.

## Verification

### App track — Playwright with screenshots

```
gh release download <current tag> -p 'srs-navigator-*' -D ./canvas-archive
node evals/tools/open-archive-canvas.mjs ./ext/srs-navigator --provenance ./canvas-archive/provenance.json
cd .github/extensions/srs-navigator && npx playwright test --project=canvas
```

The asset is hashed **before** extraction and the hash recorded; the archive is extracted; the
boot tool serves the extracted extension and writes the provenance record; the visual project runs
against the URL that tool prints. Attach the graph PNG **together with** `provenance.json` — the
PNG alone is not evidence.

Negative control, run once and recorded: point the boot tool at the repository checkout and
capture its refusal verbatim.

### Skills track — CLI

```
node evals/tools/closure-evidence.mjs 138 146
node evals/tools/issue-ledger.mjs 138 --json ledger-138.json
node scripts/check-distribution.mjs --strict
gh release view <current tag>
```

## Depends on

[#146](https://github.com/RafaelGorski/Problem-Based-SRS/issues/146) via FR.01.3.12 — the archive
must be internally consistent before its provenance is worth attesting.

## Blocks

[#148](https://github.com/RafaelGorski/Problem-Based-SRS/issues/148) — the adoption demonstration
must reuse this provenance record and capture rather than generate a new checkout-rendered one.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
