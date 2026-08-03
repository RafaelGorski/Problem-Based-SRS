// `evals/tools/evidence-pack.mjs` composes the pack #92 asked for and #107 refined. Its whole
// value is that the numbers in it are **derived** rather than copied off a screenshot: #92
// attached the landing page's dashboard to a claim about the graph health bar, and no reader
// could tell, because a screenshot cannot say which page rendered it.
//
// So this suite pins the two things that make the pack worth attaching:
//
//   1. a family with no artefact supplied **fails**, and never skips. A pack that quietly
//      omits the plugin-archive family is the pack that shipped the broken zip;
//   2. the figures come out of the same `healthMetrics()` the page runs, over the same
//      `buildGraphData()`, so the pack and the screenshot cannot disagree — and `needClusters`
//      is checked to be a *graph property*, not the length of any array in the spec.
//
// Everything except the last describe block runs on fixtures, so the gates are exercised in
// both directions without needing a published artefact.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  CANVAS_TESTS,
  DEFAULT_SPEC,
  NEED_CLUSTER_DEFINITION,
  REPO_ROOT,
  USAGE,
  buildEvidencePack,
  canvasArchiveEvidence,
  captureAttribution,
  cli,
  distributionEvidence,
  familyCoverage,
  formatMarkdown,
  formatReport,
  graphFigures,
  parseArgs,
  pluginArchiveEvidence,
  skillsEvidence,
} from "../tools/evidence-pack.mjs";
import { ARTIFACT_FAMILIES } from "../lib/distribution-artifacts.mjs";
import { buildGraphData } from "../../.github/extensions/srs-navigator/lib/parser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

let tmp = "";

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-evidence-pack-"));
});

after(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/* --------------------------------------------------------------------------- fixtures */

function tree(name, files = {}) {
  const root = path.join(tmp, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof body === "string" ? body : JSON.stringify(body));
  }
  return root;
}

const ALL_HEADINGS = ARTIFACT_FAMILIES.flatMap((f) => [...f.readmeHeadings]);

/** A README whose Installation section documents exactly `headings`. */
const readmeWith = (headings) =>
  ["# Project", "", "## Installation", "", ...headings.flatMap((h) => [h, "", "steps", ""]), "## Later", ""].join("\n");

const row = (action) => `| \`${action}\` | [\`reference/${action}.md\`](reference/${action}.md) |`;

/** A skills install whose dispatch closes and whose links stay inside it. */
function skillTree(name, { actions = ["problems", "live"], omit = [], extra = {} } = {}) {
  const shipped = actions.filter((a) => !omit.includes(a));
  const files = {
    "SKILL.md": ["| Action | File |", "|---|---|", ...actions.map(row)].join("\n"),
    ...Object.fromEntries(shipped.map((a) => [`reference/${a}.md`, `# ${a}\n`])),
    ...extra,
  };
  return tree(name, files);
}

/** A plugin archive `verifyPluginArchive` accepts. */
function pluginArchiveTree(name, overrides = {}) {
  return tree(name, {
    "problem-based-srs/.claude-plugin/plugin.json": { name: "problem-based-srs", version: "9.9.9" },
    "problem-based-srs/skills/problem-based-srs/SKILL.md": [
      "| Action | File |",
      "|---|---|",
      row("problems"),
    ].join("\n"),
    "problem-based-srs/skills/problem-based-srs/reference/problems.md": "# problems\n",
    ...overrides,
  });
}

const gate = (pack, id) => pack.checks.find((c) => c.id === id);

/* ---------------------------------------------------------------- family coverage */

