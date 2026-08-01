// The landing page's "before/after" is a proof claim: it quotes the specification
// that actually ships with the plugin. If the demo spec changes and the page does
// not, the site starts advertising an artifact that no longer exists — the exact
// drift this product sells against. These tests tie the two together.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX = fs.readFileSync(path.join(REPO_ROOT, "docs/index.html"), "utf8");
const SPEC = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ".spec/crm-system.json"), "utf8"));

/** Collapse HTML entities and whitespace so page copy can be compared to spec text. */
function normalize(html) {
  return html
    .replace(/&middot;/g, "·")
    .replace(/&mdash;/g, "—")
    .replace(/&rarr;/g, "→")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PAGE = normalize(INDEX);
const byId = (list, id) => list.find((n) => n.id === id);

describe("landing page — the before/after quotes the real specification", () => {
  test("the highlighted problem exists in .spec/crm-system.json", () => {
    const cp = byId(SPEC.problems, "CP.01");
    assert.ok(cp, "CP.01 must exist in the demo spec");
    assert.ok(
      PAGE.includes(cp.title),
      `docs/index.html must quote CP.01's real title ("${cp.title}"), not an invented one.`,
    );
    assert.ok(
      PAGE.includes(cp.description),
      "docs/index.html must quote CP.01's real statement verbatim.",
    );
  });

  test("the CP -> CN -> FR chain on the page is a real path through the spec", () => {
    const cn = byId(SPEC.needs, "CN.01.1");
    const fr = byId(SPEC.functionalRequirements, "FR.01.1.1");
    assert.ok(cn && fr, "CN.01.1 and FR.01.1.1 must exist in the demo spec");
    assert.ok(
      cn.problemIds.includes("CP.01"),
      "CN.01.1 must actually trace to CP.01 — the page claims that edge.",
    );
    assert.ok(
      fr.needIds.includes("CN.01.1"),
      "FR.01.1.1 must actually trace to CN.01.1 — the page claims that edge.",
    );
    for (const node of [cn, fr]) {
      assert.ok(PAGE.includes(node.title), `the page must name ${node.id} as "${node.title}"`);
    }
  });

  test("the artifact counts quoted on the page match the spec", () => {
    const counts = {
      problems: SPEC.problems.length,
      needs: SPEC.needs.length,
      requirements: SPEC.functionalRequirements.length,
      quality: SPEC.nonFunctionalRequirements.length,
    };
    assert.ok(
      PAGE.includes(`${counts.problems} problems`),
      `the page must state "${counts.problems} problems"`,
    );
    assert.ok(PAGE.includes(`${counts.needs} needs`), `the page must state "${counts.needs} needs"`);
    assert.ok(
      PAGE.includes(`${counts.requirements} requirements`),
      `the page must state "${counts.requirements} requirements"`,
    );
    assert.ok(
      PAGE.includes(`${counts.quality} quality attributes`),
      `the page must state "${counts.quality} quality attributes"`,
    );
  });

  test("the page points at the shipped spec file and the command that opens it", () => {
    assert.ok(PAGE.includes(".spec/crm-system.json"), "name the file a reader can open");
    assert.ok(/\/live\b/.test(PAGE), "name the command that renders it");
  });

  test("page copy uses canonical dotted identifiers", () => {
    const before = INDEX.indexOf('class="problem-before');
    const after = INDEX.indexOf('class="problem-figure');
    assert.ok(before > 0 && after > before, "the problem section must keep its structure");
    const copy = INDEX.slice(before, after);
    const legacy = copy.match(/\b(?:CP|CN|FR|NFR)-\d+/g) ?? [];
    assert.deepEqual(legacy, [], "the before/after copy must use dotted IDs, not legacy hyphen IDs");
  });
});

// The same proof claim, asked of the README — which is where a reader who arrives from the
// registry or a `git clone` starts, and which had no such guard. It told a different origin
// story ("a reporting dashboard with 20 charts") and reused CP.01 for a problem the shipped
// spec does not contain: the landing page's CP.01 is "Scattered Customer Information", the
// README's was "Managers must access sales data within 5 seconds". Same identifier, two
// different meanings, on the two surfaces a reader sees in sequence.
const README = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8");

/** The README's origin story: the section that opens with the stakeholder's request. */
function originStory(md, heading = "## The problem this solves") {
  const from = md.indexOf(heading);
  if (from === -1) return "";
  const rest = md.slice(from + heading.length);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Markdown prose as one line: blockquote markers and emphasis dropped, whitespace collapsed.
 * The counterpart of `normalize()` for the page — a statement quoted verbatim is still
 * quoted verbatim when the paragraph it sits in happens to wrap.
 */
function flatten(md) {
  return md
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("README — the origin story is the same one the landing page tells", () => {
  test("quotes the shipped CP.01, not an invented one", () => {
    const story = flatten(originStory(README));
    assert.ok(story.length > 0, "the README must keep its origin-story section");
    const cp = byId(SPEC.problems, "CP.01");
    assert.ok(
      story.includes(cp.title),
      `README.md must name CP.01 as "${cp.title}" — the problem the shipped spec actually ` +
        `contains and the landing page already quotes`,
    );
    assert.ok(
      story.includes(cp.description),
      "README.md must quote CP.01's real statement verbatim, so a reader who installs and " +
        "runs /live sees the problem the README promised",
    );
  });

  test("walks a chain that is a real path through the spec", () => {
    const story = flatten(originStory(README));
    const cn = byId(SPEC.needs, "CN.01.1");
    const fr = byId(SPEC.functionalRequirements, "FR.01.1.1");
    for (const node of [cn, fr]) {
      assert.ok(
        story.includes(node.id) && story.includes(node.title),
        `the README's chain must name ${node.id} as "${node.title}"`,
      );
    }
    assert.ok(cn.problemIds.includes("CP.01"), "CN.01.1 must trace to CP.01 — the README claims it");
    assert.ok(
      fr.needIds.includes("CN.01.1"),
      "FR.01.1.1 must trace to CN.01.1 — the README claims it",
    );
  });

  test("uses canonical dotted identifiers", () => {
    const legacy = originStory(README).match(/\b(?:CP|CN|FR|NFR)-\d+/g) ?? [];
    assert.deepEqual(legacy, [], "the origin story must use dotted IDs, not legacy hyphen IDs");
  });

  test("names the same problem the landing page opens with", () => {
    // Derived from the spec on both sides rather than compared as free text: the surfaces
    // agree because they both quote the artifact, which is the property worth guarding.
    const cp = byId(SPEC.problems, "CP.01");
    const story = flatten(originStory(README));
    assert.ok(
      PAGE.includes(cp.title) && story.includes(cp.title),
      "landing page and README must open on the same customer problem — a reader meets them " +
        "in sequence, and two origin stories is two products",
    );
  });
});
