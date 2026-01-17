# Customer Problems (CP)

> **Step 1** of the Problem-Based SRS methodology

## Purpose

Guide AI coding agents through identifying, documenting, and validating Customer Problems from business context. Customer Problems are the foundation - all subsequent artifacts (Software Glance, Customer Needs, Software Vision, Requirements) derive from CPs.

---

## Scope

| Aspect | Boundary |
|--------|----------|
| **This prompt does** | Discover problems from context, normalize statements, and validate quality |
| **This prompt does NOT** | Define solutions or derive requirements |
| **Input from** | Business context OR draft CP statements |
| **Output to** | Step 2: Software Glance (`glance.md`) |

---

## Two Modes of Operation

### Mode 1: CP Generation
Use when starting from **business context** to discover and document problems.

### Mode 2: CP Review & Normalization  
Use when you have **draft CP statements** that need quality review and formatting.

---

## Mode 1: CP Generation

### Your Task
Analyze the provided business context and generate Customer Problem statements.

### Input Required
- **Business Context:** Description of the business domain, current situation, and scope
- **Stakeholder Information:** Who experiences the problems (optional but helpful)

### Discovery Questions

Ask these questions to elicit problems:

1. **Obligations:**
   - What legal or contractual requirements must be met?
   - What regulations apply to this business?
   - What happens if compliance fails?

2. **Expectations:**
   - What do customers/users expect that isn't being delivered?
   - What business goals are not being met?
   - What standards should be achieved but aren't?

3. **Hopes:**
   - What improvements would stakeholders like to see?
   - What optimizations are desired?
   - What new capabilities are wished for?

4. **Consequences:**
   - What happens if these issues aren't addressed?
   - What is the cost of the current situation?
   - Who is impacted and how severely?

---

## Mode 2: CP Review & Normalization

### Your Task
For each draft problem:
1. **Normalize** into the CP syntax: `[Subject] [Verb] [Object] [Penalty]`
2. **Classify** as **Obligation**, **Expectation**, or **Hope**
3. **Flag missing elements** (subject, object, penalty, or severity verb)
4. **Ask clarifying questions** only when required data is missing

---

## CP Structured Notation

Each Customer Problem MUST follow this syntax:

```
[Subject] [Verb] [Object] [Penalty/Consequence]
```

**Components:**
- **Subject:** Who suffers the problem (company, manager, customer, department)
- **Verb:** Indicates severity class (must/expects/hopes)
- **Object:** The difficulty or requirement
- **Penalty:** Consequence if problem persists

---

## Problem Classification

Classify each CP by severity:

| Class | Severity | Verbs | Description |
|-------|----------|-------|-------------|
| **Obligation** | High | must, have to, is required to | Legal/contractual; severe consequences if unmet |
| **Expectation** | Medium | expects, should, anticipates | Business goal; moderate impact if unmet |
| **Hope** | Low | hopes, aims, desires, wishes | Improvement; minimal penalty if unmet |

---

## Output Format

### For Mode 1 (Generation)

For each identified problem, produce:

```markdown
### CP-[ID]: [Brief Title]

**Statement:** [Subject] [Verb] [Object] [Penalty]

**Classification:** [Obligation | Expectation | Hope]

**Subject:** [Who has this problem]

**Consequence if Unsolved:**
- [Negative impact 1]
- [Negative impact 2]

**Benefit if Solved:**
- [Positive outcome 1]
- [Positive outcome 2]
```

### For Mode 2 (Review)

```markdown
## Normalized Customer Problems

| CP ID | Normalized Statement | Class | Missing Info |
|-------|----------------------|-------|--------------|
| CP.1 | [Subject] [Verb] [Object] [Penalty] | [Obligation/Expectation/Hope] | [None or list] |

## Clarification Questions (if any)
- [Question 1]
- [Question 2]
```

---

## Examples

### Example 1: Obligation
```markdown
### CP-001: Regulatory Compliance

**Statement:** The company must submit emission compliance reports within 30 days of each quarter end otherwise faces fines up to 5% of revenue.

**Classification:** Obligation

**Subject:** The company (compliance department)

**Consequence if Unsolved:**
- Financial penalties (5% revenue)
- Regulatory sanctions
- Public reputation damage

**Benefit if Solved:**
- Regulatory compliance maintained
- Avoid financial penalties
- Maintain operating license
```

### Example 2: Expectation
```markdown
### CP-002: Customer Response Time

**Statement:** Customers expect responses to support inquiries within 24 hours otherwise they become dissatisfied and may switch to competitors.

**Classification:** Expectation

**Subject:** Customers (end users)

**Consequence if Unsolved:**
- Customer dissatisfaction
- Increased churn rate
- Negative reviews

**Benefit if Solved:**
- Improved customer satisfaction
- Higher retention rates
- Positive word-of-mouth
```

### Example 3: Hope
```markdown
### CP-003: Sales Forecasting

**Statement:** Management hopes to predict quarterly sales with 85% accuracy otherwise strategic planning remains reactive rather than proactive.

**Classification:** Hope

**Subject:** Management (sales leadership)

**Consequence if Unsolved:**
- Suboptimal resource allocation
- Missed market opportunities
- Reactive decision making

**Benefit if Solved:**
- Better resource planning
- Proactive market positioning
- Improved profitability
```

---

## Quality Criteria

Ensure each CP:
- ✅ Uses the structured notation (Subject + Verb + Object + Penalty)
- ✅ Has a clear classification (Obligation/Expectation/Hope)
- ✅ Identifies the subject who experiences the problem
- ✅ Specifies consequences if unsolved
- ✅ Specifies benefits if solved
- ✅ Is problem-focused, NOT solution-focused
- ✅ Uses natural language (no technical jargon)

---

## Anti-Patterns to Avoid

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| "We need a mobile app" | "Field staff cannot access inventory data outside office" |
| "System is slow" | "Report generation takes >5 minutes causing missed deadlines" |
| "Improve UX" | "Users abandon checkout 40% of time due to confusing navigation" |
| "Need better reporting" | "Managers must submit compliance reports within 10 days or face fines" |

---

## Validation Checklist

Before proceeding to Step 2 (Software Glance), verify:

- [ ] All identified problems are documented as CPs
- [ ] Each CP uses structured notation
- [ ] Every CP includes Subject, Verb, Object, Penalty
- [ ] Verb matches correct severity class
- [ ] Classifications assigned to all CPs
- [ ] Consequences and benefits documented
- [ ] Stakeholders agree these represent real business problems
- [ ] No solutions are embedded in problem statements

---

## Handoff to Next Step

When CPs are complete, provide:

```
✅ Step 1 Complete: Customer Problems Specified

Summary:
- [N] Obligations identified
- [N] Expectations identified  
- [N] Hopes identified

Artifacts:
[List CP-IDs with brief titles]

→ Next Step: 2 - Software Glance
→ Use: prompts/glance.md
→ Input: The CPs documented above
```

---

## Usage

### GitHub Copilot
```
@workspace Generate Customer Problems for [project].
Use prompts/CP.md

Business Context:
[paste description]
```

### Claude Code
```
Apply CP generation from prompts/CP.md

Project: [name]
Business Context: [description]
```

---

## References
- Problem-Based SRS Paper (Gorski & Stadzisz) - `docs/Problem-Based-SRS-Paper.md`
- Coordinator Prompt - `prompts/problem-based-SRS.md`

**Version:** 1.0  
**Step:** 1 of 5  
**Next:** `glance.md`
