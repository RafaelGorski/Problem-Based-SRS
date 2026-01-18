---
name: problem-based-srs
description: Complete Problem-Based Software Requirements Specification methodology following Gorski & Stadzisz research. Use when you need to perform requirements engineering from business problems through functional requirements, when starting a new software project, when working on requirements analysis, or when users mention "customer problems", "software requirements", "SRS", or need help with structured requirements. Guides through a 5-step process with problem-first thinking.
license: MIT
metadata:
  author: rafael-gorski
  version: "1.0"
  methodology: problem-based-srs
---

# Problem-Based SRS

Orchestrate requirements engineering using the Problem-Based SRS methodology (Gorski & Stadzisz). This skill coordinates a 5-step process that ensures every requirement traces back to a real business problem.

## Methodology Overview

```
Business Context
       ↓
┌──────────────────┐
│ Step 1: CP       │ → See references/step1-customer-problems.md
│ Customer Problems│
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 2: SG       │ → See references/step2-software-glance.md
│ Software Glance  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 3: CN       │ → See references/step3-customer-needs.md
│ Customer Needs   │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 4: SV       │ → See references/step4-software-vision.md
│ Software Vision  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Step 5: FR       │ → See references/step5-functional-requirements.md
│ Software Reqs    │
└──────────────────┘
```

**Traceability Chain:** FR → CN → CP (every requirement traces back to a problem)

**Domain Mapping (WHY → WHAT → HOW):**
| Domain | Artifact | Question Answered |
|--------|----------|-------------------|
| **WHY** | Customer Problems (CP) | Why is the solution needed? (Business justification) |
| **WHAT** | Customer Needs (CN) | What outcomes must the software provide? |
| **HOW** | Functional Requirements (FR) | How will the system behave? |

## How to Use This Skill

### Starting Fresh
When user provides business context or problem description:
1. Detect current step (see Detection Heuristics below)
2. Load the appropriate reference file
3. Follow instructions from that reference
4. Guide user through the process

### Continuing Work
If user has existing artifacts (CPs, CNs, etc.):
1. Identify what they have
2. Jump to appropriate step
3. Load that step's reference file
4. Continue from there

### Validation
At any point, use references/zigzag-validator.md to check consistency.

## Detection Heuristics

Determine current step by checking what artifacts exist:

| If user has... | Current Step | Load Reference |
|----------------|--------------|----------------|
| Nothing / business idea only | 1 | step1-customer-problems.md |
| Customer Problems (CPs) | 2 | step2-software-glance.md |
| CPs + Software Glance | 3 | step3-customer-needs.md |
| CPs + SG + Customer Needs | 4 | step4-software-vision.md |
| CPs + CNs + Software Vision | 5 | step5-functional-requirements.md |

## The 5 Steps (Quick Reference)

### Step 1: Customer Problems (CP)
**Purpose:** Identify and document business problems  
**Input:** Business context  
**Output:** List of CPs classified as Obligation/Expectation/Hope  
**Syntax:** `[Subject] [must/expects/hopes] [Object] [Penalty]`  
**Details:** See [step1-customer-problems.md](references/step1-customer-problems.md)

### Step 2: Software Glance (SG)
**Purpose:** Create initial abstract solution view  
**Input:** Customer Problems  
**Output:** High-level system description with boundaries and components  
**Details:** See [step2-software-glance.md](references/step2-software-glance.md)

### Step 3: Customer Needs (CN)
**Purpose:** Specify outcomes software must provide  
**Input:** CPs + Software Glance  
**Output:** CNs with outcome classes (Information/Control/Construction/Entertainment)  
**Syntax:** `[Subject] needs [system] to [Verb] [Object] [Condition]`  
**Details:** See [step3-customer-needs.md](references/step3-customer-needs.md)

### Step 4: Software Vision (SV)
**Purpose:** Define high-level scope and positioning  
**Input:** CNs + Software Glance  
**Output:** Vision document with stakeholders, features, architecture  
**Details:** See [step4-software-vision.md](references/step4-software-vision.md)

