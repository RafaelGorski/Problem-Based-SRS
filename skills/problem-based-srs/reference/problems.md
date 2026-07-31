# Customer Problems (CP)

> **Step 1** of the Problem-Based SRS methodology  
> **Domain:** WHY — Explains why the solution is needed  
> **Prerequisite:** Step 0 — Business Context (business-context skill)

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they appear in all capitals, as shown here.
>
> **Note:** In Customer Problem notation, `must/expects/hopes` are classification verbs indicating severity class; they are not BCP 14 normative keywords unless explicitly written in ALL CAPITALS in normative guidance.

## Purpose

Identify, document, and validate Customer Problems from business context. Customer Problems represent the **WHY domain** — they provide the business justification for why a software solution is needed. All subsequent artifacts (Software Glance, Customer Needs, Software Vision, Requirements) derive from CPs.

**Best input:** A structured Business Context (Step 0) with project identity, business principles, stakeholders, current situation, and domain boundaries. If no Business Context exists, consider running the `business-context` skill first.

---

## Scope

| Aspect | Boundary |
|--------|----------|
| **This skill does** | Discover problems from context, normalize statements, and validate quality |
| **This skill does NOT** | Define solutions or derive requirements |
| **Input from** | Step 0: Business Context (preferred) OR ad-hoc business context |
| **Output to** | Step 2: Software Glance (software-glance skill) |

---

## Modes of Operation

### Mode 1: CP Generation
Use when starting from **business context** to discover and document problems.

### Mode 2: CP Review & Normalization  
Use when you have **draft CP statements** that need quality review and formatting.

### Mode 3: Brownfield Discovery
Use when the software **already exists** and nobody wrote down why. The starting point is a
running system rather than a brief.

---

## Mode 1: CP Generation

### Discovery Interview (Mandatory)

**STOP. Do NOT generate Customer Problem statements during this phase.** Your only job is to understand the problem space deeply enough to produce accurate, well-classified CPs.

This is a required interaction, not optional guidance. Ask questions in conversation, adapting based on answers. Do not dump all questions at once; have a natural dialogue. STOP and ask the user to clarify what you cannot infer. Use the ask_user tool if available; otherwise ask directly in chat and wait for an answer.

> **Autopilot / non-interactive mode does NOT waive this interview.** Conducting it *is* part of the deliverable — it is not an ambiguity to resolve autonomously. Do not treat "the user is away", "bias to action", or "autopilot is active" as grounds to skip. If no user is available to answer, you MUST still post the questions and wait. Proceed without answers ONLY when every Skip Condition below is literally satisfied; inferring context from a README or source code is exactly what this interview prevents and does NOT by itself satisfy those conditions.

#### Interview Cadence

- Ask **2-3 questions per round**, then STOP and wait for answers.
- Treat the Business Context document (.spec/00-business-context.md) as an anchor — it reduces questions but does not eliminate this phase.
- One round is the default. Add a second only if answers leave material gaps.
- **Assert-then-confirm, not menu-with-escape.** When the Business Context makes problem severity obvious, state your assessment and ask to confirm or override.

#### What to Ask (adapt to context)

**Round 1 — Problem Scope and Severity:**
- Which problems are the most urgent/costly? (Helps classify Obligation vs Expectation vs Hope)
- Who specifically suffers from these problems? (Identifies the Subject for CP notation)
- What are the concrete consequences if nothing changes? (Identifies Penalties)

**Round 2 (only if gaps remain) — Completeness:**
- Are there compliance/legal obligations not yet mentioned?
- Are there problems that users experience but haven't articulated?
- Which stakeholder group's problems should we prioritize first?

#### Skip Conditions

Skip the interview and proceed directly when ALL of these are true. A README, source code, or other repository documentation alone does **NOT** satisfy these — autonomously inferring context from repo files is precisely what the interview exists to prevent:
- A completed Step 0 Business Context artifact (`.spec/00-business-context.md`) exists **and was reviewed/confirmed by the user** — not merely inferred from a README
- The user's own prompt (not repository documentation) explicitly states the problems and their severity
- No ambiguity exists about who suffers and what the consequences are

