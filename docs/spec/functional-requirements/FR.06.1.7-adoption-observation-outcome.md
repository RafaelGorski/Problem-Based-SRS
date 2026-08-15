## FR.06.1.7: Execution of the observation window and filing of the outcome

## Requirement

**ID:** FR.06.1.7
**Title:** Execution of the observation window and filing of the outcome
**Priority:** Should Have
**Status:** Draft
**Parent issue:** [#148](https://github.com/RafaelGorski/Problem-Based-SRS/issues/148)
**Sequence position:** Phase 4 — last item in the sequence

### Statement

The adoption observation shall be executed exactly as declared, against a demonstration built from
the current published canvas archive, and its outcome shall be filed within the declared window
**whether positive or negative**, with any deviation from the contract recorded as a deviation
rather than absorbed into the result.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.1 | A discoverable entry point and one instrumented adoption signal |
| Customer Problem | CP.06 | Every open item is self-generated; there is zero inbound signal |
| Non-functional | NFR.07 | Evidence provenance for screenshot proof |

## Problems found (2026-08-15)

1. **The experiment has never run, and nothing records why.** `issue-ledger.mjs 148` reports
   **12 boxes, 0 checked, 12 open-without-blocker**. The issue is genuinely blocked — on the
   contract, on the surface contradiction, and on the stale listing — yet not one of its boxes
   names a blocker, so it reads as neglected rather than sequenced.

2. **It cannot receive a closure verdict.** `closure-evidence.mjs --prospective 148` reports
   `release-claim-indeterminate: missing release-claim marker`.

3. **The demonstration would attest a superseded artifact.** The batch's existing text is written
   around `v1.1.1`. Three canvas releases have published since; a demonstration built from the
   older archive would show adopters something the repository no longer advertises.

4. **Every upstream input is currently defective.** The docs site contradicts itself on version,
   the registry advertises eight retired entry points, and the consolidated suite is red. An
   observation run today would measure those defects rather than the methodology.

5. **The strongest failure mode is silent re-scoping.** With no predeclared contract, a
   disappointing result can be reinterpreted as a pilot, a warm-up, or a tooling problem. The
   experiment then costs real effort and yields no decidable answer — leaving CP.06 exactly where
   it started.

6. **A checkout-rendered screenshot would quietly substitute for the real thing.** The convenient
   capture path renders from `lib/`. Unless the provenance record from FR.01.3.13 is reused, the
   evidence will silently attest the developer's working tree instead of the published release.

## Acceptance Criteria

### The demonstration is built from published bytes

- [ ] The published demonstration is produced from the **current** canvas release archive.
- [ ] The provenance record and capture from FR.01.3.13 are **reused**, not regenerated from the
      checkout; the reused record is referenced by hash.
- [ ] The version visible in the demonstration equals the current published canvas release.

### The window runs as declared

- [ ] The observation runs in the declared UTC window, on the declared channel, with no
      substitution.
- [ ] Any deviation from the declared contract is recorded as a deviation, with its reason, and is
      not folded into the result.
- [ ] The activation event is measured as defined, and the raw observation is retained alongside
      the interpretation.

### The outcome is filed either way

- [ ] The outcome is filed within the declared window.
- [ ] A negative or null result is filed with the same rigour as a positive one, and explicitly
      states what was learned and what would be tried next.
- [ ] The follow-up question is asked verbatim as predeclared, and the answer — or the absence of
      one — is recorded.
- [ ] The result names whether it constitutes the first externally attributable adoption signal,
      so CP.06 either gains its first evidence or is shown still to lack it.

### #148 becomes gateable and closes on evidence

- [ ] #148 carries one well-formed release-claim marker or an explicit declaration that it claims
      no release.
- [ ] `issue-ledger.mjs 148 --json` reports **0 open-without-blocker**.
- [ ] The consolidated runner exits `0` and `check-distribution.mjs --strict` is clean, or each
      remaining finding is named as accepted third-party state.

## Verification

### App track — Playwright with screenshots

```
node evals/tools/open-archive-canvas.mjs ./ext/srs-navigator --provenance ./provenance.json
cd .github/extensions/srs-navigator && npx playwright test --project=canvas
cd .github/extensions/srs-navigator && npx playwright test --project=site
```

The canvas capture is the adopter-visible artifact: the `/live` graph as a real visitor would see
it, rendered from the published archive and attached **with** its provenance record. The site
project captures the entry point the visitor traverses to reach it. Together they show the path,
not just the destination — a graph screenshot with no entry-point evidence does not demonstrate
that anyone could arrive.

### Skills track — CLI

```
node evals/tools/adoption-experiment.mjs
node evals/tools/evidence-pack.mjs
node evals/tools/issue-ledger.mjs 148 --json ledger-148.json
node evals/tools/closure-evidence.mjs --prospective 142 148
pwsh -File run-tests.ps1 -NoOpen
```

## Depends on

- [#142](https://github.com/RafaelGorski/Problem-Based-SRS/issues/142) via FR.06.1.6 — the contract and a self-consistent surface.
- [#138](https://github.com/RafaelGorski/Problem-Based-SRS/issues/138) via FR.01.3.13 — the provenance record to reuse.
- [#147](https://github.com/RafaelGorski/Problem-Based-SRS/issues/147) via FR.01.4.8 — a refreshed listing, so the funnel is the real one.

## Blocks

Nothing. This is the terminal item in the sequence; its outcome is the first external input CP.06
has ever had.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
