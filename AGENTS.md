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
- **Claude second**: Keep `.claude-plugin/plugin.json`, `skills/`, `agents/`, and `settings.json` aligned with Claude plugin docs.
- **Consistency over time**: Keep compatibility guidance consistent when it changes.

## Repository Structure

```
Problem-Based-SRS/
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
│   └── srs-navigator/           # Canvas extension: graph UX + bundled skills
├── .spec/crm-system.json        # Demo specification for the navigator
├── docs/                        # Research papers and methodology
└── settings.json                # Default plugin settings
```

Run `/live` to open the **SRS Navigator** canvas and explore a specification as an
interactive graph (Customer Problems → Customer Needs → Requirements) inside the GitHub
Copilot app.

## When Working on This Repository

### Skills Development (AgentSkills Format)
- The methodology lives in a single skill: `skills/problem-based-srs/`
- `SKILL.md` is the orchestrator (YAML frontmatter: name, description, license); each
  action is a plain-markdown file at `reference/<action>.md` (filename == action)
- Description field is critical - it determines when the skill triggers
- Keep SKILL.md content under 500 lines (use `reference/` for detailed docs)
- Follow the AgentSkills specification: https://agentskills.io/specification
- Test skills by using them in practice

### File Organization
- **agents/**: Agent orchestrators that coordinate the skill
- **skills/problem-based-srs/**: the single AgentSkills-format skill (Claude Code,
  Claude.ai, GitHub Copilot) — `SKILL.md` orchestrator plus `reference/<action>.md`
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

