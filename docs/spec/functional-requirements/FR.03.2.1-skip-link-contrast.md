## FR.03.2.1: Readable Keyboard Skip Link

## Requirement

**ID:** FR.03.2.1
**Title:** Readable Keyboard Skip Link
**Workstream:** W1 — Green baseline
**Priority:** Must Have
**Status:** Draft

### Statement

The documentation site shall render the keyboard skip link at a contrast ratio of at least
4.5:1 against its background when focused.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.03.2 | Readable keyboard navigation |
| Customer Problem | CP.03 | The skip link measures 2.39:1 against a 4.5:1 requirement |

## Issues addressed

**Parent:** #218 · **Also:** #227 CP-F

## Measured defect

`docs/assets/site.css:114-117` sets `--ink-heading` on `--primary`, giving a calculated
contrast of **2.39:1** against the WCAG 2.1 AA requirement of **4.5:1** for normal text.
The daily evaluation records `--on-primary` as measuring **7.50:1** on the same background.

A skip link is the first interactive element a keyboard user reaches. At 2.39:1 it is
present, focusable, and effectively invisible — the failure mode that makes the control
worse than absent, because assistive-technology users are told it exists.

## Acceptance Criteria

- [ ] The focused skip link measures at least **4.5:1** against its background
- [ ] The measured ratio is recorded in the closing comment, computed rather than asserted
- [ ] A contrast assertion exists that fails if the ratio regresses below 4.5:1
- [ ] The skip link remains visible on focus and is not revealed only by hover
- [ ] Each box cites the command output or measurement that satisfied it

## Verification

### Skills track — CLI

```bash
node --test evals/tests/landing-proof.test.mjs
```

**Pass condition:** the contrast assertion passes and fails when the colour pair is reverted
(negative-test the guard before closing).

### App track — Playwright with screenshots *(this requirement's primary gate)*

```bash
cd .github/extensions/srs-navigator
npx playwright test --project=site --grep "skip link"
```

| Screenshot | Proves |
|---|---|
| `test-results/w1-skip-link-focused.png` | The skip link rendered at its corrected contrast, in the focused state |
| `test-results/w1-skip-link-contrast.png` | The computed ratio asserted in the test, captured at the moment of assertion |

Drive focus with a real `Tab` press from the top of the document rather than calling
`.focus()`, so the screenshot proves the state a keyboard user actually reaches.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