If these are not ALL literally satisfied, you MUST run the interview — including in autopilot mode. When you do skip, state in one line what you're using as the basis and proceed.

---

### Your Task
Analyze the provided business context and generate Customer Problem statements.

### Input Required
- **Business Context (preferred):** Step 0 output (`00-business-context.md`) with project identity, principles, stakeholders, current situation, and domain boundaries
- **Alternative:** Description of the business domain, current situation, and scope (if Step 0 was skipped)
- **Stakeholder Information:** Who experiences the problems (optional but helpful)

### Discovery Questions

Ask these questions to elicit problems:

1. **Obligations:**
   - What legal or contractual requirements must be met?
   - What regulations apply to this business?
   - What happens if compliance fails?

2. **Expectations:**
   - What do customers/users expect that isn't being delivered?
   - What business goals are not being met?
   - What standards should be achieved but aren't?

3. **Hopes:**
   - What improvements would stakeholders like to see?
   - What optimizations are desired?
   - What new capabilities are wished for?

4. **Consequences:**
   - What happens if these issues aren't addressed?
   - What is the cost of the current situation?
   - Who is impacted and how severely?

---

## Mode 2: CP Review & Normalization

### Your Task
For each draft problem:
1. **Normalize** into the CP syntax: `[Subject] [Verb] [Object] [Penalty]`
2. **Classify** as **Obligation**, **Expectation**, or **Hope**
3. **Flag missing elements** (subject, object, penalty, or severity verb)
4. **If required data is missing,** STOP and ask the user to clarify what you cannot infer. Use the ask_user tool if available; otherwise ask directly in chat and wait for an answer.

---

## Mode 3: Brownfield Discovery (existing system → CPs)

Most systems that need a specification already run in production. The code, the schema, the
ticket queue and the dashboards are dense evidence about what hurts — but evidence is not a
specification, and reading it is not the same as knowing why the system must change.

### The governing rule

**Repository evidence is input to the Discovery Interview and never a basis to skip it.**

The Skip Conditions above are unchanged and still apply literally: a README, source code,
commit history, or issue tracker does **NOT** satisfy them. Harvesting evidence makes the
interview *shorter and sharper* — you arrive with numbers instead of open questions — but the
person who owns the system is still the only one who can say which consequences matter and
what they cost. Producing CPs from a code scan alone is the exact failure this step exists to
prevent, whether or not a human is present to stop you.

### Step 1 — Harvest the evidence

Read the system for **consequences**, not for architecture. Useful sources:

| Source | What to extract |
|--------|-----------------|
| Database schema and data | Volumes that reveal pain — duplicate rows, orphaned records, unused columns |
| Support tickets / issue tracker | Recurring themes, and what users say they could not do |
| Analytics and operational metrics | Abandonment, latency, retry, error and rework rates |
| Code comments, TODOs, workarounds | Where the team keeps patching the same wound |
| Runbooks and manual processes | Work humans do because the system does not |

Record each finding with its source, so every CP you later write is traceable to observed
evidence rather than to a guess.

### Step 2 — Bring the evidence to the interview

Use the **assert-then-confirm** cadence from the Discovery Interview: state what the evidence
suggests and ask the owner to confirm or override. This is a genuine interview turn — you MUST
wait for the answer.

> "The contacts table holds 41,800 rows for roughly 26,000 real customers, and 22% of support
> tickets mention a colleague's missing notes. My reading is that reps cannot reconstruct a
> customer's history, and the cost is repeated work and lost renewals. Is that the consequence
> that matters, or is something else more urgent?"

### Step 3 — Translate causes into problems

A technical finding is a **cause**. A Customer Problem is the **business consequence** that
cause produces, stated with a Subject and a Penalty. Technical debt is real, and it belongs in
the Business Context as a constraint — it is not a Customer Problem.

