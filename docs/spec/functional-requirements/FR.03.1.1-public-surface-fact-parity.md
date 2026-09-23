## FR.03.1.1: Public Surface Fact Parity

## Requirement

**ID:** FR.03.1.1
**Title:** Public Surface Fact Parity
**Workstream:** W1 — Green baseline
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall state the same version, skill count, node count, and release link on
every public surface, and each value shall equal the figure its authoritative source reports.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.03.1 | Public surfaces that agree with each other and the manifest |
| Customer Problem | CP.03 | Surfaces advertise superseded and contradictory facts |

## Issues addressed

**Parent:** #218 · **Also:** #227 CP-D, #225 (announcement gate consumes this)

## Contradictions to remove (measured 2026-09-23)

| Claim | Surface A | Surface B | Authority |
|---|---|---|---|
| Version | `README.md:3` → **2.6.0** | manifest → **2.7.0** | `.claude-plugin/plugin.json` |
| Version | `docs/docs.html:13-22` → **2.6.0** | published release → **v2.7** | GitHub Releases |
| Skill count | `README.md` → **"Ten AgentSkills"** | repository ships **one** | `build-plugin.py validate` → `success: 1 skills validated` |
| Node count | `docs/index.html:103-168` → **28** | `docs/index.html:330` → **29** | `.spec/crm-system.json` → **29** |

The skill-count claim is the oldest: the nine-to-one consolidation landed in **#50** and the
prose never followed. It is not a version-bump casualty and will not be fixed by one.

## Acceptance Criteria

- [ ] Every version token in `README.md` and `docs/*.html` equals the manifest version
- [ ] The README states a skill count equal to the count `build-plugin.py validate` reports
- [ ] The node count agrees across every surface that states it, and equals the count in `.spec/crm-system.json`
- [ ] `node --test evals/tests/docs-version-parity.test.mjs` passes, including `FR.06.1.6`
- [ ] A test fails if any surface drifts from the manifest again
- [ ] Each box cites the command output that satisfied it

## Verification

### Skills track — CLI

```bash
python scripts/build-plugin.py validate                    # read the skill count it prints
node --test evals/tests/docs-version-parity.test.mjs \
             evals/tests/release-hygiene.test.mjs
node -e "const s=require('./.spec/crm-system.json');console.log('nodes',s.nodes?.length)"
```

**Pass condition:** the skill count the README states equals the count `validate` prints; the
two eval files pass; the node count matches the demo specification.

### App track — Playwright with screenshots *(this requirement's primary gate)*

```bash
cd .github/extensions/srs-navigator
npx playwright test --project=site
```

| Screenshot | Proves |
|---|---|
| `test-results/w1-site-version-badge.png` | The rendered badge shows the manifest version, not the superseded one |
| `test-results/w1-site-skill-count.png` | The rendered skill count matches `build-plugin.py validate` |
| `test-results/w1-site-node-count.png` | Both node-count statements on the landing page show the same figure |
| `test-results/w1-docs-version.png` | `docs/docs.html` advertises the published version |

Capture each inside the corresponding assertion so the image is written at the moment the
expectation is evaluated, rather than from a separate later navigation.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
