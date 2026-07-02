---
name: problem-based-srs
description: Complete Problem-Based Software Requirements Specification methodology following Gorski & Stadzisz research. Use when you need to perform requirements engineering from business problems to functional requirements with full traceability.
license: MIT
metadata:
  author: rafael-gorski
  version: "1.3"
  methodology: problem-based-srs
---

# Problem-Based SRS

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they appear in all capitals, as shown here.

Orchestrate requirements engineering using the Problem-Based SRS methodology (Gorski & Stadzisz). This skill coordinates a structured process (Step 0 through Step 5) that ensures every requirement traces back to a real business problem.

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
| **WHAT** | Customer Needs (CN) | What outcomes must the software provide? |
| **HOW** | Functional Requirements (FR) | How will the system behave? |

## Available Actions

The Problem-Based SRS methodology is driven by a **single command** — `/problem-based-srs` —
that dispatches to a step via an **action** argument. Run `/problem-based-srs` with no
action (or `full`) to orchestrate the complete methodology end-to-end.

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

### How actions are dispatched

Each action's detailed, step-specific instructions live in a reference file next to
this skill: **`reference/<action>.md`** (the file name IS the action). When the user
invokes an action, you MUST read the matching reference file **before** producing any
artifact, and follow it exactly:

| Action | Reference file |
|--------|----------------|
| `business-context` | [`reference/business-context.md`](reference/business-context.md) |
| `problems` | [`reference/problems.md`](reference/problems.md) |
| `software-glance` | [`reference/software-glance.md`](reference/software-glance.md) |
| `needs` | [`reference/needs.md`](reference/needs.md) |
| `software-vision` | [`reference/software-vision.md`](reference/software-vision.md) |
| `functional-requirements` | [`reference/functional-requirements.md`](reference/functional-requirements.md) |
| `validate` | [`reference/validate.md`](reference/validate.md) |
| `complexity` | [`reference/complexity.md`](reference/complexity.md) |
| `live` | [`reference/live.md`](reference/live.md) — opens the SRS Navigator canvas (`/live`) |

For a **full** run (bare `/problem-based-srs`), work through the steps in order,
reading each `reference/<action>.md` as you reach that step.

## 📁 Saving Progress (CRITICAL)

**IMPORTANT:** At each step, you MUST save the produced artifacts to files. Progress is NOT automatically saved between sessions.

### ⚠ File Creation Rule: ONE FILE AT A TIME

**NEVER create multiple artifact files in parallel.** Always create files **one at a time, sequentially** — wait for each file to be saved before creating the next one. Batch/parallel file creation causes JSON serialization errors in tool calls when the combined content is too large.

### First Time Setup

When starting a new project, save artifacts to `.spec/` by default (a hidden folder at the project root). If the user specifies a different folder or an existing artifact folder is detected (e.g., `docs/srs/`, `requirements/`), use that location instead.

### Artifact File Structure

Create the following folder structure as you progress through each step:

```
.spec/
├── 00-business-context.md            # Step 0: Business context, principles, and constraints
├── 01-customer-problems.md           # Step 1: CPs (WHY)
├── 02-software-glance.md             # Step 2: High-level solution view
├── 03-customer-needs.md              # Step 3: CNs (WHAT)
├── 04-software-vision.md             # Step 4: Architecture and scope
├── functional-requirements/          # Step 5: Individual FR files
│   ├── _index.md                     # FR summary and traceability matrix
│   ├── FR-001.md                     # Individual FR file
│   ├── FR-002.md                     # Individual FR file
│   └── ...                           # One file per FR
├── non-functional-requirements/      # NFR files (quality attributes)
│   ├── _index.md                     # NFR summary
│   ├── NFR-001.md                    # Individual NFR file
│   └── ...                           # One file per NFR
└── traceability-matrix.md            # CP → CN → FR complete mapping
```

### Why Individual FR/NFR Files?

Each Functional Requirement and Non-Functional Requirement is saved as a **separate file** so that:

1. **Engineers can work independently** on different requirements
2. **Version control** tracks changes to individual requirements
3. **Code reviews** can focus on specific requirements
4. **Traceability** is maintained at the file level
5. **Status tracking** is easier (draft, approved, implemented, tested)

### FR File Template (FR-XXX.md)

Each FR file follows this template:

