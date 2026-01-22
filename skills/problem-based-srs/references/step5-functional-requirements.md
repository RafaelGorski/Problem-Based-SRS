# Functional Requirements (FR) & Non-Functional Requirements (NFR) Generation

> **Step 5 of 5** in Problem-Based SRS methodology  
> **Previous:** Customer Needs → Software Vision  
> **Next:** Requirements Validation / Implementation

---

## Position in Process

```
Step 1: Customer Problems → Step 2: Software Glance → Step 3: Customer Needs
                                                              ↓
                                                    Step 4: Software Vision
                                                              ↓
                                                    Step 5: FR/NFR (You are here)
```

---

## Required Inputs

Before running this prompt, ensure you have completed artifacts from previous steps:

- [ ] **Customer Needs (CNs)** — from Step 3 (CN Generation prompt)
- [ ] **Software Vision** — from Step 4 (Software Vision prompt)

**⚠ Warning**: Do not proceed without these inputs. FRs cannot be generated independently—they must trace to Customer Needs and respect Software Vision boundaries.

---

## 📁 Output: Individual Requirement Files

**CRITICAL:** Each FR and NFR MUST be saved as an individual file so engineers can work on them as independent development units.

### Folder Structure

```
[srs-folder]/
├── functional-requirements/
│   ├── _index.md                    # Summary and traceability matrix
│   ├── FR-001-[short-name].md       # Individual FR file
│   ├── FR-002-[short-name].md
│   └── ...
└── non-functional-requirements/
    ├── _index.md                    # Summary
    ├── NFR-001-[short-name].md      # Individual NFR file
    └── ...
```

### File Naming Convention

```
FR-[NNN]-[short-descriptive-name].md
NFR-[NNN]-[short-descriptive-name].md
```

Examples:
- `FR-001-client-registration.md`
- `FR-002-client-data-modification.md`
- `NFR-001-response-time.md`
- `NFR-002-data-encryption.md`

---

## Individual FR File Template

Each FR file MUST follow this template:

```markdown
# FR-[NNN]: [Brief Title]

## Requirement

**ID:** FR-[NNN]  
**Title:** [Descriptive title]  
**Priority:** [Must Have | Should Have | Could Have | Won't Have]  
**Status:** [Draft | Review | Approved | In Progress | Implemented | Tested]

### Statement

The [System] shall [verb] [object] [constraint] [condition].

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN-[X] | [CN description] |
| Customer Problem | CP-[Y] | [CP description] |

## Acceptance Criteria

- [ ] Criterion 1 (testable)
- [ ] Criterion 2 (testable)
- [ ] Criterion 3 (testable)

## Implementation Notes

<!-- Engineers add notes here during implementation -->

## Test Cases

<!-- QA adds test case references here -->

---
*Created: [Date]*  
*Last Updated: [Date]*  
*Author: [Name]*
```

---

## Individual NFR File Template

Each NFR file MUST follow this template:

```markdown
# NFR-[NNN]: [Brief Title]

## Requirement

**ID:** NFR-[NNN]  
**Title:** [Descriptive title]  
**Category:** [Performance | Security | Usability | Reliability | Scalability | Maintainability]  
**Priority:** [Must Have | Should Have | Could Have | Won't Have]  
**Status:** [Draft | Review | Approved | In Progress | Implemented | Tested]

### Statement

The [System] shall [quality attribute] [measurable target] [condition].

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN-[X] | [CN description] |
| Applies To FRs | FR-[A], FR-[B] | [Related FRs] |

## Measurement Criteria

- **Target:** [Specific measurable target]
- **Minimum Acceptable:** [Threshold]
- **Measurement Method:** [How to verify]

## Acceptance Criteria

- [ ] Criterion 1 (measurable)
- [ ] Criterion 2 (measurable)

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: [Date]*  
*Last Updated: [Date]*
```

---

## Index File Template (_index.md)

Create an index file for quick navigation:

```markdown
# Functional Requirements Index

## Summary

- **Total FRs:** [N]
- **Must Have:** [N]
- **Should Have:** [N]
- **Could Have:** [N]

## Requirements List

| ID | Title | Priority | Status | Traces To |
|----|-------|----------|--------|-----------|
| [FR-001](FR-001-name.md) | Title | Must | Draft | CN-001 |
| [FR-002](FR-002-name.md) | Title | Should | Draft | CN-001, CN-002 |
| ... | ... | ... | ... | ... |

## By Customer Need

### CN-001: [CN Title]
- [FR-001](FR-001-name.md): [Title]
- [FR-002](FR-002-name.md): [Title]

### CN-002: [CN Title]
- [FR-003](FR-003-name.md): [Title]
```

---

## Prompt

