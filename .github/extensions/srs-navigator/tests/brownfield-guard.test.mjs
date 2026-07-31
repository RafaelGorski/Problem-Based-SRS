// Cross-surface drift guard: a canvas prompt must not tell the agent to do what
// the methodology it invokes forbids.
//
// Every existing guard checks one surface at a time. `interview-guard.test.mjs`
// asserts the skill markdown; `action-bar.test.mjs` asserts the canvas UI. Nothing
// compared the two, and that gap shipped a contradiction on the primary onboarding
// path: "Learn & Create Spec" sent a prompt saying
//
//     Use the `problem_based_srs` tool to run the full methodology.
//     Scan the workspace for existing code, README, and documentation to provide context.
//
// while reference/problems.md — the first step that prompt runs — states that
// "autonomously inferring context from repo files is precisely what the interview
// exists to prevent". Whichever instruction the agent obeyed, the user lost: either
// the button silently didn't do what docs/docs.html promised, or Customer Problems
// were invented from source code with no human contact.
//
// The rule is written to generalize: any prompt that runs the methodology over
// material scraped from the repository must carry the interview obligation, so the
// next prompt written the same wrong way fails on arrival.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  AGENT_PROMPTS,
  LEARN_PROMPT,
  buildActionPrompt,
  carriesInterviewObligation,
  promptsMissingInterviewObligation,
  readsWorkspace,
  runsMethodology,
} from "../lib/prompts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../..");
const referenceDir = resolve(repoRoot, "skills/problem-based-srs/reference");
const bundledDir = resolve(__dirname, "../skills");
const read = (p) => readFileSync(p, "utf8");

// The action-bar prompts are built per click, so they are exercised for real
// rather than assumed: one methodology action and the implement action, which
// takes the non-methodology branch.
const builtPrompts = [
  {
    id: "action:needs",
    text: buildActionPrompt({
      action: "addCN",
      srsAction: "needs",
      nodeId: "CP.01",
      nodeType: "problem",
      nodeLabel: "Duplicate customer records",
      context: "derive the needs",
    }),
  },
  {
    id: "action:implement",
    text: buildActionPrompt({
      action: "implement",
      srsAction: "functional-requirements",
      nodeId: "FR.01.1.1",
      nodeType: "fr",
      nodeLabel: "Client registration",
      context: "write the code",
    }),
  },
];

const allPrompts = [...AGENT_PROMPTS, ...builtPrompts];

describe("canvas prompts honour the mandatory Discovery Interview", () => {
  it("no prompt runs the methodology over a repo scan without the obligation", () => {
    assert.deepEqual(
      promptsMissingInterviewObligation(allPrompts),
      [],
      "these prompts tell the agent to run the methodology on material scraped from the " +
        "repository, but never say the scan does not waive the Discovery Interview",
    );
  });

  it("the Learn & Create Spec prompt is the one that must carry it", () => {
    // Guards the guard: if LEARN_PROMPT ever stops scanning or stops running the
    // methodology, the check above would pass vacuously.
    assert.ok(runsMethodology(LEARN_PROMPT), "the learn prompt must invoke the methodology");
    assert.ok(readsWorkspace(LEARN_PROMPT), "the learn prompt must read the workspace");
    assert.ok(
      carriesInterviewObligation(LEARN_PROMPT),
      "the learn prompt must name the Discovery Interview and disclaim that the scan waives it",
    );
  });

  it("the obligation the prompt states is the one the skill states", () => {
    const problems = read(resolve(referenceDir, "problems.md"));
    assert.match(
      problems,
      /README, source code, or other repository documentation alone does/i,
      "problems.md must still hold the guardrail the prompt defers to",
    );
    assert.match(
      LEARN_PROMPT,
      /Skip Conditions/,
      "the prompt must point at the skill's Skip Conditions rather than inventing its own rule",
    );
  });

  it("prompts that do not run the methodology are left alone", () => {
    // The implement action reads the repo on purpose — it writes code, not
    // requirements — and Load Specification looks for a file. Neither authors a
    // specification, so neither owes an interview.
    const implement = builtPrompts.find((p) => p.id === "action:implement");
    assert.ok(!runsMethodology(implement.text), "implement must not route through the methodology");
    assert.deepEqual(promptsMissingInterviewObligation([implement]), []);
  });
});

describe("the brownfield path exists in the skill the prompt runs", () => {
  const canonical = read(resolve(referenceDir, "problems.md"));

  it("problems.md documents deriving CPs from a system that already exists", () => {
    assert.match(
      canonical,
      /^#{2,3}\s+.*brownfield/im,
      "problems.md must carry a brownfield mode — the canvas's primary onboarding path runs it",
    );
  });

  it("it states repository evidence is interview input, never a skip basis", () => {
    assert.match(
      canonical,
      /evidence[^.\n]{0,120}\b(does not|never)\b[^.\n]{0,80}\b(waive|replace|substitute|satisfy|skip)\b/i,
      "the brownfield mode must say the harvested evidence does not waive the interview",
    );
  });

  it("the bundled canvas copy carries the same brownfield mode", () => {
    // The canvas ships flat copies for standalone installs. A brownfield mode
    // that exists only canonically would be missing for exactly the users who
    // installed the navigator on its own.
    assert.equal(
      read(resolve(bundledDir, "problems.md")),
      canonical,
      "problems.md is out of sync — run: npm run sync-skills",
    );
  });
});

describe("negative canaries", () => {
  const OFFENDER = [
    "Use the `problem_based_srs` tool to run the full methodology.",
    "Scan the workspace for existing code, README, and documentation to provide context.",
  ].join("\n");

  it("flags the exact prompt this guard was written for", () => {
    assert.deepEqual(promptsMissingInterviewObligation([{ id: "regression", text: OFFENDER }]), [
      "regression",
    ]);
  });

  it("name-dropping the interview is not enough — the waiver must be disclaimed", () => {
    const halfway = `${OFFENDER}\nFollow the Discovery Interview guidance.`;
    assert.ok(runsMethodology(halfway) && readsWorkspace(halfway));
    assert.deepEqual(promptsMissingInterviewObligation([{ id: "halfway", text: halfway }]), [
      "halfway",
    ]);
  });

  it("disclaiming a waiver without naming the interview is not enough either", () => {
    const vague = `${OFFENDER}\nThis does not replace anything.`;
    assert.deepEqual(promptsMissingInterviewObligation([{ id: "vague", text: vague }]), ["vague"]);
  });

  it("a scan with no methodology run is out of scope", () => {
    const scanOnly = "Scan the workspace for a README and summarize it.";
    assert.ok(readsWorkspace(scanOnly) && !runsMethodology(scanOnly));
    assert.deepEqual(promptsMissingInterviewObligation([{ id: "scan-only", text: scanOnly }]), []);
  });

  it("a methodology run with no scan is out of scope", () => {
    const runOnly = "Run the `problem_based_srs` tool with action \"needs\".";
    assert.ok(runsMethodology(runOnly) && !readsWorkspace(runOnly));
    assert.deepEqual(promptsMissingInterviewObligation([{ id: "run-only", text: runOnly }]), []);
  });

  it("the prompt registry is not empty", () => {
    assert.ok(AGENT_PROMPTS.length > 0, "an empty registry would make every check vacuous");
    assert.ok(AGENT_PROMPTS.some((p) => p.id === "learn"));
  });
});
