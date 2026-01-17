# GitHub Copilot Integration Guide

## Overview

This guide explains how to use Problem-Based SRS prompts with GitHub Copilot and GitHub Copilot Chat to improve requirements gathering, analysis, and documentation.

## Prerequisites

- GitHub Copilot subscription (Individual, Business, or Enterprise)
- VS Code, Visual Studio, JetBrains IDE, or Neovim with GitHub Copilot extension
- Access to GitHub Copilot Chat feature

## Integration Methods

### Method 1: Using Copilot Chat with Prompt Files (Recommended)

GitHub Copilot Chat can read and use context from your workspace files.

#### Step 1: Add Prompts to Your Project

1. Clone or copy the Problem-Based SRS prompts into your project:
   ```bash
   mkdir -p .ai-prompts
   cp /path/to/Problem-Based-SRS/prompts/* .ai-prompts/
   ```

2. Or add as a git submodule:
   ```bash
   git submodule add https://github.com/RafaelGorski/Problem-Based-SRS.git .ai-prompts/srs
   ```

#### Step 2: Reference Prompts in Copilot Chat

**Option A: Use @workspace with file reference**
```
@workspace Use the prompt in .ai-prompts/01-problem-identification.md to help me analyze the problems our project needs to solve.
```

**Option B: Direct file reference**
```
Following the guidance in #file:.ai-prompts/01-problem-identification.md, help me identify and document the problems in our user authentication system.
```

**Option C: Copy-paste prompt content**
```
I want you to act as described in this prompt:

[Paste content from prompt file]

Now help me with...
```

#### Step 3: Work Through SRS Phases

**Phase 1: Problem Identification**
```
@workspace Using #file:.ai-prompts/01-problem-identification.md as a guide, help me analyze the problems with our current inventory management system. Start by asking me about stakeholders.
```

**Phase 2: Requirements Elicitation**
```
@workspace Based on the problem analysis we just completed, use #file:.ai-prompts/02-requirements-elicitation.md to help me gather requirements for the new inventory system.
```

**Phase 3: Requirements Specification**
```
@workspace Using #file:.ai-prompts/03-requirements-specification.md, help me create a formal SRS document from the requirements we've gathered. Start with the functional requirements.
```

**Phase 4: Requirements Validation**
```
@workspace Following #file:.ai-prompts/04-requirements-validation.md, review the SRS document in #file:docs/SRS.md and identify any issues, ambiguities, or gaps.
```

### Method 2: Using Copilot Chat Commands

Create custom slash commands (if your organization supports this) for quick access to SRS phases.

#### Example Custom Commands Configuration

Add to your workspace `.github/copilot-instructions.md`:

```markdown
# SRS Analysis Commands

When user types `/srs-problem`, act as a requirements analyst following the Problem-Based SRS methodology:
- Guide through problem identification
- Ask about stakeholders and pain points
- Document current state and challenges
- Help prioritize problems

When user types `/srs-elicit`, help gather requirements:
- Create user stories
- Identify functional and non-functional requirements
- Define acceptance criteria
- Document constraints

When user types `/srs-specify`, help create formal specifications:
- Structure requirements hierarchically
- Apply consistent formatting
- Create traceability matrix
- Generate supporting documentation

When user types `/srs-validate`, review requirements:
- Check completeness and consistency
- Identify ambiguities
- Verify testability
- Assess feasibility
```

### Method 3: Inline Code Comments

Use prompts as inline comments when documenting requirements in code:

```javascript
// REQUIREMENT: FR-001
// Following Problem-Based SRS methodology:
// Problem: Users spend 5+ minutes manually entering repetitive data
// Solution: Auto-populate form fields from previous entries
// Acceptance: Form completion time reduced to < 60 seconds

async function autoPopulateForm(userId) {
  // Implementation here
}
```

### Method 4: GitHub Issues and Pull Requests

Use SRS prompts when creating issues or PRs:

**Issue Template Example:**
```markdown
## Problem Statement
<!-- Use Phase 1 prompt guidance -->
**Problem**: [Clear description]
**Impact**: [Who is affected]
**Frequency**: [How often]
**Root Cause**: [Underlying cause]

## Proposed Requirements
<!-- Use Phase 2 prompt guidance -->
**User Story**: As a [role], I want [action] so that [benefit]

**Acceptance Criteria**:
- [ ] Given [context], When [action], Then [result]
```

