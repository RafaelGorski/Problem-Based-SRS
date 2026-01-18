# GitHub Copilot Instructions for Problem-Based SRS

## Project Overview
This repository provides AgentSkills and guidance for following a Problem-Based Software Requirements Specification (SRS) methodology. The focus is on enabling AI-assisted requirements engineering through structured, problem-first approaches.

The repository now follows the **[AgentSkills](https://agentskills.io)** standard - an open format maintained by Anthropic for giving agents new capabilities and expertise.

## Core Principles
1. **Problem-First Thinking**: Always identify the problem before proposing solutions
2. **Lightweight Methodology**: Favor simplicity over complex frameworks
3. **AI-Native Design**: Content designed for consumption by AI agents (following AgentSkills standard)
4. **Practical Guidance**: Focus on actionable skills and templates

## When Working on This Repository

### Skills Development (AgentSkills Format)
- Skills are located in the `skills/` directory
- Each skill has a `SKILL.md` file with YAML frontmatter (name, description, license)
- Description field is critical - it determines when the skill triggers
- Keep SKILL.md content under 500 lines (use references/ for detailed docs)
- Follow the AgentSkills specification: https://agentskills.io/specification
- Test skills by using them in practice

### File Organization
- **skills/**: AgentSkills format (Claude Code, Claude.ai)
  - Each skill is a self-contained directory with SKILL.md
  - Can include optional subdirectories: scripts/, references/, assets/
- **.github/prompts/**: GitHub Copilot prompt files (VS Code, Visual Studio, JetBrains)
  - Standard `.prompt.md` files with YAML frontmatter
- **docs/**: Research papers and methodology documentation

### Code Style
- This is primarily a documentation repository
- Any code examples should be language-agnostic where possible
- Use clear, readable formatting in examples

## Terminology
- **SRS**: Software Requirements Specification
- **Problem-Based**: Requirements methodology that starts with problem identification
- **Prompt**: A structured instruction designed for AI agent consumption
- **AI Agent**: Tools like GitHub Copilot, Claude Code, or similar assistants

## Quality Standards
- Accuracy in requirements engineering concepts
- Clarity in prompt instructions
- Completeness in examples and templates
- Consistency in structure and formatting
