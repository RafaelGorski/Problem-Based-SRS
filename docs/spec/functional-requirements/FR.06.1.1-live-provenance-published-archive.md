## FR.06.1.1: `/live` Provenance From the Published Archive

## Requirement

**ID:** FR.06.1.1
**Title:** `/live` Provenance From the Published Archive
**Workstream:** W5 — Provenance (depends on W1, W2)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall produce its `/live` rendering evidence exclusively from a release asset
downloaded from the published canvas release, in a directory containing no checkout of this
repository.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.1 | `/live` proven from the published archive |
| Customer Problem | CP.06 | Provenance is demonstrated from the working tree |

## Issues addressed

**Parents:** #138, #210, #219 · **Subsumes:** #162, #176, #183, #251–#256

## The distinction that matters

Rendering from the working tree proves the **source** works. Users install the **archive**.
Every packaging defect — a file the packager omits, a path that resolves only relative to the
repository root, a skill the sync step never copied — is invisible to working-tree evidence
and fatal to a real install.

#219's scope boundary states it exactly: existing working-tree capture is *a procedure
control only; it cannot satisfy provenance.*

A second hazard is version drift. #210 requires the release be **selected at execution time**
from live GitHub state, not read from issue text that may name a superseded version.

## Acceptance Criteria

- [ ] The canvas release under test is read from **live** GitHub release state at execution time, and the tag is recorded
- [ ] The asset is fetched by URL into a directory containing **no** checkout and no pre-existing `node_modules`
- [ ] `/live` renders the specification graph from that extracted asset
- [ ] The zip and tar.gz assets contain identical normalized file paths
- [ ] `node --test evals/tests/from-archive-install.test.mjs evals/tests/verify-canvas-archive.test.mjs` passes against the **downloaded** asset
- [ ] `node scripts/check-distribution.mjs --strict` reports no `canvas-asset-drift` and no `canvas-asset-mismatch`
- [ ] The safe strand-recovery procedure is rehearsed and its transcript attached
- [ ] Every claim names the canvas version it was produced from
- [ ] Each box cites the command output that satisfied it

## Verification

### Skills track — CLI

```bash
# read the release from live state — do not take the version from issue text
TAG=$(gh release list --repo RafaelGorski/Problem-Based-SRS --limit 20 \
        --json tagName,name --jq '[.[]|select(.name|test("srs-navigator"))][0].tagName')
echo "canvas release under test: $TAG"

mkdir -p /tmp/archive-proof && cd /tmp/archive-proof     # no checkout here
gh release download "$TAG" --repo RafaelGorski/Problem-Based-SRS
# extract, then run the archive contract against the extracted tree
node --test evals/tests/from-archive-install.test.mjs \
             evals/tests/verify-canvas-archive.test.mjs
node scripts/check-distribution.mjs --strict
```

**Pass condition:** the archive contract passes against bytes that were downloaded, not
built; the monitor reports neither asset finding.

### App track — Playwright with screenshots *(this requirement's primary gate)*

| Screenshot | Proves |
|---|---|
| `test-results/w5-live-from-archive.png` | The `/live` graph rendered from the extracted release asset |
| `test-results/w5-archive-provenance.png` | The extraction directory listing beside the rendered graph — no checkout present |
| `test-results/w5-live-version.png` | The rendered canvas reports the same version as the downloaded release tag |
| `test-results/w5-live-health-bar.png` | The health bar reports 29 nodes, 5 need clusters, 100% traceability, from archive bytes |

The provenance screenshot is the one that carries the claim: a rendered graph alone cannot
show *where the bytes came from*, so the capture must include the directory it was served
from.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
