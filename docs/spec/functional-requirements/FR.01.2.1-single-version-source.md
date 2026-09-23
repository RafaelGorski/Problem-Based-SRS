## FR.01.2.1: Single Authoritative Source for Version Facts

## Requirement

**ID:** FR.01.2.1
**Title:** Single Authoritative Source for Version Facts
**Workstream:** W1 — Green baseline
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall derive every published version claim from one declared source per
release train, so that a manifest bump cannot leave a surface, a changelog link, or a test
fixture advertising a superseded version.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.2 | One authoritative source for version facts |
| Customer Problem | CP.01 | Nine of eleven eval failures are version parity |
| Customer Problem | CP.03 | Surfaces advertise superseded facts |

## Issues addressed

**Parent:** #218 · **Also:** #209 (F10), #227 CP-D/CP-E

## Failures this closes (measured 2026-09-23)

```
✖ links the manifest version at the tag the release pipeline actually creates
✖ gives every changelog version exactly one release link
✖ a changelog link that names an unpublishable tag fails this suite's check
✖ finds every per-tag release URL, with the file and line that carries it
✖ flags the links that name a release nobody ever published
✖ holds for the links this repository ships today
✖ release links the repository publishes
✖ classifies the manifest's own tag as the plugin train
✖ accepts the tag as a bare argument, the form the runbook and issues use
```

Root cause, reported by the suite itself:

```
CHANGELOG.md:592  [2.6.0] links v2.6, but the manifest is already at 2.7.0 —
build-plugin.py --expected-version 2.6.0 fails on a version mismatch,
so that tag is no longer publishable from main
```

This is the `stranded-release-link` condition the project documents: the `## [2.6.0]`
section must be **folded into the manifest version's section**, not re-cut from `main`.

## Acceptance Criteria

- [ ] `CHANGELOG.md` contains no section below the manifest version that links a tag absent from `git tag --list`
- [ ] Every changelog reference definition names the tag `build-plugin.py normalize_version` actually produces (`2.7.0` → `v2.7`)
- [ ] The README version badge links the `/releases` **index**, never a per-tag URL
- [ ] `node scripts/release-train.mjs --tag v2.7` classifies the manifest tag as `plugin`
- [ ] `node --test evals/tests/release-hygiene.test.mjs evals/tests/release-trains.test.mjs evals/tests/stranded-release-claim.test.mjs evals/tests/distribution-drift.test.mjs` passes
- [ ] `node scripts/check-distribution.mjs` reports no `stranded-release-link`, `unpublishable-release-link`, or `dangling-release-links`
- [ ] Each box cites the command output that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
python scripts/build-plugin.py validate
node scripts/release-train.mjs --tag v2.7          # expect: plugin
node --test evals/tests/release-hygiene.test.mjs \
             evals/tests/release-trains.test.mjs \
             evals/tests/stranded-release-claim.test.mjs \
             evals/tests/distribution-drift.test.mjs
node scripts/check-distribution.mjs
```

**Pass condition:** all four eval files pass; the monitor prints no error-severity finding in
the three release-link classes above.

### App track — Playwright with screenshots

| Screenshot | Proves |
|---|---|
| `test-results/w1-readme-badge.png` | The rendered badge resolves to the `/releases` index and shows the manifest version |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
