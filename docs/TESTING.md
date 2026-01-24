# Testing Strategy for Problem-Based SRS

## Overview

This document describes the testing strategy implemented for validating the Problem-Based SRS skills and prompt files according to AgentSkills best practices.

## Why Testing Matters

Testing ensures that:
1. **Skills load correctly** across different AI platforms (Claude, GitHub Copilot, etc.)
2. **Methodology is consistent** - all 5 steps are present and properly linked
3. **Quality standards are met** - files follow AgentSkills specification
4. **Traceability is enforced** - CP → CN → FR chain is maintained

## Test Categories

### 1. Structure Tests (Unit)

**Purpose:** Validate file format and organization

- ✅ YAML frontmatter exists and is valid
- ✅ Required fields present (name, description, license)
- ✅ Markdown structure follows conventions
- ✅ File naming follows standards
- ✅ Directory layout matches AgentSkills spec

**Why:** Ensures skills load correctly in AI agents without parsing errors.

### 2. Content Quality Tests (Unit)

**Purpose:** Validate content meets quality standards

- ✅ SKILL.md files under 500 lines (performance)
- ✅ Heading hierarchy is consistent
- ✅ Code blocks have language tags
- ✅ Internal links are valid
- ✅ No duplicate YAML keys

**Why:** Maintains fast loading times and readability across platforms.

### 3. Methodology Tests (Integration)

**Purpose:** Validate complete Problem-Based SRS workflow

- ✅ All 5 step prompts exist (cp, glance, cn, vision, fr)
- ✅ Steps reference their position in process
- ✅ Coordinator prompt links all steps
- ✅ Traceability notation enforced (FR.X → CN.Y)
- ✅ Quality checklists present
- ✅ SKILL.md references research paper

**Why:** Ensures the methodology is complete and properly guides users through the 5-step process.

## Best Practices Implemented

Based on [AgentSkills specification](https://agentskills.io/specification):

### 1. File Size Limits
- **SKILL.md:** Maximum 500 lines
- **Rationale:** Faster loading, better context window usage
- **Test:** `skill-frontmatter.test.js`

### 2. Required Frontmatter
```yaml
---
name: skill-name          # lowercase-with-hyphens
description: Clear desc   # Under 500 chars
license: MIT             # Valid SPDX identifier
---
```
- **Test:** `skill-frontmatter.test.js`

### 3. Directory Structure
```
skills/
  skill-name/
    SKILL.md              # Required, entry point
    references/           # Optional, detailed docs
    scripts/              # Optional, automation
    assets/               # Optional, images/files
```
- **Test:** `file-structure.test.js`

### 4. Markdown Quality
- Single H1 per file (except SKILL.md with examples)
- No skipped heading levels (H1 → H3)
- Code blocks with language tags
- Valid internal links
- **Test:** `markdown-structure.test.js`

## Running Tests

### Quick Start
```bash
# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration

# Watch mode (for development)
npm run test:watch
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Test Skills

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Test Results Interpretation

### ✅ All Tests Passing
Your skills and prompts follow AgentSkills best practices and are ready for use.

### ❌ Frontmatter Tests Failing
- Check YAML syntax (proper indentation, no tabs)
- Ensure required fields present: name, description, license
- Verify name follows lowercase-with-hyphens format

### ❌ Structure Tests Failing
- Check heading hierarchy (H1 → H2 → H3, no skips)
- Add language tags to code blocks
- Fix broken internal links

### ❌ Integration Tests Failing
- Ensure all 5 step prompts exist
- Add step position references
- Include quality checklists
- Add traceability notation (FR.X → CN.Y)

## Maintenance

### When to Update Tests

1. **Adding new skills:** Tests auto-discover new SKILL.md files
2. **Adding new prompts:** Tests auto-discover new .prompt.md files
3. **Changing methodology:** Update integration tests
4. **New AgentSkills standards:** Update validation logic

### Test Coverage

Current coverage: **36 tests** covering:
- 7 tests for SKILL.md validation
- 6 tests for .prompt.md validation
- 8 tests for markdown structure
- 9 tests for file organization
- 6 tests for workflow integration

## References

- [AgentSkills Specification](https://agentskills.io/specification)
- [Best Practices Guide](https://deepwiki.com/heilcheng/awesome-agent-skills/4.4-best-practices-and-guidelines)
- [Problem-Based SRS Paper](../docs/)
- [Test Suite README](../tests/README.md)

## Contributing

When contributing:
1. Ensure all tests pass before submitting PR
2. Add tests for new functionality
3. Follow existing test patterns
4. Update documentation if needed

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.
