# FR.06.1.8: External /live adoption experiment

## Requirement

**ID:** FR.06.1.8
**Title:** External /live adoption experiment
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #142 — Run one external /live adoption experiment and record outcome
**Wave:** 3 — Content proof and external signal

### Statement

The system shall run one /live adoption experiment with a participant outside this repository, and shall record the session outcome against the pre-registered contract.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.1 | The maintainer needs the methodology shown to help someone outside this repository. |
| Customer Problem | CP.06 | The backlog is entirely self-generated |
| Issue | #142 | Run one external /live adoption experiment and record outcome |

## Problem addressed

Every requirement in this backlog was written by the project about itself. One observed external run is the first evidence that the methodology helps somebody who did not write it.

**Observed on 2026-09-28:** Zero observed sessions exist. The experiment cannot start until the install path works (#308), the contract is pre-registered (#309), and `/live` is proven to render from the published archive (#138) — otherwise a failed session measures our packaging, not the methodology.

## Acceptance Criteria

- [ ] Sessions are run by participants outside this repository, on published artifacts only
- [ ] Each completed session has a **screenshot of the participant's first rendered graph**
- [ ] Time-to-first-graph is recorded by observation, not self-report
- [ ] Every abandonment is recorded with the step it occurred at
- [ ] The outcome is filed against the **unmodified** pre-registered threshold

## Verification

**Track:** App (Playwright) + Skills (CLI)

### Skills track — CLI

```bash
node evals/tools/adoption-experiment.mjs --record <session>
node --test evals/tests/adoption-experiment.test.mjs
```

- `node evals/tools/adoption-experiment.mjs --record <session>` → One record per session, bound to the committed contract.
- `node --test evals/tests/adoption-experiment.test.mjs` → Recorded sessions validate against the contract schema.

### App track — Playwright with screenshots

```bash
cd .github/extensions/srs-navigator
npx playwright test visual.test.mjs --project=canvas
```

- **A screenshot per participant** of the first rendered graph, captured during the observed session rather than reproduced afterwards, each stamped with its elapsed time.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 3 — Content proof and external signal |
| **Blocked by** | #308, #309, #294, #138 |
| **Blocks** | #311 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
