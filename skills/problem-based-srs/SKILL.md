---
name: problem-based-srs
description: Complete Problem-Based Software Requirements Specification methodology following Gorski & Stadzisz research. Use when you need to perform requirements engineering from business problems to functional requirements with full traceability.
license: MIT
metadata:
  author: rafael-gorski
  version: "1.1"
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

## 📁 Saving Progress (IMPORTANT)

**CRITICAL:** At each step, you MUST save the produced artifacts to files. Progress is NOT automatically saved.

### First Time Setup

When starting a new project, ask the user:

```
Before we begin, where would you like to save your SRS artifacts?

Options:
1. `docs/srs/` (recommended - keeps SRS separate from code docs)
2. `docs/requirements/` (alternative)
3. Custom path: [specify your preferred location]

All artifacts will be saved in this folder with consistent naming.
```

### Artifact File Structure

Create the following files as you progress through each step:

```
[chosen-folder]/                    # e.g., docs/srs/
├── 00-context.md                   # Business context and project overview
├── 01-customer-problems.md         # Step 1: CPs (WHY)
├── 02-software-glance.md           # Step 2: High-level solution view
├── 03-customer-needs.md            # Step 3: CNs (WHAT)
├── 04-software-vision.md           # Step 4: Architecture and scope
├── 05-functional-requirements.md   # Step 5: FRs (HOW)
├── 06-non-functional-requirements.md # NFRs (quality attributes)
└── traceability-matrix.md          # CP → CN → FR mapping
```

### Save After Each Step

**After completing each step, ALWAYS:**

1. **Create or update** the corresponding file
2. **Confirm with user** that the file was saved
3. **Show the file path** for reference

Example handoff:

```
✅ Step 1 Complete: Customer Problems Specified

📁 Saved to: docs/srs/01-customer-problems.md

Contents:
- CP-001: [Obligation] Company must...
- CP-002: [Expectation] Users expect...
- CP-003: [Hope] Management hopes...

→ Next: Step 2 - Software Glance
→ Will save to: docs/srs/02-software-glance.md
```

### Context File (00-context.md)

Create this file at the start of every project:

```markdown
# Project Context: [Project Name]

## Business Domain
[Description of the business area]

## Current Situation
[Description of current state/problems]

## Stakeholders
| Role | Name/Group | Interest |
|------|------------|----------|
| [Role] | [Who] | [What they care about] |

## Scope
- **In Scope:** [What's included]
- **Out of Scope:** [What's excluded]

## Constraints
- [Constraint 1]
- [Constraint 2]

---
*Created: [Date]*
*Last Updated: [Date]*
```

## How to Use This Skill

### Starting Fresh
When user provides business context or problem description:
1. **Ask where to save artifacts** (if not already specified)
2. **Create 00-context.md** with the business context
3. Detect current step (see Detection Heuristics below)
4. Load the appropriate reference file
5. Follow instructions from that reference
6. **Save output to the corresponding file**
7. Guide user through the process

### Continuing Work
If user has existing artifacts (CPs, CNs, etc.):
1. **Check for existing SRS folder** (docs/srs/, docs/requirements/, etc.)
2. **Read existing files** to understand current state
3. Identify what they have
4. Jump to appropriate step
5. Load that step's reference file
6. Continue from there, **updating files as needed**

### Validation
At any point, use references/zigzag-validator.md to check consistency.

## Detection Heuristics

Determine current step by checking what artifacts exist:

| If user has... | Current Step | Load Reference | Save To |
|----------------|--------------|----------------|---------|
| Nothing / business idea only | 1 | step1-customer-problems.md | 01-customer-problems.md |
| Customer Problems (CPs) | 2 | step2-software-glance.md | 02-software-glance.md |
| CPs + Software Glance | 3 | step3-customer-needs.md | 03-customer-needs.md |
| CPs + CNs + Software Vision | 4 | step4-software-vision.md | 04-software-vision.md |
| CPs + CNs + Software Vision | 5 | step5-functional-requirements.md | 05-functional-requirements.md |

## The 5 Steps (Quick Reference)

