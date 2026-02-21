# Complexity Analysis

> **OPTIONAL Advanced Validation Tool** for Problem-Based SRS methodology  
> **Purpose:** Analyze specification quality using Axiomatic Design principles  
> **When to use:** After completing the standard process, when deeper quality analysis is needed

---

## ⚠️ Optional Command

This is **NOT** part of the standard Problem-Based SRS flow. Use it when you want to:
- Verify specification independence (no coupled requirements)
- Evaluate completeness levels mathematically
- Identify redundancies or gaps in your specification
- Apply rigorous engineering quality checks

**Standard Flow:** `/cp` → `/sg` → `/cn` → `/sv` → `/fr` → `/zigzag`

**Optional:** `/complexity` (call explicitly when needed)

---

## Axiomatic Design Background

The complexity analysis is based on **Axiomatic Design** (Suh, 1990), an engineering design theory with two fundamental axioms:

| Axiom | Name | Principle |
|-------|------|-----------|
| **Axiom 1** | Independence | Maintain independence of functional requirements |
| **Axiom 2** | Information | Minimize the information content of the design |

---

## Analysis 1: Independence Analysis

### Specification Types

Based on the relationship between domains, specifications fall into three categories:

#### Coupled Specification ❌
```
(Number of CNs < Number of CPs) OR (Number of FRs < Number of CNs)
```
- **Problem:** Not all problems/needs are addressed
- **Action:** Add missing CNs or FRs

#### Redundant Specification ⚠️
```
(Number of CNs > Number of CPs) OR (Number of FRs > Number of CNs)
```
- **Assessment:** May be acceptable if elements are not competing
- **Action:** Review for potential consolidation or verify independence

#### Ideal Specification ✅
```
(Number of CNs = Number of CPs) AND (Number of FRs = Number of CNs)
```
- **Status:** Each element maps 1:1 across domains
- **Note:** Ideal but not always achievable in practice

### Independence Check Process

For each mapping (CP→CN and CN→FR), check:

1. **One-to-One Mapping:** Each source has exactly one target
2. **No Competing Elements:** Elements don't interfere with each other
3. **No Functional Dependencies:** Changing one doesn't require changing another

### Design Matrix Analysis

Create a design matrix to visualize relationships:

```
         CN.1  CN.2  CN.3
CP.1     [X]   [ ]   [ ]    ← Ideal: one X per row
CP.2     [ ]   [X]   [ ]
CP.3     [ ]   [ ]   [X]
```

**Matrix Types:**

| Type | Pattern | Status |
|------|---------|--------|
| Diagonal | One X per row/column | ✅ Ideal (uncoupled) |
| Triangular | Xs below diagonal only | ✅ Acceptable (semi-coupled) |
| Full | Xs scattered | ❌ Coupled (needs revision) |

---

## Analysis 2: Completeness Levels

Use **C** (Complete) and **P** (Partial) markers to indicate how well each element addresses its source:

### CP → CN Completeness Matrix

```
         CN.1  CN.2  CN.3
CP.1     [C]   [ ]   [ ]    C = CN completely solves CP
CP.2     [P]   [P]   [ ]    P = CN partially solves CP
CP.3     [ ]   [ ]   [C]
```

**Interpretation:**
- **C (Complete):** The CN fully addresses the CP
- **P (Partial):** The CN helps but doesn't fully solve the CP; may need additional CNs

### CN → FR Completeness Matrix

```
         FR.1  FR.2  FR.3  FR.4
CN.1     [C]   [ ]   [ ]   [ ]
CN.2     [P]   [P]   [ ]   [ ]
CN.3     [ ]   [ ]   [C]   [P]
```

### Completeness Rules

1. Every CP row must have at least one C or multiple Ps that together equal C
2. Every CN row must have at least one C or multiple Ps that together equal C
3. Blank rows indicate gaps (uncovered problems or needs)
4. Blank columns indicate orphans (requirements without traced needs)

