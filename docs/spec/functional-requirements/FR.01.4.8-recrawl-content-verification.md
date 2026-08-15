## FR.01.4.8: Re-crawl verification by parsed content with a before/after diff

## Requirement

**ID:** FR.01.4.8
**Title:** Re-crawl verification by parsed content with a before/after diff
**Priority:** Should Have
**Status:** Draft
**Parent issue:** [#147](https://github.com/RafaelGorski/Problem-Based-SRS/issues/147)
**Sequence position:** Phase 2 — after FR.01.4.7

### Statement

The re-crawl shall be verified by comparing **parsed page content** before and after submission —
not by the disappearance of a single finding — and a clean result shall be accepted as evidence
only when the monitor also reports that it could actually read the surface.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.4 | The listing must be refreshed **and verified as refreshed**, not assumed |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |

## Problems found (2026-08-15)

1. **No re-crawl has ever been verified by content.** The only evidence any refresh has been
   attempted is the finding count, and that count is unchanged: still exactly eight
   advertised-but-absent entries, still exiting `1`.

2. **A clean `registry-listing-drift` would not prove the page is current.** That axis compares
   *names*. The substantive claim — that the page teaches the current dotted notation rather than
   the retired `FR-001` form — is carried by `registry-skill-stale`, which is **not firing today**.
   Clearing the name axis alone would produce a green run over an unexamined page.

3. **A parser break is indistinguishable from success at the exit code.**
   `registry-listing-unreadable`, `registry-skill-unreadable` and `registry-listing-partial` are
   warnings: they print and exit `0`. If skills.sh changes its markup, this requirement's evidence
   becomes a clean run that proves nothing. The verification must therefore assert the surface was
   *read*, not merely that no error was raised.

4. **One axis is permanently unanswerable and must stay a notice.** skills.sh publishes no
   `softwareVersion`; `registry-skill-version-unverifiable` records this on the *unverified*
   channel precisely so a green run is not misread as a version that was checked. Closure must not
   depend on it.

5. **#147 cannot be gated or decided.** `issue-ledger.mjs 147` reports **0 boxes**, and
   `closure-evidence.mjs --prospective 147` reports
   `release-claim-indeterminate: missing release-claim marker`.

6. **Neither the observation nor the escalation has an owner.** If the re-submission does not take
   effect, nothing currently defines how long to wait or what to do next, so the issue can stay
   open indefinitely without anyone being wrong.

## Acceptance Criteria

### The comparison is made on parsed content

- [ ] The after-state is captured with the same tool and the same invocation as the before-state
      from FR.01.4.7, and the two are diffed.
- [ ] The diff shows the eight retired entries removed and `problem-based-srs` retained.
- [ ] The diff covers parsed **page content** for the shipped skill — its description and rendered
      section headings — not only the entry list.
- [ ] The section that most recently drifted, the canonical **Identifier Notation** guidance, is
      confirmed present in the after-state and shown teaching dotted IDs.

### A clean run is proven to be a read, not a silence

- [ ] The after-state run reports **no** `registry-listing-unreadable`,
      `registry-skill-unreadable`, or `registry-listing-partial` warning.
- [ ] The evidence states which axes were compared and which were not, so a green run cannot be
      read as more than it is.
- [ ] `registry-skill-version-unverifiable` is present as a notice and explicitly excluded from
      the closure condition.

### The outcome is filed either way

- [ ] `check-distribution.mjs --strict` exits `0`, **or** the remaining finding is recorded with
      the observation window that has elapsed since submission and the next action.
- [ ] A negative outcome — re-submission made, listing unchanged after the declared window — is
      filed as a result rather than left as an open issue with no verdict.

### #147 becomes gateable

- [ ] #147 carries acceptance boxes the ledger can count and one well-formed release-claim marker
      (or an explicit declaration that it claims no release).
- [ ] `issue-ledger.mjs 147 --json` reports **0 open-without-blocker**.

## Verification

### Skills track — CLI

```
node scripts/check-distribution.mjs           > registry-after.txt
diff registry-before.txt registry-after.txt
node scripts/check-distribution.mjs --strict; echo "exit=$?"
node evals/tools/issue-ledger.mjs 147 --json ledger-147.json
node evals/tools/closure-evidence.mjs --prospective 147
```

The diff is the deliverable. A standalone "after" run is not accepted, because the claim being
made is about a change, and a single observation cannot evidence a change.

### App track — Playwright with screenshots

Capture the live listing page and the shipped skill's page again after the re-crawl, framed the
same way as the before-shots from FR.01.4.7, and file the pair side by side. The screenshots make
the change legible to a human reviewer; the parsed diff remains the authoritative evidence,
because a screenshot cannot distinguish "the page changed" from "the page was rendered
differently".

## Depends on

[#140](https://github.com/RafaelGorski/Problem-Based-SRS/issues/140) via FR.01.4.7 — the
before-state and the submission must exist first.

## Blocks

[#148](https://github.com/RafaelGorski/Problem-Based-SRS/issues/148) — an adoption experiment run
while search still surfaces eight retired entry points measures the stale listing, not the product.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
