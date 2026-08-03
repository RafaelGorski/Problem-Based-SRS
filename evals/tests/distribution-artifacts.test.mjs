// The distribution-artifacts library reads a *shipped* tree, so its own tests are built
// from fixture trees rather than from the checkout: a check that only ever sees a healthy
// repository cannot demonstrate it would notice an unhealthy archive.
//
// Every gate below has a **canary** — a purpose-built broken tree the check must reject.
// #107's review asked for exactly this instead of the alternative on the table
// ("re-check the thresholds by rerunning the pack after a deliberate, reverted addition"):
// mutating the tracked tree during a release run adds risk to the release without
// improving the proof that ships.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARTIFACT_FAMILIES,
  coveredReadmeHeadings,
  dispatchActions,
  dispatchClosure,
  linkClosure,
  readInstalledSkill,
  readmeInstallHeadings,
  relativeLinkTargets,
  walkTree,
} from "../lib/distribution-artifacts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

/* --------------------------------------------------------------------------- fixtures */

let tmp = "";

/** Build a tree from a `{ "rel/path": "contents" }` map and return its root. */
function fixture(name, files) {
  const root = path.join(tmp, name);
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

/** A dispatch table row, in the shape SKILL.md writes them. */
const row = (action) => `| \`${action}\` | [\`reference/${action}.md\`](reference/${action}.md) |`;

/** A minimal healthy skill directory: three actions, one example walkthrough. */
const HEALTHY_SKILL = {
  "SKILL.md": ["| Action | File |", "|---|---|", row("problems"), row("needs"), row("live")].join(
    "\n",
  ),
  "reference/problems.md": "# problems\n",
  "reference/needs.md": "# needs\n",
  "reference/live.md": "# live\n",
  "reference/crm-example.md": "# a walkthrough, dispatched by nothing\n",
};

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-artifacts-"));
});

