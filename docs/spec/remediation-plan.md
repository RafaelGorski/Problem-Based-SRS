# Remediation plan — open batch reconciliation

This plan tracks the closure-readiness of the open governance batch: issues #138, #139,
#140, #142, #145, #147, #148, #149 (parents) and their sub-issues #162, #164, #165, #173,
#174, #175, #176, #178, #179, #182–#198. It is cited by that batch's issues as
`docs/spec/remediation-plan.md`; before this pass, the file did not exist in the
repository, so every issue citing it carried a dangling reference.

## Sequencing

```
#146 → (#139, #140) → (#145, #147) → (#138, #142) → #148 → #149
```

Each parent's sub-issues execute inside that parent's phase. #149 is the terminal gate:
it closes last, and only after every other issue in the batch is either closed on live
evidence or left open with an explicitly named blocker.

## Governing rule

Per #139's own contract and `docs/release-verification.md`: the repository's tooling
(`issue-ledger.mjs`, `closure-evidence.mjs`, `check-distribution.mjs`) is **report-only**.
It reads live GitHub/release/registry state and reports; it never edits an issue or
mutates GitHub. Reconciling a live issue's own text — fixing a stale version mention,
adding or de-duplicating a `release-claim` marker, adding a "not a release claim" record
— is reserved for the maintainer's human judgement. An automated agent editing issue
bodies to make a gate pass would be exactly the failure mode this batch exists to
prevent, so this plan records requirements and runs the real tools against real state; it
does not edit live issue text.

## Status by axis, as measured in this pass

| Axis | Owning issues | State | Blocker class |
|---|---|---|---|
| Closure-gate marker hygiene | #139, #182 | #139 carries duplicate markers | Human issue edit (reserved) |
| Canvas release-claim currency | #138, #162, #176, #183, #191, #193, #196 | Markers/text still name `v1.1.1`; current release is `v1.1.4` | Human issue edit (reserved) |
| Closure-gate mutation proof | #145, #174, #194, #186 | Gate logic and its regression tests exist and pass (`evals/tests/closure-evidence.test.mjs`); #145 itself has no acceptance ledger or marker | Human issue edit (reserved) for #145's own ledger/marker |
| Registry re-crawl | #140, #147, #173, #175, #184, #187, #190, #195 | `check-distribution.mjs` reports 8 phantom skills still advertised; no before-state captured yet | Genuine external action (skills.sh re-submission) |
| Adoption experiment | #142, #148, #165, #178, #185, #188, #193, #197 | Contract fields are placeholders; both hard predecessors (registry, archive provenance) unmet | Genuine external action (real participant) + predecessor axes |
| Batch accounting | #149, #179, #189, #198 | 349 acceptance boxes across the live batch, 0 checked | Depends on all axes above |

## What this pass adds

- The nine functional-requirement specification files this plan's issues cite, so their
  "cited specification resolves to a real committed path" acceptance box is genuinely
  satisfied.
- This remediation plan itself.
- Regression-test coverage confirmation for the closure-evidence and issue-ledger gates
  (already present and passing; see each FR file's "Current verification state").

## Live release state at time of this pass

`gh release list` shows the plugin train has since published `v2.7` (2026-09-19),
superseding the `v2.6` this batch's issues were filed against, and the canvas train's
latest is still `v1.1.4` (2026-08-20) as recorded above. Neither publication changes any
axis's blocker class: the canvas-currency gap (`v1.1.1` markers vs. `v1.1.4`+) still
requires a human issue edit, and the plugin train moving to `v2.7` only widens the same
gap for any issue that names a plugin version at all. This is recorded here as the
freshest live check, not acted on, per the governing rule above.

## What remains open, and why

- **Live issue-body edits** (markers, stale version text, acceptance ledgers on #145 and
  the six unmarked parents) are reserved for maintainer judgement per the governing rule
  above, and are not performed by this plan.
- **The skills.sh re-crawl** requires an actual submission to a third-party site this
  repository does not control, followed by waiting for its own crawl interval — neither
  step can be performed or simulated from within this repository.
- **The external adoption experiment** requires a real participant outside this
  repository trying `/live` — it cannot be fabricated, and running it before its
  predecessors clear would spend the project's only first impression on a stale
  discovery surface.
- **Batch closure (#149)** cannot proceed honestly until the axes above are reconciled;
  closing it now would repeat the exact failure (#89, #90, #129, #130 on 2026-08-04) the
  batch exists to prevent.
