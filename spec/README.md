# Problem-Based SRS Test Specification

> **CP.01**: "Our solution must work with AI Agents helping engineers with their software requirements end to end, otherwise this project is obsolete generating no impact"

## Overview

This folder contains the test specification for validating the Problem-Based SRS methodology. The tests ensure that:

1. **Prompts and skills are correctly structured** for AI agent consumption
2. **Traceability is maintained** between CP → CN → FR artifacts
3. **Multi-model compatibility** is verified across different AI platforms
4. **The 5-step process** produces complete and consistent outputs

## Quick Start

```bash
# Install dependencies
pip install pytest strictyaml

# Run all tests
pytest tests/ -v

# See detailed testing guide
See ../TESTING.md for comprehensive testing documentation
```

## Test Categories

| Category | Purpose | Files |
|----------|---------|-------|
| **Static** | Validate file structure, YAML, markdown | `static/*.spec.md` |
| **Semantic** | Validate content patterns, traceability | `semantic/*.spec.md` (planned) |
| **Integration** | Validate AI agent workflows | `integration/*.spec.md` (planned) |
| **Unit Tests** | Automated Python tests | `../tests/*.py` |

## Running Tests

### Automated Testing (Python)

```bash
# All tests
pytest tests/ -v

# Specific categories
pytest tests/test_parser.py -v      # Parser tests
pytest tests/test_validator.py -v   # Validator tests  
pytest tests/test_repository.py -v  # Repository structure tests
```

### Manual Validation

Each `.spec.md` file contains human-readable test cases that can be manually verified.

## Test Infrastructure

```
spec/
├── README.md                    # This file
├── customer-problems.md         # CPs extracted from NFR.1.0
├── NFR.1.0.md                   # Original NFR analysis
├── static/                      # Static analysis specs
│   ├── yaml-frontmatter.spec.md
│   └── markdown-structure.spec.md
├── fixtures/                    # Test data
│   ├── README.md
│   ├── valid-examples/          # Known-good artifacts
│   └── invalid-examples/        # Known-bad for error detection
tests/                           # Python test suite (../tests/)
├── __init__.py
├── parser.py                    # YAML/markdown parsing
├── validator.py                 # Validation logic
├── test_parser.py              # Parser tests
├── test_validator.py           # Validator tests
└── test_repository.py          # Repository structure tests
```

## Test Results (2026-01-26)

✅ **57 of 58 tests passing (98.3%)**

### Current Status

- ✅ YAML frontmatter validation
- ✅ Markdown structure validation
- ✅ Skill metadata validation
- ✅ Traceability ID format validation
- ✅ Repository structure validation
- ⚠️ Known issue: step5-functional-requirements.md has multiple H1 headings

## Test Traceability

All tests trace back to customer problems:

```
CP.01 (Core Problem - AI Agent Compatibility)
├── CP.01.1 → CN.01.1, CN.01.2 → FR.01.1.x (Static Tests) ✅
├── CP.01.2 → CN.01.5 → FR.01.3.x (Multi-Model Tests) 🔄
├── CP.01.3 → CN.01.3, CN.01.4 → FR.01.2.x (Traceability Tests) ✅
├── CP.01.4 → CN.01.4, CN.01.6 → FR.01.2.x (Completeness Tests) 🔄
└── CP.01.5 → CN.01.1, CN.01.2 → FR.01.1.x (Validation Tests) ✅
```

Legend: ✅ Implemented | 🔄 In Progress | ⏸️ Planned

## Coverage Goals

| Phase | Category | Target | Current | Status |
|-------|----------|--------|---------|--------|
| Phase 1 | Static Tests | 100% | 100% | ✅ Complete |
| Phase 2 | Semantic Tests | 90% | 40% | 🔄 In Progress |
| Phase 3 | Integration Tests | 80% | 0% | ⏸️ Planned |

## Contributing

When adding new tests:

1. **Identify the CP** the test addresses
2. **Create or update** the corresponding CN
3. **Define FR** with clear SHALL statements
4. **Update** the traceability matrix
5. **Add test implementation** in `tests/` directory
6. **Run tests** to verify: `pytest tests/ -v`

See `../TESTING.md` for detailed testing guide.

## Documentation

- **TESTING.md** - Comprehensive testing guide
- **customer-problems.md** - Customer problems driving tests
- **NFR.1.0.md** - Non-functional requirements analysis
- **fixtures/README.md** - Test fixtures documentation

## References

- Problem-Based SRS Paper (Gorski & Stadzisz)
- AgentSkills Specification: https://agentskills.io/specification
- AgentSkills Testing Reference: https://github.com/agentskills/agentskills/tree/main/skills-ref/tests
- pytest Documentation: https://docs.pytest.org/