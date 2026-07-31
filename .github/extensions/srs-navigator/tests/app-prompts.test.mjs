// Drift guard for the canvas app's agent-facing instructions.
//
// The SRS Navigator must always make the agent RUN the Problem-Based SRS skill
// (`problem_based_srs` / `/problem-based-srs`) — including its mandatory Discovery
// Interview — instead of letting the model perform the methodology on its own.
// The splash-screen "Learn & Create Spec" prompt was observed doing the latter:
// it named the tool but read as "scan the repo and write a spec", so an agent could
// satisfy it without ever invoking the skill or asking the user anything.
//
// These tests fail if any canvas prompt loses the "run the skill", "do not improvise",
// or "Discovery Interview is mandatory" directives, or if the JSON examples the app
// hands to the agent drift away from the canonical dotted notation / real schema.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateSpecificationJSON, validateReferenceIntegrity } from "../lib/validation.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../..");
const extSource = readFileSync(resolve(__dirname, "../extension.mjs"), "utf8").replace(/\r\n/g, "\n");
const liveMd = readFileSync(resolve(repoRoot, "skills/problem-based-srs/reference/live.md"), "utf8").replace(/\r\n/g, "\n");

// Same marker the skill drift guard uses, so the app and the skill can never state
// contradictory things about autopilot waiving the interview.
const AUTOPILOT_MARKER = "Autopilot / non-interactive mode does NOT waive";

// Legacy hyphen IDs must never appear in an example the app gives the agent.
const LEGACY_ID = /\b(CP|CN|FR|NFR)-\d/;

/** Slice the extension source between two anchors so assertions target one prompt. */
function block(startAnchor, endAnchor) {
  const start = extSource.indexOf(startAnchor);
  assert.notEqual(start, -1, `extension.mjs must still contain: ${startAnchor}`);
  const end = extSource.indexOf(endAnchor, start + startAnchor.length);
  assert.notEqual(end, -1, `extension.mjs must still contain: ${endAnchor} after ${startAnchor}`);
  return extSource.slice(start, end);
}

describe("Canvas prompts: LEARN_PROMPT (splash 'Learn & Create Spec')", () => {
  const learn = block("const LEARN_PROMPT = [", '].join("\\n");');

  it("routes through the single /problem-based-srs command", () => {
    assert.ok(
      learn.includes('srsActionCommand("full")'),
      "LEARN_PROMPT must name the /problem-based-srs command via srsActionCommand",
    );
    assert.ok(
      learn.includes("problem_based_srs"),
      "LEARN_PROMPT must name the problem_based_srs tool",
    );
  });

  it("orders the agent to run the skill first and follow it exactly", () => {
    assert.match(
      learn,
      /FIRST and follow the instructions/,
      "LEARN_PROMPT must require calling the skill before producing anything",
    );
  });

  it("forbids improvising the methodology", () => {
    assert.match(
      learn,
      /do NOT improvise/i,
      "LEARN_PROMPT must forbid improvising a specification",
    );
    assert.match(
      learn,
      /do NOT substitute your own requirements process/i,
      "LEARN_PROMPT must forbid substituting the agent's own process for the skill",
    );
  });

  it("requires the mandatory Discovery Interview and blocks the autopilot loophole", () => {
    assert.ok(
      learn.includes("Discovery Interview is mandatory"),
      "LEARN_PROMPT must declare the Discovery Interview mandatory",
    );
    assert.ok(
      learn.includes(AUTOPILOT_MARKER),
      "LEARN_PROMPT must state autopilot does not waive the Discovery Interview",
    );
    assert.match(
      learn,
      /WAIT for the answers before writing any artifact/,
      "LEARN_PROMPT must require waiting for the user's answers",
    );
  });

  it("rejects repository scanning as a substitute for the interview", () => {
    assert.match(
      learn,
      /never\s+replaces the interview/i,
      "LEARN_PROMPT must state that reading the workspace does not replace the interview",
    );
  });

  it("uses canonical dotted IDs in the JSON example", () => {
    for (const id of ["CP.01", "CN.01.1", "FR.01.1.1", "NFR.01"]) {
      assert.ok(learn.includes(id), `LEARN_PROMPT JSON example must use ${id}`);
    }
    assert.ok(
      !LEGACY_ID.test(learn.replace(/never legacy hyphen IDs/, "")),
      "LEARN_PROMPT must not show legacy hyphen IDs as examples",
    );
  });

  it("keeps the real schema keys in the JSON example", () => {
    for (const key of ['"problems"', '"needs"', '"functionalRequirements"', '"nonFunctionalRequirements"', '"problemIds"', '"needIds"', '"title"', '"description"']) {
      assert.ok(learn.includes(key), `LEARN_PROMPT JSON example must include ${key}`);
    }
  });
});

