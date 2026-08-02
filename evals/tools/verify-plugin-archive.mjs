#!/usr/bin/env node
// Load the **published** plugin release archive as an installer would, and print what it
// found. The third artefact family, and the one nothing had ever opened.
//
// Why this exists (issues #104, #107). `npx skills add` clones the repository; the canvas
// tooling opens the canvas archive. `problem-based-srs-vX.Y.zip` — the only asset attached
// to a methodology release — had no reader at all, and it shipped broken: two links that
// resolved to `agents/skills/`, a directory that exists nowhere.
// `evals/tests/plugin-archive-install.test.mjs` closed half of that by reading what the
// *packager stages*. This reads what the *release serves*, which is a different tree the
// moment a workflow packages a ref that is not the one under test.
//
// Two review notes shape what it does, and both are about not proving the wrong thing:
//
//   #104 — "`grep agents/skills/` checks one known defect, not link closure. Run the
//           existing full relative-link validator against the downloaded zip."
//   #107 — "replace archive download/listing with an actual plugin load."
//
// So this does not list entries and match a string. It resolves the manifest, resolves
// every skill the tree ships, parses each orchestrator's dispatch table, and requires
// every action to land on a file **in the extracted tree** — then resolves every relative
// link in every shipped markdown file against that same tree.
//
// Counts are recorded, never gated. A file total is a snapshot of one release; gating on
// it makes the next routine addition fail a correct archive, and the number then gets
// edited to match reality — which is how an acceptance criterion becomes a formality. The
// gates are closure properties, which stay true as the tree grows.
//
// Usage:
//   node evals/tools/verify-plugin-archive.mjs <extracted-dir> [--json <file>] [--quiet]
//
//   <extracted-dir>  the archive's own `problem-based-srs/` root, or the directory it was
//                    extracted into (the root is found either way)
//   --json <file>    write the machine-readable evidence record here ("-" for stdout)
//   --quiet          suppress the human transcript on stderr
//
// Exit code is 0 only when every derived gate passed, so it composes into a release gate:
//   gh release download v2.6 -p 'problem-based-srs-*.zip' -D /tmp/pbsrs
//   unzip -q /tmp/pbsrs/problem-based-srs-v2.6.zip -d /tmp/pbsrs/extracted
//   node evals/tools/verify-plugin-archive.mjs /tmp/pbsrs/extracted --json evidence.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  ARTIFACT_FAMILIES,
  dispatchClosure,
  linkClosure,
  readInstalledSkill,
  walkTree,
} from "../lib/distribution-artifacts.mjs";

/** The manifest that makes an extracted directory a plugin rather than a folder of files. */
export const MANIFEST = ".claude-plugin/plugin.json";

/**
 * Find the plugin root: the directory containing the manifest.
 *
 * The archive carries its own `problem-based-srs/` root, so `unzip -d /tmp/x` gives
 * `/tmp/x/problem-based-srs`. Accepting either saves the caller a guess, and refusing
 * anything with no manifest keeps "I extracted it somewhere else" from reading as "the
 * archive is empty".
 *
 * @param {string} dir
 * @returns {string} absolute path to the plugin root
 */
