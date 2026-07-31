// "Don't grade what you don't teach."
//
// evals/cases/brownfield.case.mjs scores the reverse path (an inherited system ->
// Customer Problems) against `skill: "problems"`, and penalizes brownfield-specific
// failures: proposing a rewrite, blaming the tech stack, phrasing a problem as a
// build instruction. Those penalties existed while reference/problems.md documented
// only two modes — from business context, and reviewing draft CPs — neither of which
// mentions an existing system, let alone the traps. The skill was being scored on
// guidance it did not contain, so a model could only pass by luck.
//
// This guard ties the two corpora together WITHOUT restating either. It reads the
// penalties out of the case file and requires the skill to carry a worked ❌ example
// that each penalty actually catches. Add a fourth trap to the rubric tomorrow and
// this fails until the skill teaches it.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadAction, defaultSkillsRoot, extractSections } from "../lib/skills.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASE_FILE = path.resolve(HERE, "..", "cases", "brownfield.case.mjs");

/**
 * A rubric check is an "absence" check when it passes on empty text: nothing
 * forbidden is present. Pattern/predicate checks fail on empty text because the
 * thing they require is missing. Derived from behavior so the classification
 * cannot drift from a naming convention.
 */
export function absenceChecks(rubric) {
  return (rubric ?? []).filter((c) => {
    try {
      const r = c.run("");
      return (typeof r === "boolean" ? r : r?.pass) === true;
    } catch {
      return false;
    }
  });
}

/**
 * Pull the ❌ / ✅ worked examples out of the sections of a skill whose heading
 * matches `sectionPattern`. Sub-sections are included: the traps live under a
 * nested "Anti-Patterns" heading inside the brownfield mode.
 *
 * Examples appear either as list/prose lines or as cells of a two-column
 * wrong/right table, which is how this skill already writes anti-patterns, so
 * table rows are split on `|` and each cell considered on its own.
 */
export function workedExamples(skillBody, sectionPattern) {
  const sections = extractSections(skillBody);
  const starts = sections
    .map((s, i) => (sectionPattern.test(s.title) ? i : -1))
    .filter((i) => i !== -1);
  if (starts.length === 0) return { bad: [], good: [], found: false };

  // A skill may name the mode twice — once in a summary list, once where it is
  // actually specified. Take every match and its descendants so the examples are
  // found wherever the author put them.
  const scoped = [];
  for (const start of starts) {
    const level = sections[start].level;
    scoped.push(sections[start]);
    for (let i = start + 1; i < sections.length && sections[i].level > level; i++) {
      scoped.push(sections[i]);
    }
  }

  const fragments = scoped
    .flatMap((s) => s.body.split(/\r?\n/))
    .flatMap((line) => (line.includes("|") ? line.split("|") : [line]))
    .map((f) => f.trim())
    .filter(Boolean);

  const collect = (marker) => fragments.filter((f) => f.startsWith(marker));
  return { bad: collect("❌"), good: collect("✅"), found: true };
}

let brownfield;
let skill;
let examples;

before(async () => {
  brownfield = (await import(pathToFileURL(CASE_FILE).href)).default;
  skill = await loadAction(brownfield.skill, { skillsRoot: defaultSkillsRoot() });
  examples = workedExamples(skill.body, /brownfield/i);
});

describe("brownfield eval coverage", () => {
  it("the case grades an action file that documents the brownfield path", () => {
    assert.ok(
      examples.found,
      `cases/brownfield.case.mjs grades "${brownfield.skill}", but ${path.basename(skill.file)} ` +
        "has no brownfield section — the reverse path (existing system -> CPs) is scored but never taught",
    );
  });

  it("the brownfield section carries worked ❌ and ✅ examples", () => {
    assert.ok(examples.bad.length > 0, "the brownfield section must show at least one ❌ example");
    assert.ok(examples.good.length > 0, "the brownfield section must show at least one ✅ example");
  });

  it("every penalty in the rubric is illustrated by a ❌ example in the skill", () => {
    const penalties = absenceChecks(brownfield.rubric);
    assert.ok(penalties.length > 0, "the brownfield rubric must carry absence checks");

    const untaught = penalties.filter(
      (c) => !examples.bad.some((line) => c.run(line).pass === false),
    );
    assert.deepEqual(
      untaught.map((c) => `${c.id} — ${c.description}`),
      [],
      "the brownfield rubric penalizes these, but no ❌ example in the skill demonstrates them",
    );
  });

  it("the skill's ✅ examples would survive its own rubric", () => {
    const penalties = absenceChecks(brownfield.rubric);
    const offending = [];
    for (const line of examples.good) {
      for (const c of penalties) {
        if (c.run(line).pass === false) offending.push(`${c.id}: ${line}`);
      }
    }
    assert.deepEqual(
      offending,
      [],
      "a ✅ example that the eval would penalize teaches the wrong lesson",
    );
  });
});

describe("negative canaries", () => {
  it("absenceChecks separates penalties from requirements", () => {
    const ids = absenceChecks(brownfield.rubric).map((c) => c.id).sort();
    const all = brownfield.rubric.map((c) => c.id);
    assert.ok(ids.length > 0 && ids.length < all.length, "the split must be a real partition");
    for (const id of ids) {
      assert.equal(brownfield.rubric.find((c) => c.id === id).run("").pass, true);
    }
  });

  it("a skill with no brownfield section is reported, not silently passed", () => {
    const blind = workedExamples("## Mode 1: CP Generation\n\ntext\n", /brownfield/i);
    assert.equal(blind.found, false);
    assert.deepEqual(blind.bad, []);
  });

  it("a brownfield section with no ❌ examples fails the coverage check", () => {
    const toothless = workedExamples(
      "## Mode 3: Brownfield\n\nJust prose, no worked examples.\n",
      /brownfield/i,
    );
    assert.equal(toothless.found, true);
    const penalties = absenceChecks(brownfield.rubric);
    const untaught = penalties.filter(
      (c) => !toothless.bad.some((line) => c.run(line).pass === false),
    );
    assert.equal(untaught.length, penalties.length, "prose alone must not satisfy the guard");
  });

  it("workedExamples pulls examples from nested sub-sections and table cells", () => {
    const body = [
      "## Mode 3: Brownfield",
      "intro",
      "### Anti-patterns",
      "| ❌ bad line | ✅ good line |",
      "|---|---|",
      "## Something else",
      "❌ out of scope",
    ].join("\n");
    const got = workedExamples(body, /brownfield/i);
    assert.deepEqual(got.bad, ["❌ bad line"]);
    assert.deepEqual(got.good, ["✅ good line"]);
  });
});
