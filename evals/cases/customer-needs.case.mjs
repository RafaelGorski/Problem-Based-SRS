// Eval case: the customer-needs skill (Step 3, WHAT).
// Given Customer Problems, the skill must produce Customer Needs in CN notation,
// each tracing back to a CP, expressed as outcomes (not implementations).

import { patternCheck, check } from "../lib/graders.mjs";
import { buildExecutionPrompt } from "./_shared.mjs";

// A compact, well-formed CP artifact used as upstream input so this case does
// not depend on the output of the customer-problems case.
const UPSTREAM_CPS = `# Customer Problems — RelayDesk

- **CP-1 (Obligation):** High-priority tickets breach the contractual 4-hour
  first-response SLA ~15% of the time, causing service-credit payouts (~$180k last
  quarter). There is no early warning before a breach.
- **CP-2 (Expectation):** The same customer questions are answered repeatedly from
  scratch; there is no shared trustworthy answer, so new hires take 6 weeks to ramp.
- **CP-3 (Obligation):** Ticket edits overwrite each other; the company cannot
  reconstruct who changed what, violating a 7-year auditable-history requirement.
`;

export default {
  name: "customer-needs",
  skill: "customer-needs",
  threshold: 0.75,

  async buildPrompt(skillText) {
    return buildExecutionPrompt({
      skillText,
      input: UPSTREAM_CPS,
      task: "Produce the Customer Needs (CN) artifact, tracing each CN to a CP.",
    });
  },

  rubric: [
    patternCheck("cn-ids", "uses CN notation (CN-1 / CN.1.1)", /\bCN[-.]\s?\d/i, { min: 3, required: true }),
    patternCheck("cp-traceability", "each need references a CP", /\bCP[-.]\s?\d/i, { min: 3, required: true }),
    patternCheck("sla-need", "need addressing early SLA warning", /warn|alert|before.*breach|at[- ]risk/i, { min: 1 }),
    patternCheck("knowledge-need", "need addressing shared knowledge", /knowledge|reuse|shared answer|canonical/i, { min: 1 }),
    patternCheck("audit-need", "need addressing auditable history", /audit|history|immutable|trail/i, { min: 1 }),
    check("outcome-not-implementation", "needs are outcomes, not tech choices", (t) => {
      // Penalize obvious implementation nouns appearing as the need itself.
      const techLeak = /\b(React|Postgres|Kafka|microservice|REST API|Redis)\b/i.test(t);
      return { pass: !techLeak, detail: techLeak ? "contains implementation tech" : "outcome-focused" };
    }),
  ],

  judgeCriteria: [
    "Each Customer Need describes WHAT outcome is required, not HOW to build it.",
    "Every CN explicitly traces to at least one CP (e.g. CN-1 -> CP-1).",
    "The needs cover SLA early-warning, knowledge reuse, and auditable history.",
    "No CN is actually a solution/technology choice in disguise.",
  ],
};
