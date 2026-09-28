# FR.01.1.1: Published-surface version parity

## Requirement

**ID:** FR.01.1.1
**Title:** Published-surface version parity
**Priority:** Must Have
**Status:** Draft
**Owning issue:** #293 — Make every published surface state the shipped version, count and contrast
**Wave:** 0 — Baseline green

### Statement

The system shall state, on every published surface, the plugin and canvas versions that are actually published, as two separately-named trains.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.1 | A visitor needs the published surfaces to state the same shipped version, whichever surface they read first. |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Issue | #293 | Make every published surface state the shipped version, count and contrast |

## Problem addressed

The version, skill count and node count a visitor reads differ between README, the documentation site and the landing page, so no published number can be cited as the shipped number. Separately, the skip link — the first control a keyboard user reaches — renders below the WCAG AA contrast floor.

**Observed on 2026-09-28:** `README.md#L3` badges 2.6.0 after v2.7 shipped; `docs/docs.html` repeats 2.6.0 at lines 13 and 22; `docs/index.html#L103` says "Ten AgentSkills" although one skill ships; the generated dashboard still reads 2.6.0 / 1.1.3 against a published 2.7.0 / 1.1.5, which is what today's canvas e2e failure reports. `docs/assets/site.css#L114-L117` renders the skip link as `--ink-heading` on `--primary`, measured at 2.39:1 against a 4.5:1 AA floor. Confirmed visually on 2026-09-28 by running `npx playwright test --project=site` (18 passed, 1 failed): the landing badge screenshots as **v2.7.0** while the dashboard one click away reads **v2.6.0 / v1.1.3, generated 2026-08-15** — and advertises **Passed, 1299 tests, 0 failing**, a verdict the same day's runner contradicts at 1,287 / 1,299 with 12 failures. The one failing site test is exactly `the dashboard names the same version as the site badge`.

## Acceptance Criteria

- [ ] README, `docs/docs.html`, `docs/index.html` and the generated dashboard all read plugin **2.7.0** and canvas **1.1.5**
- [ ] `node --test evals/tests/docs-version-parity.test.mjs` exits 0
- [ ] The landing page states the shipped skill count (one consolidated skill), and the node count agrees with `.spec/crm-system.json`
- [ ] The focused skip link measures **>= 4.5:1** against its background, asserted by a test rather than by inspection
- [ ] A deliberate mutation of any single version token fails the parity test (negative-test the guard)
- [ ] The committed dashboard's verdict agrees with the runner that produced it — no stored green verdict survives a red run

## Verification

**Track:** Skills (CLI) + App

### Skills track — CLI

```bash
node --test evals/tests/docs-version-parity.test.mjs
node scripts/check-distribution.mjs --strict
```

- `node --test evals/tests/docs-version-parity.test.mjs` → Exit 0, plus a transcript of the same file failing before the fix.
- `node scripts/check-distribution.mjs --strict` → Findings list with no version-parity error; registry drift may remain and is tracked separately by #300/#301/#302.

### App track — Playwright with screenshots

```bash
cd .github/extensions/srs-navigator
npx playwright test site.test.mjs --project=site
cd .github/extensions/srs-navigator
npx playwright test site.test.mjs --project=site --grep "skip link"
```

- Full green `site` project run.
- **Screenshot of the focused skip link** showing readable text, with the measured contrast ratio printed in the assertion output.

Captures land in `.github/extensions/srs-navigator/test-results/`, which is git-ignored —
attach them to the issue rather than committing them.

## Sequencing

| | |
|---|---|
| **Wave** | 0 — Baseline green |
| **Blocked by** | nothing — can start now |
| **Blocks** | #294, #306, #138, #139, #316, #313 |

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: 2026-09-28*
*Author: Problem-Based SRS — functional-requirements*
