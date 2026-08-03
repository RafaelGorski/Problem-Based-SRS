# Problem-Based SRS — Skill Evals

A separate, self-contained harness that tests and evaluates the methodology
**skill** (the single consolidated skill at `skills/problem-based-srs/`: its
`SKILL.md` orchestrator plus `reference/<action>.md` files), driven by the
**GitHub Copilot CLI SDK** (`@github/copilot` in headless mode).

This is intentionally decoupled from the canvas app's own suite in
`.github/extensions/srs-navigator/tests/` (which tests UI/renderer code). This
folder tests the *skill content and the methodology behavior* instead.

## Two tiers

| Tier | Location | Model calls? | When it runs | How the docs guard treats it |
|------|----------|--------------|--------------|------------------------------|
| **Deterministic tests** | `tests/*.test.mjs` | No | Always (offline, CI-safe) | **Offline-executable** — verified by running the suite |
| **Live LLM evals** | `cases/*.case.mjs` + `run-evals.mjs` | Yes | Opt-in only | **Opt-in/live** — checked structurally only, never executed |

Every command in this file runs **from the repository root**. Offline-executable
commands are proven by the suite itself; opt-in/live commands need a key or an
authenticated `copilot` CLI, so `tests/evals-readme.test.mjs` checks that they name
real files and real flags rather than running them.

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
  - **canonical dotted ID notation** (`CP.01` → `CN.01.1` → `FR.01.1.1`) is declared
    and no file re-bans it or reverts a template to hyphen IDs, and
  - per-action methodology tokens are present, and the orchestrator lists all 8
    named actions and routes each to its `reference/<action>.md`.
- `tests/cases.test.mjs` — validates every live eval case **offline**: shape,
  unique names, the action it targets exists, its fixture exists, its prompt
  actually embeds both, and its rubric runs. Live cases are opt-in, so without
  this a broken case would sit unnoticed. Includes a canary asserting the
  brownfield rubric rejects a technical-debt answer.
- `tests/evals-readme.test.mjs` — **the docs drift guard.** Parses this README and
  fails when a documented command names a runner or path that does not exist,
  reintroduces the phantom `package.json` under `evals/`, passes a bare directory
  to `node --test`, or writes a live-eval command that is not repo-root relative.
