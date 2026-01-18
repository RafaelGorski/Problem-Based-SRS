# Software Vision Generation Prompt

## Overview
**Step 4 of 5** in the Problem-Based SRS methodology.

**Single Responsibility**: Transform the Software Glance + Customer Needs into a detailed Software Vision document that provides high-level scope, positioning, and architectural boundaries.

**Position in Process**:
```
Step 1: Customer Problems → Step 2: Software Glance → Step 3: Customer Needs
                                           ↓                        ↓
                                  Step 4: SOFTWARE VISION (You are here)
                                           ↓
                                  Step 5: Requirements Specification
```

## Purpose
Generate a Software Vision document that serves as:
- **Input boundary**: Requires Software Glance (Step 2) + Customer Needs (Step 3)
- **Output boundary**: Feeds into Software Requirements Specification (Step 5)
- **Scope definition**: Establishes clear boundaries to keep requirements within scope
- **Stakeholder agreement point**: High-level view all parties can review and approve

## Prerequisites (Required Inputs)

This prompt **REQUIRES** completed artifacts from previous steps:

1. **Software Glance** (from Step 2)
   - Location: Provide file path or paste content
   - Contains: Initial rough idea of software solution with directives
   
2. **Customer Needs** (from Step 3)
   - Location: Provide file path or paste content
   - Contains: List of desired outcomes the software must provide

**⚠ Warning**: Do not proceed without these inputs. The Vision cannot be created independently.

## Your Task

Transform the Software Glance into a detailed Vision document by:
1. **Elaborating** the glance with specific positioning and features
2. **Incorporating** all relevant Customer Needs into the vision
3. **Defining** scope boundaries to guide the next step (Requirements Specification)
4. **Describing** high-level architecture (NOT complete architecture design)
5. **Establishing** stakeholder agreement on software direction

### What This Step DOES:
✅ Provides high-level scope and positioning  
✅ Lists major features at conceptual level  
✅ Defines environmental constraints  
✅ Shows high-level architecture blocks  
✅ Identifies all stakeholders  

### What This Step DOES NOT Do:
❌ Create detailed functional requirements (Step 5)  
❌ Design complete software architecture (later design phase)  
❌ Specify low-level implementation details  
❌ Go beyond high-level architectural decisions

### Vision Document Structure

Generate a document with these sections:

#### 1. **Positioning Statement**
```
For [target customer]
Who [statement of need or opportunity]
The [product name] is a [product category]
That [key benefit, compelling reason to buy/use]
Unlike [primary competitive alternative]
Our product [statement of primary differentiation]
```

#### 2. **Stakeholders**
List all parties involved:
- End users and their roles
- Development team members
- Business sponsors/owners
- External systems/integrations
- Support and maintenance teams

#### 3. **Product Overview**
Describe:
- **Purpose**: What problem does this software solve?
- **Scope**: What is included and what is explicitly excluded?
- **Key Benefits**: Top 3-5 value propositions
- **Success Metrics**: How will success be measured?

#### 4. **High-Level Features**
For each major feature:
- Feature name and brief description
- Primary benefit to users
- Priority level (Must-have, Should-have, Nice-to-have)

Example format:
| Feature | Description | Benefit | Priority |
|---------|-------------|---------|----------|
| Contact Management | Store and organize customer information | Centralized customer data | Must-have |

#### 5. **Environment and Constraints**
Specify:
- **Deployment Environment**: Cloud, on-premise, hybrid, mobile
- **Technical Constraints**: Platform, language, framework preferences
- **Integration Requirements**: Systems that must connect
- **Security Requirements**: Authentication, authorization, data protection
- **Performance Requirements**: Response time, scalability expectations
- **Compatibility Requirements**: Browsers, devices, OS versions

#### 6. **High-Level Architecture**
Provide:
- Block diagram showing major subsystems
- Key interfaces and data flows
- External system connections
- Technology stack recommendations (high-level)

Use text-based diagrams or descriptions:
```
[User Interface Layer]
        ↓
[Business Logic Layer]
        ↓
[Data Access Layer]
        ↓
[Database]
```

