# GitHub Copilot Instructions for Problem-Based SRS

## Project Overview
This repository provides AgentSkills for following a Problem-Based Software Requirements Specification (SRS) methodology. The focus is on enabling AI-assisted requirements engineering through structured, problem-first approaches.

The repository follows the **[AgentSkills](https://agentskills.io)** standard and the **Claude Code Plugins** layout. Compatibility priority is **GitHub Copilot first**, then **Claude Code/Claude.ai**.

### Plugin Standards

**This repository follows the Claude Code plugins specification:**
- **Plugins Guide**: https://code.claude.com/docs/en/plugins.md
- **Plugins Reference**: https://code.claude.com/docs/en/plugins-reference.md

When modifying this repository structure, ensure compliance with these plugin standards.

### Compatibility Priority (GHCP → Claude)

1. **GitHub Copilot first**: Keep skills and instructions directly usable in Copilot workflows.
2. **Claude second**: Keep `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `skills/`, `agents/`, `hooks/`, and `settings.json` aligned with Claude plugin docs.
3. **Consistency over time**: Keep compatibility guidance consistent when it changes.

## Core Principles
1. **Problem-First Thinking**: Always identify the problem before proposing solutions
2. **Lightweight Methodology**: Favor simplicity over complex frameworks
3. **AI-Native Design**: Content designed for consumption by AI agents (following AgentSkills standard)
4. **Practical Guidance**: Focus on actionable skills and templates

---

## 🔄 Problem-Based SRS Iteration Guidelines

### Using the Methodology

When analyzing or working with this repository, **use the Problem-Based SRS methodology** to iterate on problems, needs, and requirements (both functional and non-functional).

**Load and follow the methodology from these skills:**

| Step | Action file |
|------|-------------|
| 0. Business Context (CONTEXT) | `skills/problem-based-srs/reference/business-context.md` |
| 1. Customer Problems (WHY) | `skills/problem-based-srs/reference/problems.md` |
| 2. Software Glance | `skills/problem-based-srs/reference/software-glance.md` |
| 3. Customer Needs (WHAT) | `skills/problem-based-srs/reference/needs.md` |
| 4. Software Vision | `skills/problem-based-srs/reference/software-vision.md` |
| 5. Functional Requirements (HOW) | `skills/problem-based-srs/reference/functional-requirements.md` |
| Validation | `skills/problem-based-srs/reference/validate.md` |
| Complexity (Optional) | `skills/problem-based-srs/reference/complexity.md` |
| Live canvas | `skills/problem-based-srs/reference/live.md` |
| Orchestrator | `skills/problem-based-srs/SKILL.md` |
| Agent | `agents/problem-based-srs/AGENT.md` |

### Artifact Storage

All Problem-Based SRS artifacts are saved to the `.spec/` folder at the project root by default. This hidden folder keeps specification artifacts separate from source code and documentation.

```
.spec/
├── 00-business-context.md
├── 01-customer-problems.md
├── 02-software-glance.md
├── 03-customer-needs.md
├── 04-software-vision.md
├── functional-requirements/
│   ├── _index.md
│   └── FR.01.1.1-[short-name].md
└── non-functional-requirements/
    ├── _index.md
    └── NFR.01-[short-name].md
```

When adding or changing features/requirements in the solution, reference the `.spec/` folder for existing artifacts and save new artifacts there. If a legacy folder is detected (`docs/srs/`, `requirements/`), continue using it for consistency.

### Artifact Naming Convention

- **Customer Problems**: `CP.{n}` or `CP.{n}.{m}` (e.g., CP.01, CP.01.1)
- **Customer Needs**: `CN.{cp}.{n}` (e.g., CN.01.1 traces to CP.01)
- **Functional Requirements**: `FR.{cp}.{cn}.{n}` (e.g., FR.01.1.1 traces to CN.01.1)
- **Non-Functional Requirements**: `NFR.{n}` (e.g., NFR.01)

IDs are **dotted** so the ID itself carries the traceability chain. Requirement filenames
embed the ID plus a short name: `FR.01.1.1-client-registration.md`, `NFR.01-response-time.md`.
Hyphen IDs (`CP-001`, `FR-002-name.md`) are accepted-legacy — the parsers still read them,
but new artifacts must not use them. The canonical definition lives in the "Identifier
Notation" section of `skills/problem-based-srs/SKILL.md`, is enforced by
`evals/tests/skills-static.test.mjs`, and is implemented in
`.github/extensions/srs-navigator/lib/notation.mjs`.

---

## 🚀 Trunk-Based Development Workflow

This repository follows **trunk-based development**. All changes go directly to `main`.

### Git Workflow for Iterations

When creating or updating requirement artifacts:

```bash
git add .                                    # Stage all changes
git commit -m "<type>: <description>"        # Commit with message
git push origin main                         # Push to trunk
```

### Commit Message Convention

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feat:` | New feature or requirement | `feat: Add CP.02 for mobile access` |
| `fix:` | Bug fix or correction | `fix: Correct FR.01.2.1 traceability` |
| `docs:` | Documentation updates | `docs: Update README with new workflow` |
| `refactor:` | Restructuring without changing behavior | `refactor: Reorganize skills` |

**Always confirm with the user before pushing to main.**

---

## Workflow Guidelines

### Before Taking Action
**CRITICAL: Always plan and get confirmation before executing tasks.**

1. **Understand the Request**: Clarify what the user wants to accomplish
2. **Identify the Target Module**: Changes may land in one of two places — the **Canvas App**
   (the SRS Navigator canvas extension in `.github/extensions/srs-navigator/`) or the
   **GitHub Page** (the project webpage in `docs/`, published via GitHub Pages). Prompt the
   user to state which module they want to change. If it is not clear from the request, ask.
   If the user gives no clear reply, apply the change to **both** modules.
3. **Create a Plan**: Present a clear plan of what will be changed/created/deleted
4. **Ask for Confirmation**: Wait for user approval before executing
5. **Execute**: Only after confirmation, proceed with the changes
6. **Guard Against Drift with Tests**: Any change to skill/methodology behavior, the
   canvas app, or the sync mechanism **must** be covered by an automated test that would
   fail if the behavior regressed (see [Behavior Drift Testing](#-behavior-drift-testing)).
   Add or update tests in the same change — never ship behavior changes test-free.
7. **Verify**: Run the relevant test suite (`npm test` at minimum), show what was done,
   and confirm completion

**Example iteration workflow:**
```
User: "Analyze the codebase and identify testing requirements"

AI: "I'll analyze using Problem-Based SRS methodology.
     Loading: skills/problem-based-srs/SKILL.md
     
     [Applies 5-step process from source files]
     
     Plan:
     1. Save analysis to .spec/NFR.2.0.md
     2. git add, commit, push to main
     
     Proceed? (yes/no)"
```

---

## When Working on This Repository

### Plugin Structure (Claude Code Standard)

This repository is structured as a Claude Code plugin:

```
Problem-Based-SRS/
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest (name, version, metadata)
│   └── marketplace.json         # Catalog `/plugin marketplace add` reads (source: "./")
├── agents/
│   └── problem-based-srs/       # Agent orchestrator
│       └── AGENT.md
├── skills/
│   └── problem-based-srs/       # The single methodology skill
│       ├── SKILL.md             # Orchestrator: /problem-based-srs <action>
│       └── reference/           # One file per action (filename == action)
│           ├── business-context.md        # Step 0: Business context and principles
│           ├── problems.md                 # Step 1: WHY (customer problems)
│           ├── software-glance.md          # Step 2: High-level view
│           ├── needs.md                    # Step 3: WHAT (customer needs)
│           ├── software-vision.md          # Step 4: Architecture
│           ├── functional-requirements.md  # Step 5: HOW
│           ├── validate.md                 # Traceability validation (ZigZag)
│           ├── complexity.md               # Optional: Axiomatic Design
│           ├── live.md                     # Launch the SRS Navigator canvas (UX)
│           └── {crm,microer}-example.md    # Case study walkthroughs
├── .github/extensions/
│   └── srs-navigator/           # Canvas extension (graph UX) + bundled skills
│       ├── extension.mjs        # Canvas + 9 methodology tools
│       ├── lib/ tests/ skills/  # Renderer/parser/validation, tests, bundled skills
│       └── scripts/sync-skills.mjs  # Refresh bundled skills from skills/
├── .spec/crm-system.json        # Demo specification for the navigator
├── scripts/
│   ├── build-plugin.py          # Validate/package the agent plugin
│   ├── bump-version.mjs         # Bump the canvas extension version
│   └── package-extension.mjs    # Package the canvas extension archives
├── VERSION                      # Canvas extension version (X.Y.Z)
├── hooks/
│   └── hooks.json               # Hook configurations
├── settings.json                # Default plugin settings
└── docs/                        # Documentation + skill-generated files
    ├── PRODUCT.md               # Brand identity (skill-generated)
    ├── DESIGN.md                # Visual system (skill-generated)
    └── index.html               # Project webpage (GitHub Pages)
```

### Two Development Workflows (Skill + Canvas App)

This repository is maintained along **two complementary tracks**:

1. **Agent-native skills** (the methodology). The canonical skill lives in
   `skills/problem-based-srs/` (`SKILL.md` orchestrator + `reference/<action>.md`).
   Validated/packaged by `scripts/build-plugin.py` and released via
   `.github/workflows/create-release.yml` (tag `vX.Y`).
2. **The SRS Navigator canvas app** (the UX) in `.github/extensions/srs-navigator/`.
   Has its own test suite (`npm test`) and release workflow
   `.github/workflows/release-canvas.yml` (tag `vX.Y.Z` via `scripts/bump-version.mjs`).

**Bridge — skill sync:** the canvas app's bundled `skills/*.md` are **generated** from
the canonical single skill at `skills/problem-based-srs/` (its `SKILL.md` orchestrator and
`reference/<action>.md` files). Never hand-edit the bundled flat files; edit the canonical
skill, then regenerate:

```bash
node .github/extensions/srs-navigator/scripts/sync-skills.mjs   # local copy from skills/
```

In this monorepo it copies straight from `skills/problem-based-srs/` on disk — the single
source of truth. At runtime the extension reads the canonical `SKILL.md` /
`reference/<action>.md` directly (falling back to the bundled flat copies only for
standalone installs outside the monorepo), so a skill is edited **once** and both tracks
stay in sync.
The `live` action (`skills/problem-based-srs/reference/live.md`) is the entry point that
opens the `srs-navigator` canvas inside the GitHub Copilot app.

### 🧪 Behavior Drift Testing

**Every change that affects behavior must ship with a test that fails when that behavior
drifts.** "Behavior" here includes the methodology's mandatory rules (e.g. the customer
Discovery Interview), the wording of guardrails, skip conditions, canvas app logic, and
the skill-sync mechanism. Documentation-only edits are exempt; anything an agent or the
app *acts on* is not.

**Why this exists:** the mandatory Discovery Interview was silently skipped in autopilot
mode. A behavior test now fails if that guardrail is ever weakened or removed. Apply the
same discipline to all future changes.

#### Where tests live

| Test | Path | Guards against |
|------|------|----------------|
| **Deterministic drift guard** | `.github/extensions/srs-navigator/tests/interview-guard.test.mjs` | Skill markdown losing the mandatory interview, the autopilot guardrail, or hardened skip conditions; bundled canvas skills falling out of sync with the canonical source. Runs in `npm test`. |
| **LLM-backed behavior suite** | `.github/extensions/srs-navigator/tests/skill-behavior/` | An agent *actually skipping* the interview when running the skill end-to-end (traces real tool calls: ask-before-write, CP notation, workflow order). Opt-in via `npm run test:skill-behavior`; provider-gated (skips without API keys). |
| **Canvas/lib unit tests** | `.github/extensions/srs-navigator/tests/*.test.mjs` | Parser, renderer, validation, decompose, and skill-sync regressions. Runs in `npm test`. |

#### Rules for adding/changing behavior

1. **Content assertions for skill rules.** If you add, remove, or reword a mandatory rule,
   guardrail, or skip condition in `skills/problem-based-srs/**`, add or update an
   assertion in `interview-guard.test.mjs` (or a sibling deterministic test) so the rule
   cannot silently disappear. Assert on the canonical source *and* on byte-for-byte sync of
   the bundled copies.
2. **Behavioral scenario for agent-facing changes.** If the change alters what the agent
   should *do* at runtime (ask vs. proceed, order of steps, artifact naming), add or update
   a scenario in `tests/skill-behavior/` — including a **canary** that would catch the
   regression you are preventing.
3. **Use the canonical CRM use case** (`lib/demo-spec.mjs` / `.spec/crm-system.json`) for
   test fixtures — do not introduce unrelated example domains.
4. **Negative-test your guard.** Temporarily mutate the source to confirm the new test
   fails, then restore it. A test that never fails guards nothing.
5. **Keep the default suite green.** `npm test` must stay fast and deterministic (no network
   / no API keys). Put anything requiring an LLM or credentials behind
   `npm run test:skill-behavior`.
6. **Guard sequenced issue ledgers with a command.** If a change updates closure criteria in
   long-form issue ledgers (for example #69/#92/#108), add or update
   `evals/tools/issue-ledger.mjs` + `evals/tests/issue-ledger.test.mjs` so drift is detected:
   open boxes without blocker, ticked boxes without citation, and stale version claims.

#### Required verification before committing a behavior change

```bash
cd .github/extensions/srs-navigator
npm test                        # deterministic suite — must pass, includes drift guards
npm run test:skill-behavior     # opt-in; skips cleanly without API keys, runs with them
node scripts/sync-skills.mjs    # if canonical skills changed, re-sync bundled copies
```

Then re-run `python scripts/build-plugin.py validate` from the repo root for skill/manifest
changes.


- The methodology lives in a single skill directory: `skills/problem-based-srs/`
- `SKILL.md` is the orchestrator (YAML frontmatter: name, description, license); each
  action is a plain-markdown file at `reference/<action>.md` (filename == action name)
- Description field is critical - it determines when the skill triggers
- Keep SKILL.md content under 500 lines (use `reference/` for detailed docs)
- Follow the AgentSkills specification: https://agentskills.io/specification
- Test skills by using them in practice
- Focus on guiding users through problem identification before solution design
- Include examples that demonstrate real-world scenarios

### Documentation
- Keep documentation concise and scannable
- Use markdown formatting effectively (headers, lists, code blocks)
- Provide context for why, not just what or how
- Include references to relevant SRS standards (IEEE 830, etc.) where appropriate

### File Organization
- **`AGENTS.md`**: **Customer-facing file** — part of the project methodology for end users. Must NOT contain internal development procedures (e.g., release process, CI/CD instructions, internal workflows). Keep aligned with `agents/problem-based-srs/AGENT.md`.
- **`.github/copilot-instructions.md`**: Internal development instructions for AI agents working on this repository. All internal procedures (release process, development workflows, etc.) belong here.
- **`.claude-plugin/`**: Plugin manifest (`plugin.json`) plus the marketplace catalog
  (`marketplace.json`) that makes the repository installable with
  `/plugin marketplace add`. The catalog's entry must keep agreeing with `plugin.json` —
  `build-plugin.py validate` and `evals/tests/claude-plugin-install.test.mjs` enforce it.
- **`skills/`**: AgentSkills (Claude Code, Claude.ai, GitHub Copilot)
  - A single self-contained skill directory: `skills/problem-based-srs/`
  - `SKILL.md` orchestrator + `reference/<action>.md` action files (filename == action)
- **`hooks/`**: Hook configurations for event handlers (hooks.json)
- **`settings.json`**: Default plugin settings
- **`docs/`**: Documentation, research papers, methodology guides, and **all skill-generated helper files** (e.g., PRODUCT.md, DESIGN.md). Any skill or agent that creates auxiliary files (brand identity, design systems, style guides, etc.) MUST place them in `docs/`, never in the repository root.
- **`docs/references/`**: Reference documentation for AgentSkills development

### Code Style
- This is primarily a documentation repository
- Any code examples should be language-agnostic where possible
- Use clear, readable formatting in examples

---

## 🛠️ AgentSkills Development Guidelines

When creating or modifying skills in the `skills/` directory, **always follow the AgentSkills specification and best practices**.

### Required References

**Before modifying any skill, load and follow these reference documents:**

| Reference | Path | Purpose |
|-----------|------|---------|
| **Specification** | `docs/references/agentskills-specification.md` | SKILL.md format, required fields, directory structure |
| **Best Practices** | `docs/references/agentskills-best-practices.md` | Content organization, naming, descriptions, patterns |

### Key Requirements for Skills

#### SKILL.md Frontmatter (Required)
```yaml
---
name: skill-name           # Max 64 chars, lowercase + hyphens only
description: What and when # Max 1024 chars, written in THIRD PERSON
license: MIT               # Optional but recommended
metadata:                  # Optional additional fields
  author: author-name
  version: "1.0"
---
```

#### Critical Rules

1. **Name must match directory name** - `skills/my-skill/SKILL.md` requires `name: my-skill`
2. **Description in third person** - "Processes files" NOT "I process files" or "You can use this"
3. **Description includes WHAT and WHEN** - Help agents discover when to use the skill
4. **Keep SKILL.md under 500 lines** - Move detailed content to `references/` directory
5. **File references one level deep** - Don't nest reference → reference → reference

#### Directory Structure
```
skills/skill-name/
├── SKILL.md              # Required: instructions + metadata
├── references/           # Optional: detailed documentation
│   ├── guide.md
│   └── examples.md
├── scripts/              # Optional: executable code
└── assets/               # Optional: templates, resources
```

### Skill Modification Checklist

When modifying a skill, verify:

- [ ] `name` field is lowercase, max 64 chars, no consecutive hyphens
- [ ] `name` field matches the parent directory name
- [ ] `description` is 1-1024 chars and written in third person
- [ ] `description` explains both WHAT the skill does and WHEN to use it
- [ ] SKILL.md body is under 500 lines
- [ ] Reference files are one level deep (not nested)
- [ ] Longer reference files (100+ lines) have table of contents
- [ ] No time-sensitive information in content
- [ ] Consistent terminology throughout
- [ ] **Behavior change is covered by a drift test** (`interview-guard.test.mjs` and/or a
  `tests/skill-behavior/` scenario) that fails if the rule/guardrail regresses
- [ ] `npm test` passes and bundled canvas skills are re-synced (`sync-skills.mjs`)

### Example: Good vs Bad Descriptions

**Good (specific, third person, includes when):**
```yaml
description: Orchestrates requirements engineering using the Problem-Based SRS methodology. Use when performing requirements analysis, creating customer problems, needs, or functional requirements with full traceability.
```

**Bad (vague, first person):**
```yaml
description: I help with requirements.
```

### External Resources

- **Official Specification**: [agentskills.io/specification](https://agentskills.io/specification)
- **Best Practices**: [platform.claude.com/.../best-practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- **Example Skills**: [github.com/anthropics/skills](https://github.com/anthropics/skills)

## Terminology
- **SRS**: Software Requirements Specification
- **Problem-Based**: Requirements methodology that starts with problem identification
- **Skill**: A structured capability module designed for AI agent consumption (AgentSkills standard)
- **AI Agent**: Tools like GitHub Copilot, Claude Code, or similar assistants
- **Trunk-Based Development**: All changes committed directly to main branch

## Quality Standards
- Accuracy in requirements engineering concepts
- Clarity in skill instructions
- Completeness in examples and templates
- Consistency in structure and formatting
- **Traceability**: Every FR traces to CN, every CN traces to CP

---

## Quick Reference

### Problem-Based SRS Command
A single command, `/problem-based-srs`, dispatches to each step via an **action** argument:
```
/problem-based-srs business-context        # Establish Business Context
/problem-based-srs problems                # Generate Customer Problems
/problem-based-srs software-glance         # Create Software Glance
/problem-based-srs needs                   # Generate Customer Needs
/problem-based-srs software-vision         # Build Software Vision
/problem-based-srs functional-requirements # Specify Functional Requirements
/problem-based-srs validate                # Validate traceability (ZigZag)
/problem-based-srs complexity              # Optional: Axiomatic Design analysis
/problem-based-srs                         # Full methodology orchestration (default)
/live                                      # Launch the SRS Navigator canvas (visualize the spec)
```

### Traceability Chain
```
CP (WHY) → CN (WHAT) → FR (HOW)
```

---

## 📦 Build & Release Pipeline

This repository ships a **build + release pipeline** built on GitHub Actions and a
single build script. Releases publish a validated, packaged plugin artifact to the
[GitHub Releases page](https://github.com/RafaelGorski/Problem-Based-SRS/releases).

### Pipeline components

| Component | Path | Purpose |
|-----------|------|---------|
| **Build script** | `scripts/build-plugin.py` | Validates the manifest + skills, extracts CHANGELOG notes, and packages the `dist/<name>-vX.Y.zip` artifact. Runs locally and in CI. |
| **CI workflow** | `.github/workflows/ci.yml` | On every push/PR to `main`: validates the plugin and uploads the packaged zip as a build artifact. |
| **Release workflow** | `.github/workflows/create-release.yml` | Builds, validates, packages, and publishes a GitHub Release with the zip attached. |
| **Canvas release workflow** | `.github/workflows/release-canvas.yml` | Independent pipeline for the SRS Navigator canvas app: runs `npm test`, refreshes bundled skills, bumps the extension version (`scripts/bump-version.mjs`), confirms the bumped tag is this train's (`scripts/release-train.mjs --expect canvas`), packages archives (`scripts/package-extension.mjs`), verifies the archive contract (`evals/tests/from-archive-install.test.mjs`), and publishes a `vX.Y.Z` GitHub Release that creates its own tag. |
| **Thursday report** | `.github/workflows/thursday-release-report.yml` | At 12:00 BRT on Thursdays, opens or refreshes the weekly release report issue with the unreleased commits and files for both trains. |
| **Thursday dispatch** | `.github/workflows/thursday-release.yml` | At 16:00 BRT on Thursdays, dispatches the trains that are ready; the report is advisory, not a gate. |
| **Distribution monitor** | `.github/workflows/distribution-drift.yml` → `scripts/check-distribution.mjs` | Weekly (and on demand): compares the surfaces this repository does **not** own — the skills.sh listing and GitHub Releases — against what the repository actually ships. Deliberately outside the PR gate. |

> **Two release pipelines, two tag schemes.** The **plugin** release uses `vX.Y` tags
> (driven by `plugin.json` + `build-plugin.py`). The **canvas app** release uses `vX.Y.Z`
> tags (driven by `VERSION` + `bump-version.mjs`). Keep them distinct so tags never
> collide. "Make a release" of the methodology means the plugin pipeline below.
>
> They still share one tag namespace, and the trains still cannot be told apart by tag shape
> (`v2.4.1` is a plugin release, `v1.1.0` a canvas one). Publishing the canvas app used to
> fire `Create Release` on a version mismatch it could do nothing about (run `28527065984`,
> tag `v1.1.0`). The plugin workflow is now dispatch-only, and the canvas workflow calls
> `scripts/release-train.mjs` before it creates its tag — plugin if its normalized version
> matches `plugin.json` (the same comparison `build-plugin.py` makes), canvas if it matches
> `VERSION` / the extension `package.json` verbatim (the tag `bump-version.mjs` pushes). A
> tag matching neither, or both, **fails the run** rather than releasing something arbitrary.
> Guarded by `evals/tests/release-trains.test.mjs`.
>
> **The plugin train is dispatched on purpose; the canvas train proves ownership before tagging.** `create-release.yml` no longer auto-runs on tag pushes, so the Thursday dispatcher (or an explicit manual recovery) decides when the plugin release happens. `release-canvas.yml` is still about to create a shared-namespace tag, so it runs `release-train.mjs --tag <bumped tag> --expect canvas` after `bump-version.mjs` and before anything leaves the runner; if the verdict is not `canvas`, it *fails*. The one state neither may publish is a tag **both trains claim**; either one would put its artifacts on the other's release.

> **`VERSION` is owned by `release-canvas.yml`.** Do not bump it in a feature branch:
> `bump-version.mjs` *increments* from the version it finds, so a hand-bumped number is never
> published — it is skipped. `VERSION` and the extension `package.json` must always agree. To
> ask which train a tag belongs to, run `node scripts/release-train.mjs --tag v2.6` (the bare
> form `… v2.6` works too). It answers from the versions **currently on disk**: on a tree
> advertising canvas `1.1.0`, `v1.1.0` is `canvas` and `v1.1.1` is `unknown` until the release
> workflow bumps it.

> **Neither train should be hand-tagged during the normal Thursday flow.** Both release
> workflows are dispatch-only now. `release-canvas.yml` publishes with `gh release create
> <tag> --target <sha>` and GitHub creates the tag *as part of* the release; `create-release.yml`
> does the same for the plugin train when Thursday dispatches it (or when a maintainer runs a
> recovery by hand). Adding a `push: tags` trigger back to either train would reintroduce an
> out-of-cadence path and, on the canvas side, would silently turn `--target` into a no-op.
>
> The canvas rule is therefore: **nothing leaves the runner until the artifact has been built
> and read**, and a failed or cancelled publish reverts the version bump so a re-run
> republishes the same version instead of skipping past it — `bump-version.mjs` starts from
> the bumped `package.json` and skips versions whose tag exists, which is what made the
> previous strand permanent. Enforced by `evals/tests/release-canvas-ordering.test.mjs`,
> which reads both workflows.

### Build script commands

Run any of these locally (requires Python 3.8+, no dependencies):

```bash
python scripts/build-plugin.py validate            # validate manifest + skills
python scripts/build-plugin.py validate --expected-version 1.3
python scripts/build-plugin.py package             # build dist/<name>-vX.Y.zip
python scripts/build-plugin.py notes --version 1.3 # print CHANGELOG section
python scripts/build-plugin.py build --version 1.3 # validate + package + notes
```

Validation checks: `plugin.json` is valid JSON with `name`/`version`; every
`skills/*/SKILL.md` has frontmatter whose `name` matches its directory and has a
`description`; and (when `--expected-version` is given) the manifest version matches.

### Step-by-Step Release Process

#### 1. Update Version and CHANGELOG

**a. Update `.claude-plugin/plugin.json`** — set `"version": "X.Y.0"`.

**b. Update `CHANGELOG.md`** — add a new section at the top following the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. The release workflow
extracts this section automatically as the release notes:

```markdown
## [X.Y] - YYYY-MM-DD

### Added
- New features or capabilities

### Changed
- Updates to existing features

### Fixed
- Bug fixes

[X.Y]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/vX.Y
```

**c. Validate locally, then commit and push:**
```bash
python scripts/build-plugin.py build --version X.Y   # confirm it passes
git add .claude-plugin/plugin.json CHANGELOG.md
git commit -m "chore: Bump version to X.Y"
git push origin main
```

#### 2. Publish the Release

The standard path is the Thursday cadence: `thursday-release-report.yml` opens the review
issue at **12:00 BRT**, and `thursday-release.yml` dispatches the release at **16:00 BRT**
when `plugin.json` and `CHANGELOG.md` already advertise an unpublished version.

For an exception or recovery, use **manual dispatch**: GitHub → **Actions** →
**Create Release** → **Run workflow**. All inputs are optional:

| Field | Description | Default |
|-------|-------------|---------|
| **version** | Release version (e.g. `1.3`) | version in `plugin.json` |
| **release_name** | Display suffix (e.g. `Enhanced Traceability`) | none |
| **release_body** | Notes override (markdown) | CHANGELOG.md section |

The workflow validates the plugin, packages `problem-based-srs-vX.Y.zip`, and creates
(or updates) the `vX.Y` release with that zip attached. The `v` prefix and trailing
`.0` normalization are handled automatically, and the tag is created by the workflow's
`gh release create --target` step rather than by a separate git push.

#### 3. Verify the Release

Open the **Releases** section and confirm the `vX.Y` release exists, has the expected
title and notes, and includes the **`problem-based-srs-vX.Y.zip`** asset. It must not
be a draft or pre-release.

Then run the distribution monitor, which is the only thing that checks the *published*
side rather than the repository side:

```bash
node scripts/check-distribution.mjs          # report, always exits 0
node scripts/check-distribution.mjs --strict # exit 1 on drift (what the workflow runs)
```

### Distribution surfaces (third-party state)

Two surfaces carry this project and neither lives in the repository, so neither can be
fixed by a pull request — only observed. `scripts/check-distribution.mjs` observes them;
`.github/workflows/distribution-drift.yml` runs it weekly and on demand. A red run there
is a notification, not a broken build: it is out of the PR gate on purpose.

| Finding | Severity | What it means | What to do |
|---------|----------|---------------|-----------|
| `registry-listing-drift` | error | The [skills.sh listing](https://www.skills.sh/rafaelgorski/problem-based-srs) advertises skills the repository no longer ships. It is a cached index, so consolidations (like #50, which took nine skills to one) do not propagate. | Re-submit the repository at [skills.sh](https://www.skills.sh) so the listing is re-crawled, then re-run the checker. |
| `registry-skill-stale` | error | The listing's page for a skill the repository *does* ship publishes an older copy of it — a description that has moved on, or `##` sections the page never renders. Captured 2026-07-31, the `problem-based-srs` page was missing **Identifier Notation (CANONICAL)** and still taught `FR-001`, the notation the methodology replaced. Names agreeing is the cheap half; this is the half a re-submission is actually for. | Re-submit at [skills.sh](https://www.skills.sh) and re-run. This is the finding that tells you whether the re-crawl worked — `registry-listing-drift` clearing only means the *names* line up. |
| `dangling-release-links` | error | A `releases/tag/…` link in `README.md`/`CHANGELOG.md` names a **well-formed** tag with no release behind it **and no tag on origin** — normally a manifest bump that has not been dispatched yet. When the tag does exist, the link moves to `release-tag-without-release` instead. | Cut the missing release (above). The link is already correct and will resolve when the workflow creates the tag. |
| `unpublishable-release-link` | error | A reference definition **in `CHANGELOG.md`** (the file `build-plugin.py` reads for release notes, so its labels are plugin-train claims) names a tag **no pipeline creates for that version**. `create-release.yml` tags `v${VERSION}` where `VERSION` is `build-plugin.py`'s *normalized* version, so `2.6.0` publishes at `v2.6` — and GitHub serves `/releases/tag/<tag>` by exact name. Links outside that file stay under `dangling-release-links`, because the canvas train tags `v${VERSION}` verbatim and does not strip the `.0`. | Correct the link to the tag named in the finding. Cutting a release will **not** clear this one. |
| `stranded-release-link` | error | A reference definition **in `CHANGELOG.md`** names a version the manifest has **already moved past**. `create-release.yml` runs `build-plugin.py build --version <tag>`, which validates the tag against `plugin.json` — so `v2.5` fails on `version mismatch: plugin.json has 2.6.0` and is no longer publishable from `main`. Not impossible, and the finding says so: `checkout@v4` restores the *tagged commit*, so tagging the older commit that still read `2.5.0` would build — but it would publish a tree and notes that predate what the section documents now, and `extract_notes()` publishes exactly one section, so those notes reach no release from `main` either. Deeper than `unpublishable-release-link`, so it wins when a link is both. | **Do not cut it from `main`** — that fails the workflow, and a historical tag ships the wrong notes. Fold the section into `## [<manifest version>]`, the release that will actually deliver those changes, and delete the link definition. Guarded offline by `evals/tests/release-hygiene.test.mjs`, which requires every changelog section below the manifest version to name a tag present in `git tag --list`, and by `evals/tests/stranded-release-claim.test.mjs`, which holds the wording to what the repository's history supports. |
| `plugin-release-missing` / `canvas-release-missing` | error | The version a surface advertises has no release behind it, **and no tag for it exists** — the release has not been run yet. Each finding names the newest release **on its own train**; the trains are told apart by the title their workflow writes (`🎉 Version …` / `srs-navigator …`). When a train has no releases at all it says so, rather than quoting the other train's newest. | Cut it on the matching train — dispatch `create-release.yml` for the plugin, or run `release-canvas.yml` for the canvas. |
| `release-tag-without-release` | error | A tag **is** on origin but no release was published for it — a publish run that failed after the tag existed (`Create Release` run `28527065984` is the precedent). This supersedes the `*-release-missing` finding for that train and takes the link out of `dangling-release-links`, because in this state both of those advise a re-push, and **re-pushing an existing tag emits no `push` event**, so nothing re-runs. | Plugin train: `gh workflow run create-release.yml --ref vX.Y -f version=X.Y` — `gh release create` attaches to the tag that already exists, and `--ref` makes the run package the tagged commit rather than whatever `main` holds now. Canvas train: `git push --delete origin vX.Y.Z` **first**, then re-run `release-canvas.yml`; `bump-version.mjs` skips any version whose tag exists, so leaving the tag skips that version forever. |
| `surface-unreachable` | warning | A registry or the releases API could not be reached at all. | A fetch failure, **not** proof of drift. Re-run; if it persists, check the surface by hand. |
| `registry-listing-unreadable` | warning | The listing responded but carried no JSON-LD `CollectionPage`. | Its markup probably changed. Check the page by hand and update `parseRegistryListing` — until then a clean run proves nothing. |
| `registry-skill-unreadable` | warning | A per-skill page carried no `SoftwareApplication` block, or **none** of the shipped skill's sections appeared in it. A page serving something else and a page this checker can no longer parse look identical from here, so no drift is claimed. | Read the page by hand. If the site was redesigned, update `parseSkillPage`/`pageText`; a clean `registry-skill-stale` proves nothing while this warning stands. |
| `registry-listing-partial` | warning | The page's own count disagrees with the entries it returned, so the comparison was skipped rather than run on a truncated payload. | Re-run; if it persists, read the page and confirm what it actually advertises. |
| `registry-skill-version-unverifiable` | notice | An axis that was **not compared**, reported so a green run is not read as a version that was checked. skills.sh publishes no `softwareVersion`, so the page's version cannot be read at all; the value it would have been compared against is the skill's own `metadata.version` in `skills/*/SKILL.md` — **not** the plugin release version in `plugin.json`, which is a different domain. The mirror case (the skill declares no `metadata.version`) is reported the same way, naming the other side. | Nothing, while the surface publishes no version — it is the registry's limitation, not this repository's, and it does not fail the run. If a `metadata.version` is what is missing, add it to the skill's frontmatter and the axis starts answering. |

**Exit codes.** Only `error` findings fail the run (`--strict` → 1). Warnings print, are
emitted as `::warning::` annotations, and exit 0 — a monitor that goes red on someone
else's 503 is a monitor that gets muted, and a muted monitor is the state #69 was already
in. If warnings persist across runs, treat that as the signal instead of the exit code.

**A `notice` is a third channel, not a third severity.** Entries at that severity arrive on
the summary's `unverified` channel, never on `findings`, so they cannot move `ok`,
`drifted` or the exit code. That separation is the point: an axis that is unanswerable on
*every* run — skills.sh has never published a version — would leave the monitor permanently
non-green if it were filed as a finding, which is the muting problem above. They render
under **"Not verified this run"**, including on an otherwise clean run, which is the only
run where staying silent about a skipped comparison actually misleads. Guarded by
`evals/tests/registry-listing-content.test.mjs`.

**Version badges must link the `/releases` index, not a per-tag URL.** The documented
process bumps `plugin.json` *before* the tag exists, so a per-tag badge 404s for the whole
window in between — it did, across two consecutive versions. Guarded by
`evals/tests/distribution-drift.test.mjs`.

**Changelog links must name the tag the pipeline creates, not the manifest version.**
`create-release.yml` publishes at `v${VERSION}` where `VERSION` comes from
`build-plugin.py`'s `normalize_version()`, which strips a trailing `.0`. So a `## [2.6.0]`
section links `releases/tag/**v2.6**`, while a real patch such as `2.4.1` keeps all three
parts. Getting this wrong is not cosmetic: the link stays a 404 after the release is cut,
and the monitor keeps reporting it under advice that no longer applies. Guarded by
`evals/tests/release-hygiene.test.mjs`, which derives the expected tag by executing
`build-plugin.py`'s own `normalize_version` rather than restating the rule.

**Never bump the manifest over a release that was never cut.** The release dispatch in
[step 2](#2-publish-the-release) is the *only* thing that publishes a version, and the
manifest version is the only version `main` can publish — `create-release.yml` validates
the dispatched version against `plugin.json`, so once the manifest reads `2.6.0`, `v2.5` is no longer
reachable from `main`. `2.4.1 → 2.5.0 → 2.6.0` shipped that way: a 76-line `## [2.5.0]`
section whose link had no release behind it and whose notes no release cut from `main` would
carry, because `extract_notes()` extracts exactly one section. State that precisely: tagging
the older commit that still read `2.5.0` *would* build — `checkout@v4` restores the tagged
commit — but it would publish a tree and notes that predate most of what the section had
grown to document. If a bump has already happened, fold the stranded section into the
manifest version's — do not try to cut it from either end. Guarded by
`evals/tests/release-hygiene.test.mjs` (offline, every section below the manifest version
must name a tag in `git tag --list`; the eval job checks out with `fetch-tags: true` so it
has evidence), by `evals/tests/stranded-release-claim.test.mjs` (which derives the falsifier
from git history and forbids the strong form of the claim), and reported by
`stranded-release-link` in the monitor.

**Decision — no second registry, for now (2026-07-31).** The one listing we publish
drifted by eight of nine entries and stayed that way for three passes, because nothing was
looking. A second surface without a detector doubles that blind spot. Now that the monitor
exists the question is answerable on maintenance cost instead of on fear of it; revisit
when there is inbound signal to justify it.

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes or major methodology updates
- **Minor (X.Y.0)**: New features, new skills, backward-compatible changes
- **Patch (X.Y.Z)**: Bug fixes only (rarely used; we typically increment minor)

**Current practice**: Use `X.Y` for releases, storing as `X.Y.0` in `plugin.json`.

### Troubleshooting

**Release workflow fails at "Build, validate & package":**
- The version in `plugin.json` must match the tag/input version.
- A skill's `SKILL.md` frontmatter `name` must match its directory and include a
  `description`. Reproduce locally with `python scripts/build-plugin.py validate`.

**"no CHANGELOG.md section found for version X.Y":**
- Add a `## [X.Y] - YYYY-MM-DD` section to `CHANGELOG.md`, or pass `release_body`.

**Permissions error:** ensure `contents: write` is set (it is in the workflow) and
check repo Settings → Actions → General → Workflow permissions.

**Tag already exists / re-release:** the workflow updates an existing `vX.Y` release in
place (notes + asset). To start clean: `git push --delete origin vX.Y` and delete the
release from the GitHub UI, then re-dispatch `create-release.yml`.

**The workflow created the tag but the run failed (no release exists):** do **not** try to
push the tag again. Git sends nothing for a ref that is already up to date, and
`create-release.yml` is dispatch-only anyway. Fix the cause, then re-publish onto the tag
that is already there:

```bash
gh workflow run create-release.yml --ref vX.Y -f version=X.Y   # attaches to the existing tag
gh run watch "$(gh run list --workflow 'Create Release' --event workflow_dispatch \
                  --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

`--ref` pins the provenance and is not optional. The workflow checks out with
`actions/checkout@v4` and no `ref:`, so it packages whatever the **dispatched** ref holds,
and `gh workflow run` defaults to the repository's default branch. Recovering without it
builds from `main` as it stands now and attaches those bytes to a tag naming a different
commit — a release that exists, looks correct, and does not match its own tag. Watching by
run **ID** rather than bare `gh run watch` matters for the same reason the release runbook
gives: a concurrent run can otherwise be the one that gets watched, and the evidence then
records a green run that is not this one.

On the **canvas** train the equivalent recovery is different: delete the tag first
(`git push --delete origin vX.Y.Z`) before re-running `release-canvas.yml`, because
`bump-version.mjs` skips any version whose tag exists and would otherwise walk past the
stranded version permanently. `check-distribution.mjs` reports this state as
`release-tag-without-release` and prints the matching command.

The full pre-flight rehearsal, the post-publication verification of the **downloaded**
artefact, and the manual clean-profile `/live` procedure live in
[`docs/release-verification.md`](../docs/release-verification.md).
