---
agent: 'agent'
description: 'Generate Functional Requirements from Customer Needs and Software Vision'
---

## Role

You're generating **Functional Requirements (FR)** for a Problem-Based Software Requirements Specification.

## Step Context

This is **Step 5 of 5** in the Problem-Based SRS process:
1. Customer Problems
2. Software Glance
3. Customer Needs
4. Software Vision
5. **Functional Requirements** ← You are here

## Definition

Functional Requirements define **WHAT** the software system **SHALL DO** to fulfill Customer Needs. FRs describe specific capabilities, behaviors, and functions—not how they are implemented.

## Input Required

Customer Needs: ${input:needs:Paste your Customer Needs from Step 3}
Software Vision: ${input:vision:Paste your Software Vision from Step 4}

## Structured Notation

Each FR MUST follow this grammar:

```
[Subject] [Verb] [Object] [Constraint] [Condition]
```

Where:
- **Subject**: The software system (e.g., "The CRM system")
- **Verb**: "shall" (mandatory) or "should" (desirable)
- **Object**: The specific action or capability
- **Constraint**: Limitations or quality attributes (optional)
- **Condition**: When/where this applies (optional)

## Traceability Rule (CRITICAL)

Every FR MUST trace to at least one Customer Need:
- Use notation: `FR.X → CN.Y`
- One CN typically requires MULTIPLE FRs
- Every CN must be addressed by at least one FR

## Quality Rules (per ISO/IEC/IEEE 29148)

| Rule | Description |
|------|-------------|
| **Complete** | All customer needs must be met by requirements |
| **Correct** | All requirements must meet some customer need |
| **Testable** | Each FR must have verifiable acceptance criteria |
| **Unambiguous** | Use precise language, avoid vague terms |

## Output Format

For each FR:

```markdown
### FR.[X] → CN.[Y]

[Subject] [Verb] [Object] [Constraint] [Condition]

**Acceptance Criteria:**
- Criterion 1 (testable)
- Criterion 2 (testable)
- Criterion 3 (testable)
```

## Examples

### FR.1 → CN.1
The CRM system shall allow the Account Manager to register a new client in the database.

**Acceptance Criteria:**
- System accepts client name, contact info, and company details
- System assigns unique client ID upon successful registration
- System displays confirmation message after registration

### FR.2 → CN.1
The CRM system shall allow the Account Manager to search for clients by name or company.

**Acceptance Criteria:**
- Search supports partial name matching
- Search returns results within 2 seconds
- System displays "No results found" when no matches exist

## Common Pitfalls

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| "The system shall use MySQL" | "The system shall persist client data between sessions" |
| "The system shall be user-friendly" | "The system shall allow users to complete registration in under 3 minutes" |
| FR with no CN link | Always specify FR.X → CN.Y |
| "The system shall be fast" | "The system shall return search results within 2 seconds" |

## What This Step Does NOT Do

❌ Define implementation details (database type, architecture)  
❌ Specify non-functional requirements (covered separately)  
❌ Create Customer Needs (use /cn prompt)  
❌ Define Software Vision (use /vision prompt)

## Quality Checklist

Before finalizing, verify:

- [ ] Every FR uses syntax: [Subject] [Verb] [Object] [Constraint] [Condition]
- [ ] Every FR traces to at least one CN (FR.X → CN.Y notation)
- [ ] Every CN from input is addressed by at least one FR
- [ ] All FRs are testable with clear acceptance criteria
- [ ] All FRs stay within Software Vision boundaries
- [ ] No implementation/design details in requirements (WHAT not HOW)
- [ ] Language is precise—no vague terms like "user-friendly", "fast", "flexible"

## Handoff

When complete:

```
✅ Step 5 Complete: Functional Requirements Specified

Summary:
- [N] Functional Requirements generated
- All CNs traced
- Acceptance criteria defined

→ Process Complete: Problem-Based SRS document ready
→ Optional: Use /zigzag for consistency validation
```

---

Based on Problem-Based SRS methodology (Gorski & Stadzisz, 2016)  
Standard: ISO/IEC/IEEE 29148:2011
