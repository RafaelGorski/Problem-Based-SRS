# Agent Skills Best Practices Reference

> **Source**: [Anthropic's Official Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
>
> This reference consolidates best practices for authoring effective Agent Skills. For the latest guidance, visit the official documentation.

## Core Principles

### Context Efficiency

Not every token in your Skill has an immediate cost:
- **At startup**: Only metadata (`name` and `description`) from all Skills is pre-loaded
- **On activation**: Claude reads `SKILL.md` only when the Skill becomes relevant
- **On demand**: Additional files are read only as needed

**However**, once Claude loads `SKILL.md`, every token competes with conversation history and other context. Being concise still matters.

### Test with All Models You Plan to Use

Skills act as additions to models, so effectiveness depends on the underlying model:

| Model | Testing Focus |
|-------|---------------|
| **Claude Haiku** (fast, economical) | Does the Skill provide enough guidance? |
| **Claude Sonnet** (balanced) | Is the Skill clear and efficient? |
| **Claude Opus** (powerful reasoning) | Does the Skill avoid over-explaining? |

What works for Opus might need more detail for Haiku. Aim for instructions that work well with all models you plan to support.

---

## Skill Structure

### Naming Conventions

Use **gerund form** (verb + -ing) for Skill names to clearly describe the activity:

**Good naming examples:**
- "Processing PDFs"
- "Analyzing spreadsheets"
- "Managing databases"
- "Testing code"
- "Writing documentation"

**Acceptable alternatives:**
- Noun phrases: "PDF Processing", "Spreadsheet Analysis"
- Action-oriented: "Process PDFs", "Analyze Spreadsheets"

**Avoid:**
- Vague names: "Helper", "Utils", "Tools"
- Overly generic: "Documents", "Data", "Files"
- Inconsistent patterns within your skill collection

### Writing Effective Descriptions

The `description` field enables Skill discovery and should include:
1. **What** the Skill does
2. **When** to use it (triggers/contexts)

**Critical Rules:**

1. **Always write in third person** - The description is injected into the system prompt
   - ✅ Good: "Processes Excel files and generates reports"
   - ❌ Avoid: "I can help you process Excel files"
   - ❌ Avoid: "You can use this to process Excel files"

2. **Be specific and include key terms** - Claude uses the description to choose from potentially 100+ available Skills

**Effective examples:**

```yaml
# PDF Processing skill
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

```yaml
# Git Commit Helper skill
description: Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

**Avoid vague descriptions:**
```yaml
# Bad
description: Helps with documents
description: Processes data
description: Does stuff with files
```

---

## Progressive Disclosure Patterns

`SKILL.md` serves as an overview that points Claude to detailed materials as needed.

### Key Guidelines

- Keep `SKILL.md` body under **500 lines** for optimal performance
- Split content into separate files when approaching this limit
- Use reference files for detailed documentation

### Pattern 1: High-Level Guide with References

```markdown
---
name: PDF Processing
description: Extracts text and tables from PDF files...
---

# PDF Processing

## Quick start
Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features
**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
```

### Pattern 2: Domain-Specific Organization

For Skills with multiple domains, organize content by domain:

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    └── product.md (API usage, features)
```

This ensures Claude only loads relevant domain content.

### Pattern 3: Conditional Details

Show basic content, link to advanced content:

```markdown
# DOCX Processing

## Creating documents
Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents
For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
```

### Avoid Deeply Nested References

Claude may only partially read files referenced from other referenced files.

**Bad (too deep):**
```
SKILL.md → advanced.md → details.md → actual information
```

**Good (one level deep):**
```
SKILL.md → advanced.md
         → reference.md
         → examples.md
```

### Structure Longer Reference Files

For reference files longer than 100 lines, include a table of contents:

```markdown
# API Reference

## Contents
- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns

## Authentication and setup
...
```

---

## Workflows and Feedback Loops

### Use Workflows for Complex Tasks

Break complex operations into clear, sequential steps. Provide a checklist Claude can track:

```markdown
## Research synthesis workflow

Copy this checklist and track your progress:

```
Research Progress:
- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations
```

**Step 1: Read all source documents**
Review each document in the `sources/` directory...
```

### Implement Feedback Loops

**Common pattern**: Run validator → fix errors → repeat

```markdown
## Document editing process

1. Make your edits to `word/document.xml`
2. **Validate immediately**: `python scripts/validate.py`
3. If validation fails:
   - Review the error message
   - Fix the issues
   - Run validation again
4. **Only proceed when validation passes**
```

---

## Content Guidelines

### Avoid Time-Sensitive Information

**Bad (will become wrong):**
```markdown
If you're doing this before August 2025, use the old API.
```

**Good (use "old patterns" section):**
```markdown
## Current method
Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns
<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>
The v1 API used: `api.example.com/v1/messages`
</details>
```

### Use Consistent Terminology

Choose one term and use it throughout:

**Good (consistent):**
- Always "API endpoint"
- Always "field"
- Always "extract"

**Bad (inconsistent):**
- Mix "API endpoint", "URL", "route", "path"
- Mix "field", "box", "element", "control"

---

## Common Patterns

### Template Pattern

Provide templates for output format:

```markdown
## Report structure

ALWAYS use this exact template structure:

```markdown
# [Analysis Title]

## Executive summary
[One-paragraph overview of key findings]

## Key findings
- Finding 1 with supporting data
- Finding 2 with supporting data

## Recommendations
1. Specific actionable recommendation
2. Specific actionable recommendation
```
```

### Examples Pattern

Provide input/output pairs:

```markdown
## Commit message format

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly
Output:
```
fix(reports): correct date formatting in timezone conversion
```
```

### Conditional Workflow Pattern

Guide through decision points:

```markdown
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch

3. Editing workflow:
   - Unpack existing document
   - Modify XML directly
   - Validate after each change
```

---

## Evaluation and Iteration

### Build Evaluations First

**Create evaluations BEFORE writing extensive documentation.**

**Evaluation-driven development:**
1. **Identify gaps**: Run Claude on tasks without a Skill. Document failures
2. **Create evaluations**: Build 3+ scenarios that test these gaps
3. **Establish baseline**: Measure performance without the Skill
4. **Write minimal instructions**: Just enough to address gaps
5. **Iterate**: Execute evaluations, compare, refine

### Develop Skills Iteratively with Claude

Work with one Claude instance ("Claude A") to create a Skill for other instances ("Claude B"):

1. **Complete a task without a Skill**: Work through a problem, notice what context you repeatedly provide
2. **Identify reusable patterns**: What information would help similar future tasks?
3. **Ask Claude A to create a Skill**: "Create a Skill that captures this pattern"
4. **Review for conciseness**: Remove unnecessary explanations
5. **Test with Claude B**: Use the Skill on related tasks
6. **Iterate based on observation**: Refine based on Claude B's behavior

---

## Anti-Patterns to Avoid

### ❌ Windows-Style Paths
Always use forward slashes:
- ✅ `scripts/helper.py`
- ❌ `scripts\helper.py`

### ❌ Too Many Options
Don't present multiple approaches unless necessary:

**Bad:**
```markdown
You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image...
```

**Good:**
```markdown
Use pdfplumber for text extraction:
```python
import pdfplumber
```

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead.
```

### ❌ Vague Descriptions
Avoid descriptions that don't help Claude select the skill.

### ❌ Over-Explaining
Don't repeat general knowledge. Claude already knows standard programming concepts.

---

## Checklist for Effective Skills

### Metadata
- [ ] Name uses gerund form (verb + -ing) or is consistently styled
- [ ] Name is lowercase, max 64 chars, no consecutive hyphens
- [ ] Description explains what AND when to use (max 1024 chars)
- [ ] Description is written in third person
- [ ] Description includes relevant keywords for discovery

### Content
- [ ] SKILL.md is under 500 lines
- [ ] Instructions are clear and actionable
- [ ] Complex workflows have checklists
- [ ] Reference files are organized by domain
- [ ] References are one level deep (not nested)
- [ ] Longer reference files have table of contents

### Quality
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
- [ ] Tested with all target models
- [ ] Includes examples where helpful
- [ ] Validation/feedback loops for complex tasks

---

## Additional Resources

- **Official Best Practices**: [platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- **Specification**: See [agentskills-specification.md](agentskills-specification.md)
- **Example Skills**: [github.com/anthropics/skills](https://github.com/anthropics/skills)
