# NFR.1.0 - Testing Recommendation Plan for Problem-Based-SRS

> **Analysis Date**: 2026-01-20 13:36:26  
> **Methodology Applied**: Problem-Based SRS (Gorski & Stadzisz)

---

## CP.01 (Core Problem Statement)

> **"Our solution must work with AI Agents helping engineers with their software requirements end to end, otherwise this project is obsolete generating no impact"**

---

## Step 1: Customer Problems (CP) - WHY

| ID | Customer Problem | Classification | Consequence |
|----|-----------------|----------------|-------------|
| **CP.01** | Our solution must work with AI Agents helping engineers with their software requirements end to end | **Obligation** | Project becomes obsolete with no impact |
| CP.01.1 | AI Agents cannot reliably interpret the prompts/skills if the formatting or structure is inconsistent | Obligation | Methodology fails to execute correctly |
| CP.01.2 | Different AI models (GPT-4, Claude, DeepSeek, Llama) may interpret prompts differently | Expectation | Reduced cross-platform compatibility |
| CP.01.3 | There's no way to validate that artifacts (CP→CN→FR) maintain correct traceability | Obligation | Requirements lose connection to real problems |
| CP.01.4 | Users cannot verify if the 5-step process produces complete and consistent outputs | Expectation | Quality degradation goes undetected |
| CP.01.5 | No automated validation exists to ensure prompts follow the correct syntax/structure | Expectation | Prompts may become malformed over time |

---

## Step 2: Software Glance (SG) - High-Level Testing Approach

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TESTING ARCHITECTURE OVERVIEW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │  STATIC TESTS   │    │  SEMANTIC TESTS │    │  E2E AI TESTS   │     │
│  │  (Structure)    │    │  (Content)      │    │  (Integration)  │     │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │
│           │                      │                      │               │
│           ▼                      ▼                      ▼               │
│  • YAML frontmatter    • Traceability       • Multi-model testing      │
│  • Markdown structure   • Completeness       • Output validation        │
│  • File organization   • Syntax patterns    • Workflow simulation      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 3: Customer Needs (CN) - WHAT

| ID | Customer Need | Outcome Class | Traces to |
|----|--------------|---------------|-----------|
| CN.01.1 | The test suite needs to validate that all prompt files follow correct YAML frontmatter structure | Information | CP.01.1, CP.01.5 |
| CN.01.2 | The test suite needs to verify markdown structure consistency across all prompts and skills | Information | CP.01.1, CP.01.5 |
| CN.01.3 | The test suite needs to validate traceability patterns (CP→CN→FR numbering) in examples | Control | CP.01.3 |
| CN.01.4 | The test suite needs to verify syntax patterns in artifact templates match the methodology | Control | CP.01.3, CP.01.4 |
| CN.01.5 | The test suite needs to provide multi-model compatibility test scenarios | Information | CP.01.2 |
| CN.01.6 | The test suite needs to validate the completeness of the 5-step process documentation | Information | CP.01.4 |

---

## Step 4: Software Vision (SV) - Architecture

### Test Categories

```
spec/
├── README.md                           # Test suite overview
├── static/                             # Static Analysis Tests
│   ├── yaml-frontmatter.spec.md        # YAML validation rules
│   ├── markdown-structure.spec.md      # Markdown lint rules
│   └── file-organization.spec.md       # Directory structure validation
├── semantic/                           # Semantic Content Tests
│   ├── traceability.spec.md            # CP→CN→FR chain validation
│   ├── syntax-patterns.spec.md         # Artifact syntax validation
│   └── completeness.spec.md            # 5-step coverage validation
├── integration/                        # AI Agent Integration Tests
│   ├── multi-model-scenarios.spec.md   # Cross-model test cases
│   └── workflow-simulation.spec.md     # End-to-end process tests
└── fixtures/                           # Test Data
    ├── valid-examples/                 # Known-good artifacts
    └── invalid-examples/               # Known-bad artifacts for error detection
```

---

## Step 5: Functional Requirements (FR) - HOW

### FR.01.1.x - Static Analysis Tests

| ID | Functional Requirement | Traces to |
|----|----------------------|-----------|
| FR.01.1.1 | The YAML frontmatter validator SHALL verify `name`, `description`, `license` fields exist in SKILL.md files | CN.01.1 |
| FR.01.1.2 | The YAML frontmatter validator SHALL verify `.prompt.md` files contain valid frontmatter | CN.01.1 |
| FR.01.1.3 | The markdown linter SHALL verify consistent heading levels (H1 for title, H2 for sections) | CN.01.2 |
| FR.01.1.4 | The file organization validator SHALL verify the repository structure matches documented layout | CN.01.2 |

### FR.01.2.x - Semantic Content Tests

