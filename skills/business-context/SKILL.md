---
name: business-context
description: Establish structured business context and project principles before problem discovery. Use as Step 0 of Problem-Based SRS to capture project identity, business principles, stakeholders, domain boundaries, and success criteria that feed into Customer Problems identification.
license: MIT
metadata:
  author: rafael-gorski
  version: "1.0"
  methodology: problem-based-srs
  step: 0
---

# Business Context (BC)

> **Step 0** of the Problem-Based SRS methodology
> **Domain:** CONTEXT — Establishes the foundation for problem discovery

## Purpose

Establish a structured business context before identifying Customer Problems. The Business Context captures the foundational understanding of the project: who is involved, what principles govern decisions, what boundaries exist, and how success is measured. This ensures that Step 1 (Customer Problems) starts from a shared, well-defined understanding rather than ad-hoc descriptions.

**Inspired by:** The project constitution concept — establishing non-negotiable principles and governance before specification work begins.

---

## Scope

| Aspect | Boundary |
|--------|----------|
| **This skill does** | Capture project identity, business principles, stakeholders, domain boundaries, constraints, and success criteria |
| **This skill does NOT** | Identify problems, define solutions, or derive requirements |
| **Input from** | Stakeholder conversations, project briefs, existing documentation, domain knowledge |
| **Output to** | Step 1: Customer Problems (customer-problems skill) |

---

## Two Modes of Operation

### Mode 1: BC Generation
Use when starting from scratch — interview stakeholders or analyze existing documentation to build the business context.

### Mode 2: BC Review & Update
Use when business context already exists and needs validation, expansion, or amendment.

---

## Mode 1: BC Generation

### Your Task
Collect and structure the foundational business context for a project.

### Input Required
- **Project brief or description:** Any available context about the project
- **Stakeholder access:** Ability to ask clarifying questions

### Discovery Process

Work through the following sections systematically. For each section, either:
- Use information provided by stakeholders
- Infer from existing documentation (README, briefs, proposals)
- Ask clarifying questions when critical information is missing

---

## Business Context Sections

### 1. Project Identity

Capture the essential identity of the project:

| Field | Description | Example |
|-------|-------------|---------|
| **Project Name** | Official name | "InventoryPro" |
| **Business Domain** | Industry/area | "Warehouse logistics" |
| **Purpose Statement** | One-sentence WHY | "Eliminate $50k/month inventory losses" |
| **Inception Date** | When the project started or is starting | "2026-01" |

### 2. Business Principles

Define the non-negotiable rules and values that govern this project. Each principle should be:
- **Declarative** — States what must be true
- **Testable** — Can verify compliance
- **Actionable** — Guides real decisions

Classify each principle:

| Class | Description | Example |
|-------|-------------|---------|
| **Mandatory** | Non-negotiable; violation is unacceptable | "All data must be encrypted at rest and in transit" |
| **Guiding** | Strongly preferred; exceptions need justification | "Prefer open-source technologies over proprietary" |
| **Aspirational** | Desired direction; not yet enforced | "Achieve zero-downtime deployments" |

**Typical principle categories:**
- Regulatory/compliance requirements
- Security and privacy policies
- Technology constraints or preferences
- Quality standards
- Business operation rules

### 3. Stakeholders

Identify all parties involved and their relationship to the project:

| Role | Name/Group | Interest | Influence |
|------|------------|----------|-----------|
| **Sponsor** | Who funds/approves | Business goals | Decision authority |
| **User** | Who uses the system | Usability, efficiency | Usage feedback |
| **Customer** | Who benefits from outcomes | Value delivery | Requirements input |
| **Regulator** | Who sets compliance rules | Legal compliance | Constraints |
| **Development** | Who builds the system | Feasibility, clarity | Technical input |

### 4. Current Situation

Document the as-is state:

- **Current process:** How things work today (manual, automated, hybrid)
- **Pain points:** Known difficulties (will feed into CP discovery in Step 1)
- **Existing systems:** Tools, platforms, or software currently in use
- **What works well:** Elements to preserve or build upon

### 5. Domain Boundaries

Define the scope of the project:

- **In Scope:** What this project will address
- **Out of Scope:** What this project explicitly will NOT address
- **Adjacent Systems:** Systems that interact but are not part of this project
- **Future Considerations:** Items deferred to later phases

### 6. Constraints

Document limitations that shape the solution space:

| Category | Constraint | Impact |
|----------|-----------|--------|
| **Technical** | Platform, language, infrastructure | Limits technology choices |
| **Organizational** | Team size, skills, availability | Limits delivery capacity |
| **Regulatory** | Laws, standards, certifications | Mandates specific behaviors |
| **Financial** | Budget, cost limits | Limits scope and quality |
| **Timeline** | Deadlines, milestones | Limits what can be delivered when |

