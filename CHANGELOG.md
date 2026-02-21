# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1] - 2026-02-20

### Added

- **Complexity Analysis (`/complexity`)**: Optional Axiomatic Design-based quality analysis
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
- **Python Test Infrastructure**: 57+ tests for validating:
  - YAML frontmatter in AgentSkills
  - Markdown structure and heading hierarchy
  - Traceability ID format (CP.XX → CN.XX.X → FR.XX.X.X)
  - Repository structure compliance
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
- PR #5: Add Python test infrastructure for AgentSkills validation
- PR #6: Restore README documentation and integrate new installation tips
- PR #7: Ensure step5 reference uses single H1 for valid markdown structure
- PR #8: Add content restrictions to FR/NFR file generation
- PR #9: Remove prompts, consolidate to AgentSkills format only
- PR #10: Add AgentSkills reference documentation and update copilot instructions

[1.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.0
