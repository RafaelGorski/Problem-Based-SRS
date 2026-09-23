## FR.09.1.1: Workflow Immunity to Ref-Name Injection

## Requirement

**ID:** FR.09.1.1
**Title:** Workflow Immunity to Ref-Name Injection
**Workstream:** W2 — Security hardening (parallel with W1)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall pass attacker-influenced GitHub context values to shells as environment
data rather than as interpolated source text, in every workflow that holds write permissions.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.09.1 | Workflows immune to ref-name injection |
| Customer Problem | CP.09 | Four elevated-permission workflows expand `${{ github.ref_name }}` inside `run:` |

## Issues addressed

**Parent:** #275 · **Existing work:** PR #276 (focused), PR #277 (draft, overlapping) —
see FR.10.1.1, which must decide between them **before** this requirement is executed.

## Finding

🟠 **HIGH — command injection, confidence 9/10.** These steps interpolate
`${{ github.ref_name }}` directly into a shell `run:` block. A ref name containing `$()` or
backticks is evaluated by the shell **before any validation logic runs**:

- `.github/workflows/create-release.yml` (~line 41)
- `.github/workflows/release-canvas.yml` (~line 72)
- `.github/workflows/thursday-release-report.yml` (~line 23)
- `.github/workflows/thursday-release.yml` (~line 23)

All four hold `contents: write`; two additionally hold `issues: write` and `actions: write`.
These are the workflows that publish releases, so the blast radius is every downstream
consumer of a published artifact.

Two LOW hygiene items accompany it: the lockfile skew already covered by FR.01.1.1, and
Actions pinned to mutable major tags (`actions/checkout@v4`) rather than commit SHAs.

## Acceptance Criteria

- [ ] No workflow expands a GitHub expression carrying attacker-influenced text directly inside a `run:` block
- [ ] Each of the four named workflows passes the value through `env:` and dereferences it as a shell variable
- [ ] `npm install --package-lock-only` has resynced the lockfile, with no dependency-graph change in the diff
- [ ] Actions are pinned to commit SHAs with version comments, or the decision to defer is recorded with a rationale
- [ ] An eval test fails if a direct `${{ github.* }}` interpolation reappears in a `run:` block
- [ ] `gh api repos/.../code-scanning/alerts?state=open` returns `[]`
- [ ] Each box cites the command output or commit SHA that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# no expression interpolation survives inside a run: block
node --test evals/tests/release-input-hardening.test.mjs \
             evals/tests/dependency-pins.test.mjs \
             evals/tests/codeql-workflow.test.mjs \
             evals/tests/bump-version-lockfile-parity.test.mjs

# the alert surfaces are clear
gh api repos/RafaelGorski/Problem-Based-SRS/code-scanning/alerts?state=open
gh api repos/RafaelGorski/Problem-Based-SRS/dependabot/alerts?state=open
npm audit --prefix .github/extensions/srs-navigator
```

**Negative test required before closing:** reintroduce a direct interpolation in a scratch
copy of one workflow and confirm the hardening test **fails**. A test that never fails guards
nothing.

### App track — Playwright

**Out of scope, deliberately.** This requirement concerns workflow source text and GitHub
alert state. No rendered view can witness shell-parsing behaviour in a CI runner, and a
screenshot here would be evidence for the wrong claim.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
