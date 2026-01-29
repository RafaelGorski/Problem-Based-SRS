# Customer Problems (CP) - Testing Requirements

> **Source**: Extracted from NFR.1.0.md  
> **Date**: 2026-01-26  
> **Methodology**: Problem-Based SRS (Gorski & Stadzisz)

---

## Core Problem Statement

> **CP.01**: "Our solution must work with AI Agents helping engineers with their software requirements end to end, otherwise this project is obsolete generating no impact"

---

## Customer Problems Hierarchy

### CP.01 - AI Agent Compatibility (Core)

**Classification**: Obligation  
**Consequence**: Project becomes obsolete with no impact  
**Description**: The Problem-Based SRS methodology and tools must be compatible with AI agents (GitHub Copilot, Claude, GPT-4, etc.) to provide value to software engineers.

---

### CP.01.1 - Inconsistent Formatting Breaks AI Interpretation

**Classification**: Obligation  
**Consequence**: Methodology fails to execute correctly  
**Description**: AI Agents cannot reliably interpret the prompts/skills if the formatting or structure is inconsistent across files.

**Indicators**:
- AI agents produce incorrect outputs when prompts have malformed YAML
- Skills fail to load due to missing frontmatter fields
- Markdown structure variations confuse AI parsing

**Traces to**:
- CN.01.1 (Validate YAML frontmatter)
- CN.01.2 (Verify markdown structure)

---

### CP.01.2 - Different AI Models Interpret Differently

**Classification**: Expectation  
**Consequence**: Reduced cross-platform compatibility  
**Description**: Different AI models (GPT-4, Claude, DeepSeek, Llama) may interpret prompts differently, leading to inconsistent results across platforms.

**Indicators**:
- Same prompt produces different results on GitHub Copilot vs Claude
- Skill descriptions trigger differently across AI platforms
- Traceability validation behaves inconsistently

**Traces to**:
- CN.01.5 (Multi-model test scenarios)

---

### CP.01.3 - No Traceability Validation

**Classification**: Obligation  
**Consequence**: Requirements lose connection to real problems  
**Description**: There's no way to validate that artifacts (CP→CN→FR) maintain correct traceability, breaking the core principle of Problem-Based SRS.

**Indicators**:
- FRs created without linking to CNs
- CNs defined without tracing to CPs
- Numbering schemes (CP.01.1, CN.01.1, FR.01.1.1) not validated
- Orphaned requirements that don't trace back to business problems

**Traces to**:
- CN.01.3 (Validate traceability patterns)
- CN.01.4 (Verify syntax patterns)

---

### CP.01.4 - Cannot Verify Process Completeness

**Classification**: Expectation  
**Consequence**: Quality degradation goes undetected  
**Description**: Users cannot verify if the 5-step process produces complete and consistent outputs, leading to incomplete requirements documentation.

**Indicators**:
- Missing steps in SRS artifacts
- Incomplete Customer Problems analysis
- FRs created without corresponding CNs
- No systematic way to check all 5 steps are complete

**Traces to**:
- CN.01.4 (Verify syntax patterns)
- CN.01.6 (Validate 5-step completeness)

---

### CP.01.5 - No Automated Validation

**Classification**: Expectation  
**Consequence**: Prompts may become malformed over time  
**Description**: No automated validation exists to ensure prompts follow the correct syntax/structure, requiring manual inspection which is error-prone.

**Indicators**:
- Breaking changes introduced during updates
- Prompts with invalid YAML not caught until AI execution
- Markdown structure issues discovered too late
- Manual review required for every change

**Traces to**:
- CN.01.1 (Validate YAML frontmatter)
- CN.01.2 (Verify markdown structure)

---

## Problem Prioritization

| Priority | CP ID | Impact | Effort | Rationale |
|----------|-------|--------|--------|-----------|
| **P0** | CP.01.1 | High | Low | Blocks basic functionality; easy to fix |
| **P0** | CP.01.3 | High | Medium | Core methodology principle; requires traceability |
| **P1** | CP.01.5 | Medium | Low | Prevents regression; automatable |
| **P1** | CP.01.4 | Medium | Medium | Quality assurance; methodological completeness |
| **P2** | CP.01.2 | Low | High | Nice-to-have; requires multi-model testing infrastructure |

---

## Validation Criteria

Each CP is considered **resolved** when:

1. **CP.01.1**: Automated validators catch all formatting issues
2. **CP.01.2**: Test suite includes multi-model scenarios
3. **CP.01.3**: Traceability chain (CP→CN→FR) is validated automatically
4. **CP.01.4**: Completeness checker verifies all 5 steps are present
5. **CP.01.5**: CI/CD pipeline runs validation on every commit

---

## References

- **Primary Source**: `spec/NFR.1.0.md`
- **Methodology**: Gorski & Stadzisz, "Problem-Based Software Requirements Specification"
- **Testing Reference**: https://github.com/agentskills/agentskills/tree/main/skills-ref/tests

---

**Version**: 1.0  
**Status**: Active  
**Next Review**: After Phase 3 implementation
