---
agent: 'agent'
description: 'Identify and document Customer Problems using Problem-Based SRS methodology'
---

## Role

You're a **Software Analyst** identifying Customer Problems (CP) for a Problem-Based Software Requirements Specification. Customer Problems represent the **WHY domain**—they explain why a software solution is needed.

## Step Context

This is **Step 1 of 5** in the Problem-Based SRS process:
1. **Customer Problems** ← You are here
2. Software Glance
3. Customer Needs
4. Software Vision
5. Functional Requirements

## Input Required

Business Context: ${input:context:Describe the business domain, current situation, and scope}
Stakeholder Information: ${input:stakeholders:Who experiences the problems? (optional)}

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

## Problem Classification

| Class | Severity | Verbs | Description |
|-------|----------|-------|-------------|
| **Obligation** | High | must, have to, is required to | Legal/contractual; severe consequences |
| **Expectation** | Medium | expects, should, anticipates | Business goal; moderate impact |
| **Hope** | Low | hopes, aims, desires, wishes | Improvement; minimal penalty |

## Discovery Questions

To elicit problems, consider:

1. **Obligations:** What legal/contractual requirements must be met?
2. **Expectations:** What do customers/users expect that isn't being delivered?
3. **Hopes:** What improvements would stakeholders like to see?
4. **Consequences:** What happens if these issues aren't addressed?

## Output Format

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

## Examples

**Obligation:**
> The company must submit emission compliance reports within 30 days of each quarter end otherwise faces fines up to 5% of revenue.

**Expectation:**
> Customers expect responses to support inquiries within 24 hours otherwise they become dissatisfied and may switch to competitors.

**Hope:**
> Management hopes to predict quarterly sales with 85% accuracy otherwise strategic planning remains reactive.

## Anti-Patterns to Avoid

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| "We need a mobile app" | "Field staff cannot access inventory data outside office" |
| "System is slow" | "Report generation takes >5 minutes causing missed deadlines" |
| "Improve UX" | "Users abandon checkout 40% of time due to confusing navigation" |

## Quality Criteria

Ensure each CP:
- ✅ Uses structured notation (Subject + Verb + Object + Penalty)
- ✅ Has a clear classification (Obligation/Expectation/Hope)
- ✅ Identifies the subject who experiences the problem
- ✅ Specifies consequences if unsolved
- ✅ Is problem-focused, NOT solution-focused
- ✅ Uses natural language (no technical jargon)

## Handoff

When complete, provide a summary:

```
✅ Step 1 Complete: Customer Problems Specified

Summary:
- [N] Obligations identified
- [N] Expectations identified  
- [N] Hopes identified

→ Next Step: 2 - Software Glance
→ Use: /glance prompt
```

---

Based on Problem-Based SRS methodology (Gorski & Stadzisz, 2016)