```markdown
# FR-XXX: [Brief Title]

## Requirement

**Statement:** The [System] shall [verb] [object] [constraint] [condition].

**Priority:** [Must Have | Should Have | Could Have | Won't Have]
**Status:** [Draft | Review | Approved | Implemented | Tested]

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN-XXX | [Brief CN description] |
| Customer Problem | CP-XXX | [Brief CP description] |

## Acceptance Criteria

- [ ] Criterion 1 (testable)
- [ ] Criterion 2 (testable)
- [ ] Criterion 3 (testable)

## Notes

[Any additional context, assumptions, or dependencies]

<!-- ⚠️ NO CODE SNIPPETS: Do not include code examples, SQL, or implementation details here.
     Construction details belong in design/ folder (see design/implementation-notes/) -->

---
*Created: [Date]*
*Last Updated: [Date]*
*Author: [Name]*
```

### NFR File Template (NFR-XXX.md)

```markdown
# NFR-XXX: [Brief Title]

## Requirement

**Category:** [Performance | Security | Usability | Reliability | Scalability | Maintainability]
**Statement:** The [System] shall [quality attribute with measurable criteria].

**Priority:** [Must Have | Should Have | Could Have | Won't Have]
**Status:** [Draft | Review | Approved | Implemented | Tested]

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN-XXX | [Brief CN description] |
| Applies To FRs | FR-XXX, FR-YYY | [Related functional requirements] |

## Acceptance Criteria

- [ ] Criterion 1 (measurable)
- [ ] Criterion 2 (measurable)

## Measurement Method

[How this NFR will be verified/tested]

<!-- ⚠️ NO CODE SNIPPETS: Do not include code examples or implementation details here.
     Technical specifications belong in design/ folder -->

---
*Created: [Date]*
*Last Updated: [Date]*
```

### Save After Each Step

**After completing each step, ALWAYS:**

1. **Create or update** the corresponding file(s)
2. **Confirm with user** that files were saved
3. **Show the file paths** for reference

Example handoff for Step 5:

```
✅ Step 5 Complete: Functional Requirements Specified

📁 Saved to: .spec/functional-requirements/
   ├── _index.md (summary with 8 FRs)
   ├── FR-001.md → CN-001 (User Registration)
   ├── FR-002.md → CN-001 (User Authentication)
   ├── FR-003.md → CN-002 (Data Validation)
   ├── FR-004.md → CN-002 (Error Handling)
   ├── FR-005.md → CN-003 (Report Generation)
   ├── FR-006.md → CN-003 (Export Functionality)
   ├── FR-007.md → CN-004 (Search Capability)
   └── FR-008.md → CN-004 (Filter Options)

📁 Updated: .spec/traceability-matrix.md

Engineers can now work on individual requirements independently.
Each FR file contains full context and acceptance criteria.
```

### Business Context File (00-business-context.md)

Create this file at the start of every project using the `business-context` skill.

The business context captures: project identity, business principles (Mandatory/Guiding/Aspirational), stakeholders with influence levels, current situation (process, pain points, existing systems), domain boundaries, constraints with impact assessment, and measurable success criteria.

> **Use the `business-context` skill** for the full template, discovery questions, and examples.

## How to Use This Skill

### Clarifying Questions Pattern

**Every step in this methodology includes a mandatory Discovery Interview.** Before generating artifacts, each skill MUST stop and ask the user clarifying questions to avoid assumptions. STOP and ask the user to clarify what you cannot infer. Use the ask_user tool if available; otherwise ask directly in chat and wait for an answer.

**Rules for all steps:**
- Ask **2-3 questions per round**, then STOP and wait for answers
- Treat existing .spec/ artifacts as anchors — they reduce questions but don't eliminate the interview
- **Assert-then-confirm:** When context makes one option obvious, state it and ask to confirm or override. Don't present a menu when the answer is already clear.
- **Skip only when** prior artifacts + user prompt unambiguously answer all needed inputs. State what you're using as basis.
- Questions must reference the specific context at hand — never ask generic questions

### Starting Fresh
When user provides business context or problem description:
1. **Ask where to save artifacts** (if not already specified)
2. **Start with Step 0** — Use the `business-context` action to establish structured context
3. **Save `00-business-context.md`** with the structured business context
4. Detect current step (see Detection Heuristics below)
5. Invoke the appropriate action
6. Follow instructions from that skill
7. **Save output to the corresponding file(s)**
8. Guide user through the process

