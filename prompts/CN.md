# Customer Needs (CN) Generation

> **Step 3 of 5** in Problem-Based SRS methodology  
> **Previous:** CP Identification → Software Glance  
> **Next:** Software Vision Designing

---

## Required Inputs

Before running this prompt, ensure you have:
- [ ] **Customer Problems (CPs)** — from CP identification step
- [ ] **Software Glance** — early rough idea of the software solution (provides boundaries)

---

## Prompt

```
You are generating Customer Needs (CN) for a Problem-Based Software Requirements Specification.

## Definition
Customer Needs are the OUTCOMES that a software shall provide to solve (or help solve) the customer's problems. CNs describe what the software shall provide—not functionalities or how it works.

## Required Inputs
I will provide:
1. Customer Problems (CPs) to address
2. Software Glance (the envisioned solution boundaries)

## Your Task
For each CP, generate CN statements that map directly to solving that problem.

## Structured Notation
Each CN MUST follow this grammar:

[Noun] [Verb] [Means] [Object] [Condition]

Where:
- **Noun**: Who has the need (the company, a manager, a customer, a user)
- **Verb**: Expresses necessity (needs, wants, intends, aims, desires)
- **Means**: The software system under design
- **Object**: What the software provides (must be one of four outcome classes)
- **Condition**: Constraints on the object (period, accuracy, scope)

## Four Outcome Classes
Every CN must provide ONE of these:
1. **Information** — reports, data tables, graphs, alarms, warnings, light signs
2. **Control** — continuous supervising of running logic
3. **Construction** — means to construct digital things (texts, models, drafts, images, videos)
4. **Entertainment** — music, video, games

## Output Format
For each CN, provide:

CN.[ID] - [Statement following the structured notation]
- Outcome Class: [Information | Control | Construction | Entertainment]
- Traces to: CP.[ID]

## Rules
- Each CN must trace to at least one CP
- Stay within the Software Glance boundaries
- Focus on OUTCOMES, not functionalities
- Use natural language the customer understands
- One outcome per CN statement

## Examples from Methodology

**Information outcomes:**
- "The manager needs a software system to know the balance of the client's accounts every quarter."
- "The human resource director wants a software application to be aware about the employee absenteeism every month."

**Control outcome:**
- "The astronaut needs a software system to control the pressure inside the spacecraft cabin continuously."

**Construction outcome:**
- "The architect needs a software system to create building floor plans in standard formats."

Now generate CNs for the provided CPs, staying within the Software Glance boundaries.
```

---

## Usage Example

**Input:**
```
Software Glance: CRM web application for managing customer relationships

CP.1 - The sales team lacks visibility into customer purchase history, causing repeated pitches of already-owned products.
CP.2 - Account managers cannot track customer feedback systematically, leading to unaddressed complaints.
```

**Output:**
```
CN.1 - The sales team needs a CRM software to know the complete purchase history of each customer at any time.
- Outcome Class: Information
- Traces to: CP.1

CN.2 - The account manager needs a CRM software to be aware of customer feedback statistics monthly.
- Outcome Class: Information
- Traces to: CP.2

CN.3 - The account manager desires a CRM software to know which customer complaints remain unaddressed daily.
- Outcome Class: Information
- Traces to: CP.2
```

---

## Quality Checklist

| Criterion | Check |
|-----------|-------|
| Each CN traces to at least one CP | ☐ |
| Each CN uses exactly one outcome class | ☐ |
| Each CN follows [Noun][Verb][Means][Object][Condition] | ☐ |
| CNs stay within Software Glance boundaries | ☐ |
| CNs describe outcomes, not functionalities | ☐ |
| All CPs are addressed by at least one CN | ☐ |

---

## What This Prompt Does NOT Do

This prompt focuses solely on CN generation. The following are handled by other prompts:
- ❌ Problem identification → use `CP.md`
- ❌ Software Glance creation → use `glance.md`
- ❌ Software Vision refinement → use `vision.md`
- ❌ Requirements specification → use `FR.md`

---

## Reference

Based on Problem-Based SRS methodology (Gorski & Stadzisz, 2016)  
Compatible with: GitHub Copilot, Claude Code, Cursor, and similar AI coding assistants
