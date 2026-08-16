## FR.06.1.7: Adoption Observation Outcome

## Requirement

**ID:** FR.06.1.7
**Title:** Run the declared observation window from published bytes and file the outcome
**Priority:** Could Have
**Status:** Draft

### Statement

The maintainer shall run the adoption observation window against a **published** artifact
and a **refreshed** discovery surface, using a contract whose fields were completed and
validated before the window opened, and shall file the outcome — including a null result —
as the recorded answer rather than leaving the experiment silently unresolved.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.06.1 | The methodology must be shown to help someone outside this repository |
| Customer Problem | CP.06 | The backlog is entirely self-generated; no external signal exists |
| Issue | #178 | The sub-issue that owns the observation window |

## Problems found (2026-08-16)

1. **The window cannot honestly start.** Its two hard predecessors are unmet: the
   discovery surface still advertises **8 skills that do not exist**
   (`check-distribution.mjs --strict` → exit 1), and the `/live` proof has never been
   produced from published bytes.
2. **The contract is still placeholder.** Running the experiment now would spend the
   project's only first external impression on a stale discovery page.
3. **The outcome has no home.** Without a predeclared success threshold, any result can be
   narrated after the fact as either a success or an inconclusive run.
4. **All 13 of #178's acceptance boxes are open** with no named blocker.

## Acceptance Criteria

- [ ] The contract is complete and validated **before** the window opens — no field is
      left as a placeholder, and the validator reports it complete.
- [ ] The success threshold and the window length are declared **in advance** and are
      recorded on the issue before the first observation.
- [ ] The window opens only after both predecessors are satisfied: the registry listing is
      clean, and the `/live` capture is archive-derived with `provenance.json`.
- [ ] The demo asset used in the experiment is derived from the **published archive**, not
      from a checkout.
- [ ] The window's declared length has actually elapsed before the outcome is filed.
- [ ] The outcome is filed against the predeclared threshold, and a **null result is
      recorded as the answer** — not as a reason to extend the window.
- [ ] If the window cannot be opened, each open box names the specific blocker.

## Verification

### Skills track — CLI

```bash
node evals/tools/adoption-experiment.mjs --validate        # contract completeness
node scripts/check-distribution.mjs --strict; echo "exit=$?"   # predecessor 1
node evals/tools/issue-ledger.mjs 142 148 165 178 --json ledger-adoption.json
```

### App track — Playwright with screenshots

The demo the external visitor is asked to run must be shown to render from the published
archive, and the landing page they arrive at must be captured:

```bash
cd .github/extensions/srs-navigator
CANVAS_URL="<archive-booted url>" npx playwright test --project=canvas
npx playwright test --project=site
```

Attach the archive-derived capture with its `provenance.json`. A checkout-rendered PNG
does not demonstrate what an external adopter would actually receive.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