### 7. Success Criteria

Define measurable outcomes that indicate project success:

- Each criterion must be **measurable** (quantitative or qualitative with clear evidence)
- Tie criteria to business outcomes, not technical metrics
- These criteria will later help validate whether CPs and FRs are addressing the right problems

---

## Output Format

### Business Context Document

```markdown
# Business Context: [Project Name]

**Version:** [BC_VERSION] | **Created:** [CREATION_DATE] | **Last Updated:** [LAST_UPDATED_DATE]

## Project Identity

| Field | Value |
|-------|-------|
| **Project Name** | [Name] |
| **Business Domain** | [Domain] |
| **Purpose** | [One-sentence purpose statement] |
| **Inception Date** | [Date] |

## Business Principles

### BP-001: [Principle Name]

**Statement:** [Declarative principle statement]
**Class:** [Mandatory | Guiding | Aspirational]
**Rationale:** [Why this principle matters]

### BP-002: [Principle Name]

**Statement:** [Declarative principle statement]
**Class:** [Mandatory | Guiding | Aspirational]
**Rationale:** [Why this principle matters]

<!-- Add more principles as needed -->

## Stakeholders

| Role | Name/Group | Interest | Influence |
|------|------------|----------|-----------|
| [Role] | [Who] | [What they care about] | [Decision/Input/Informed] |

## Current Situation

### Current Process
[Description of how things work today]

### Pain Points
- [Pain point 1]
- [Pain point 2]

### Existing Systems
- [System 1 — purpose]
- [System 2 — purpose]

### What Works Well
- [Element to preserve 1]
- [Element to preserve 2]

## Domain Boundaries

### In Scope
- [Scope item 1]
- [Scope item 2]

### Out of Scope
- [Exclusion 1]
- [Exclusion 2]

### Adjacent Systems
- [System — interaction type]

### Future Considerations
- [Deferred item 1]

## Constraints

| Category | Constraint | Impact |
|----------|-----------|--------|
| [Category] | [Constraint description] | [Impact on project] |

## Success Criteria

| ID | Criterion | Measure | Target |
|----|-----------|---------|--------|
| SC-01 | [What success looks like] | [How to measure] | [Target value] |
| SC-02 | [What success looks like] | [How to measure] | [Target value] |
```

---

## Mode 2: BC Review & Update

### Your Task
Review and update an existing Business Context document.

### Process

1. **Load** the existing `00-business-context.md`
2. **Identify gaps** — missing sections, vague statements, or outdated information
3. **Validate principles** — ensure they are declarative, testable, and actionable
4. **Check stakeholders** — verify completeness and accuracy
5. **Update version** — increment version following:
   - **Major:** Fundamental changes to principles or scope
   - **Minor:** New sections, principles, or stakeholders added
   - **Patch:** Clarifications, wording improvements
6. **Propagation check** — verify that changes don't conflict with existing CPs

### Amendment Report

When updating, prepend a change summary:

```markdown
<!-- Business Context Amendment Report
Version: [old] → [new]
Changes:
- [Change 1]
- [Change 2]
Impact on existing artifacts:
- [Impact on CPs if any]
- [Impact on CNs if any]
-->
```

---

## Examples

### Example 1: Warehouse Inventory System

