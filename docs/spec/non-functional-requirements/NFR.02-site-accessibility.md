## NFR.02: Documentation Site Accessibility

## Requirement

**ID:** NFR.02
**Title:** Documentation Site Accessibility
**Category:** Usability
**Priority:** Must Have
**Status:** Draft

### Statement

The documentation site shall meet WCAG 2.1 Level AA contrast for all interactive text,
at a minimum ratio of 4.5:1 for normal text.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.03.2 | Readable keyboard navigation |
| Applies To FRs | FR.03.2.1, FR.03.1.1 | Skip-link contrast; public surface parity |

## Measurement Criteria

- **Target:** ≥ 4.5:1 for all normal interactive text
- **Minimum Acceptable:** 4.5:1 — this is a floor, not a goal
- **Current measured value:** **2.39:1** on the focused skip link (`docs/assets/site.css:114-117`)
- **Known-good replacement:** `--on-primary` on `--primary` measures **7.50:1**
- **Measurement Method:** computed contrast assertion in the Playwright `site` project

## Acceptance Criteria

- [ ] Every interactive text element measures ≥ 4.5:1 against its background
- [ ] The focused state is measured, not only the resting state
- [ ] A regression below the threshold fails a test rather than a manual audit
- [ ] The measured ratio is recorded numerically, not asserted as "passes"

---
*Created: 2026-09-23*
