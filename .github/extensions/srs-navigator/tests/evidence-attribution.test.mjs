/**
 * Evidence attribution: a capture proves what the suite that wrote it was rendering.
 *
 * Why this exists. The evidence plan on #92 attached `skills-health-dashboard.png` to the
 * graph health bar's figures (29 nodes, 5 need clusters, 100% traceability). That image is
 * a full-page shot of the *landing page*, written by `tests/site.test.mjs`; the graph
 * assertion lives in `tests/visual.test.mjs`. The claim and the picture came from different
 * suites rendering different surfaces, and nothing caught it — the pack was reviewed by
 * reading it, which is exactly the substitution of presence for function that #69 is about.
 *
 * So the mapping in `docs/release-verification.md` is *derived from the suites here*, not
 * restated. Renaming a capture, or moving the health-bar assertion into another file, fails
 * this test rather than quietly making the runbook wrong.
 *
 * Nothing in this file may hard-code the list of captures: it is read out of the sources.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(EXT_ROOT, "../../..");
const RUNBOOK = path.join(REPO_ROOT, "docs", "release-verification.md");

/** Suites that write screenshot evidence, and the surface each one renders. */
const SUITES = Object.freeze([
  Object.freeze({ file: "visual.test.mjs", surface: "the canvas" }),
  Object.freeze({ file: "site.test.mjs", surface: "the landing page" }),
  Object.freeze({ file: "demo.test.mjs", surface: "the landing page's demo figure" }),
]);

const read = (p) => fs.readFileSync(p, "utf8");

/** Every `shot('name.png')` a suite writes. */
function capturesIn(file) {
  const src = read(path.join(EXT_ROOT, "tests", file));
  const names = [...src.matchAll(/shot\(\s*['"]([^'"]+\.png)['"]\s*\)/g)].map((m) => m[1]);
  return [...new Set(names)];
}

/** name -> [suite files that write it] */
function attribution() {
  const map = new Map();
  for (const { file } of SUITES) {
    for (const name of capturesIn(file)) {
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(file);
    }
  }
  return map;
}

/** The runbook's attribution table rows, as { capture, suite, surface }. */
function runbookRows() {
  const doc = read(RUNBOOK);
  const heading = "### Which capture supports which claim";
  const start = doc.indexOf(heading);
  assert.notEqual(start, -1, `${heading} must exist in the runbook`);
  const section = doc.slice(start);
  const rows = [];
  for (const line of section.split("\n")) {
    const m = line.match(/^\|\s*`([^`]+\.png)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/);
    if (m) rows.push({ capture: m[1], suite: path.basename(m[2]), surface: m[3].trim() });
  }
  return rows;
}

describe("evidence attribution — captures map to the suite that writes them", () => {
  test("every screenshot a suite writes is attributed in the runbook", () => {
    const written = attribution();
    assert.ok(written.size > 0, "the suites must write at least one capture");
    const documented = new Set(runbookRows().map((r) => r.capture));
    for (const name of written.keys()) {
      assert.ok(
        documented.has(name),
        `${name} is written by ${written.get(name).join(", ")} but the runbook's ` +
          `attribution table does not list it — an undocumented capture is one a pack ` +
          `can attach to any claim it likes`,
      );
    }
  });

  test("the runbook attributes each capture to the suite that actually writes it", () => {
    const written = attribution();
    for (const row of runbookRows()) {
      const actual = written.get(row.capture);
      assert.ok(actual, `the runbook lists ${row.capture}, which no suite writes`);
      assert.ok(
        actual.includes(row.suite),
        `the runbook credits ${row.capture} to ${row.suite}, but it is written by ` +
          `${actual.join(", ")}. This is the #92 defect exactly: a claim and a picture ` +
          `from different suites`,
      );
    }
  });

  test("no capture is written by two suites", () => {
    for (const [name, files] of attribution()) {
      assert.equal(
        files.length,
        1,
        `${name} is written by ${files.join(" and ")}; a capture with two authors cannot ` +
          `be attributed to a surface`,
      );
    }
  });

  test("the runbook records the surface each suite renders", () => {
    const bySuite = new Map(SUITES.map((s) => [s.file, s.surface]));
    for (const row of runbookRows()) {
      assert.equal(
        row.surface,
        bySuite.get(row.suite),
        `${row.capture} is attributed to ${row.suite}, which renders ` +
          `"${bySuite.get(row.suite)}", but the runbook says "${row.surface}"`,
      );
    }
  });
});

