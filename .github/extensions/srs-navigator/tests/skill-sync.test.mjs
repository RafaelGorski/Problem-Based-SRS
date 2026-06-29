// Unit tests for the skill-sync module: fetching the latest methodology skill
// markdown from the upstream Problem-Based-SRS repo and writing local copies.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSkillSourceUrl, isValidSkillContent, syncSkills, syncSkillsLocal, buildLocalSkillSourcePath, SKILL_SOURCE } from "../lib/skill-sync.mjs";

const VALID_SKILL = `<!-- Built from SKILL.src.md -->
---
name: business-context
description: A skill
---

# Business Context
Body text long enough to be a real document.`;

describe("buildSkillSourceUrl", () => {
  it("maps a local flat file to the upstream skills/<slug>/SKILL.md raw URL", () => {
    const url = buildSkillSourceUrl("business-context.md");
    assert.equal(
      url,
      `https://raw.githubusercontent.com/${SKILL_SOURCE.owner}/${SKILL_SOURCE.repo}/${SKILL_SOURCE.ref}/skills/business-context/SKILL.md`
    );
  });

  it("honors a custom source ref", () => {
    const url = buildSkillSourceUrl("zigzag-validator.md", { owner: "o", repo: "r", ref: "dev" });
    assert.equal(url, "https://raw.githubusercontent.com/o/r/dev/skills/zigzag-validator/SKILL.md");
  });
});

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

describe("syncSkills", () => {
  it("fetches each file and writes the valid content to skillsDir", async () => {
    const writes = [];
    const fetched = [];
    const result = await syncSkills({
      files: ["business-context.md", "zigzag-validator.md"],
      skillsDir: "/skills",
      fetchImpl: async (url) => {
        fetched.push(url);
        return { ok: true, status: 200, text: async () => VALID_SKILL };
      },
      writeFileImpl: async (path, content) => { writes.push({ path, content }); },
    });

    assert.deepEqual(result.updated, ["business-context.md", "zigzag-validator.md"]);
    assert.equal(result.failed.length, 0);
    assert.equal(fetched.length, 2);
    assert.equal(writes.length, 2);
    assert.ok(writes[0].path.includes("business-context.md"));
    assert.equal(writes[0].content, VALID_SKILL);
  });

  it("records a failure and does not write on HTTP error", async () => {
    const writes = [];
    const result = await syncSkills({
      files: ["missing.md"],
      skillsDir: "/skills",
      fetchImpl: async () => ({ ok: false, status: 404, text: async () => "not found" }),
      writeFileImpl: async (p, c) => { writes.push({ p, c }); },
    });
    assert.equal(result.updated.length, 0);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].file, "missing.md");
    assert.match(result.failed[0].error, /404/);
    assert.equal(writes.length, 0);
  });

  it("records a failure when fetched content is not a valid skill", async () => {
    const writes = [];
    const result = await syncSkills({
      files: ["bad.md"],
      skillsDir: "/skills",
      fetchImpl: async () => ({ ok: true, status: 200, text: async () => "<html>404</html>" }),
      writeFileImpl: async (p, c) => { writes.push({ p, c }); },
    });
    assert.equal(result.updated.length, 0);
    assert.equal(result.failed.length, 1);
    assert.equal(writes.length, 0);
  });

  it("isolates a thrown fetch error to a single file and continues", async () => {
    const writes = [];
    const result = await syncSkills({
      files: ["one.md", "two.md"],
      skillsDir: "/skills",
      fetchImpl: async (url) => {
        if (url.includes("one")) throw new Error("network down");
        return { ok: true, status: 200, text: async () => VALID_SKILL };
      },
      writeFileImpl: async (path, content) => { writes.push({ path, content }); },
    });
    assert.deepEqual(result.updated, ["two.md"]);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].file, "one.md");
    assert.match(result.failed[0].error, /network down/);
    assert.equal(writes.length, 1);
  });
});

describe("buildLocalSkillSourcePath", () => {
  it("maps a flat file to skills/<slug>/SKILL.md under the repo root", () => {
    const p = buildLocalSkillSourcePath("business-context.md", "/repo");
    assert.match(p.replace(/\\/g, "/"), /\/repo\/skills\/business-context\/SKILL\.md$/);
  });
});

describe("syncSkillsLocal", () => {
  it("copies each canonical SKILL.md into skillsDir", async () => {
    const writes = [];
    const reads = [];
    const result = await syncSkillsLocal({
      files: ["business-context.md", "zigzag-validator.md"],
      skillsDir: "/skills",
      repoRoot: "/repo",
      readFileImpl: async (path) => { reads.push(path); return VALID_SKILL; },
      writeFileImpl: async (path, content) => { writes.push({ path, content }); },
    });

    assert.deepEqual(result.updated, ["business-context.md", "zigzag-validator.md"]);
    assert.equal(result.failed.length, 0);
    assert.equal(result.source, "local");
    assert.equal(reads.length, 2);
    assert.equal(writes.length, 2);
    assert.match(reads[0].replace(/\\/g, "/"), /\/repo\/skills\/business-context\/SKILL\.md$/);
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
