# FR.03.1.1: Deterministic default runner

## Requirement

**ID:** FR.03.1.1
**Title:** Deterministic default runner
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #292 — Make the default runner green and deterministic on a clean checkout
**Wave:** 0 — Baseline green

### Statement

The system shall complete the default test runner with exit code 0 and leave the working tree clean, on any machine, without network access or provider credentials.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.03.1 | A contributor needs the documented consolidated command to exit zero on a clean checkout with no provider credentials present. |
| Customer Problem | CP.03 | The default verification runner is red, so no green claim is falsifiable |
| Issue | #292 | Make the default runner green and deterministic on a clean checkout |

## Problem addressed

The documented consolidated command exits non-zero on a clean checkout, so a contributor cannot tell a real regression from the standing baseline. Every other issue in this backlog is supposed to close on evidence produced by this runner.

**Observed on 2026-09-28:** Reproduced 2026-09-28 at 7737b3d: `pwsh -File run-tests.ps1 -NoOpen` exits 1 with **1,287 passed / 1,299**. Eleven skill-eval failures come from six files — `dependency-pins`, `distribution-drift`, `docs-version-parity`, `release-hygiene`, `release-preflight`, `release-trains` — each confirmed failing individually. The twelfth is the canvas dashboard e2e, which reads `docs/skills-health.json` before the suite regenerates it. The run also leaves three tracked files modified (`package-lock.json`, `docs/skills-health.html`, `docs/skills-health.json`), so the suite is not idempotent.

## Acceptance Criteria

- [ ] `pwsh -File run-tests.ps1 -NoOpen` exits 0, with provider-gated suites reported as **skipped**, not failed
- [ ] Each of the six named eval files exits 0 when run individually
- [ ] The dashboard e2e passes on a checkout where the dashboard has never been generated
- [ ] `git status --porcelain` is empty immediately after a full run
- [ ] Two consecutive runs from the same commit report identical totals

## Verification

**Track:** Skills (CLI) + App

### Skills track — CLI

```bash
pwsh -File run-tests.ps1 -NoOpen
node --test evals/tests/dependency-pins.test.mjs evals/tests/docs-version-parity.test.mjs evals/tests/release-hygiene.test.mjs evals/tests/release-preflight.test.mjs evals/tests/release-trains.test.mjs
git status --porcelain
```

- `pwsh -File run-tests.ps1 -NoOpen` → Transcript showing exit code 0 and the per-suite totals table, contrasted against today's 1,287/1,299 baseline.
- `node --test evals/tests/dependency-pins.test.mjs evals/tests/docs-version-parity.test.mjs evals/tests/release-hygiene.test.mjs evals/tests/release-preflight.test.mjs evals/tests/release-trains.test.mjs` → All five files passing in one invocation.
- `git status --porcelain` → Empty output captured immediately after the runner finishes.

### App track — Playwright with screenshots

```bash
cd .github/extensions/srs-navigator
npx playwright test site.test.mjs --project=site --grep "dashboard names the same version"
```

- Green run on a checkout with no pre-generated dashboard, plus the failure screenshot from today's baseline for contrast.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 0 — Baseline green |
| **Blocked by** | nothing — can start now |
| **Blocks** | #294, #297, #300, #305, #319 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
