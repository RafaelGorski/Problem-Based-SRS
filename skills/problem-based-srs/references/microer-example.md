# Example: MicroER - Renewable Energy System

> **Condensed walkthrough** of Problem-Based SRS methodology  
> **Domain:** Renewable Energy Microgeneration Management  
> **Purpose:** Technical domain example with embedded systems

---

## Business Context

A residential end user is concerned about rational energy use and has invested in a renewable energy microgeneration unit with solar and wind sources. The user wants to:
- Reduce overall energy consumption
- Minimize environmental impact
- Adapt consumption patterns to energy availability
- Monitor system efficiency

---

## Step 1: Customer Problems (CP)

### Identified Problems

| ID | Statement | Class |
|----|-----------|-------|
| CP.1 | The customer intends to reduce energy consumption to lower costs using a renewable microgeneration system based on solar and wind sources. | Obligation |
| CP.1.1 | The customer must reduce unnecessary energy consumption to reduce costs. | Obligation |
| CP.1.2 | The customer must change consumption patterns, otherwise unable to reduce consumption. | Obligation |
| CP.1.3 | The customer must monitor consumption patterns, otherwise unable to optimize usage. | Obligation |
| CP.1.4 | The customer must ensure generating unit efficiency, otherwise must consume from public grid. | Obligation |
| CP.1.5 | The customer must ensure maintenance status of generating unit, otherwise malfunction occurs. | Obligation |
| CP.2 | The customer intends to contribute to minimizing environmental impacts of public energy sources. | Hope |
| CP.2.1 | The customer must be aware of the environmental impact of their consumption. | Expectation |
| CP.2.2 | The customer intends to rationalize energy use. | Hope |
| CP.3 | The customer intends to contribute to reducing consumption pressure on regional/national energy matrix. | Hope |
| CP.4 | The customer intends to influence others toward energy and environmental causes. | Hope |

### Decomposition Notes

- **CP.1** decomposed into 5 sub-problems covering: waste reduction, behavior change, monitoring, efficiency, and maintenance
- **CP.2** decomposed into awareness and rationalization aspects

---

## Step 2: Software Glance

### High-Level Solution

MicroER software will:
- Integrate with **hardware components** (sensors, controllers)
- Provide **user interface** for consumption monitoring and profile configuration
- Collect data from **solar and wind sources**
- Control **energy distribution** based on user preferences
- Display **efficiency and maintenance** status

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     MicroER System                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐        ┌────────────────┐              │
│  │  Solar Panels  │        │  Wind Turbine  │              │
│  └───────┬────────┘        └───────┬────────┘              │
│          │                         │                        │
│          └─────────┬───────────────┘                        │
│                    ▼                                         │
│          ┌─────────────────┐                                │
│          │ Energy Manager  │◄──────┐                        │
│          │   Controller    │       │                        │
│          └────────┬────────┘       │                        │
│                   │                │                        │
│    ┌──────────────┼────────────────┤                        │
│    ▼              ▼                ▼                        │
│ ┌──────┐    ┌──────────┐    ┌───────────┐                  │
│ │ Home │    │ Battery  │    │   User    │                  │
│ │Loads │    │ Storage  │    │ Interface │                  │
│ └──────┘    └──────────┘    └───────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 3: Customer Needs (CN)

### Needs Specification

| ID | Statement | Outcome Class | Traces To |
|----|-----------|---------------|-----------|
| CN.1 | The user needs MicroER to know current energy consumption in real-time. | Information | CP.1.1 |
| CN.2 | The user needs MicroER to control energy distribution based on consumption profiles. | Control | CP.1.2 |
| CN.3 | The user needs MicroER to know consumption patterns over time. | Information | CP.1.3 |
| CN.4 | The user needs MicroER to know generating unit efficiency status. | Information | CP.1.4 |
| CN.5 | The user needs MicroER to be aware of maintenance alerts. | Information | CP.1.5 |
| CN.6 | The user needs MicroER to know environmental impact metrics. | Information | CP.2.1 |
| CN.7 | The user needs MicroER to control load prioritization during low generation. | Control | CP.2.2 |
| CN.8 | The user needs MicroER to create consumption profiles. | Construction | CP.1.2 |

### Outcome Class Distribution

| Class | Count | Examples |
|-------|-------|----------|
| Information | 6 | Real-time data, statistics, alerts |
| Control | 2 | Energy distribution, load prioritization |
| Construction | 1 | Profile creation |
| Entertainment | 0 | N/A for this domain |

