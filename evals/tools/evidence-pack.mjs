#!/usr/bin/env node
// Assemble the evidence pack #92 asks for, with every figure either **derived** from a
// shipped artefact or explicitly **recorded** — and nothing gated on a count.
//
// Why this is a tool (issues #107 and #92). The pack's parts already exist —
// `verify-plugin-archive.mjs` reads the plugin archive, `distribution-artifacts.mjs` reads a
// shipped skill tree, `graph-metrics.mjs` computes the health-bar figures outside the browser
// — and nothing composed them, so the pack was still assembled by hand from snapshots. That
// is the failure mode #92 exists to fix, applied to itself:
//
//   #107 — "#92 accepts on fixed numbers — 12 skill files, 29 nodes, 5 need clusters. Each is
//           a snapshot of f30dd4a. A tenth action or a sixth need cluster would make a
//           *correct* product fail the pack, so the numbers get edited to match reality —
//           which is how an acceptance criterion quietly becomes a formality."
//
// So the rule this file implements is: **a number may be recorded, never gated.** Every gate
// below is a closure property — every action resolves, every link resolves inside the tree,
// every README install method belongs to exactly one artefact family — and those stay true as
// the product grows. The counts ride alongside, labelled, so a reader can see them without a
// later addition turning a correct release red.
//
// Two derivations the review specifically corrected, and why they are shaped this way:
//
//   * **The skill file count is recorded, not derived from the dispatch table.** The table has
//     nine rows; the installed tree carries twelve markdown files, because it also ships
//     `SKILL.md` and two `*-example.md` walkthroughs that no action dispatches. Deriving 12
//     from 9 is not possible and is not attempted.
//   * **"Need clusters" is a graph property, not an array length.** It counts nodes whose
//     total degree reaches 4, so no count of `spec.needs` produces it. It comes from
//     `healthMetrics()` — the same function the renderer injects into the page — so the pack
//     and the screenshot cannot disagree.
//
// A family with no artefact supplied **fails** its gate rather than being skipped. The whole
// point of #107 is that the pack proved two of the three artefact families while reading as
// though it had proved all of them.
//
// Usage:
//   node evals/tools/evidence-pack.mjs [options]
//
//   --skills <dir>          installed skill directory (family: repository clone)
//   --plugin-archive <dir>  extracted problem-based-srs-vX.Y.zip (family: plugin archive)
//   --canvas-archive <dir>  extracted srs-navigator-X.Y.Z.zip root (family: canvas archive)
//   --provenance <file>     open-archive-canvas.mjs --provenance output, folded in
//   --distribution <file>   `check-distribution.mjs --json` output, folded in
//   --spec <file>           specification the graph figures are derived from
//   --root <dir>            repository root
//   --json <file>           write the pack as JSON ("-" for stdout)
//   --markdown <file>       write the pack as markdown ("-" for stdout)
//   --quiet                 suppress the human transcript on stderr
//
// Exits 0 only when every gate passed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ARTIFACT_FAMILIES,
  dispatchClosure,
  linkClosure,
  readInstalledSkill,
  readmeInstallHeadings,
  walkTree,
} from "../lib/distribution-artifacts.mjs";
import { verifyPluginArchive } from "./verify-plugin-archive.mjs";
import { CANVAS_ID } from "./open-archive-canvas.mjs";
import { buildGraphData } from "../../.github/extensions/srs-navigator/lib/parser.mjs";
import { healthMetrics } from "../../.github/extensions/srs-navigator/lib/graph-metrics.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** This repository, when the caller does not name another one. */
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** The specification the graph figures come from when none is named. */
export const DEFAULT_SPEC = path.join(".spec", "crm-system.json");

/** Where the canvas suites live, for the capture-attribution table. */
export const CANVAS_TESTS = path.join(".github", "extensions", "srs-navigator", "tests");

