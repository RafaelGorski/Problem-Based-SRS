# FR.04.2.1: Weekly release-report reconciliation

## Requirement

**ID:** FR.04.2.1
**Title:** Weekly release-report reconciliation
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #316 — Reconcile the weekly release report against what actually shipped
**Wave:** 2 — Verify the mechanisms

### Statement

The system shall reconcile the weekly release report against live release state each run, and shall report an unreleased version rather than restating a stale capture.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.2 | The maintainer needs the weekly release report reconciled against the releases that were actually published. |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #316 | Reconcile the weekly release report against what actually shipped |

## Problem addressed

The Thursday report is advisory input to a release decision. If it describes unreleased commits that in fact shipped, or omits ones that did not, the decision is made on a false picture.

**Observed on 2026-09-28:** The report is generated from repository state, while what shipped is determined by published releases. Those two sources have drifted before — the repository advertised 2.6.0 while v2.7 was published — and nothing currently reconciles them.

## Acceptance Criteria

- [ ] The report's unreleased set is derived from published releases, per train
- [ ] Plugin and canvas trains are reconciled **separately**
- [ ] `release-tag-without-release` is distinguished from `*-release-missing`
- [ ] The report names the newest published release for each train
- [ ] A synthetic unreleased commit appears in the report and a released one does not (negative test)

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node --test evals/tests/release-preflight.test.mjs
node scripts/check-distribution.mjs --strict
gh release list --limit 10
```

- `node --test evals/tests/release-preflight.test.mjs` → Exit 0, including the per-train reconciliation cases.
- `node scripts/check-distribution.mjs --strict` → No `plugin-release-missing`, `canvas-release-missing` or `release-tag-without-release` finding, or each one explained.
- `gh release list --limit 10` → Published releases per train, matching what the report claims.

### App track — explicitly out of scope

The weekly report is a generated issue body. Its correctness is a data claim, checked by CLI reconciliation rather than by appearance.

## Sequencing

| | |
|---|---|
| **Wave** | 2 — Verify the mechanisms |
| **Blocked by** | #293 |
| **Blocks** | #313, #318 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
