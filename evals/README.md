# Problem-Based SRS — Skill Evals

A separate, self-contained harness that tests and evaluates the methodology
**skill** (the single consolidated skill at `skills/problem-based-srs/`: its
`SKILL.md` orchestrator plus `reference/<action>.md` files), driven by the
**GitHub Copilot CLI SDK** (`@github/copilot` in headless mode).

This is intentionally decoupled from the canvas app's own suite in
`.github/extensions/srs-navigator/tests/` (which tests UI/renderer code). This
folder tests the *skill content and the methodology behavior* instead.

## Two tiers

| Tier | Location | Model calls? | When it runs |
|------|----------|--------------|--------------|
| **Deterministic tests** | `tests/*.test.mjs` | No | Always (offline, CI-safe) |
| **Live LLM evals** | `cases/*.case.mjs` + `run-evals.mjs` | Yes | Opt-in only |

### 1. Deterministic tests (offline)

Pure `node --test` files with no external dependencies:

- `tests/copilot-sdk.test.mjs` — the headless Copilot CLI wrapper (JSONL parsing,
  arg building, timeout handling) using a fake spawn.
- `tests/lib.test.mjs` — the SKILL.md loader/parser and the rubric graders.
- `tests/skills-static.test.mjs` — **the flagship regression guard.** Asserts, over
  the consolidated `skills/problem-based-srs/` skill (`SKILL.md` + `reference/<action>.md`):
  - exactly one skill directory, with `name` frontmatter `problem-based-srs`,
  - one reference file per action (filename == action), each with no frontmatter,
  - a description contract and a body line cap,
  - **no legacy slash-commands** (`/customer-problems`, `/customer-needs`, …) and
    no `Use skill:` handoffs — i.e. the unified `/problem-based-srs <action>`
    refactor did not regress,
  - all relative links resolve on disk,
  - per-action methodology tokens are present, and the orchestrator lists all 8
    named actions and routes each to its `reference/<action>.md`.

Run them:

```bash
npm test                 # from evals/
# or
node --test tests/
```

PowerShell helper:

```powershell
pwsh evals/scripts/run-tests.ps1
pwsh evals/scripts/run-tests.ps1 -File skills-static.test.mjs
```

### 2. Live LLM evals (opt-in)

Each `cases/*.case.mjs` builds a **hermetic prompt** that injects the skill's own
`SKILL.md` plus a fixture brief, runs it through the Copilot CLI, and grades the
result with a deterministic rubric and (optionally) an LLM judge.

They are **opt-in** because they call the real model and may consume premium
requests. They require the `copilot` CLI to be installed and authenticated.

Run them:

```bash
RUN_SKILL_EVALS=1 node run-evals.mjs
node run-evals.mjs --force                 # ignore the env gate
node run-evals.mjs needs                   # a single case
node run-evals.mjs --no-judge              # rubric only
node run-evals.mjs --verbose               # show prompt, run metadata, artifact, every check
node run-evals.mjs -vv                      # even more verbose (no truncation)
```

PowerShell helper:

```powershell
pwsh evals/scripts/run-evals.ps1
pwsh evals/scripts/run-evals.ps1 -Case needs
pwsh evals/scripts/run-evals.ps1 -NoJudge -Model gpt-5.4
pwsh evals/scripts/run-evals.ps1 -Case problems -Detailed   # verbose troubleshooting
pwsh evals/scripts/run-evals.ps1 -Trace                              # full prompt + full artifact
```

When `-Detailed`/`--verbose` is set the runner prints, per case: the built prompt,
the CLI exit code / duration / token usage / loaded skills / tool calls / stderr, the
full model artifact, and **every** rubric check (passing and failing) — so a failing
eval can be diagnosed without re-running.

## Running everything

A repo-root `run-tests.ps1` runs all offline suites in sequence — plugin validation,
the canvas extension tests, and the deterministic skill evals:

```powershell
pwsh run-tests.ps1
pwsh run-tests.ps1 -SkipCanvas -SkipValidate   # skill evals only
```

Live LLM evals are **not** part of `run-tests.ps1` (they call the model); run them
explicitly with `evals/scripts/run-evals.ps1`.

## The "SDK"

`lib/copilot-sdk.mjs` wraps the `@github/copilot` CLI in headless mode:

```
copilot -p "<prompt>" --allow-all-tools --output-format json
```

It parses the JSONL event stream (`session.skills_loaded`, `assistant.message`,
`result`, …) into a structured `{ text, events, skills, toolCalls, result }`
object. Every process-boundary function accepts an injectable `spawnImpl` /
`execFileImpl` so the deterministic tests never touch a real process.

## Layout

```
evals/
├── lib/
│   ├── copilot-sdk.mjs      # headless Copilot CLI wrapper + JSONL parsers
│   ├── skills.mjs           # SKILL.md loader/parser
│   └── graders.mjs          # rubric grading + LLM judge
├── tests/                   # deterministic node --test files (offline)
├── cases/                   # live eval cases (opt-in)
│   ├── _shared.mjs
│   └── *.case.mjs
├── fixtures/                # input briefs for live evals
├── scripts/                 # run-tests.ps1, run-evals.ps1
├── run-evals.mjs            # live eval runner
├── package.json
└── README.md
```

## Adding a new eval case

Create `cases/<name>.case.mjs` with a default export:

```js
export default {
  name: "my-action",
  skill: "my-action",           // skills/problem-based-srs/reference/<action>.md
  threshold: 0.7,
  async buildPrompt(skillText) { /* return the prompt string */ },
  rubric: [ /* graders.check(...) entries */ ],
  judgeCriteria: [ "…qualitative criterion…" ],
};
```

The runner discovers it automatically.