### Anti-Patterns to Avoid (Brownfield)

| ❌ Wrong (the finding restated) | ✅ Correct (its consequence) |
|--------------------------------|------------------------------|
| ❌ "The CRM is a PHP monolith with jQuery front-ends and no tests" | ✅ "Sales managers must wait two weeks for any pipeline change, losing deals that turn on a same-week response" |
| ❌ "The team must rewrite the legacy system and migrate to microservices" | ✅ "Support agents cannot reconstruct a customer's history, so 22% of conversations repeat work already done" |
| ❌ "We should build a new CRM system to replace the old one" | ✅ "Account managers lose renewals because no one is alerted when a contract is 30 days from expiry" |
| ❌ "Buy Salesforce instead" | ✅ "Compliance officers cannot produce a record of who changed a customer's data, breaching the audit obligation" |

Each ❌ names a technology, a rewrite, or a purchase — none of them says who suffers or what it
costs. Each ✅ names a subject and a penalty, and stays true whichever technology is chosen.

### Mode 3 Checklist

- [ ] Evidence harvested with its source recorded
- [ ] Findings asserted back to the system's owner and confirmed or overridden
- [ ] Every CP traces to observed evidence, not to inference from code alone
- [ ] No CP names a technology, a rewrite, or a product to buy
- [ ] Technical debt recorded as a constraint, not promoted to a Customer Problem

---

## CP Structured Notation
Each Customer Problem MUST follow this syntax:

```
[Subject] [Verb] [Object] [Penalty/Consequence]
```

**Components:**
- **Subject:** Who suffers the problem (company, manager, customer, department)
- **Verb:** Indicates severity class (must/expects/hopes)
- **Object:** The difficulty or requirement
- **Penalty:** Consequence if problem persists

---

## Problem Classification

Classify each CP by severity:

| Class | Severity | Verbs | Description |
|-------|----------|-------|-------------|
| **Obligation** | High | must, have to, is required to | Legal/contractual; severe consequences if unmet |
| **Expectation** | Medium | expects, should, anticipates | Business goal; moderate impact if unmet |
| **Hope** | Low | hopes, aims, desires, wishes | Improvement; minimal penalty if unmet |

---

## Output Format

**⚠ ID Format:** Always use canonical dotted notation — `CP.01`, `CP.02`, and `CP.01.1` for
sub-problems. Hyphen IDs (`CP-001`) are legacy: still readable, but do not produce new ones.
See "Identifier Notation" in `SKILL.md`.

### For Mode 1 (Generation)

For each identified problem, produce:

```markdown
### CP.01: [Brief Title]

**Statement:** [Subject] [Verb] [Object] [Penalty]

**Classification:** [Obligation | Expectation | Hope]

**Subject:** [Who has this problem]

**Consequence if Unsolved:**
- [Negative impact 1]
- [Negative impact 2]

**Benefit if Solved:**
- [Positive outcome 1]
- [Positive outcome 2]
```

### For Mode 2 (Review)

```markdown
## Normalized Customer Problems

| CP ID | Normalized Statement | Class | Missing Info |
|-------|----------------------|-------|--------------|
| CP-[ID] | [Subject] [Verb] [Object] [Penalty] | [Obligation/Expectation/Hope] | [None or list] |

## Clarification Questions (if any)
- [Question 1]
- [Question 2]
```

---

## Examples

### Example 1: Obligation
```markdown
### CP.01: Regulatory Compliance

**Statement:** The company must submit emission compliance reports within 30 days of each quarter end otherwise faces fines up to 5% of revenue.

**Classification:** Obligation

**Subject:** The company (compliance department)

**Consequence if Unsolved:**
- Financial penalties (5% revenue)
- Regulatory sanctions
- Public reputation damage

**Benefit if Solved:**
- Regulatory compliance maintained
- Avoid financial penalties
- Maintain operating license
```