/**
 * Why "need clusters" cannot be counted off the specification, spelled out in the pack
 * itself so a reader does not go looking for an array with that many entries in it.
 *
 * The exclusion clause is not a detail. `computeHotspots` classifies with an if/else chain,
 * so a problem with no downstream and a need with no downstream are labelled *before* the
 * hub test is reached and never become hubs however connected they are. A definition that
 * said only "degree >= 4" would over-count on any specification with a well-connected gap,
 * and the pack would then be explaining a number it does not produce.
 */
export const NEED_CLUSTER_DEFINITION =
  "a graph property: nodes whose total degree (in + out) reaches 4, excluding any already " +
  "classified as an orphaned problem or an unmet need — the hotspot classification is an " +
  "if/else chain, so those two win over hub. It is computed from the links; counting " +
  "spec.needs does not produce it, and where some other array happens to have the same " +
  "length that is a coincidence rather than a derivation.";

/* -------------------------------------------------------- family / README coverage */

/**
 * Does every install method the README documents belong to exactly one artefact family?
 *
 * The claim the pack makes is that three byte streams cover six documented methods. That is
 * only true while the mapping is total and unambiguous, so it is checked against the README
 * rather than asserted.
 *
 * `families` is a parameter rather than a closed-over constant so the "each exactly once"
 * half of the claim is testable at all: the shipped table has no duplicate, so nothing else
 * could ever exercise that branch, and an unexercised branch is not a check.
 *
 * @param {string} readme
 * @param {ReadonlyArray<{readmeHeadings:ReadonlyArray<string>}>} [families]
 * @returns {{documented:string[], claimed:string[], uncovered:string[], duplicated:string[], phantom:string[], ok:boolean}}
 */
export function familyCoverage(readme, families = ARTIFACT_FAMILIES) {
  const documented = readmeInstallHeadings(readme);
  const claimed = families.flatMap((f) => [...f.readmeHeadings]);
  const seen = new Map();
  for (const heading of claimed) seen.set(heading, (seen.get(heading) ?? 0) + 1);

  const uncovered = documented.filter((h) => !seen.has(h));
  const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([h]) => h);
  const phantom = [...seen.keys()].filter((h) => !documented.includes(h)).sort();

  return {
    documented,
    claimed: [...seen.keys()].sort(),
    uncovered,
    duplicated,
    phantom,
    ok:
      documented.length > 0 &&
      uncovered.length === 0 &&
      duplicated.length === 0 &&
      phantom.length === 0,
  };
}

/* ------------------------------------------------------------- family 1: the clone */

/**
 * Read an installed skill tree — what `npx skills add` copies, or what the plugin archive
 * ships under `skills/`.
 *
 * @param {string|null} dir
 * @returns {object}
 */
export function skillsEvidence(dir) {
  if (!dir) {
    return {
      supplied: false,
      reason:
        "no --skills given, so the repository-clone family — the one four README install " +
        "methods deliver — was not proven by this pack",
    };
  }
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    return { supplied: true, dir: resolved, exists: false, reason: `${resolved} does not exist` };
  }
  const skill = readInstalledSkill(resolved);
  const dispatch = dispatchClosure(skill);
  const links = linkClosure(resolved, { files: skill.files });
  return {
    supplied: true,
    exists: true,
    dir: resolved,
    dispatch,
    links,
    recorded: {
      files: skill.files.length,
      markdownFiles: skill.files.filter((f) => f.endsWith(".md")).length,
      referenceFiles: skill.referenceFiles.length,
      exampleFiles: skill.exampleFiles.length,
      why:
        "recorded, not derived: the dispatch table has " +
        `${dispatch.actions.length} rows while the tree carries ` +
        `${skill.files.length} files, because it also ships SKILL.md and the *-example.md ` +
        "walkthroughs that no action dispatches",
    },
  };
}

/* ------------------------------------------------------ family 2: the plugin archive */

/** @param {string|null} dir */
export function pluginArchiveEvidence(dir) {
  if (!dir) {
    return {
      supplied: false,
      reason:
        "no --plugin-archive given. This is the family that had a defect in every published " +
        "zip because nothing ever opened one, so a pack without it proves two of three.",
    };
  }
  try {
    return { supplied: true, verification: verifyPluginArchive(dir) };
  } catch (error) {
    return { supplied: true, error: error.message };
  }
}