---

## Step 4: Software Vision

### Positioning
MicroER is energy management software for residential users with renewable microgeneration systems. Unlike simple monitors, MicroER provides active control of energy distribution based on user-defined consumption profiles.

### Stakeholders
| Stakeholder | Interest |
|-------------|----------|
| Homeowner | Cost reduction, consumption awareness |
| Maintenance Tech | System health, alerts |
| Environmental Advocate | Impact metrics, efficiency |

### High-Level Features
1. Real-time energy monitoring dashboard
2. Consumption profile configuration
3. Automatic energy distribution control
4. Efficiency and maintenance monitoring
5. Environmental impact reporting

### Environment
- Embedded hardware controllers (NI platform)
- Solar panel sensors
- Wind turbine sensors
- Battery management system
- Home automation integration (optional)

---

## Step 5: Functional Requirements (FR)

### Requirements Specification

| ID | Statement | Traces To |
|----|-----------|-----------|
| FR.1 | MicroER shall display real-time energy consumption in watts and kilowatt-hours. | CN.1 |
| FR.2 | MicroER shall allow users to define consumption profiles with load priorities. | CN.8 |
| FR.3 | MicroER shall automatically adjust energy distribution based on active profile. | CN.2 |
| FR.4 | MicroER shall display hourly, daily, weekly, and monthly consumption graphs. | CN.3 |
| FR.5 | MicroER shall calculate and display generation efficiency percentage. | CN.4 |
| FR.6 | MicroER shall generate maintenance alerts when efficiency drops below threshold. | CN.5 |
| FR.7 | MicroER shall calculate and display CO₂ offset compared to grid consumption. | CN.6 |
| FR.8 | MicroER shall reduce non-priority loads when generation falls below demand. | CN.7 |
| FR.9 | MicroER shall log all consumption and generation data for historical analysis. | CN.3 |

---

## Traceability Matrix

### CP → CN Coverage (Partial View)

|      | CN.1 | CN.2 | CN.3 | CN.4 | CN.5 | CN.6 | CN.7 | CN.8 |
|------|------|------|------|------|------|------|------|------|
| CP.1.1 | C |   |   |   |   |   |   |   |
| CP.1.2 |   | C |   |   |   |   |   | P |
| CP.1.3 |   |   | C |   |   |   |   |   |
| CP.1.4 |   |   |   | C |   |   |   |   |
| CP.1.5 |   |   |   |   | C |   |   |   |
| CP.2.1 |   |   |   |   |   | C |   |   |
| CP.2.2 |   |   |   |   |   |   | C |   |

**C** = Complete, **P** = Partial ✅

### CN → FR Coverage

|     | FR.1 | FR.2 | FR.3 | FR.4 | FR.5 | FR.6 | FR.7 | FR.8 | FR.9 |
|-----|------|------|------|------|------|------|------|------|------|
| CN.1 | C |   |   |   |   |   |   |   |   |
| CN.2 |   |   | C |   |   |   |   |   |   |
| CN.3 |   |   |   | C |   |   |   |   | P |
| CN.4 |   |   |   |   | C |   |   |   |   |
| CN.5 |   |   |   |   |   | C |   |   |   |
| CN.6 |   |   |   |   |   |   | C |   |   |
| CN.7 |   |   |   |   |   |   |   | C |   |
| CN.8 |   | C |   |   |   |   |   |   |   |

**C** = Complete, **P** = Partial ✅

---

## Summary

| Artifact | Count |
|----------|-------|
| Customer Problems | 11 (4 main + 7 sub) |
| Customer Needs | 8 |
| Functional Requirements | 9 |

**Specification Type:** Slightly redundant but well-structured.

**Traceability:** Complete — all major CPs covered.

---

## Key Learnings

1. **Technical Domain:** Embedded systems require more Control-type CNs
2. **Deep Decomposition:** CP.1 has 5 sub-problems reflecting system complexity
3. **Hardware Integration:** Software Glance must acknowledge hardware boundaries
4. **Multiple Outcome Classes:** Mix of Information (6), Control (2), and Construction (1)
5. **Hope-class Problems:** CP.3 and CP.4 are aspirational; may not generate direct FRs

---

*Based on: Problem-Based SRS Dissertation, Chapter 5 (Gorski & Stadzisz, 2016)*
