## FR.04.1.12: Closure-Gate Mutation Falsification

## Requirement

**ID:** FR.04.1.12
**Title:** Falsify the hardened closure gate under mutation and make #145 gateable
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall demonstrate the closure-evidence guard **failing** under a
deliberately mutated fixture and **passing** after restore, shall leave the fixtures
byte-identical to their committed state afterwards, and shall give #145 an explicit
acceptance ledger and release-claim record so that its own closure can be measured and
decided — without granting the tool any authority to mutate GitHub.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #174 | The sub-issue that owns the falsification |

## Problems found (2026-08-16)

1. **An unfalsified guard guards nothing.** Nothing in the record shows the guard has ever
   been made to fail on purpose and then restored.
2. **The gate currently answers *indeterminate* for the issue that introduced it.** #139
   carries two `release-claim` markers, so
   `node evals/tools/closure-evidence.mjs --prospective 138 139` exits **1** with
   `#139 release-claim-indeterminate: duplicate release-claim markers`. Any falsification
   run performed today measures a batch whose flagship claim cannot be cleared at all.
3. **#145 is itself ungateable.** It carries no release-claim marker and no explicit
   record that it makes no release claim, so `closure-evidence.mjs` cannot decide it.
4. **All 12 of #174's acceptance boxes are open** with no named blocker.

## Acceptance Criteria

- [ ] The duplicate marker on #139 is resolved to **exactly one** valid marker first;
      `--prospective 139` no longer returns `release-claim-indeterminate`.
- [ ] The mutation transcript is attached: remove the matching release from a passing
      fixture → **non-zero**; restore → **zero**. Both exit codes recorded.
- [ ] `git diff --exit-code evals/fixtures/` is clean when finished — the restored
      fixture is byte-identical to its committed state.
- [ ] A wrong-train case is exercised once: a canvas release does not satisfy a plugin
      claim, and a plugin release does not satisfy a canvas claim.
- [ ] The no-mutation boundary is confirmed: the run performed **no** GitHub write, and
      reconciliation stays a human judgement.
- [ ] #145 carries either exactly one valid release-claim marker or an explicit
      "not a release claim" record, so its closure is decidable.
- [ ] `node --test evals/tests/closure-evidence.test.mjs` passes offline — no token,
      no network.

## Verification

### Skills track — CLI

```bash
node evals/tools/closure-evidence.mjs --fixture evals/fixtures/closure-2026-08-04.json
#   expect: exit 1, four findings naming #89, #90, #129, #130
node evals/tools/closure-evidence.mjs --prospective 138 139 --json closure.json
node evals/tools/issue-ledger.mjs 145 174 --json ledger-145.json
node --test evals/tests/closure-evidence.test.mjs
git diff --exit-code evals/fixtures/          # must be clean when finished
```

### App track — Playwright: explicitly out of scope

This requirement is about issue and release metadata. No browser view can witness it, and
a canvas screenshot attached here would be evidence for a different claim. Recording that
boundary is part of the deliverable, not an omission.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
