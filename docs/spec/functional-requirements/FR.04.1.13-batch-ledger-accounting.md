# FR.04.1.13 — Account for every acceptance box and close the batch in dependency order

**Priority:** Must Have
**Status:** Draft
**Owning issue:** #179 (parent), #198 (execution child — latest rebaseline)

## Statement

The batch shall be re-derived from live state immediately before closure, every
acceptance box shall be ticked with a citation or left open with a named blocker, and
closure shall proceed strictly in dependency order with #149 last.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Parent issue | #179 | The accounting this issue re-baselines |

## Required accounting

- [ ] Batch membership is re-derived from `gh issue list` at closure time, not reused
      from an earlier capture.
- [ ] `node evals/tools/issue-ledger.mjs <live batch>` reports 0 open-without-blocker and
      0 superseded version mentions.
- [ ] A before/after `ledger.json` pair is attached.
- [ ] `node evals/tools/closure-evidence.mjs --prospective` is clean for every
      marker-carrying issue — an indeterminate verdict is not a clean one.
- [ ] Every issue making no release claim carries the explicit non-claim record.
- [ ] `node scripts/check-distribution.mjs --strict` exits 0, or every remaining finding
      is individually named and accepted as a warning or notice.
- [ ] The consolidated suite is green at closure, with per-suite counts recorded and the
      LLM suites' skip/run state stated rather than omitted.
- [ ] Issues close in dependency order — sub-issues before parents — and #149 closes last.
- [ ] No parent is closed merely because a successor sub-issue exists.

## Closure sequence (as declared across the batch)

```
#146 → (#139, #140) → (#145, #147) → (#138, #142) → #148 → #149
```

Sub-issues (#162, #164, #165, #173–#198) execute within their parent's phase; #149 is the
terminal gate and closes only after every other issue in the batch is either closed on
live evidence or explicitly left open with a named blocker.

## Current verification state

As of this pass, batch membership is 34 open issues (the nine parents plus their 25
sub-issues); `node evals/tools/issue-ledger.mjs` across that set reports 349 acceptance
boxes, 0 checked, 314 open-without-blocker, and 31 superseded version mentions (see the
session's tool output for the exact run). The batch is **not** reconciled and #149 cannot
close on this state.

## Plan

See `docs/spec/remediation-plan.md`.
