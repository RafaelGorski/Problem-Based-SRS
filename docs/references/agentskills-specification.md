# Agent Skills Specification Reference

> **Source**: [agentskills.io](https://agentskills.io) - Official Agent Skills specification maintained by [Anthropic](https://anthropic.com)
>
> This reference document is a consolidated guide for skill development in this repository. For the latest specification, visit the [official documentation](https://agentskills.io/specification).

## What Are Agent Skills?

Agent Skills are folders of instructions, scripts, and resources that agents can discover and use to perform tasks more accurately and efficiently. They use **progressive disclosure** to manage context efficiently:

1. **Discovery**: At startup, agents load only the name and description of each available skill
2. **Activation**: When a task matches a skill's description, the agent reads the full `SKILL.md` instructions
3. **Execution**: The agent follows instructions, optionally loading referenced files or executing scripts as needed

## Directory Structure

A skill is a directory containing at minimum a `SKILL.md` file:

```
skill-name/
├── SKILL.md          # Required: instructions + metadata
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
└── assets/           # Optional: templates, resources
```

## SKILL.md Format

The `SKILL.md` file must contain YAML frontmatter followed by Markdown content.

### Required Frontmatter

```yaml
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

### Optional Frontmatter Fields

```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents.
license: Apache-2.0
compatibility: Requires git, docker, jq
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(git:*) Bash(jq:*) Read
---
```

### Field Reference

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 characters. Lowercase letters, numbers, and hyphens only. Must not start or end with a hyphen. Must match the parent directory name. |
| `description` | Yes | Max 1024 characters. Non-empty. Describes what the skill does and when to use it. |
| `license` | No | License name or reference to a bundled license file. |
| `compatibility` | No | Max 500 characters. Environment requirements (product, packages, network access). |
| `metadata` | No | Arbitrary key-value mapping for additional metadata. |
| `allowed-tools` | No | Space-delimited list of pre-approved tools (Experimental). |

### Name Field Rules

The `name` field:
- Must be 1-64 characters
- May only contain lowercase alphanumeric characters and hyphens (`a-z`, `0-9`, `-`)
- Must not start or end with `-`
- Must not contain consecutive hyphens (`--`)
- Must match the parent directory name

**Valid examples:**
```yaml
name: pdf-processing
name: data-analysis
name: code-review
```

**Invalid examples:**
```yaml
name: PDF-Processing    # uppercase not allowed
name: -pdf              # cannot start with hyphen
name: pdf--processing   # consecutive hyphens not allowed
```

### Description Field

The `description` field:
- Must be 1-1024 characters
- Should describe both what the skill does AND when to use it
- Should include specific keywords that help agents identify relevant tasks
- **Must be written in third person** (not "I can help" or "You can use")

**Good example:**
```yaml
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
```

**Poor example:**
```yaml
description: Helps with PDFs.
```

## Body Content

The Markdown body after the frontmatter contains the skill instructions. There are no format restrictions. Recommended sections:

- Step-by-step instructions
- Examples of inputs and outputs
- Common edge cases

## Optional Directories

### scripts/

Contains executable code that agents can run:
- Should be self-contained or document dependencies
- Include helpful error messages
- Handle edge cases gracefully

### references/

Contains additional documentation loaded on demand:
- `REFERENCE.md` - Detailed technical reference
- Domain-specific files (`finance.md`, `legal.md`, etc.)
- Keep individual files focused for efficient context usage

### assets/

Contains static resources:
- Templates (document, configuration)
- Images (diagrams, examples)
- Data files (schemas, lookup tables)

## Progressive Disclosure

Skills should be structured for efficient use of context:

1. **Metadata** (~100 tokens): `name` and `description` loaded at startup for all skills
2. **Instructions** (< 5000 tokens recommended): Full `SKILL.md` body loaded when activated
3. **Resources** (as needed): Files in `scripts/`, `references/`, `assets/` loaded only when required

**Key Guidelines:**
- Keep main `SKILL.md` under 500 lines
- Move detailed reference material to separate files
- Keep file references one level deep from SKILL.md
- Avoid deeply nested reference chains

## File References

When referencing other files in your skill, use relative paths from the skill root:

```markdown
See [the reference guide](references/REFERENCE.md) for details.

Run the extraction script:
scripts/extract.py
```

## Validation

Use the [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) reference library to validate skills:

```bash
skills-ref validate ./my-skill
```

This checks that your `SKILL.md` frontmatter is valid and follows all naming conventions.

---

## Additional Resources

- **Official Documentation**: [agentskills.io](https://agentskills.io)
- **Specification**: [agentskills.io/specification](https://agentskills.io/specification)
- **Example Skills**: [github.com/anthropics/skills](https://github.com/anthropics/skills)
- **Reference Library**: [github.com/agentskills/agentskills/tree/main/skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref)
- **Best Practices**: See [agentskills-best-practices.md](agentskills-best-practices.md)
