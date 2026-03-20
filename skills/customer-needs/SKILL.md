---
name: customer-needs
description: Specify Customer Needs (CN) that define WHAT outcomes software must provide to solve Customer Problems. Use after Software Glance to translate problems into needs. Step 3 of Problem-Based SRS methodology.
license: MIT
metadata:
  author: rafael-gorski
  version: "1.2"
  methodology: problem-based-srs
  step: 3
---

# Customer Needs (CN)

> **Step 3 of 5** in Problem-Based SRS methodology  
> **Previous:** Customer Problems → Software Glance  
> **Next:** Software Vision

---

## Required Inputs

Before running this skill, ensure you have:
- [ ] **Customer Problems (CPs)** — from customer-problems skill
- [ ] **Software Glance** — early rough idea of the software solution (provides boundaries)

---

## Definition

Customer Needs describe the outcomes a software system must deliver to solve (or help solve) the customer's problems — not how the system works internally.

## Your Task

For each CP, generate CN statements that map directly to solving that problem.

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

Every CN must provide ONE of these outcomes. The software delivers VALUE through these categories:

### 1. Information
**What it is:** Data, knowledge, awareness delivered to the user

**Common verbs:** know, be aware, be informed, be reminded, see, view, receive

**Examples:**
| Domain | CN Statement |
|--------|--------------|
| CRM | "The manager needs a CRM to know customer feedback statistics monthly." |
| HR | "The HR director wants an HR system to be aware of employee absenteeism weekly." |
| Finance | "The accountant needs the system to know overdue invoices daily." |
| IoT | "The homeowner needs the app to be informed when energy usage exceeds threshold." |

### 2. Control
**What it is:** Continuous supervision, automatic regulation, or active management of processes

**Common verbs:** control, regulate, manage, supervise, maintain, adjust, ensure

**Examples:**
| Domain | CN Statement |
|--------|--------------|
| Energy | "The user needs MicroER to control energy distribution based on consumption profiles." |
| Aerospace | "The astronaut needs the system to control cabin pressure continuously." |
| Manufacturing | "The operator needs the system to regulate temperature within ±2°C." |
| Smart Home | "The homeowner needs the system to manage HVAC based on occupancy." |

### 3. Construction
**What it is:** Means to create, build, or produce digital artifacts

**Common verbs:** create, build, compose, generate, design, draft, edit, produce

**Examples:**
| Domain | CN Statement |
|--------|--------------|
| CRM | "The marketing team needs the system to create email campaigns." |
| Architecture | "The architect needs the system to create floor plans in CAD format." |
| Reporting | "The manager needs the system to generate monthly performance reports." |
| Content | "The user needs the system to compose responses to customer feedback." |

### 4. Entertainment
**What it is:** Enjoyment, leisure, or recreational value

**Common verbs:** play, enjoy, experience, watch, listen

**Examples:**
| Domain | CN Statement |
|--------|--------------|
| Gaming | "The player needs the game to provide multiplayer battles." |
| Media | "The user needs the app to play music based on mood." |
| Streaming | "The viewer needs the platform to recommend shows based on history." |

### Outcome Class Distribution by Domain

| Domain Type | Typical Distribution |
|-------------|---------------------|
| Business/Enterprise | 70% Information, 20% Construction, 10% Control |
| IoT/Embedded | 50% Information, 40% Control, 10% Construction |
| Creative Tools | 60% Construction, 30% Information, 10% Control |
| Entertainment | 70% Entertainment, 20% Information, 10% Construction |

## Output Format

For each CN, provide:

```markdown
CN.[ID] - [Statement following the structured notation]
- Outcome Class: [Information | Control | Construction | Entertainment]
- Traces to: CP.[ID]
```

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
CN.01.1 - The sales team needs a CRM software to know the complete purchase history of each customer at any time.
- Outcome Class: Information
- Traces to: CP.01

CN.02.1 - The account manager needs a CRM software to be aware of customer feedback statistics monthly.
- Outcome Class: Information
- Traces to: CP.02

CN.02.2 - The account manager desires a CRM software to know which customer complaints remain unaddressed daily.
- Outcome Class: Information
- Traces to: CP.02
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

## Handoff to Next Step

When CNs are complete:

```
✅ Step 3 Complete: Customer Needs Specified

Summary:
- [N] Information needs
- [N] Control needs
- [N] Construction needs
- [N] Entertainment needs

→ MANDATORY: Run zigzag-validator skill to validate CP → CN traceability
→ Next Step: 4 - Software Vision
→ Use skill: software-vision
```

---

## What This Skill Does NOT Do

This skill focuses solely on CN generation. The following are handled by other skills:
- ❌ Problem identification → use `customer-problems` skill
- ❌ Software Glance creation → use `software-glance` skill
- ❌ Software Vision refinement → use `software-vision` skill
- ❌ Requirements specification → use `functional-requirements` skill

---

## Reference

Based on Problem-Based SRS methodology (Gorski & Stadzisz, 2016)

**Version:** 1.2  
**Step:** 3 of 5  
**Next:** software-vision skill
