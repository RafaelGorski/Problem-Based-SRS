# Getting Started Template

Use this template to begin your Problem-Based SRS journey. Copy sections as needed for your project.

---

## Project: [Your Project Name]

**Date Started**: [Date]  
**Project Lead**: [Name]  
**Team**: [Team members]

---

## Phase 1: Problem Identification

### Stakeholders

| Stakeholder | Role | Contact | Key Pain Points |
|-------------|------|---------|-----------------|
| [Name/Type] | [Role] | [Email] | [Pain points] |
| | | | |
| | | | |

### Current State

**What exists today:**
- [Describe current system/process]
- [What tools are used]
- [How things work now]

**Bottlenecks and issues:**
- [Where things break down]
- [Common complaints]
- [Measurable problems]

### Identified Problems

#### Problem 1: [Short Title]

- **Problem Statement**: [Clear, specific description of the problem]
- **Impact**: [Who is affected? How many people? How severely?]
- **Frequency**: [How often does this occur?]
- **Root Cause**: [What is the underlying cause?]
- **Constraints**: [Budget, time, technology, regulatory limitations]
- **Priority**: High / Medium / Low

**Evidence/Data**:
- [Metrics, tickets, user feedback, etc.]

---

#### Problem 2: [Short Title]

- **Problem Statement**: 
- **Impact**: 
- **Frequency**: 
- **Root Cause**: 
- **Constraints**: 
- **Priority**: 

---

### Problem Priority Matrix

| Problem | Impact | Urgency | Feasibility | Priority Rank |
|---------|--------|---------|-------------|---------------|
| Problem 1 | High/Med/Low | Critical/Important/Nice | Easy/Mod/Hard | 1 |
| Problem 2 | | | | 2 |

### Decision

**Problems to address in this project:**
1. [Problem name] - Priority [rank]
2. [Problem name] - Priority [rank]

**Problems deferred to future:**
- [Problem name] - Reason for deferral

---

## Phase 2: Requirements Elicitation

### Functional Requirements

#### FR-001: [Requirement Title]

**Problem Reference**: [Link to Problem 1, 2, etc.]  
**Priority**: Must Have / Should Have / Could Have / Won't Have

**Description**: [What the system shall do]

**User Story**:
```
As a [role]
I want to [action]
So that [benefit]
```

**Acceptance Criteria**:
1. Given [context], When [action], Then [result]
2. Given [context], When [action], Then [result]

**Dependencies**: [Other requirements]  
**Notes**: [Additional context]

---

#### FR-002: [Requirement Title]

**Problem Reference**:  
**Priority**: 

**Description**: 

**User Story**:
```
As a [role]
I want to [action]
So that [benefit]
```

**Acceptance Criteria**:
1. 
2. 

---

### Non-Functional Requirements

#### NFR-001: Performance - [Specific Aspect]

**Description**: [Quantified performance requirement]

**Measurement**: [How to measure]

**Acceptance Criteria**:
- [Specific metric and target]

---

#### NFR-002: Security - [Specific Aspect]

**Description**: [Security requirement with standards]

**Acceptance Criteria**:
- [Specific requirement]

---

#### NFR-003: Usability - [Specific Aspect]

**Description**: [Usability requirement]

**Acceptance Criteria**:
- [Specific metric]

---

#### NFR-004: Reliability - [Specific Aspect]

**Description**: [Reliability requirement]

**Acceptance Criteria**:
- [Uptime, backup, recovery metrics]

---

### Constraints

**Technical Constraints**:
- [Platform, technology, legacy system limitations]

**Business Constraints**:
- Budget: [$X]
- Timeline: [X months]
- Team: [X people with Y skills]

**Regulatory Constraints**:
- [Compliance requirements: GDPR, HIPAA, SOC 2, etc.]

### Assumptions

1. [Assumption about technology]
2. [Assumption about users]
3. [Assumption about data]

### Out of Scope

This project will NOT include:
- [Feature/requirement]
- [Feature/requirement]

---

## Phase 3: Requirements Specification

### Requirements Traceability Matrix