| ID | Functional Requirement | Traces to |
|----|----------------------|-----------|
| FR.01.2.1 | The traceability validator SHALL verify CP IDs follow pattern `CP.{n}` or `CP.{n}.{m}` | CN.01.3 |
| FR.01.2.2 | The traceability validator SHALL verify CN IDs follow pattern `CN.{cp}.{n}` | CN.01.3 |
| FR.01.2.3 | The traceability validator SHALL verify FR IDs follow pattern `FR.{cp}.{cn}.{n}` | CN.01.3 |
| FR.01.2.4 | The syntax validator SHALL verify CP statements follow `[Subject] [Verb] [Consequence]` pattern | CN.01.4 |
| FR.01.2.5 | The syntax validator SHALL verify CN statements follow `[Subject] needs [system] to [Verb] [Object]` pattern | CN.01.4 |
| FR.01.2.6 | The syntax validator SHALL verify FR statements use "SHALL" for mandatory requirements | CN.01.4 |
| FR.01.2.7 | The completeness validator SHALL verify all 5 steps have corresponding reference files | CN.01.6 |

### FR.01.3.x - Integration Tests

| ID | Functional Requirement | Traces to |
|----|----------------------|-----------|
| FR.01.3.1 | The multi-model test suite SHALL provide test scenarios for GitHub Copilot | CN.01.5 |
| FR.01.3.2 | The multi-model test suite SHALL provide test scenarios for Claude (Claude Code, Claude.ai) | CN.01.5 |
| FR.01.3.3 | The multi-model test suite SHALL provide test scenarios for GPT-4 | CN.01.5 |
| FR.01.3.4 | The workflow simulator SHALL validate the complete CP→CN→FR generation flow | CN.01.5 |

---

## Zigzag Validation ✅

| CP | CN Coverage | FR Coverage | Status |
|----|------------|-------------|--------|
| CP.01.1 | CN.01.1, CN.01.2 | FR.01.1.1-4 | ✅ |
| CP.01.2 | CN.01.5 | FR.01.3.1-4 | ✅ |
| CP.01.3 | CN.01.3, CN.01.4 | FR.01.2.1-6 | ✅ |
| CP.01.4 | CN.01.4, CN.01.6 | FR.01.2.4-7 | ✅ |
| CP.01.5 | CN.01.1, CN.01.2 | FR.01.1.1-4 | ✅ |

---

## Traceability Matrix

```
CP.01 (Core Problem - AI Agent Compatibility)
│
├── CP.01.1 (Inconsistent formatting breaks AI interpretation)
│   ├── CN.01.1 (Validate YAML frontmatter)
│   │   ├── FR.01.1.1 (SKILL.md fields validation)
│   │   └── FR.01.1.2 (.prompt.md validation)
│   └── CN.01.2 (Verify markdown structure)
│       ├── FR.01.1.3 (Heading levels)
│       └── FR.01.1.4 (File organization)
│
├── CP.01.2 (Different AI models interpret differently)
│   └── CN.01.5 (Multi-model test scenarios)
│       ├── FR.01.3.1 (GitHub Copilot tests)
│       ├── FR.01.3.2 (Claude tests)
│       ├── FR.01.3.3 (GPT-4 tests)
│       └── FR.01.3.4 (Workflow simulation)
│
├── CP.01.3 (No traceability validation)
│   ├── CN.01.3 (Validate traceability patterns)
│   │   ├── FR.01.2.1 (CP ID format)
│   │   ├── FR.01.2.2 (CN ID format)
│   │   └── FR.01.2.3 (FR ID format)
│   └── CN.01.4 (Verify syntax patterns)
│       ├── FR.01.2.4 (CP syntax)
│       ├── FR.01.2.5 (CN syntax)
│       └── FR.01.2.6 (FR syntax - SHALL)
│
├── CP.01.4 (Cannot verify process completeness)
│   ├── CN.01.4 (Verify syntax patterns) [shared]
│   └── CN.01.6 (Validate 5-step completeness)
│       └── FR.01.2.7 (Reference files exist)
│
└── CP.01.5 (No automated validation)
    ├── CN.01.1 (Validate YAML frontmatter) [shared]
    └── CN.01.2 (Verify markdown structure) [shared]
```

---

## Implementation Roadmap

### Phase 1: Static Tests (Foundation)
- [ ] Implement YAML frontmatter validator
- [ ] Implement markdown structure linter
- [ ] Implement file organization checker

### Phase 2: Semantic Tests (Content Quality)
- [ ] Implement traceability ID validator
- [ ] Implement syntax pattern validator
- [ ] Implement completeness checker

### Phase 3: Integration Tests (AI Compatibility)
- [ ] Create multi-model test scenarios
- [ ] Implement workflow simulation tests
- [ ] Document model-specific findings

---

## References

- Problem-Based SRS Paper (Gorski & Stadzisz)
- AgentSkills Specification: https://agentskills.io/specification
- GitHub Copilot Prompt Files: https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files

---

**Version**: 1.0  
**Status**: Draft  
**Next Review**: After Phase 1 implementation