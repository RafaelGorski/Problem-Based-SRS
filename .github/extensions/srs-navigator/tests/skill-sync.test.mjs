// Unit tests for the skill-sync module: copying the canonical methodology skill
// markdown from this monorepo's skills/problem-based-srs/ into the bundled copies.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidSkillContent, syncSkillsLocal, buildLocalSkillSourcePath } from "../lib/skill-sync.mjs";

const VALID_SKILL = `<!-- Built from SKILL.src.md -->
---
name: business-context
description: A skill
---

# Business Context
Body text long enough to be a real document.`;

describe("isValidSkillContent", () => {
  it("accepts content with YAML front matter", () => {
    assert.equal(isValidSkillContent(VALID_SKILL), true);
  });
  it("rejects empty or short content", () => {
    assert.equal(isValidSkillContent(""), false);
    assert.equal(isValidSkillContent("---\n"), false);
  });
  it("rejects a 404 / HTML body without front matter", () => {
    assert.equal(isValidSkillContent("<!DOCTYPE html><title>404: Not Found</title>"), false);
  });
  it("rejects non-strings", () => {
    assert.equal(isValidSkillContent(null), false);
    assert.equal(isValidSkillContent(undefined), false);
  });
});

describe("buildLocalSkillSourcePath", () => {
  it("maps a reference action file to skills/problem-based-srs/reference/<file>", () => {
    const p = buildLocalSkillSourcePath("business-context.md", "/repo");
    assert.match(p.replace(/\\/g, "/"), /\/repo\/skills\/problem-based-srs\/reference\/business-context\.md$/);
  });
  it("maps the orchestrator to skills/problem-based-srs/SKILL.md", () => {
    const p = buildLocalSkillSourcePath("problem-based-srs.md", "/repo");
    assert.match(p.replace(/\\/g, "/"), /\/repo\/skills\/problem-based-srs\/SKILL\.md$/);
  });
});

describe("syncSkillsLocal", () => {
  it("copies each canonical source into skillsDir", async () => {
    const writes = [];
    const reads = [];
    const result = await syncSkillsLocal({
      files: ["business-context.md", "validate.md"],
      skillsDir: "/skills",
      repoRoot: "/repo",
      readFileImpl: async (path) => { reads.push(path); return VALID_SKILL; },
      writeFileImpl: async (path, content) => { writes.push({ path, content }); },
    });

    assert.deepEqual(result.updated, ["business-context.md", "validate.md"]);
    assert.equal(result.failed.length, 0);
    assert.equal(result.source, "local");
    assert.equal(reads.length, 2);
    assert.equal(writes.length, 2);
    assert.match(reads[0].replace(/\\/g, "/"), /\/repo\/skills\/problem-based-srs\/reference\/business-context\.md$/);
    assert.ok(writes[0].path.includes("business-context.md"));
    assert.equal(writes[0].content, VALID_SKILL);
  });

  it("records a failure when a source file is missing", async () => {
    const writes = [];
    const result = await syncSkillsLocal({
      files: ["missing.md"],
      skillsDir: "/skills",
      repoRoot: "/repo",
      readFileImpl: async () => { throw new Error("ENOENT: no such file"); },
      writeFileImpl: async (p, c) => { writes.push({ p, c }); },
    });
    assert.equal(result.updated.length, 0);
    assert.equal(result.failed.length, 1);
    assert.match(result.failed[0].error, /ENOENT/);
    assert.equal(writes.length, 0);
  });

  it("records a failure when source content is not a valid skill", async () => {
    const writes = [];
    const result = await syncSkillsLocal({
      files: ["bad.md"],
      skillsDir: "/skills",
      repoRoot: "/repo",
      readFileImpl: async () => "<html>not a skill</html>",
      writeFileImpl: async (p, c) => { writes.push({ p, c }); },
    });
    assert.equal(result.updated.length, 0);
    assert.equal(result.failed.length, 1);
    assert.equal(writes.length, 0);
  });
});
