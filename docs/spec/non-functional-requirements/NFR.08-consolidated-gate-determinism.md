## NFR.08: Consolidated gate determinism

## Requirement

**ID:** NFR.08
**Title:** Consolidated gate determinism
**Category:** Reliability
**Priority:** Must Have
**Status:** Draft

### Statement

The consolidated test runner shall exit `0` on a clean checkout with no network access and no
provider credentials, and shall complete deterministically, so that "the suite is green" is a
usable closure condition rather than a statement about one machine on one day.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Applies To FRs | FR.01.3.12, FR.04.1.11, FR.04.1.12, FR.04.1.13, FR.06.1.7 | Every requirement whose closure cites a green suite |

## Problems found (2026-08-15)

The runner exits non-zero. `evals/tests/dependency-pins.test.mjs` fails because
`package-lock.json` root metadata reads `1.1.0` while `VERSION` and the extension `package.json`
read `1.1.3`. Four separate requirements in this batch name a green suite as a closure condition,
so a single deterministic failure makes all four unsatisfiable at once.

Provider-gated suites (skill-behavior, live evals) correctly **skip** without credentials rather
than passing silently — that behaviour is required and must not be "fixed" into a pass.

## Measurement Criteria

- **Target:** exit code `0` from the consolidated runner on a clean checkout, offline, with no
  provider keys present.
- **Minimum Acceptable:** every failure is reproducible by a named single-file command, so a red
  run always yields a smallest repro.
- **Measurement Method:** run the consolidated runner and record the exit code, total counts, and
  the skipped-suite list; re-run to confirm the same result.

## Acceptance Criteria

- [ ] The consolidated runner exits `0` with zero failures.
- [ ] Provider-gated suites report **skipped**, never passed, when credentials are absent.
- [ ] Deterministic suites require no network access and no token.
- [ ] Any failure is reproducible with a single-file test command named in the output.
- [ ] Two consecutive runs on an unchanged tree produce the same pass/fail result.
- [ ] Generated artifacts written during a run are restored, leaving the worktree clean.

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
