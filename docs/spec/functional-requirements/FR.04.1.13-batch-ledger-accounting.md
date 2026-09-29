## FR.04.1.13: Batch Ledger Accounting

## Requirement

**ID:** FR.04.1.13
**Title:** Account for every acceptance box and close the batch in dependency order
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall account for every acceptance box across the open batch so that each
box is either ticked with a citation or left open with a named blocker, shall confirm the
closure gate is clean for every issue carrying a release claim, and shall close the batch
strictly in dependency order — never on merged work and never on a green test suite alone.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #179 | The sub-issue that owns the accounting |

## Problems found (2026-08-16)

1. **The batch is entirely unreconciled.**
   `node evals/tools/issue-ledger.mjs 138 139 140 142 145 147 148 149 162 164 165 173 174 175 176 178 179`
   exits **1**: **222 boxes, 0 checked, 213 open-without-blocker, 24 superseded version
   mentions**.

   | Issue | Boxes | Open w/o blocker | Stale version mentions |
   |---|---:|---:|---:|
   | #138 | 16 | 16 | 9 |
   | #139 | 14 | 14 | 1 |
   | #140 | 14 | 13 | 0 |
   | #142 | 12 | 12 | 2 |
   | #145 | 10 | 9 | 1 |
   | #147 | 13 | 11 | 0 |
   | #148 | 12 | 12 | 2 |
   | #149 | 19 | 17 | 2 |
   | #162 | 12 | 11 | 4 |
   | #164 | 12 | 11 | 0 |
   | #165 | 13 | 13 | 2 |
   | #173 | 9 | 9 | 0 |
   | #174 | 12 | 12 | 0 |
   | #175 | 14 | 14 | 0 |
   | #176 | 12 | 11 | 1 |
   | #178 | 13 | 13 | 0 |
   | #179 | 15 | 15 | 0 |
   | **totals** | **222** | **213** | **24** |

2. **A green suite is not a green batch.** `pwsh -File run-tests.ps1 -NoOpen` passed
   **1299/1299** on the same day every one of those 222 boxes was unchecked. Suite health
   and acceptance evidence are different claims.
3. **The batch definition is not stable.** #146 moved from open to closed
   (`NOT_PLANNED`, retitled `[superseded]`) inside a single verification run, and three
   issue titles changed in the same window. A start-of-run snapshot is already stale.
4. **All 15 of #179's acceptance boxes are open** with no named blocker.

## Acceptance Criteria

- [ ] The ledger is re-read **immediately before** closure, not reused from an earlier
      capture, and the batch membership is re-derived from `gh issue list` at that moment.
- [ ] `issue-ledger.mjs` across the live batch reports **0 open-without-blocker** and
      **0 superseded version mentions**.
- [ ] A before/after `ledger.json` pair is attached, showing the 222-box starting state
      and the reconciled end state.
- [ ] `closure-evidence.mjs --prospective` is clean (exit 0) for every issue carrying a
      release-claim marker; an *indeterminate* verdict is not a clean one.
- [ ] Every issue that makes no release claim carries the explicit "not a release claim"
      record, so the absence of a marker is a decision rather than an omission.
- [ ] `node scripts/check-distribution.mjs --strict` exits **0**, or every remaining
      finding is individually named and accepted as a warning or notice.
- [ ] The consolidated suite is green at the moment of closure and its per-suite counts
      are recorded, with the two LLM suites' skip/run state stated rather than omitted.
- [ ] Issues close in dependency order — sub-issues before parents — and **#149 closes
      last**, with the reconciled ledger linked from its closing comment.
- [ ] No parent is closed merely because a successor sub-issue exists.

## Verification

### Skills track — CLI

```bash
gh issue list --state open --json number --jq '.[].number'      # re-derive membership
node evals/tools/issue-ledger.mjs <live batch> --json ledger-after.json
node evals/tools/closure-evidence.mjs --prospective <claimants> --json closure-batch.json
node scripts/check-distribution.mjs --strict; echo "exit=$?"
pwsh -File run-tests.ps1 -NoOpen
```

### App track — Playwright with screenshots

Collected once, at closure, so the closing comment carries proof the product renders as
advertised:

```bash
cd .github/extensions/srs-navigator
npx playwright test --project=canvas    # graph render, dotted notation, health bar
npx playwright test --project=site      # landing page + install block
```

For anything claiming the **released** canvas, the capture must be the archive-derived one
with its `provenance.json` — a checkout-rendered PNG proves the checkout, nothing more.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
