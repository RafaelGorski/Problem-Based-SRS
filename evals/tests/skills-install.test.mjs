// A skill that installs is not the same as a skill that works once installed. #69 checked
// its "follow the README install path for the skills" box on this evidence:
//
//   npx skills add … → Found 1 skill → installed 12 files. Works, non-interactively.
//
// That is presence, and this issue has been burned by presence-not-function once already:
// #73's whole subject was that "the archive contains extension.mjs" is not "the extension
// loads with no node_modules". Twelve files landing is the same claim about the skills.
//
// `npx skills add RafaelGorski/Problem-Based-SRS --skill problem-based-srs` copies
// skills/problem-based-srs/** into <cwd>/.agents/skills/problem-based-srs/ and NOTHING
// else from the repository. That is the whole contract of a standalone install, and it is
// the thing no suite held the skill to: skills-static.test.mjs resolves every relative link
// from the file's location *in the checkout*, where `../../../docs/` exists. It is green
// today and would stay green while the installed copy points into a directory the user
// does not have — the same "exercises the branch an installer never takes" hole #73 found
// in the canvas skill fallback.
//
// So this suite stages exactly what the CLI copies into a temp directory outside the
// monorepo and asserts against that tree. The staged file set is derived by walking the
// source directory rather than hard-coded, so a new reference file is covered the moment
// it is added. Offline: no npx, no network, no clone.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const skillSource = path.join(repoRoot, "skills", "problem-based-srs");

// Where `npx skills add` puts a copied skill, verified against a clean-directory run.
const INSTALL_PREFIX = path.join(".agents", "skills");
const SKILL_SLUG = "problem-based-srs";

// Paths that exist only in this repository's checkout. A skill shipped to arbitrary
// machines may still name them — telling a reader where the canvas extension lives is
// useful — but it must also hand over the public URL, or the instruction is unusable by
// the only people who read it.
const REPO_ONLY_PATHS = [".github/extensions/srs-navigator", ".spec/crm-system.json"];
const PROJECT_URL = "https://github.com/RafaelGorski/Problem-Based-SRS";
const hasProjectUrl = (text) => /https:\/\/github\.com\/RafaelGorski\/Problem-Based-SRS(?:[/?#)\s]|$)/.test(text);

// A stand-in Identifier Notation table for the parser canaries at the bottom of this
// file. It deliberately is not the real one: these tests prove the parser reads whatever
// table it is handed, so the rules themselves can only ever live in SKILL.md.
const NOTATION_TABLE = [
  "| Customer Problem | `CP.{n}` | `CP.01` |",
  "| Sub-problem | `CP.{n}.{m}` | `CP.01.1` |",
  "| Sub-sub-problem | `CP.{n}.{m}.{k}` | `CP.01.2.1` |",
  "| Customer Need | `CN.{cp}.{n}` | `CN.01.1` |",
  "| Functional Requirement | `FR.{cp}.{cn}.{n}` | `FR.01.1.1` |",
  "| Non-Functional Requirement | `NFR.{n}` | `NFR.01` |",
].join("\n");

/* ------------------------------------------------------------------ helpers */

/** Every file in a tree, as forward-slash paths relative to it. */
export function walkFiles(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory()
        ? walkFiles(full, base)
        : [path.relative(base, full).replaceAll("\\", "/")];
    })
    .sort();
}

/** Copy a directory tree, the way the installer copies a skill. */
export function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

/**
 * Relative markdown link targets: `[text](target)`, dropping anchors, absolute URLs and
 * bare fragments. These are the links whose meaning changes when the file is copied
 * somewhere else, which is the whole subject of this suite.
 */
export function relativeLinks(md) {
  return [...md.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)]
    .map((m) => m[1].split("#")[0])
    .filter((t) => t && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(t));
}

/**
 * Arity of each artifact ID, parsed out of SKILL.md's Identifier Notation table rather
 * than restated here: `| Customer Need | `CN.{cp}.{n}` | … |` yields CN -> 2. Reading the
 * table at runtime keeps the table and the examples bound together — a test that
 * hard-codes what the docs hard-code is a second copy of the docs.
 *
 * A prefix may legitimately appear on more than one row (CP is both `CP.{n}` and the
 * sub-problem `CP.{n}.{m}`), so every declared arity is kept.
 */