/* ------------------------------------------------------ family 3: the canvas archive */

/**
 * The canvas archive is *served* by `open-archive-canvas.mjs`, so this checks the tree is
 * the published one and folds in that tool's provenance record rather than booting a second
 * copy of it.
 *
 * @param {string|null} dir
 * @param {object|null} provenance
 */
export function canvasArchiveEvidence(dir, provenance = null) {
  if (!dir) {
    return {
      supplied: false,
      provenance,
      reason: "no --canvas-archive given, so the canvas-archive family was not proven",
    };
  }
  const resolved = path.resolve(dir);
  const problems = [];
  if (!fs.existsSync(resolved)) problems.push(`${resolved} does not exist`);
  else {
    if (!fs.existsSync(path.join(resolved, "extension.mjs"))) {
      problems.push(
        `${resolved} contains no extension.mjs, so it is not the archive's ${CANVAS_ID}/ root`,
      );
    }
    if (fs.existsSync(path.join(resolved, "node_modules"))) {
      problems.push("node_modules is present — an install re-created what packaging removed");
    }
    if (resolved.split(path.sep).includes(".github")) {
      problems.push(
        'the path sits under ".github", the exact condition extension.mjs uses to treat ' +
          "itself as an in-repo install; this is the checkout, not the release",
      );
    }
  }
  return {
    supplied: true,
    dir: resolved,
    provenance,
    problems,
    recorded: fs.existsSync(resolved) ? { files: walkTree(resolved).length } : null,
  };
}

/* ------------------------------------------------------------------ derived figures */

/**
 * The health-bar figures, computed from the specification with the same function the page
 * runs. Derived — never read off a screenshot.
 *
 * @param {object|null} spec
 */
export function graphFigures(spec) {
  const graph = buildGraphData(spec);
  return {
    derivedBy: ".github/extensions/srs-navigator/lib/graph-metrics.mjs healthMetrics()",
    needClusters: NEED_CLUSTER_DEFINITION,
    metrics: healthMetrics(graph),
  };
}

/**
 * Which suite writes which capture, read out of the suites.
 *
 * A screenshot proves whatever the suite that wrote it was rendering. #92 attached the
 * landing page's dashboard to a claim about the *graph* health bar; attribution derived from
 * the sources cannot make that mistake.
 *
 * @param {string} testsDir
 * @returns {Array<{capture:string, writtenBy:string, line:number}>}
 */
export function captureAttribution(testsDir) {
  if (!fs.existsSync(testsDir)) return [];
  const out = [];
  for (const file of fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.mjs")).sort()) {
    const source = fs.readFileSync(path.join(testsDir, file), "utf8").split(/\r?\n/);
    source.forEach((line, index) => {
      const match = /shot\(\s*['"]([^'"]+\.png)['"]\s*\)/.exec(line);
      if (match) out.push({ capture: match[1], writtenBy: file, line: index + 1 });
    });
  }
  return out.sort((a, b) => a.capture.localeCompare(b.capture));
}

/**
 * The monitor's verdict, read from its own `--json` summary rather than from its markdown.
 *
 * `--strict` exits 0 on **zero error findings**; warnings and notices exit 0 by design. The
 * pack has to say that rather than treating an exit code as a fully readable surface.
 *
 * @param {object|null} summary
 */
export function distributionEvidence(summary) {
  if (!summary) {
    return {
      supplied: false,
      reason:
        "no --distribution given, so the third-party surfaces are unproven by this pack. " +
        "Produce it with `node scripts/check-distribution.mjs --json`.",
    };
  }
  const findings = Array.isArray(summary.findings) ? summary.findings : [];
  const unverified = Array.isArray(summary.unverified) ? summary.unverified : [];
  const bySeverity = (severity) => findings.filter((f) => f.severity === severity);
  return {
    supplied: true,
    errors: bySeverity("error").map((f) => f.id ?? f.title ?? "(unnamed)"),
    warnings: bySeverity("warning").map((f) => f.id ?? f.title ?? "(unnamed)"),
    unverified: unverified.map((u) => u.id ?? u.title ?? "(unnamed)"),
    reading:
      "zero *error* findings is the claim. Warnings and notices exit 0 by design, so each " +
      "one present is quoted and explained rather than counted as verified.",
  };
}

