## FR.02.1.1: Verification Shall Not Mutate Tracked State

## Requirement

**ID:** FR.02.1.1
**Title:** Verification Shall Not Mutate Tracked State
**Workstream:** W1 — Green baseline
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall leave the working tree unmodified after a complete verification run, so
that `git status` remains a statement about the contributor's own work.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.02.1 | Verification that leaves the tree untouched |
| Customer Problem | CP.02 | The suite rewrites tracked files — up to three, intermittently |

## Issues addressed

**Parent:** #218 (false-green dashboard) · **Also:** #227 CP-E, #209 (F10)

## Measured defect (2026-09-23)

`git status --porcelain` immediately after `pwsh -File run-tests.ps1 -NoOpen`, **run 1 on a
clean tree**:

```
 M .github/extensions/srs-navigator/package-lock.json
 M docs/skills-health.html
 M docs/skills-health.json
```

A **third run**, after the intervening runs had already repaired the lockfile, mutated only
two:

```
 M docs/skills-health.html
 M docs/skills-health.json
```

**The lockfile mutation is intermittent, and that is worse than if it were constant.** It
fires only when the installed tree disagrees with the committed lockfile — which is exactly
the state a reviewer is in on a fresh clone, and exactly the state nobody is in once they
have run the suite once. A defect that disappears the moment you look at it twice is one
that gets reported as "cannot reproduce" and closed.

Two distinct problems are entangled here, and **the second hides the first**:

1. **Install repairs the lockfile in place.** On the second run the two lockfile tests pass —
   not because the defect was fixed, but because running the suite fixed it silently. A green
   second run is therefore not evidence of a green first run.
2. **`docs/skills-health.html` is a committed build artefact.** It shipped reporting
   `Problem-Based SRS v2.6.0 · SRS Navigator v1.1.3 · generated 2026-08-15`, and the site
   test that reads it fails. A committed artefact that regenerates on every run is a
   false-green surface: it can publish results from an older run than the one just executed.
   Unlike the lockfile, this one mutates on **every** run, including run 3.

## Decision required

`docs/skills-health.html` must become **either** a CI-regenerated artefact excluded from
version control, **or** a committed file regenerated deterministically before Playwright
consumes it. Leaving it committed *and* runner-generated is the current defect.

## Acceptance Criteria

- [ ] `git status --porcelain` is **empty** immediately after a full `run-tests.ps1` run
- [ ] The dashboard cannot publish results from an earlier run than the one just executed
- [ ] The documented ordering guarantees the dashboard is regenerated **before** the Playwright `site` project reads it
- [ ] The decision on `docs/skills-health.html` (tracked vs. generated) is recorded in the closing comment with its rationale
- [ ] A test fails if a future change reintroduces tracked-state mutation during verification
- [ ] Each box cites the command output that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
git clone https://github.com/RafaelGorski/Problem-Based-SRS.git verify-clean
cd verify-clean
pwsh -File run-tests.ps1 -NoOpen
git status --porcelain                     # must print nothing
git diff --stat                            # must print nothing
node --test evals/tests/runner-contract.test.mjs evals/tests/health-dashboard.test.mjs
```

**Pass condition:** both `git` commands produce empty output, and the two eval files pass.

### App track — Playwright with screenshots

| Screenshot | Proves |
|---|---|
| `test-results/w1-skills-health-fresh.png` | The rendered dashboard reports a generation timestamp from the current run, not 2026-08-15 |
| `test-results/w1-skills-health-counts.png` | The rendered pass/fail counts match the summary the runner printed in the same run |

Run the full `run-tests.ps1` (without `-NoDashboard`) at least once before this, because the
dashboard must be regenerated before Playwright consumes it.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
