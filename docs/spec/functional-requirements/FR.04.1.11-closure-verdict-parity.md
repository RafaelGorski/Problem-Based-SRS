## FR.04.1.11: Closure verdict parity between audit and prospective modes

## Requirement

**ID:** FR.04.1.11
**Title:** Closure verdict parity between audit and prospective modes
**Priority:** Must Have
**Status:** Draft
**Parent issue:** [#139](https://github.com/RafaelGorski/Problem-Based-SRS/issues/139)
**Sequence position:** Phase 1 — startable immediately, in parallel with FR.01.3.12

### Statement

The closure-evidence gate shall return the **same verdict for the same issue in both audit and
prospective mode**, shall treat a missing, duplicate, malformed, or ambiguous release-claim marker
as indeterminate in **both** modes, and shall never return a clean verdict for an issue whose
acceptance ledger contains no checked box — because an empty ledger is an unexamined issue, not a
satisfied one.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Non-functional | NFR.06 | Advertised-versus-published version lag must stay detectable |

## Problems found (2026-08-15)

1. **Audit mode is vacuously green for all nine parent issues.** Running the gate per issue over
   #138, #139, #140, #142, #145, #146, #147, #148 and #149 returns **exit 0** every time, with the
   message *"Every checked release claim has a matching published release."* That sentence is
   literally true and materially misleading: **zero boxes are checked anywhere in the batch**, so
   the set being quantified over is empty.

2. **The two modes disagree on identical input.** The same nine issues under `--prospective`
   return **exit 1** with **7 findings**: `#139` *duplicate release-claim markers*, and `#140`,
   `#142`, `#145`, `#147`, `#148`, `#149` *missing release-claim marker*. One mode calls this
   batch clean; the other calls it undecidable. Whichever a maintainer runs determines the answer.

3. **The contract is violated by the issue that defines it.** #139 states that a *"missing,
   duplicate, malformed, or ambiguous marker is an indeterminate result and cannot produce a clean
   closure verdict."* #139 itself carries **duplicate** markers, and audit mode gives it a clean
   verdict regardless.

4. **This is the original failure mode, one level up.** #139 exists because four issues were
   closed on 2026-08-04 against unpublished releases. A gate that answers "clean" for an issue it
   cannot actually evaluate reproduces exactly that outcome, while appearing to have prevented it.

5. **Nothing else is watching.** `check-distribution.mjs --strict` currently reports a single
   finding (the registry listing) and says nothing about closure claims, so a vacuous green here
   is contradicted by no other signal.

## Acceptance Criteria

### The modes cannot disagree

- [ ] For every issue, audit and prospective mode return the same verdict class
      (clean / contradicted / indeterminate) given the same live state.
- [ ] A parity test drives both modes over one fixture set and asserts the verdicts match.

### Indeterminate is never clean

- [ ] An issue with **no** release-claim marker returns indeterminate in **both** modes.
- [ ] An issue with **duplicate** markers returns indeterminate in **both** modes.
- [ ] A malformed or ambiguous marker returns indeterminate in **both** modes.
- [ ] Indeterminate is reported with a non-zero exit and names the issue and the reason.

### An empty ledger is not a pass

- [ ] An issue whose acceptance ledger has **zero checked boxes** cannot return a clean verdict;
      the output distinguishes "nothing to check" from "everything checked and satisfied".
- [ ] The summary line reports the number of claims actually evaluated, so a green run over an
      empty set is self-evident rather than silent.

### It cannot rot

- [ ] Deterministic, offline tests cover: absent release, present release, wrong train,
      prospective open issue, malformed marker, duplicate marker, empty ledger, unreadable state.
- [ ] Negative test: mutating a fixture so the gate should fail is shown to actually fail, then
      reverted.
- [ ] The tests run inside the default suite with no network and no token.

## Verification

### Skills track — CLI

```
node evals/tools/closure-evidence.mjs 138 139 140 142 145 146 147 148 149
node evals/tools/closure-evidence.mjs --prospective 138 139 140 142 145 146 147 148 149
node --test evals/tests/closure-evidence.test.mjs
cd .github/extensions/srs-navigator && npm test
```

Both invocations above must agree. Today the first exits `0` and the second exits `1` with seven
findings; after this requirement they return the same verdict class and both name the seven
indeterminate issues. Capture both transcripts before and after.

### App track — Playwright with screenshots

**Explicitly out of scope.** This requirement concerns issue and release metadata. No browser view
can witness it, and a canvas screenshot attached here would be evidence for a different claim.
Recording that boundary is part of the deliverable.

## Depends on

Nothing. Startable immediately and in parallel with FR.01.3.12.

## Blocks

[#145](https://github.com/RafaelGorski/Problem-Based-SRS/issues/145) — the mutation proof must be
run against the hardened gate, not the current one — and through it
[#149](https://github.com/RafaelGorski/Problem-Based-SRS/issues/149).

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
