# Quick Reference Guide

## Problem-Based SRS Cheat Sheet

### 🎯 Core Principle

**Always start with the problem, not the solution.**

Every requirement should trace back to a real, validated problem.

---

## Phase Summary

| Phase | Focus | Key Output | Duration Guide |
|-------|-------|------------|----------------|
| 1. Problem Identification | What problems exist? | Problem Analysis Document | 1-2 weeks |
| 2. Requirements Elicitation | What should we build? | Requirements List | 2-4 weeks |
| 3. Requirements Specification | How do we document it? | Formal SRS Document | 1-2 weeks |
| 4. Requirements Validation | Is it correct? | Validation Report | 1 week |

---

## Phase 1: Problem Identification

### Ask These Questions

1. Who are the stakeholders?
2. What are their pain points?
3. What is the current state?
4. What is the root cause? (Ask "why" 5 times)
5. How often does this occur?
6. What's the impact?
7. What constraints exist?

### Output Template

```markdown
## Problem X: [Title]
- **Problem Statement**: [Clear, specific, measurable]
- **Impact**: [Who, how many, severity]
- **Frequency**: [How often]
- **Root Cause**: [Underlying issue]
- **Priority**: High/Medium/Low
```

---

## Phase 2: Requirements Elicitation

### Requirement Types

**Functional Requirements (FR)**: What the system does
- User actions
- System behaviors
- Business rules
- Data processing

**Non-Functional Requirements (NFR)**: How the system performs
- Performance (speed, capacity)
- Security (authentication, authorization)
- Usability (accessibility, user experience)
- Reliability (uptime, backup)
- Scalability (growth capacity)

### User Story Format

```
As a [role]
I want to [action]
So that [benefit]
```

### Acceptance Criteria Format

```
Given [precondition]
When [action]
Then [expected outcome]
```

---

## Phase 3: Requirements Specification

### Requirement Structure

```markdown
### FR-001: [Title]
**Description**: System shall [specific action]
**Problem Reference**: PROB-001
**Priority**: Must Have / Should Have / Could Have / Won't Have
**Acceptance Criteria**:
1. Given [context], When [action], Then [result]
2. ...
**Dependencies**: [Other requirements]
```

### Key Words

- **Shall** = Mandatory requirement
- **Should** = Recommended feature
- **May** = Optional feature
- **Must** = Non-negotiable constraint

---

## Phase 4: Requirements Validation

### Validation Checklist

| Check | Question |
|-------|----------|
| ✅ **Complete** | Are all problems addressed? |
| ✅ **Consistent** | Do requirements contradict each other? |
| ✅ **Correct** | Do stakeholders agree this is what they need? |
| ✅ **Clear** | Is there only one interpretation? |
| ✅ **Testable** | Can we objectively verify this? |
| ✅ **Feasible** | Can we build this with available resources? |
| ✅ **Traceable** | Does this link to a problem/objective? |

### Red Flags to Avoid

| ❌ Avoid | ✅ Use Instead |
|---------|---------------|
| "user-friendly" | "WCAG 2.1 AA compliant" |
| "fast" | "responds within 2 seconds" |
| "secure" | "uses OAuth 2.0 with MFA" |
| "reliable" | "99.9% uptime" |
| "scalable" | "supports 10,000 concurrent users" |
| "handle" | "process", "validate", "store" |
| "many", "few" | Specific numbers |

---

## Common Requirement Patterns

### Performance

```
System shall respond to [action] within [X] seconds 
for [Y]% of requests under [Z] load conditions.
```

### Security

```
System shall authenticate users using [protocol] 
and authorize access based on [method].
```

### Data

```
System shall store [data type] with [constraints] 
and retain for [duration].
```

### Integration

```
System shall integrate with [external system] via [protocol/API] 
to exchange [data type].
```

---

## MoSCoW Prioritization

| Priority | Meaning | When to Use |
|----------|---------|-------------|
| **Must Have** | Critical for launch | Core functionality, legal requirements |
| **Should Have** | Important but not critical | Significant value but workarounds exist |
| **Could Have** | Nice to have | Improves experience but not essential |
| **Won't Have** | Not now (maybe later) | Good ideas deferred to future phases |

---

## Traceability Matrix Template

| Req ID | Problem ID | Business Goal | Stakeholder | Priority | Status |
|--------|------------|---------------|-------------|----------|--------|
| FR-001 | PROB-01 | Reduce costs | Operations | Must | Approved |
| FR-002 | PROB-01 | Reduce costs | Operations | Should | In Review |

---

## AI Agent Quick Commands

### GitHub Copilot

```
@workspace Using #file:.ai-prompts/01-problem-identification.md 
analyze problems with [feature]
```

### Claude Code

```
Follow the problem identification methodology to help me 
document problems with [feature]
```

---

## Tips for Success

### DO ✅
- Start with quantifiable problems
- Involve stakeholders early and often
- Use concrete, measurable criteria
- Link every requirement to a problem
- Iterate and refine continuously
- Document assumptions and constraints
- Use examples to clarify requirements

### DON'T ❌
- Jump to solutions before understanding problems
- Use vague or ambiguous language
- Write requirements without acceptance criteria
- Skip validation with stakeholders
- Ignore constraints and risks
- Create requirements without traceability
- Assume everyone has the same understanding

---

## Document Checklist

Before considering requirements "done":

- [ ] Every requirement has unique ID
- [ ] Every requirement traces to a problem
- [ ] Every requirement has acceptance criteria
- [ ] All stakeholders have reviewed
- [ ] Technical feasibility confirmed
- [ ] Priorities assigned (MoSCoW)
- [ ] Dependencies documented
- [ ] Risks identified
- [ ] Non-functional requirements quantified
- [ ] Compliance requirements verified
- [ ] Traceability matrix complete
- [ ] Validation report created

---

## Common Mistakes

### Mistake 1: Solution in Disguise
❌ **Bad**: "System shall use microservices architecture"
✅ **Good**: "System shall scale to handle 50,000 concurrent users" (Problem: current system crashes at 5,000 users)

### Mistake 2: Too Vague
❌ **Bad**: "System shall have good performance"
✅ **Good**: "System shall load dashboard within 2 seconds for 95% of requests"

### Mistake 3: Missing Acceptance Criteria
❌ **Bad**: "Users can search for products"
✅ **Good**: 
```
FR-010: Product Search
Given I enter a search term
When I click "Search"
Then results display within 1 second
And results are sorted by relevance
And I see up to 50 results per page
```

### Mistake 4: Gold Plating
❌ **Bad**: Adding "nice to have" features as "must have"
✅ **Good**: Use MoSCoW prioritization ruthlessly

### Mistake 5: Ignoring Non-Functionals
❌ **Bad**: Only documenting functional requirements
✅ **Good**: Include performance, security, usability, reliability requirements

---

## Getting Help

- **Prompt Files**: `/prompts/*.md` - Detailed guidance for each phase
- **Methodology**: `/docs/METHODOLOGY.md` - Complete methodology explanation
- **Examples**: `/examples/*.md` - Real-world walkthroughs
- **Integration**: `/docs/*_INTEGRATION.md` - AI agent setup guides

---

## One-Liner Reminders

- "No requirement without a problem"
- "Shall = mandatory, Should = recommended, May = optional"
- "If you can't test it, rewrite it"
- "Numbers > adjectives"
- "Why before what, what before how"
- "Every requirement needs acceptance criteria"
- "Stakeholder approval = requirement validity"

---

**Keep this reference handy when working through the methodology!**
