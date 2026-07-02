# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.4] - 2026-07-02

### Added

- **New `evals/` harness for testing and evaluating the methodology skills using the
  GitHub Copilot CLI SDK.** Two tiers: deterministic offline tests (`evals/tests/*.test.mjs`,
  57 tests via `node --test`) covering the headless Copilot SDK wrapper, the SKILL.md
  loader/graders, and static skill evals over every `skills/<slug>/SKILL.md` (name/dir
  match, description contract, body line cap, link resolution, methodology tokens, and a
  regression guard proving the unified `/problem-based-srs <action>` refactor left no
  legacy per-step commands or `Use skill:` handoffs); and opt-in live LLM evals
  (`evals/cases/*.case.mjs` + `evals/run-evals.mjs`) that run each skill through the real
  model and grade it with a rubric plus an optional LLM judge. Includes PowerShell runners
  `evals/scripts/run-tests.ps1` and `evals/scripts/run-evals.ps1` for manual verification.
- **Verbose eval output.** `evals/run-evals.mjs` gains `--verbose`/`-v` and `-vv`
  (surfaced as `-Detailed`/`-Trace` in `run-evals.ps1`) to print the built prompt, run
  metadata (exit code, duration, token usage, loaded skills, tool calls, stderr), the full
  model artifact, and every rubric check (passing and failing) for troubleshooting.
- **Repo-root `run-tests.ps1`** that runs all offline suites in sequence — plugin
  validation, the canvas extension tests, and the deterministic skill evals — with a
  pass/fail summary and `-SkipValidate` / `-SkipCanvas` / `-SkipEvals` switches.

### Changed

- **Unified the nine per-step commands into a single `/problem-based-srs` command
  with an `action` argument.** Instead of `/customer-problems`, `/customer-needs`,
  `/functional-requirements`, etc., the methodology is now driven by one command that
  dispatches to a step: `/problem-based-srs problems`, `/problem-based-srs needs`,
  `/problem-based-srs functional-requirements`, `/problem-based-srs business-context`,
  `/problem-based-srs software-glance`, `/problem-based-srs software-vision`,
  `/problem-based-srs validate`, `/problem-based-srs complexity`, and
  `/problem-based-srs` (full run, the default). Applied consistently across the CLI
  skills/agent, the SRS Navigator canvas extension (a single `problem_based_srs` tool
  replaces the nine per-step tools; action-bar payloads now carry an `srsAction`
  field), and the project webpage. The eight step content files under `skills/<slug>/`
  are retained as the backing methodology library.

[2.4]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.4

## [2.3] - 2026-07-01

### Added

- **"Most requirements start in the wrong place" now shows the problem-highlight
  animation.** `docs/index.html` gains a two-column layout with an app-faithful SRS
  Navigator graph of the VagrantChefHubot example (`docs/assets/srs-problems.svg`). Its
  CSS keyframes present the whole 28-node spec, then dim the Needs and Requirements while
  the five Customer Problems (CP-1 through CP-5) light up with pulsing rings, making the
  visual argument that requirements begin at the problem. Honors `prefers-reduced-motion`.
- **"How it works" now opens with a CLI chat simulation.** A dark terminal mockup animates
  the Copilot CLI calling each methodology skill in order (`/business-context`,
  `/customer-problems`, `/software-glance`, `/customer-needs`, `/software-vision`,
  `/functional-requirements`), each command tinted with its step color, ending on
  100% traceability from FR back to CN back to CP. Built with pure CSS/HTML; the assembled
  state is the default so it stays readable under reduced motion.
- **`scripts/build-problem-highlight.mjs`**: generator for `srs-problems.svg`. Node colors
  and Phosphor icons are sampled verbatim from the extension's `renderer.mjs`; the chrome
  mirrors the navigator on the VagrantChefHubot spec. The canvas app itself is unchanged.

[2.3]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.3

## [2.2] - 2026-07-01

### Changed

