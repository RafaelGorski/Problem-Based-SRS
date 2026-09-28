# NFR.04: Assistive navigation contrast

## Requirement

**ID:** NFR.04
**Title:** Assistive navigation contrast
**Category:** Usability
**Priority:** Must Have
**Status:** Draft

### Statement

The focused skip link shall render at a contrast ratio of at least 4.5:1 against its background, meeting WCAG 2.1 AA for normal text.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.07.1 | A keyboard user needs the skip link rendered at or above the WCAG AA contrast floor when it receives focus. |
| Customer Problem | CP.07 | Keyboard-only navigation is unreadable when focused |
| Applies To FRs | FR.07.1.1 | Requirements this quality attribute constrains |

## Measurement Criteria

- **Target:** >= 4.5:1
- **Minimum Acceptable:** 4.5:1 — the AA floor; the measured value before this pass was 2.39:1
- **Measurement Method:** Automated contrast assertion in the Playwright site project, with a screenshot of the focused link

## Acceptance Criteria

- [ ] The focused skip link measures >= 4.5:1
- [ ] The ratio is asserted by a test rather than by inspection
- [ ] A deliberate regression of the token fails the assertion

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-28*
