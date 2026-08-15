## FR.06.1.6: Consistent adoption surface and a predeclared observation contract

## Requirement

**ID:** FR.06.1.6
**Title:** Consistent adoption surface and a predeclared observation contract
**Priority:** Should Have
**Status:** Draft
**Parent issue:** [#142](https://github.com/RafaelGorski/Problem-Based-SRS/issues/142)
**Sequence position:** Phase 3 — after FR.01.3.12

### Statement

Every page of the documentation site shall advertise the same current version as the published
release line, and the adoption observation contract — channel, window, activation event, and
follow-up question — shall be declared in full **before** any observation begins, so the result
cannot be reinterpreted after the fact.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.1 | A discoverable entry point and one instrumented adoption signal |
| Customer Problem | CP.06 | Every open item is self-generated; there is zero inbound signal |
| Non-functional | NFR.06 | Advertised-versus-published version lag must stay detectable |

## Problems found (2026-08-15)

1. **The documentation site contradicts itself about its own version.**
   `docs/docs.html` advertises **v2.4.1** in both the header badge (line 22, including its
   `aria-label="Version 2.4.1, view releases"`) and the footer (line 530), while
   `docs/index.html` advertises **v2.6.0** in the same two places (lines 22 and 483). The current
   published plugin release is **v2.6**. A visitor who reads the landing page and then the docs
   page sees two different current versions.

2. **This defect sits directly in front of the experiment.** #142 measures whether a real engineer
   reaches the Navigator through the documented entry point. Running it while the entry point
   contradicts itself measures the contradiction, and a negative result would be uninterpretable —
   it could mean the product failed or that the surface looked unmaintained.

3. **No parity guard covers the second page.** `docs/index.html` is correct today by maintenance,
   not by construction; the same drift that stranded `docs/docs.html` at `v2.4.1` can strand it
   next. Nothing derives either claim from the manifest.

4. **The discovery path is still stale.** Search-driven arrivals still meet eight retired entry
   points on the registry listing, so the funnel this experiment measures is not yet the funnel a
   real adopter would traverse.

5. **#142 records twelve open boxes and no blocker.** `issue-ledger.mjs 142` reports **12 boxes, 0
   checked, 12 open-without-blocker**, and `closure-evidence.mjs --prospective 142` reports
   `release-claim-indeterminate: missing release-claim marker`. The issue is blocked in fact and
   unblocked on paper.

6. **Still zero inbound signal.** No activation or referral evidence has appeared, so every item
   in the backlog remains self-generated — the exact condition CP.06 describes.

## Acceptance Criteria

### The surface agrees with itself and with the release line

- [ ] `docs/docs.html` and `docs/index.html` advertise the same version in badge, `aria-label`,
      and footer.
- [ ] That version equals the current published plugin release.
- [ ] Both claims are derived from or checked against the plugin manifest by an automated guard,
      so parity is structural rather than remembered.
- [ ] Negative test: the guard is shown to fail when one page is edited to disagree, then reverted.
- [ ] The version badges link the releases **index**, never a per-tag URL, so they cannot 404
      during the window between a manifest bump and its release.

### The contract is declared before the window opens

- [ ] One ICP channel is named, with the reason it was chosen.
- [ ] The observation window is declared in UTC with explicit start and end.
- [ ] The activation event is defined precisely enough to be observed unambiguously — what counts
      as a user reaching the Navigator, and what does not.
- [ ] The single follow-up question is written verbatim in advance.
- [ ] The archive provenance the demonstration will use is named, and it is the **current**
      published canvas release.
- [ ] The declaration is filed **before** publication; a contract written after the observation is
      not a contract.

### Failure is defined in advance

- [ ] The result that would count as a negative outcome is stated before the window opens.
- [ ] It is stated that a negative outcome will be filed rather than retried silently.

## Verification

### App track — Playwright with screenshots

```
cd .github/extensions/srs-navigator && npx playwright test --project=site
```

Capture both pages at the header badge and the footer and attach all four screenshots. The
contradiction is visual and belongs in the record as a before/after pair: today's shots show
`v2.4.1` on the docs page beside `v2.6.0` on the landing page; the after-shots must show a single
version on both, matching the release line.

### Skills track — CLI

```
python scripts/build-plugin.py validate
node --test evals/tests/release-hygiene.test.mjs
node scripts/check-distribution.mjs --strict
node evals/tools/issue-ledger.mjs 142 --json ledger-142.json
node evals/tools/adoption-experiment.mjs
```

The declared contract is stored as an artifact and its fields are checked mechanically, so
"predeclared" is verifiable rather than a claim about intent.

## Depends on

[#146](https://github.com/RafaelGorski/Problem-Based-SRS/issues/146) via FR.01.3.12 — the demo must
reference an internally consistent published archive.

## Blocks

[#148](https://github.com/RafaelGorski/Problem-Based-SRS/issues/148) — the observation window
cannot open before the contract exists and the surface agrees with itself.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
