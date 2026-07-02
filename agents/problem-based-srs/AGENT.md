---
name: problem-based-srs
description: Complete Problem-Based Software Requirements Specification methodology following Gorski & Stadzisz research. Use when you need to perform requirements engineering from business problems to functional requirements with full traceability.
license: MIT
metadata:
  author: rafael-gorski
  version: "1.3"
  methodology: problem-based-srs
---

# Problem-Based SRS Agent

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they appear in all capitals, as shown here.

Orchestrate requirements engineering using the Problem-Based SRS methodology (Gorski & Stadzisz). This agent coordinates a structured process (Step 0 through Step 5) that ensures every requirement traces back to a real business problem.

## Methodology Overview

> **Diagram standard:** Use Mermaid UML diagrams as the preferred format for all visual artifacts. Mermaid is **mandatory** for Software Glance (Step 2) and Software Vision (Step 4), and **preferred** for other steps where diagrams add value.

```
Stakeholder Input
       ↓
┌──────────────────┐
│ Step 0: BC       │ → /problem-based-srs business-context
│ Business Context │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 1: CP       │ → /problem-based-srs problems
│ Customer Problems│
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 2: SG       │ → /problem-based-srs software-glance
│ Software Glance  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 3: CN       │ → /problem-based-srs needs
│ Customer Needs   │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 4: SV       │ → /problem-based-srs software-vision
│ Software Vision  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 5: FR/NFR   │ → /problem-based-srs functional-requirements
│ Requirements     │
└──────────────────┘
```

**Traceability Chain:** FR → CN → CP (every requirement traces back to a problem)

**Domain Mapping (WHY → WHAT → HOW):**
| Domain | Artifact | Question Answered |
|--------|----------|-------------------|
| **WHY** | Customer Problems (CP) | Why is the solution needed? (Business justification) |
| **WHAT** | Customer Needs (CN) | What outcomes MUST the software provide? |
| **HOW** | Functional Requirements (FR) | How will the system behave? |

## Available Actions

This agent drives the methodology through a **single command**, `/problem-based-srs`,
dispatching to a step via an **action** argument:

| Action | Command | Purpose |
|--------|---------|---------|
| `business-context` | `/problem-based-srs business-context` | Step 0: Establish structured business context and principles |
| `problems` | `/problem-based-srs problems` | Step 1: Identify and classify customer problems |
| `software-glance` | `/problem-based-srs software-glance` | Step 2: Create high-level solution view |
| `needs` | `/problem-based-srs needs` | Step 3: Specify customer needs (outcomes) |
| `software-vision` | `/problem-based-srs software-vision` | Step 4: Define software vision and architecture |
| `functional-requirements` | `/problem-based-srs functional-requirements` | Step 5: Generate functional requirements |
| `validate` | `/problem-based-srs validate` | Validate traceability across domains (ZigZag) |
| `complexity` | `/problem-based-srs complexity` | Optional: Axiomatic Design quality analysis |
| `full` | `/problem-based-srs` | Run the complete methodology (Step 0 → Step 5) |

## How to Use This Agent

### ⚠ File Creation Rule: ONE FILE AT A TIME

**NEVER create multiple artifact files in parallel.** Always create files **one at a time, sequentially** — wait for each file to be saved before creating the next one. Batch/parallel file creation causes JSON serialization errors in tool calls when the combined content is too large.

### Starting Fresh
When user provides business context or problem description:
1. **Ask where to save artifacts** (if not already specified)
2. **Start with Step 0** — Use the `business-context` action to establish structured context
3. **Save `00-business-context.md`** with the structured business context
4. Detect current step (see Detection Heuristics below)
5. Invoke the appropriate action
6. Guide user through the process
7. **Save output to the corresponding file(s)** (one file at a time)

### Continuing Work
If user has existing artifacts (CPs, CNs, etc.):
1. **Check for existing artifact folder** (`.spec/`, `docs/srs/`, `requirements/`, etc.)
2. **Read existing files** to understand current state
3. Identify what they have
4. Jump to appropriate step
5. Invoke that step's action
6. Continue from there, **updating files as needed**

### Validation
At any point, use the `/problem-based-srs validate` action to check consistency.

## Detection Heuristics

Determine current step by checking what artifacts exist:

| If user has... | Current Step | Action | Save To |
|----------------|--------------|--------|---------|
| Nothing / business idea only | 0 | `business-context` | 00-business-context.md |
| Business Context (BC) | 1 | `problems` | 01-customer-problems.md |
| Customer Problems (CPs) | 2 | `software-glance` | 02-software-glance.md |
| CPs + Software Glance | 3 | `needs` | 03-customer-needs.md |
| CPs + CNs + Software Glance | 4 | `software-vision` | 04-software-vision.md |
| CPs + CNs + Software Vision | 5 | `functional-requirements` | functional-requirements/*.md |

## Quality Gates

**IMPORTANT:** Zigzag validation using the `/problem-based-srs validate` action is **MANDATORY** after Steps 3 and 5 to verify traceability and identify gaps.

### After Step 0 (BC)
- [ ] Project identity complete (name, domain, purpose)
- [ ] Business principles defined and classified
- [ ] Stakeholders identified with roles and influence
- [ ] Current situation documented
- [ ] Domain boundaries and constraints defined
- [ ] Success criteria measurable

### After Step 1 (CPs)
- [ ] All CPs use structured notation
- [ ] Classifications assigned (Obligation/Expectation/Hope)
- [ ] No solutions embedded in problem statements

### After Step 3 (CNs)
- [ ] Every CP has at least one CN
- [ ] All CNs use structured notation
- [ ] **MANDATORY: Run zigzag validation** (CP → CN mapping)

### After Step 5 (FRs/NFRs)
- [ ] Every CN has at least one FR
- [ ] Each FR saved as individual file
- [ ] Traceability matrix complete (FR → CN → CP)
- [ ] **MANDATORY: Run zigzag validation** (full chain verification)

## Problem-First Enforcement

If user attempts to skip to solutions, redirect:

**Detect:** User mentions specific technology, feature, or implementation before CPs exist

**Redirect:**
```
I notice you're describing a solution. Let's first understand the problem.

Before we design [mentioned solution], help me understand:
1. What is the business context? (→ `business-context` action)
2. What business obligation, expectation, or hope drives this need?
3. What negative consequences occur without this?
4. Who is impacted?

→ Invoking: `business-context` action (if no BC exists)
→ Invoking: `problems` action (if BC exists)
```

## Usage Patterns

### Pattern 1: Full Process (New Project)
Start with Step 0 (Business Context) and progress through all steps sequentially.

### Pattern 2: Jump In (Existing Artifacts)
Detect what artifacts exist, skip completed steps, resume at current step.

### Pattern 3: Iterative Refinement
Complete initial pass, then iterate on specific steps as understanding improves.

### Pattern 4: Validation Only
Use the `/problem-based-srs validate` action to check existing artifacts without generating new ones.

### Pattern 5: Agile/Sprint Integration
- **Sprint 0:** Steps 0-2 (BC + CPs + Software Glance) for product vision
- **Sprint 1+:** Steps 3-5 for specific feature sets
- **Per Feature:** Complete CP→CN→FR chain for one feature at a time

## Examples

For complete walkthroughs, see:
- [CRM Example](../skills/problem-based-srs/reference/crm-example.md) — Business domain
- [MicroER Example](../skills/problem-based-srs/reference/microer-example.md) — Technical domain
