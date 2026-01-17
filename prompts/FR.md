# Functional Requirements (FR) Generation

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
                                                    Step 5: FUNCTIONAL REQUIREMENTS (You are here)
```

---

## Required Inputs

Before running this prompt, ensure you have completed artifacts from previous steps:

- [ ] **Customer Needs (CNs)** — from Step 3 (CN Generation prompt)
- [ ] **Software Vision** — from Step 4 (Software Vision prompt)

**⚠ Warning**: Do not proceed without these inputs. FRs cannot be generated independently—they must trace to Customer Needs and respect Software Vision boundaries.

---

## Prompt

```
You are generating Functional Requirements (FR) for a Problem-Based Software Requirements Specification.

## Definition
Functional Requirements define WHAT the software system SHALL DO to fulfill Customer Needs. FRs describe specific capabilities, behaviors, and functions—not how they are implemented.

## Required Inputs
I will provide:
1. Customer Needs (CNs) — outcomes the software must provide
2. Software Vision — scope, positioning, and boundaries

## Your Task
For each CN, generate FR statements that specify the system capabilities required to deliver that outcome.

## Structured Notation
Each FR MUST follow this grammar:

[Subject] [Verb] [Object] [Constraint] [Condition]

Where:
- **Subject**: The software system (e.g., "The CRM system", "The Invoice System")
- **Verb**: "shall" (mandatory) or "should" (desirable)
- **Object**: The specific action or capability
- **Constraint**: Limitations or quality attributes (optional)
- **Condition**: When/where this applies—write at end of sentence (optional)

## Traceability Rule (CRITICAL)
Every FR MUST trace to at least one Customer Need:
- Use notation: FR.X → CN.Y
- One CN typically requires MULTIPLE FRs (e.g., CN.1 may need FR.1, FR.2, FR.3, FR.4)
- Every CN must be addressed by at least one FR

## Scope Boundary Rule
All FRs must stay within the Software Vision boundaries:
- Reference the Vision to validate scope
- Flag any FR that may exceed defined boundaries

## Quality Rules (per ISO/IEC/IEEE 29148)
- **Complete**: All customer needs must be met by requirements
- **Correct**: All requirements must meet some customer need
- **Testable**: Each FR must have verifiable acceptance criteria
- **Unambiguous**: Use precise language, avoid vague terms

## Output Format
For each FR, provide:

### FR.X → CN.Y
[Subject] [Verb] [Object] [Constraint] [Condition]

**Acceptance Criteria:**
- Criterion 1 (testable)
- Criterion 2 (testable)
- Criterion 3 (testable)

## Examples (from CRM case study)

### FR.1 → CN.1
The CRM system shall allow the Account Manager to register a new client in the database.

**Acceptance Criteria:**
- System accepts client name, contact info, and company details
- System assigns unique client ID upon successful registration
- System displays confirmation message after registration

### FR.2 → CN.1
The CRM system shall allow the Account Manager to modify existing client data in the database.

**Acceptance Criteria:**
- System displays current client data for editing
- System validates modified data before saving
- System logs modification timestamp and user

### FR.3 → CN.1
The CRM system shall allow the Account Manager to view client data from the database.

**Acceptance Criteria:**
- System displays complete client record on selection
- System shows all contact information fields
- System loads client data within 2 seconds

### FR.4 → CN.1
The CRM system shall allow the Account Manager to search for clients by name or company.

**Acceptance Criteria:**
- Search supports partial name matching
- Search returns results within 2 seconds
- System displays "No results found" when no matches exist

## What This Step Does NOT Do
❌ Define implementation details (database type, architecture)
❌ Specify non-functional requirements (covered separately)
❌ Create Customer Needs (use CN Generation prompt)
❌ Define Software Vision (use Software Vision prompt)
```

---

## Quality Checklist

Before finalizing, verify:

- [ ] Every FR uses syntax: [Subject] [Verb] [Object] [Constraint] [Condition]
- [ ] Every FR traces to at least one CN (FR.X → CN.Y notation)
- [ ] Every CN from input is addressed by at least one FR
- [ ] All FRs are testable with clear acceptance criteria
- [ ] All FRs stay within Software Vision boundaries
- [ ] No implementation/design details in requirements (WHAT not HOW)
- [ ] Language is precise—no vague terms like "user-friendly", "fast", "flexible"

---

## Common Pitfalls

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| "The system shall use a MySQL database" | "The system shall persist client data between sessions" |
| "The system shall be user-friendly" | "The system shall allow users to complete registration in under 3 minutes" |
| FR with no CN link | Always specify FR.X → CN.Y |
| "The system shall be fast" | "The system shall return search results within 2 seconds" |

---

## Usage Instructions

1. **Gather inputs**: Ensure CN list and Software Vision are complete
2. **Provide context**: Paste or reference the CN and Vision artifacts
3. **Run this prompt**: The agent generates FRs for each CN
4. **Validate output**: Use the quality checklist above
5. **Next step**: Proceed to NFR generation or requirements validation

---

**Based on:** Problem-Based SRS methodology (Gorski & Stadzisz)  
**Standard:** ISO/IEC/IEEE 29148:2011  
**Version:** 2.0
