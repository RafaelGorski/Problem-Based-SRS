## FR.01.4.7: Registry before-state capture and re-crawl submission

## Requirement

**ID:** FR.01.4.7
**Title:** Registry before-state capture and re-crawl submission
**Priority:** Should Have
**Status:** Draft
**Parent issue:** [#140](https://github.com/RafaelGorski/Problem-Based-SRS/issues/140)
**Sequence position:** Phase 1 — independent; runnable in parallel with the closure work

### Statement

The registry re-crawl shall begin with a recorded before-state captured from the live listing —
parsed entries **and** parsed page content — so that the effect of the re-submission is
demonstrable by comparison rather than asserted, and axes the surface makes unverifiable shall be
recorded as explicitly unverified rather than reported as passes.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The listing must be refreshed **and verified as refreshed**, not assumed |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |

## Problems found (2026-08-15)

1. **The listing still advertises eight skills this repository does not ship.**
   `node scripts/check-distribution.mjs --strict` exits **1** with `registry-listing-drift`,
   naming: `business-context`, `complexity-analysis`, `customer-needs`, `customer-problems`,
   `functional-requirements`, `software-glance`, `software-vision`, `zigzag-validator`. The
   repository ships **one** skill, `problem-based-srs`. Anyone arriving from search finds eight
   entry points that no longer exist.

2. **The count has not moved in eight days.** The same eight were reported when the previous
   sub-issue round was filed on 2026-08-07. No re-submission has taken effect in the interval, and
   nothing distinguishes "submitted and not yet crawled" from "never submitted".

3. **The deeper axis is silent, which makes a shallow fix look complete.** Only
   `registry-listing-drift` is firing; `registry-skill-stale` is not. Names agreeing is the cheap
   half. A re-crawl that corrects the entry list while the page still teaches the retired `FR-001`
   notation would clear the visible finding and leave the substantive one unobserved.

4. **One axis can never be satisfied and must not be promised.** The monitor records
   `registry-skill-version-unverifiable`: skills.sh publishes no `softwareVersion`, so the page's
   version cannot be read at all. Any acceptance criterion demanding version agreement on that
   surface is unsatisfiable by construction and would strand this issue permanently.

5. **#140 cannot be gated or decided.** `issue-ledger.mjs 140` reports **0 boxes**, and
   `closure-evidence.mjs --prospective 140` reports
   `release-claim-indeterminate: missing release-claim marker`.

6. **This is third-party state and no pull request can fix it.** The work is a submission plus an
   observation, deliberately outside the PR gate — which is exactly why it needs an owner and a
   recorded before-state rather than a code change.

## Acceptance Criteria

### The before-state is captured before anything is submitted

- [ ] The strict monitor is run and its full output saved as the before-state, including the exact
      list of eight advertised-but-absent entries.
- [ ] The parsed **content** of the shipped skill's page is captured — its description and the
      section headings it renders — not only the entry names.
- [ ] The capture is timestamped, and the tool version producing it is recorded.

### The submission is made and evidenced

- [ ] The repository is re-submitted at skills.sh and the submission itself is evidenced
      (confirmation view or response captured).
- [ ] The submission time is recorded so the crawl interval can be reasoned about rather than
      guessed.

### Unverifiable axes are declared, not promised

- [ ] The issue states explicitly that version agreement on skills.sh **cannot** be verified while
      the surface publishes no `softwareVersion`, and that this is the registry's limitation.
- [ ] That axis is recorded as a notice and is not permitted to fail the run or block closure.

### #140 becomes gateable

- [ ] #140 carries acceptance boxes the ledger can count.
- [ ] It carries one well-formed release-claim marker or an explicit declaration that it claims no
      release, so the closure gate can return a verdict.

## Verification

### Skills track — CLI

```
node scripts/check-distribution.mjs           > registry-before.txt
node scripts/check-distribution.mjs --strict; echo "exit=$?"
node evals/tools/issue-ledger.mjs 140 --json ledger-140.json
node evals/tools/closure-evidence.mjs --prospective 140
```

The before-state must be captured **first** and attached unmodified. Re-running the monitor after
submission is FR.01.4.8's job; recording a single "after" run without its "before" proves nothing
about what changed.

### App track — Playwright with screenshots

The registry page is a third-party web surface, so a browser capture is legitimate evidence here —
unlike the metadata requirements in this batch. Capture the live listing page and the shipped
skill's page as they stand **before** submission, and store them beside the parsed output. These
screenshots are the human-readable counterpart to `registry-before.txt`; the parsed capture
remains the authoritative artifact because a screenshot cannot be diffed.

## Depends on

Nothing. Startable immediately; independent of the release and closure work.

## Blocks

[#147](https://github.com/RafaelGorski/Problem-Based-SRS/issues/147) — there is nothing to verify a
re-crawl against without a recorded before-state.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
