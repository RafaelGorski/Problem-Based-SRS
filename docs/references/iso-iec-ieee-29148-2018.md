# ISO/IEC/IEEE 29148:2018 — Systems and Software Engineering — Life Cycle Processes — Requirements Engineering

> **Reference collected from:** <https://www.iso.org/standard/72089.html>  
> **Collected (UTC):** 2026-04-29T14:37:00Z  
> **Standard status:** Published (2018-11)

## Summary

ISO/IEC/IEEE 29148:2018 is the international standard for requirements engineering processes in systems and software engineering. It provides guidance on requirements engineering activities and establishes a common framework for requirements-related processes.

## Scope

The standard specifies:
- Requirements engineering processes and activities
- Requirements for the content of requirements documents (including SRS)
- Quality characteristics for individual requirements and sets of requirements

## Key Concepts Used in This Repository

This repository aligns its requirement-writing guidance with the following ISO/IEC/IEEE 29148:2018 concepts:

### Requirement Quality Characteristics (§5.2.5)
- **Complete**: All customer needs MUST be met by requirements
- **Correct**: All requirements MUST meet some customer need
- **Unambiguous**: Use precise language, avoid vague terms
- **Verifiable/Testable**: Each requirement MUST have verifiable acceptance criteria
- **Measurable**: Non-functional requirements MUST have quantifiable targets
- **Traceable**: Every requirement MUST trace to a source (customer need/problem)

### Requirement Statement Syntax
The standard recommends structured syntax for requirements:
- `The [system] shall [verb] [object] [constraint] [condition]`

### Traceability
The standard emphasizes bidirectional traceability between requirements and their sources, which this repository implements through the CP → CN → FR traceability chain.

## How This Repository Uses the Standard

| ISO 29148 Concept | Repository Implementation |
|-------------------|--------------------------|
| Requirements quality characteristics | Quality Rules in `functional-requirements` skill |
| Structured requirement syntax | FR notation: `The [System] shall [verb]...` |
| Bidirectional traceability | Zigzag validation (CP ↔ CN ↔ FR) |
| Stakeholder identification | Business Context (Step 0) |
| Requirements classification | Obligation / Expectation / Hope severity classes |

## Important Note

This repository **aligns its guidance with** ISO/IEC/IEEE 29148:2018 concepts and best practices. It does not claim full compliance with all provisions of the standard. The Problem-Based SRS methodology extends 29148 concepts with a problem-first approach derived from peer-reviewed research (Gorski & Stadzisz, 2016).

## References

- ISO/IEC/IEEE 29148:2018, *Systems and software engineering — Life cycle processes — Requirements engineering*. International Organization for Standardization. <https://www.iso.org/standard/72089.html>
- ISO/IEC/IEEE 29148:2018 supersedes ISO/IEC/IEEE 29148:2011
