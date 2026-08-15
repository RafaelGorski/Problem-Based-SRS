## FR.04.1.12: Falsification of the closure gate under mutation

## Requirement

**ID:** FR.04.1.12
**Title:** Falsification of the closure gate under mutation
**Priority:** Must Have
**Status:** Draft
**Parent issue:** [#145](https://github.com/RafaelGorski/Problem-Based-SRS/issues/145)
**Sequence position:** Phase 2 — after FR.04.1.11

### Statement

The closure-evidence gate shall be demonstrated to **fail** under deliberate mutation of the
condition it claims to detect, with the failing transcript recorded as evidence, and every issue
it evaluates shall carry either a checked box with a citation or an explicitly named blocker — so
that an unexamined issue is never indistinguishable from a satisfied one.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Non-functional | NFR.08 | The consolidated gate must be deterministic and green at closure |

## Problems found (2026-08-15)

1. **The mutation proof still does not exist.** #145's whole purpose is to show the guard failing
   when it should. No transcript of a mutated fixture producing a non-zero verdict has been filed,
   so the guard's ability to fail remains an assumption — which is precisely the condition the
   repository's own drift-testing rule forbids.

2. **The target of the proof has moved.** Falsifying today's gate would prove the wrong thing:
   FR.04.1.11 changes the verdict logic for indeterminate markers and empty ledgers. A mutation
   transcript produced now would be obsolete on merge.

3. **#145 carries no acceptance boxes at all.** `issue-ledger.mjs 145` reports **0 boxes, 0
   checked, 0 open**. The ledger therefore returns a clean line for it while nothing has been
   verified — an issue that cannot be gated because it offers the gate nothing to count.

4. **#145 is itself indeterminate.** Under `--prospective` it is reported as
   `release-claim-indeterminate: missing release-claim marker`. The issue that exists to reconcile
   closure evidence cannot currently receive a closure verdict.

5. **The batch-wide numbers show this is not isolated.** Across the nine parents:
   **58 boxes, 0 checked, 57 open-without-blocker, 7 superseded-version-mentions**, and the ledger
   exits non-zero with `RESULT: ledger has drift to reconcile`. Not one box in the batch records
   why it is still open.

## Acceptance Criteria

### The guard is proven able to fail

- [ ] A fixture in which the declared release **exists** yields a clean verdict.
- [ ] The same fixture, mutated so the release is **absent**, yields a **non-zero** verdict; the
      failing output is attached verbatim.
- [ ] The mutation is reverted and the clean verdict is reproduced, proving the difference came
      from the mutation and not from drift in surrounding state.
- [ ] The proof is run against the **hardened** gate delivered by FR.04.1.11, and the transcript
      names the version of the tool it exercised.

### Indeterminate and empty-ledger paths are falsified too

- [ ] Removing a release-claim marker from a passing fixture makes the gate report indeterminate.
- [ ] Duplicating the marker makes the gate report indeterminate.
- [ ] Unchecking every box in a fixture that previously passed prevents a clean verdict.

### #145 becomes gateable

- [ ] #145 carries acceptance boxes the ledger can count.
- [ ] It carries exactly one well-formed release-claim marker, or an explicit statement that it
      claims no release, and the gate accepts that declaration without reporting indeterminate.
- [ ] `issue-ledger.mjs 145 --json` reports **0 open-without-blocker**: every open box names the
      blocker keeping it open.

## Verification

### Skills track — CLI

```
node evals/tools/closure-evidence.mjs --prospective 145
node evals/tools/issue-ledger.mjs 145 --json ledger-145.json
node --test evals/tests/closure-evidence.test.mjs
cd .github/extensions/srs-navigator && npm test
```

The mutation rehearsal is: run the gate against the passing fixture and record `exit=0`; mutate
the fixture to remove the release entry; re-run and record the non-zero exit **with its message**;
restore the fixture; re-run and record `exit=0` again. All three transcripts are attached
together — a single failing run without its matching pass proves nothing about the mutation.

### App track — Playwright with screenshots

**Explicitly out of scope**, for the same reason as FR.04.1.11: this is metadata and CLI
behaviour. Recording the boundary is part of the deliverable so a screenshot is not later
substituted for a transcript.

## Depends on

[#139](https://github.com/RafaelGorski/Problem-Based-SRS/issues/139) via FR.04.1.11 — the gate
must be hardened before falsifying it, or the proof documents behaviour that is about to change.

## Blocks

[#149](https://github.com/RafaelGorski/Problem-Based-SRS/issues/149) — the batch cannot be closed
on a gate that has never been shown to fail.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
