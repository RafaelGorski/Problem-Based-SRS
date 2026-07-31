/**
 * Fixtures for the Problem-Based SRS skill-behavior harness.
 *
 * These use the repository's canonical **CRM System** use case (the same domain
 * as lib/demo-spec.mjs and .spec/crm-system.json) so the behavioral tests read
 * against a familiar, realistic specification rather than an unrelated example.
 *
 * The README below is the *drift trigger*: it looks complete enough that an
 * over-eager agent (especially in autopilot) rationalizes "the skip conditions
 * are met" and generates Customer Problems WITHOUT running the mandatory
 * Discovery Interview. That is exactly the regression these tests guard.
 *
 * The confirmed Business Context fixture is the legitimate skip basis: a real
 * Step 0 artifact the user has reviewed, which the tightened skip conditions
 * require before the interview may be bypassed.
 */

/** A plausible, "clear-looking" CRM README that tempts an agent to skip the interview. */
export const README_DRIFT_TRIGGER = `# Relate CRM

A Customer Relationship Management system for a mid-size B2B sales organization.

## Pain points
- Sales reps waste time searching for customer information across disconnected systems.
- Reps miss follow-ups and lose opportunities without a way to track interactions.
- Managers have no real-time view of the sales pipeline or performance.
- New leads are entered manually with no standardized qualification or routing.
- There is no shared history of customer conversations across the team.

## Stakeholders
- Sales reps (primary users)
- Sales managers (pipeline owners)
- Marketing (lead sources)
- IT / security (data compliance)

## Goal
One place for customer data, automated follow-ups, and real-time pipeline visibility.
`;

/** A minimal source file so the workspace looks like a real project, not scaffolding. */
export const CRM_SCHEMA_SAMPLE = `-- Relate CRM initial schema
CREATE TABLE contacts (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  company_id INTEGER,
  email      TEXT
);

CREATE TABLE deals (
  id          SERIAL PRIMARY KEY,
  contact_id  INTEGER REFERENCES contacts(id),
  stage       TEXT,
  amount      NUMERIC
);

CREATE TABLE activities (
  id          SERIAL PRIMARY KEY,
  contact_id  INTEGER REFERENCES contacts(id),
  kind        TEXT,          -- call | email | meeting
  occurred_at TIMESTAMPTZ
);
`;

/**
 * A COMPLETE, user-confirmed Step 0 Business Context artifact for the CRM. This
 * is the only legitimate basis on which the `problems` step may skip the
 * interview (per the tightened Skip Conditions in reference/problems.md). Used
 * by the skip-path scenario.
 */
export const CONFIRMED_BUSINESS_CONTEXT = `# Business Context — Relate CRM

> Status: CONFIRMED by the VP of Sales on 2026-07-20.

## Project Identity
A CRM for a mid-size B2B sales organization that unifies customer data, tracks
interactions, and gives managers real-time pipeline visibility.

## Business Principles
- Mandatory: customer data protection (SOC2, encryption at rest and in transit).
- Guiding: a single source of truth over point solutions.
- Aspirational: proactive, automation-assisted selling.

## Stakeholders (influence)
- Sales reps — HIGH (primary users; suffer scattered data and missed follow-ups daily)
- Sales managers — HIGH (own pipeline forecasting and SLAs)
- Marketing — MEDIUM (lead sources and quality)
- IT / security — HIGH (own data-protection compliance)

## Current Situation
Customer information is scattered across disconnected systems; reps miss
follow-ups; managers lack pipeline visibility; leads are entered manually;
there is no shared communication history.

## Pain Points and Severity (confirmed)
- Scattered customer information — EXPECTATION (lost selling time).
- Missed follow-ups and lost opportunities — EXPECTATION (lost revenue).
- Lack of sales pipeline visibility — EXPECTATION (poor forecasting).
- Inefficient lead management — HOPE (efficiency gain).
- Customer data protection / SOC2 compliance — OBLIGATION (legal/contractual, fines).

## Domain Boundaries
In scope: contacts, activities, pipeline, leads, reporting, mobile access.
Out of scope: billing, ERP, and marketing-automation campaign tooling.

## Success Criteria
Reps find any customer record in < 5s; zero missed follow-ups on tracked deals;
managers see live pipeline metrics; customer data meets SOC2.
`;

