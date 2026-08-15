## FR.01.3.12: Canvas release metadata parity (lockfile included)

## Requirement

**ID:** FR.01.3.12
**Title:** Canvas release metadata parity (lockfile included)
**Priority:** Must Have
**Status:** Draft
**Parent issue:** [#146](https://github.com/RafaelGorski/Problem-Based-SRS/issues/146)
**Sequence position:** Phase 0 — root blocker for the whole batch

### Statement

The canvas release system shall stamp **every** version-bearing file it owns — `VERSION`, the
extension `package.json`, and the root metadata of `package-lock.json` — with the same version in
a single bump, and shall fail the release before publishing when any of them disagree.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The canvas train must publish the version the repository advertises |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Non-functional | NFR.08 | The consolidated gate must be deterministic and green at closure |

## Problems found (2026-08-15)

1. **The consolidated gate is red, and has been for at least two days.**
   `node --test evals/tests/dependency-pins.test.mjs` fails with `'1.1.0' !== '1.1.3'` —
   `package-lock.json` root metadata still says `1.1.0` while `VERSION` and the extension
   `package.json` both say `1.1.3`.

2. **The bump script does not own the file that drifted.** The release workflow advances
   `VERSION` and `package.json`; the lockfile is left behind, so the drift is reintroduced by
   every release rather than being a one-off.

3. **Three canvas releases were published from this state.** `v1.1.1`, `v1.1.2` and `v1.1.3` were
   all cut while the lockfile named a version none of them carry. The defect is already in
   published artifacts, not merely on `main`.

4. **This blocks the batch, not just this issue.** Several sibling issues require the suite to be
   green at the moment of closure. While this test fails, that criterion is unsatisfiable, so no
   issue in the batch can legitimately close.

5. **The defect self-heals locally, which is why it survived.** Observed directly while verifying
   this plan: running the extension's `npm` tooling in a working copy rewrote the lockfile's two
   root version fields from `1.1.0` to `1.1.3` — and nothing else; the diff is exactly two lines
   and the dependency graph is untouched. After that, `dependency-pins.test.mjs` **passes locally**.
   The committed blob still reads `1.1.0`, confirmed with
   `git show HEAD:.github/extensions/srs-navigator/package-lock.json`, and reverting the working
   copy reproduces the failure immediately.

   This matters for how the fix is verified, not only for how it is made. `ci.yml` runs `npm test`
   with **no install step** — deliberately, because the deterministic suites import only
   `node:test` and `node:assert` — so CI never performs the rewrite and keeps failing, while a
   maintainer who has run `npm` even once sees green. A local pass is therefore **not** evidence
   that the fix landed; it may only be evidence that npm silently repaired the symptom in an
   uncommitted file.

## Acceptance Criteria

### The bump stamps every file it owns

- [ ] A single bump updates `VERSION`, the extension `package.json`, and **both** root version
      fields of `package-lock.json` to the same value.
- [ ] The lockfile's dependency graph is otherwise unchanged by the bump — only root metadata is
      rewritten, verified by inspecting the diff.

### The invariant cannot regress

- [ ] `node --test evals/tests/dependency-pins.test.mjs` passes.
- [ ] A release regression test asserts the three files agree **after** a simulated bump, not only
      in the current tree.
- [ ] Negative test: the assertion is temporarily mutated so the versions disagree, the test is
      shown to **fail**, and the mutation is reverted. A test that never fails guards nothing.

### The fix is verified against committed state, not a repaired working copy

- [ ] The passing run is demonstrated from a **pristine checkout** — a clean clone, or after
      `git checkout -- .github/extensions/srs-navigator/package-lock.json` — so a local `npm`
      rewrite cannot be mistaken for the fix.
- [ ] `git status --porcelain` is clean at the moment the passing run is captured; a modified
      lockfile in the working copy invalidates the evidence.
- [ ] The committed blob is asserted directly, e.g. via
      `git show HEAD:.github/extensions/srs-navigator/package-lock.json`, so the check reads what
      CI will read rather than what npm last wrote.

### The published surface is reconciled

- [ ] The consolidated runner exits `0`.
- [ ] `node scripts/check-distribution.mjs --strict` reports no `canvas-asset-drift` and no
      `canvas-asset-mismatch`.
- [ ] It is recorded explicitly whether the already-published `v1.1.1`–`v1.1.3` assets are to be
      re-cut or accepted as historical, so the decision is not left implicit.

## Verification

### Skills track — CLI

```
git checkout -- .github/extensions/srs-navigator/package-lock.json   # discard any npm rewrite
git status --porcelain                                               # must be empty
node --test evals/tests/dependency-pins.test.mjs
pwsh -File run-tests.ps1 -NoOpen
node scripts/check-distribution.mjs --strict
```

The three version-bearing files are read directly and compared: `VERSION`, the extension
`package.json` `version`, and both `package-lock.json` root version fields.

**Order matters here.** The revert and the clean `git status` must come *first* and be part of the
captured transcript. Running the test after any local `npm` invocation can pass for the wrong
reason — npm rewrites the lockfile's root version in place, so the assertion then compares a
repaired working copy against itself rather than checking what was committed. Capture the committed
value alongside the run:

```
git show HEAD:.github/extensions/srs-navigator/package-lock.json
```

### App track — Playwright with screenshots

Not the primary evidence for this requirement — the defect lives in release metadata, which no
browser view can witness. The canvas visual project is run only to prove the fix causes **no**
visual regression:

```
cd .github/extensions/srs-navigator && npx playwright test --project=canvas
```

Attach the run summary. A screenshot is **not** accepted as proof of version parity here;
claiming otherwise would file evidence for a different claim.

## Depends on

Nothing. This is the first item in the sequence and is startable immediately.

## Blocks

Everything carrying a "suite is green at closure" criterion — directly
[#138](https://github.com/RafaelGorski/Problem-Based-SRS/issues/138),
[#142](https://github.com/RafaelGorski/Problem-Based-SRS/issues/142) and
[#149](https://github.com/RafaelGorski/Problem-Based-SRS/issues/149).

---
*Created: 2026-08-15*
*Last Updated: 2026-08-15*
