# Example: CRM System

> **Condensed walkthrough** of Problem-Based SRS methodology  
> **Domain:** Customer Relationship Management  
> **Purpose:** Learn by example how to apply each step

---

## Business Context

The company has difficulties maintaining an effective relationship with its customers. They believe a CRM (Customer Relationship Management) software system can help reduce these difficulties.

---

## Step 1: Customer Problems (CP)

### Identified Problems

| ID | Statement | Class |
|----|-----------|-------|
| CP.01 | The company must ensure the existence of a communication channel with all customers, otherwise it risks losing customers, affecting marketing, promotions, feedback, and future sales. | Obligation |
| CP.01.1 | The company must ensure it can contact all of its customers. | Obligation |
| CP.01.2 | The company must ensure each customer is contacted regularly. | Obligation |
| CP.02 | The company must consider customer feedback statistics in planning, otherwise it creates customer dissatisfaction and loses market share. | Obligation |
| CP.03 | Customers expect the company to respond to their feedback, otherwise they become frustrated and company reputation decreases. | Expectation |
| CP.04 | The company must align sales strategies with customer behavior, otherwise it misses sales opportunities. | Obligation |
| CP.05 | The company must project sales, otherwise it loses opportunities and makes inadequate provisions. | Obligation |

### Decomposition Note

CP.01 was decomposed into CP.01.1 and CP.01.2 to clarify two distinct facets:
- **CP.01.1:** Ability to contact (having contact information)
- **CP.01.2:** Regular contact (frequency of communication)

---

## Step 2: Software Glance

### High-Level Solution

CRM software will:
- Interact with customers through a **web interface** (marketing campaigns, feedback, responses)
- Provide **local interfaces** for the Manager
- Store customer data, feedback, and sales history in a **database**
- Include a **LAN interface** to the Sales Management software

### Block Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      CRM Software                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Customer  │  │   Manager   │  │    Sales    │     │
│  │  Web Portal │  │  Dashboard  │  │ Management  │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│                    ┌─────▼─────┐                        │
│                    │  Database │                        │
│                    │(Customers,│                        │
│                    │ Feedback, │                        │
│                    │  Sales)   │                        │
│                    └───────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## Step 3: Customer Needs (CN)

### Needs Specification

| ID | Statement | Outcome Class | Traces To |
|----|-----------|---------------|-----------|
| CN.01.1 | The company needs a CRM software to know who its customers are and have updated contact information. | Information | CP.01.1 |
| CN.01.2 | The company needs a CRM software to be aware of when each customer was last contacted. | Information | CP.01.2 |
| CN.02.1 | The company needs a CRM software to know customer feedback statistics monthly. | Information | CP.02 |
| CN.03.1 | The company needs a CRM software to allow responding to customer feedback. | Construction | CP.03 |
| CN.04.1 | The company needs a CRM software to know customer behavior patterns. | Information | CP.04 |
| CN.05.1 | The company needs a CRM software to know projected sales forecasts quarterly. | Information | CP.05 |

> **Reading the IDs:** `CN.01.1` and `CN.01.2` are the first and second needs raised by
> `CP.01` — one per sub-problem. The needs of `CP.02`…`CP.05` restart at `.1` under their
> own problem, so the ID alone says which problem a need came from.

---

## Step 4: Software Vision

### Positioning
CRM software for companies with customer relationship difficulties. Unlike generic CRMs, this solution focuses on communication channel management and feedback responsiveness.

### Stakeholders
| Stakeholder | Interest |
|-------------|----------|
| Marketing Team | Customer campaigns, contact management |
| Manager | Statistics, reports, decision making |
| Sales Team | Sales forecasting, behavior analysis |
| Customers | Feedback submission, response tracking |

### High-Level Features
1. Customer contact database management
2. Marketing campaign execution
3. Feedback collection and response
4. Statistics and analytics dashboard
5. Sales forecasting

---

## Step 5: Functional Requirements (FR)

### Requirements Specification

| ID | Statement | Traces To |
|----|-----------|-----------|
| FR.01.1.1 | The CRM shall store and display customer contact information including name, email, phone, and address. | CN.01.1 |
| FR.01.1.2 | The CRM shall send marketing campaigns to selected customer segments. | CN.01.1, CN.01.2 |
| FR.01.2.1 | The CRM shall record the date of last contact for each customer. | CN.01.2 |
| FR.01.2.2 | The CRM shall display customers not contacted within a configurable period. | CN.01.2 |
| FR.02.1.1 | The CRM shall calculate and display feedback statistics by category monthly. | CN.02.1 |
| FR.03.1.1 | The CRM shall allow users to compose and send responses to customer feedback. | CN.03.1 |
| FR.04.1.1 | The CRM shall analyze and display customer purchase behavior patterns. | CN.04.1 |
| FR.05.1.1 | The CRM shall generate quarterly sales forecasts based on historical data. | CN.05.1 |

> **Reading the IDs:** `FR.01.2.2` is the second requirement implementing `CN.01.2`, which
> addresses `CP.01`. A shared requirement keeps the ID of its primary need — `FR.01.1.2`
> belongs to `CN.01.1` — and lists the other needs it serves in **Traces To**.

---

## Traceability Matrix

### CP → CN Coverage

|         | CN.01.1 | CN.01.2 | CN.02.1 | CN.03.1 | CN.04.1 | CN.05.1 |
|---------|---------|---------|---------|---------|---------|---------|
| CP.01.1 | C       |         |         |         |         |         |
| CP.01.2 |         | C       |         |         |         |         |
| CP.02   |         |         | C       |         |         |         |
| CP.03   |         |         |         | C       |         |         |
| CP.04   |         |         |         |         | C       |         |
| CP.05   |         |         |         |         |         | C       |

**C** = Complete coverage ✅

### CN → FR Coverage

|         | FR.01.1.1 | FR.01.1.2 | FR.01.2.1 | FR.01.2.2 | FR.02.1.1 | FR.03.1.1 | FR.04.1.1 | FR.05.1.1 |
|---------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|
| CN.01.1 | C         | P         |           |           |           |           |           |           |
| CN.01.2 |           | P         | C         | P         |           |           |           |           |
| CN.02.1 |           |           |           |           | C         |           |           |           |
| CN.03.1 |           |           |           |           |           | C         |           |           |
| CN.04.1 |           |           |           |           |           |           | C         |           |
| CN.05.1 |           |           |           |           |           |           |           | C         |

**C** = Complete, **P** = Partial ✅

---

## Summary

| Artifact | Count |
|----------|-------|
| Customer Problems | 7 (5 main + 2 sub) |
| Customer Needs | 6 |
| Functional Requirements | 8 |

**Specification Type:** Slightly redundant (8 FRs for 6 CNs) but acceptable.

**Traceability:** Complete — all CPs covered, no orphan FRs.

---

## Key Learnings

1. **Decomposition:** CP.01 was split into sub-problems for clarity
2. **Outcome Classes:** Most CNs are Information-type (typical for CRM)
3. **Multiple FRs per CN:** CN.01.2 needed two FRs to be fully addressed
4. **Shared FRs:** FR.01.1.2 traces to multiple CNs (marketing uses contact data)
5. **IDs carry the chain:** `FR.01.2.2` → `CN.01.2` → `CP.01` can be read off the ID alone,
   with no lookup table

---

*Based on: Problem-Based SRS Dissertation, Chapter 4 (Gorski & Stadzisz, 2016)*
