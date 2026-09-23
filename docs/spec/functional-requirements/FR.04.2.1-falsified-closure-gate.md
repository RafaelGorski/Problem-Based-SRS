## FR.04.2.1: Falsified Closure Gate

## Requirement

**ID:** FR.04.2.1
**Title:** Closure Gate Proven to Fail for Each Invalid Class
**Workstream:** W3 — Closure gate (depends on FR.04.1.1)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall demonstrate the closure gate rejecting a committed fixture for each
invalid-evidence class, and shall require the gate as a step in the release process.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.2 | A closure gate proven to fail for the right reason |
| Customer Problem | CP.04 | Closure evidence is not machine-decidable |

## Issues addressed

**Parents:** #145, #221 · **Subsumes:** #174, #194, #164, #186, #233, #234, #235, #238

## Why this is not already satisfied

A gate that has never failed is indistinguishable from a gate that cannot fail. The batch
contains its own proof of the hazard: #193, #196 and #197 were closed `COMPLETED` **within
8 seconds of each other** with 0 of 26 acceptance boxes ticked, while their parents remained
open. The gate did not stop it.

#221's scope boundary is the operative constraint: **indeterminate is not a valid failure
result.** A row in the matrix that provokes `indeterminate` proves nothing — it must provoke
the *named* failure class.

## Mutation matrix

Each row must name a committed fixture, the command run against it, and the specific class
it provokes.

| # | Invalid class | Fixture provokes | Must fail with |
|---|---|---|---|
| 1 | Ticked box with no citation | a checked box carrying no command output or SHA | `box-ticked-without-citation` |
| 2 | Open box with no blocker | an unchecked box naming no blocker | `open-without-blocker` |
| 3 | Duplicate release claim | two markers on one issue | `release-claim-indeterminate` |
| 4 | Stale version claim | a marker naming a superseded version | `superseded-version-mention` |
| 5 | Dangling citation | a `**Plan:**` path absent from `main` | citation-unresolvable |
| 6 | Closure with open children | a parent closed while a child is open | ordering violation |

## Acceptance Criteria

- [ ] Every row of the matrix names a **committed** fixture path, not an ad-hoc edit
- [ ] Each row is demonstrated failing with its **named** class — never `indeterminate`
- [ ] The full transcript (command + exit code + emitted class) is attached to the issue
- [ ] The gate is wired into the release process as a required step, not a report-only advisory
- [ ] `node --test evals/tests/closure-evidence.test.mjs evals/tests/issue-ledger.test.mjs evals/tests/release-procedure.test.mjs` passes
- [ ] Reverting any one hardening makes the corresponding row pass — i.e. the guard is negative-tested
- [ ] Each box cites the command output that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# every mutation row, with its exit code and emitted class recorded
for f in evals/fixtures/closure/*.md; do
  echo "== $f"
  node evals/tools/issue-ledger.mjs --file "$f"; echo "exit=$?"
done

node evals/tools/closure-evidence.mjs --prospective 138 139 140 142 145 147 148 149
node --test evals/tests/closure-evidence.test.mjs \
             evals/tests/issue-ledger.test.mjs \
             evals/tests/release-procedure.test.mjs
```

**Pass condition:** every fixture exits non-zero with its named class; the three eval files
pass; the release procedure test confirms the gate is required rather than advisory.

### App track — Playwright

**Out of scope, deliberately.** The subject is a CLI exit code and its emitted failure class.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