### Continuing Work
If user has existing artifacts (CPs, CNs, etc.):
1. **Check for existing artifact folder** (`.spec/`, `docs/srs/`, `requirements/`, etc.)
2. **Read existing files** to understand current state
3. Identify what they have
4. Jump to appropriate step
5. Invoke that step's action
6. Continue from there, **updating files as needed**

### Validation
At any point, use `/problem-based-srs validate` to check consistency.

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

## The Steps (Quick Reference)

### Step 0: Business Context (BC)
**Purpose:** Establish structured business context and project principles
**Input:** Stakeholder conversations, project briefs, existing documentation
**Output:** Business context document with identity, principles, stakeholders, boundaries, constraints, success criteria
**Save to:** `00-business-context.md`
**Action:** `/problem-based-srs business-context`

### Step 1: Customer Problems (CP)
**Purpose:** Identify and document business problems
**Input:** Business Context (Step 0)
**Output:** List of CPs classified as Obligation/Expectation/Hope
**Syntax:** `[Subject] [must/expects/hopes] [Object] [Penalty]`
**Save to:** `01-customer-problems.md`
**Action:** `/problem-based-srs problems`

### Step 2: Software Glance (SG)
**Purpose:** Create initial abstract solution view  
**Input:** Customer Problems  
**Output:** High-level system description with boundaries and components  
**Save to:** `02-software-glance.md`  
**Action:** `/problem-based-srs software-glance`

### Step 3: Customer Needs (CN)
**Purpose:** Specify outcomes software must provide  
**Input:** CPs + Software Glance  
**Output:** CNs with outcome classes (Information/Control/Construction/Entertainment)  
**Syntax:** `[Subject] needs [system] to [Verb] [Object] [Condition]`  
**Save to:** `03-customer-needs.md`  
**Action:** `/problem-based-srs needs`

### Step 4: Software Vision (SV)
**Purpose:** Define high-level scope and positioning  
**Input:** CNs + Software Glance  
**Output:** Vision document with stakeholders, features, architecture  
**Save to:** `04-software-vision.md`  
**Action:** `/problem-based-srs software-vision`

### Step 5: Functional Requirements (FR) & Non-Functional Requirements (NFR)
**Purpose:** Generate detailed requirements  
**Input:** CNs + Software Vision  
**Output:** Individual FR and NFR files with traceability  
**Syntax FR:** `The [System] shall [Verb] [Object] [Constraint] [Condition]`  
**Save to:** `functional-requirements/FR-XXX.md` and `non-functional-requirements/NFR-XXX.md`  
**Action:** `/problem-based-srs functional-requirements`

## Quality Gates

**IMPORTANT:** Zigzag validation using the `/problem-based-srs validate` action is **MANDATORY** after Steps 3 and 5 to verify traceability and identify gaps.

### After Step 0 (BC)
- [ ] Project identity complete (name, domain, purpose)
- [ ] Business principles defined and classified (Mandatory/Guiding/Aspirational)
- [ ] Stakeholders identified with roles and influence
- [ ] Current situation documented
- [ ] Domain boundaries defined
- [ ] Constraints documented
- [ ] Success criteria measurable
- [ ] **File saved:** `00-business-context.md`

### After Step 1 (CPs)
- [ ] All CPs use structured notation
- [ ] Classifications assigned (Obligation/Expectation/Hope)
- [ ] No solutions embedded in problem statements
- [ ] **File saved:** `01-customer-problems.md`

### After Step 2 (SG)
- [ ] System boundaries defined
- [ ] Main actors and interfaces identified
- [ ] High-level components described
- [ ] Mermaid UML diagram included (mandatory)
- [ ] **File saved:** `02-software-glance.md`

### After Step 3 (CNs)
- [ ] Every CP has at least one CN
- [ ] All CNs use structured notation
- [ ] Outcome classes assigned
- [ ] **File saved:** `03-customer-needs.md`
- [ ] **MANDATORY: Run zigzag validation** (CP → CN mapping)

### After Step 4 (SV)
- [ ] Positioning statement clear
- [ ] All stakeholders identified
- [ ] Major features listed
- [ ] Mermaid UML architecture diagram included (mandatory)
- [ ] Cross-reference to Software Glance present
- [ ] **File saved:** `04-software-vision.md`

