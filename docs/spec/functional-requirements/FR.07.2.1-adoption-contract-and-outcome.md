## FR.07.2.1: Pre-Registered Adoption Contract and Participant Outcome

## Requirement

**ID:** FR.07.2.1
**Title:** Pre-Registered Adoption Contract and Participant Outcome
**Workstream:** W8 — Adoption (depends on W7)
**Priority:** Should Have
**Status:** Draft

### Statement

The repository shall freeze the adoption threshold, observation window, and outcome rule
before observation begins, and shall record a participant-originated result against that
frozen contract.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.07.2 | Adoption measured against a pre-registered contract |
| Customer Problem | CP.07 | Prior adoption work closed with no evidence |

## Issues addressed

**Parents:** #142, #148, #213, #224 · **Subsumes:** #165, #178, #185, #188, #260–#267

## Why pre-registration, specifically

#213's objective states the reason: this replaces *earlier no-evidence closures*. #193, #196
and #197 were closed `COMPLETED` with zero supporting artifacts. An adoption result declared
after the fact, against a threshold chosen after the fact, is the same failure in a new
domain — and it is unfalsifiable by construction.

#224's scope boundary is the second constraint and the easier one to violate accidentally:
**maintainer replay is not participant evidence.** Someone who built the thing cannot
discover that the instructions are wrong.

## Sequencing

This requirement **cannot start** until FR.07.1.1 is closed. Observing a participant against
a recipe known to be broken measures the recipe. #148's scope states it directly: the window
cannot begin until readiness and gateability are complete.

## Acceptance Criteria

- [ ] The contract — threshold, window length, outcome rule — is **committed before** the window opens, with a timestamp preceding it
- [ ] The contract names what counts as success and what counts as failure, in advance
- [ ] The observation window runs from **published bytes**, not a checkout
- [ ] At least one **participant-originated** outcome is recorded; maintainer replay is excluded explicitly
- [ ] The outcome is recorded against the pre-registered threshold, whether it passes or fails
- [ ] A failing outcome is filed as a result, not reopened as a new experiment
- [ ] The dispositions of superseded predecessors (#193, #196, #197) are recorded rather than silently closed
- [ ] `node --test evals/tests/adoption-experiment.test.mjs` passes
- [ ] Each box cites the commit SHA or artefact that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# the contract predates the window — this is the falsifiable part
git log -1 --format=%cI -- docs/adoption-contract.md
node --test evals/tests/adoption-experiment.test.mjs
node evals/tools/issue-ledger.mjs 142 148 213 224 --json adoption-ledger.json
```

**Pass condition:** the contract's commit timestamp precedes the recorded window start; the
eval file passes; the ledger reports no box ticked without citation.

### App track — Playwright with screenshots

| Screenshot | Proves |
|---|---|
| `test-results/w8-participant-first-graph.png` | The participant's own rendered graph, from their machine |
| `test-results/w8-contract-timestamp.png` | The committed contract with its timestamp, beside the recorded window start |

The participant screenshot must originate from the participant. A maintainer-produced image
satisfies the file name and not the requirement.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
