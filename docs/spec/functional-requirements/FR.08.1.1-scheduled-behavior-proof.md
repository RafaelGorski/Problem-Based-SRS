## FR.08.1.1: Scheduled Anti-Drift Behavior Proof

## Requirement

**ID:** FR.08.1.1
**Title:** Scheduled Anti-Drift Behavior Proof That Executes
**Workstream:** W6 — Behavior proof (independent; runnable in parallel from day 1)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall execute a non-zero count of LLM-backed behavior scenarios on its
published schedule, and shall report a skipped run as unproven rather than as success.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.08.1 | A behavior proof that actually executes |
| Customer Problem | CP.08 | Six consecutive scheduled runs executed zero scenarios |

## Issues addressed

**Parents:** #227, #274

## Why this ranks first on effort-adjusted value

`README.md:20-27` leads with AI-slop prevention tuned to the specific model. That is the
product's stated differentiator, and it is the **only** claim with no live evidence behind
it. Six consecutive scheduled `skill-behavior.yml` runs failed on absent provider
credentials; the latest is
[run 34836402372](https://github.com/RafaelGorski/Problem-Based-SRS/actions/runs/34836402372).
`run-tests.ps1` reports `Skill behavior (LLM) — SKIPPED`.

The fix is a repository secret and a dispatch. The daily evaluation scores it **RICE 5.0,
effort < 1 hour** — the highest ratio in the backlog. It is independent of every other
workstream and should start immediately, in parallel with W0.

A skipped suite and an absent suite are indistinguishable from outside. The guardrail this
suite protects is the mandatory Discovery Interview — the behavior that was silently skipped
in autopilot and that the whole drift-testing discipline exists to defend.

## Acceptance Criteria

- [ ] A provider secret is configured in repository Actions secrets
- [ ] `skill-behavior.yml` is dispatched and completes green
- [ ] The run summary reports a **non-zero executed-scenario count**, quoted in the closing comment
- [ ] At least one scenario exercises the Discovery Interview canary — the agent must be shown *not* skipping the interview
- [ ] A skipped run is surfaced as **unproven**, distinct from a passing run, on the Skills Health proof surface
- [ ] The green run is linked from the proof surface
- [ ] `node --test evals/tests/scheduled-llm-suite.test.mjs` passes
- [ ] Each box cites the run URL or command output that satisfied it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
gh workflow run skill-behavior.yml --repo RafaelGorski/Problem-Based-SRS
gh run watch "$(gh run list --workflow skill-behavior.yml --limit 1 \
                  --json databaseId --jq '.[0].databaseId')" --exit-status

# locally, with the key present — must run, not skip
pwsh -File run-tests.ps1 -NoOpen -IncludeSkillBehavior
node --test evals/tests/scheduled-llm-suite.test.mjs
```

**Pass condition:** the suite reports scenarios **executed**, not skipped. Watch by run **ID**
rather than bare `gh run watch`, so a concurrent run is not the one recorded as evidence.

### App track — Playwright with screenshots

| Screenshot | Proves |
|---|---|
| `test-results/w6-skills-health-behavior.png` | The proof surface shows the behavior suite as executed, with its scenario count |
| `test-results/w6-skipped-is-unproven.png` | A skipped run renders as *unproven*, visually distinct from a pass |

The second screenshot is the important one: it proves the surface cannot report a skip as
green, which is the condition that let six failed runs go unnoticed.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