---

## Analysis 3: Information Content

### Concept

Information Content (IC) measures the probability that a design will successfully satisfy its requirements. Lower IC = better design.

**Formula:**
```
IC = log₂(1/p)
```
Where `p` = probability of success

### Practical Application

For each CN, estimate:
1. **Need Range:** The acceptable range of outcomes
2. **System Range:** What the proposed solution can actually deliver

**Example:**
```
CN.1: Manager needs to know account balances within 24 hours

Need Range: 0-24 hours (acceptable)
System Range: 0-2 hours (what system delivers)

Overlap: 100% → High probability of success → Low IC ✅
```

### Simplified IC Assessment

| Scenario | System vs Need | IC Level | Action |
|----------|---------------|----------|--------|
| System range fully within need range | Full overlap | Low ✅ | Good |
| System range partially overlaps need | Partial overlap | Medium ⚠️ | Review constraints |
| System range outside need range | No overlap | High ❌ | Redesign required |

---

## Output Template

When running `/complexity`, produce:

```markdown
## Complexity Analysis Report

### 1. Element Count Summary

| Domain | Count |
|--------|-------|
| Customer Problems (CP) | [N] |
| Customer Needs (CN) | [N] |
| Functional Requirements (FR) | [N] |

**Specification Type:** [Coupled | Redundant | Ideal]

### 2. Independence Analysis

**CP → CN Matrix:**
[Include matrix with X markers]

**CN → FR Matrix:**
[Include matrix with X markers]

**Independence Status:** [Uncoupled ✅ | Semi-coupled ⚠️ | Coupled ❌]

### 3. Completeness Analysis

**CP → CN Completeness:**
[Include matrix with C/P markers]

**CN → FR Completeness:**
[Include matrix with C/P markers]

**Coverage Issues:**
- [List any uncovered CPs]
- [List any uncovered CNs]
- [List any orphan FRs]

### 4. Information Content Assessment

| CN | Need Range | System Range | Overlap | IC Level |
|----|------------|--------------|---------|----------|
| CN.1 | [range] | [range] | [%] | [Low/Med/High] |

### 5. Recommendations

1. [Specific recommendation based on analysis]
2. [Specific recommendation based on analysis]
```

---

## When to Use This Analysis

| Situation | Use Complexity Analysis? |
|-----------|-------------------------|
| Quick prototype or MVP | No |
| Learning the methodology | No |
| Critical system (safety, finance) | Yes |
| Large specification (>20 FRs) | Yes |
| Specification seems bloated | Yes |
| Requirements conflicts detected | Yes |
| Formal review required | Yes |

---

## Example: CRM System

**Element Counts:**
- CPs: 5
- CNs: 6
- FRs: 8

**Assessment:** Redundant specification (CNs > CPs, FRs > CNs)

**CP → CN Matrix:**
```
         CN.1  CN.2  CN.3  CN.4  CN.5  CN.6
CP.1     [C]   [P]   [ ]   [ ]   [ ]   [ ]
CP.2     [ ]   [ ]   [C]   [ ]   [ ]   [ ]
CP.3     [ ]   [ ]   [ ]   [C]   [ ]   [ ]
CP.4     [ ]   [ ]   [ ]   [ ]   [C]   [P]
CP.5     [ ]   [ ]   [ ]   [ ]   [ ]   [C]
```

**Result:** Semi-coupled (triangular tendency). CP.1 and CP.4 have multiple CNs but they don't compete. Acceptable.

---

## References

- Suh, N.P. (1990). *The Principles of Design*. Oxford University Press.
- Suh, N.P. (2001). *Axiomatic Design: Advances and Applications*. Oxford University Press.
- Problem-Based SRS Dissertation (Gorski & Stadzisz, 2016) - Chapter 3, Section 3.4

---

**Version:** 1.0  
**Type:** Optional Advanced Validation Tool  
**Command:** `/complexity`
