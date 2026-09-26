# FR.04.1.12 — Closure gate falsification under mutation

**Priority:** Must Have
**Status:** Draft
**Owning issue:** #174 (parent), #194 (execution child)

## Statement

The closure gate shall be demonstrated to **fail** under a deliberate mutation of the
state it guards, for every failure class it claims to detect, with each mutation and its
observed failure recorded — and the mutation reverted — so that a green run is evidence
of a satisfied condition rather than evidence of an unexercised check.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Non-functional | NFR.08 | The consolidated gate must be deterministic and green at closure |

## Failure classes the gate must be shown to reject

1. **Absent release** — a checked claim naming a version with no published release.
2. **Wrong train** — a claim naming a tag belonging to the other train.
3. **Missing marker** — an issue with no `release-claim` marker.
4. **Duplicate marker** — an issue carrying more than one marker.
5. **Malformed marker** — a syntactically invalid marker.
6. **Empty ledger** — an issue with zero checked acceptance boxes.

## Current verification state

`evals/tests/closure-evidence.test.mjs` already exercises, as deterministic offline unit
tests (no network, no token):

- missing / duplicate / malformed / ambiguous markers (`parseClaim` rejection cases),
- an explicit `train=none` non-claim,
- the closed-but-unpublished replay fixture (`evals/fixtures/closure-2026-08-04.json`),
- a fixture-removal / restoration pair proving the gate goes from clean to failing and
  back when a published release is removed and restored,
- audit-vs-prospective parity on open issues with no marker or a duplicate one
  (`#172` regression guard).

Wrong-train rejection and the empty-ledger class are cross-cutting: wrong-train is
covered by `parseClaim`'s exact tag/train match (`assessClaims` never matches a canvas
release against a plugin claim or vice versa) and is asserted in the "requires the
declared train" test; the empty-ledger condition is `issue-ledger.mjs`'s responsibility,
not `closure-evidence.mjs`'s, and is covered by that tool's own test suite
(`evals/tests/issue-ledger.test.mjs`).

Each failing-then-reverted transcript required by #174's acceptance criteria must be
produced by actually running `node --test evals/tests/closure-evidence.test.mjs` and
`node evals/tools/closure-evidence.mjs` against the live #145 record; this document
records the specification, not a substitute for that transcript.

## #145's own gateability

For #145 to be measurable and decidable, it needs its own acceptance ledger (boxes the
ledger tool can count) and a well-formed `release-claim` marker (or an explicit
`train=none` declaration). Adding those is an edit to the live issue body, which is
reserved for human judgement per #139's contract ("the tool performs no GitHub
mutation") — this specification does not perform that edit.

## Plan

See `docs/spec/remediation-plan.md` for the batch-wide sequencing this item depends on.