### After Step 5 (FRs/NFRs)
- [ ] Every CN has at least one FR
- [ ] All FRs use "shall" or "should"
- [ ] Each FR saved as individual file in `functional-requirements/`
- [ ] Each NFR saved as individual file in `non-functional-requirements/`
- [ ] Index files created (`_index.md`)
- [ ] Traceability matrix complete (FR → CN → CP)
- [ ] No code snippets or programming examples in FR/NFR files
- [ ] Construction details in separate `design/` folder (not in FR/NFR files)
- [ ] **File saved:** `traceability-matrix.md`
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

→ Loading: `business-context` action (if no BC exists)
→ Loading: `problems` action (if BC exists)
```

## Quick Syntax Reference

| Artifact | Syntax Pattern |
|----------|----------------|
| **CP** | [Subject] [must/expects/hopes] [Object] [Penalty] |
| **CN** | [Subject] needs [system] to [Verb] [Object] [Condition] |
| **FR** | The [System] shall [Verb] [Object] [Constraint] [Condition] |
| **NFR** | The [System] shall [quality attribute with measurable criteria] |

## Handoff Protocol

When completing each step:

1. **Save** outputs to the appropriate file(s)
2. **Summary** of outputs produced
3. **Validation** that gate criteria are met
4. **Next step** recommendation
5. **Required inputs** for next step

Example:
```
✅ Step 3 Complete: Customer Needs Specified

📁 Saved to: .spec/03-customer-needs.md

Outputs:
- CN-001: [Information] User needs system to display...
- CN-002: [Control] Admin needs system to manage...
- CN-003: [Information] Manager needs system to report...

Gate Check:
- [x] All CNs use structured notation
- [x] Outcome classes assigned
- [x] Every CP has at least one CN
- [x] File saved

→ Next: Step 4 - Software Vision
→ Loading: reference/software-vision.md
→ Will save to: .spec/04-software-vision.md
→ Input: The CNs documented above
```

## Usage Patterns

### Pattern 1: Full Process (New Project)
Start with Step 0 (Business Context) and progress through all steps sequentially.
**Remember:** Ask where to save files, establish business context first.

### Pattern 2: Jump In (Existing Artifacts)
Detect what artifacts exist, skip completed steps, resume at current step.
**Remember:** Check for existing `.spec/` folder and read current files.

### Pattern 3: Iterative Refinement
Complete initial pass, then iterate on specific steps as understanding improves.
**Remember:** Update existing files rather than creating new ones.

### Pattern 4: Validation Only
Use the `/problem-based-srs validate` action to check existing artifacts without generating new ones.

### Pattern 5: Independent Development
After Step 5, engineers can pick up individual FR files and develop independently.
Each FR file contains all context needed (traceability, acceptance criteria).

### Pattern 6: Agile/Sprint Integration
Use Problem-Based SRS iteratively within agile workflows:
- **Sprint 0:** Steps 0-2 (BC + CPs + Software Glance) for product vision
- **Sprint 1+:** Steps 3-5 for specific feature sets
- **Per Feature:** Complete CP→CN→FR chain for one feature at a time
- **Validation:** Run `/problem-based-srs validate` after each sprint to ensure traceability

### Pattern 7: Minimal Viable SRS
For quick prototypes or MVPs:
1. Identify 2-3 core CPs (Obligations only)
2. Create minimal Software Glance
3. Derive essential CNs
4. Generate only critical FRs
5. Skip detailed validation until expansion

## When to Use Each Action

- **`business-context`:** User is starting a new project and needs to establish structured context
- **`problems`:** User has business context but no structured problems
- **`software-glance`:** User has CPs and needs high-level solution view
- **`needs`:** User has CPs + SG and needs to specify outcomes
- **`software-vision`:** User has CNs and needs detailed vision document
- **`functional-requirements`:** User has CNs + SV and needs functional requirements
- **`validate`:** User needs to check traceability or consistency
- **`complexity`:** User explicitly requests Axiomatic Design analysis

## Optional: Complexity Analysis

For deeper quality analysis, users can explicitly invoke the `/problem-based-srs complexity` action for Axiomatic Design-based specification quality analysis. Use for critical systems, large specifications, or formal reviews. This is **NOT** part of the standard flow.

## Examples

For complete walkthroughs, see:
- [CRM Example](reference/crm-example.md) — Business domain (Customer Relationship Management)
- [MicroER Example](reference/microer-example.md) — Technical domain (Renewable Energy System)

**Run actions individually** based on current step to minimize context usage.