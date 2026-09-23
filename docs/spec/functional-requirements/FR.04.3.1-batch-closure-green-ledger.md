## FR.04.3.1: Batch Closure on a Green Ledger

## Requirement

**ID:** FR.04.3.1
**Title:** Batch Closure on a Re-Derived Green Ledger
**Workstream:** W10 — Closure (depends on every other workstream; closes last)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall re-derive batch membership and evidence at the moment of closure and
shall close the batch only when the ledger reports no unciteed tick and no unexplained open
box.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.3 | Closure on re-derived live evidence |
| Customer Problem | CP.04 | 323 boxes, 0 ticked, work closed in 8-second bursts |

## Issues addressed

**Parents:** #149, #214, #226 · **Subsumes:** #179, #189, #198, #268–#273

## What "closes last" means

This requirement owns the **final decision**, not the implementation of any workstream. Its
ordering constraint, from #226 and #214: **#226 closes before #214, and #214 before its
batch parent.** Nothing here may tick a box another workstream owns.

The batch list must be **re-derived at closure time**. #270 exists precisely because a
membership list written earlier had gone stale and carried a dangling citation. A month-old
enumeration is not evidence about today.

## The 93 open issues resolve as follows

| Disposition | Issues |
|---|---|
| Closed by a workstream's evidence | the ~11 W-parents and their direct subs |
| Closed as **duplicate**, citing the workstream that carries the work | gen-2 to gen-4 restatements (#230–#274, #162–#198) |
| Closed as **superseded** with a stated reason | #181 (0 files), #193/#196/#197 (reopened or superseded per FR.10.1.1) |
| Remain open with a **named blocker** | anything whose evidence genuinely has not been produced |

Closing a restatement as duplicate is not a shortcut — it is the correct disposition, and it
is the only action that reduces 93 issues to the ~11 real ones without discarding work.

## Acceptance Criteria

- [ ] Batch membership is re-derived from live GitHub state **on the day of closure**, and the command is cited
- [ ] `node evals/tools/issue-ledger.mjs <re-derived list>` exits **0** — no open-without-blocker, no ticked-without-citation, no superseded version mention
- [ ] `node evals/tools/closure-evidence.mjs --prospective <roots>` returns a determinate pass for every root
- [ ] Every issue closed as duplicate names the workstream issue that carries its work
- [ ] No parent is closed while any child it depends on remains open
- [ ] No citation in any closing comment points at a path absent from `main`
- [ ] The full `run-tests.ps1` result is attached, exit 0, with exact counts
- [ ] Each box cites the command output produced on the closing day

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# 1. re-derive membership TODAY — do not reuse an earlier list
gh issue list --repo RafaelGorski/Problem-Based-SRS --state open --limit 200 \
   --json number --jq '[.[].number]|join(" ")' > batch.txt

# 2. the ledger must be green over that list
node evals/tools/issue-ledger.mjs $(cat batch.txt) --json ledger-final.json
echo "exit=$?"

# 3. every root returns a determinate verdict
node evals/tools/closure-evidence.mjs --prospective 138 139 140 142 145 147 148 149

# 4. the suite is green from a clean checkout of main
pwsh -File run-tests.ps1 -NoOpen

node --test evals/tests/issue-ledger.test.mjs evals/tests/closure-evidence.test.mjs
```

**Pass condition:** the ledger exits 0 over a list generated the same day; every root is
determinate; the suite exits 0.

### App track — Playwright with screenshots

| Screenshot | Proves |
|---|---|
| `test-results/w10-open-issue-count.png` | The repository's open-issue list after closure, showing the reduced set |
| `test-results/w10-green-dashboard.png` | The Skills Health dashboard reporting the green run that closed the batch |

The second screenshot must come from the same run whose output is quoted in the closing
comment — see FR.02.1.1, which exists to make that guarantee possible.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
