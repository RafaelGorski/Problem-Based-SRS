## FR.01.1.1: Green Default Suite From a Clean Checkout

## Requirement

**ID:** FR.01.1.1
**Title:** Green Default Suite From a Clean Checkout
**Workstream:** W1 — Green baseline
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall exit zero from `run-tests.ps1` when executed against a clean checkout
of `main` that has never previously been built.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.1 | Green baseline from a clean checkout |
| Customer Problem | CP.01 | The default suite fails on `main` — 12 failures |

## Issues addressed

**Parent:** #209 (baseline testability) · **Also:** #218, #227 CP-E

## Measured starting point (2026-09-23, HEAD `c5735ed`)

```
[PASS] Plugin validation      1/1
[PASS] Canvas extension       307/307
[FAIL] Skill evals            939/950   — 11 failed
[FAIL] Canvas e2e             40/41     —  1 failed
Overall: failed · 1287/1299
```

The 12 failures are **three defects**:

| Defect | Failing tests | Fix |
|---|---|---|
| Lockfile skew `1.1.3` vs `1.1.4` | `the lockfile describes the package.json beside it`, `canvas dependency overrides are actually applied` | `npm install --package-lock-only` in `.github/extensions/srs-navigator`; diff must touch only version fields |
| Release/version parity | the 9 tests in `release-hygiene`, `distribution-drift`, `docs-version-parity`, `release-trains`, `stranded-release-claim` | resolved by FR.01.2.1 and FR.03.1.1 |
| Stale committed dashboard | `[site] the dashboard names the same version as the site badge` | resolved by FR.02.1.1 |

## Acceptance Criteria

- [ ] `pwsh -File run-tests.ps1 -NoOpen` exits **0** from a clone made after the fix
- [ ] The run reports **0 failures** across all four non-LLM suites, with exact counts recorded
- [ ] `npm ls --prefix .github/extensions/srs-navigator` reports no unmet or invalid trees
- [ ] The lockfile diff that closes this contains **no dependency-graph change** — only version fields
- [ ] The two LLM suites report `SKIPPED — no provider key`, which is recorded as *unproven*, not as pass
- [ ] Each box above cites the command output that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# from a directory that has never built this repository
git clone https://github.com/RafaelGorski/Problem-Based-SRS.git verify-clean
cd verify-clean
pwsh -File run-tests.ps1 -NoOpen          # must exit 0
echo "exit=$LASTEXITCODE"
git status --porcelain                     # see FR.02.1.1 — must be empty
```

**Pass condition:** exit 0, zero failures, and the printed summary quoted verbatim in the
closing comment.

### App track — Playwright with screenshots

The e2e failure in this set is a site assertion, so it is witnessed in the browser:

```bash
cd .github/extensions/srs-navigator
npx playwright test --project=site --grep "dashboard names the same version"
```

| Screenshot | Proves |
|---|---|
| `test-results/w1-dashboard-version.png` | The rendered `.sub` line names the manifest version, not `v2.6.0 · v1.1.3` |

Capture inside the assertion itself so the image is written at the moment the expectation is
evaluated:
`await page.screenshot({ path: 'test-results/w1-dashboard-version.png' })`.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