/* ------------------------------------------------------------------------- the pack */

function readJson(file) {
  if (!file) return null;
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

/**
 * Compose the pack.
 *
 * @param {{
 *   root?: string,
 *   skillsDir?: string|null,
 *   pluginArchiveDir?: string|null,
 *   canvasArchiveDir?: string|null,
 *   provenanceFile?: string|null,
 *   distributionFile?: string|null,
 *   specFile?: string|null,
 * }} [options]
 * @returns {object}
 */
export function buildEvidencePack(options = {}) {
  const {
    root = REPO_ROOT,
    skillsDir = null,
    pluginArchiveDir = null,
    canvasArchiveDir = null,
    provenanceFile = null,
    distributionFile = null,
    specFile = null,
    families = ARTIFACT_FAMILIES,
  } = options;

  const readmePath = path.join(root, "README.md");
  const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8") : "";
  const specPath = path.resolve(root, specFile ?? DEFAULT_SPEC);
  const spec = fs.existsSync(specPath) ? JSON.parse(fs.readFileSync(specPath, "utf8")) : null;

  const checks = [];
  const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });

  const coverage = familyCoverage(readme, families);
  const skills = skillsEvidence(skillsDir);
  const pluginArchive = pluginArchiveEvidence(pluginArchiveDir);
  const canvasArchive = canvasArchiveEvidence(canvasArchiveDir, readJson(provenanceFile));
  const distribution = distributionEvidence(readJson(distributionFile));
  const figures = graphFigures(spec);

  /* --------------------------------------------------- gates: closure properties only */

  check(
    "every-install-method-belongs-to-a-family",
    coverage.ok,
    coverage.ok
      ? `${coverage.documented.length} README install methods map onto ` +
        `${families.length} artefact families, each exactly once`
      : [
          coverage.documented.length === 0 ? "the README documents no install methods" : null,
          coverage.uncovered.length ? `uncovered: ${coverage.uncovered.join(", ")}` : null,
          coverage.duplicated.length ? `claimed twice: ${coverage.duplicated.join(", ")}` : null,
          coverage.phantom.length ? `claimed but undocumented: ${coverage.phantom.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("; "),
  );

  check(
    "repository-clone-family-is-proven",
    Boolean(skills.supplied && skills.exists && skills.dispatch?.ok && skills.links?.broken?.length === 0),
    !skills.supplied
      ? skills.reason
      : !skills.exists
        ? skills.reason
        : !skills.dispatch.ok
          ? `dispatch does not close: dispatched but not shipped ` +
            `[${skills.dispatch.unresolved.join(", ")}], shipped but unreachable ` +
            `[${skills.dispatch.undispatched.join(", ")}]`
          : skills.links.broken.length
            ? `links do not close: ${skills.links.broken
                .map((b) => `${b.file} -> ${b.target} (${b.reason})`)
                .join("; ")}`
            : `all ${skills.dispatch.actions.length} actions resolve and all ` +
              `${skills.links.links} relative links stay inside the install`,
  );

  check(
    "plugin-archive-family-is-proven",
    Boolean(pluginArchive.supplied && pluginArchive.verification?.ok),
    !pluginArchive.supplied
      ? pluginArchive.reason
      : pluginArchive.error
        ? pluginArchive.error
        : pluginArchive.verification.ok
          ? `verify-plugin-archive passed all ${pluginArchive.verification.checks.length} gates`
          : `verify-plugin-archive rejected it: ${pluginArchive.verification.checks
              .filter((c) => !c.ok)
              .map((c) => `${c.id} — ${c.detail}`)
              .join("; ")}`,
  );

  check(
    "canvas-archive-family-is-proven",
    Boolean(canvasArchive.supplied && canvasArchive.problems?.length === 0),
    !canvasArchive.supplied
      ? canvasArchive.reason
      : canvasArchive.problems.length === 0
        ? `${canvasArchive.dir} is an extracted published archive` +
          (canvasArchive.provenance
            ? `, and the capture that came from it names extension.mjs ` +
              `${String(canvasArchive.provenance.extensionSha256).slice(0, 12)}…`
            : "; no --provenance was folded in, so no capture is tied to these bytes")
        : canvasArchive.problems.join("; "),
  );

  check(
    "specification-loads",
    Boolean(spec) && figures.metrics.nodes > 0,
    spec
      ? `${specPath} yields ${figures.metrics.nodes} nodes and ${figures.metrics.links} links`
      : `${specPath} could not be read, so no graph figure in this pack is derived`,
  );

  check(
    "distribution-monitor-reports-zero-errors",
    Boolean(distribution.supplied && distribution.errors?.length === 0),
    !distribution.supplied
      ? distribution.reason
      : distribution.errors.length === 0
        ? `zero error findings; ${distribution.warnings.length} warning(s) and ` +
          `${distribution.unverified.length} notice(s) remain and are listed for explanation`
        : `error findings present: ${distribution.errors.join(", ")}`,
  );

  return {
    tool: "evidence-pack",
    builtAt: new Date().toISOString(),
    root,
    families,
    coverage,
    evidence: { skills, pluginArchive, canvasArchive, distribution },
    figures,
    captures: captureAttribution(path.join(root, CANVAS_TESTS)),
    checks,
    note:
      "Every gate above is a closure property. Every number is recorded alongside and gates " +
      "nothing, so a tenth action or a sixth need cluster cannot turn a correct product red.",
    ok: checks.every((c) => c.ok),
  };
}

/* ------------------------------------------------------------------------ rendering */

/** The transcript, for a terminal. */
export function formatReport(pack) {
  return [
    `evidence pack for ${pack.root}`,
    "",
    "gates (derived — these gate the exit code):",
    ...pack.checks.map((c) => `  ${c.ok ? "PASS" : "FAIL"}  ${c.id}: ${c.detail}`),
    "",
    "derived figures:",
    ...Object.entries(pack.figures.metrics).map(([k, v]) => `  ${k}: ${v}`),
    `  needClusters is ${pack.figures.needClusters}`,
    "",
    `captures attributed: ${pack.captures.length}`,
    "",
    `  ${pack.note}`,
    "",
    pack.ok ? "RESULT: every gate passed" : "RESULT: at least one gate failed",
  ].join("\n");
}

/** The pack, as the markdown an issue carries. */
export function formatMarkdown(pack) {
  const lines = [
    "# Evidence pack",
    "",
    `Built ${pack.builtAt} from \`${pack.root}\`.`,
    "",
    "## Gates — derived, closure properties only",
    "",
    "| Gate | Result | Detail |",
    "|---|---|---|",
    ...pack.checks.map((c) => `| \`${c.id}\` | ${c.ok ? "PASS" : "FAIL"} | ${c.detail} |`),
    "",
    "## Distribution artefact families",
    "",
    "| Family | Artefact | README methods |",
    "|---|---|---|",
    ...pack.families.map(
      (f) => `| ${f.label} | \`${f.artifact}\` | ${f.methods.length} |`,
    ),
    "",
    "## Derived figures",
    "",
    `Derived by \`${pack.figures.derivedBy}\` — the same function the page runs, so the pack`,
    "and the screenshot cannot disagree.",
    "",
    "| Figure | Value |",
    "|---|---|",
    ...Object.entries(pack.figures.metrics).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    `**Need clusters** is ${pack.figures.needClusters}`,
    "",
    "## Recorded — these gate nothing",
    "",
  ];

  const recorded = pack.evidence.skills.recorded;
  if (recorded) {
    lines.push(
      `- installed skill tree: ${recorded.files} files (${recorded.markdownFiles} markdown) — ${recorded.why}`,
    );
  }
  const archiveObserved = pack.evidence.pluginArchive.verification?.observed;
  if (archiveObserved) {
    lines.push(
      `- plugin archive: ${archiveObserved.files} files, ${archiveObserved.actions} actions, ` +
        `${archiveObserved.relativeLinks} relative links`,
    );
  }

  lines.push(
    "",
    "## Capture attribution — derived from the suites",
    "",
    "| Capture | Written by | Line |",
    "|---|---|---|",
    ...pack.captures.map((c) => `| \`${c.capture}\` | \`${c.writtenBy}\` | ${c.line} |`),
    "",
    `> ${pack.note}`,
    "",
  );
  return lines.join("\n");
}

