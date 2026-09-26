## FR.04.1.15: Release-Claim Accounting

## Requirement

**ID:** FR.04.1.15
**Title:** Record every issue as either a release claim or explicitly not one
**Priority:** Should Have
**Status:** Draft

### Statement

Every issue in the open batch shall carry either exactly one valid `release-claim` marker
or an explicit record that it makes no release claim, so that the absence of a marker is a
recorded decision rather than an omission the closure gate cannot distinguish from an
oversight.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #149 | The batch reconciliation that requires this accounting |

## Problems found (2026-08-16)

1. **Six issues are silent on the question.** Marker extraction across all 17 open issues
   found markers on **#138 and #139 only**. Of the remainder, **#140, #142, #145, #147,
   #148 and #149** carry neither a marker nor the explicit "not a release claim" record.
2. **#149's own criteria already require this**, and it is unmet: *"Any issue in the batch
   that claims a release but carries no marker is either given exactly one valid marker or
   explicitly recorded as not a release claim."*
3. **The nine 2026-08-15 sub-issues are compliant** — #162, #164, #165, #173, #174, #175,
   #176, #178 and #179 each carry the prose form `**Release claim:** none`. The gap is
   confined to the six parents above, which makes it cheap to close.
4. **Silence and omission are indistinguishable to the gate.** `closure-evidence.mjs`
   cannot tell an issue that deliberately makes no claim from one whose marker was
   forgotten, so it can neither clear nor flag them.

## Acceptance Criteria

- [ ] Each of #140, #142, #145, #147, #148 and #149 carries either exactly one valid
      `release-claim` marker or an explicit "not a release claim" record.
- [ ] A marker census across the live open batch is attached, listing every issue and its
      marker count, including the zero counts.
- [ ] No issue carries more than one marker; the duplicate on #139 is resolved separately
      under FR.04.1.14 and confirmed here.
- [ ] `closure-evidence.mjs --prospective` returns a decidable verdict — clean or flagged,
      never indeterminate — for every issue carrying a marker.
- [ ] The census is re-taken immediately before batch closure, because batch membership
      changed inside a single verification run on 2026-08-16.

## Verification

### Skills track — CLI

```bash
# marker census across the live batch
gh issue list --state open --json number,body \
  --jq '.[] | "\(.number): \([.body | scan("<!-- release-claim[^>]*-->")] | length)"'

node evals/tools/closure-evidence.mjs --prospective <claimants> --json closure-batch.json
node evals/tools/issue-ledger.mjs <live batch> --json ledger-after.json
```

### App track — Playwright: explicitly out of scope

Release-claim accounting lives entirely in issue metadata. No browser view can witness it.
Recording that boundary is part of the deliverable.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
