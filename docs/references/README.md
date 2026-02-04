# Documentation References

This directory contains consolidated reference documentation for developing and maintaining Agent Skills in this repository.

## Available References

| Reference | Description | Source |
|-----------|-------------|--------|
| [agentskills-specification.md](agentskills-specification.md) | Complete format specification for Agent Skills (SKILL.md structure, fields, directories) | [agentskills.io](https://agentskills.io/specification) |
| [agentskills-best-practices.md](agentskills-best-practices.md) | Best practices for authoring effective Agent Skills | [Anthropic Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |

## Quick Reference

### SKILL.md Required Fields

```yaml
---
name: skill-name           # Max 64 chars, lowercase + hyphens
description: What and when # Max 1024 chars, third person
---
```

### Directory Structure

```
skill-name/
├── SKILL.md          # Required: instructions + metadata
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
└── assets/           # Optional: templates, resources
```

### Key Guidelines

1. **Keep SKILL.md under 500 lines** - Use references for detailed docs
2. **Description is critical** - Include WHAT and WHEN to use
3. **Use third person** - "Processes files" not "I process files"
4. **One level deep** - Don't nest reference → reference → reference
5. **Test with all models** - What works for Opus may need detail for Haiku

## Usage

When modifying skills in this repository:

1. **Before changes**: Review the specification for structural requirements
2. **During authoring**: Follow best practices for content organization
3. **After changes**: Validate using `skills-ref validate ./skill-name`

## External Resources

- **Official Spec**: [agentskills.io](https://agentskills.io)
- **Example Skills**: [github.com/anthropics/skills](https://github.com/anthropics/skills)
- **Reference Library**: [github.com/agentskills/agentskills/tree/main/skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref)
