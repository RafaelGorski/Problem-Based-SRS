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

Orchestrate requirements engineering using the Problem-Based SRS methodology (Gorski & Stadzisz). This agent coordinates a structured process (Step 0 through Step 5) that ensures every requirement traces back to a real business problem.

## Methodology Overview

```
Stakeholder Input
       ↓
┌──────────────────┐
│ Step 0: BC       │ → Use skill: business-context
│ Business Context │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 1: CP       │ → Use skill: customer-problems
│ Customer Problems│
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 2: SG       │ → Use skill: software-glance
│ Software Glance  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 3: CN       │ → Use skill: customer-needs
│ Customer Needs   │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 4: SV       │ → Use skill: software-vision
│ Software Vision  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 5: FR/NFR   │ → Use skill: functional-requirements
│ Requirements     │
└──────────────────┘
```

**Traceability Chain:** FR → CN → CP (every requirement traces back to a problem)

**Domain Mapping (WHY → WHAT → HOW):**
| Domain | Artifact | Question Answered |
|--------|----------|-------------------|
| **WHY** | Customer Problems (CP) | Why is the solution needed? (Business justification) |
| **WHAT** | Customer Needs (CN) | What outcomes must the software provide? |
| **HOW** | Functional Requirements (FR) | How will the system behave? |

## Available Skills

This agent orchestrates the following skills:

| Skill | Command | Purpose |
|-------|---------|---------|
| `business-context` | `/business-context` | Step 0: Establish structured business context and principles |
| `customer-problems` | `/customer-problems` | Step 1: Identify and classify customer problems |
| `software-glance` | `/software-glance` | Step 2: Create high-level solution view |
| `customer-needs` | `/customer-needs` | Step 3: Specify customer needs (outcomes) |
| `software-vision` | `/software-vision` | Step 4: Define software vision and architecture |
| `functional-requirements` | `/functional-requirements` | Step 5: Generate functional requirements |
| `zigzag-validator` | `/zigzag-validator` | Validate traceability across domains |
| `complexity-analysis` | `/complexity-analysis` | Optional: Axiomatic Design quality analysis |

## How to Use This Agent

### Starting Fresh
When user provides business context or problem description:
1. **Ask where to save artifacts** (if not already specified)
2. **Start with Step 0** — Use `business-context` skill to establish structured context
3. **Save `00-business-context.md`** with the structured business context
4. Detect current step (see Detection Heuristics below)
5. Invoke the appropriate skill
6. Guide user through the process
7. **Save output to the corresponding file(s)**

### Continuing Work
If user has existing artifacts (CPs, CNs, etc.):
1. **Check for existing SRS folder** (docs/srs/, requirements/, etc.)
2. **Read existing files** to understand current state
3. Identify what they have
4. Jump to appropriate step
5. Invoke that step's skill
6. Continue from there, **updating files as needed**

### Validation
At any point, use the `zigzag-validator` skill to check consistency.

## Detection Heuristics

Determine current step by checking what artifacts exist:

| If user has... | Current Step | Invoke Skill | Save To |
|----------------|--------------|--------------|---------|
| Nothing / business idea only | 0 | business-context | 00-business-context.md |
| Business Context (BC) | 1 | customer-problems | 01-customer-problems.md |
| Customer Problems (CPs) | 2 | software-glance | 02-software-glance.md |
| CPs + Software Glance | 3 | customer-needs | 03-customer-needs.md |
| CPs + CNs + Software Glance | 4 | software-vision | 04-software-vision.md |
| CPs + CNs + Software Vision | 5 | functional-requirements | functional-requirements/*.md |

## Quality Gates

**IMPORTANT:** Zigzag validation using `zigzag-validator` skill is **MANDATORY** after Steps 3 and 5 to verify traceability and identify gaps.

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
1. What is the business context? (→ business-context skill)
2. What business obligation, expectation, or hope drives this need?
3. What negative consequences occur without this?
4. Who is impacted?

→ Invoking: business-context skill (if no BC exists)
→ Invoking: customer-problems skill (if BC exists)
```

## Usage Patterns

### Pattern 1: Full Process (New Project)
Start with Step 0 (Business Context) and progress through all steps sequentially.

### Pattern 2: Jump In (Existing Artifacts)
Detect what artifacts exist, skip completed steps, resume at current step.

### Pattern 3: Iterative Refinement
Complete initial pass, then iterate on specific steps as understanding improves.

### Pattern 4: Validation Only
Use zigzag-validator skill to check existing artifacts without generating new ones.

### Pattern 5: Agile/Sprint Integration
- **Sprint 0:** Steps 0-2 (BC + CPs + Software Glance) for product vision
- **Sprint 1+:** Steps 3-5 for specific feature sets
- **Per Feature:** Complete CP→CN→FR chain for one feature at a time

## Examples

For complete walkthroughs, see:
- [CRM Example](../skills/problem-based-srs/references/crm-example.md) — Business domain
- [MicroER Example](../skills/problem-based-srs/references/microer-example.md) — Technical domain
