---
agent: 'agent'
description: 'Validate traceability and consistency across CP, CN, and FR domains'
---

## Role

You're performing **Zig Zag decomposition** for Problem-Based SRS—validating and ensuring consistency between CP, CN, and FR domains.

## Purpose

Validate consistency by:
1. Mapping artifacts across domains
2. Decomposing high-level items into sub-items
3. Identifying gaps, orphans, and inconsistencies

## Domain Mapping

```
Customer Problems    Customer Needs       Functional Requirements
(WHY)               (WHAT)               (HOW)
    │                   │                    │
   CP ──────────────► CN ────────────────► FR
    │                   │                    │
  CP.1 ─────────────► CN.1 ──────────────► FR.1
  CP.2 ─────────────► CN.2 ──────────────► FR.2
```

## Input

Artifacts: ${input:artifacts:Paste your CPs, CNs, and/or FRs}
Operation: ${input:operation:ZAG-MAP | ZIG-VALIDATE | DECOMPOSE | CONSISTENCY-CHECK}

## Operations

### Operation 1: ZAG-MAP (Forward Mapping)
Map items from source domain to target domain.

**Output:**
| Source | Target(s) | Relationship | Gap? |
|--------|-----------|--------------|------|
| CP.1   | CN.1, CN.2 | CP.1 addressed by CN.1, CN.2 | No |
| CP.2   | —          | No CN addresses CP.2 | YES |

### Operation 2: ZIG-VALIDATE (Backward Traceability)
Verify each item traces back to its source.

**Output:**
| Item | Traces To | Valid? | Issue |
|------|-----------|--------|-------|
| FR.1 | CN.1      | ✅     | —     |
| FR.7 | —         | ❌     | Orphan FR - no CN source |

### Operation 3: DECOMPOSE (Hierarchical Breakdown)
Decompose a high-level item into sub-items, zigzagging between domains.

**Process:**
1. Start with high-level CP (e.g., CP.1)
2. ZAG → Identify CN(s) that address CP.1
3. ZIG → Review if CN decomposition suggests CP refinement
4. ZAG → For each CN, identify FR(s)
5. ZIG → Review if FR decomposition suggests CN refinement

**Output:**
```
CP.1: [High-level problem statement]
  ├── CN.1.1: [Outcome needed]
  │     ├── FR.1.1.1: [Capability]
  │     └── FR.1.1.2: [Capability]
  └── CN.1.2: [Another outcome]
        └── FR.1.2.1: [Capability]
```

### Operation 4: CONSISTENCY-CHECK (Full Audit)
Perform complete consistency analysis.

**Output:**
- Coverage Matrix
- Gap Analysis
- Orphan Report
- Redundancy Detection

## Rules

### Independence Axiom
Each FR should ideally map to one CN. If an FR affects multiple CNs, flag for review—it may indicate coupled design.

### Completeness Rule
- Every CP must have at least one CN
- Every CN must have at least one FR
- No orphan FRs (requirements without traced needs)
- No orphan CNs (needs without traced problems)

### Hierarchy Alignment
When decomposing, sub-items should align:
- CP.1.1 → CN.1.1 (or subset)
- CN.1.1 → FR.1.1.x

## Example: Zig Zag Decomposition

**Input:**
```
CP.1: Sales managers must know customer purchase history within 5 minutes
      otherwise losing sales opportunities during client calls.
```

**Zig Zag Process:**

**Step 1 - ZAG:** What outcome (CN) addresses this problem?
```
CN.1: The sales manager needs CRM to know complete purchase history at any time.
```

**Step 2 - DECOMPOSE CN:**
```
CN.1.1: Sales manager needs CRM to display purchase history instantly.
CN.1.2: Sales manager needs CRM accessible during phone calls.
```

**Step 3 - ZAG:** What FRs deliver these CNs?
```
FR.1.1.1: The CRM shall display customer purchase history within 3 seconds.
FR.1.1.2: The CRM shall allow search by customer name or phone number.
FR.1.2.1: The CRM shall be accessible via mobile application.
FR.1.2.2: The CRM shall provide one-click access from phone integration.
```

**Final Hierarchy:**
```
CP.1: Sales managers must know purchase history within 5 minutes
  ├── CN.1.1: Display purchase history instantly
  │     ├── FR.1.1.1: Display within 3 seconds
  │     └── FR.1.1.2: Search by name/phone
  └── CN.1.2: Accessible during phone calls
        ├── FR.1.2.1: Mobile application
        └── FR.1.2.2: Phone integration
```

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
| CP.3 | [statement] | Generate CN using /cn |

### Orphan Items
| Item | Type | Issue | Suggested Action |
|------|------|-------|------------------|
| FR.7 | FR | No CN traces | Remove or identify missing CN |
| CN.5 | CN | No CP traces | Validate business need or remove |
```

## Quality Checklist

- [ ] Every CP has at least one CN mapped
- [ ] Every CN has at least one FR mapped
- [ ] Every FR traces back to a CN
- [ ] Every CN traces back to a CP
- [ ] Hierarchical IDs align (CP.1 → CN.1.x → FR.1.x.y)
- [ ] No orphan requirements identified
- [ ] Gaps documented with action items

---

Based on Axiomatic Design (Suh, 1990) adapted for Problem-Based SRS (Gorski & Stadzisz, 2016)
