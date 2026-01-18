# GitHub Copilot Instructions for Problem-Based SRS

## Project Overview
This repository provides standalone prompts and guidance for following a Problem-Based Software Requirements Specification (SRS) methodology. The focus is on enabling AI-assisted requirements engineering through structured, problem-first approaches.

## Core Principles
1. **Problem-First Thinking**: Always identify the problem before proposing solutions
2. **Lightweight Methodology**: Favor simplicity over complex frameworks
3. **AI-Native Design**: Content designed for consumption by AI agents
4. **Practical Guidance**: Focus on actionable prompts and templates

## Workflow Guidelines

### Before Taking Action
**CRITICAL: Always plan and get confirmation before executing tasks.**

1. **Understand the Request**: Clarify what the user wants to accomplish
2. **Create a Plan**: Present a clear plan of what will be changed/created/deleted
3. **Ask for Confirmation**: Wait for user approval before executing
4. **Execute**: Only after confirmation, proceed with the changes
5. **Verify**: Show what was done and confirm completion

**Example workflow:**
```
User: "Add a new skill for validation"

AI: "I'll create a new validation skill. Here's my plan:
     1. Create skills/validation/SKILL.md with frontmatter
     2. Add reference to main SKILL.md
     3. Update README.md with new skill info
     
     Proceed? (yes/no)"

User: "yes"

AI: [executes changes] "✓ Validation skill created..."
```

## When Working on This Repository

### Content Creation
- Write prompts that are clear, structured, and self-contained
- Ensure prompts can be used independently without requiring the full repository context
- Focus on guiding users through problem identification before solution design
- Include examples that demonstrate real-world scenarios

### Documentation
- Keep documentation concise and scannable
- Use markdown formatting effectively (headers, lists, code blocks)
- Provide context for why, not just what or how
- Include references to relevant SRS standards (IEEE 830, etc.) where appropriate

### File Organization
- **skills/**: AgentSkills format (Claude Code, Claude.ai)
  - Each skill is a self-contained directory with SKILL.md
  - Can include optional subdirectories: scripts/, references/, assets/
- **.github/prompts/**: GitHub Copilot prompt files (VS Code, Visual Studio, JetBrains)
  - Standard `.prompt.md` files with YAML frontmatter
- **docs/**: Documentation, research papers, methodology guides
  - **Place all planning documents, tracking, changelogs, and migration guides here**
  - Keep repository root clean of documentation files
  - Examples: planning docs, roadmaps, changelogs
  - **docs/img/**: Image assets for documentation website
    - Stores rendered PNG diagrams from mermaid sources
  - **docs/helper/**: PowerShell helper scripts for maintenance tasks
    - Contains automation scripts for documentation updates

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

## Helper Scripts

### Rendering Mermaid Diagrams

When updating diagrams in README.md that need to be reflected in docs/index.html:

**Prerequisites:**
Ensure Mermaid CLI is installed:
```powershell
npm install -g @mermaid-js/mermaid-cli
```

**Procedure:**

1. **Extract mermaid diagrams** from README.md and save as `.mmd` files in `docs/img/`
   - Create one `.mmd` file per diagram
   - Use descriptive names (e.g., `5-step-process.mmd`, `artifact-traceability.mmd`)

2. **Render diagrams to PNG:**
   ```powershell
   .\docs\helper\render-diagrams.ps1
   ```
   - Converts all `.mmd` files in `docs/img/` to PNG with transparent backgrounds
   - Shows progress and confirms success for each diagram

3. **Clean up temporary files:**
   ```powershell
   .\docs\helper\cleanup-mmd.ps1
   ```
   - Removes all `.mmd` source files after rendering
   - Displays remaining files in the img folder

4. **Update docs/index.html** to reference the new PNG files

**Available Scripts:**
- `docs/helper/render-diagrams.ps1` - Batch render all .mmd files to PNG
- `docs/helper/cleanup-mmd.ps1` - Remove temporary .mmd files after rendering

**Manual single diagram rendering:**
```powershell
mmdc -i docs/img/diagram-name.mmd -o docs/img/diagram-name.png -b transparent
```
