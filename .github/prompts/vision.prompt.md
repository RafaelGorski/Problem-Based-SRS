---
agent: 'agent'
description: 'Generate a Software Vision document from Glance and Customer Needs'
---

## Role

You're generating a **Software Vision** document that provides high-level scope, positioning, and architectural boundaries for a software project.

## Step Context

This is **Step 4 of 5** in the Problem-Based SRS process:
1. Customer Problems
2. Software Glance
3. Customer Needs
4. **Software Vision** ← You are here
5. Functional Requirements

## Purpose

The Software Vision serves as:
- **Scope definition**: Establishes clear boundaries for requirements
- **Stakeholder agreement**: High-level view all parties can review
- **Input to requirements**: Feeds into Functional Requirements (Step 5)

## Input Required

Software Glance: ${input:glance:Paste your Software Glance from Step 2}
Customer Needs: ${input:needs:Paste your Customer Needs from Step 3}

## What This Step Does

✅ Provides high-level scope and positioning  
✅ Lists major features at conceptual level  
✅ Defines environmental constraints  
✅ Shows high-level architecture blocks  
✅ Identifies all stakeholders  

## What This Step Does NOT Do

❌ Create detailed functional requirements (Step 5)  
❌ Design complete software architecture  
❌ Specify low-level implementation details

## Output Structure

### 1. Positioning Statement

```
For [target customer]
Who [statement of need or opportunity]
The [product name] is a [product category]
That [key benefit, compelling reason to use]
Unlike [primary competitive alternative]
Our product [statement of primary differentiation]
```

### 2. Stakeholders

List all parties involved:
- End users and their roles
- Development team members
- Business sponsors/owners
- External systems/integrations

### 3. Product Overview

| Section | Content |
|---------|---------|
| **Purpose** | What problem does this software solve? |
| **Scope** | What is included and explicitly excluded? |
| **Key Benefits** | Top 3-5 value propositions |
| **Success Metrics** | How will success be measured? |

### 4. High-Level Features

| Feature | Description | Benefit | Priority |
|---------|-------------|---------|----------|
| [Name] | [Brief description] | [User benefit] | [Must/Should/Nice-to-have] |

### 5. Environment and Constraints

Specify:
- **Deployment Environment**: Cloud, on-premise, hybrid, mobile
- **Technical Constraints**: Platform, language, framework preferences
- **Integration Requirements**: Systems that must connect
- **Security Requirements**: Authentication, authorization, data protection
- **Performance Requirements**: Response time, scalability expectations

### 6. High-Level Architecture

Provide a simple block diagram:
```
[User Interface Layer]
        ↓
[Business Logic Layer]
        ↓
[Data Access Layer]
        ↓
[Database]
```

## Best Practices

1. **Trace to Inputs**: Every feature should trace to Software Glance or Customer Needs
2. **High-Level Only**: Stay conceptual—detailed requirements come in Step 5
3. **Boundary Setting**: Explicitly state what is OUT of scope
4. **Stakeholder Review**: Vision must be reviewable by business and technical stakeholders

## Validation Checklist

- [ ] Positioning statement clearly defines software purpose
- [ ] All stakeholders identified
- [ ] 5-10 high-level features listed (NOT detailed requirements)
- [ ] Environment and constraints specified
- [ ] High-level architecture diagram included
- [ ] Scope boundaries clearly defined (what's IN and OUT)
- [ ] Each feature traces to a glance directive or customer need

## Handoff

When complete:

```
✅ Step 4 Complete: Software Vision Created

Summary:
- [N] stakeholders identified
- [N] high-level features defined
- Scope boundaries established

→ Next Step: 5 - Functional Requirements
→ Use: /fr prompt
```

---

Based on Problem-Based SRS methodology (Gorski & Stadzisz, 2016)
