/**
 * Skill-behavior scenarios — verify the Problem-Based SRS skill runs its
 * mandatory Discovery Interview and loads the right reference file across a
 * controlled matrix of starting states.
 *
 * These are the tests you re-run when you touch the Discovery Interview / Skip
 * Conditions sections of the skill. They fail when the agent stops following
 * the interview contract — the exact drift where an agent skipped the customer
 * interview in autopilot mode after inferring context from a README.
 *
 * Run with:  npm run test:skill-behavior
 * Skips per-provider when its API key is unset (no key => skipped, not failed).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  prepareWorkspace,
  cleanupWorkspace,
  runTurn,
  fileLoaded,
  firstQuestion,
  firstWrite,
  traceMessage,
  summarizeTrace,
} from "./harness.mjs";
import { detectProvider, getModel, hasKey, resolveModelList, PROVIDERS } from "./providers.mjs";
import {
  README_DRIFT_TRIGGER,
  CRM_SCHEMA_SAMPLE,
  CONFIRMED_BUSINESS_CONTEXT,
  CUSTOMER_PROBLEMS_ARTIFACT,
  SOFTWARE_GLANCE_ARTIFACT,
  CUSTOMER_NEEDS_ARTIFACT,
} from "./fixtures.mjs";

const VERBOSE = process.env.SRS_SKILL_BEHAVIOR_VERBOSE === "1";
function logTrace(label, model, trace) {
  if (!VERBOSE) return;
  console.error(`\n[${label}] (${model})\n${JSON.stringify(summarizeTrace(trace), null, 2)}\n`);
}

// Regex matching each step's artifact file, so "asked before writing" is precise.
const PROBLEMS_ARTIFACT = /\.spec\/.*(customer-problems|problems)/i;
const BC_ARTIFACT = /\.spec\/.*(business-context)/i;
const NEEDS_ARTIFACT = /\.spec\/.*(customer-needs|needs)/i;
const FR_ARTIFACT = /\.spec\/.*(FR-|functional)/i;

for (const modelId of resolveModelList()) {
  const provider = detectProvider(modelId);
  const keyPresent = hasKey(provider);

  describe(`SRS skill behavior :: ${modelId}`, () => {
    if (!keyPresent) {
      it(`skipped — ${PROVIDERS[provider].envKey} is unset`, { skip: true }, () => {});
      return;
    }
    const model = getModel(modelId);

    it("scenario 1: autopilot + clear README still runs the interview before writing CPs", async () => {
      const workspace = prepareWorkspace({
        files: { "README.md": README_DRIFT_TRIGGER, "schema.sql": CRM_SCHEMA_SAMPLE },
      });
      try {
        const { trace } = await runTurn({
          workspace,
          model,
          userPrompt:
            "Autopilot mode is active — work autonomously and don't stop unless required. " +
            "/problem-based-srs problems",
          maxSteps: 12,
        });
        logTrace("S1", modelId, trace);
        assert.ok(
          fileLoaded(trace, "problems.md"),
          `agent must load reference/problems.md before generating CPs.\n${traceMessage(trace)}`,
        );
        const question = firstQuestion(trace);
        const write = firstWrite(trace, PROBLEMS_ARTIFACT);
        assert.ok(
          question >= 0,
          `the mandatory Discovery Interview was skipped — ask_user was never called even though ` +
            `no confirmed Business Context exists (a README is not a valid skip basis).\n${traceMessage(trace)}`,
        );
        assert.ok(
          write < 0 || question < write,
          `Customer Problems were written before the interview — autopilot must not bypass it.\n${traceMessage(trace)}`,
        );
      } finally {
        cleanupWorkspace(workspace);
      }
    });

    it("scenario 2: bare problems request (no context) asks before writing", async () => {
      const workspace = prepareWorkspace({
        files: { "README.md": README_DRIFT_TRIGGER },
      });
      try {
        const { trace } = await runTurn({
          workspace,
          model,
          userPrompt: "/problem-based-srs problems",
          maxSteps: 12,
        });
        logTrace("S2", modelId, trace);
        assert.ok(fileLoaded(trace, "problems.md"), `problems.md not loaded.\n${traceMessage(trace)}`);
        assert.ok(firstQuestion(trace) >= 0, `interview skipped with no confirmed context.\n${traceMessage(trace)}`);
      } finally {
        cleanupWorkspace(workspace);
      }
    });

    it("scenario 3: business-context step asks before writing 00-business-context", async () => {
      const workspace = prepareWorkspace({
        files: { "README.md": README_DRIFT_TRIGGER },
      });
      try {
        const { trace } = await runTurn({
          workspace,
          model,
          userPrompt: "/problem-based-srs business-context",
          maxSteps: 12,
        });
        logTrace("S3", modelId, trace);
        assert.ok(fileLoaded(trace, "business-context.md"), `business-context.md not loaded.\n${traceMessage(trace)}`);
        const question = firstQuestion(trace);
        const write = firstWrite(trace, BC_ARTIFACT);
        assert.ok(question >= 0, `interview skipped for business-context.\n${traceMessage(trace)}`);
        assert.ok(write < 0 || question < write, `wrote BC before asking.\n${traceMessage(trace)}`);
      } finally {
        cleanupWorkspace(workspace);
      }
    });

    it("scenario 4: SKIP PATH — confirmed Business Context + explicit prompt may proceed without interview", async () => {
      const workspace = prepareWorkspace({
        files: {
          "README.md": README_DRIFT_TRIGGER,
          ".spec/00-business-context.md": CONFIRMED_BUSINESS_CONTEXT,
        },
      });
      try {
        const { trace } = await runTurn({
          workspace,
          model,
          userPrompt:
            "The confirmed Business Context in .spec/00-business-context.md lists the problems and their " +
            "severity (setup + Oracle OCI licensing are Obligations; bot readiness and version drift are " +
            "Expectations). Generate the Customer Problems from it. /problem-based-srs problems",
          maxSteps: 12,
        });
        logTrace("S4", modelId, trace);
        // The skip path is legitimate here, so we do NOT require ask_user.
        // We DO require the agent to load the step reference and produce the artifact.
        assert.ok(fileLoaded(trace, "problems.md"), `problems.md not loaded.\n${traceMessage(trace)}`);
        assert.ok(
          firstWrite(trace, PROBLEMS_ARTIFACT) >= 0,
          `skip path should still produce the CP artifact.\n${traceMessage(trace)}`,
        );
      } finally {
        cleanupWorkspace(workspace);
      }
    });

    it("scenario 5: needs step asks before writing customer needs", async () => {
      const workspace = prepareWorkspace({
        files: {
          "README.md": README_DRIFT_TRIGGER,
          ".spec/01-customer-problems.md": CUSTOMER_PROBLEMS_ARTIFACT,
          ".spec/02-software-glance.md": SOFTWARE_GLANCE_ARTIFACT,
        },
      });
      try {
        const { trace } = await runTurn({
          workspace,
          model,
          userPrompt: "Autopilot is on. /problem-based-srs needs",
          maxSteps: 12,
        });
        logTrace("S5", modelId, trace);
        assert.ok(fileLoaded(trace, "needs.md"), `needs.md not loaded.\n${traceMessage(trace)}`);
        const question = firstQuestion(trace);
        const write = firstWrite(trace, NEEDS_ARTIFACT);
        assert.ok(question >= 0, `interview skipped for needs.\n${traceMessage(trace)}`);
        assert.ok(write < 0 || question < write, `wrote needs before asking.\n${traceMessage(trace)}`);
      } finally {
        cleanupWorkspace(workspace);
      }
    });

    it("scenario 6: functional-requirements step asks before writing FRs", async () => {
      const workspace = prepareWorkspace({
        files: {
          ".spec/01-customer-problems.md": CUSTOMER_PROBLEMS_ARTIFACT,
          ".spec/03-customer-needs.md": CUSTOMER_NEEDS_ARTIFACT,
        },
      });
      try {
        const { trace } = await runTurn({
          workspace,
          model,
          userPrompt: "Autopilot is on. /problem-based-srs functional-requirements",
          maxSteps: 12,
        });
        logTrace("S6", modelId, trace);
        assert.ok(
          fileLoaded(trace, "functional-requirements.md"),
          `functional-requirements.md not loaded.\n${traceMessage(trace)}`,
        );
        const question = firstQuestion(trace);
        const write = firstWrite(trace, FR_ARTIFACT);
        assert.ok(question >= 0, `interview skipped for functional-requirements.\n${traceMessage(trace)}`);
        assert.ok(write < 0 || question < write, `wrote FRs before asking.\n${traceMessage(trace)}`);
      } finally {
        cleanupWorkspace(workspace);
      }
    });
  });
}