describe("Canvas prompts: LOAD_PROMPT (splash 'Load Specification')", () => {
  const load = block("const LOAD_PROMPT = [", '].join("\\n");');

  it("is load-only — the agent may not author spec content", () => {
    assert.match(
      load,
      /do NOT author, infer, or invent specification content/i,
      "LOAD_PROMPT must forbid inventing specification content",
    );
  });

  it("offers the methodology (with its interview) when no spec exists", () => {
    assert.ok(
      load.includes('srsActionCommand("full")'),
      "LOAD_PROMPT must offer the /problem-based-srs command as the way to create a spec",
    );
    assert.ok(
      load.includes("Discovery Interview"),
      "LOAD_PROMPT must mention the mandatory Discovery Interview",
    );
  });
});

describe("Canvas prompts: node action bar (buildActionPrompt)", () => {
  const build = block("function buildActionPrompt(action) {", "const sendJson =");

  it("runs the methodology action rather than a free-text answer", () => {
    assert.ok(build.includes("follow its methodology exactly"));
    assert.ok(build.includes("Do not improvise a generic answer"));
  });

  it("carries the mandatory Discovery Interview into node actions", () => {
    assert.ok(
      build.includes("**Discovery Interview:**"),
      "buildActionPrompt must remind the agent about the Discovery Interview",
    );
    assert.ok(
      build.includes(AUTOPILOT_MARKER),
      "buildActionPrompt must state autopilot does not waive the interview",
    );
  });

  it("asks for canonical dotted IDs", () => {
    assert.ok(build.includes("CP.01"), "buildActionPrompt must show dotted ID examples");
    assert.ok(!LEGACY_ID.test(build), "buildActionPrompt must not show legacy hyphen IDs");
  });
});

describe("Canvas actions: learn + pending_actions instructions", () => {
  const learnAction = block('name: "learn"', 'name: "compile_spec"');
  const pending = block('name: "pending_actions"', 'name: "learn"');

  it("learn action instructs the agent to run the skill, not reproduce it", () => {
    assert.ok(learnAction.includes('srsActionCommand("full")'));
    assert.match(learnAction, /do not improvise a specification/i);
  });

  it("learn action requires the mandatory Discovery Interview", () => {
    assert.ok(
      learnAction.includes("Discovery Interview is mandatory"),
      "learn action instruction must declare the interview mandatory",
    );
    assert.ok(
      learnAction.includes(AUTOPILOT_MARKER),
      "learn action instruction must close the autopilot loophole",
    );
  });

  it("learn action asks for canonical dotted IDs", () => {
    assert.ok(learnAction.includes("CP.01"));
    assert.ok(!LEGACY_ID.test(learnAction), "learn action must not show legacy hyphen IDs");
  });

  it("pending_actions instruction keeps the interview requirement", () => {
    assert.ok(
      pending.includes("Discovery Interview"),
      "pending_actions must tell the agent to run the interview",
    );
    assert.match(pending, /do not improvise/i);
  });
});

describe("Skill instruction: reference/live.md specification example", () => {
  // The /live skill hands this JSON shape to the agent. It used to document
  // `label` / `problem` / `need` keys that the navigator cannot parse, so an
  // agent following it produced a spec that failed validation.
  const fence = liveMd.match(/```jsonc\n([\s\S]*?)```/);

  it("documents a JSON example", () => {
    assert.ok(fence, "live.md must keep a jsonc specification example");
  });

  const example = JSON.parse(fence[1].replace(/^\s*\/\/.*$/gm, ""));

  it("passes the navigator's own schema validation", () => {
    const result = validateSpecificationJSON(example);
    assert.ok(result.success, `live.md example must validate: ${(result.errors || []).join("; ")}`);
  });

  it("passes reference integrity (links resolve)", () => {
    const result = validateSpecificationJSON(example);
    const integrity = validateReferenceIntegrity(result.data);
    assert.ok(integrity.valid, `live.md example links must resolve: ${(integrity.errors || []).join("; ")}`);
  });

  it("uses traceability arrays, not the old label/problem/need keys", () => {
    assert.deepEqual(example.needs[0].problemIds, ["CP.01"]);
    assert.deepEqual(example.functionalRequirements[0].needIds, ["CN.01.1"]);
    assert.deepEqual(example.nonFunctionalRequirements[0].needIds, ["CN.01.1"]);
    for (const legacyKey of ["label", "problem", "need"]) {
      assert.ok(
        !(legacyKey in example.needs[0]),
        `live.md example must not use the unsupported "${legacyKey}" key`,
      );
    }
  });

  it("uses canonical dotted IDs", () => {
    assert.equal(example.problems[0].id, "CP.01");
    assert.equal(example.needs[0].id, "CN.01.1");
    assert.equal(example.functionalRequirements[0].id, "FR.01.1.1");
    assert.equal(example.nonFunctionalRequirements[0].id, "NFR.01");
  });
});