describe("familyCoverage checks the mapping instead of asserting it", () => {
  it("accepts a README whose install methods the families cover exactly once", () => {
    const coverage = familyCoverage(readmeWith(ALL_HEADINGS));
    assert.equal(coverage.ok, true);
    assert.deepEqual(coverage.uncovered, []);
    assert.deepEqual(coverage.duplicated, []);
    assert.deepEqual(coverage.phantom, []);
    assert.equal(coverage.documented.length, ALL_HEADINGS.length);
  });

  it("reports an install method no family claims", () => {
    const coverage = familyCoverage(readmeWith([...ALL_HEADINGS, "### Homebrew tap"]));
    assert.equal(coverage.ok, false);
    assert.deepEqual(coverage.uncovered, ["### Homebrew tap"]);
  });

  it("reports a family claim the README does not document", () => {
    const coverage = familyCoverage(readmeWith(ALL_HEADINGS.slice(1)));
    assert.equal(coverage.ok, false);
    assert.deepEqual(coverage.phantom, [ALL_HEADINGS[0]]);
  });

  it("reports a README with no Installation section as covering nothing", () => {
    const coverage = familyCoverage("# Project\n\nNo install section here.\n");
    assert.equal(coverage.ok, false);
    assert.deepEqual(coverage.documented, []);
  });

  it("reports a heading two families both claim", () => {
    // The shipped table has no duplicate, which is exactly why the family list is a parameter:
    // "each exactly once" is only a check if something can fail it.
    const families = [
      { readmeHeadings: ["### Manual"] },
      { readmeHeadings: ["### Manual", "### Plugin release archive"] },
    ];
    const coverage = familyCoverage(
      readmeWith(["### Manual", "### Plugin release archive"]),
      families,
    );
    assert.equal(coverage.ok, false);
    assert.deepEqual(coverage.duplicated, ["### Manual"]);
  });
});

/* ------------------------------------------------------------- the three families */

describe("family 1 — the repository clone", () => {
  it("reads the dispatch and link closure of an installed skill", () => {
    const evidence = skillsEvidence(skillTree("skills-good"));
    assert.equal(evidence.supplied, true);
    assert.equal(evidence.exists, true);
    assert.equal(evidence.dispatch.ok, true);
    assert.equal(evidence.links.broken.length, 0);
    assert.match(evidence.recorded.why, /recorded, not derived/);
  });

  it("says which family goes unproven when no install is given", () => {
    const evidence = skillsEvidence(null);
    assert.equal(evidence.supplied, false);
    assert.match(evidence.reason, /four README install methods deliver/);
  });

  it("reports a directory that is not there", () => {
    const evidence = skillsEvidence(path.join(tmp, "no-such-skill"));
    assert.equal(evidence.exists, false);
    assert.match(evidence.reason, /does not exist/);
  });
});

describe("family 2 — the plugin archive", () => {
  it("delegates to the reader the post-publication step already uses", () => {
    const evidence = pluginArchiveEvidence(pluginArchiveTree("plugin-good"));
    assert.equal(evidence.supplied, true);
    assert.equal(evidence.verification.ok, true);
  });

  it("keeps a reader failure as a result instead of throwing out of the pack", () => {
    const evidence = pluginArchiveEvidence(path.join(tmp, "no-such-archive"));
    assert.equal(evidence.supplied, true);
    assert.ok(evidence.error, "an unreadable archive must be reported, not raised");
  });

  it("names the defect history when the family is missing", () => {
    assert.match(pluginArchiveEvidence(null).reason, /defect in every published zip/);
  });
});

