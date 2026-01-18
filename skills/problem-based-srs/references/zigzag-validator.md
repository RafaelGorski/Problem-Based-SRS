# Zig Zag Decomposition

> **Validation & Consistency Tool** for Problem-Based SRS methodology  
> **Purpose:** Map and decompose between CP, CN, and FR domains  
> **Single Responsibility:** Ensure traceability and consistency across domain hierarchies

---

## Position in Process

This prompt is used **during and after** Steps 1, 3, and 5 to validate and refine mappings between domains. It does not replace the generation prompts—it complements them.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ZIG ZAG DECOMPOSITION                         │
│                                                                         │
│   Customer        Customer         Functional                           │
│   Problems        Needs            Requirements                         │
│   Domain          Domain           Domain                               │
│                                                                         │
│   ┌─────┐        ┌─────┐          ┌─────┐                               │
│   │ CP  │───────▶│ CN  │─────────▶│ FR  │                               │
│   └──┬──┘        └──┬──┘          └──┬──┘                               │
│      │    ◀─ZIG     │    ◀─ZIG      │                                   │
│   ┌──▼──┐  ZAG─▶ ┌──▼──┐  ZAG─▶  ┌──▼──┐                               │
│   │CP.1 │───────▶│CN.1 │─────────▶│FR.1 │                               │
│   │CP.2 │───────▶│CN.2 │─────────▶│FR.2 │                               │
│   └──┬──┘        └──┬──┘          └──┬──┘                               │
│      │              │                │                                   │
│   ┌──▼──┐        ┌──▼──┐          ┌──▼──┐                               │
│   │CP.1.1│──────▶│CN.1.1│────────▶│FR.1.1│                              │
│   │CP.1.2│──────▶│CN.1.2│────────▶│FR.1.2│                              │
│   └─────┘        └─────┘          └─────┘                               │
│                                                                         │
│   "WHY"          "WHAT"           "HOW"                                 │
│   (Problem)      (Outcome)        (Capability)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Axiomatic Design Adaptation

This prompt adapts the **Zig Zag method** from Axiomatic Design (Suh, 1990) to Problem-Based SRS:

| Axiomatic Design | Problem-Based SRS | Mapping |
|------------------|-------------------|---------|
| Customer Domain  | Customer Problems (CP) | **WHY** - Why the solution is needed |
| Functional Domain | Customer Needs (CN) | **WHAT** - What the software provides |
| Physical Domain  | Functional Requirements (FR) | **HOW** - How the system behaves |

**Zigzagging Principle:** Decompose hierarchies by alternating between domains. Each level in one domain informs the decomposition in the next.

---

## Prompt

```
You are performing Zig Zag decomposition for a Problem-Based Software Requirements Specification.

## Purpose
Validate and ensure consistency between CP, CN, and FR domains by:
1. Mapping artifacts across domains
2. Decomposing high-level items into sub-items
3. Identifying gaps, orphans, and inconsistencies

## Zig Zag Process

### ZAG (Left → Right): Mapping "What" to "How"
For each item in the left domain, identify corresponding items in the right domain:
- CP → CN: What outcomes does the software need to provide to address this problem?
- CN → FR: What system capabilities are required to deliver this outcome?

### ZIG (Right → Left): Validation "How" traces to "What"
For each item in the right domain, verify it traces back:
- FR → CN: Does this requirement deliver a needed outcome?
- CN → CP: Does this need address a real customer problem?

## Your Task
Based on the provided artifacts, perform the requested zig zag operation.

## Operations

### Operation 1: ZAG-MAP (Forward Mapping)
Map items from source domain to target domain.

Input: Source domain items (CP, CN, or FR)
Output: Mapping table showing relationships

Format:
| Source | Target(s) | Relationship | Gap? |
|--------|-----------|--------------|------|
| CP.1   | CN.1, CN.2 | CP.1 addressed by CN.1 (primary), CN.2 (secondary) | No |
| CP.2   | —          | No CN addresses CP.2 | YES |

### Operation 2: ZIG-VALIDATE (Backward Traceability)
Verify each item traces back to its source.

Input: Target domain items (CN or FR)
Output: Validation report

Format:
| Item | Traces To | Valid? | Issue |
|------|-----------|--------|-------|
| FR.1 | CN.1      | ✅     | —     |
| FR.7 | —         | ❌     | Orphan FR - no CN source |

### Operation 3: DECOMPOSE (Hierarchical Breakdown)
Decompose a high-level item into sub-items, zigzagging between domains.

Process:
1. Start with high-level CP (e.g., CP.1)
2. ZAG → Identify CN(s) that address CP.1
3. ZIG → Review if CN decomposition suggests CP refinement
4. ZAG → For each CN, identify FR(s)
5. ZIG → Review if FR decomposition suggests CN refinement

Format:
```
CP.1: [High-level problem statement]
  ├── CN.1.1: [Outcome needed to address part of CP.1]
  │     ├── FR.1.1.1: [Capability for CN.1.1]
  │     └── FR.1.1.2: [Capability for CN.1.1]
  └── CN.1.2: [Another outcome for CP.1]
        └── FR.1.2.1: [Capability for CN.1.2]