- `tests/demo-spec-notation.test.mjs` — asserts the **shipped** demo specification
  (`.spec/crm-system.json` and the canvas's `lib/demo-spec.mjs`) is identical and
  uses only canonical dotted IDs, with zero legacy hyphen IDs and zero dangling
  references.
- `tests/distribution-surfaces.test.mjs` — asserts the Skills Health Dashboard is
  actually reachable (landing nav + footer, docs page nav, README badge) and that
  both distribution paths — the `skills.sh` listing and the SRS Navigator canvas
  extension — are documented on the README **and** the landing page. A published
  page that nothing links to is a claim nobody can check.
- `tests/archive-canvas-tool.test.mjs` — guards `tools/open-archive-canvas.mjs`, the tool
  that boots the canvas out of an **extracted release archive** so a browser can be
  pointed at the artefact a user downloads. Its most important assertion is a
  **refusal**: aimed at `.github/extensions/srs-navigator/` the tool would start fine and
  Playwright would go green, but the capture would be the repository checkout filed as
  published-archive evidence. It also pins the CLI contract (one loopback URL on stdout,
  nothing else) and that `playwright.config.mjs` skips its own canvas server when
  `CANVAS_URL` is set.
- `tests/release-hygiene.test.mjs` — ties `.claude-plugin/plugin.json`, the top
  `CHANGELOG.md` section, and every version a visitor is shown together, and keeps
  the plugin (`vX.Y`) and canvas (`vX.Y.Z`) release trains from being confused for
  one another.
- `tests/scheduled-llm-suite.test.mjs` — asserts the two opt-in model-calling
  suites keep independent switches with the prerequisite each actually has, that
  the live runner is invoked with `--force` (without it, it exits 0 having
  evaluated nothing), and that the scheduled workflow fails loudly when its
  provider secret is missing rather than reporting a green run that verified
  nothing.

Run them (**offline** — every command below runs from the **repository root** and
needs no key, no network, and no login):

```powershell
pwsh evals/scripts/run-tests.ps1                             # all deterministic tests
pwsh evals/scripts/run-tests.ps1 -File skills-static.test.mjs   # a single file
```

Or invoke `node --test` directly with an explicit file list (a bare directory
argument is **not** supported by `node --test`):

```bash
node --test evals/tests/*.test.mjs    # from the repo root
```

`tests/evals-readme.test.mjs` guards this file: it parses the commands documented
here and fails when one names a runner or path that does not exist, reintroduces
the phantom manifest under `evals/`, or passes a bare directory to `node --test`.

They also run in CI on every push/PR (`.github/workflows/ci.yml`).

### 2. Live LLM evals (opt-in)

Each `cases/*.case.mjs` builds a **hermetic prompt** that injects the skill's own
`SKILL.md` plus a fixture brief, runs it through the Copilot CLI, and grades the
result with a deterministic rubric and (optionally) an LLM judge.

Cases cover both directions of travel:

| Case | Direction | Fixture | Guards against |
|------|-----------|---------|----------------|
| `problems` | greenfield (brief → CPs) | `relaydesk-brief.md` | restating stakeholders' solution ideas as problems |
| `needs` | greenfield (CPs → CNs) | inline CP artifact | needs written as implementations |
| `functional-requirements` | greenfield (CNs → FRs) | inline CN artifact | untraceable or untestable requirements |
| `brownfield` | **reverse (existing system → CPs)** | `northwind-crm-brownfield.md` | restating technical debt ("PHP monolith", "migrate to microservices", "just buy Salesforce") as the customer problem |

The `brownfield` case matters because the ICP inherits undocumented systems rather
than starting from a brief; its fixture deliberately plants technical-debt bait in
the CTO quote and the code TODOs.

They are **opt-in** because they call the real model and may consume premium
requests. They require the `copilot` CLI to be installed and authenticated, so
they are checked *structurally* by the docs guard but never executed by it.

Run them (all paths are **repo-root relative**, like the offline commands above):

```bash
RUN_SKILL_EVALS=1 node evals/run-evals.mjs
node evals/run-evals.mjs --force                 # ignore the env gate
node evals/run-evals.mjs needs                   # a single case
node evals/run-evals.mjs --no-judge              # rubric only
node evals/run-evals.mjs --verbose               # show prompt, run metadata, artifact, every check
node evals/run-evals.mjs -vv                     # even more verbose (no truncation)
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

A repo-root `run-tests.ps1` runs every offline suite in sequence — plugin validation,
the canvas extension tests, the deterministic skill evals, and the Playwright visual
suite:

```powershell
pwsh run-tests.ps1
pwsh run-tests.ps1 -NoOpen                     # ...without opening the dashboard (CI / agents)
pwsh run-tests.ps1 -SkipCanvas -SkipValidate   # skill evals only
```

The two model-calling suites are **opt-in and separately flagged**, because they need
different credentials: `-IncludeSkillBehavior` needs a provider API key, while
`-IncludeLiveEvals` needs an authenticated `copilot` CLI.

```powershell
pwsh run-tests.ps1 -IncludeSkillBehavior   # + npm run test:skill-behavior (provider key)
pwsh run-tests.ps1 -IncludeLiveEvals       # + node evals/run-evals.mjs (copilot CLI)
```

`evals/scripts/run-evals.ps1` runs the live evals on their own.

## Driving the canvas from a published release archive

Every other proof of `/live` renders out of this repository. `tools/open-archive-canvas.mjs`
is the one that does not: give it a directory an **extracted release archive** unpacks to and
it installs a stub of the host SDK (nothing else — no `npm install`), loads `extension.mjs`
from that tree, opens the canvas, and prints the loopback URL. Nothing else goes to stdout,
so the URL composes straight into `CANVAS_URL`.

```bash
gh release download v1.1.1 -p 'srs-navigator-*.zip' -D /tmp/canvas-archive
unzip -q /tmp/canvas-archive/srs-navigator-1.1.1.zip -d /tmp/ext
node evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator
```

Then point the visual suite at that URL instead of the repo dev server — with `CANVAS_URL`
set, `playwright.config.mjs` starts no canvas server of its own, so the screenshots in
`test-results/` come from the published artefact:

```bash
CANVAS_URL=http://127.0.0.1:PORT/ npm --prefix .github/extensions/srs-navigator run test:e2e
```

```powershell
$env:CANVAS_URL = "http://127.0.0.1:PORT/"
npm --prefix .github/extensions/srs-navigator run test:e2e
```

It refuses a path under `.github/`. That is the whole point: `extension.mjs` treats such a
path as an in-repo project install and resolves the methodology from `skills/` rather than
from the archive, so a capture taken there proves the checkout renders — not the release.

| Flag | Effect |
|------|--------|
| `--spec <file>` | render a specification JSON instead of the archive's bundled demo |
| `--instance <id>` | canvas instance id (default `open-archive-canvas`) |
| `--landing` | keep the extension's first-run landing overlay (off by default, because it swallows the health-bar clicks `visual.test.mjs` makes) |

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
├── tools/
│   ├── open-archive-canvas.mjs  # boot the canvas from an extracted release archive
│   └── issue-ledger.mjs         # report checkbox-ledger drift in sequenced GitHub issues
├── cases/                   # live eval cases (opt-in)
│   ├── _shared.mjs
│   └── *.case.mjs
├── fixtures/                # input briefs for live evals
├── scripts/                 # run-tests.ps1, run-evals.ps1
├── run-evals.mjs            # live eval runner
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
