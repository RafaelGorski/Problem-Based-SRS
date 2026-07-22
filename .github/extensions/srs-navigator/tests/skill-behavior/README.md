# Skill-behavior tests

LLM-backed scenarios that verify how the **Problem-Based SRS** skill drives the
mandatory **Discovery Interview** and reference-file loading. Each scenario runs
against one current model from each supported provider (Anthropic, OpenAI,
Google, and optionally DeepSeek).

These are the tests you re-run when you refactor the **Discovery Interview** or
**Skip Conditions** sections of `skills/problem-based-srs/` (`SKILL.md` and
`reference/<action>.md`). They fail when the agent stops running the interview —
the exact drift where an agent skipped the customer interview in autopilot mode
after inferring context from a README.

Modeled on [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable/tree/main/tests/skill-behavior):
the **trace of tool calls is the source of truth**, not the model's prose reply.

## Run

```bash
npm run test:skill-behavior
SRS_SKILL_BEHAVIOR_VERBOSE=1 npm run test:skill-behavior            # dump per-scenario traces
SRS_SKILL_BEHAVIOR_MODELS=claude-3-5-haiku-latest npm run test:skill-behavior   # scope to one model
```

Provide API keys via environment variables or a `.env` at the repo root (or the
extension root). Providers without a key are **skipped, not failed**, so this
suite is safe in CI without secrets:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` (or `GOOGLE_CLOUD_API_KEY`)
- `DEEPSEEK_API_KEY` (only if you add a `deepseek-*` model)

This suite is intentionally **excluded from the default `npm test`** because it
needs network + keys. `npm test` keeps the deterministic guards
(`tests/interview-guard.test.mjs`) that also catch interview drift statically.

## How it works

Each scenario:

1. `prepareWorkspace()` mints a temp dir, copies the canonical skill's
   `SKILL.md` + `reference/*.md` into `<workspace>/reference/`, and seeds
   fixture files (a "clear-looking" README, a confirmed
   `.spec/00-business-context.md`, prior CP/CN artifacts, etc.).
2. `runTurn()` inlines `SKILL.md` as the system prompt and runs the Vercel AI
   SDK `generateText` with five workspace-scoped tools: `read`, `write`,
   `list`, `run_command`, and a provider-neutral `ask_user` backed by a
   deterministic simulated user.
3. Every tool call is recorded into a `trace` the test asserts on — which
   reference file loaded, whether `ask_user` was called, and whether it came
   **before** the artifact write.

## Scenarios (`scenarios.test.mjs`)

| # | Setup | Assertion |
|---|---|---|
| 1 | README only + `Vagrantfile`; prompt says **autopilot** + `/problem-based-srs problems` | loads `reference/problems.md`; **calls `ask_user` before** writing the CP artifact — a README is not a valid skip basis |
| 2 | README only; bare `/problem-based-srs problems` | loads `problems.md`; runs the interview |
| 3 | README only; `/problem-based-srs business-context` | loads `business-context.md`; asks before writing `00-business-context.md` |
| 4 | **confirmed** `.spec/00-business-context.md` + explicit problems/severity in prompt | **skip path is legitimate** — does not require `ask_user`, but must still load `problems.md` and write the CP artifact |
| 5 | prior CP + Software Glance; autopilot `/problem-based-srs needs` | loads `needs.md`; asks before writing customer needs |
| 6 | prior CP + CN; autopilot `/problem-based-srs functional-requirements` | loads `functional-requirements.md`; asks before writing FRs |

## Workflow contract (`workflow-contract.test.mjs`)

Adds stricter end-to-end assertions on the `problems` step: the interview index
precedes the artifact write, the artifact lands under `.spec/`, and it uses
`CP-<n>` notation (dash, never dotted `CP.<n>`).

## Interpreting failures

A regression is **"more failures than your baseline"**, not "any failure at
all" — small models occasionally flake (skip a load, or answer in prose instead
of calling `ask_user`). Record a baseline for your chosen lineup here when you
first run it, and compare pre/post refactor. Scenario 1 is the canary: if it
fails, the interview guardrail has weakened.