```

### Operation 4: CONSISTENCY-CHECK (Full Audit)
Perform complete consistency analysis across all three domains.

Output:
- Coverage Matrix
- Gap Analysis
- Orphan Report
- Redundancy Detection

## Rules

### Independence Axiom
Each FR should ideally map to one CN. If an FR affects multiple CNs, flag for review—it may indicate a coupled design.

### Completeness Rule
- Every CP must have at least one CN
- Every CN must have at least one FR
- No orphan FRs (requirements without traced needs)
- No orphan CNs (needs without traced problems)

### Hierarchy Alignment
When decomposing, sub-items should align across domains:
- CP.1.1 should map to CN.1.1 (or subset)
- CN.1.1 should map to FR.1.1.x

## Example: Zig Zag Decomposition

### Input
```
CP.1: Sales managers must know customer purchase history within 5 minutes
      otherwise losing sales opportunities during client calls.
```

### Zig Zag Process

**Step 1 - ZAG:** What outcome (CN) addresses this problem?
```
CN.1: The sales manager needs a CRM system to know the complete purchase 
      history of each customer at any time.
```

**Step 2 - ZIG:** Does CN.1 fully address CP.1? 
- CP.1 specifies "within 5 minutes" → CN.1 says "at any time" ✅
- CP.1 specifies "during client calls" → Consider decomposition

**Step 3 - DECOMPOSE CN:**
```
CN.1.1: Sales manager needs CRM to display purchase history instantly.
CN.1.2: Sales manager needs CRM accessible during phone calls (mobile/desktop).
```

**Step 4 - ZAG:** What FRs deliver these CNs?
```
FR.1.1.1: The CRM shall display customer purchase history within 3 seconds.
FR.1.1.2: The CRM shall allow search by customer name or phone number.
FR.1.2.1: The CRM shall be accessible via mobile application.
FR.1.2.2: The CRM shall provide one-click access from phone integration.
```

**Step 5 - ZIG:** Validate FRs trace to CNs
| FR | CN | Valid |
|----|-----|-------|
| FR.1.1.1 | CN.1.1 | ✅ |
| FR.1.1.2 | CN.1.1 | ✅ |
| FR.1.2.1 | CN.1.2 | ✅ |
| FR.1.2.2 | CN.1.2 | ✅ |

### Final Hierarchy
```
CP.1: Sales managers must know customer purchase history within 5 minutes
  ├── CN.1.1: Display purchase history instantly
  │     ├── FR.1.1.1: Display within 3 seconds
  │     └── FR.1.1.2: Search by name/phone
  └── CN.1.2: Accessible during phone calls
        ├── FR.1.2.1: Mobile application
        └── FR.1.2.2: Phone integration
```
```

---

## Usage Instructions

### When to Use This Prompt

| Situation | Operation | Input |
|-----------|-----------|-------|
| After CP generation | ZAG-MAP | CPs → verify CN coverage planned |
| After CN generation | ZIG-VALIDATE | CNs → verify all trace to CPs |
| After FR generation | CONSISTENCY-CHECK | All domains → full audit |
| Refining requirements | DECOMPOSE | Specific CP or CN to break down |

### Invocation

**GitHub Copilot:**
```
/zigzag

Artifacts:
[Paste CPs, CNs, and/or FRs]
```

**Claude Code:**
```
Apply Zig Zag
Operation: [ZAG-MAP | ZIG-VALIDATE | DECOMPOSE | CONSISTENCY-CHECK]
Domain Focus: [CP→CN | CN→FR | Full]
Artifacts: [paste]
```

---

## Output Templates

### Coverage Matrix

```markdown
## CP → CN → FR Coverage Matrix

| CP | CNs | FRs | Coverage |
|----|-----|-----|----------|
| CP.1 | CN.1, CN.2 | FR.1, FR.2, FR.3 | ✅ Full |
| CP.2 | CN.3 | FR.4 | ✅ Full |
| CP.3 | — | — | ❌ Gap |

### Summary
- CPs with coverage: 2/3 (67%)
- Orphan CNs: 0
- Orphan FRs: 0
- Gap identified: CP.3 needs CN generation
```

### Gap Analysis

```markdown
## Gap Analysis Report

### Uncovered Customer Problems
| CP | Statement | Suggested Action |
|----|-----------|------------------|
| CP.3 | [statement] | Generate CN using CN.md |

### Orphan Items
| Item | Type | Issue | Suggested Action |
|------|------|-------|------------------|
| FR.7 | FR | No CN traces | Remove or identify missing CN |
| CN.5 | CN | No CP traces | Validate business need or remove |

### Redundancies
| Items | Overlap | Suggested Action |
|-------|---------|------------------|
| FR.2, FR.8 | Both handle user search | Merge or differentiate scope |
```

---

## Quality Checklist

Before completing zig zag analysis:

- [ ] Every CP has at least one CN mapped
- [ ] Every CN has at least one FR mapped
- [ ] Every FR traces back to a CN
- [ ] Every CN traces back to a CP
- [ ] Hierarchical IDs align (CP.1 → CN.1.x → FR.1.x.y)
- [ ] No orphan requirements identified
- [ ] Gaps documented with action items

---

## Related Steps

| Step | Description | Relationship |
|------|-------------|--------------|
| 1 | Customer Problems | Use Zig Zag after generating CPs to plan CN coverage |
| 3 | Customer Needs | Use Zig Zag to validate CN→CP traceability |
| 5 | Functional Requirements | Use Zig Zag for full consistency check |

---

## References

- **Axiomatic Design:** Suh, N.P. (1990). *The Principles of Design*. Oxford University Press.
- **Problem-Based SRS:** Gorski & Stadzisz (2016)

---

**Version:** 1.0  
**Type:** Validation & Consistency Tool  
**Domains:** CP ↔ CN ↔ FR