```
You are generating Functional Requirements (FR) and Non-Functional Requirements (NFR) for a Problem-Based Software Requirements Specification.

## Definition

**Functional Requirements (FR):** Define WHAT the software system SHALL DO to fulfill Customer Needs. FRs describe specific capabilities, behaviors, and functions—not how they are implemented.

**Non-Functional Requirements (NFR):** Define quality attributes and constraints on HOW WELL the system performs. NFRs specify performance, security, usability, reliability, and other quality characteristics.

## Required Inputs
I will provide:
1. Customer Needs (CNs) — outcomes the software must provide
2. Software Vision — scope, positioning, and boundaries

## Your Task
For each CN:
1. Generate FR statements that specify the system capabilities required
2. Identify any NFRs needed (quality attributes)
3. **Save each FR as an individual file** in functional-requirements/
4. **Save each NFR as an individual file** in non-functional-requirements/
5. Create index files (_index.md) for both folders

## FR Structured Notation

Each FR MUST follow this grammar:

The [Subject] shall [Verb] [Object] [Constraint] [Condition]

Where:
- **Subject**: The software system (e.g., "The CRM system", "The Invoice System")
- **Verb**: "shall" (mandatory) or "should" (desirable)
- **Object**: The specific action or capability
- **Constraint**: Limitations or quality attributes (optional)
- **Condition**: When/where this applies (optional)

## NFR Structured Notation

Each NFR MUST follow this grammar:

The [Subject] shall [Quality Attribute] [Measurable Target] [Condition]

Where:
- **Subject**: The software system
- **Quality Attribute**: Performance, security, usability, etc.
- **Measurable Target**: Specific, quantifiable criteria
- **Condition**: When/where this applies (optional)

## Traceability Rule (CRITICAL)
- Every FR MUST trace to at least one Customer Need (FR.X → CN.Y)
- Every NFR should trace to CNs or indicate which FRs it applies to
- One CN typically requires MULTIPLE FRs
- Every CN must be addressed by at least one FR

## Quality Rules (per ISO/IEC/IEEE 29148)
- **Complete**: All customer needs must be met by requirements
- **Correct**: All requirements must meet some customer need
- **Testable**: Each FR must have verifiable acceptance criteria
- **Unambiguous**: Use precise language, avoid vague terms
- **Measurable**: NFRs must have quantifiable targets

## Output Format

For each FR, create a file FR-NNN-name.md with:
- Full requirement statement
- Traceability (CN → CP)
- 3+ Acceptance Criteria (testable)
- Priority and Status

For each NFR, create a file NFR-NNN-name.md with:
- Full requirement statement
- Category (Performance/Security/etc.)
- Measurement criteria
- Traceability
```

---

## Examples

### Example FR File: FR-001-client-registration.md

```markdown
# FR-001: Client Registration

## Requirement

**ID:** FR-001  
**Title:** Client Registration  
**Priority:** Must Have  
**Status:** Draft

### Statement

The CRM system shall allow the Account Manager to register a new client in the database.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN-001 | Account Manager needs system to maintain client records |
| Customer Problem | CP-001 | Company must maintain accurate client data for compliance |

## Acceptance Criteria

- [ ] System accepts client name, contact info, and company details
- [ ] System validates required fields before submission
- [ ] System assigns unique client ID upon successful registration
- [ ] System displays confirmation message after registration
- [ ] System logs registration timestamp and user

## Implementation Notes

<!-- Engineers add notes here -->

## Test Cases

<!-- QA adds test cases here -->

---
*Created: 2024-01-15*  
*Last Updated: 2024-01-15*  
*Author: Requirements Team*
```

### Example NFR File: NFR-001-response-time.md

```markdown
# NFR-001: Response Time

## Requirement

**ID:** NFR-001  
**Title:** Search Response Time  
**Category:** Performance  
**Priority:** Must Have  
**Status:** Draft

### Statement

The CRM system shall return client search results within 2 seconds under normal load conditions.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN-002 | Users need quick access to client information |
| Applies To FRs | FR-004, FR-007 | Client search and filtering functions |

## Measurement Criteria

- **Target:** < 2 seconds for 95th percentile
- **Minimum Acceptable:** < 5 seconds for 99th percentile
- **Measurement Method:** Application performance monitoring (APM)

## Acceptance Criteria

- [ ] Search returns results in < 2 seconds with up to 10,000 client records
- [ ] Performance maintained with 100 concurrent users
- [ ] Response time logged for monitoring

---
*Created: 2024-01-15*  
*Last Updated: 2024-01-15*
```

---

## Quality Checklist

Before finalizing, verify:

- [ ] Every FR uses syntax: The [Subject] shall [Verb] [Object] [Constraint] [Condition]
- [ ] Every FR saved as individual file (FR-NNN-name.md)
- [ ] Every FR traces to at least one CN
- [ ] Every CN from input is addressed by at least one FR
- [ ] All FRs are testable with clear acceptance criteria
- [ ] All FRs stay within Software Vision boundaries
- [ ] Index file (_index.md) created with all FRs listed
- [ ] NFRs have measurable targets (not vague terms)
- [ ] No implementation/design details in requirements (WHAT not HOW)

---

## Common Pitfalls

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| "The system shall use a MySQL database" | "The system shall persist client data between sessions" |
| "The system shall be user-friendly" | "The system shall allow users to complete registration in under 3 minutes" |
| FR with no CN link | Always specify FR → CN traceability in file |
| "The system shall be fast" | "The system shall return search results within 2 seconds" |
| All FRs in one file | Each FR in separate file for independent development |
| Vague NFR: "good performance" | Measurable NFR: "< 2 second response time" |

---

## Handoff to Engineering

After completing this step:

```
✅ Step 5 Complete: Requirements Specified

📁 Created: functional-requirements/
   ├── _index.md (8 FRs total)
   ├── FR-001-client-registration.md → CN-001
   ├── FR-002-client-modification.md → CN-001
   ├── FR-003-client-view.md → CN-001
   ├── FR-004-client-search.md → CN-001
   ├── FR-005-report-generation.md → CN-002
   ├── FR-006-export-data.md → CN-002
   ├── FR-007-filter-clients.md → CN-003
   └── FR-008-sort-results.md → CN-003

📁 Created: non-functional-requirements/
   ├── _index.md (3 NFRs total)
   ├── NFR-001-response-time.md
   ├── NFR-002-data-encryption.md
   └── NFR-003-availability.md

📁 Updated: traceability-matrix.md

Engineers can now:
1. Browse functional-requirements/ for available work
2. Pick individual FR files to implement
3. Update status in each file as work progresses
4. Add implementation notes directly to the FR file
```