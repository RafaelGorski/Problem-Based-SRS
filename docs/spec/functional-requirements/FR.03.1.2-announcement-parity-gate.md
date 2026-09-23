## FR.03.1.2: Release Announcement Gated on Surface Parity

## Requirement

**ID:** FR.03.1.2
**Title:** Release Announcement Gated on Surface Parity
**Workstream:** W9 — Announcement (depends on W1, W4, W5)
**Priority:** Should Have
**Status:** Draft

### Statement

The repository shall publish the release announcement only after verifying, immediately
before publication, that the live plugin release, the live canvas release, and every linked
page name the same versions.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.03.1 | Public surfaces that agree with each other and the manifest |
| Customer Problem | CP.03 | Surfaces advertise superseded and contradictory facts |

## Issues addressed

**Parents:** #207, #225 · **Subsumes:** #257, #258

## Why the gate is ordered this way

#225's objective is to **block #207** until parity is verified. An announcement is the one
action in this backlog that cannot be retracted: it is pushed to readers rather than pulled
by them. Publishing it while `README.md` still advertises 2.6.0 broadcasts the contradiction
instead of merely hosting it.

Two release trains share one tag namespace and are told apart by the title their workflow
writes (`🎉 Version …` for plugin, `srs-navigator …` for canvas). The announcement names
both, so both must be read **from live release pages at execution time** — not from issue
text, and not from the manifest alone.

Third-party registry state (skills.sh) is recorded **separately** as a warning, per #225's
scope boundary. It is not in this repository's control and must not silently gate or silently
pass the announcement.

## Acceptance Criteria

- [ ] The plugin and canvas versions in the copy are read from **live release pages** immediately before publication
- [ ] Every link in the announcement resolves — no `releases/tag/…` URL 404s
- [ ] `node scripts/check-distribution.mjs --strict` exits 0, or an explicit accepted exception is linked
- [ ] The full `run-tests.ps1` result is attached, with exact counts
- [ ] Third-party registry warnings are recorded separately and do not stand in for repository state
- [ ] FR.03.1.1 is closed before this requirement begins
- [ ] Each box cites the command output or live URL that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# read both trains from live state, at publication time
gh release list --repo RafaelGorski/Problem-Based-SRS --limit 10 --json tagName,name,isDraft
node scripts/release-train.mjs --tag v2.7
node scripts/check-distribution.mjs --strict
pwsh -File run-tests.ps1 -NoOpen
node --test evals/tests/release-verification-runbook.test.mjs \
             evals/tests/distribution-surfaces.test.mjs
```

**Pass condition:** both releases exist and are not drafts; the monitor exits 0 or the
exception is linked; the suite exits 0.

### App track — Playwright with screenshots

| Screenshot | Proves |
|---|---|
| `test-results/w9-live-plugin-release.png` | The live plugin release page, at the version the copy names |
| `test-results/w9-live-canvas-release.png` | The live canvas release page, at the version the copy names |
| `test-results/w9-landing-parity.png` | The landing page showing the same version as both release pages |

Capture all three in the same session, so they witness one consistent moment rather than
three separately-true states.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
