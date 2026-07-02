// Unit tests for the skills loader/parser and the graders. Deterministic.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrontmatter,
  extractSections,
  hasSection,
  countLines,
  parseSkill,
  extractRelativeLinks,
  listSkillSlugs,
  loadSkill,
} from "../lib/skills.mjs";
import {
  countMatches,
  includesPattern,
  patternCheck,
  absenceCheck,
  check,
  gradeRubric,
  buildJudgePrompt,
  parseJudgeVerdict,
  llmJudge,
} from "../lib/graders.mjs";

const SKILL = `<!-- Built from SKILL.src.md -->
---
name: customer-problems
description: Identify and document Customer Problems (CP) from business context.
license: MIT
metadata:
  version: "1.0"
---

# Customer Problems

Intro paragraph.

## Notation

Use CP-1, CP-2 format.

## Handoff to Next Step

→ Action: /problem-based-srs software-glance
See [Software Glance](../software-glance/SKILL.md) and [ext](https://x.com).
`;

describe("parseFrontmatter", () => {
  it("parses top-level keys, ignoring the sync banner and nested keys", () => {
    const { frontmatter, body } = parseFrontmatter(SKILL);
    assert.equal(frontmatter.name, "customer-problems");
    assert.equal(frontmatter.license, "MIT");
    assert.ok(frontmatter.description.startsWith("Identify"));
    assert.equal(frontmatter.version, undefined); // nested under metadata
    assert.ok(body.startsWith("# Customer Problems"));
  });
  it("returns empty frontmatter when there is no fence", () => {
    const { frontmatter, body } = parseFrontmatter("# Just a doc\ntext");
    assert.deepEqual(frontmatter, {});
    assert.ok(body.includes("Just a doc"));
  });
});

describe("extractSections / hasSection", () => {
  it("splits headings into sections", () => {
    const { body } = parseFrontmatter(SKILL);
    const sections = extractSections(body);
    const titles = sections.map((s) => s.title);
    assert.ok(titles.includes("Customer Problems"));
    assert.ok(titles.includes("Notation"));
    assert.ok(titles.includes("Handoff to Next Step"));
  });
  it("hasSection matches by substring and RegExp", () => {
    const { body } = parseFrontmatter(SKILL);
    assert.equal(hasSection(body, "handoff"), true);
    assert.equal(hasSection(body, /^Notation$/), true);
    assert.equal(hasSection(body, "nonexistent"), false);
  });
});

describe("countLines", () => {
  it("counts lines and handles empty", () => {
    assert.equal(countLines("a\nb\nc"), 3);
    assert.equal(countLines(""), 0);
  });
});

describe("extractRelativeLinks", () => {
  it("returns only relative markdown links, stripping anchors and URLs", () => {
    const links = extractRelativeLinks(SKILL).map((l) => l.target);
    assert.ok(links.includes("../software-glance/SKILL.md"));
    assert.ok(!links.some((t) => t.startsWith("http")));
  });
});

describe("parseSkill", () => {
  it("returns frontmatter, body and sections together", () => {
    const parsed = parseSkill(SKILL);
    assert.equal(parsed.frontmatter.name, "customer-problems");
    assert.ok(parsed.sections.length >= 3);
  });
});

describe("listSkillSlugs / loadSkill (injected fs)", () => {
  it("lists only directories, sorted", async () => {
    const readdirImpl = async () => ([
      { name: "customer-needs", isDirectory: () => true },
      { name: "business-context", isDirectory: () => true },
      { name: "README.md", isDirectory: () => false },
    ]);
    assert.deepEqual(await listSkillSlugs("/skills", { readdirImpl }), ["business-context", "customer-needs"]);
  });
  it("loads and parses a skill from an injected reader", async () => {
    const readFileImpl = async () => SKILL;
    const skill = await loadSkill("customer-problems", { skillsRoot: "/skills", readFileImpl });
    assert.equal(skill.slug, "customer-problems");
    assert.equal(skill.frontmatter.name, "customer-problems");
    assert.match(skill.file.replace(/\\/g, "/"), /\/skills\/customer-problems\/SKILL\.md$/);
  });
});

