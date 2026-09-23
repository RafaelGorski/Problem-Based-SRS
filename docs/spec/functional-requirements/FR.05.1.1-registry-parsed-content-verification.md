## FR.05.1.1: Registry Refresh Verified by Parsed Content

## Requirement

**ID:** FR.05.1.1
**Title:** Registry Refresh Verified by Parsed Content
**Workstream:** W4 — Registry (depends on W1; parallel with W3)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall verify the skills.sh refresh by comparing a stored parsed before-state
against a parsed after-state, and shall not accept a clean exit code or matching entry names
as proof that current content was republished.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.05.1 | Registry verification by parsed content |
| Customer Problem | CP.05 | The listing advertises eight skills the repository no longer ships |

## Issues addressed

**Parents:** #140, #147, #212, #220, #222 · **Subsumes:** #173, #175, #184, #187, #190,
#195, #240–#250

## Why names are the cheap half

The project's own monitor distinguishes two findings, and clearing the first does not clear
the second:

- `registry-listing-drift` — the listing advertises skills the repository no longer ships.
  **Currently 8 phantom entries.**
- `registry-skill-stale` — the page for a skill that *is* shipped publishes an **older copy**
  of it. Captured 2026-07-31, the page was missing **Identifier Notation (CANONICAL)** and
  still taught `FR-001`, the hyphen notation the methodology replaced.

A re-crawl that fixes the entry names while republishing stale content clears the first
finding and leaves the second. Only the second tells you the re-crawl actually worked.

Three warning states must be handled explicitly rather than read as success:
`registry-listing-unreadable`, `registry-skill-unreadable`, `registry-listing-partial`.
A page this checker can no longer parse and a page serving something else are
indistinguishable from here, so neither may be recorded as a clean result.

## Acceptance Criteria

- [ ] A parsed **before-state** is captured and committed as structured JSON **before** any re-crawl is requested
- [ ] The re-crawl request itself is recorded as auditable evidence (timestamp, submission target)
- [ ] A parsed **after-state** is captured after the declared elapsed window
- [ ] The before/after diff shows the entry names changed **and** the rendered skill content changed
- [ ] Canonical dotted identifiers (`FR.01.1.1`) appear in the after-state; legacy `FR-001` does not
- [ ] `node scripts/check-distribution.mjs --strict` reports no `registry-listing-drift` and no `registry-skill-stale`
- [ ] Any `*-unreadable` or `*-partial` warning is recorded as **unverified**, never as pass
- [ ] Each box cites the command output or stored artefact that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
# 1. BEFORE — capture and commit, prior to submitting the re-crawl
node scripts/check-distribution.mjs --json > registry-before.json
node --test evals/tests/registry-listing-content.test.mjs

# 2. request the re-crawl at https://www.skills.sh — record timestamp + target

# 3. AFTER — capture once the declared window has elapsed
node scripts/check-distribution.mjs --json > registry-after.json
node scripts/check-distribution.mjs --strict          # must exit 0

# 4. the diff is the evidence, not the exit code
node -e "const b=require('./registry-before.json'),a=require('./registry-after.json');console.log(JSON.stringify({before:b.findings?.length,after:a.findings?.length},null,2))"
```

**Pass condition:** `--strict` exits 0 with neither registry finding present, **and** the
parsed diff demonstrates the skill page content changed — not merely the entry names.

### App track — Playwright with screenshots

| Screenshot | Proves |
|---|---|
| `test-results/w4-registry-before.png` | The listing as it stood before the request, with the phantom entries visible |
| `test-results/w4-registry-after.png` | The listing after the re-crawl, showing one canonical skill |
| `test-results/w4-skill-page-notation.png` | The rendered skill page carries canonical dotted identifiers, not `FR-001` |

These capture a **third-party surface** that no pull request can change, so the screenshots
are the durable record of a state this repository cannot itself reproduce later.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
