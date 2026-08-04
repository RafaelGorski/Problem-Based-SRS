// Eval case: the functional-requirements skill (Step 5, HOW).
// Given Customer Needs, the skill must produce Functional Requirements in FR
// notation with a full traceability chain FR -> CN -> CP.

import { patternCheck, check } from "../lib/graders.mjs";
import { buildExecutionPrompt } from "./_shared.mjs";

const UPSTREAM_CNS = `# Customer Needs — RelayDesk

- **CN.01.1** (traces to CP.01): Support leadership needs to be warned before a
  high-priority ticket is at risk of breaching the 4-hour first-response SLA.
- **CN.02.1** (traces to CP.02): Agents need a single trustworthy, reusable answer
  for recurring questions so knowledge is not re-derived per ticket.
- **CN.03.1** (traces to CP.03): The organization needs a complete, tamper-evident
  history of every change to a ticket, retained for 7 years.
`;

export default {
  name: "functional-requirements",
  skill: "functional-requirements",
  threshold: 0.75,
  interviewAnswers: [
    "The confirmed Software Vision defines scope boundaries and feature priorities for the RelayDesk support system.",
    "The user explicitly asks for FRs for CN.01.1, CN.02.1, and CN.03.1 at testable detail.",
    "The Business Context confirms technical constraints and the requested shall/must level of detail.",
  ],

  async buildPrompt(skillText) {
    return buildExecutionPrompt({
      skillText,
      input: UPSTREAM_CNS,
      task: "Produce Functional Requirements (FR) with a traceability chain FR -> CN -> CP.",
      interviewAnswers: this.interviewAnswers,
    });
  },

  rubric: [
    patternCheck("fr-ids", "uses canonical dotted FR notation (FR.01.1.1)", /\bFR\.\s?\d/, { min: 3, required: true }),
    patternCheck("cn-traceability", "each FR references a CN", /\bCN\.\s?\d/, { min: 3, required: true }),
    patternCheck("cp-traceability", "traceability reaches back to a CP", /\bCP\.\s?\d/, { min: 1, required: true }),
    patternCheck("shall-language", "uses testable 'shall/must' requirement language", /\b(shall|must)\b/i, { min: 3 }),
    check("addresses-all-needs", "at least one FR per upstream CN", (t) => {
      const c1 = /CN\.\s?0?1\.\d/.test(t);
      const c2 = /CN\.\s?0?2\.\d/.test(t);
      const c3 = /CN\.\s?0?3\.\d/.test(t);
      const n = [c1, c2, c3].filter(Boolean).length;
      return { pass: n === 3, detail: `${n}/3 CNs referenced` };
    }),
  ],

  judgeCriteria: [
    "Each Functional Requirement is specific and testable (uses shall/must).",
    "Every FR traces to a CN, and the chain reaches a CP (FR -> CN -> CP).",
    "All three upstream Customer Needs are covered by at least one FR.",
    "Requirements describe system behavior, not vague aspirations.",
  ],
};