### Best Practices

1. **Trace to Inputs**: Every feature should trace back to Software Glance or Customer Needs
2. **High-Level Only**: Stay conceptual - detailed requirements come in Step 5
3. **Boundary Setting**: Explicitly state what is OUT of scope
4. **Stakeholder Review**: Vision must be reviewable by both technical and business stakeholders
5. **Architecture ≠ Design**: Show major subsystems, not detailed architecture
6. **Scope Guard**: This document guards Step 5 from scope creep

### Output Format
Provide the vision as a structured markdown document with:
- Clear section headings
- Tables for structured data (features, stakeholders)
- Diagrams where helpful (ASCII or description)
- Concise, scannable content

### Example Questions to Guide Generation

Ask yourself while creating the vision:
- Who will use this software and why?
- What are the 3-5 most important things it must do?
- What existing systems must it integrate with?
- What are the technical boundaries and constraints?
- How will users access it (web, mobile, desktop, API)?
- What are the security and compliance requirements?
- What does success look like for this software?

### Validation Checklist

**Input Validation**:
- [ ] Software Glance content is referenced/incorporated
- [ ] Customer Needs are explicitly addressed
- [ ] Each feature traces to a glance directive or customer need

**Output Validation**:
- [ ] Positioning statement clearly defines software purpose
- [ ] All stakeholders identified (users, developers, external systems)
- [ ] 5-10 high-level features listed (NOT detailed requirements)
- [ ] Environment and constraints specified
- [ ] High-level architecture diagram included
- [ ] Scope boundaries clearly defined (what's IN and OUT)

**Boundary Validation**:
- [ ] Stays at high-level (no detailed functional requirements)
- [ ] Architecture is conceptual blocks only (not complete design)
- [ ] Ready to feed into Step 5: Requirements Specification
- [ ] Can be reviewed and approved by stakeholders

## Usage Examples

### Command Format (Reusable)
```
Generate a Software Vision document (Step 4 of Problem-Based SRS).

**Required Inputs**:
- Software Glance: <file_path_or_content>
- Customer Needs: <file_path_or_content>
```

### GitHub Copilot Example
```
/vision

Software Glance: docs/glance.md
Customer Needs: docs/cn.md
Project: CRM System for Small Business
```

### Claude Code Example
```
Generate Software Vision (Step 4) using:
- Software Glance: [paste content from Step 2]
- Customer Needs: [paste content from Step 3]

Save output to: docs/software-vision.md
```

### Cursor IDE Example
```
Generate vision doc.
Inputs: @docs/glance.md + @docs/cn.md
Output: Create docs/software-vision.md
```

## Process Integration

### Upstream Dependencies (Required Before This Step)
- **Step 1**: Customer Problems document
- **Step 2**: Software Glance document
- **Step 3**: Customer Needs document

### Downstream Artifacts (What Uses This Output)
- **Step 5**: Software Requirements Specification

### Related Files in This Repository
```
.github/prompts/
  ├── cp.prompt.md        (Step 1)
  ├── glance.prompt.md    (Step 2)
  ├── cn.prompt.md        (Step 3)
  ├── vision.prompt.md    (Step 4) ← YOU ARE HERE
  └── fr.prompt.md        (Step 5)
```

## Key Methodological Notes

1. **Sequential vs Iterative**: While shown sequentially, this process supports iterative/incremental approaches
2. **Causal Dependencies**: Vision depends on Glance + Needs; cannot skip steps
3. **Scope Boundary**: Vision sets the boundary for Step 5 requirements to prevent scope creep
4. **Input Traceability**: All vision content should trace to glance directives or customer needs

## References
- **Primary**: Problem-Based SRS methodology (Gorski & Stadzisz, 2016)
- **Template Source**: IBM Rational Unified Process (RUP) Vision Document
- **Standards**: IEEE 830 Software Requirements Specification

---

**⚠ Important**: This is **Step 4 of 5** in a sequential process. Ensure Steps 1-3 are complete before using this prompt. The output feeds directly into Step 5 (Requirements Specification).