| Req ID | Problem ID | Business Objective | Stakeholder | Priority | Status |
|--------|------------|-------------------|-------------|----------|--------|
| FR-001 | PROB-01 | [Objective] | [Name] | Must Have | Draft |
| FR-002 | PROB-01 | [Objective] | [Name] | Should Have | Draft |
| NFR-001 | - | [Objective] | [Name] | Must Have | Draft |

### Interface Requirements

**User Interfaces**:
- [Description or link to wireframes]

**External System Interfaces**:
- [System name]: [Integration method, data format]

**API Specifications**:
- [Endpoint]: [Method, request/response format]

### Data Requirements

**Entities**:
- [Entity name]: [Description, key attributes]

**Data Validation Rules**:
- [Rule description]

**Data Retention**:
- [Data type]: [Retention period, archival policy]

---

## Phase 4: Requirements Validation

### Validation Checklist

- [ ] All problems from Phase 1 are addressed
- [ ] Every requirement has unique ID
- [ ] Every requirement has acceptance criteria
- [ ] All stakeholders have reviewed requirements
- [ ] Technical feasibility confirmed
- [ ] No requirements contradict each other
- [ ] All ambiguous language removed
- [ ] Priorities assigned (MoSCoW)
- [ ] Dependencies documented
- [ ] Risks identified
- [ ] Non-functional requirements quantified
- [ ] Traceability matrix complete

### Issues Found

#### Issue #1: [Title]

**Type**: Completeness / Consistency / Correctness / Clarity / Testability / Feasibility  
**Severity**: Critical / High / Medium / Low  
**Requirement(s) Affected**: [FR-XXX, NFR-XXX]

**Description**: [What's wrong]

**Recommendation**: [How to fix]

**Status**: Open / Resolved

---

### Stakeholder Approvals

| Stakeholder | Role | Approval Status | Date | Signature |
|-------------|------|-----------------|------|-----------|
| [Name] | [Role] | Pending / Approved | [Date] | |
| [Name] | [Role] | Pending / Approved | [Date] | |

### Validation Decision

**Status**: ✅ Approved / ⚠️ Conditionally Approved / ❌ Not Approved / 🔄 Needs Revision

**Conditions** (if any):
1. [Condition for approval]
2. [Condition for approval]

**Next Steps**:
- [Action required]
- [Action required]

---

## Additional Sections

### Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| [Risk description] | High/Med/Low | High/Med/Low | [How to mitigate] |

### Success Metrics

**How will we measure success?**
- [Metric]: Baseline [X] → Target [Y]
- [Metric]: Baseline [X] → Target [Y]

**Timeline for measurement**: [When to measure results]

### Budget Breakdown

| Category | Estimated Cost |
|----------|---------------|
| Development | $X |
| Infrastructure | $X |
| Tools/Licenses | $X |
| Testing | $X |
| Contingency (20%) | $X |
| **Total** | **$X** |

### Project Timeline

| Phase | Start Date | End Date | Duration |
|-------|-----------|----------|----------|
| Problem Identification | [Date] | [Date] | [X weeks] |
| Requirements Elicitation | [Date] | [Date] | [X weeks] |
| Requirements Specification | [Date] | [Date] | [X weeks] |
| Requirements Validation | [Date] | [Date] | [X weeks] |
| Design | [Date] | [Date] | [X weeks] |
| Implementation | [Date] | [Date] | [X weeks] |
| Testing | [Date] | [Date] | [X weeks] |
| Deployment | [Date] | [Date] | [X weeks] |

---

## Notes and Decisions

**[Date]**: [Decision or important note]

**[Date]**: [Decision or important note]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | [Date] | [Name] | Initial draft |
| 0.2 | [Date] | [Name] | [Changes] |
| 1.0 | [Date] | [Name] | Approved version |

---

**Pro Tips:**

1. Start by filling out Phase 1 (Problem Identification) completely before moving to Phase 2
2. Use AI agents to help you fill in sections - reference the prompts in `/prompts/`
3. Update this document as you learn more - it's a living document
4. Link to external documents (designs, mockups, research) rather than duplicating content
5. Review and update stakeholder approvals regularly
6. Keep the traceability matrix current - it's your most important tool

**Need help?**
- See [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) for quick lookup
- See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for detailed guidance
- Use the prompts in [prompts/](prompts/) with your AI agent
- Check [examples/](examples/) for real-world examples
