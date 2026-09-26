# FR.01.3.13 — Capture /live provenance rendered from the published canvas archive

**Priority:** Must Have
**Status:** Draft
**Owning issue:** #176 (sub of #138), #196 (execution child)

## Statement

The `/live` evidence shall be captured from a server booted out of the extracted
published canvas archive and shall be attached with a provenance record identifying
that archive, against a specification that exists.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The published artifact must be shown to render, not assumed to |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Non-functional | NFR.07 | Evidence must identify the artifact it was produced from |
| Parent issue | #176 | The capture this issue executes |

## Required capture

- [ ] The cited specification and plan files resolve to real committed paths (this
      file, and `docs/spec/remediation-plan.md`).
- [ ] Both assets of the current canvas release are downloaded and each SHA-256 is
      recorded before extraction.
- [ ] `verify-canvas-archive.mjs` accepts both formats and confirms they contain the
      same normalized file paths (no `canvas-asset-mismatch`).
- [ ] The `/live` PNG is captured against a server booted from the extracted archive
      directory, never from `.github/extensions/`.
- [ ] `provenance.json` is attached alongside the PNG, naming the extracted path, the
      archive version, and the SHA-256 of that archive's `extension.mjs`.
- [ ] The capture shows canonical dotted notation (`CP.01` / `CN.01.1` / `FR.01.1.1`)
      with the health bar rendered.
- [ ] The negative control is exercised once and the refusal recorded, proving the
      anti-checkout guard is live rather than assumed.
- [ ] #176's acceptance boxes are each ticked with a citation or annotated with a
      named blocker.

## Current verification state

`node scripts/verify-canvas-archive.mjs`, `node evals/tools/open-archive-canvas.mjs`, and
`node evals/tools/live-profile.mjs` exist and pass their own test suites
(`evals/tests/verify-canvas-archive.test.mjs`, `evals/tests/live-profile.test.mjs`). As
of this writing, `srs-navigator 1.1.4` is the latest published canvas release
(`gh release list`). Producing the archive-derived PNG plus `provenance.json` requires
downloading that release's assets, extracting them, booting the extracted extension,
and driving a Playwright capture against it — a bounded, repeatable, in-repo procedure
that does not require any external or unfalsifiable action, and should be executed as a
follow-up using the commands in this issue's original verification section.

## Plan

See `docs/spec/remediation-plan.md`.
