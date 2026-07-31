/**
 * Provider-backed workflow contract tests for Problem-Based SRS.
 *
 * Unlike scenarios.test.mjs (which checks reference loading + that the interview
 * happens), these assert the ATTENDED ORDER and the artifact writes that make
 * the methodology real: the Discovery Interview must precede the artifact, the
 * artifact lands under .spec/, and it carries the expected notation.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  prepareWorkspace,
  cleanupWorkspace,
  runTurn,
  fileLoaded,
  firstQuestion,
  firstWrite,
  traceMessage,
} from "./harness.mjs";
import { detectProvider, getModel, hasKey, resolveModelList, PROVIDERS } from "./providers.mjs";
import { README_DRIFT_TRIGGER, CRM_SCHEMA_SAMPLE } from "./fixtures.mjs";

const PROBLEMS_ARTIFACT = /\.spec\/.*(customer-problems|problems)/i;

// The methodology's canonical notation is DOTTED (CP.01 → CN.01.1 → FR.01.1.1);
// hyphen IDs are accepted-legacy for *reading* old specs only. This contract used
// to assert the exact opposite — requiring `CP-<n>` and rejecting `CP.<n>` — which
// meant an agent obeying the shipped skill would have been marked as failing.
// `tests/notation.test.mjs` carries a deterministic drift assertion so the
// hyphen-only rule cannot silently return while API keys are absent.
const CANONICAL_CP = /\bCP\.\d+/;
const LEGACY_CP = /\bCP-\d+/;

/** Read every .spec/*.md the agent wrote, concatenated. */
function readSpecArtifacts(workspace) {
  const specDir = path.join(workspace, ".spec");
  if (!fs.existsSync(specDir)) return "";
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) out.push(fs.readFileSync(abs, "utf8"));
    }
  };
  walk(specDir);
  return out.join("\n\n");
}

for (const modelId of resolveModelList()) {
  const provider = detectProvider(modelId);
  const keyPresent = hasKey(provider);

  describe(`SRS workflow contract :: ${modelId}`, () => {
    if (!keyPresent) {
      it(`skipped — ${PROVIDERS[provider].envKey} is unset`, { skip: true }, () => {});
      return;
    }
    const model = getModel(modelId);

    it("problems: interview precedes the CP artifact, which lands in .spec with CP. notation", async () => {
      const workspace = prepareWorkspace({
        files: { "README.md": README_DRIFT_TRIGGER, "schema.sql": CRM_SCHEMA_SAMPLE },
      });
      try {
        const { trace } = await runTurn({
          workspace,
          model,
          userPrompt:
            "Autopilot mode — run autonomously. Identify the customer problems for this project, then save them. " +
            "/problem-based-srs problems",
          maxSteps: 16,
        });

        // 1. The step reference must be consulted.
        assert.ok(fileLoaded(trace, "problems.md"), `problems.md not loaded.\n${traceMessage(trace)}`);

        // 2. The interview must happen...
        const question = firstQuestion(trace);
        assert.ok(question >= 0, `Discovery Interview skipped.\n${traceMessage(trace)}`);

        // 3. ...and precede any CP artifact write.
        const write = firstWrite(trace, PROBLEMS_ARTIFACT);
        assert.ok(
          write < 0 || question < write,
          `CP artifact written before the interview.\n${traceMessage(trace)}`,
        );

        // 4. If it wrote a CP artifact, it must be under .spec/ and use the
        //    canonical dotted notation the skill teaches.
        if (write >= 0) {
          const spec = readSpecArtifacts(workspace);
          assert.match(
            spec,
            CANONICAL_CP,
            `CP artifact should use canonical dotted CP.<n> notation.\n${traceMessage(trace)}`,
          );
          assert.doesNotMatch(
            spec,
            LEGACY_CP,
            `CP artifact must not use legacy hyphen CP-<n> notation.\n${traceMessage(trace)}`,
          );
        }
      } finally {
        cleanupWorkspace(workspace);
      }
    });
  });
}