```markdown
# Business Context: InventoryPro

**Version:** 1.0 | **Created:** 2026-01-15 | **Last Updated:** 2026-01-15

## Project Identity

| Field | Value |
|-------|-------|
| **Project Name** | InventoryPro |
| **Business Domain** | Warehouse logistics |
| **Purpose** | Eliminate $50k/month inventory losses caused by manual tracking errors |
| **Inception Date** | 2026-01 |

## Business Principles

### BP-001: Data Accuracy First

**Statement:** Inventory data must reflect physical reality within 0.1% tolerance at all times.
**Class:** Mandatory
**Rationale:** Financial losses are directly caused by data inaccuracy; this is non-negotiable.

### BP-002: Mobile-First Operations

**Statement:** All warehouse floor operations must be performable from mobile devices.
**Class:** Guiding
**Rationale:** Staff work on the warehouse floor, not at desks. Desktop-only solutions fail adoption.

### BP-003: Open Standards

**Statement:** Prefer open data formats and standard APIs for integration.
**Class:** Aspirational
**Rationale:** Reduces vendor lock-in and enables future integrations with supply chain partners.

## Stakeholders

| Role | Name/Group | Interest | Influence |
|------|------------|----------|-----------|
| Sponsor | VP Operations | Reduce inventory losses | Decision |
| User | Warehouse Staff (50) | Easy scanning and lookup | Input |
| Customer | Supply Chain Partners | Accurate availability data | Informed |
| Regulator | Industry Standards Body | Compliance with tracking regulations | Constraints |
| Development | Internal IT Team (8) | Feasibility and maintenance | Technical Input |

## Current Situation

### Current Process
Manual spreadsheet tracking with weekly physical counts. Staff update spreadsheets at end of shift. Discrepancies found during monthly audits.

### Pain Points
- 3-5 day lag between physical changes and spreadsheet updates
- No real-time visibility into stock levels
- Monthly audits reveal $50k average discrepancy

### Existing Systems
- Excel spreadsheets — inventory tracking (primary)
- SAP ERP — financial reporting (receives monthly data)
- Barcode printers — label generation

### What Works Well
- Barcode labeling system is established and reliable
- Staff are familiar with scanning workflows
- SAP integration for financials is stable

## Domain Boundaries

### In Scope
- Real-time inventory tracking
- Barcode scanning for receiving and shipping
- Stock level alerts and reporting
- Integration with existing SAP ERP

### Out of Scope
- Supply chain management (upstream)
- Customer-facing order portal
- Warehouse layout optimization

### Adjacent Systems
- SAP ERP — receives inventory data
- Supplier portals — send purchase orders (manual today)

### Future Considerations
- Automated reorder triggers (Phase 2)
- RFID tracking pilot (Phase 3)

## Constraints

| Category | Constraint | Impact |
|----------|-----------|--------|
| Technical | Must integrate with SAP ERP via existing APIs | Limits data format choices |
| Organizational | IT team of 8, 3 available for project | Limits parallel development |
| Financial | $200k budget for Phase 1 | Limits scope and vendor options |
| Timeline | Must go live by Q3 2026 | 6-month delivery window |
| Regulatory | Industry tracking compliance required | Mandates audit trail features |

## Success Criteria

| ID | Criterion | Measure | Target |
|----|-----------|---------|--------|
| SC-01 | Inventory accuracy | Monthly audit discrepancy | < $5k/month (from $50k) |
| SC-02 | Data freshness | Time between physical change and system update | < 5 minutes |
| SC-03 | Staff adoption | Active daily users | > 90% of warehouse staff |
| SC-04 | Process efficiency | Time spent on manual data entry | Reduce by 80% |
```

---

## Quality Criteria

Ensure the Business Context:
- ✅ Has a clear project identity with purpose statement
- ✅ Contains at least 2-3 business principles with classification
- ✅ Principles are declarative, testable, and actionable
- ✅ All key stakeholders identified with roles and influence
- ✅ Current situation documented (process, pain points, existing systems)
- ✅ Domain boundaries clearly defined (in/out of scope)
- ✅ Constraints documented with their impact
- ✅ Success criteria are measurable with specific targets
- ✅ No solutions are proposed (that's for later steps)
- ✅ Uses natural language (no technical jargon unless domain-specific)

---

## Anti-Patterns to Avoid

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| "We need a React web app" | "Operations must be accessible from warehouse floor devices" |
| "Use microservices architecture" | "System must support independent team development and deployment" |
| "Success = deploy to production" | "Success = reduce inventory discrepancy from $50k to $5k/month" |
| "All stakeholders" (vague) | "VP Operations (sponsor), 50 warehouse staff (users), IT team of 8" |
| "Should be fast" | "System must update inventory within 5 minutes of physical change" |

---

## Validation Checklist

Before proceeding to Step 1 (Customer Problems), verify:

- [ ] Project identity is complete (name, domain, purpose, date)
- [ ] Business principles defined and classified (Mandatory/Guiding/Aspirational)
- [ ] Stakeholders identified with roles and influence levels
- [ ] Current situation documented (process, pain points, existing systems)
- [ ] Domain boundaries defined (in scope, out of scope)
- [ ] Constraints documented with impact assessment
- [ ] Success criteria defined with measurable targets
- [ ] No solutions or technical implementations proposed
- [ ] Stakeholders agree this represents the business context accurately

---

## Handoff to Next Step

When Business Context is complete, provide:

```
✅ Step 0 Complete: Business Context Established

📁 Saved to: [path]/00-business-context.md

Summary:
- Project: [Project Name] — [Purpose Statement]
- [N] Business Principles defined ([N] Mandatory, [N] Guiding, [N] Aspirational)
- [N] Stakeholders identified
- [N] Constraints documented
- [N] Success Criteria defined

The Business Context provides structured foundation for problem discovery.

→ Next Step: 1 - Customer Problems
→ Use skill: customer-problems
→ Input: The Business Context above (especially Current Situation and Pain Points)
```

---

## References
- Problem-Based SRS Paper (Gorski & Stadzisz)
- Inspired by the project constitution concept from [spec-kit](https://github.com/github/spec-kit)

**Version:** 1.0
**Step:** 0 of 5
**Next:** customer-problems skill
