## FR.07.1.1: One Executable Install-to-Graph First Run

## Requirement

**ID:** FR.07.1.1
**Title:** One Executable Install-to-Graph First Run
**Workstream:** W7 — Onboarding (depends on W1, W5)
**Priority:** Must Have
**Status:** Draft

### Statement

The documentation shall present a single recipe that takes a clean machine from nothing to a
rendered specification graph, including both installs, the first command, and an explicit
success check.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.07.1 | One executable first run |
| Customer Problem | CP.07 | Two surfaces disagree on what must be installed |

## Issues addressed

**Parents:** #223, #219 · **Also:** #227 CP-B · **Subsumes:** #259

## Measured defect

| Surface | What it says | Consequence |
|---|---|---|
| `docs/docs.html:106-126` | presents `/live` after **only** the skills install | the command cannot work — the canvas is absent |
| `README.md:300-326` | requires the canvas extension installed **separately** | correct, but a reader who started at the docs never sees it |

A new user following the first surface reaches a failing command at the exact step where the
product is meant to prove itself. This is the highest-leverage activation defect in the
backlog and it gates every adoption measurement: an experiment run against a broken recipe
measures the recipe, not the product.

#223's scope boundary defines the test environment: *a clean profile has no checkout and no
existing `node_modules`; it must use the installed artifact.*

## Acceptance Criteria

- [ ] One recipe contains both install prompts, the first command, `/live`, and an explicit success check
- [ ] The recipe executes **in one pass** on a clean profile with no checkout and no `node_modules`
- [ ] Elapsed time from install to rendered graph is measured and recorded
- [ ] Median time to first successful `/live` is **under 5 minutes** (see NFR.04)
- [ ] `docs/docs.html` and `README.md` no longer disagree about what must be installed
- [ ] A deterministic content test fails if the two surfaces drift apart again
- [ ] `node --test evals/tests/install-path.test.mjs evals/tests/skills-install.test.mjs evals/tests/live-profile.test.mjs` passes
- [ ] Each box cites the command output or timing record that satisfied it

## Verification

### Skills track — CLI

```bash
node --test evals/tests/install-path.test.mjs \
             evals/tests/skills-install.test.mjs \
             evals/tests/live-profile.test.mjs \
             evals/tests/claude-plugin-install.test.mjs
python scripts/build-plugin.py validate
```

**Pass condition:** the install-path family passes, including the canary that fails when the
README documents a method no artifact supports.

### App track — Playwright with screenshots *(this requirement's primary gate)*

Perform the run on a genuinely clean profile, following the documented recipe verbatim —
no repository knowledge, no shortcuts.

| Screenshot | Proves |
|---|---|
| `test-results/w7-clean-profile-start.png` | The starting state: no checkout, no `node_modules`, empty extension list |
| `test-results/w7-after-skills-install.png` | The skills install completed, as the recipe describes it |
| `test-results/w7-after-canvas-install.png` | The canvas install completed — the step `docs.html` omits |
| `test-results/w7-first-live-graph.png` | The rendered graph on first `/live`, with elapsed time visible |

The fourth screenshot carries the claim. Capture it with a visible clock or terminal
timestamp so the elapsed-time criterion is witnessed rather than asserted.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