describe("countMatches / includesPattern", () => {
  it("counts pattern occurrences (string auto-global)", () => {
    assert.equal(countMatches("CP-1 CP-2 CP-3", /CP-\d+/), 3);
    assert.equal(countMatches("a a a", "a"), 3);
  });
  it("includesPattern works for string and regex", () => {
    assert.equal(includesPattern("Hello World", "world"), true);
    assert.equal(includesPattern("Hello", /^H/), true);
    assert.equal(includesPattern("Hello", "zzz"), false);
  });
});

describe("gradeRubric", () => {
  const rubric = [
    patternCheck("has-cp", "mentions CP ids", /CP-\d+/, { min: 2, required: true }),
    absenceCheck("no-solution", "no solution language", /\buse React\b/i, { weight: 1 }),
    check("long-enough", "at least 20 chars", (t) => t.length >= 20, { weight: 2 }),
  ];

  it("scores a passing artifact", () => {
    const g = gradeRubric("Problem statements CP-1 and CP-2 with plenty of detail here.", rubric, { threshold: 0.7 });
    assert.equal(g.passed, true);
    assert.equal(g.requiredFailures.length, 0);
    assert.equal(g.maxScore, 4);
    assert.equal(g.score, 4);
    assert.equal(g.ratio, 1);
  });

  it("fails when a required check fails", () => {
    const g = gradeRubric("only CP-1 mentioned, and quite long text here too", rubric, { threshold: 0.5 });
    assert.equal(g.passed, false); // required has-cp needs >= 2
    assert.equal(g.requiredFailures[0].id, "has-cp");
  });

  it("fails when below threshold even with no required failures", () => {
    const soft = [
      patternCheck("a", "a", /A/, { weight: 1 }),
      patternCheck("b", "b", /B/, { weight: 1 }),
      patternCheck("c", "c", /C/, { weight: 1 }),
    ];
    const g = gradeRubric("only A here", soft, { threshold: 0.7 });
    assert.equal(g.ratio, 1 / 3);
    assert.equal(g.passed, false);
  });

  it("captures errors thrown by a check as a failure", () => {
    const g = gradeRubric("x", [check("boom", "throws", () => { throw new Error("nope"); })]);
    assert.equal(g.results[0].pass, false);
    assert.match(g.results[0].detail, /error: nope/);
  });
});

describe("llm judge", () => {
  it("buildJudgePrompt lists criteria and includes the artifact", () => {
    const p = buildJudgePrompt("ARTIFACT_BODY", ["c1", "c2"]);
    assert.ok(p.includes("1. c1"));
    assert.ok(p.includes("2. c2"));
    assert.ok(p.includes("ARTIFACT_BODY"));
    assert.ok(p.includes('"score"'));
  });

  it("parseJudgeVerdict reads JSON, fractions, and bare numbers", () => {
    assert.equal(parseJudgeVerdict('{"score":0.9,"reasoning":"good"}').score, 0.9);
    assert.equal(parseJudgeVerdict("verdict: 3/4 criteria met").score, 0.75);
    assert.equal(parseJudgeVerdict("0.5").score, 0.5);
    assert.equal(parseJudgeVerdict("no verdict here").score, 0);
    assert.equal(parseJudgeVerdict('{"score":5}').score, 1); // clamped
  });

  it("llmJudge delegates to injected invoke and applies threshold", async () => {
    const invoke = async () => ({ text: '{"score":0.8,"reasoning":"solid"}' });
    const res = await llmJudge("artifact", { criteria: ["c1"], invoke, threshold: 0.7 });
    assert.equal(res.score, 0.8);
    assert.equal(res.passed, true);

    const invokeLow = async () => "score 0.4";
    const res2 = await llmJudge("artifact", { criteria: ["c1"], invoke: invokeLow, threshold: 0.7 });
    assert.equal(res2.passed, false);
  });
});
