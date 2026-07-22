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
import { README_DRIFT_TRIGGER, VAGRANTFILE_SAMPLE } from "./fixtures.mjs";

const PROBLEMS_ARTIFACT = /\.spec\/.*(customer-problems|problems)/i;

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

    it("problems: interview precedes the CP artifact, which lands in .spec with CP- notation", async () => {
      const workspace = prepareWorkspace({
        files: { "README.md": README_DRIFT_TRIGGER, Vagrantfile: VAGRANTFILE_SAMPLE },
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

        // 4. If it wrote a CP artifact, it must be under .spec/ and use CP- notation.
        if (write >= 0) {
          const spec = readSpecArtifacts(workspace);
          assert.match(
            spec,
            /\bCP-\d+/,
            `CP artifact should use CP-<n> notation (dash, not dot).\n${traceMessage(trace)}`,
          );
          assert.doesNotMatch(
            spec,
            /\bCP\.\d/,
            `CP artifact must not use dotted CP.<n> notation.\n${traceMessage(trace)}`,
          );
        }
      } finally {
        cleanupWorkspace(workspace);
      }
    });
  });
}