export function notationArities(skillMd) {
  const arities = new Map();
  for (const m of skillMd.matchAll(/^\|[^|]*\|\s*`((?:CP|CN|FR|NFR))((?:\.\{[a-z]+\})+)`\s*\|/gm)) {
    const [, prefix, levels] = m;
    const arity = (levels.match(/\{/g) || []).length;
    if (!arities.has(prefix)) arities.set(prefix, new Set());
    arities.get(prefix).add(arity);
  }
  return arities;
}

/** Every dotted artifact ID in a chunk of text, with its arity. */
export function dottedIds(text) {
  return [...text.matchAll(/\b(NFR|CP|CN|FR)((?:\.\d+)+)\b/g)].map((m) => ({
    id: m[0],
    prefix: m[1],
    arity: m[2].split(".").length - 1,
  }));
}

/**
 * IDs whose depth contradicts every arity SKILL.md declares for their prefix, reported
 * with the 1-based line they sit on. A prefix the table says nothing about is left
 * alone: this check enforces the table, it does not invent rules the table never made.
 */
export function arityOffenders(md, arities) {
  const offenders = [];
  md.split(/\r?\n/).forEach((line, i) => {
    for (const { id, prefix, arity } of dottedIds(line)) {
      const allowed = arities.get(prefix);
      if (allowed && !allowed.has(arity)) {
        offenders.push({ id, line: i + 1, allowed: [...allowed].sort() });
      }
    }
  });
  return offenders;
}

/** Actions the orchestrator routes to a reference file, from its dispatch table. */
export function dispatchTable(skillMd) {
  return [...skillMd.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*\[`(reference\/[a-z-]+\.md)`\]/gm)].map(
    (m) => ({ action: m[1], file: m[2] }),
  );
}

/* -------------------------------------------------------------------- suite */

// Staged eagerly: every describe below reads the same install, and a hook inside one
// describe would not run for the others.
const installRoot = fs.mkdtempSync(path.join(os.tmpdir(), "srs-skills-install-"));
const skillRoot = path.join(installRoot, INSTALL_PREFIX, SKILL_SLUG);
copyTree(skillSource, skillRoot);
const staged = walkFiles(skillRoot);
const read = (rel) => fs.readFileSync(path.join(skillRoot, rel), "utf8");

after(() => {
  fs.rmSync(installRoot, { recursive: true, force: true });
});

describe("skills install (staged the way `npx skills add` stages it)", () => {
  it("stages outside the monorepo, so repo-relative paths cannot accidentally resolve", () => {
    const inside = !path.relative(repoRoot, installRoot).startsWith("..");
    assert.ok(
      !inside,
      `staging directory ${installRoot} is inside the checkout; every escaping link would ` +
        "resolve against the repo and this suite would prove nothing",
    );
    for (const leaked of ["docs", ".spec", "evals", "scripts", ".github"]) {
      assert.ok(
        !fs.existsSync(path.join(installRoot, leaked)),
        `${leaked}/ must not exist next to the install — the CLI copies the skill directory ` +
          "and nothing else, and this suite must reproduce that",
      );
    }
  });

  it("copies the whole skill directory, deriving the file set from the source", () => {
    assert.deepEqual(
      staged,
      walkFiles(skillSource),
      "the staged tree must match skills/problem-based-srs/ exactly; a hard-coded list would " +
        "stop covering the next reference file someone adds",
    );
    assert.ok(staged.includes("SKILL.md"), "SKILL.md must be installed");
  });

  it("keeps frontmatter that names the directory it was installed into", () => {
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(read("SKILL.md"));
    assert.ok(frontmatter, "SKILL.md must keep YAML frontmatter through the copy");
    const name = /^name:\s*(\S+)/m.exec(frontmatter[1]);
    assert.ok(name, "frontmatter must declare a name");
    assert.equal(
      name[1],
      path.basename(skillRoot),
      "the declared name must match the installed directory or the agent cannot resolve the skill",
    );
  });

  it("routes every advertised action to a file that is actually installed", () => {
    const routes = dispatchTable(read("SKILL.md"));
    assert.ok(routes.length >= 9, `expected the dispatch table to list the actions, got ${routes.length}`);
    for (const { action, file } of routes) {
      assert.ok(
        staged.includes(file),
        `/problem-based-srs ${action} routes to ${file}, which is not in the install`,
      );
    }
  });
});

