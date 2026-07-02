// Eval case: the customer-problems skill (Step 1, WHY).
// Given a messy business brief, the skill must extract classified Customer
// Problems in CP notation — and must NOT smuggle in solutions.

import { patternCheck, absenceCheck, check } from "../lib/graders.mjs";
import { buildExecutionPrompt, readFixture } from "./_shared.mjs";

export default {
  name: "problems",
  skill: "problems",
  fixture: "relaydesk-brief.md",
  threshold: 0.75,

  async buildPrompt(skillText) {
    const input = await readFixture(this.fixture);
    return buildExecutionPrompt({
      skillText,
      input,
      task: "Produce the Customer Problems (CP) artifact for this business brief.",
    });
  },

  // Deterministic structural rubric applied to the model output.
  rubric: [
    patternCheck("cp-ids", "uses CP notation (CP-1 / CP.01)", /\bCP[-.]\s?\d+/i, { min: 3, required: true }),
    patternCheck("classification", "classifies as Obligation/Expectation/Hope", /Obligation|Expectation|Hope/, { min: 2, required: true }),
    patternCheck("sla-problem", "captures the SLA-breach problem", /SLA|first[- ]response|breach/i, { min: 1 }),
    patternCheck("knowledge-problem", "captures the tribal-knowledge problem", /knowledge|onboard|ramp|new[- ]hire/i, { min: 1 }),
    patternCheck("audit-problem", "captures the audit/history problem", /audit|history|7[- ]year|reconstruct/i, { min: 1 }),
    absenceCheck("no-chatbot-solution", "does not adopt the 'AI chatbot' solution as a problem", /\b(build|add|implement)\s+(an?\s+)?(AI\s+)?chatbot\b/i),
    absenceCheck("no-mobile-solution", "does not adopt the 'mobile app' solution as a problem", /\b(build|add|implement)\s+(a\s+)?mobile app\b/i),
    check("dashboard-deprioritized", "treats the live dashboard as low priority / nice-to-have", (t) => {
      // Either it is absent, or explicitly marked as a Hope / low priority.
      const mentions = /dashboard/i.test(t);
      if (!mentions) return { pass: true, detail: "not elevated to a problem" };
      return { pass: /Hope|nice[- ]to[- ]have|low priority/i.test(t), detail: "mentioned; check it's a Hope/low-pri" };
    }),
  ],

  judgeCriteria: [
    "Every listed item is a genuine PROBLEM (a negative outcome), not a solution or feature.",
    "Problems are classified by severity (Obligation vs Expectation vs Hope) sensibly.",
    "The SLA-breach, tribal-knowledge, and audit-trail problems are all present.",
    "Solution ideas from the brief (AI chatbot, mobile app) are not restated as problems.",
  ],
};