### Example 2: Expectation
```markdown
### CP.02: Customer Response Time

**Statement:** Customers expect responses to support inquiries within 24 hours otherwise they become dissatisfied and may switch to competitors.

**Classification:** Expectation

**Subject:** Customers (end users)

**Consequence if Unsolved:**
- Customer dissatisfaction
- Increased churn rate
- Negative reviews

**Benefit if Solved:**
- Improved customer satisfaction
- Higher retention rates
- Positive word-of-mouth
```

### Example 3: Hope
```markdown
### CP.03: Sales Forecasting

**Statement:** Management hopes to predict quarterly sales with 85% accuracy otherwise strategic planning remains reactive rather than proactive.

**Classification:** Hope

**Subject:** Management (sales leadership)

**Consequence if Unsolved:**
- Suboptimal resource allocation
- Missed market opportunities
- Reactive decision making

**Benefit if Solved:**
- Better resource planning
- Proactive market positioning
- Improved profitability
```

---

## Quality Criteria

Ensure each CP:
- ✅ Uses the structured notation (Subject + Verb + Object + Penalty)
- ✅ Has a clear classification (Obligation/Expectation/Hope)
- ✅ Identifies the subject who experiences the problem
- ✅ Specifies consequences if unsolved
- ✅ Specifies benefits if solved
- ✅ Is problem-focused, NOT solution-focused
- ✅ Uses natural language (no technical jargon)

---

## Problem Decomposition

### When to Decompose

Decompose a CP into sub-CPs when:

| Trigger | Example |
|---------|---------|
| Multiple distinct facets | CP.01 has communication AND frequency aspects |
| Different subjects affected | CP.01 affects both company AND customers |
| Independent penalties | Failure of one aspect doesn't cause all penalties |
| Separate solutions likely | Each facet could be solved by different FRs |

### Numbering Convention

```
CP.01          → Main problem
CP.01.1        → First sub-problem of CP.01
CP.01.2        → Second sub-problem of CP.01
CP.01.2.1      → Sub-sub-problem (rarely needed)
```

### Decomposition Example

**Before decomposition:**
```
CP.01: The company must ensure effective communication with customers, 
      otherwise it loses customers affecting marketing and sales.
```

**After decomposition:**
```
CP.01: The company must ensure effective communication with customers, 
      otherwise it loses customers affecting marketing and sales.

CP.01.1: The company must ensure it can contact all customers 
        (having valid contact information).

CP.01.2: The company must ensure each customer is contacted regularly 
        (frequency of communication).
```

---

## Anti-Patterns to Avoid

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| "We need a mobile app" | "Field staff cannot access inventory data outside office" |
| "System is slow" | "Report generation takes >5 minutes causing missed deadlines" |
| "Improve UX" | "Users abandon checkout 40% of time due to confusing navigation" |
| "Need better reporting" | "Managers must submit compliance reports within 10 days or face fines" |

---

## Validation Checklist

Before proceeding to Step 2 (Software Glance), verify:

- [ ] All identified problems are documented as CPs
- [ ] Each CP uses structured notation
- [ ] Every CP includes Subject, Verb, Object, Penalty
- [ ] Verb matches correct severity class
- [ ] Classifications assigned to all CPs
- [ ] Consequences and benefits documented
- [ ] Stakeholders agree these represent real business problems
- [ ] No solutions are embedded in problem statements

---

## Handoff to Next Step

When CPs are complete, provide:

```
✅ Step 1 Complete: Customer Problems Specified

Summary:
- [N] Obligations identified
- [N] Expectations identified  
- [N] Hopes identified

Artifacts:
[List CP-IDs with brief titles]

→ Next Step: 2 - Software Glance
→ Action: /problem-based-srs software-glance
→ Input: The CPs documented above
```

---

## References
- Problem-Based SRS Paper (Gorski & Stadzisz)

**Version:** 1.2  
**Step:** 1 of 5  
**Next:** software-glance skill