after(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/* ---------------------------------------------------------------- families vs. README */

describe("the artifact families account for every install method the README documents", () => {
  it("maps each family onto README headings that exist", () => {
    const documented = new Set(readmeInstallHeadings(read("README.md")));
    assert.ok(
      documented.size > 0,
      "no `###` headings parsed out of the README's Installation section — every " +
        "comparison below would be vacuous, which is how a coverage claim goes quietly false",
    );
    for (const family of ARTIFACT_FAMILIES) {
      for (const heading of family.readmeHeadings) {
        assert.ok(
          documented.has(heading),
          `family "${family.id}" claims README heading ${heading}, which the Installation ` +
            "section does not have — the mapping is stale",
        );
      }
    }
  });

  it("leaves no install method unaccounted for", () => {
    // The claim #92 and #107 both objected to was "three install routes". Six methods, three
    // artefacts: the number is only defensible while every method maps to a family, so a
    // seventh method has to be mapped or this fails.
    const documented = readmeInstallHeadings(read("README.md"));
    const covered = new Set(coveredReadmeHeadings());
    const unmapped = documented.filter((h) => !covered.has(h));
    assert.deepEqual(
      unmapped,
      [],
      "an install method with no artifact family is a distribution path nothing verifies; " +
        "map it to a family (or add one) rather than letting the pack claim full coverage",
    );
  });

  it("names three distinct artifacts, one of which is the plugin release archive", () => {
    const ids = ARTIFACT_FAMILIES.map((f) => f.id);
    assert.deepEqual(ids, ["repository-clone", "plugin-archive", "canvas-archive"]);
    assert.equal(new Set(ARTIFACT_FAMILIES.map((f) => f.artifact)).size, 3);
    assert.match(
      ARTIFACT_FAMILIES.find((f) => f.id === "plugin-archive").artifact,
      /problem-based-srs-v<version>\.zip/,
      "the family that had no reader at all until #107 — the asset every plugin release " +
        "attaches",
    );
  });
});

/* ------------------------------------------------------------------------ walking a tree */

describe("walkTree reads the tree it is given", () => {
  it("returns every file, sorted, with forward slashes", () => {
    const root = fixture("walk", { "a.md": "a", "deep/nested/b.md": "b", "c.json": "{}" });
    assert.deepEqual(walkTree(root), ["a.md", "c.json", "deep/nested/b.md"]);
  });

  it("returns an empty list for an empty tree rather than throwing", () => {
    const root = path.join(tmp, "empty");
    fs.mkdirSync(root, { recursive: true });
    assert.deepEqual(walkTree(root), []);
  });
});

/* ------------------------------------------------------------------- link extraction */

describe("relativeLinkTargets keeps only links to other files", () => {
  it("keeps relative paths and drops fragments", () => {
    assert.deepEqual(relativeLinkTargets("[a](reference/needs.md#section)"), [
      "reference/needs.md",
    ]);
  });

  it("drops URLs, anchors, mail links and protocol-relative links", () => {
    const md = [
      "[iso](https://www.iso.org/standard/72089.html)",
      "[here](#identifier-notation)",
      "[mail](mailto:someone@example.com)",
      "[cdn](//example.com/x.md)",
    ].join("\n");
    assert.deepEqual(relativeLinkTargets(md), []);
  });

  it("survives text with no links at all", () => {
    assert.deepEqual(relativeLinkTargets("# heading\n\nprose"), []);
    assert.deepEqual(relativeLinkTargets(null), []);
  });
});

/* ---------------------------------------------------------------------- link closure */

describe("linkClosure resolves every markdown link against the shipped tree", () => {
  it("passes a tree whose links all resolve", () => {
    const root = fixture("links-ok", {
      "a.md": "[b](sub/b.md)",
      "sub/b.md": "[a](../a.md)",
    });
    const result = linkClosure(root);
    assert.deepEqual(result.broken, []);
    assert.equal(result.links, 2);
    assert.equal(result.checked, 2);
  });

  it("CANARY: catches the shipped defect — a link resolving into a directory that exists nowhere", () => {
    // The real defect, reproduced: `agents/problem-based-srs/AGENT.md` linking `../skills/…`
    // resolves to `agents/skills/`, a directory that exists in neither the repository nor
    // the archive. It stays *inside* the tree — which is exactly why it is reported as a
    // missing file rather than an escape, and exactly why resolving it from the checkout
    // (where `skills/` does exist one level up) never asked the question.
    const root = fixture("links-agents-skills", {
      "agents/problem-based-srs/AGENT.md": "[skill](../skills/problem-based-srs/SKILL.md)",
      "skills/problem-based-srs/SKILL.md": "# skill",
    });
    const { broken } = linkClosure(root);
    assert.equal(broken.length, 1);
    assert.equal(broken[0].reason, "no such file");
    assert.equal(broken[0].file, "agents/problem-based-srs/AGENT.md");
  });

  it("CANARY: catches a link that escapes the tree entirely", () => {
    // The other half, and the one a grep for a known bad path can never generalise to: a
    // target that resolves outside the install root reads fine from a checkout with the
    // repository around it and is unreachable for everyone who downloaded the archive.
    const root = fixture("links-escape", {
      "docs/guide.md": "[paper](../../research/paper.md)",
    });
    const { broken } = linkClosure(root);
    assert.equal(broken.length, 1);
    assert.equal(broken[0].reason, "escapes the tree");
  });

  it("CANARY: catches a link to a file that is not shipped", () => {
    const root = fixture("links-missing", { "a.md": "[gone](reference/deleted.md)" });
    const { broken } = linkClosure(root);
    assert.equal(broken.length, 1);
    assert.equal(broken[0].reason, "no such file");
  });

  it("checks only markdown, so a JSON manifest's strings are not read as links", () => {
    const root = fixture("links-json", { "plugin.json": '{"homepage":"(x.md)"}' });
    assert.equal(linkClosure(root).checked, 0);
  });
});

/* ------------------------------------------------------------------ the dispatch table */

describe("dispatchActions parses the orchestrator's contract", () => {
  it("reads the actions out of a dispatch table", () => {
    assert.deepEqual(dispatchActions(HEALTHY_SKILL["SKILL.md"]), ["problems", "needs", "live"]);
  });

  it("ignores a row whose action and file disagree", () => {
    assert.deepEqual(
      dispatchActions("| `needs` | [`reference/problems.md`](reference/problems.md) |"),
      [],
      "a row pointing at another action's file is a typo, not a dispatch — treating it as " +
        "one would report the wrong file as reachable",
    );
  });

  it("reads the live row, which carries prose after the link", () => {
    const md = "| `live` | [`reference/live.md`](reference/live.md) | Launch the canvas |";
    assert.deepEqual(dispatchActions(md), ["live"]);
  });
});

/* -------------------------------------------------------- the installed skill and closure */

describe("readInstalledSkill derives the file set from the tree", () => {
  it("separates action files from example walkthroughs", () => {
    const root = fixture("skill-ok", HEALTHY_SKILL);
    const skill = readInstalledSkill(root);
    assert.deepEqual(skill.actionFiles.map((f) => path.basename(f, ".md")).sort(), [
      "live",
      "needs",
      "problems",
    ]);
    assert.deepEqual(skill.exampleFiles, ["reference/crm-example.md"]);
    assert.equal(skill.files.length, 5);
  });

  it("does not equate the file count with the action count", () => {
    // #107's review caught the plan deriving "12 files" from a nine-row dispatch table.
    // The tree also carries SKILL.md and the walkthroughs, so the two numbers answer
    // different questions and must not be derived from each other.
    const skill = readInstalledSkill(fixture("skill-counts", HEALTHY_SKILL));
    assert.notEqual(skill.files.length, dispatchActions(skill.skillMd).length);
  });

  it("reports an absent directory as empty rather than throwing", () => {
    const skill = readInstalledSkill(path.join(tmp, "not-installed"));
    assert.deepEqual(skill.files, []);
    assert.equal(skill.skillMd, null);
  });
});

describe("dispatchClosure gates on closure, not on counts", () => {
  it("passes a tree where the table and the reference files agree", () => {
    const closure = dispatchClosure(readInstalledSkill(fixture("closure-ok", HEALTHY_SKILL)));
    assert.ok(closure.ok);
    assert.deepEqual(closure.unresolved, []);
    assert.deepEqual(closure.undispatched, []);
  });

  it("stays green when an action is added to both sides", () => {
    // The property that makes this a gate rather than a snapshot: a tenth action does not
    // turn a correct tree red, so nobody has to edit the number to match reality.
    const grown = {
      ...HEALTHY_SKILL,
      "SKILL.md": `${HEALTHY_SKILL["SKILL.md"]}\n${row("complexity")}`,
      "reference/complexity.md": "# complexity\n",
    };
    const closure = dispatchClosure(readInstalledSkill(fixture("closure-grown", grown)));
    assert.ok(closure.ok);
    assert.equal(closure.actions.length, 4);
  });

  it("CANARY: fails when a dispatched action ships no reference file", () => {
    const broken = { ...HEALTHY_SKILL };
    delete broken["reference/live.md"];
    const closure = dispatchClosure(readInstalledSkill(fixture("closure-missing", broken)));
    assert.equal(closure.ok, false);
    assert.deepEqual(closure.unresolved, ["live"]);
  });

  it("CANARY: fails when a shipped reference file is unreachable", () => {
    const orphan = {
      ...HEALTHY_SKILL,
      "reference/validate.md": "# nothing dispatches this\n",
    };
    const closure = dispatchClosure(readInstalledSkill(fixture("closure-orphan", orphan)));
    assert.equal(closure.ok, false);
    assert.deepEqual(closure.undispatched, ["validate"]);
  });

  it("CANARY: fails on an empty dispatch table instead of passing vacuously", () => {
    const unparseable = { ...HEALTHY_SKILL, "SKILL.md": "# no table here\n" };
    const closure = dispatchClosure(readInstalledSkill(fixture("closure-empty", unparseable)));
    assert.equal(
      closure.ok,
      false,
      "a parser that silently returned nothing would otherwise report a tree with no " +
        "reachable actions as fully closed",
    );
  });
});

/* ------------------------------------------------------- the real tree still satisfies it */

describe("the repository's own skill satisfies the closure this library gates on", () => {
  it("closes both ways", () => {
    const closure = dispatchClosure(readInstalledSkill(path.join(repoRoot, "skills/problem-based-srs")));
    assert.ok(
      closure.ok,
      `the canonical skill fails dispatch closure: unresolved=${closure.unresolved.join(",")} ` +
        `undispatched=${closure.undispatched.join(",")}`,
    );
    assert.ok(closure.actions.includes("live"), "the row with prose after the link");
  });
});
