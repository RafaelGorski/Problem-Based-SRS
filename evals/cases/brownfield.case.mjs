// Eval case: the reverse (brownfield) path — deriving a specification from an
// inherited system rather than from a stakeholder brief.
//
// This is the ICP's actual situation: an engineer owns nine years of undocumented
// CRM code and needs to know WHY it should change. The failure mode is specific to
// brownfield work and different from the greenfield `problems` case: the model
// restates TECHNICAL DEBT as the problem ("it's a PHP monolith", "migrate to
// microservices", "rewrite in React") instead of the business consequence the debt
// produces. The fixture plants that bait in the CTO quote and the code TODOs.

import { patternCheck, absenceCheck, check } from "../lib/graders.mjs";
import { buildExecutionPrompt, readFixture } from "./_shared.mjs";

export default {
  name: "brownfield",
  skill: "problems",
  fixture: "northwind-crm-brownfield.md",
  threshold: 0.75,
  interviewAnswers: [
    "The completed Step 0 Business Context for the inherited Northwind CRM was reviewed and confirmed by the user.",
    "The user confirms the scope is the existing CRM's customer-record, lead, forecast, and audit outcomes.",
    "Sales representatives, sales managers, marketing, customers, and compliance are the affected stakeholders; the business consequences in the fixture are confirmed.",
    "The user confirms that the artifact must state only customer/business consequences and must not repeat technical-debt terms or propose a rewrite.",
  ],

  async buildPrompt(skillText) {
    const input = await readFixture(this.fixture);
    return buildExecutionPrompt({
      skillText,
      input,
      task:
        "This system already exists and has no specification. Produce the Customer Problems (CP) " +
        "artifact that explains why it must change, derived from the evidence in the digest.",
      interviewAnswers: this.interviewAnswers,
    });
  },

  rubric: [
    // Canonical notation is dotted (see "Identifier Notation" in SKILL.md).
    patternCheck("cp-dotted-ids", "uses canonical dotted CP notation (CP.01)", /\bCP\.\s?\d+/, { min: 3, required: true }),
    patternCheck("classification", "classifies as Obligation/Expectation/Hope", /Obligation|Expectation|Hope/, { min: 2, required: true }),

    // Business consequences that are genuinely evidenced in the digest.
    patternCheck("duplicate-records", "captures the duplicate/conflicting customer record problem", /duplicat|41,?800|26,?000|conflicting record|same customer.*(twice|multiple)/i, { min: 1 }),
    patternCheck("lost-history", "captures the missing interaction/communication history problem", /history|previous conversation|what (was|were) promised|context from colleagues?|hand[- ]?over/i, { min: 1 }),
    patternCheck("dropped-leads", "captures the dropped/untracked lead problem", /lead/i, { min: 1 }),
    patternCheck("forecast-blind", "captures the unreliable pipeline/forecast problem", /forecast|pipeline|stale|spreadsheet/i, { min: 1 }),
    patternCheck("audit-gap", "captures the audit/traceability obligation", /audit|every change|reconstruct|record of change/i, { min: 1 }),

    // Penalties make a CP a CP: quantified business cost, not a code smell.
    patternCheck("quantified-penalty", "quantifies at least one consequence from the evidence", /\b(22\s?%|1 in 5|6 hours|four hours|two enterprise|60\s?%|renewal)/i, { min: 1 }),

    // The brownfield trap: technical debt restated as the customer problem.
    absenceCheck("no-rewrite", "does not propose a rewrite/replatform as a problem", /\b(rewrite|re-?platform|migrate to microservices|move to microservices)\b/i, { required: true }),
    absenceCheck("no-stack-complaint", "does not treat the tech stack itself as the problem", /\b(PHP monolith|jQuery|React|Salesforce)\b/i, { required: true }),
    absenceCheck("no-solution-verbs", "does not state problems as build/implement instructions", /\b(build|implement|introduce)\s+(an?\s+)?(new\s+)?(CRM|system|database|microservice)/i),

    check("subject-present", "each problem names who suffers it", (t) => {
      const subjects = /sales rep|sales manager|account manager|marketing|compliance|the company|the business|customers?/gi;
      const n = (t.match(subjects) || []).length;
      return { pass: n >= 3, detail: `found ${n} subject mentions (need >= 3)` };
    }),
  ],

  judgeCriteria: [
    "Every listed item is a business PROBLEM with a consequence, not a code smell, refactor, or technology choice.",
    "Problems are derived from evidence in the digest (tickets, schema facts, metrics) rather than invented.",
    "The technical-debt bait — the CTO's 'PHP monolith with no tests', the microservices/React TODOs, and 'just buy Salesforce' — is not restated as a customer problem.",
    "Each problem identifies who suffers it and what it costs the business if it persists.",
    "Problems are classified by severity, and the compliance/audit item is treated as an Obligation.",
  ],
};