describe("the installed skill is self-contained", () => {
  it("every relative link resolves inside the installed skill", () => {
    const escaping = [];
    const missing = [];
    for (const rel of staged.filter((f) => f.endsWith(".md"))) {
      const dir = path.dirname(path.join(skillRoot, rel));
      for (const target of relativeLinks(read(rel))) {
        const resolved = path.resolve(dir, target);
        const outside = path.relative(skillRoot, resolved).startsWith("..");
        if (outside) escaping.push(`${rel} -> ${target}`);
        else if (!fs.existsSync(resolved)) missing.push(`${rel} -> ${target}`);
      }
    }
    assert.deepEqual(
      escaping,
      [],
      "these links point outside the installed skill, so they resolve into the user's own " +
        "project and find nothing. Cite external material by absolute URL — the way every " +
        "RFC 2119 reference in this skill already does",
    );
    assert.deepEqual(missing, [], "these links point at files the install does not carry");
  });

  it("names a repository-only path only alongside the URL that reaches it", () => {
    const offenders = [];
    for (const rel of staged.filter((f) => f.endsWith(".md"))) {
      const text = read(rel);
      for (const repoPath of REPO_ONLY_PATHS) {
        if (text.includes(repoPath) && !hasProjectUrl(text)) {
          offenders.push(`${rel} mentions ${repoPath}`);
        }
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `a path like ${REPO_ONLY_PATHS[0]} exists only for someone who cloned the monorepo. ` +
        `An installed reader needs ${PROJECT_URL}… in the same file, or the instruction is ` +
        "unusable by the only audience that reads it",
    );
  });

  it("does not tell an installed reader to reload an extension it never shipped", () => {
    const live = read("reference/live.md");
    const recovery = live.slice(live.indexOf("not installed"));
    assert.ok(
      hasProjectUrl(recovery),
      "the /live recovery note must hand over the install URL: the one instruction whose job " +
        "is to fix “the extension is not installed” cannot assume the extension's source tree " +
        "is already on disk",
    );
  });
});

// #74 scoped this check to fenced JSON, which is where that pass had found `NFR.1.0`.
// Machine-readable blocks are not where a skill does its teaching, though: 150 IDs like
// `CN.1` and `FR.3` sat in prose, tables and diagrams, invisible to it. They are dotted,
// so the hyphen-ID guard passes them, and they are exactly what Rule 2 forbids — `FR.3`
// names no parent need, `CN.1` names no parent problem. Examples are the strongest
// instruction in a skill: an agent that reads a worked walkthrough of `CN.2 → FR.3` emits
// `CN.2 → FR.3`, and then the canvas has no `{cp}.{cn}` to link with and `validate` can
// only check traceability by reading prose. So the scope is the whole installed body.
describe("every example obeys the notation table it ships with", () => {
  it("every dotted ID in the skill matches an arity SKILL.md declares", () => {
    const arities = notationArities(read("SKILL.md"));
    assert.ok(arities.size >= 4, "SKILL.md must declare CP/CN/FR/NFR formats in its notation table");

    const wrong = [];
    for (const rel of staged.filter((f) => f.endsWith(".md"))) {
      for (const { id, line, allowed } of arityOffenders(read(rel), arities)) {
        wrong.push(`${rel}:${line}: ${id} (SKILL.md allows ${allowed.join(", ")} level(s))`);
      }
    }
    assert.deepEqual(
      wrong,
      [],
      "an example that contradicts the orchestrator's own notation table teaches an agent to " +
        "emit IDs the methodology forbids, and the hyphen-ID guard cannot see a wrong-arity " +
        "dotted ID. Renumber the example from the parent it actually has — or, if the shape is " +
        "legitimate methodology, declare it in SKILL.md's Identifier Notation table, which is " +
        "the only place this test reads the rules from. A truncated ID with a placeholder tail " +
        "(`FR.01.1.x`) is reported too, and correctly: write partial shapes the way the " +
        "notation table does, with `{}` placeholders — `FR.{cp}.{cn}.{n}`",
    );
  });
});

describe("negative canaries", () => {
  it("relativeLinks() keeps repo-relative targets and drops absolute ones", () => {
    assert.deepEqual(relativeLinks("[a](../../../docs/x.md)"), ["../../../docs/x.md"]);
    assert.deepEqual(relativeLinks("[a](https://iso.org/standard/72089.html)"), []);
    assert.deepEqual(relativeLinks("[a](reference/needs.md#top)"), ["reference/needs.md"]);
    assert.deepEqual(relativeLinks("[a](#section)"), []);
  });

  it("an escaping link is detected even though it resolves fine inside the checkout", () => {
    const fromRepo = path.resolve(
      path.join(skillSource, "reference"),
      "../../../docs/references/iso-iec-ieee-29148-2018.md",
    );
    assert.ok(
      fs.existsSync(fromRepo),
      "sanity: the repo-relative form is exactly the shape that resolves in a checkout",
    );
    const fromInstall = path.resolve(
      path.join(skillRoot, "reference"),
      "../../../docs/references/iso-iec-ieee-29148-2018.md",
    );
    assert.ok(
      path.relative(skillRoot, fromInstall).startsWith(".."),
      "…and the same link escapes the installed skill, which is what this suite must notice",
    );
  });

  it("notationArities() reads the table instead of assuming it", () => {
    const arities = notationArities(NOTATION_TABLE);
    assert.deepEqual([...arities.get("CP")].sort(), [1, 2, 3]);
    assert.deepEqual([...arities.get("CN")], [2]);
    assert.deepEqual([...arities.get("FR")], [3]);
    assert.deepEqual([...arities.get("NFR")], [1]);
    assert.equal(notationArities("no table here").size, 0);
  });

  it("dottedIds() reports the arity a wrong example would carry", () => {
    assert.deepEqual(dottedIds('"id": "NFR.1.0"'), [
      { id: "NFR.1.0", prefix: "NFR", arity: 2 },
    ]);
    assert.deepEqual(dottedIds('"id": "NFR.01"'), [{ id: "NFR.01", prefix: "NFR", arity: 1 }]);
    assert.deepEqual(dottedIds("CP-001 is legacy"), []);
  });

  it("arityOffenders() catches the prose shapes a JSON-only scope walked past", () => {
    const arities = notationArities(NOTATION_TABLE);
    // A case-study row and a coverage-matrix header — the two shapes that carried the
    // 150 offenders this check was widened for.
    assert.deepEqual(
      arityOffenders("| CN.1 | The company needs a CRM to know its customers. | CP.1.1 |", arities)
        .map((o) => o.id),
      ["CN.1"],
    );
    assert.deepEqual(
      arityOffenders("|      | FR.1 | FR.2 |\n| CN.1 | C    |      |", arities)
        .map((o) => `${o.id}@${o.line}`),
      ["FR.1@1", "FR.2@1", "CN.1@2"],
    );
    // Canonical IDs pass, including the sub-sub-problem — but only because the table
    // declares it. Teach a shape the table omits and this check fails, by design.
    assert.deepEqual(arityOffenders("FR.01.1.1 implements CN.01.1 under CP.01.2.1", arities), []);
    assert.equal(arityOffenders("CP.01.2.1", notationArities("")).length, 0);
    // A prefix the table never mentions is not this check's business.
    assert.deepEqual(arityOffenders("REQ.1.2 and CP-001 are not it", arities), []);
  });

  it("dispatchTable() reads routes, not prose that mentions an action", () => {
    assert.deepEqual(
      dispatchTable("| `needs` | [`reference/needs.md`](reference/needs.md) |"),
      [{ action: "needs", file: "reference/needs.md" }],
    );
    assert.deepEqual(dispatchTable("run `needs` to see reference/needs.md"), []);
  });
});