describe("evidence attribution — the graph health bar", () => {
  test("the health-bar figures are asserted in the canvas suite, not the site suite", () => {
    const visual = read(path.join(EXT_ROOT, "tests", "visual.test.mjs"));
    assert.match(
      visual,
      /health bar reports .*nodes.*need clusters.*traceability/i,
      "visual.test.mjs must carry the health-bar figures assertion; if it moved, the " +
        "runbook's attribution of live-dotted-notation.png moved with it",
    );
    const site = read(path.join(EXT_ROOT, "tests", "site.test.mjs"));
    assert.doesNotMatch(
      site,
      /health bar reports .*need clusters/i,
      "site.test.mjs renders the landing page; if it starts asserting the graph health " +
        "bar, the runbook must say so rather than leaving the #92 misattribution true",
    );
  });

  test("the capture that can support the health-bar claim is written by the same suite", () => {
    const written = attribution();
    const authors = written.get("live-dotted-notation.png");
    assert.ok(authors, "live-dotted-notation.png must still be captured");
    assert.deepEqual(
      authors,
      ["visual.test.mjs"],
      "the health-bar assertion and the capture cited for it must run in the same suite, " +
        "or the pack is again citing a picture from somewhere else",
    );
  });

  test("the runbook denies that the landing-page dashboard shows the graph health bar", () => {
    const doc = read(RUNBOOK);
    const row = doc
      .split("\n")
      .find((l) => l.includes("`skills-health-dashboard.png`") && l.startsWith("|"));
    assert.ok(row, "the runbook must attribute skills-health-dashboard.png");
    assert.match(
      row,
      /\*\*Not\*\* the graph health bar/,
      "the row for skills-health-dashboard.png must state what it cannot support — this " +
        "is the specific claim #92 got wrong",
    );
  });
});

describe("evidence attribution — what can speak for the published archive", () => {
  test("only one suite reads CANVAS_URL", () => {
    const readers = SUITES.filter(({ file }) =>
      read(path.join(EXT_ROOT, "tests", file)).includes("CANVAS_URL"),
    ).map((s) => s.file);
    assert.deepEqual(
      readers,
      ["visual.test.mjs"],
      "the runbook tells a maintainer to point CANVAS_URL at an extracted release " +
        "archive; if another suite gains or loses that support, the claim about which " +
        "captures can speak for the published artefact changes",
    );
  });

  test("the runbook names that suite as the only one that can", () => {
    const doc = read(RUNBOOK);
    assert.match(
      doc,
      /\*\*Only `tests\/visual\.test\.mjs` reads `CANVAS_URL`\.\*\*/,
      "the runbook must state which suite can be pointed at a published archive",
    );
    assert.match(
      doc,
      /open-archive-canvas\.mjs --provenance/,
      "and must pair it with the provenance record that identifies the bytes that ran",
    );
  });
});

describe("evidence attribution — CI attaches nothing when green", () => {
  const ci = () => read(path.join(REPO_ROOT, ".github", "workflows", "ci.yml"));

  test("the Playwright report is uploaded only on failure", () => {
    const src = ci();
    const idx = src.indexOf("playwright-report");
    assert.notEqual(idx, -1, "ci.yml must still upload a Playwright report");
    const before = src.slice(Math.max(0, idx - 400), idx);
    assert.match(
      before,
      /if:\s*failure\(\)/,
      "if this upload becomes unconditional, the runbook's 'a green run attaches " +
        "nothing' instruction is wrong and a pack may cite a CI artifact instead",
    );
  });

  test("test-results/ — where the captures land — is never uploaded", () => {
    assert.doesNotMatch(
      ci(),
      /path:\s*.*test-results/,
      "the captures a pack attaches are not produced by CI; if that changes the runbook " +
        "must stop telling maintainers to run the suite locally",
    );
  });

  test("the runbook says so", () => {
    assert.match(
      read(RUNBOOK),
      /\*\*A green CI run attaches nothing\.\*\*/,
      "the runbook must state that the pack comes from a local run",
    );
  });
});
