---
agent: 'agent'
description: 'Generate Customer Needs (outcomes) from Customer Problems'
---

## Role

You're generating **Customer Needs (CN)** for a Problem-Based Software Requirements Specification.

## Step Context

This is **Step 3 of 5** in the Problem-Based SRS process:
1. Customer Problems
2. Software Glance
3. **Customer Needs** ← You are here
4. Software Vision
5. Functional Requirements

## Definition

Customer Needs are the **OUTCOMES** that software shall provide to solve the customer's problems. CNs describe what the software shall provide—not functionalities or how it works.

## Input Required

Customer Problems: ${input:problems:Paste your CP statements}
Software Glance: ${input:glance:Paste your Software Glance (provides boundaries)}

## Structured Notation

Each CN MUST follow this grammar:

```
[Noun] [Verb] [Means] [Object] [Condition]
```

Where:
- **Noun**: Who has the need (the company, a manager, a customer, a user)
- **Verb**: Expresses necessity (needs, wants, intends, aims, desires)
- **Means**: The software system under design
- **Object**: What the software provides (must be one of four outcome classes)
- **Condition**: Constraints on the object (period, accuracy, scope)

## Four Outcome Classes

Every CN must provide ONE of these:

| Class | Examples |
|-------|----------|
| **Information** | Reports, data tables, graphs, alarms, warnings, dashboards |
| **Control** | Continuous supervising, automation, monitoring |
| **Construction** | Means to create texts, models, drafts, images, videos |
| **Entertainment** | Music, video, games |

## Output Format

For each CN:

```markdown
### CN.[ID] → CP.[ID]

[Statement following the structured notation]

- **Outcome Class:** [Information | Control | Construction | Entertainment]
- **Traces to:** CP.[ID]
```

## Examples

**Information outcomes:**
> "The manager needs a software system to know the balance of the client's accounts every quarter."

> "The HR director wants a software application to be aware of employee absenteeism every month."

**Control outcome:**
> "The astronaut needs a software system to control the pressure inside the spacecraft cabin continuously."

**Construction outcome:**
> "The architect needs a software system to create building floor plans in standard formats."

## Rules

- Each CN must trace to at least one CP
- Stay within the Software Glance boundaries
- Focus on OUTCOMES, not functionalities
- Use natural language the customer understands
- One outcome per CN statement

## Quality Checklist

| Criterion | Check |
|-----------|-------|
| Each CN traces to at least one CP | ☐ |
| Each CN uses exactly one outcome class | ☐ |
| Each CN follows [Noun][Verb][Means][Object][Condition] | ☐ |
| CNs stay within Software Glance boundaries | ☐ |
| CNs describe outcomes, not functionalities | ☐ |
| All CPs are addressed by at least one CN | ☐ |

## Handoff

When complete:

```
✅ Step 3 Complete: Customer Needs Specified

Summary:
- [N] Information outcomes
- [N] Control outcomes
- [N] Construction outcomes
- [N] Entertainment outcomes

→ Next Step: 4 - Software Vision
→ Use: /vision prompt
```

---

Based on Problem-Based SRS methodology (Gorski & Stadzisz, 2016)
