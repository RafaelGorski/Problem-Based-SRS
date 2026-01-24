# Test Suite for Problem-Based SRS

This directory contains automated tests for validating the Problem-Based SRS skills and prompts according to AgentSkills best practices and the methodology requirements.

## Overview

The test suite validates:
- ✅ YAML frontmatter structure and completeness
- ✅ Markdown structure and formatting
- ✅ File organization and naming conventions
- ✅ Content quality and required sections
- ✅ Traceability chain (CP → CN → FR)
- ✅ Workflow integration and step coordination

## Test Categories

### Unit Tests (`tests/unit/`)

Individual validation of specific aspects:

- **skill-frontmatter.test.js** - Validates SKILL.md YAML frontmatter
  - Required fields: name, description, license
  - Field format validation
  - Line count limits (500 lines max)
  
- **prompt-frontmatter.test.js** - Validates .prompt.md YAML frontmatter
  - Required fields and structure
  - Valid mode values (agent, edit, insert)
  - No duplicate keys

- **markdown-structure.test.js** - Validates markdown formatting
  - Single H1 per file
  - No skipped heading levels
  - Code blocks with language tags
  - Internal link validity

- **file-structure.test.js** - Validates repository organization
  - Directory structure (skills/, .github/prompts/)
  - Naming conventions
  - Required files (README.md, LICENSE)

### Integration Tests (`tests/integration/`)

End-to-end validation of the methodology:

- **workflow-validation.test.js** - Validates complete Problem-Based SRS workflow
  - All 5 step prompts exist and reference their position
  - Coordinator prompt references all steps
  - Traceability chain enforcement
  - Quality standards and examples
  - SKILL.md completeness

## Installation

```bash
npm install
```

This installs the test dependencies:
- Jest (test framework)
- js-yaml (YAML parsing)
- glob (file matching)

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
npm run test:unit          # Run only unit tests
npm run test:integration   # Run only integration tests
```

### Watch mode (for development)
```bash
npm run test:watch
```

### Coverage report
```bash
npm run test:coverage
```

## Test Results

Tests follow the **AgentSkills specification** best practices:

### ✅ Structure Validation
- Each SKILL.md has valid YAML frontmatter
- All fields follow the AgentSkills standard
- File organization matches recommended structure

### ✅ Quality Validation
- SKILL.md files are under 500 lines (performance requirement)
- All code blocks have language tags
- Heading hierarchy is consistent
- No broken internal links

### ✅ Methodology Validation
- 5-step process is complete
- Traceability notation is enforced (FR.X → CN.Y → CP.Z)
- Quality standards (ISO/IEC/IEEE 29148) are referenced
- Each step references its position in the process

## Writing New Tests

### Test File Naming
- Unit tests: `tests/unit/<feature>.test.js`
- Integration tests: `tests/integration/<feature>.test.js`

### Helper Functions
Use the provided helpers in `tests/helpers/`:
- `fileUtils.js` - File system operations
- `yamlParser.js` - YAML frontmatter parsing
- `markdownParser.js` - Markdown structure analysis

### Example Test
```javascript
const { findSkillFiles, readFile } = require('../helpers/fileUtils');
const { extractFrontmatter } = require('../helpers/yamlParser');

describe('My Feature Test', () => {
  test('Should validate something', async () => {
    const files = await findSkillFiles();
    expect(files.length).toBeGreaterThan(0);
  });
});
```

## Continuous Integration

These tests should be run:
- Before committing changes
- In CI/CD pipelines
- When adding new skills or prompts

## References

- [AgentSkills Specification](https://agentskills.io/specification)
- [AgentSkills Best Practices](https://deepwiki.com/heilcheng/awesome-agent-skills/4.4-best-practices-and-guidelines)
- [Problem-Based SRS Methodology](../docs/)

## Traceability

All tests trace back to customer problems defined in `spec/`:

```
CP.01 (Core Problem)
├── FR.01.1.x → Static Structure Tests (YAML, Markdown)
├── FR.01.2.x → Traceability Tests
├── FR.01.3.x → Multi-Model Tests
└── FR.01.4.x → Completeness Tests
```

## Troubleshooting

### Tests fail with "Cannot find module"
Run `npm install` to ensure all dependencies are installed.

### Tests fail on file paths
Tests use relative paths from the project root. Ensure you're running tests from the repository root directory.

### YAML parsing errors
Check that frontmatter is properly formatted:
```yaml
---
name: my-skill
description: A clear description
license: MIT
---
```

## Contributing

When adding new skills or prompts:

1. Run the test suite to validate your changes
2. Fix any failing tests
3. Add new tests if introducing new patterns
4. Ensure all tests pass before submitting PR

See [CONTRIBUTING.md](../CONTRIBUTING.md) for more details.
