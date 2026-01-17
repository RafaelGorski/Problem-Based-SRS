# Problem-Based SRS Coordinator

## Purpose
Orchestrate requirements engineering using the Problem-Based SRS methodology (Gorski & Stadzisz). This prompt coordinates the multi-step process by routing to specialized prompts for each phase.

**Single Responsibility:** Route to the correct phase prompt and maintain process state.

---

## Methodology Overview

```
Business Context
       ↓
┌──────────────────┐
│ Step 1: CP       │ → prompts/CP.md
│ Customer Problems│
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 2: SG       │ → prompts/glance.md
│ Software Glance  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 3: CN       │ → prompts/CN.md
│ Customer Needs   │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 4: SV       │ → prompts/vision.md
│ Software Vision  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 5: SR       │ → prompts/FR.md
│ Software Reqs    │
└──────────────────┘
```

**Traceability Chain:** SR → CN → CP (every requirement traces back to a problem)

---

## Invocation

### GitHub Copilot
```
@workspace Follow Problem-Based SRS methodology for [project].
Use prompts/problem-based-SRS.md as coordinator.
Current step: [1-5 or "new"]
```

### Claude Code
```
Apply Problem-Based SRS from prompts/problem-based-SRS.md
Project: [name]
Step: [1-5 or "new"]
Context: [existing artifacts or business description]
```

---

## Routing Logic

When invoked, determine the current step and route accordingly:

### Step 1: Customer Problems (CP)
**Trigger:** New project OR no CPs exist  
**Route to:** `prompts/CP.md`  
**Input required:** Business context description  
**Output:** List of CPs with classifications (Obligation/Expectation/Hope)  
**Gate:** CPs documented and stakeholders agree → proceed to Step 2

### Step 2: Software Glance (SG)
**Trigger:** CPs exist, no SG exists  
**Route to:** `prompts/glance.md`  
**Input required:** Customer Problems from Step 1  
**Output:** High-level system description, components, interfaces  
**Gate:** System boundaries understood → proceed to Step 3

### Step 3: Customer Needs (CN)
**Trigger:** CPs and SG exist, no CNs exist  
**Route to:** `prompts/CN.md`  
**Input required:** CPs + Software Glance  
**Output:** CNs with outcome types (Information/Control/Construction/Entertainment)  
**Gate:** Every CP has corresponding CN(s) → proceed to Step 4

### Step 4: Software Vision (SV)
**Trigger:** CNs exist, no SV exists  
**Route to:** `prompts/vision.md`  
**Input required:** CNs + Software Glance  
**Output:** Vision document with positioning, stakeholders, features  
**Gate:** Vision approved by stakeholders → proceed to Step 5

### Step 5: Software Requirements (SR)
**Trigger:** CNs and SV exist  
**Route to:** `prompts/FR.md`  
**Input required:** CNs + Software Vision  
**Output:** Functional Requirements  
**Gate:** Complete SRS with traceability matrix

---

## Detection Heuristics

Determine current step by checking what artifacts exist:

| If user has... | Current Step | Action |
|----------------|--------------|--------|
| Nothing / business idea only | 1 | Route to CP.md |
| Customer Problems (CPs) | 2 | Route to glance.md |
| CPs + Software Glance | 3 | Route to CN.md |
| CPs + SG + Customer Needs | 4 | Route to vision.md |
| CPs + CNs + Software Vision | 5 | Route to FR.md |

---

## Handoff Protocol

When completing a step, provide:

1. **Summary** of outputs produced
2. **Validation** that gate criteria are met
3. **Next step** recommendation with specific prompt reference
4. **Required inputs** for next step

### Example Handoff (Step 1 → Step 2):
```
✅ Step 1 Complete: Customer Problems Specified

Outputs:
- CP-001: [Obligation] Company must...
- CP-002: [Expectation] Users expect...
- CP-003: [Hope] Management hopes...

Gate Check:
- [x] All CPs use structured notation
- [x] Classifications assigned
- [x] Consequences documented

→ Next: Step 2 - Software Glance
→ Use: prompts/glance.md
→ Input: The CPs above
```

---

## Problem-First Enforcement

If user attempts to skip to solutions:

**Detect:** User mentions specific technology, feature, or implementation before CPs exist

**Redirect:**
```
I notice you're describing a solution. Let's first understand the problem.

Before we design [mentioned solution], help me understand:
1. What business obligation, expectation, or hope drives this need?
2. What negative consequences occur without this?
3. Who is impacted?

→ Routing to: prompts/CP.md
```

---

## Quick Syntax Reference

| Artifact | Syntax Pattern |
|----------|----------------|
| **CP** | [Subject] [must/expects/hopes] [Object] [Penalty] |
| **CN** | [Subject] needs [software system] to [Verb] [Object] [Condition] |
| **SR** | The [System] shall [Verb] [Object] [Constraint] [Condition] |

| CP Class | Severity | Example Verb |
|----------|----------|--------------|
| Obligation | High | must, have to, is required to |
| Expectation | Medium | expects, should, anticipates |
| Hope | Low | hopes, aims, desires |

| CN Outcome | Description |
|------------|-------------|
| Information | Reports, alerts, data, dashboards |
| Control | Monitoring, automation, regulation |
| Construction | Create documents, models, artifacts |
| Entertainment | Games, experiences, engagement |

---

## Prompt Files Reference

| Step | Artifact | Prompt File |
|------|----------|-------------|
| 1 | Customer Problems | `CP.md` |
| 2 | Software Glance | `glance.md` |
| 3 | Customer Needs | `CN.md` |
| 4 | Software Vision | `vision.md` |
| 5 | Software Requirements | `FR.md` |

---

## Version
**Version:** 2.0  
**Methodology:** Problem-Based SRS (Gorski & Stadzisz)  
**Role:** Coordinator only - delegates to specialized prompts