## Best Practices

### 1. Start with Context

Always provide Copilot with context about your project:
```
@workspace Our project is an e-commerce platform built with React and Node.js. We're following Problem-Based SRS methodology to document requirements for a new checkout flow.
```

### 2. Use Iterative Refinement

Work through prompts incrementally:
```
@workspace Using the problem identification prompt, first help me identify stakeholders for our checkout improvement project.

[After stakeholders are identified]

@workspace Now help me document the current state and pain points for each stakeholder we identified.
```

### 3. Maintain Documentation

Keep SRS documents in your repo where Copilot can reference them:
```
project/
├── docs/
│   ├── problems/
│   │   └── checkout-problems.md
│   ├── requirements/
│   │   └── checkout-requirements.md
│   └── srs/
│       └── checkout-srs.md
└── .ai-prompts/
    └── [SRS prompts]
```

### 4. Use Follow-up Questions

Leverage Copilot's conversational ability:
```
@workspace Review this requirement for clarity: "The system should be fast."

[Copilot suggests improvement]

Good! Now check this one: "Users should be able to easily manage their profiles."
```

### 5. Cross-reference Documents

Help Copilot connect the dots:
```
@workspace Compare the requirements in #file:docs/requirements/checkout-requirements.md with the problems identified in #file:docs/problems/checkout-problems.md. Are all problems addressed?
```

## Example Workflow

### Complete SRS Process with Copilot

```
# Step 1: Initialize
@workspace I want to follow Problem-Based SRS methodology to document requirements for a new feature. Let's start with problem identification using #file:.ai-prompts/01-problem-identification.md

# Step 2: Identify Problems
[Work with Copilot through stakeholder identification, current state analysis, etc.]

# Step 3: Document Problems
@workspace Create a problem analysis document based on our discussion and save it to docs/problems/feature-problems.md

# Step 4: Elicit Requirements
@workspace Now use #file:.ai-prompts/02-requirements-elicitation.md to help me gather requirements for the problems we identified.

# Step 5: Document Requirements
@workspace Create a requirements document in docs/requirements/feature-requirements.md with all the requirements we discussed.

# Step 6: Create Formal SRS
@workspace Using #file:.ai-prompts/03-requirements-specification.md, create a formal SRS document in docs/srs/feature-srs.md based on our requirements.

# Step 7: Validate
@workspace Review the SRS using #file:.ai-prompts/04-requirements-validation.md and create a validation report.
```

## Tips for Effective Use

1. **Be Specific**: Instead of "help with requirements", say "help me write acceptance criteria for the user authentication requirement"

2. **Reference Previous Context**: Use "as we discussed earlier" or reference specific documents

3. **Ask for Structured Output**: Request specific formats (markdown tables, bullet lists, numbered steps)

4. **Validate Suggestions**: Copilot is an assistant, not an oracle. Review and refine its suggestions

5. **Save Conversations**: Keep important SRS discussions in markdown files for future reference

## Troubleshooting

**Issue**: Copilot doesn't seem to understand the prompt structure
- **Solution**: Reference the prompt file explicitly with #file: syntax
- **Solution**: Copy key sections of the prompt directly into your query

**Issue**: Responses are too generic
- **Solution**: Provide more context about your specific project
- **Solution**: Ask follow-up questions to drill deeper

**Issue**: Copilot loses context in long conversations
- **Solution**: Save progress to files and start fresh conversations with file references
- **Solution**: Summarize previous discussion points in new prompts

## Advanced: GitHub Copilot Workspace (Beta)

If you have access to GitHub Copilot Workspace:

1. **Create SRS Task**: Start a workspace task specifically for SRS activities
2. **Multi-file Editing**: Edit problem docs, requirements, and SRS simultaneously
3. **Validation Runs**: Run validation checks across all requirements documents

```
Create a task: "Create complete SRS following Problem-Based methodology for [feature]"
- Include all four phase prompts as context
- Generate all documents (problems, requirements, SRS, validation)
- Link requirements to problems automatically
```

## Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [GitHub Copilot Chat Documentation](https://docs.github.com/en/copilot/using-github-copilot/asking-github-copilot-questions-in-your-ide)
- Problem-Based SRS Repository: https://github.com/RafaelGorski/Problem-Based-SRS

## Feedback

Found this integration useful? Have suggestions? Please contribute to the repository or open an issue.