### Step 5: Functional Requirements (FR)
**Purpose:** Generate detailed functional requirements  
**Input:** CNs + Software Vision  
**Output:** Functional requirements with traceability  
**Syntax:** `The [System] shall [Verb] [Object] [Constraint] [Condition]`  
**Details:** See [step5-functional-requirements.md](references/step5-functional-requirements.md)

## Quality Gates

**IMPORTANT:** Zigzag validation using [references/zigzag-validator.md](references/zigzag-validator.md) is **MANDATORY** after Steps 3 and 5 to verify traceability and identify gaps.

### After Step 1 (CPs)
- [ ] All CPs use structured notation
- [ ] Classifications assigned (Obligation/Expectation/Hope)
- [ ] No solutions embedded in problem statements

### After Step 2 (SG)
- [ ] System boundaries defined
- [ ] Main actors and interfaces identified
- [ ] High-level components described

### After Step 3 (CNs)
- [ ] Every CP has at least one CN
- [ ] All CNs use structured notation
- [ ] Outcome classes assigned
- [ ] **MANDATORY: Run zigzag validation**
  - Load [references/zigzag-validator.md](references/zigzag-validator.md)
  - Perform ZAG-MAP operation: CP → CN
  - Verify every CP has at least one CN mapped
  - Identify gaps (CPs without CNs)
  - Identify orphans (CNs not tracing to any CP)
  - Generate coverage report

### After Step 4 (SV)
- [ ] Positioning statement clear
- [ ] All stakeholders identified
- [ ] Major features listed

### After Step 5 (FRs)
- [ ] Every CN has at least one FR
- [ ] All FRs use "shall" or "should"
- [ ] Traceability matrix complete (FR → CN → CP)
- [ ] **MANDATORY: Run zigzag validation**
  - Load [references/zigzag-validator.md](references/zigzag-validator.md)
  - Perform CONSISTENCY-CHECK operation: Full audit
  - Verify CN → FR mapping (every CN has at least one FR)
  - Verify complete chain: FR → CN → CP
  - Identify gaps (CNs without FRs, CPs without CNs)
  - Identify orphans (FRs not tracing to CNs)
  - Generate complete coverage matrix

## Problem-First Enforcement

If user attempts to skip to solutions, redirect:

**Detect:** User mentions specific technology, feature, or implementation before CPs exist

**Redirect:**
```
I notice you're describing a solution. Let's first understand the problem.

Before we design [mentioned solution], help me understand:
1. What business obligation, expectation, or hope drives this need?
2. What negative consequences occur without this?
3. Who is impacted?

→ Loading: references/step1-customer-problems.md
```

## Quick Syntax Reference

| Artifact | Syntax Pattern |
|----------|----------------|
| **CP** | [Subject] [must/expects/hopes] [Object] [Penalty] |
| **CN** | [Subject] needs [system] to [Verb] [Object] [Condition] |
| **FR** | The [System] shall [Verb] [Object] [Constraint] [Condition] |

## Handoff Protocol

When completing each step:

1. **Summary** of outputs produced
2. **Validation** that gate criteria are met
3. **Next step** recommendation
4. **Required inputs** for next step

Example:
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
→ Loading: references/step2-software-glance.md
→ Input: The CPs above
```

## Usage Patterns

### Pattern 1: Full Process (New Project)
Start with Step 1 and progress through all 5 steps sequentially.

### Pattern 2: Jump In (Existing Artifacts)
Detect what artifacts exist, skip completed steps, resume at current step.

### Pattern 3: Iterative Refinement
Complete initial pass, then iterate on specific steps as understanding improves.

### Pattern 4: Validation Only
Use zigzag-validator.md to check existing artifacts without generating new ones.

## When to Load Each Reference

- **Step 1 (CP):** User has business context but no structured problems
- **Step 2 (SG):** User has CPs and needs high-level solution view
- **Step 3 (CN):** User has CPs + SG and needs to specify outcomes
- **Step 4 (SV):** User has CNs and needs detailed vision document
- **Step 5 (FR):** User has CNs + SV and needs functional requirements
- **Validation:** User needs to check traceability or consistency

**Always load only one reference at a time** based on current step to minimize context usage.