describe("family 3 — the canvas archive", () => {
  it("accepts an extracted archive and folds in a capture's provenance", () => {
    const evidence = canvasArchiveEvidence(
      tree("canvas-good", { "extension.mjs": "export default {};" }),
      { extensionSha256: "abcdef0123456789" },
    );
    assert.deepEqual(evidence.problems, []);
    assert.equal(evidence.recorded.files, 1);
    assert.equal(evidence.provenance.extensionSha256, "abcdef0123456789");
  });

  it("rejects a tree with no extension.mjs", () => {
    const evidence = canvasArchiveEvidence(tree("canvas-empty", { "README.md": "x" }));
    assert.equal(evidence.problems.length, 1);
    assert.match(evidence.problems[0], /is not the archive's/);
  });

  it("rejects a tree an install step re-created", () => {
    const evidence = canvasArchiveEvidence(
      tree("canvas-installed", {
        "extension.mjs": "export default {};",
        "node_modules/x/index.js": "0",
      }),
    );
    assert.ok(evidence.problems.some((p) => /node_modules is present/.test(p)));
  });

  it("rejects the checkout masquerading as the release", () => {
    // `.github` in the path is the exact condition extension.mjs uses to decide it is an
    // in-repo install and resolve skills from the repository instead of its own bundle.
    const evidence = canvasArchiveEvidence(
      path.join(repoRoot, ".github", "extensions", "srs-navigator"),
    );
    assert.ok(evidence.problems.some((p) => /this is the checkout, not the release/.test(p)));
  });

  it("reports a directory that is not there", () => {
    const evidence = canvasArchiveEvidence(path.join(tmp, "no-canvas"));
    assert.match(evidence.problems[0], /does not exist/);
    assert.equal(evidence.recorded, null);
  });

  it("says which family goes unproven when none is given", () => {
    const evidence = canvasArchiveEvidence(null);
    assert.equal(evidence.supplied, false);
    assert.equal(evidence.provenance, null);
  });
});

/* ------------------------------------------------------------- the monitor's verdict */

describe("distributionEvidence reads the monitor's own summary", () => {
  it("separates errors from warnings and notices, because only errors fail the run", () => {
    const evidence = distributionEvidence({
      findings: [
        { id: "registry-listing-drift", severity: "error" },
        { id: "surface-unreachable", severity: "warning" },
        { title: "untitled finding", severity: "error" },
      ],
      unverified: [{ id: "registry-skill-version-unverifiable" }],
    });
    assert.deepEqual(evidence.errors, ["registry-listing-drift", "untitled finding"]);
    assert.deepEqual(evidence.warnings, ["surface-unreachable"]);
    assert.deepEqual(evidence.unverified, ["registry-skill-version-unverifiable"]);
    assert.match(evidence.reading, /Warnings and notices exit 0 by design/);
  });

  it("names an unnamed finding rather than dropping it", () => {
    const evidence = distributionEvidence({ findings: [{ severity: "error" }] });
    assert.deepEqual(evidence.errors, ["(unnamed)"]);
  });

  it("falls back to a finding's title on every channel, not just the error one", () => {
    const evidence = distributionEvidence({
      findings: [
        { title: "a warning with no id", severity: "warning" },
        { severity: "warning" },
      ],
      unverified: [{ title: "a notice with no id" }, {}],
    });
    assert.deepEqual(evidence.warnings, ["a warning with no id", "(unnamed)"]);
    assert.deepEqual(evidence.unverified, ["a notice with no id", "(unnamed)"]);
  });

  it("tolerates a summary with no arrays at all", () => {
    const evidence = distributionEvidence({});
    assert.deepEqual(evidence.errors, []);
    assert.deepEqual(evidence.unverified, []);
  });

  it("tells the reader how to produce the summary when it is missing", () => {
    const evidence = distributionEvidence(null);
    assert.equal(evidence.supplied, false);
    assert.match(evidence.reason, /check-distribution\.mjs --json/);
  });
});

/* ------------------------------------------------------------------ derived figures */

describe("the figures are derived, not transcribed", () => {
  it("runs the page's own metric function over the page's own graph builder", () => {
    const spec = JSON.parse(fs.readFileSync(path.join(repoRoot, DEFAULT_SPEC), "utf8"));
    const figures = graphFigures(spec);
    assert.match(figures.derivedBy, /graph-metrics\.mjs healthMetrics\(\)/);
    assert.ok(figures.metrics.nodes > 0);
    assert.ok(figures.metrics.links > 0);
    assert.equal(typeof figures.metrics.traceability, "number");
  });

  it("says need clusters is a graph property, and re-derives it from the links", () => {
    const spec = JSON.parse(fs.readFileSync(path.join(repoRoot, DEFAULT_SPEC), "utf8"));
    const figures = graphFigures(spec);
    assert.equal(figures.needClusters, NEED_CLUSTER_DEFINITION);
    assert.match(NEED_CLUSTER_DEFINITION, /total degree \(in \+ out\) reaches 4/);

    // The definition, re-implemented here from its own words and compared. This is what makes
    // it a definition rather than a caption: if `computeHotspots` changes what a hub is, or if
    // the prose drifts from the code, these two numbers stop agreeing.
    const graph = buildGraphData(spec);
    const inDegree = new Map();
    const outDegree = new Map();
    for (const node of graph.nodes) {
      inDegree.set(node.id, 0);
      outDegree.set(node.id, 0);
    }
    const id = (end) => (typeof end === "object" ? end.id : end);
    for (const link of graph.links) {
      outDegree.set(id(link.source), (outDegree.get(id(link.source)) ?? 0) + 1);
      inDegree.set(id(link.target), (inDegree.get(id(link.target)) ?? 0) + 1);
    }
    const expected = graph.nodes.filter((n) => {
      const out = outDegree.get(n.id) ?? 0;
      if (n.type === "problem" && out === 0) return false;
      if (n.type === "need" && out === 0) return false;
      return (inDegree.get(n.id) ?? 0) + out >= 4;
    }).length;
    assert.equal(figures.metrics.needClusters, expected);

    // And the claim the definition actually makes about arrays: counting the needs does not
    // produce it. Another array coinciding is exactly why the definition says "coincidence".
    assert.notEqual(spec.needs.length, figures.metrics.needClusters);
    assert.match(NEED_CLUSTER_DEFINITION, /coincidence rather than a derivation/);
  });

  it("reports zero rather than throwing when there is no specification", () => {
    const figures = graphFigures(null);
    assert.equal(figures.metrics.nodes, 0);
  });
});

/* -------------------------------------------------------------- capture attribution */

describe("captureAttribution answers which suite wrote which screenshot", () => {
  it("reads the capture names out of the suites", () => {
    const dir = tree("suites", {
      "b.test.mjs": "await page.screenshot({ path: shot('graph-health.png') });\n",
      "a.test.mjs": [
        "// a comment",
        `await page.screenshot({ path: shot("landing-dashboard.png") });`,
      ].join("\n"),
      "not-a-suite.mjs": "shot('ignored.png')",
    });
    assert.deepEqual(captureAttribution(dir), [
      { capture: "graph-health.png", writtenBy: "b.test.mjs", line: 1 },
      { capture: "landing-dashboard.png", writtenBy: "a.test.mjs", line: 2 },
    ]);
  });

  it("treats a missing suite directory as no captures", () => {
    assert.deepEqual(captureAttribution(path.join(tmp, "no-suites")), []);
  });

  it("attributes the captures this repository actually writes", () => {
    const captures = captureAttribution(path.join(repoRoot, CANVAS_TESTS));
    assert.ok(captures.length > 0, "the canvas suites must write captures to attribute");
    assert.ok(captures.every((c) => c.writtenBy.endsWith(".test.mjs") && c.line > 0));
  });
});

/* ---------------------------------------------------------------------- the whole pack */

describe("CANARIES — a family with no artefact fails, and never skips", () => {
  const world = (overrides = {}) =>
    buildEvidencePack({
      root: repoRoot,
      skillsDir: skillTree("pack-skills"),
      pluginArchiveDir: pluginArchiveTree("pack-plugin"),
      canvasArchiveDir: tree("pack-canvas", { "extension.mjs": "export default {};" }),
      distributionFile: tree("pack-dist", { "d.json": { findings: [], unverified: [] } }) + "/d.json",
      ...overrides,
    });

  it("passes every gate when all three families are supplied and clean", () => {
    const pack = world();
    assert.equal(pack.ok, true, formatReport(pack));
    assert.deepEqual(
      pack.checks.map((c) => c.id),
      [
        "every-install-method-belongs-to-a-family",
        "repository-clone-family-is-proven",
        "plugin-archive-family-is-proven",
        "canvas-archive-family-is-proven",
        "specification-loads",
        "distribution-monitor-reports-zero-errors",
      ],
    );
  });

  it("fails the clone family when no skills install is supplied", () => {
    const pack = world({ skillsDir: null });
    assert.equal(gate(pack, "repository-clone-family-is-proven").ok, false);
    assert.equal(pack.ok, false);
  });

  it("fails the clone family when the install is missing", () => {
    const pack = world({ skillsDir: path.join(tmp, "gone") });
    assert.match(gate(pack, "repository-clone-family-is-proven").detail, /does not exist/);
  });

  it("fails the clone family when the dispatch table does not close", () => {
    const pack = world({
      skillsDir: skillTree("skills-open-dispatch", {
        actions: ["problems", "ghost"],
        omit: ["ghost"],
      }),
    });
    assert.match(
      gate(pack, "repository-clone-family-is-proven").detail,
      /dispatch does not close/,
    );
  });

  it("fails the clone family when a link escapes the install", () => {
    const pack = world({
      skillsDir: skillTree("skills-escaping-link", {
        extra: { "reference/problems.md": "[out](../../../elsewhere.md)\n" },
      }),
    });
    assert.match(gate(pack, "repository-clone-family-is-proven").detail, /links do not close/);
  });

  it("fails the plugin-archive family when it is missing, rather than omitting it", () => {
    const pack = world({ pluginArchiveDir: null });
    const g = gate(pack, "plugin-archive-family-is-proven");
    assert.equal(g.ok, false);
    assert.match(g.detail, /proves two of three/);
  });

  it("fails the plugin-archive family when the reader rejects it", () => {
    const pack = world({
      pluginArchiveDir: pluginArchiveTree("plugin-bad", {
        "problem-based-srs/agents/a/AGENT.md": "[escape](../../../elsewhere.md)\n",
      }),
    });
    const g = gate(pack, "plugin-archive-family-is-proven");
    assert.equal(g.ok, false);
    assert.match(g.detail, /verify-plugin-archive rejected it/);
  });

  it("fails the plugin-archive family when the reader could not read it at all", () => {
    const pack = world({ pluginArchiveDir: path.join(tmp, "not-an-archive") });
    assert.equal(gate(pack, "plugin-archive-family-is-proven").ok, false);
  });

  it("fails the canvas family when it is missing, and when it is the checkout", () => {
    assert.equal(gate(world({ canvasArchiveDir: null }), "canvas-archive-family-is-proven").ok, false);
    const checkout = world({
      canvasArchiveDir: path.join(repoRoot, ".github", "extensions", "srs-navigator"),
    });
    assert.match(
      gate(checkout, "canvas-archive-family-is-proven").detail,
      /this is the checkout, not the release/,
    );
  });

  it("says when no capture is tied to the canvas bytes, and when one is", () => {
    const loose = world();
    assert.match(
      gate(loose, "canvas-archive-family-is-proven").detail,
      /no capture is tied to these bytes/,
    );

    const provenance = tree("prov", {
      "p.json": { extensionSha256: "0123456789abcdef0123456789abcdef" },
    });
    const tied = world({ provenanceFile: path.join(provenance, "p.json") });
    assert.match(
      gate(tied, "canvas-archive-family-is-proven").detail,
      /names extension\.mjs 0123456789ab…/,
    );
  });

  it("fails specification-loads when the spec is not there", () => {
    const pack = world({ specFile: "no-such-spec.json" });
    const g = gate(pack, "specification-loads");
    assert.equal(g.ok, false);
    assert.match(g.detail, /no graph figure in this pack is derived/);
  });

  it("fails the monitor gate on an error finding, and passes with warnings present", () => {
    const dir = tree("dist-variants", {
      "red.json": { findings: [{ id: "registry-listing-drift", severity: "error" }] },
      "amber.json": {
        findings: [{ id: "surface-unreachable", severity: "warning" }],
        unverified: [{ id: "registry-skill-version-unverifiable" }],
      },
    });
    const red = world({ distributionFile: path.join(dir, "red.json") });
    assert.equal(gate(red, "distribution-monitor-reports-zero-errors").ok, false);
    assert.match(
      gate(red, "distribution-monitor-reports-zero-errors").detail,
      /registry-listing-drift/,
    );

    const amber = world({ distributionFile: path.join(dir, "amber.json") });
    const g = gate(amber, "distribution-monitor-reports-zero-errors");
    assert.equal(g.ok, true, "warnings exit 0 by design; the pack must not invent a failure");
    assert.match(g.detail, /1 warning\(s\) and 1 notice\(s\) remain/);
  });

  it("fails the family-coverage gate when the README documents an unclaimed method", () => {
    const root = tree("root-extra-method", {
      "README.md": readmeWith([...ALL_HEADINGS, "### Homebrew tap"]),
      [DEFAULT_SPEC.split(path.sep).join("/")]: fs.readFileSync(
        path.join(repoRoot, DEFAULT_SPEC),
        "utf8",
      ),
    });
    const pack = buildEvidencePack({ root });
    const g = gate(pack, "every-install-method-belongs-to-a-family");
    assert.equal(g.ok, false);
    assert.match(g.detail, /uncovered: ### Homebrew tap/);
  });

  it("fails the family-coverage gate when there is no README to read", () => {
    const pack = buildEvidencePack({ root: tree("root-no-readme") });
    assert.match(
      gate(pack, "every-install-method-belongs-to-a-family").detail,
      /the README documents no install methods/,
    );
    assert.deepEqual(pack.captures, []);
  });

  it("fails the family-coverage gate when two families claim the same method", () => {
    const root = tree("root-duplicate-claim", {
      "README.md": readmeWith(["### Manual"]),
    });
    const pack = buildEvidencePack({
      root,
      families: [{ readmeHeadings: ["### Manual"] }, { readmeHeadings: ["### Manual"] }],
    });
    assert.match(
      gate(pack, "every-install-method-belongs-to-a-family").detail,
      /claimed twice: ### Manual/,
    );
  });
});

/* ------------------------------------------------------------------------- rendering */

describe("rendering", () => {
  const pack = () =>
    buildEvidencePack({
      root: repoRoot,
      skillsDir: skillTree("render-skills"),
      pluginArchiveDir: pluginArchiveTree("render-plugin"),
      canvasArchiveDir: tree("render-canvas", { "extension.mjs": "export default {};" }),
      distributionFile:
        tree("render-dist", { "d.json": { findings: [], unverified: [] } }) + "/d.json",
    });

  it("renders a transcript that separates gates from figures", () => {
    const text = formatReport(pack());
    assert.match(text, /gates \(derived — these gate the exit code\)/);
    assert.match(text, /derived figures:/);
    assert.match(text, /needClusters is a graph property/);
    assert.match(text, /RESULT: every gate passed/);
  });

  it("renders the failure verdict when a gate failed", () => {
    const red = buildEvidencePack({ root: repoRoot });
    assert.match(formatReport(red), /RESULT: at least one gate failed/);
  });

  it("renders the markdown an issue can carry", () => {
    const md = formatMarkdown(pack());
    assert.match(md, /^# Evidence pack$/m);
    assert.match(md, /## Gates — derived, closure properties only/);
    assert.match(md, /## Distribution artefact families/);
    assert.match(md, /## Derived figures/);
    assert.match(md, /## Capture attribution — derived from the suites/);
    for (const family of ARTIFACT_FAMILIES) {
      assert.ok(md.includes(family.label), `markdown omits the ${family.id} family`);
    }
    assert.match(md, /- installed skill tree: \d+ files/);
    assert.match(md, /- plugin archive: \d+ files, \d+ actions/);
  });

  it("omits the recorded rows it has no evidence for rather than printing blanks", () => {
    const md = formatMarkdown(buildEvidencePack({ root: repoRoot }));
    assert.equal(md.includes("- installed skill tree:"), false);
    assert.equal(md.includes("- plugin archive:"), false);
  });
});

/* ---------------------------------------------------------------------- the CLI surface */

describe("the CLI surface", () => {
  it("parses every option the runbook uses", () => {
    const opts = parseArgs([
      "--root", repoRoot,
      "--skills", "/s",
      "--plugin-archive", "/p",
      "--canvas-archive", "/c",
      "--provenance", "/prov.json",
      "--distribution", "/dist.json",
      "--spec", "/spec.json",
      "--json", "-",
      "--markdown", "pack.md",
      "--quiet",
    ]);
    assert.equal(opts.root, repoRoot);
    assert.equal(opts.skillsDir, "/s");
    assert.equal(opts.pluginArchiveDir, "/p");
    assert.equal(opts.canvasArchiveDir, "/c");
    assert.equal(opts.provenanceFile, "/prov.json");
    assert.equal(opts.distributionFile, "/dist.json");
    assert.equal(opts.specFile, "/spec.json");
    assert.equal(opts.json, "-");
    assert.equal(opts.markdown, "pack.md");
    assert.equal(opts.quiet, true);
  });

  it("defaults to this repository", () => {
    assert.equal(parseArgs([]).root, REPO_ROOT);
    assert.equal(REPO_ROOT, repoRoot);
  });

  it("asks for help", () => {
    assert.equal(parseArgs(["--help"]).help, true);
    assert.equal(parseArgs(["-h"]).help, true);
  });

  it("refuses unknown options, missing values and stray arguments", () => {
    assert.throws(() => parseArgs(["--nope"]), /unknown option --nope/);
    assert.throws(() => parseArgs(["--spec"]), /--spec needs a value/);
    assert.throws(() => parseArgs(["stray"]), /unexpected argument stray/);
  });

  it("documents every option, and states the no-skip rule", () => {
    for (const flag of [
      "--skills",
      "--plugin-archive",
      "--canvas-archive",
      "--provenance",
      "--distribution",
      "--spec",
      "--root",
      "--json",
      "--markdown",
      "--quiet",
    ]) {
      assert.ok(USAGE.includes(flag), `USAGE does not mention ${flag}`);
    }
    assert.match(USAGE, /A family with no artefact supplied FAILS its gate/);
  });
});

/* ---------------------------------------------------------------------- the entry point */

describe("the entry point", () => {
  const streams = () => {
    const out = [];
    const err = [];
    return {
      out,
      err,
      io: { stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) } },
    };
  };

  it("exits 0 and writes both renderings when every family is proven", () => {
    const s = streams();
    const jsonFile = path.join(tmp, "cli-pack.json");
    const mdFile = path.join(tmp, "cli-pack.md");
    const dist = tree("cli-dist", { "d.json": { findings: [], unverified: [] } });
    const code = cli(
      [
        "--root", repoRoot,
        "--skills", skillTree("cli-skills"),
        "--plugin-archive", pluginArchiveTree("cli-plugin"),
        "--canvas-archive", tree("cli-canvas", { "extension.mjs": "export default {};" }),
        "--distribution", path.join(dist, "d.json"),
        "--json", jsonFile,
        "--markdown", mdFile,
      ],
      s.io,
    );
    assert.equal(code, 0, s.err.join(""));
    assert.equal(JSON.parse(fs.readFileSync(jsonFile, "utf8")).ok, true);
    assert.match(fs.readFileSync(mdFile, "utf8"), /^# Evidence pack$/m);
    assert.match(s.err.join(""), /RESULT: every gate passed/);
  });

  it("exits 1 when a family is unproven, and can put both renderings on stdout", () => {
    const s = streams();
    const code = cli(["--root", repoRoot, "--json", "-", "--markdown", "-", "--quiet"], s.io);
    assert.equal(code, 1);
    assert.equal(s.err.join(""), "", "--quiet must suppress the transcript");
    const written = s.out.join("");
    assert.match(written, /"tool": "evidence-pack"/);
    assert.match(written, /# Evidence pack/);
  });

  it("prints usage for --help and exits 0", () => {
    const s = streams();
    assert.equal(cli(["--help"], s.io), 0);
    assert.match(s.err.join(""), /Usage: node evals\/tools\/evidence-pack\.mjs/);
  });

  it("reports a bad option as a message and an exit code, not a stack trace", () => {
    const s = streams();
    assert.equal(cli(["--nope"], s.io), 1);
    assert.match(s.err.join(""), /unknown option --nope/);
  });

  it("reports an unreadable input file the same way", () => {
    const s = streams();
    assert.equal(cli(["--root", repoRoot, "--distribution", "no-such-file.json"], s.io), 1);
    assert.ok(s.err.join("").length > 0);
  });

  it("defaults its argv to the process, so the bootstrap needs no arguments", () => {
    const argv = process.argv;
    try {
      process.argv = [argv[0], argv[1], "--help"];
      const s = streams();
      assert.equal(cli(undefined, s.io), 0);
      assert.match(s.err.join(""), /Usage:/);
    } finally {
      process.argv = argv;
    }
  });

  it("defaults its streams to the process, so the bootstrap needs no io either", () => {
    const write = process.stderr.write;
    const captured = [];
    process.stderr.write = (chunk) => {
      captured.push(String(chunk));
      return true;
    };
    try {
      assert.equal(cli(["--help"]), 0);
    } finally {
      process.stderr.write = write;
    }
    assert.match(captured.join(""), /Usage: node evals\/tools\/evidence-pack\.mjs/);
  });
});

/* ------------------------------------------------------------------ as a real command */

describe("as a real command", () => {
  // The bootstrap that turns `cli`'s return value into an exit code cannot run in-process —
  // it would end the test run — so it is covered the only way it can be: by being run.
  const tool = path.join(repoRoot, "evals", "tools", "evidence-pack.mjs");
  const invoke = (args) =>
    spawnSync(process.execPath, [tool, ...args], { encoding: "utf8", cwd: repoRoot });

  it("exits 0 for --help", () => {
    const result = invoke(["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stderr, /Usage: node evals\/tools\/evidence-pack\.mjs/);
  });

  it("exits 1 with a message when an option is unknown", () => {
    const result = invoke(["--nope"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown option --nope/);
  });

  it("exits 1 against this repository, where the release artefacts do not exist yet", () => {
    const result = invoke(["--root", repoRoot, "--quiet", "--json", "-"]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /"tool": "evidence-pack"/);
  });
});

/* -------------------------------------------------------- the repository it ships with */

describe("against this repository", () => {
  it("proves the clone family from the canonical skill, and derives the figures", () => {
    const pack = buildEvidencePack({
      root: repoRoot,
      skillsDir: path.join(repoRoot, "skills", "problem-based-srs"),
    });
    assert.equal(gate(pack, "every-install-method-belongs-to-a-family").ok, true);
    assert.equal(gate(pack, "repository-clone-family-is-proven").ok, true);
    assert.equal(gate(pack, "specification-loads").ok, true);
    assert.ok(pack.figures.metrics.nodes > 0);
    assert.ok(pack.captures.length > 0);
    assert.equal(
      pack.ok,
      false,
      "the two release families have no artefact here, and that must fail rather than skip",
    );
  });
});
