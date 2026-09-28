# FR.01.3.15: Archive-derived /live render with provenance

## Requirement

**ID:** FR.01.3.15
**Title:** Archive-derived /live render with provenance
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #305 — Render /live from the published archive and capture provenance with the screenshot
**Wave:** 1 — Restore proof and correct the claims

### Statement

The system shall render /live from the published release archive and shall record, with the resulting screenshot, the archive and commit it was rendered from.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The maintainer needs the published artifact shown to render, not assumed to. |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #305 | Render /live from the published archive and capture provenance with the screenshot |

## Problem addressed

The claim that `/live` works is currently proven against the working tree. That proves the source renders, not that the artifact a user downloads renders. Those are different claims and only the second one matters to a user.

**Observed on 2026-09-28:** Canvas v1.1.5 is published, but no stored evidence renders `/live` from the **downloaded archive**. Every existing capture is taken from the repository checkout, so an archive packaging defect would be invisible.

## Acceptance Criteria

- [ ] The screenshot is produced from the **extracted published archive**, not from the working tree
- [ ] A `provenance.json` accompanies the screenshot recording tag, asset name and digest
- [ ] The recorded version equals the current published canvas release (**v1.1.5**)
- [ ] The zip and tar.gz assets contain identical normalized file paths
- [ ] Rendering from a deliberately corrupted archive fails before any screenshot is produced

## Verification

**Track:** App (Playwright)

### Skills track — CLI

```bash
gh release download v1.1.5 -p 'srs-navigator-*' -D /tmp/canvas-archive
node --test evals/tests/verify-canvas-archive.test.mjs
node --test evals/tests/from-archive-install.test.mjs
```

- `gh release download v1.1.5 -p 'srs-navigator-*' -D /tmp/canvas-archive` → Downloaded asset list with digests.
- `node --test evals/tests/verify-canvas-archive.test.mjs` → Structural archive contract green for the downloaded asset.
- `node --test evals/tests/from-archive-install.test.mjs` → Archive installs and starts outside the monorepo.

### App track — Playwright with screenshots

```bash
node evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator --provenance /tmp/canvas-archive/provenance.json
cd .github/extensions/srs-navigator
CANVAS_URL="<url printed above>" npx playwright test visual.test.mjs --project=canvas
```

- Printed canvas URL, bound to the extracted archive.
- **Screenshot of the rendered graph** from the published archive, attached together with its `provenance.json`. The provenance version must read v1.1.5.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 1 — Restore proof and correct the claims |
| **Blocked by** | #292 |
| **Blocks** | #138 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
