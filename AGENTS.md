# GitHub Copilot Instructions for Problem-Based SRS

## Project Overview
This repository provides AgentSkills for following a Problem-Based Software Requirements Specification (SRS) methodology. The focus is on enabling AI-assisted requirements engineering through structured, problem-first approaches.

The repository follows the **[AgentSkills](https://agentskills.io)** standard and the **Claude Code Plugins** layout. Compatibility priority is **GitHub Copilot first**, then **Claude Code/Claude.ai**.

## Core Principles
1. **Problem-First Thinking**: Always identify the problem before proposing solutions
2. **Lightweight Methodology**: Favor simplicity over complex frameworks
3. **AI-Native Design**: Content designed for consumption by AI agents (following AgentSkills standard)
4. **Practical Guidance**: Focus on actionable skills and templates

## Compatibility Priority (GHCP → Claude)

- **GitHub Copilot first**: Keep skills and instructions directly usable in Copilot workflows.
- **Claude second**: Keep `.claude-plugin/plugin.json`, `skills/`, `agents/`, `hooks/`, and `settings.json` aligned with Claude plugin docs.
- **Consistency over time**: Keep this file and `.github/copilot-instructions.md` aligned when compatibility guidance changes.

## Repository Structure

```
Problem-Based-SRS/
├── agents/
│   └── problem-based-srs/       # Agent orchestrator
│       └── AGENT.md
├── skills/
│   ├── problem-based-srs/       # Main orchestrator skill
│   │   ├── SKILL.md
│   │   └── references/          # Examples only
│   ├── customer-problems/       # Step 1: WHY
│   ├── software-glance/         # Step 2: High-level view
│   ├── customer-needs/          # Step 3: WHAT
│   ├── software-vision/         # Step 4: Architecture
│   ├── functional-requirements/ # Step 5: HOW
│   ├── zigzag-validator/        # Traceability validation
│   └── complexity-analysis/     # Optional: Axiomatic Design
├── docs/                        # Research papers and methodology
└── tests/                       # Automated tests
```

## When Working on This Repository

### Skills Development (AgentSkills Format)
- Skills are located in the `skills/` directory
- Each skill has a `SKILL.md` file with YAML frontmatter (name, description, license)
- Description field is critical - it determines when the skill triggers
- Keep SKILL.md content under 500 lines (use references/ for detailed docs)
- Follow the AgentSkills specification: https://agentskills.io/specification
- Test skills by using them in practice

### File Organization
- **agents/**: Agent orchestrators that coordinate multiple skills
- **skills/**: AgentSkills format (Claude Code, Claude.ai, GitHub Copilot)
  - Each skill is a self-contained directory with SKILL.md
  - Can include optional subdirectories: scripts/, references/, assets/
- **docs/**: Research papers and methodology documentation

### Code Style
- This is primarily a documentation repository
- Any code examples should be language-agnostic where possible
- Use clear, readable formatting in examples

## Terminology
- **SRS**: Software Requirements Specification
- **Problem-Based**: Requirements methodology that starts with problem identification
- **Skill**: A structured capability module designed for AI agent consumption (AgentSkills standard)
- **Agent**: An orchestrator that coordinates multiple skills
- **AI Agent**: Tools like GitHub Copilot, Claude Code, or similar assistants

## Quality Standards
- Accuracy in requirements engineering concepts
- Clarity in skill instructions
- Completeness in examples and templates
- Consistency in structure and formatting
