---
name: functional-requirements
description: Generate Functional Requirements (FR) and Non-Functional Requirements (NFR) from Customer Needs and Software Vision. Creates individual requirement files with traceability. Step 5 of Problem-Based SRS methodology.
license: MIT
metadata:
  author: rafael-gorski
  version: "1.2"
  methodology: problem-based-srs
  step: 5
---

# Functional Requirements (FR) & Non-Functional Requirements (NFR)

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

Before running this skill, ensure you have completed artifacts from previous steps:

- [ ] **Customer Needs (CNs)** — from customer-needs skill
- [ ] **Software Vision** — from software-vision skill

**⚠ Warning**: Do not proceed without these inputs. FRs cannot be generated independently—they must trace to Customer Needs and respect Software Vision boundaries.

---

## Definition

**Functional Requirements (FR):** Define WHAT the software system SHALL DO to fulfill Customer Needs. FRs describe specific capabilities, behaviors, and functions—not how they are implemented.

**Non-Functional Requirements (NFR):** Define quality attributes and constraints on HOW WELL the system performs. NFRs specify performance, security, usability, reliability, and other quality characteristics.

## Your Task

For each CN:
1. Generate FR statements using "shall/should" notation
2. Identify any NFRs needed (quality attributes)
3. Save each FR/NFR as an individual file (see File Output section)
4. Create index files (_index.md) for both folders
5. **Present ALL FR statements in your response** (see Response Format immediately below)

---

## Response Format (CRITICAL — DO NOT SKIP)

**⚠ MANDATORY:** Your response MUST contain the actual FR requirement statements written out in full. This is NOT optional — a response that only describes file creation actions without showing the actual requirements is INVALID and INCOMPLETE.

**Every FR in the response MUST include:**

1. **The "shall" statement** — written out explicitly using the grammar: `The [System] shall [verb] [object]`
2. **CN traceability** — each FR must show which CN it traces to (e.g., `→ CN-001`)
3. **Acceptance criteria** — at least 2 testable criteria per FR

**Example of CORRECT response format:**

```markdown
## Functional Requirements

### FR-001: Client Registration
**Traces to:** CN-001 — Client data management

The CRM system shall allow the Account Manager to register a new client in the database.

**Acceptance Criteria:**
- [ ] System accepts client name, contact info, and company details
- [ ] System assigns unique client ID upon successful registration

### FR-002: Client Data Update
**Traces to:** CN-001 — Client data management

The CRM system shall allow the Account Manager to update existing client records.

**Acceptance Criteria:**
- [ ] System validates modified fields before saving
- [ ] System logs update timestamp
```

**Example of WRONG response (DO NOT do this):**
```
| CN | Functional Requirements |
|----|------------------------|
| CN.1 | FR-001 Registration, FR-002 Update |
```

The wrong format above lacks "shall" statements, acceptance criteria, and proper traceability.

---

## 📁 Output: Individual Requirement Files

**CRITICAL:** Each FR and NFR MUST be saved as an individual file so engineers can work on them as independent development units.

**⚠ ONE FILE AT A TIME:** Always create FR/NFR files **sequentially, one at a time** — never create multiple files in parallel. Batch file creation causes JSON serialization errors when the combined content is too large.

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

## FR Structured Notation

Each FR MUST follow this grammar:

```
The [Subject] shall [Verb] [Object] [Constraint] [Condition]
```

Where:
- **Subject**: The software system (e.g., "The CRM system", "The Invoice System")
- **Verb**: "shall" (mandatory) or "should" (desirable)
- **Object**: The specific action or capability
- **Constraint**: Limitations or quality attributes (optional)
- **Condition**: When/where this applies (optional)

## NFR Structured Notation

Each NFR MUST follow this grammar:

```
The [Subject] shall [Quality Attribute] [Measurable Target] [Condition]
```

Where:
- **Subject**: The software system
- **Quality Attribute**: Performance, security, usability, etc.
- **Measurable Target**: Specific, quantifiable criteria
- **Condition**: When/where this applies (optional)

---

## Individual FR File Template

Each FR file MUST follow this template:

```markdown
## FR-[NNN]: [Brief Title]

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
## NFR-[NNN]: [Brief Title]

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

## Content Restrictions (CRITICAL)

**NO CODE SNIPPETS:** FR and NFR files MUST NOT contain:
- Programming code examples
- Code blocks with implementation logic
- Pseudo-code implementations
- SQL queries, API calls, or technical syntax

**NO CONSTRUCTION DETAILS:** FR and NFR files MUST NOT include:
- Database schemas or table definitions
- API endpoint specifications
- Class diagrams or implementation architecture
- Technology stack decisions
- Configuration details

**WHERE TO PUT CONSTRUCTION DETAILS:**
Construction and implementation details belong in separate design documents:
```
[srs-folder]/
├── functional-requirements/     # FR files (WHAT - no code)
├── non-functional-requirements/ # NFR files (WHAT - no code)
└── design/                      # Construction details (HOW)
    ├── architecture.md          # System architecture
    ├── data-model.md            # Database schemas
    ├── api-specification.md     # API endpoints
    └── implementation-notes/    # Technical notes per FR
```

---

## Examples

### Example FR File: FR-001-client-registration.md

```markdown
## FR-001: Client Registration

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

---
*Created: 2024-01-15*  
*Author: Requirements Team*
```

### Example NFR File: NFR-001-response-time.md

```markdown
## NFR-001: Response Time

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
- [ ] No code snippets or programming examples in FR/NFR files

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
| Code snippet in FR file | Reference design docs for implementation details |

---

## Handoff to Engineering

After completing this step:

```
✅ Step 5 Complete: Requirements Specified

📁 Created: functional-requirements/
   ├── _index.md (N FRs total)
   ├── FR-001-*.md → CN-001
   ├── FR-002-*.md → CN-001
   └── ...

📁 Created: non-functional-requirements/
   ├── _index.md (N NFRs total)
   └── NFR-001-*.md

📁 Updated: traceability-matrix.md

→ MANDATORY: Run zigzag-validator skill for full chain verification
→ Engineers can now pick individual FR files to implement
```

---

## Reference

Based on Problem-Based SRS methodology (Gorski & Stadzisz, 2016)

**Version:** 1.2  
**Step:** 5 of 5  
**Validation:** zigzag-validator skill
