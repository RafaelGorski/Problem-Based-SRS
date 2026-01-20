# Problem-Based SRS Test Specification

> **CP.01**: "Our solution must work with AI Agents helping engineers with their software requirements end to end, otherwise this project is obsolete generating no impact"

## Overview

This folder contains the test specification for validating the Problem-Based SRS methodology. The tests ensure that:

1. **Prompts and skills are correctly structured** for AI agent consumption
2. **Traceability is maintained** between CP → CN → FR artifacts
3. **Multi-model compatibility** is verified across different AI platforms
4. **The 5-step process** produces complete and consistent outputs

## Test Categories

| Category | Purpose | Files |
|----------|---------|-------|
| **Static** | Validate file structure, YAML, markdown | `static/*.spec.md` |
| **Semantic** | Validate content patterns, traceability | `semantic/*.spec.md` |
| **Integration** | Validate AI agent workflows | `integration/*.spec.md` |

## Running Tests

### Manual Validation
Each `.spec.md` file contains human-readable test cases that can be manually verified.

### Automated Validation (Future)
```bash
# When automation is implemented:
npm run test:static      # Run static analysis
npm run test:semantic    # Run semantic validation
npm run test:integration # Run integration tests
```

## Test Traceability

All tests trace back to customer problems:

```
CP.01 (Core Problem)
├── CP.01.1 → CN.01.1, CN.01.2 → FR.01.1.x (Static Tests)
├── CP.01.2 → CN.01.5 → FR.01.3.x (Multi-Model Tests)
├── CP.01.3 → CN.01.3, CN.01.4 → FR.01.2.x (Traceability Tests)
├── CP.01.4 → CN.01.4, CN.01.6 → FR.01.2.x (Completeness Tests)
└── CP.01.5 → CN.01.1, CN.01.2 → FR.01.1.x (Structure Tests)
```

## Contributing

When adding new tests:
1. Identify which CP the test addresses
2. Create or update the corresponding CN
3. Define FR with clear SHALL statements
4. Update the traceability matrix