## NFR.03: Release Workflow Supply-Chain Integrity

## Requirement

**ID:** NFR.03
**Title:** Release Workflow Supply-Chain Integrity
**Category:** Security
**Priority:** Must Have
**Status:** Draft

### Statement

Every workflow holding write permissions shall treat externally-influenced context values as
data and shall resolve third-party Actions to immutable references.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.09.1 | Workflows immune to ref-name injection |
| Applies To FRs | FR.09.1.1 | Workflow injection hardening |

## Measurement Criteria

- **Target:** zero direct `${{ github.* }}` interpolations inside `run:` blocks in write-permission workflows
- **Target:** zero open code-scanning, Dependabot, or secret-scanning alerts
- **Hardening target:** third-party Actions pinned to commit SHAs with version comments
- **Measurement Method:** `evals/tests/release-input-hardening.test.mjs`, `dependency-pins.test.mjs`, and the GitHub alert APIs

## Acceptance Criteria

- [ ] Zero direct expression interpolations inside `run:` blocks across all write-permission workflows
- [ ] `gh api .../code-scanning/alerts?state=open` returns `[]`
- [ ] `gh api .../dependabot/alerts?state=open` returns `[]`
- [ ] `npm audit` reports 0 vulnerabilities for the canvas extension
- [ ] Actions are SHA-pinned, or the deferral is recorded with a rationale and a review date
- [ ] The hardening test is negative-tested — reintroducing an interpolation makes it fail

---
*Created: 2026-09-23*
