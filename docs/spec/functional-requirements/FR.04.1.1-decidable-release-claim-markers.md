## FR.04.1.1: Decidable Release-Claim Markers

## Requirement

**ID:** FR.04.1.1
**Title:** Decidable Release-Claim Markers on Every Root Issue
**Workstream:** W3 — Closure gate (depends on W1)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall carry exactly one machine-parseable release-claim marker on every root
issue in the closure batch, so the closure gate returns a determinate verdict rather than an
error.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Decidable release claims |
| Customer Problem | CP.04 | `#139 release-claim-indeterminate` |

## Issues addressed

**Parents:** #139, #211, #217 · **Subsumes:** #182, #230, #231, #232, #236, #237

## Measured defect

```console
$ node evals/tools/closure-evidence.mjs --prospective 138 139
exit 1 — #139 release-claim-indeterminate
```

#139 carries a **duplicate** release-claim marker. `indeterminate` is not a failure verdict:
it means the gate could not decide, so neither closing nor refusing to close is supported by
the tool. Until this is repaired, every gate result downstream of it is uninterpretable.

A second hazard is recorded in #217's scope boundary: the `<!-- release-claim train=none -->`
convention used on #218 must be **verified as parser-supported**, not assumed. An untested
non-claim syntax reintroduces indeterminacy under a different name.

## Eight root issues in scope

`#138 #139 #140 #142 #145 #147 #148 #149`

## Acceptance Criteria

- [ ] Each of the eight root issues carries **exactly one** release-claim marker
- [ ] `node evals/tools/closure-evidence.mjs --prospective 138 139 140 142 145 147 148 149` returns a determinate verdict for every issue — no `indeterminate`
- [ ] The non-claim syntax (`train=none`) is demonstrated to parse, with the parser output quoted
- [ ] The marker each root carries is correct for its train (`plugin` / `canvas` / `none`), verified against live release state rather than issue text
- [ ] A validated release-claim census is recorded for the batch, listing issue → marker → train
- [ ] Each box cites the command output that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# every root returns a determinate verdict
node evals/tools/closure-evidence.mjs --prospective 138 139 140 142 145 147 148 149

# the non-claim syntax actually parses
node evals/tools/closure-evidence.mjs --prospective 218

# the train each marker names matches live release state
node scripts/release-train.mjs --tag v2.7
node scripts/release-train.mjs --tag v1.1.4

node --test evals/tests/closure-evidence.test.mjs evals/tests/release-trains.test.mjs
```

**Pass condition:** no issue reports `indeterminate`; every marker's train matches what
`release-train.mjs` reports for the tag it names.

### App track — Playwright

**Out of scope, deliberately.** This requirement is about issue-body markup and a CLI
verdict. No rendered view witnesses either.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
