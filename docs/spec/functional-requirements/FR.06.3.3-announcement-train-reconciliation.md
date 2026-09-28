# FR.06.3.3: Announcement reconciled per release train

## Requirement

**ID:** FR.06.3.3
**Title:** Announcement reconciled per release train
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #315 — Reconcile the announcement across plugin, extension, and companion-app releases
**Wave:** 4 — Coordination roots close

### Statement

The system shall state each artifact's version separately with the tag that published it, and shall fail reconciliation on a tag that resolves to more than one train.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.3 | The maintainer needs the announcement withheld until every surface agrees at the versions actually published. |
| Customer Problem | CP.06 | The backlog is entirely self-generated |
| Issue | #315 | Reconcile the announcement across plugin, extension, and companion-app releases |

## Problem addressed

Three artifacts release on different cadences into one shared tag namespace. An announcement that collapses them into a single version number is wrong for at least two of the three.

**Observed on 2026-09-28:** The trains cannot be told apart by tag shape — `v2.7` is a plugin release and `v1.1.5` a canvas one. A reader given one number cannot determine which artifact it describes.

## Acceptance Criteria

- [ ] Each artifact's version and publishing tag are stated separately
- [ ] `release-train.mjs` resolves every named tag to exactly one train
- [ ] Every named release exists and carries its expected assets
- [ ] The reconciled version set is the set #314 announces, with no additions
- [ ] An ambiguous tag fails reconciliation (negative test)

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node scripts/release-train.mjs --tag v2.7 && node scripts/release-train.mjs --tag v1.1.5
node --test evals/tests/release-trains.test.mjs
node --test evals/tests/verify-canvas-archive.test.mjs
```

- `node scripts/release-train.mjs --tag v2.7` → One train per tag, recorded with exit codes.
- `node --test evals/tests/release-trains.test.mjs` → Includes the both-trains-claim failure case.
- `node --test evals/tests/verify-canvas-archive.test.mjs` → The canvas release named in the announcement carries a valid archive.

### App track — explicitly out of scope

Reconciliation compares the draft announcement against the release record. #314 captures the visitor-facing screenshot after publication.

## Sequencing

| | |
|---|---|
| **Wave** | 4 — Coordination roots close |
| **Blocked by** | #306, #139, #316 |
| **Blocks** | #314 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
