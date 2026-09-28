# FR.05.1.1: Scheduled model-behaviour proof

## Requirement

**ID:** FR.05.1.1
**Title:** Scheduled model-behaviour proof
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #294 — Restore the model-behavior proof so the anti-drift claim is exercised
**Wave:** 1 — Restore proof and correct the claims

### Statement

The system shall execute the model-behaviour suite against a real provider on a schedule, and shall record each run's verdict, provider and timestamp as durable evidence.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.05.1 | The maintainer needs the behaviour scenarios executed on schedule, with consecutive failure raised rather than absorbed. |
| Customer Problem | CP.05 | The anti-drift claim is asserted but never exercised |
| Issue | #294 | Restore the model-behavior proof so the anti-drift claim is exercised |

## Problem addressed

The product's differentiating claim is that it prevents model drift — specifically that the mandatory Discovery Interview cannot be silently skipped. That claim has not been exercised in eight consecutive scheduled runs, so nothing would detect its regression.

**Observed on 2026-09-28:** Scheduled run 35593097679 is six days old and failed before executing any scenario because `ANTHROPIC_API_KEY` is absent. Zero scenarios executed. A missing credential currently presents as a failed run rather than as an explicit, actionable alert, so eight failures accumulated without anyone acting.

## Acceptance Criteria

- [ ] A dispatched `skill-behavior.yml` run reports a scenario count **> 0**
- [ ] All configured scenarios pass on that run
- [ ] The workflow summary distinguishes executed-and-passed from not-executed-for-credentials
- [ ] A consecutive-failure alert fires on a synthetic second failure
- [ ] Weakening the Discovery Interview guardrail fails the canary scenario, proving the suite tests behaviour rather than presence

## Verification

**Track:** Skills (CLI)

### Skills track — CLI

```bash
gh workflow run skill-behavior.yml && gh run watch <id> --exit-status
npm run test:skill-behavior --prefix .github/extensions/srs-navigator
node --test evals/tests/check-behavior-proof.test.mjs
node --test .github/extensions/srs-navigator/tests/interview-guard.test.mjs
```

- `gh workflow run skill-behavior.yml` → Run URL, conclusion, and the reported scenario count (must be > 0).
- `npm run test:skill-behavior --prefix .github/extensions/srs-navigator` → Local transcript with credentials present, showing executed scenarios rather than a clean skip.
- `node --test evals/tests/check-behavior-proof.test.mjs` → Exit 0 — the freshness/consecutive-failure guard itself passes.
- `node --test .github/extensions/srs-navigator/tests/interview-guard.test.mjs` → Deterministic drift guard green, run alongside the LLM suite.

### App track — explicitly out of scope

This requirement is gated on workflow execution and scenario accounting, both of which are CI metadata. There is no user-visible surface to photograph, and recording that boundary is part of the deliverable rather than an omission.

## Sequencing

| | |
|---|---|
| **Wave** | 1 — Restore proof and correct the claims |
| **Blocked by** | #292, #293 |
| **Blocks** | #142 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
