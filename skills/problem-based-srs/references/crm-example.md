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
| CP.1 | The company must ensure the existence of a communication channel with all customers, otherwise it risks losing customers, affecting marketing, promotions, feedback, and future sales. | Obligation |
| CP.1.1 | The company must ensure it can contact all of its customers. | Obligation |
| CP.1.2 | The company must ensure each customer is contacted regularly. | Obligation |
| CP.2 | The company must consider customer feedback statistics in planning, otherwise it creates customer dissatisfaction and loses market share. | Obligation |
| CP.3 | Customers expect the company to respond to their feedback, otherwise they become frustrated and company reputation decreases. | Expectation |
| CP.4 | The company must align sales strategies with customer behavior, otherwise it misses sales opportunities. | Obligation |
| CP.5 | The company must project sales, otherwise it loses opportunities and makes inadequate provisions. | Obligation |

### Decomposition Note

CP.1 was decomposed into CP.1.1 and CP.1.2 to clarify two distinct facets:
- **CP.1.1:** Ability to contact (having contact information)
- **CP.1.2:** Regular contact (frequency of communication)

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
| CN.1 | The company needs a CRM software to know who its customers are and have updated contact information. | Information | CP.1.1 |
| CN.2 | The company needs a CRM software to be aware of when each customer was last contacted. | Information | CP.1.2 |
| CN.3 | The company needs a CRM software to know customer feedback statistics monthly. | Information | CP.2 |
| CN.4 | The company needs a CRM software to allow responding to customer feedback. | Construction | CP.3 |
| CN.5 | The company needs a CRM software to know customer behavior patterns. | Information | CP.4 |
| CN.6 | The company needs a CRM software to know projected sales forecasts quarterly. | Information | CP.5 |

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
| FR.1 | The CRM shall store and display customer contact information including name, email, phone, and address. | CN.1 |
| FR.2 | The CRM shall record the date of last contact for each customer. | CN.2 |
| FR.3 | The CRM shall display customers not contacted within a configurable period. | CN.2 |
| FR.4 | The CRM shall calculate and display feedback statistics by category monthly. | CN.3 |
| FR.5 | The CRM shall allow users to compose and send responses to customer feedback. | CN.4 |
| FR.6 | The CRM shall analyze and display customer purchase behavior patterns. | CN.5 |
| FR.7 | The CRM shall generate quarterly sales forecasts based on historical data. | CN.6 |
| FR.8 | The CRM shall send marketing campaigns to selected customer segments. | CN.1, CN.2 |

---

## Traceability Matrix

### CP → CN Coverage

|     | CN.1 | CN.2 | CN.3 | CN.4 | CN.5 | CN.6 |
|-----|------|------|------|------|------|------|
| CP.1.1 | C |   |   |   |   |   |
| CP.1.2 |   | C |   |   |   |   |
| CP.2 |   |   | C |   |   |   |
| CP.3 |   |   |   | C |   |   |
| CP.4 |   |   |   |   | C |   |
| CP.5 |   |   |   |   |   | C |

**C** = Complete coverage ✅

### CN → FR Coverage

|     | FR.1 | FR.2 | FR.3 | FR.4 | FR.5 | FR.6 | FR.7 | FR.8 |
|-----|------|------|------|------|------|------|------|------|
| CN.1 | C |   |   |   |   |   |   | P |
| CN.2 |   | C | P |   |   |   |   | P |
| CN.3 |   |   |   | C |   |   |   |   |
| CN.4 |   |   |   |   | C |   |   |   |
| CN.5 |   |   |   |   |   | C |   |   |
| CN.6 |   |   |   |   |   |   | C |   |

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

1. **Decomposition:** CP.1 was split into sub-problems for clarity
2. **Outcome Classes:** Most CNs are Information-type (typical for CRM)
3. **Multiple FRs per CN:** CN.2 needed two FRs to be fully addressed
4. **Shared FRs:** FR.8 traces to multiple CNs (marketing uses contact data)

---

*Based on: Problem-Based SRS Dissertation, Chapter 4 (Gorski & Stadzisz, 2016)*
