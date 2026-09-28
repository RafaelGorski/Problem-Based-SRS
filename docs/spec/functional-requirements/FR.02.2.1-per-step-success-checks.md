# FR.02.2.1: Per-step install success checks

## Requirement

**ID:** FR.02.2.1
**Title:** Per-step install success checks
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #308 — Make install-to-first-graph executable in one pass on a clean machine
**Wave:** 0 — Baseline green

### Statement

The system shall state, for each documented install step, an observable success check that lets the reader confirm that step worked before continuing.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.02.2 | A first-time user needs an explicit success check after each install step, so a failed step is visible before the next one. |
| Customer Problem | CP.02 | The documented first run does not reach the product's headline capability |
| Issue | #308 | Make install-to-first-graph executable in one pass on a clean machine |

## Problem addressed

The documented first run tells a user to install the skills and then run `/live`, but `/live` opens a canvas that the skills-only install never delivers. The user reaches the product's headline capability and finds nothing there.

**Observed on 2026-09-28:** `docs/docs.html#L106-L126` puts `/live` immediately after a skills-only install; `README.md#L286-L326` documents a second, separate canvas install that the docs path never performs. The two pages therefore describe different products, and only one of them works.

## Acceptance Criteria

- [ ] README and `docs/docs.html` describe the **same** ordered install sequence, asserted by `onboarding-parity`
- [ ] Every step carries an explicit success check the user can evaluate without reading source
- [ ] A clean-profile run reaches a rendered graph in **<= 5 minutes**, recorded with timestamps
- [ ] 5 of 5 rehearsed clean-profile runs complete without consulting anything outside the documented path
- [ ] Removing either required install from the docs fails the onboarding-parity test

## Verification

**Track:** Skills (CLI) + App

### Skills track — CLI

```bash
node --test evals/tests/onboarding-parity.test.mjs
node --test evals/tests/skills-install.test.mjs
```

- `node --test evals/tests/onboarding-parity.test.mjs` → Exit 0, with the assertion naming both required installs.
- `node --test evals/tests/skills-install.test.mjs` → Confirms the skills-only archive does not claim to deliver the canvas.

### App track — Playwright with screenshots

```bash
cd .github/extensions/srs-navigator
npx playwright test site.test.mjs --project=site --grep "install"
cd .github/extensions/srs-navigator
npx playwright test visual.test.mjs --project=canvas
```

- **Screenshot of the rendered documentation install section** showing both steps in order.
- **Screenshot of the first rendered graph** reached at the end of the documented path, plus a wall-clock timestamp pair proving the <= 5 minute target.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 0 — Baseline green |
| **Blocked by** | nothing — can start now |
| **Blocks** | #309, #142 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
