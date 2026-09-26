# FR.04.1.14 — Resolve duplicate release-claim markers so the closure gate can return a verdict

**Priority:** Must Have
**Status:** Draft
**Owning issue:** #182 (sub of #139)

## Statement

Every release-claiming issue shall carry **exactly one** `release-claim` marker, so that
the closure-evidence guard returns a decidable verdict rather than
`release-claim-indeterminate`.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Parent issue | #139 | The issue carrying the duplicate markers |

## Problem

As of the last live check, #139's body carries two markers:

```
<!-- release-claim train=plugin version=v2.6 -->
<!-- release-claim train=canvas version=v1.1.1 -->
```

`node evals/tools/closure-evidence.mjs --prospective 139` returns
`release-claim-indeterminate: duplicate release-claim markers`, which blocks a
determinate verdict for every release-claiming issue in the batch, including #149.

## Required resolution

- [ ] #139 carries exactly one `release-claim` marker afterward, with the removed
      marker's value recorded on the issue so the edit is auditable.
- [ ] `closure-evidence.mjs --prospective 139` no longer reports
      `release-claim-indeterminate`; the new verdict and exit code are recorded.
- [ ] Every other open issue is checked for duplicate markers and the count found is
      stated explicitly, including when it is zero.
- [ ] A regression guard asserts that duplicate markers produce a non-zero,
      clearly-attributed verdict (already covered — see below).

## Ownership boundary

`docs/release-verification.md` and #139's own contract state the guard "reports; it
never edits an issue — reconciliation stays a human judgement." Editing #139's body to
remove the duplicate marker is a live-issue edit reserved for the repository maintainer;
this specification records the requirement and the regression guard, not the edit.

## Current verification state

The regression guard already exists and passes:
`evals/tests/closure-evidence.test.mjs` → *"rejects missing, duplicate, malformed, and
ambiguous markers"* and the audit/prospective parity suite for #172 both assert a
duplicate marker produces a non-zero, attributed verdict. What remains open is the live
edit to #139 itself, which is out of scope for this specification per the ownership
boundary above.

## Plan

See `docs/spec/remediation-plan.md`.