/* --------------------------------------------------------------------------------- CLI */

export function parseArgs(argv) {
  const out = {
    root: REPO_ROOT,
    skillsDir: null,
    pluginArchiveDir: null,
    canvasArchiveDir: null,
    provenanceFile: null,
    distributionFile: null,
    specFile: null,
    json: null,
    markdown: null,
    quiet: false,
    help: false,
  };
  const value = (flag, next) => {
    if (next === undefined) throw new Error(`evidence-pack: ${flag} needs a value`);
    return next;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root") out.root = path.resolve(value(arg, argv[++i]));
    else if (arg === "--skills") out.skillsDir = value(arg, argv[++i]);
    else if (arg === "--plugin-archive") out.pluginArchiveDir = value(arg, argv[++i]);
    else if (arg === "--canvas-archive") out.canvasArchiveDir = value(arg, argv[++i]);
    else if (arg === "--provenance") out.provenanceFile = value(arg, argv[++i]);
    else if (arg === "--distribution") out.distributionFile = value(arg, argv[++i]);
    else if (arg === "--spec") out.specFile = value(arg, argv[++i]);
    else if (arg === "--json") out.json = value(arg, argv[++i]);
    else if (arg === "--markdown") out.markdown = value(arg, argv[++i]);
    else if (arg === "--quiet") out.quiet = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("-")) throw new Error(`evidence-pack: unknown option ${arg}`);
    else throw new Error(`evidence-pack: unexpected argument ${arg}`);
  }
  return out;
}

