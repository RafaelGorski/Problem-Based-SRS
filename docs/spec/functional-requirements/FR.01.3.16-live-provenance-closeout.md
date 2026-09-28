# FR.01.3.16: /live provenance close-out

## Requirement

**ID:** FR.01.3.16
**Title:** /live provenance close-out
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #138 — Prove /live provenance from the current published canvas archive
**Wave:** 2 — Verify the mechanisms

### Statement

The system shall close the /live verification thread only on a screenshot whose archive and commit provenance is recorded and independently re-checkable.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The maintainer needs the published artifact shown to render, not assumed to. |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #138 | Prove /live provenance from the current published canvas archive |

## Problem addressed

This issue coordinates the claim that `/live` renders from what was actually published. It closes only when the archive-derived screenshot exists and every release claim on it names the release that screenshot came from.

**Observed on 2026-09-28:** The issue currently carries four open children restating the same work across three passes (#162, #176, #183, #307) and superseded version mentions in its own body. It cannot close while its own claim names one version and its evidence another.

## Acceptance Criteria

- [ ] An archive-derived screenshot with `provenance.json` is attached, at the current published canvas release
- [ ] The `release-claim` marker names the same release as the provenance
- [ ] Exactly **one** active child remains; the others are explicitly marked superseded
- [ ] `issue-ledger.mjs 138` reports 0 superseded version mentions and 0 unblocked open boxes
- [ ] The closure verdict is recorded with its exit code, not merely asserted

## Verification

**Track:** App (Playwright) + Skills (CLI)

### Skills track — CLI

```bash
node evals/tools/issue-ledger.mjs 138 162 176 183 307 --json ledger-138.json
node scripts/check-release-issue-gate-cli.mjs 138
```

- `node evals/tools/issue-ledger.mjs 138 162 176 183 307 --json ledger-138.json` → Zero superseded mentions; one active child.
- `node scripts/check-release-issue-gate-cli.mjs 138` → Recorded verdict and exit code.

### App track — Playwright with screenshots

```bash
cd .github/extensions/srs-navigator
CANVAS_URL="<archive url>" npx playwright test visual.test.mjs --project=canvas
```

- **The archive-derived screenshot from #305**, attached here with its `provenance.json` as this issue's evidence of record.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 2 — Verify the mechanisms |
| **Blocked by** | #305, #306 |
| **Blocks** | #142, #318 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
