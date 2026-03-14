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
3. **Consistency over time**: Keep this file and `AGENTS.md` aligned when compatibility guidance changes.

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

| Step | Skill |
|------|-------|
| 0. Business Context (CONTEXT) | `skills/business-context/SKILL.md` |
| 1. Customer Problems (WHY) | `skills/customer-problems/SKILL.md` |
| 2. Software Glance | `skills/software-glance/SKILL.md` |
| 3. Customer Needs (WHAT) | `skills/customer-needs/SKILL.md` |
| 4. Software Vision | `skills/software-vision/SKILL.md` |
| 5. Functional Requirements (HOW) | `skills/functional-requirements/SKILL.md` |
| Validation | `skills/zigzag-validator/SKILL.md` |
| Complexity (Optional) | `skills/complexity-analysis/SKILL.md` |
| Orchestrator | `skills/problem-based-srs/SKILL.md` |
| Agent | `agents/problem-based-srs/AGENT.md` |

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
2. **Create a Plan**: Present a clear plan of what will be changed/created/deleted
3. **Ask for Confirmation**: Wait for user approval before executing
4. **Execute**: Only after confirmation, proceed with the changes
5. **Verify**: Show what was done and confirm completion

**Example iteration workflow:**
```
User: "Analyze the codebase and identify testing requirements"

AI: "I'll analyze using Problem-Based SRS methodology.
     Loading: skills/problem-based-srs/SKILL.md
     
     [Applies 5-step process from source files]
     
     Plan:
     1. Save analysis to spec/NFR.2.0.md
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
│   ├── problem-based-srs/       # Main skill for SRS methodology
│   │   ├── SKILL.md
│   │   └── references/          # Examples only
│   ├── business-context/        # Step 0: Business context and principles
│   ├── customer-problems/       # Step 1: WHY
│   ├── software-glance/         # Step 2: High-level view
│   ├── customer-needs/          # Step 3: WHAT
│   ├── software-vision/         # Step 4: Architecture
│   ├── functional-requirements/ # Step 5: HOW
│   ├── zigzag-validator/        # Traceability validation
│   └── complexity-analysis/     # Optional: Axiomatic Design
├── hooks/
│   └── hooks.json               # Hook configurations
├── settings.json                # Default plugin settings
└── docs/                        # Documentation
```

### Skills Development (AgentSkills Format)
- Skills are located in the `skills/` directory
- Each skill has a `SKILL.md` file with YAML frontmatter (name, description, license)
- Description field is critical - it determines when the skill triggers
- Keep SKILL.md content under 500 lines (use references/ for detailed docs)
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
- **`.claude-plugin/`**: Plugin manifest (plugin.json) defining plugin metadata
- **`skills/`**: AgentSkills (Claude Code, Claude.ai, GitHub Copilot)
  - Each skill is a self-contained directory with SKILL.md
  - Can include optional subdirectories: scripts/, references/, assets/
- **`hooks/`**: Hook configurations for event handlers (hooks.json)
- **`settings.json`**: Default plugin settings
- **`docs/`**: Documentation, research papers, methodology guides
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

### Problem-Based SRS Commands
```
/business-context          # Establish Business Context
/customer-problems        # Generate Customer Problems
/software-glance          # Create Software Glance
/customer-needs           # Generate Customer Needs
/software-vision          # Build Software Vision
/functional-requirements  # Specify Functional Requirements
/zigzag-validator         # Validate traceability
/problem-based-srs        # Full methodology orchestration
```

### Traceability Chain
```
CP (WHY) → CN (WHAT) → FR (HOW)