export const USAGE = `Usage: node evals/tools/evidence-pack.mjs [options]

  --skills <dir>          installed skill directory (repository-clone family)
  --plugin-archive <dir>  extracted problem-based-srs-vX.Y.zip
  --canvas-archive <dir>  extracted ${CANVAS_ID}-X.Y.Z.zip root
  --provenance <file>     open-archive-canvas.mjs --provenance output
  --distribution <file>   check-distribution.mjs --json output
  --spec <file>           specification the graph figures are derived from
  --root <dir>            repository root
  --json <file>           write the pack as JSON ("-" for stdout)
  --markdown <file>       write the pack as markdown ("-" for stdout)
  --quiet                 suppress the human transcript on stderr

A family with no artefact supplied FAILS its gate. Exits 0 only when every gate passed.`;

/**
 * The CLI as a function: argv in, exit code out, streams injected.
 *
 * Shaped this way so the command line — the one path every maintainer actually takes — is
 * reachable from a test instead of only from a subprocess. The bootstrap below is the only
 * thing that turns the returned code into an exit.
 *
 * @param {string[]} [argv]
 * @param {{stdout?:{write:Function}, stderr?:{write:Function}}} [io]
 * @returns {number} exit code
 */
export function cli(argv = process.argv.slice(2), io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;

  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }

  if (opts.help) {
    err.write(`${USAGE}\n`);
    return 0;
  }

  let pack;
  try {
    pack = buildEvidencePack(opts);
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }

  if (!opts.quiet) err.write(`${formatReport(pack)}\n`);
  const json = `${JSON.stringify(pack, null, 2)}\n`;
  if (opts.json === "-") out.write(json);
  else if (opts.json) fs.writeFileSync(opts.json, json);
  const markdown = `${formatMarkdown(pack)}\n`;
  if (opts.markdown === "-") out.write(markdown);
  else if (opts.markdown) fs.writeFileSync(opts.markdown, markdown);

  return pack.ok ? 0 : 1;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) process.exit(cli());
