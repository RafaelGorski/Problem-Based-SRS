// Deterministic guard over the live eval cases.
//
// cases/*.case.mjs only execute when RUN_SKILL_EVALS=1 and the Copilot CLI is
// present, so a malformed case, a missing fixture, or a case pointing at an
// action that no longer exists would sit broken indefinitely without CI noticing.
// These offline checks load every case, validate its shape, and build its prompt
// for real — no model calls.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadAction, defaultSkillsRoot } from "../lib/skills.mjs";
import { gradeRubric } from "../lib/graders.mjs";
import { fixturePath } from "../cases/_shared.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.resolve(HERE, "..", "cases");

// The methodology must be evaluated on both directions of travel. Greenfield
// (brief -> spec) is covered by problems/needs/functional-requirements; the ICP
// works on brownfield systems, so the reverse path (existing system -> spec)
// needs a case too.
const REQUIRED_CASES = ["brownfield", "functional-requirements", "needs", "problems"];

let cases = [];

before(async () => {
  const files = (await readdir(CASES_DIR)).filter((f) => f.endsWith(".case.mjs"));
  cases = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(CASES_DIR, f)).href);
    cases.push({ file: f, def: mod.default });
  }
});

describe("eval case discovery", () => {
  it("every case file exports a usable case", () => {
    assert.ok(cases.length > 0, "no cases/*.case.mjs found");
    for (const { file, def } of cases) {
      assert.ok(def, `${file}: no default export`);
      assert.equal(typeof def.name, "string", `${file}: missing name`);
      assert.equal(typeof def.skill, "string", `${file}: missing skill`);
      assert.equal(typeof def.buildPrompt, "function", `${file}: missing buildPrompt()`);
      assert.ok(Array.isArray(def.rubric) && def.rubric.length > 0, `${file}: empty rubric`);
    }
  });

  it("case names are unique and the file name matches the case name", () => {
    const names = cases.map((c) => c.def.name);
    assert.equal(new Set(names).size, names.length, `duplicate case names: ${names.join(", ")}`);
    for (const { file, def } of cases) {
      assert.equal(file, `${def.name}.case.mjs`, `${file}: file name must match case name`);
    }
  });

  it("covers both the greenfield and brownfield directions", () => {
    const names = cases.map((c) => c.def.name).sort();
    for (const required of REQUIRED_CASES) {
      assert.ok(names.includes(required), `missing eval case "${required}" (have: ${names.join(", ")})`);
    }
  });
});

describe("eval case wiring", () => {
  it("each case points at an action file that exists", async () => {
    const skillsRoot = defaultSkillsRoot();
    for (const { file, def } of cases) {
      const action = await loadAction(def.skill, { skillsRoot });
      assert.ok(action.text.length > 0, `${file}: action "${def.skill}" resolved to empty text`);
    }
  });

  it("each declared fixture exists on disk", async () => {
    for (const { file, def } of cases) {
      if (!def.fixture) continue;
      await assert.doesNotReject(
        access(fixturePath(def.fixture)),
        `${file}: fixture "${def.fixture}" not found`,
      );
    }
  });

  it("each case builds a prompt containing its skill and its fixture", async () => {
    const skillsRoot = defaultSkillsRoot();
    for (const { file, def } of cases) {
      const action = await loadAction(def.skill, { skillsRoot });
      const prompt = await def.buildPrompt(action.text);
      assert.ok(prompt.length > action.text.length, `${file}: prompt did not embed the skill`);
      assert.match(prompt, /SKILL START/, `${file}: prompt is missing the skill delimiters`);
      assert.match(prompt, /INPUT START/, `${file}: prompt is missing the input delimiters`);
    }
  });
});

describe("eval rubrics are runnable", () => {
  it("grading an empty artifact fails every case without throwing", () => {
    for (const { file, def } of cases) {
      const graded = gradeRubric("", def.rubric, { threshold: def.threshold ?? 0.7 });
      assert.equal(graded.passed, false, `${file}: empty output must not pass the rubric`);
      assert.equal(graded.results.length, def.rubric.length, `${file}: not every check ran`);
    }
  });

  it("check ids are unique within a case", () => {
    for (const { file, def } of cases) {
      const ids = def.rubric.map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length, `${file}: duplicate rubric check ids`);
    }
  });

  it("the brownfield rubric rejects a technical-debt answer", () => {
    // Canary for the specific brownfield failure mode: restating the stack and a
    // rewrite as the customer problems. It is well-formed CP notation, so only the
    // brownfield-specific absence checks can catch it.
    const debtAnswer = [
      "### CP.01: PHP monolith with no tests",
      "**Classification:** Obligation",
      "The company must rewrite the PHP monolith because jQuery is obsolete.",
      "### CP.02: Migrate to microservices",
      "**Classification:** Expectation",
      "The team should migrate to microservices and rewrite in React.",
      "### CP.03: Buy Salesforce",
      "**Classification:** Hope",
    ].join("\n");
    const brownfield = cases.find((c) => c.def.name === "brownfield");
    assert.ok(brownfield, "brownfield case missing");
    const graded = gradeRubric(debtAnswer, brownfield.def.rubric, { threshold: brownfield.def.threshold });
    assert.equal(graded.passed, false, "technical-debt answer must not pass the brownfield rubric");
    const failed = graded.results.filter((r) => !r.pass).map((r) => r.id);
    for (const id of ["no-rewrite", "no-stack-complaint"]) {
      assert.ok(failed.includes(id), `expected "${id}" to fail on a technical-debt answer`);
    }
  });
});