- **GitHub Pages hero now uses an animated image instead of the live app.** Both
  `docs/index.html` and `docs/app.html` replace the embedded live navigator iframe with a
  self-contained animated SVG (`docs/assets/srs-chain.svg`). Its CSS keyframes build the
  traceability chain in the methodology's causal order: Customer Problems appear first,
  then the Customer Needs that address them, then the Functional / Non-Functional
  Requirements that satisfy them, with links drawing in. The image reuses the real
  navigator's node colors and Phosphor icons, and honors `prefers-reduced-motion`.

### Added

- **`scripts/build-chain-animation.mjs`**: generator for the animated SVG. Node colors and
  icons are sampled verbatim from the extension's `renderer.mjs`, and the chain uses a real
  slice of the bundled CRM demo spec. The canvas app itself is unchanged.

### Removed

- `docs/navigator-embed.html` and `scripts/build-navigator-embed.mjs` (the live-app embed),
  superseded by the animated image.

[2.2]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.2

## [2.1] - 2026-06-29

### Changed

- **GitHub Pages hero now embeds the real SRS Navigator.** Both `docs/index.html` and
  `docs/app.html` replace the hand-built CSS mock of the CP → CN → FR chain with an
  iframe of the genuine navigator (`docs/navigator-embed.html`). Its own force-directed
  intro animation builds the traceability chain live: Customer Problems reveal first,
  then the Customer Needs that address them, then the Functional and Non-Functional
  Requirements that satisfy them, with links forming between tiers.

### Added

- **`scripts/build-navigator-embed.mjs`**: generator that renders the real navigator to
  `docs/navigator-embed.html` from the extension's own `parser`, `renderer`, and
  `demo-spec` modules against the bundled CRM demo specification. The canvas app itself
  is unchanged.

[2.1]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.1

## [2.0] - 2026-06-29

Version 2.0 reframes the project around **two deliverables in one**: the Problem-Based
SRS **Skills** (the methodology) and the **SRS Navigator app** (the GitHub Copilot canvas
for visualizing, decomposing, and iterating a specification with the agent).

### Added

- **README scope refresh**: a "Skills + App" overview table up top, plus a
  "Decompose and iterate with the agent" walkthrough with real screenshots of the
  inline action bar and the right-side agent-activity panel.
- **GitHub Pages — new "Iterate" section**: documents the agent interaction loop
  (hover → action bar → decompose → agent works in the side panel) with annotated
  screenshots, and adds an "Iterate" entry to the site navigation.
- **New navigator screenshots** in `docs/assets/`: `srs-navigator-actionbar.png`
  (inline action bar with a decompose instruction on a Functional Requirement) and
  `srs-navigator-iteration.png` (detail panel with traceability and a live Agent
  Activity conversation), plus a refreshed `srs-navigator.png` graph overview.
- **GitHub Pages — "Start from the system you already have" section**: documents the
  navigator's onboarding screen (Learn & Create Spec / Load Specification / Explore Demo),
  with a recreation of the start screen and the three-step Learn flow (scan the code,
  README, and docs, run the methodology, load the graph). Added to both `index.html` and
  the app subpage `app.html`, with matching navigation links.
- **App README — "Start from your current system" section**: documents the
  `learn` action and the unified spec start screen, including a "Learn from your codebase"
  entry in the feature list and a `learn` row in the actions table.

### Changed

- Project version bumped to **2.0** across `plugin.json`, the README badge, and the
  GitHub Pages version badges.
- **GitHub Pages hero animation reworked**: the task-bar demo now plays the methodology's
  derivation chain (Customer Problem to Customer Need via `/customer-needs`, then to a
  Functional Requirement via `/functional-requirements`) instead of a single decompose
  step. Renders the full chain statically under reduced motion.

### Notes

- The single source of truth for skills (canvas reads canonical `skills/<slug>/SKILL.md`
  at runtime) and the removal of the runtime "Sync Skills from GitHub" feature, previously
  staged under Unreleased, ship as part of this release.