/** Prior CP artifact (CRM) for downstream steps (needs, requirements). */
export const CUSTOMER_PROBLEMS_ARTIFACT = `# Customer Problems

### CP.01: Scattered Customer Information
**Statement:** Sales reps expect a single place to find customer information
otherwise they waste selling time searching across disconnected systems.
**Classification:** Expectation

### CP.02: Missed Follow-ups and Lost Opportunities
**Statement:** Sales reps expect systematic interaction tracking otherwise they
miss touchpoints and lose opportunities.
**Classification:** Expectation

### CP.03: Lack of Sales Pipeline Visibility
**Statement:** Sales managers expect a real-time view of the pipeline otherwise
forecasting and coaching are guesswork.
**Classification:** Expectation

### CP.04: Customer Data Protection
**Statement:** The company must protect customer data to SOC2 standards
otherwise it faces compliance penalties and lost trust.
**Classification:** Obligation
`;

/** Prior Software Glance artifact (CRM). */
export const SOFTWARE_GLANCE_ARTIFACT = `# Software Glance

\`\`\`mermaid
flowchart LR
  Rep[Sales Rep] -->|uses| CRM[CRM System]
  Manager[Sales Manager] -->|views pipeline| CRM
  Marketing -->|submits leads| CRM
  CRM --> DB[(Customer Database)]
  CRM --> Mail[Email / Calendar]
\`\`\`

Actors: Sales rep, Sales manager, Marketing. External: Email/Calendar provider.
`;

/** Prior Customer Needs artifact (CRM) for the functional-requirements step. */
export const CUSTOMER_NEEDS_ARTIFACT = `# Customer Needs

### CN.01.1: Centralized Customer Database (traces to CP.01)
The rep needs one searchable repository for all customer information.
**Outcome class:** Information

### CN.02.1: Automated Follow-up Management (traces to CP.02)
The system needs to create follow-up tasks and reminders from interactions.
**Outcome class:** Control

### CN.03.1: Visual Sales Pipeline (traces to CP.03)
The manager needs a real-time visual pipeline with stage metrics.
**Outcome class:** Information
`;

/**
 * Deterministic simulated-user answers for CRM Discovery Interview questions.
 * The point of the tests is that the agent ASKS at all (and before writing), so
 * answers only need to be plausible enough to let it proceed.
 */
export function simulatedSrsAnswer(question) {
  const text = String(question?.question ?? "").toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  const firstOption = options.find((o) => typeof o?.label === "string")?.label;
  if (firstOption) return firstOption;

  if (/where.*save|folder|directory|\.spec|artifact location/.test(text)) return "Use .spec/";
  if (/most (urgent|costly|important)|priorit|severity|obligation|expectation|hope/.test(text))
    return "Scattered data and missed follow-ups are the costliest expectations; SOC2 data protection is an obligation.";
  if (/who.*(suffer|affected|experience)|subject|stakeholder/.test(text))
    return "Sales reps suffer scattered data and missed follow-ups daily; managers lack pipeline visibility.";
  if (/consequence|penalty|cost|impact|if nothing|happens if/.test(text))
    return "Reps waste selling time and lose deals; managers can't forecast; non-compliance risks penalties.";
  if (/compliance|legal|regulat|contractual|security|privacy/.test(text))
    return "Customer data must meet SOC2 with encryption at rest and in transit.";
  if (/which (cp|problem|need).*(focus|first|priority)|scope|subset|mvp/.test(text))
    return "Focus on CP.01 (centralized data) and CP.02 (follow-ups) first for the MVP.";
  if (/information|control|construction|entertainment|outcome/.test(text))
    return "Primarily Information and Control outcomes.";
  if (/detail|acceptance criteria|shall|granularity/.test(text))
    return "Full acceptance criteria per requirement.";
  if (/constraint|offline|technology|integrat|platform|mobile/.test(text))
    return "Must integrate with email/calendar and support mobile access with offline capability.";
  if (/confirm|correct|proceed|assume|override|does this/.test(text))
    return "Yes, that's correct — please proceed.";
  return "Use the README and confirmed business context; make the primary problem obvious.";
}
