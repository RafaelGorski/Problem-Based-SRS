## FR.04.1.14: Release-Claim Marker Uniqueness

## Requirement

**ID:** FR.04.1.14
**Title:** Resolve duplicate release-claim markers so the closure gate can return a verdict
**Priority:** Must Have
**Status:** Draft

### Statement

Every release-claiming issue shall carry **exactly one** `release-claim` marker, so that
the closure-evidence guard returns a decidable verdict rather than
`release-claim-indeterminate`, and no issue shall remain permanently unclosable by the
guard it introduced.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.04.1 | Release records match what shipped |
| Customer Problem | CP.04 | Shipped work is not reflected in the release record |
| Issue | #139 | The issue carrying the duplicate markers |

## Problems found (2026-08-16)

1. **#139 carries two markers.** Extracted from the live issue body today:

   ```
   <!-- release-claim train=plugin version=v2.6 -->
   <!-- release-claim train=canvas version=v1.1.1 -->
   ```

2. **The guard therefore cannot clear it.**
   `node evals/tools/closure-evidence.mjs --prospective 138 139` exits **1** with exactly
   one finding: `#139 release-claim-indeterminate: duplicate release-claim markers`.
3. **This is self-inflicted by design.** #139's own contract states that *"a missing,
   duplicate, malformed, or ambiguous marker is an indeterminate result and cannot produce
   a clean closure verdict."* The issue that specified the gate is the one issue the gate
   can never pass — and it will not clear no matter what ships.
4. **It blocks the batch.** #149 requires a clean prospective verdict for every
   release-claiming issue, so #139's indeterminate state blocks the batch close-out.

## Acceptance Criteria

- [ ] #139 carries **exactly one** `release-claim` marker after the fix, and the removed
      marker's content is recorded on the issue so the edit is auditable.
- [ ] `node evals/tools/closure-evidence.mjs --prospective 139` no longer reports
      `release-claim-indeterminate`.
- [ ] Every other open issue is checked for duplicate markers; the count found is stated
      explicitly, including when it is zero.
- [ ] A regression guard asserts that duplicate markers produce a non-zero,
      clearly-attributed verdict, so the condition cannot be reintroduced silently.
- [ ] The fix is applied by human judgement on the issue body; the tool performs **no**
      GitHub mutation.

## Verification

### Skills track — CLI

```bash
gh issue view 139 --json body --jq '.body' | Select-String 'release-claim'   # expect 1 line
node evals/tools/closure-evidence.mjs --prospective 139 --json closure-139.json
node --test evals/tests/closure-evidence.test.mjs
```

### App track — Playwright: explicitly out of scope

This requirement is about issue metadata. No browser view can witness a marker in an issue
body; a canvas screenshot attached here would be evidence for a different claim.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-08-16*
