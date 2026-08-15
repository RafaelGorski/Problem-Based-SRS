## FR.04.1.13: Complete batch ledger accounting before closure

## Requirement

**ID:** FR.04.1.13
**Title:** Complete batch ledger accounting before closure
**Priority:** Must Have
**Status:** Draft
**Parent issue:** [#149](https://github.com/RafaelGorski/Problem-Based-SRS/issues/149)
**Sequence position:** Phase 2 — after FR.04.1.11 and FR.04.1.12; final gate for the batch

### Statement

The batch ledger shall account for **every** acceptance box in **every** issue it gates — counting
it as checked-with-citation, or open-with-a-named-blocker — shall resolve every superseded version
mention against the current train baselines, and shall report a clean result only when the
consolidated suite exits zero at that moment.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Non-functional | NFR.06, NFR.08 | Version-lag detectability; deterministic green gate |

## Problems found (2026-08-15)

1. **Not one box in the batch is accounted for.** Across the nine parent issues the ledger reports
   **58 boxes, 0 checked, 57 open-without-blocker, 7 superseded-version-mentions**, exiting
   non-zero with `RESULT: ledger has drift to reconcile`. Fifty-seven open boxes name no blocker,
   so the batch reads as unexamined rather than blocked.

2. **The issue that defines the rule is exempt from it.** `issue-ledger.mjs 149` reports
   **0 boxes**. #149 exists to make the ledger count every acceptance box and offers the ledger
   nothing to count. The same is true of #139, #140, #145 and #147 — five of the nine parents
   carry no countable acceptance criteria at all.

3. **Seven of nine parents cannot receive a closure verdict.** Under `--prospective`, #139 has
   *duplicate* release-claim markers and #140, #142, #145, #147, #148, #149 have *missing* ones.
   Only #138 and #146 are decidable today.

4. **Two issues assert versions the baseline has moved past.** With baselines at plugin `2.6.0`
   and canvas `1.1.3`, #138 carries **4** superseded version mentions and #146 **3** — both still
   argue about `v1.1.1`, which has been published since 2026-08-07 and superseded twice since.
   Their acceptance text describes a world that no longer exists.

5. **"The suite is green at closure" is currently unsatisfiable.** `dependency-pins.test.mjs`
   fails on the lockfile/version drift, so the consolidated runner exits non-zero. Any closure
   claiming a green suite today would be false regardless of the ledger's own state.

6. **The gate is not wired into anything.** Nothing runs the ledger before an issue is closed, so
   every finding above is discoverable only by a maintainer who chooses to look.

## Acceptance Criteria

### Every box is accounted for

- [ ] `issue-ledger.mjs` over all nine parents reports **0 open-without-blocker**: each open box
      names the blocker keeping it open.
- [ ] It reports **0 ticked-without-citation**: each checked box cites the evidence that satisfied it.
- [ ] Every parent carries at least one countable acceptance box; no issue is gated vacuously.

### Version claims are current

- [ ] **0 superseded-version-mentions** across the batch: #138 and #146 are restated against the
      current canvas baseline, or each stale mention is annotated as historical context.
- [ ] Version mentions claimed by no train are reported as *not compared* rather than silently
      accepted.

### Every issue is decidable

- [ ] All nine parents carry exactly one well-formed release-claim marker, or an explicit
      declaration that they claim no release.
- [ ] `closure-evidence.mjs --prospective` over the batch reports **0 indeterminate**.
- [ ] Audit and prospective mode agree, per FR.04.1.11.

### Closure happens on live evidence, in order

- [ ] The consolidated runner exits `0` at the moment of closure.
- [ ] `check-distribution.mjs --strict` is clean, or each remaining finding is named as an
      accepted third-party state with a reason.
- [ ] The batch closes in dependency order, and the closing comment on each issue cites the
      transcript that satisfied it.
- [ ] The gate is invoked by the documented closure procedure, so it cannot be skipped by simply
      not running it.

## Verification

### Skills track — CLI

```
node evals/tools/issue-ledger.mjs 138 139 140 142 145 146 147 148 149 --json ledger-batch.json
node evals/tools/closure-evidence.mjs --prospective 138 139 140 142 145 146 147 148 149
node --test evals/tests/issue-ledger.test.mjs
pwsh -File run-tests.ps1 -NoOpen
node scripts/check-distribution.mjs --strict
```

Today these produce, respectively: 57 open-without-blocker and 7 superseded mentions (exit 1);
7 indeterminate findings (exit 1); a red consolidated run; and one registry finding. Each must be
re-run at closure and the transcript attached — a ledger captured days earlier is not evidence
about the state at closure.

### App track — Playwright with screenshots

The canvas suite is run to demonstrate the batch closed without visual regression, and the
`/live` graph of **this repository's own** compiled specification is captured so the remediation
chain is visible as a graph:

```
cd .github/extensions/srs-navigator && npx playwright test --project=canvas
```

Attach the resulting PNG. It is supporting evidence for "no regression at closure" — not proof of
ledger state, which only the transcripts above can establish.

## Depends on

- [#139](https://github.com/RafaelGorski/Problem-Based-SRS/issues/139) via FR.04.1.11 — the gate must be decidable first.
- [#145](https://github.com/RafaelGorski/Problem-Based-SRS/issues/145) via FR.04.1.12 — a gate never shown to fail cannot close a batch.
- [#146](https://github.com/RafaelGorski/Problem-Based-SRS/issues/146) via FR.01.3.12 — the suite must be able to exit zero.

## Blocks

The closure of the entire batch. This is the last gate.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
