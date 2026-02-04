# GitHub Copilot Instructions for Problem-Based SRS

## Project Overview
This repository provides AgentSkills for following a Problem-Based Software Requirements Specification (SRS) methodology. The focus is on enabling AI-assisted requirements engineering through structured, problem-first approaches.

The repository follows the **[AgentSkills](https://agentskills.io)** standard - an open format for giving agents new capabilities and expertise.

## Core Principles
1. **Problem-First Thinking**: Always identify the problem before proposing solutions
2. **Lightweight Methodology**: Favor simplicity over complex frameworks
3. **AI-Native Design**: Content designed for consumption by AI agents (following AgentSkills standard)
4. **Practical Guidance**: Focus on actionable skills and templates

---

## 🔄 Problem-Based SRS Iteration Guidelines

### Using the Methodology

When analyzing or working with this repository, **use the Problem-Based SRS methodology** to iterate on problems, needs, and requirements (both functional and non-functional).

**Load and follow the methodology from these source files:**

| Step | Skill Reference |
|------|-----------------|
| 1. Customer Problems (WHY) | `skills/problem-based-srs/references/step1-customer-problems.md` |
| 2. Software Glance | `skills/problem-based-srs/references/step2-software-glance.md` |
| 3. Customer Needs (WHAT) | `skills/problem-based-srs/references/step3-customer-needs.md` |
| 4. Software Vision | `skills/problem-based-srs/references/step4-software-vision.md` |
| 5. Functional Requirements (HOW) | `skills/problem-based-srs/references/step5-functional-requirements.md` |
| Validation | `skills/problem-based-srs/references/zigzag-validator.md` |
| Orchestrator | `skills/problem-based-srs/SKILL.md` |

### Artifact Naming Convention

- **Customer Problems**: `CP.{n}` or `CP.{n}.{m}` (e.g., CP.01, CP.01.1)
- **Customer Needs**: `CN.{cp}.{n}` (e.g., CN.01.1 traces to CP.01)
- **Functional Requirements**: `FR.{cp}.{cn}.{n}` (e.g., FR.01.1.1 traces to CN.01.1)
- **Non-Functional Requirements**: `NFR.{version}.md` (e.g., NFR.1.0.md)

### Storage Location for Iterations

Save all requirement iterations in the `spec/` folder:
```
spec/
├── README.md                    # Test suite overview
├── NFR.{version}.md             # Non-functional requirements analysis
├── static/                      # Static validation specs
├── semantic/                    # Semantic validation specs
├── integration/                 # Integration test specs
└── fixtures/                    # Test data (valid/invalid examples)
```

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
| `spec:` | Test specifications | `spec: Add traceability validation tests` |
| `refactor:` | Restructuring without changing behavior | `refactor: Reorganize spec folder` |

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
- **skills/**: AgentSkills format (Claude Code, Claude.ai, GitHub Copilot)
  - Each skill is a self-contained directory with SKILL.md
  - Can include optional subdirectories: scripts/, references/, assets/
- **docs/**: Documentation, research papers, methodology guides
- **spec/**: Test specifications and requirement iterations

### Code Style
- This is primarily a documentation repository
- Any code examples should be language-agnostic where possible
- Use clear, readable formatting in examples

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
/cp           # Generate Customer Problems
/glance       # Create Software Glance
/cn           # Generate Customer Needs
/vision       # Build Software Vision
/fr           # Specify Functional Requirements
/zigzag       # Validate traceability
/problem-based-srs  # Full methodology orchestration
```

### Traceability Chain
```
CP (WHY) → CN (WHAT) → FR (HOW)
