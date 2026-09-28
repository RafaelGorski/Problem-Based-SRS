# FR.06.3.1: Announcement parity gate

## Requirement

**ID:** FR.06.3.1
**Title:** Announcement parity gate
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #313 — Gate the announcement on verified surface version parity
**Wave:** 4 — Coordination roots close

### Statement

The system shall block announcement publication until every published surface agrees on the versions being announced, and shall record the gate verdict with its timestamp.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.3 | The maintainer needs the announcement withheld until every surface agrees at the versions actually published. |
| Customer Problem | CP.06 | The backlog is entirely self-generated |
| Issue | #313 | Gate the announcement on verified surface version parity |

## Problem addressed

An announcement is the one action that cannot be taken back. It must be blocked by a mechanism, not by intention, until every surface agrees at the versions actually published.

**Observed on 2026-09-28:** No gate currently blocks the announcement. The surfaces disagreed as recently as today — README 2.6.0 against a published 2.7 — so an announcement made now would cite numbers that do not exist together anywhere.

## Acceptance Criteria

- [ ] The gate reads version parity, release-claim census, weekly report and adoption outcome from their own sources
- [ ] The gate is **required**, demonstrated by a run it blocks
- [ ] The verdict is recorded with the value of each input at announcement time
- [ ] Flipping any single input to red blocks the announcement (negative test, one case per input)
- [ ] The gate cannot be satisfied by a cached or summarised value

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
node scripts/check-release-issue-gate-cli.mjs --announcement
node --test evals/tests/release-issue-gate.test.mjs
node --test evals/tests/docs-version-parity.test.mjs
```

- `node scripts/check-release-issue-gate-cli.mjs --announcement` → Verdict with each input listed and its source named.
- `node --test evals/tests/release-issue-gate.test.mjs` → One blocking assertion per input.
- `node --test evals/tests/docs-version-parity.test.mjs` → Parity input green at gate time.

### App track — explicitly out of scope

The gate is a process control over metadata. The surfaces it checks are photographed by #293; re-capturing them here would not strengthen the verdict.

## Sequencing

| | |
|---|---|
| **Wave** | 4 — Coordination roots close |
| **Blocked by** | #293, #139, #316 |
| **Blocks** | #314 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
