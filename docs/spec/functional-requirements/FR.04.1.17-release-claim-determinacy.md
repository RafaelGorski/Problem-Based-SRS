# FR.04.1.17: Release-claim determinacy and required gate

## Requirement

**ID:** FR.04.1.17
**Title:** Release-claim determinacy and required gate
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #139 — Reconcile live release claims with published releases
**Wave:** 2 — Verify the mechanisms

### Statement

The system shall resolve every release tag to exactly one train, shall fail on a tag both trains claim, and shall run that resolution as a required gate before publishing.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | The maintainer needs release records and closure evidence to match what actually shipped. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #139 | Reconcile live release claims with published releases |

## Problem addressed

This issue coordinates the rule that a release claim must name a release that exists, on a train that can be determined. It closes when the census is clean and the gate that enforces it is a required step rather than a report.

**Observed on 2026-09-28:** #139 has carried **two** `release-claim` markers, which makes its train indeterminate — the same tag shape serves both trains, so two markers mean the gate cannot decide which release to check. Its closure gate is also report-only, so a red census does not block anything.

## Acceptance Criteria

- [ ] #139 carries exactly one `release-claim` marker, with the removed value recorded
- [ ] The release-claim census is clean across the batch
- [ ] `release-train.mjs` resolves each claimed tag to exactly one train
- [ ] The closure gate is a **required** step, demonstrated by a run it blocks
- [ ] A duplicated marker fails the gate (negative test)

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node scripts/release-claim-census-cli.mjs
node scripts/release-train.mjs --tag v2.7 && node scripts/release-train.mjs --tag v1.1.5
node --test evals/tests/release-trains.test.mjs evals/tests/release-claim-census.test.mjs
```

- `node scripts/release-claim-census-cli.mjs` → Clean census across the batch, with the exit code recorded.
- `node scripts/release-train.mjs --tag v2.7` → Verdicts `plugin` and `canvas` respectively — one train each.
- `node --test evals/tests/release-trains.test.mjs evals/tests/release-claim-census.test.mjs` → Both green, including the ambiguous-tag negative case.

### App track — explicitly out of scope

Release claims are issue and tag metadata. No rendered surface changes, so the browser is explicitly out of scope.

## Sequencing

| | |
|---|---|
| **Wave** | 2 — Verify the mechanisms |
| **Blocked by** | #293, #306 |
| **Blocks** | #313, #318 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
