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
2. **Claude second**: Keep `.claude-plugin/plugin.json`, `skills/`, `agents/`, `hooks/`, and `settings.json` aligned with Claude plugin docs.
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
│   └── FR-001-[short-name].md
└── non-functional-requirements/
    ├── _index.md
    └── NFR-001-[short-name].md
```

When adding or changing features/requirements in the solution, reference the `.spec/` folder for existing artifacts and save new artifacts there. If a legacy folder is detected (`docs/srs/`, `requirements/`), continue using it for consistency.

### Artifact Naming Convention

- **Customer Problems**: `CP.{n}` or `CP.{n}.{m}` (e.g., CP.01, CP.01.1)
- **Customer Needs**: `CN.{cp}.{n}` (e.g., CN.01.1 traces to CP.01)
- **Functional Requirements**: `FR.{cp}.{cn}.{n}` (e.g., FR.01.1.1 traces to CN.01.1)
- **Non-Functional Requirements**: `NFR.{version}.md` (e.g., NFR.1.0.md)

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
6. **Verify**: Show what was done and confirm completion

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
│   └── plugin.json              # Plugin manifest (name, version, metadata)
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

### Skills Development (AgentSkills Format)
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
- **`.claude-plugin/`**: Plugin manifest (plugin.json) defining plugin metadata
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
| **Canvas release workflow** | `.github/workflows/release-canvas.yml` | Independent pipeline for the SRS Navigator canvas app: runs `npm test`, refreshes bundled skills, bumps the extension version (`scripts/bump-version.mjs`), packages archives (`scripts/package-extension.mjs`), and publishes a `vX.Y.Z` GitHub Release. |

> **Two release pipelines, two tag schemes.** The **plugin** release uses `vX.Y` tags
> (driven by `plugin.json` + `build-plugin.py`). The **canvas app** release uses `vX.Y.Z`
> tags (driven by `VERSION` + `bump-version.mjs`). Keep them distinct so tags never
> collide. "Make a release" of the methodology means the plugin pipeline below.

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

Pick **one** of the two methods:

**Method A — Tag push (recommended).** Pushing a `vX.Y` tag triggers the release
workflow, which derives the version from the tag and the notes from `CHANGELOG.md`:

```bash
git tag vX.Y
git push origin vX.Y
```

**Method B — Manual dispatch.** GitHub → **Actions** → **Create Release** →
**Run workflow**. All inputs are optional:

| Field | Description | Default |
|-------|-------------|---------|
| **version** | Release version (e.g. `1.3`) | version in `plugin.json` |
| **release_name** | Display suffix (e.g. `Enhanced Traceability`) | none |
| **release_body** | Notes override (markdown) | CHANGELOG.md section |

The workflow validates the plugin, packages `problem-based-srs-vX.Y.zip`, and creates
(or updates) the `vX.Y` release with that zip attached. The `v` prefix and trailing
`.0` normalization are handled automatically.

#### 3. Verify the Release

Open the **Releases** section and confirm the `vX.Y` release exists, has the expected
title and notes, and includes the **`problem-based-srs-vX.Y.zip`** asset. It must not
be a draft or pre-release.

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
release from the GitHub UI, then re-tag.