### Step 1: Customer Problems (CP)
**Purpose:** Identify and document business problems  
**Input:** Business context  
**Output:** List of CPs classified as Obligation/Expectation/Hope  
**Syntax:** `[Subject] [must/expects/hopes] [Object] [Penalty]`  
**Save to:** `01-customer-problems.md`  
**Details:** See [step1-customer-problems.md](references/step1-customer-problems.md)

### Step 2: Software Glance (SG)
**Purpose:** Create initial abstract solution view  
**Input:** Customer Problems  
**Output:** High-level system description with boundaries and components  
**Save to:** `02-software-glance.md`  
**Details:** See [step2-software-glance.md](references/step2-software-glance.md)

### Step 3: Customer Needs (CN)
**Purpose:** Specify outcomes software must provide  
**Input:** CPs + Software Glance  
**Output:** CNs with outcome classes (Information/Control/Construction/Entertainment)  
**Syntax:** `[Subject] needs [system] to [Verb] [Object] [Condition]`  
**Save to:** `03-customer-needs.md`  
**Details:** See [step3-customer-needs.md](references/step3-customer-needs.md)

### Step 4: Software Vision (SV)
**Purpose:** Define high-level scope and positioning  
**Input:** CNs + Software Glance  
**Output:** Vision document with stakeholders, features, architecture  
**Save to:** `04-software-vision.md`  
**Details:** See [step4-software-vision.md](references/step4-software-vision.md)

### Step 5: Functional Requirements (FR)
**Purpose:** Generate detailed functional requirements  
**Input:** CNs + Software Vision  
**Output:** Functional requirements with traceability  
**Syntax:** `The [System] shall [Verb] [Object] [Constraint] [Condition]`  
**Save to:** `05-functional-requirements.md`  
**Details:** See [step5-functional-requirements.md](references/step5-functional-requirements.md)

## Quality Gates

**IMPORTANT:** Zigzag validation using [references/zigzag-validator.md](references/zigzag-validator.md) is **MANDATORY** after Steps 3 and 5 to verify traceability and identify gaps.

### After Step 1 (CPs)
- [ ] All CPs use structured notation
- [ ] Classifications assigned (Obligation/Expectation/Hope)
- [ ] No solutions embedded in problem statements
- [ ] **File saved:** `01-customer-problems.md`

### After Step 2 (SG)
- [ ] System boundaries defined
- [ ] Main actors and interfaces identified
- [ ] High-level components described
- [ ] **File saved:** `02-software-glance.md`

### After Step 3 (CNs)
- [ ] Every CP has at least one CN
- [ ] All CNs use structured notation
- [ ] Outcome classes assigned
- [ ] **File saved:** `03-customer-needs.md`
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
- [ ] **File saved:** `04-software-vision.md`

### After Step 5 (FRs)
- [ ] Every CN has at least one FR
- [ ] All FRs use "shall" or "should"
- [ ] Traceability matrix complete (FR → CN → CP)
- [ ] **File saved:** `05-functional-requirements.md`
- [ ] **Update:** `traceability-matrix.md`
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

1. **Save** outputs to the appropriate file
2. **Summary** of outputs produced
3. **Validation** that gate criteria are met
4. **Next step** recommendation
5. **Required inputs** for next step

Example:
```
✅ Step 1 Complete: Customer Problems Specified

📁 Saved to: docs/srs/01-customer-problems.md

Outputs:
- CP-001: [Obligation] Company must...
- CP-002: [Expectation] Users expect...
- CP-003: [Hope] Management hopes...

Gate Check:
- [x] All CPs use structured notation
- [x] Classifications assigned
- [x] Consequences documented
- [x] File saved

→ Next: Step 2 - Software Glance
→ Loading: references/step2-software-glance.md
→ Will save to: docs/srs/02-software-glance.md
→ Input: The CPs documented above
```

## Usage Patterns

### Pattern 1: Full Process (New Project)
Start with Step 1 and progress through all 5 steps sequentially.
**Remember:** Ask where to save files, create context file first.

### Pattern 2: Jump In (Existing Artifacts)
Detect what artifacts exist, skip completed steps, resume at current step.
**Remember:** Check for existing SRS folder and read current files.

### Pattern 3: Iterative Refinement
Complete initial pass, then iterate on specific steps as understanding improves.
**Remember:** Update existing files rather than creating new ones.

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