export function findPluginRoot(dir) {
  if (!dir) throw new Error("verify-plugin-archive: no directory given");
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`verify-plugin-archive: no such directory: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`verify-plugin-archive: not a directory: ${resolved}`);
  }
  if (fs.existsSync(path.join(resolved, MANIFEST))) return resolved;

  const nested = fs
    .readdirSync(resolved, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(resolved, e.name))
    .filter((d) => fs.existsSync(path.join(d, MANIFEST)));

  if (nested.length === 1) return nested[0];
  if (nested.length > 1) {
    throw new Error(
      `verify-plugin-archive: ${resolved} contains ${nested.length} plugin roots ` +
        `(${nested.map((d) => path.basename(d)).join(", ")}); point at one of them`,
    );
  }
  throw new Error(
    `verify-plugin-archive: no ${MANIFEST} under ${resolved}\n` +
      "The archive carries its own root directory, so extracting it to /tmp/x gives you " +
      "/tmp/x/<plugin-name> — point at either.",
  );
}

/** SHA-256 of a file, so an evidence record names the bytes it read. */
export function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/**
 * Load the plugin out of an extracted archive and check the properties an installer
 * depends on. Returns the evidence record; never throws for a *failed check*, only for a
 * tree it cannot read at all — a caller wants the failing record, not an exception.
 *
 * @param {string} dir
 * @returns {object} evidence record
 */
export function verifyPluginArchive(dir) {
  const root = findPluginRoot(dir);
  const files = walkTree(root);
  const checks = [];
  const record = {
    tool: "verify-plugin-archive",
    family: ARTIFACT_FAMILIES.find((f) => f.id === "plugin-archive"),
    root,
    verifiedAt: new Date().toISOString(),
    observed: {},
    checks,
    ok: false,
  };

  const check = (id, ok, detail) => {
    checks.push({ id, ok: Boolean(ok), detail });
    return Boolean(ok);
  };

  /* ---------------------------------------------------------------- the manifest loads */

  const manifestPath = path.join(root, MANIFEST);
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    check("manifest-parses", false, `${MANIFEST} is not readable JSON: ${error.message}`);
    record.observed.files = files.length;
    return record;
  }
  check("manifest-parses", true, `${MANIFEST} parsed`);
  check(
    "manifest-identifies-the-plugin",
    Boolean(manifest.name) && Boolean(manifest.version),
    `name=${manifest.name ?? "(none)"} version=${manifest.version ?? "(none)"}`,
  );
  check(
    "archive-root-matches-the-manifest-name",
    path.basename(root) === manifest.name,
    `extracted root is ${path.basename(root)}; the manifest declares ${manifest.name}`,
  );

  record.manifest = {
    name: manifest.name ?? null,
    version: manifest.version ?? null,
    sha256: sha256(manifestPath),
  };

  /* ------------------------------------------------------------- the skills are loaded */

  const skillsDir = path.join(root, "skills");
  const slugs = fs.existsSync(skillsDir)
    ? fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];

  check("ships-at-least-one-skill", slugs.length > 0, `skills/: ${slugs.join(", ") || "(none)"}`);

  record.skills = slugs.map((slug) => {
    const skill = readInstalledSkill(path.join(skillsDir, slug));
    const closure = dispatchClosure(skill);

    check(
      `skill-${slug}-has-an-orchestrator`,
      skill.skillMd !== null,
      `skills/${slug}/SKILL.md ${skill.skillMd === null ? "is missing" : "loaded"}`,
    );
    check(
      `skill-${slug}-dispatch-resolves`,
      closure.ok,
      closure.ok
        ? `all ${closure.actions.length} actions resolve to a reference file in the archive`
        : [
            closure.unresolved.length
              ? `dispatched but not shipped: ${closure.unresolved.join(", ")}`
              : null,
            closure.undispatched.length
              ? `shipped but unreachable: ${closure.undispatched.join(", ")}`
              : null,
            closure.actions.length === 0 ? "the dispatch table parsed as empty" : null,
            closure.shipped.length === 0 ? "no reference files shipped" : null,
          ]
            .filter(Boolean)
            .join("; "),
    );

    return {
      slug,
      files: skill.files.length,
      actions: closure.actions,
      referenceFiles: skill.referenceFiles.length,
      exampleFiles: skill.exampleFiles.length,
      dispatch: closure,
    };
  });

  /* --------------------------------------------------------- every link stays inside it */

  const links = linkClosure(root, { files });
  check(
    "relative-links-resolve-inside-the-archive",
    links.broken.length === 0,
    links.broken.length === 0
      ? `${links.links} relative links across ${links.checked} markdown files all resolve`
      : links.broken.map((b) => `${b.file} -> ${b.target} (${b.reason})`).join("; "),
  );
  record.links = links;

  /* ---------------------------------------------------- nothing developmental shipped */

  const unwanted = files.filter(
    (f) =>
      /(^|\/)(node_modules|evals|tests|scripts|dist|build)\//.test(f) ||
      /(^|\/)(package-lock\.json|\.gitignore)$/.test(f),
  );
  check(
    "carries-no-development-tooling",
    unwanted.length === 0,
    unwanted.length === 0 ? "no node_modules, tests, scripts or lockfiles" : unwanted.join(", "),
  );

  /* ------------------------------------------------------- recorded, deliberately ungated */

  record.observed = {
    files: files.length,
    markdownFiles: files.filter((f) => f.endsWith(".md")).length,
    skills: slugs.length,
    actions: record.skills.reduce((n, s) => n + s.actions.length, 0),
    relativeLinks: links.links,
    note:
      "Observed values are recorded, not asserted. The gates above are closure properties, " +
      "which survive a tenth action; a count would not.",
  };

  record.ok = checks.every((c) => c.ok);
  return record;
}

/* --------------------------------------------------------------------------------- CLI */

export function parseArgs(argv) {
  const out = { dir: null, json: null, quiet: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") out.json = argv[++i];
    else if (arg === "--quiet") out.quiet = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("-")) throw new Error(`verify-plugin-archive: unknown option ${arg}`);
    else if (!out.dir) out.dir = arg;
    else throw new Error(`verify-plugin-archive: unexpected argument ${arg}`);
  }
  return out;
}

export const USAGE = `Usage: node evals/tools/verify-plugin-archive.mjs <extracted-dir> [options]

  --json <file>   write the machine-readable evidence record ("-" for stdout)
  --quiet         suppress the human transcript on stderr

Exits 0 only when every derived gate passed.`;

/** Render the evidence record as the transcript an issue can carry. */
export function formatReport(record) {
  const lines = [
    `plugin archive: ${record.root}`,
    record.manifest
      ? `manifest: ${record.manifest.name} ${record.manifest.version} (sha256 ${record.manifest.sha256.slice(0, 12)}…)`
      : "manifest: unreadable",
    `artifact family: ${record.family.label} — ${record.family.artifact}`,
    "",
    "checks (derived — these gate the exit code):",
    ...record.checks.map((c) => `  ${c.ok ? "PASS" : "FAIL"}  ${c.id}: ${c.detail}`),
    "",
    "observed (recorded — these gate nothing):",
    ...Object.entries(record.observed)
      .filter(([k]) => k !== "note")
      .map(([k, v]) => `  ${k}: ${v}`),
    `  ${record.observed.note ?? ""}`,
    "",
    record.ok ? "RESULT: every gate passed" : "RESULT: at least one gate failed",
  ];
  return lines.join("\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.dir) {
    process.stderr.write(`${USAGE}\n`);
    process.exit(opts.help ? 0 : 1);
  }

  const record = verifyPluginArchive(opts.dir);

  if (!opts.quiet) process.stderr.write(`${formatReport(record)}\n`);
  if (opts.json === "-") process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  else if (opts.json) fs.writeFileSync(opts.json, `${JSON.stringify(record, null, 2)}\n`);

  process.exit(record.ok ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