[2.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.0

## [1.4] - 2026-06-29

### Added

- **SRS Navigator canvas app merged into this repo**: the interactive force-directed
  graph visualization (formerly `RafaelGorski/problem-based-srs-app`) now lives in
  [`.github/extensions/srs-navigator/`](.github/extensions/srs-navigator/). This repo is
  now both the methodology skill **and** the UX to navigate it.
- **`/live` skill** (`skills/live/`): launches the SRS Navigator canvas inside the GitHub
  Copilot app to visualize the current specification as an interactive graph.
- **Demo specification** `.spec/crm-system.json` for the navigator.
- **Canvas release workflow** `.github/workflows/release-canvas.yml`: tests, refreshes
  bundled skills, bumps the version, and publishes packaged extension archives.
- **Version/packaging scripts** `scripts/bump-version.mjs` and
  `scripts/package-extension.mjs`, plus a root `VERSION` file for the canvas app.

### Changed

- **Monorepo skill sync**: `sync-skills` now copies the canonical
  `skills/<slug>/SKILL.md` straight from this repo by default (network fetch remains
  available via `--remote`), so the agent plugin and the canvas app share one source of
  truth.

[1.4]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.4


## [1.3] - 2026-06-29

### Added

- **Build & Release Pipeline**: Validated, packaged releases on the GitHub Releases page
  - `scripts/build-plugin.py`: validates `plugin.json` and every `SKILL.md` frontmatter,
    extracts CHANGELOG release notes, and packages a `dist/<name>-vX.Y.zip` artifact
  - `.github/workflows/ci.yml`: validates the plugin and uploads the package on every
    push/PR to `main`
  - Release workflow now **builds, validates, packages, and attaches the plugin zip** to
    the GitHub Release, with notes auto-extracted from `CHANGELOG.md`
  - Release can be triggered by pushing a `vX.Y` tag (in addition to manual dispatch)
  - Release artifact ships **only the agent-required skills** (plugin manifest, agent, and
    skills); README, CHANGELOG, lockfiles, tests, build scripts, and docs are excluded

### Changed

- **GitHub Actions Release Workflow**: Made generic with input parameters
  - Workflow now accepts `version`, `release_name`, and `release_body` as inputs
  - All inputs are now optional (version defaults to `plugin.json`, notes to `CHANGELOG.md`)
  - Removed hardcoded v1.2 release information
  - Renamed workflow from "Create Release v1.2" to "Create Release"
- **Release Process Documentation**: Added comprehensive release instructions
  - Step-by-step guide added to `.github/copilot-instructions.md`
  - Includes version numbering, troubleshooting, and examples

[1.3]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.3

## [1.2] - 2026-03-13

### Added

- **Business Context (`/business-context`)**: New Step 0 of the Problem-Based SRS methodology
  - Establishes structured business context before problem discovery
  - Captures project identity, business principles, stakeholders, domain boundaries, constraints, and success criteria
  - Business principles classified as Mandatory/Guiding/Aspirational
  - Includes versioned document with amendment tracking
  - Inspired by the project constitution concept from [spec-kit](https://github.com/github/spec-kit)
  - Enhances and replaces the previous minimal `00-context.md` template
- **GitHub Actions Release Workflow**: Automated release creation via workflow_dispatch

### Changed

- Updated methodology flow from 5 steps to Step 0 + 5 steps (BC → CP → SG → CN → SV → FR)
- Updated `problem-based-srs` orchestrator skill with Step 0 integration
- Updated `problem-based-srs` agent with Step 0 detection heuristics and quality gates
- Updated `customer-problems` skill to reference Business Context as preferred input
- Updated `.github/copilot-instructions.md` with Step 0 skill reference and `/business-context` command
- Updated `AGENTS.md` with business-context in repository structure
- Updated `README.md` with Step 0 in methodology flow, commands, and diagrams

## [1.1] - 2026-02-20

### Added

- **Complexity Analysis (`/complexity-analysis`)**: Optional Axiomatic Design-based quality analysis
  - Independence axiom analysis (coupled/redundant/ideal specifications)
  - Design matrix evaluation
  - Information content assessment
  - This is an optional command, not part of the standard flow
- **Case Study Examples**: Condensed walkthroughs for learning
  - `crm-example.md` - CRM system from business context to requirements
  - `microer-example.md` - Renewable energy system (technical domain)
- **C/P Completeness Markers**: Enhanced traceability with Complete/Partial indicators
  - Two-stage validation (CP→CN and CN→FR)
  - Completeness rules for better coverage analysis
- **Problem Decomposition Guidance**: When and how to break down CPs
  - Decomposition triggers and heuristics
  - Numbering conventions (CP.1 → CP.1.1, CP.1.2)
  - Real examples from case studies
- **Expanded CN Outcome Classes**: Detailed examples for all four classes
  - Information (most common)
  - Control (supervisory systems)
  - Construction (artifact creation)
  - Entertainment (games, media)
- **Agile Integration Patterns**: New usage patterns for sprint workflows
  - Sprint 0 planning with CPs + Software Glance
  - Per-feature CP→CN→FR chains
  - Minimal viable SRS approach

### Changed

- Updated `zigzag-validator.md` with C/P completeness notation
- Updated `step1-customer-problems.md` with decomposition section
- Updated `step3-customer-needs.md` with expanded outcome examples
- Updated `SKILL.md` with new patterns and complexity reference
- Updated `docs/index.html` with new commands and resources
- Updated `README.md` with new features and version info

## [1.0] - 2026-02-04

### Added

- **AgentSkills Format**: Complete skill implementation following the [AgentSkills standard](https://agentskills.io) for compatibility with GitHub Copilot, Claude Code, Claude.ai, and other AI agents
- **5-Step Methodology**: Full implementation of the Problem-Based SRS methodology:
  - Step 1: Customer Problems (CP) - Identify the WHY
  - Step 2: Software Glance - High-level solution overview
  - Step 3: Customer Needs (CN) - Define the WHAT
  - Step 4: Software Vision - Architecture and constraints
  - Step 5: Functional Requirements (FR) - Specify the HOW
- **ZigZag Validator**: Traceability validation ensuring all requirements trace back to business problems
- **Python Test Infrastructure**: Tests for validating skills are maintained in the [isolated tests repository](https://github.com/RafaelGorski/Problem-Based-SRS-Isolated-Tests)
- **Reference Documentation**: Detailed guides for each methodology step in `skills/problem-based-srs/references/`
- **AgentSkills Best Practices**: Documentation on creating and maintaining skills following the open standard
- **Multi-Agent Support**: Installation instructions for GitHub Copilot, Claude Code, Claude.ai, Gemini CLI, Cline, Goose, and Codex
- **Content Restrictions**: Guidelines for FR/NFR file generation to maintain consistency
- **Website**: Static site in `docs/` with methodology overview and quick start guide

### Changed

- Consolidated to AgentSkills format only (removed legacy prompt formats)
- Moved copilot instructions to standard `.github` location
- Renamed coordinator file to `problem-based-srs.md` for clarity
- Ensured step5 reference uses single H1 for valid markdown structure

### Contributors

This release includes contributions from the following PRs:

- PR #1: Add Problem-Based SRS prompts and AI agent integration
- PR #2: Move copilot instructions to standard .github location
- PR #4: Rename srs-coordinator.prompt.md to problem-based-srs.md
- PR #5: Add Python test infrastructure for AgentSkills validation (moved to [isolated tests repo](https://github.com/RafaelGorski/Problem-Based-SRS-Isolated-Tests))
- PR #6: Restore README documentation and integrate new installation tips
- PR #7: Ensure step5 reference uses single H1 for valid markdown structure
- PR #8: Add content restrictions to FR/NFR file generation
- PR #9: Remove prompts, consolidate to AgentSkills format only
- PR #10: Add AgentSkills reference documentation and update copilot instructions

[1.2]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.2
[1.1]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.1
[1.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.0
