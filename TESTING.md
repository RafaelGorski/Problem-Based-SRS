# Testing Guide for Problem-Based SRS

This guide explains how to run tests and validate the Problem-Based SRS repository.

## Prerequisites

- Python 3.11 or higher
- pip (Python package manager)

## Installation

Install test dependencies:

```bash
pip install pytest strictyaml
```

Or using the project configuration:

```bash
pip install -e .
pip install -e '.[dev]'
```

## Running Tests

### Run All Tests

```bash
pytest tests/ -v
```

### Run Specific Test Categories

```bash
# Run parser tests only
pytest tests/test_parser.py -v

# Run validator tests only
pytest tests/test_validator.py -v

# Run repository structure tests only
pytest tests/test_repository.py -v
```

### Run Specific Test

```bash
pytest tests/test_parser.py::test_valid_frontmatter -v
```

## Test Categories

### 1. Parser Tests (`test_parser.py`)

Tests YAML frontmatter parsing and traceability ID validation:

- ✅ Valid frontmatter parsing
- ✅ Error handling for missing/invalid YAML
- ✅ SKILL.md metadata extraction
- ✅ Prompt file metadata extraction
- ✅ Traceability ID format validation (CP.XX, CN.XX.X, FR.XX.X.X)

### 2. Validator Tests (`test_validator.py`)

Tests validation logic for skills and prompts:

- ✅ Skill directory validation
- ✅ Name format validation (lowercase, hyphens)
- ✅ Name-directory matching
- ✅ Description length limits
- ✅ Markdown heading structure
- ✅ Prompt mode validation

### 3. Repository Tests (`test_repository.py`)

Tests actual repository structure and files:

- ✅ Skills directory structure
- ✅ SKILL.md validation
- ✅ Reference files existence and structure
- ✅ Specification files existence
- ⚠️ Known issue: step5-functional-requirements.md has multiple H1 headings

## Test Results Summary

As of 2026-01-26:

```
Total Tests: 58
Passed: 57
Failed: 1
Success Rate: 98.3%
```

### Known Issues

1. **step5-functional-requirements.md** - Has 6 H1 headings (should have 1)
   - This is a real structural issue in the reference documentation
   - Recommendation: Refactor to use H2 for subsections

## Test Fixtures

Test fixtures are located in `spec/fixtures/`:

- `valid-examples/` - Correctly formatted files
- `invalid-examples/` - Files with intentional errors for negative testing

See `spec/fixtures/README.md` for details.

## Writing New Tests

### Testing a New Validator

1. Add validation logic to `tests/validator.py`
2. Create test cases in `tests/test_validator.py`
3. Add fixtures in `spec/fixtures/` if needed

Example:

```python
def test_my_new_validation(tmp_path):
    """Test description."""
    # Setup test data
    test_file = tmp_path / "test.md"
    test_file.write_text("content")
    
    # Run validation
    errors = my_validator(test_file)
    
    # Assert expectations
    assert len(errors) == 0
```

### Testing Repository Files

Add tests to `tests/test_repository.py`:

```python
def test_new_file_exists(self):
    """Test that new file exists."""
    file_path = REPO_ROOT / "path" / "to" / "file.md"
    assert file_path.exists()
```

## Continuous Integration

### GitHub Actions Workflow (Recommended)

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install pytest strictyaml
    
    - name: Run tests
      run: |
        pytest tests/ -v --tb=short
```

## Traceability Validation

Tests validate the traceability chain:

```
CP.01 → CN.01.1 → FR.01.1.1
  │       │          └─ Functional Requirement
  │       └─ Customer Need
  └─ Customer Problem
```

Example ID patterns:
- `CP.01` or `CP.01.1` - Customer Problem
- `CN.01.1` - Customer Need (traces to CP.01)
- `FR.01.1.1` - Functional Requirement (traces to CN.01.1)

## Coverage Goals

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| Static Tests | 100% | 100% | ✅ |
| Semantic Tests | 90% | 40% | 🔄 |
| Integration Tests | 80% | 0% | ⏸️ |
| Repository Tests | 95% | 98% | ✅ |

## Troubleshooting

### Import Errors

If you get `ModuleNotFoundError`:

```bash
# Add repository root to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:${PWD}"
pytest tests/ -v
```

### YAML Parsing Errors

If strictyaml fails:

```bash
pip install --upgrade strictyaml
```

### Test Discovery Issues

Ensure all test files:
- Start with `test_` prefix
- Are in the `tests/` directory
- Have `__init__.py` in the tests directory

## Contributing

When contributing tests:

1. Follow existing test patterns
2. Add docstrings to test functions
3. Use descriptive test names
4. Update this guide if adding new test categories
5. Ensure tests are deterministic (no random data)

## References

- **AgentSkills Testing**: https://github.com/agentskills/agentskills/tree/main/skills-ref/tests
- **pytest Documentation**: https://docs.pytest.org/
- **NFR.1.0.md**: Test specifications and requirements
- **customer-problems.md**: Customer problems driving test requirements
