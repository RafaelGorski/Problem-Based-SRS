# Test Fixtures

This directory contains test fixtures for validating the Problem-Based SRS testing framework.

## Directory Structure

```
fixtures/
├── valid-examples/     # Correctly formatted files for positive testing
└── invalid-examples/   # Incorrectly formatted files for negative testing
```

## Valid Examples

These files demonstrate correct formatting and structure:

- **SKILL.md** - Valid AgentSkills SKILL.md file with all required fields

## Invalid Examples

These files demonstrate common errors for validation testing:

- **no-frontmatter.md** - Missing YAML frontmatter
- **invalid-yaml.md** - Malformed YAML in frontmatter
- **multiple-h1.md** - Multiple H1 headings (violates markdown structure)

## Usage

These fixtures are used by the test suite to verify:
1. Parser correctly handles valid files
2. Validator catches invalid files
3. Error messages are meaningful and actionable

## Adding New Fixtures

When adding new test cases:
1. Add valid examples to `valid-examples/`
2. Add invalid examples to `invalid-examples/`
3. Update this README with descriptions
4. Add corresponding test cases in `tests/` directory
