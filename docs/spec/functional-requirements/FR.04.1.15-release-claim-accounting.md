# FR.04.1.15 — Record every issue as either a release claim or explicitly not one

**Priority:** Must Have
**Status:** Draft
**Owning issue:** #149 (parent), #189 (execution child)

## Statement

Every issue in the open batch shall carry either exactly one valid `release-claim`
marker or an explicit record that it makes no release claim, so that the absence of a
marker is a recorded decision rather than an omission.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Parent issue | #149 | The batch reconciliation that requires this accounting |

## Required accounting

- [ ] Each of #140, #142, #145, #147, #148 and #149 carries either exactly one valid
      marker or an explicit "not a release claim" record.
- [ ] A marker census across the live open batch is attached, listing every issue and
      its marker count, including the zero counts.
- [ ] No issue carries more than one marker; the #139 duplicate is confirmed resolved.
- [ ] `closure-evidence.mjs --prospective` returns a decidable verdict for every
      marker-carrying issue — never indeterminate.
- [ ] The census is re-taken immediately before closure, since batch membership can
      change within a single verification run.
- [ ] Batch membership at closure is re-derived from `gh issue list`, not reused from an
      earlier snapshot.

## Ownership boundary

Adding a marker or a "not a release claim" record to a live issue body is an edit to
that issue, reserved for the maintainer's human judgement per #139's contract. This
specification records the requirement and the census methodology; it does not perform
the edits itself.

## Current verification state

A live census (`gh issue view <n> --json body`, searching for the `release-claim`
marker pattern) is the authoritative source for this accounting and must be re-run
immediately before any closure decision, since issue bodies and batch membership change
between verification passes.

## Plan

See `docs/spec/remediation-plan.md`.
