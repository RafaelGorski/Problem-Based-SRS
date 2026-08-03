#!/usr/bin/env node
// Check the two preconditions that make a manual clean-profile `/live` run mean anything,
// and record the manual observation it produces — including a refusal to load.
//
// Why this exists (issue #105). The loopback harness in `open-archive-canvas.mjs` proves the
// **published archive's runtime**. #69's box names the *app*, so the second witness has to be
// the Copilot app's own extension loader — a manual run. `docs/release-verification.md`
// describes that run, and both of its preconditions are prose that nothing checks:
//
//   #105 problem 3 — "'The extensions directory is empty' is **not** a clean loader test.
//                     This repository's own workspace contributes
//                     `.github/extensions/srs-navigator` as a *project* extension. It loads
//                     alongside a user-scope install and registers the same canvas id and the
//                     same tool name **twice**."
//   #105 problem 4 — "`/live` and the panel come from **different installs** … Installing
//                     only the canvas archive and typing `/live` therefore tests a command
//                     that archive never shipped. An evidence pack has to name both installs."
//
// A maintainer who misses either produces a screenshot that looks exactly like a correct one.
// That is the failure mode the whole #69 sequence exists to end, so the preconditions are
// checked here rather than trusted.
//
// The command-source gate is derived, not restated: it reads the archive's own `ACTIONS`
// table and requires `live` to be absent from it, and requires the skills install to actually
// ship `reference/live.md`. If the archive ever does dispatch `live`, this gate changes its
// mind on its own instead of asserting a sentence that has gone stale.
//
// The load verdict is an **observation**, not a gate. `--loaded no` is a legitimate, complete
// result — #105: "If the host refuses to load it, the refusal is recorded verbatim — a failed
// load is a result." It is recorded and rendered prominently; it never silently flips the
// exit code, because the exit code is about whether the run was set up honestly.
//
// Usage:
//   node evals/tools/live-profile.mjs [options]
//
//   --extensions-dir <dir>  the profile to check (default: ~/.copilot/extensions)
//   --workspace <dir>       the workspace the app will run in (default: cwd)
//   --archive <dir>         the extracted canvas archive (its `srs-navigator/` root)
//   --skills <dir>          the installed skill directory that supplies `/live`
//   --profile-only          check only the profile and workspace; the command-source claim
//                           is then reported as NOT established rather than passed
//   --loaded <yes|no|not-run>  what the app reported (default: not-run)
//   --log <path>            the extension log path from the extension inspector
//   --note <text>           the refusal verbatim, or any observation worth keeping
//   --json <file>           write the record ("-" for stdout)
//   --quiet                 suppress the human transcript on stderr
//
// Exits 0 only when every precondition gate passed.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { LIVE_COMMAND_SOURCES, CANVAS_ID } from "./open-archive-canvas.mjs";

/** The action that opens the canvas, and the reason both installs have to be named. */
export const LIVE_ACTION = "live";

/** The reference file the skills install must ship for `/live` to exist at all. */
export const LIVE_REFERENCE = path.join("reference", `${LIVE_ACTION}.md`);

/** What the app reported. `not-run` is the honest default: nobody has looked yet. */
export const LOAD_VERDICTS = Object.freeze(["yes", "no", "not-run"]);

/** Precondition gate ids, in the order they run. */
export const GATE_IDS = Object.freeze([
  "profile-has-no-prior-install",
  "workspace-contributes-no-project-extension",
  "archive-carries-no-node-modules",
  "command-source-is-established",
]);

/** The default profile the Copilot app discovers user-scope extensions from. */
export function defaultExtensionsDir(home = os.homedir()) {
  return path.join(home, ".copilot", "extensions");
}

/**
 * The actions the canvas extension's tool dispatches, read from its source.
 *
 * Derived on purpose. The claim "`/live` does not come from the canvas archive" is only true
 * while `live` is absent from this table, so the table is what gets read — a restatement
 * would keep passing after the fact changed.
 *
 * @param {string} source contents of `extension.mjs`
 * @returns {string[]|null} null when the table cannot be found at all
 */
export function canvasActions(source) {
  const table = /const ACTIONS = \[([\s\S]*?)\];/.exec(String(source ?? ""));
  if (!table) return null;
  return [...table[1].matchAll(/action:\s*["']([a-z-]+)["']/g)].map((m) => m[1]);
}

/**
 * Every directory under `dir` whose name matches the canvas, plus anything else that looks
 * like an extension install. Missing directories are "nothing installed", not an error: a
 * profile that has never had an extension is the cleanest one there is.
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function installedExtensions(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * Project extensions the workspace contributes, and whether any of them registers this
 * canvas.
 *
 * The name is not enough to go on: a directory called something else can still register
 * `srs-navigator`, and it is the *registration* that collides. So each candidate's source is
 * read for the canvas id.
 *
 * @param {string} workspace
 * @returns {Array<{name:string, dir:string, registersCanvas:boolean}>}
 */
export function projectExtensions(workspace) {
  const dir = path.join(workspace, ".github", "extensions");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const extDir = path.join(dir, e.name);
      const entry = path.join(extDir, "extension.mjs");
      const source = fs.existsSync(entry) ? fs.readFileSync(entry, "utf8") : "";
      return {
        name: e.name,
        dir: extDir,
        registersCanvas: source.includes(CANVAS_ID),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check the preconditions and assemble the record the evidence pack carries.
 *
 * @param {{
 *   extensionsDir?: string,
 *   workspace?: string,
 *   archiveDir?: string|null,
 *   skillsDir?: string|null,
 *   profileOnly?: boolean,
 *   loaded?: string,
 *   log?: string|null,
 *   note?: string|null,
 * }} [options]
 * @returns {object}
 */
export function checkLiveProfile(options = {}) {
  const {
    extensionsDir = defaultExtensionsDir(),
    workspace = process.cwd(),
    archiveDir = null,
    skillsDir = null,
    profileOnly = false,
    loaded = "not-run",
    log = null,
    note = null,
  } = options;

  if (!LOAD_VERDICTS.includes(loaded)) {
    throw new Error(
      `live-profile: --loaded must be one of ${LOAD_VERDICTS.join(", ")}; got "${loaded}"`,
    );
  }

  const checks = [];
  const unverified = [];
  const record = {
    tool: "live-profile",
    checkedAt: new Date().toISOString(),
    extensionsDir,
    workspace: path.resolve(workspace),
    archiveDir: archiveDir ? path.resolve(archiveDir) : null,
    skillsDir: skillsDir ? path.resolve(skillsDir) : null,
    observed: {},
    checks,
    unverified,
    manual: { loaded, log, note },
    ok: false,
  };
  const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });

  /* ------------------------------------------------------------------ the profile */

  const installed = installedExtensions(extensionsDir);
  const prior = installed.filter((name) => name === CANVAS_ID);
  check(
    "profile-has-no-prior-install",
    prior.length === 0,
    prior.length === 0
      ? `${extensionsDir} contains no ${CANVAS_ID} (${installed.length} other extension(s))`
      : `${extensionsDir} already contains ${CANVAS_ID}; the run would load a previous ` +
        "install rather than the archive under test",
  );
  record.observed.profileExtensions = installed;

  /* ---------------------------------------------------------------- the workspace */

  const project = projectExtensions(record.workspace);
  const colliding = project.filter((p) => p.registersCanvas);
  check(
    "workspace-contributes-no-project-extension",
    colliding.length === 0,
    colliding.length === 0
      ? `${record.workspace} contributes no project extension registering "${CANVAS_ID}"`
      : `${record.workspace} contributes ${colliding.map((p) => p.name).join(", ")}, which ` +
        `register "${CANVAS_ID}" as a project extension. It loads alongside the user-scope ` +
        "install and registers the same canvas id and tool name twice, so the run would " +
        "test a double registration rather than the published archive. Use a neutral " +
        "workspace, or disable every project copy first.",
  );
  record.observed.projectExtensions = project.map((p) => ({
    name: p.name,
    registersCanvas: p.registersCanvas,
  }));

  /* ------------------------------------------------- the archive, if one was named */

  if (!archiveDir) {
    check(
      "archive-carries-no-node-modules",
      false,
      "no --archive given, so nothing established that the extracted archive is the one the " +
        "app will load, or that no `npm install` was run into it",
    );
  } else {
    const resolved = path.resolve(archiveDir);
    const modules = path.join(resolved, "node_modules");
    const exists = fs.existsSync(resolved);
    const clean = exists && !fs.existsSync(modules);
    check(
      "archive-carries-no-node-modules",
      clean,
      !exists
        ? `${resolved} does not exist`
        : clean
          ? `${resolved} carries no node_modules, so it is the archive as published`
          : `${resolved} contains node_modules — an install step re-created the tree the ` +
            "packaging work removed, so this is no longer the published archive",
    );
    record.observed.archiveEntries = exists
      ? fs.readdirSync(resolved).sort()
      : [];
  }

  /* ------------------------------------------------------- which install supplies what */

  record.commandSources = LIVE_COMMAND_SOURCES;

  if (profileOnly) {
    unverified.push({
      id: "command-source-not-established",
      detail:
        "--profile-only was used, so neither install was read. The pack must still name " +
        `which install supplies /${LIVE_ACTION} (the skill) and which supplies the panel ` +
        "(the canvas archive); this run did not establish it.",
    });
  } else {
    const entry = archiveDir ? path.join(path.resolve(archiveDir), "extension.mjs") : null;
    const actions = entry && fs.existsSync(entry)
      ? canvasActions(fs.readFileSync(entry, "utf8"))
      : null;
    const referencePath = skillsDir ? path.join(path.resolve(skillsDir), LIVE_REFERENCE) : null;
    const shipsReference = Boolean(referencePath && fs.existsSync(referencePath));

    const reasons = [];
    if (actions === null) {
      reasons.push(
        entry
          ? `the ACTIONS table could not be read from ${entry}`
          : "no --archive given, so the canvas archive's action enum was never read",
      );
    } else if (actions.includes(LIVE_ACTION)) {
      reasons.push(
        `the archive now dispatches \`${LIVE_ACTION}\` (${actions.length} actions), so the ` +
          "two-install claim in the runbook is stale and must be corrected before this " +
          "evidence is filed",
      );
    }
    if (!shipsReference) {
      reasons.push(
        referencePath
          ? `the skills install does not ship ${LIVE_REFERENCE} (looked in ${referencePath})`
          : `no --skills given, so nothing established where /${LIVE_ACTION} comes from`,
      );
    }

    check(
      "command-source-is-established",
      reasons.length === 0,
      reasons.length === 0
        ? `/${LIVE_ACTION} comes from the skills install (${LIVE_REFERENCE}); the panel comes ` +
          `from the canvas archive, whose ${actions.length}-action enum excludes ` +
          `\`${LIVE_ACTION}\``
        : reasons.join("; "),
    );
    record.observed.canvasActions = actions;
    record.observed.skillShipsLiveReference = shipsReference;
  }

  record.observed.note =
    "The load verdict is an observation, not a gate: a refusal to load is a result, and " +
    "the loopback capture answers a different question and cannot be substituted for it.";
  record.ok = checks.every((c) => c.ok);
  return record;
}

/* --------------------------------------------------------------------------------- CLI */

export function parseArgs(argv) {
  const out = {
    extensionsDir: defaultExtensionsDir(),
    workspace: process.cwd(),
    archiveDir: null,
    skillsDir: null,
    profileOnly: false,
    loaded: "not-run",
    log: null,
    note: null,
    json: null,
    quiet: false,
    help: false,
  };
  const value = (flag, next) => {
    if (next === undefined) throw new Error(`live-profile: ${flag} needs a value`);
    return next;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--extensions-dir") out.extensionsDir = value(arg, argv[++i]);
    else if (arg === "--workspace") out.workspace = value(arg, argv[++i]);
    else if (arg === "--archive") out.archiveDir = value(arg, argv[++i]);
    else if (arg === "--skills") out.skillsDir = value(arg, argv[++i]);
    else if (arg === "--profile-only") out.profileOnly = true;
    else if (arg === "--loaded") out.loaded = value(arg, argv[++i]);
    else if (arg === "--log") out.log = value(arg, argv[++i]);
    else if (arg === "--note") out.note = value(arg, argv[++i]);
    else if (arg === "--json") out.json = value(arg, argv[++i]);
    else if (arg === "--quiet") out.quiet = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("-")) throw new Error(`live-profile: unknown option ${arg}`);
    else throw new Error(`live-profile: unexpected argument ${arg}`);
  }
  return out;
}

export const USAGE = `Usage: node evals/tools/live-profile.mjs [options]

  --extensions-dir <dir>     profile to check (default: ~/.copilot/extensions)
  --workspace <dir>          workspace the app will run in (default: cwd)
  --archive <dir>            extracted canvas archive (its ${CANVAS_ID}/ root)
  --skills <dir>             installed skill directory that supplies /${LIVE_ACTION}
  --profile-only             skip the command-source claim, and say it was not established
  --loaded <yes|no|not-run>  what the app reported; a refusal is a result
  --log <path>               extension log path from the extension inspector
  --note <text>              the refusal verbatim, or any observation worth keeping
  --json <file>              write the record ("-" for stdout)
  --quiet                    suppress the human transcript on stderr

Exits 0 only when every precondition gate passed.`;

/** Render the record as the transcript #105 attaches. */
export function formatReport(record) {
  const verdict = {
    yes: "the app loaded the archive",
    no: "the app REFUSED to load the archive — recorded as a result",
    "not-run": "the app has not been run yet",
  }[record.manual.loaded];

  return [
    `clean-profile check for /${LIVE_ACTION}`,
    `profile:   ${record.extensionsDir}`,
    `workspace: ${record.workspace}`,
    `archive:   ${record.archiveDir ?? "(not given)"}`,
    `skills:    ${record.skillsDir ?? "(not given)"}`,
    "",
    "preconditions (derived — these gate the exit code):",
    ...record.checks.map((c) => `  ${c.ok ? "PASS" : "FAIL"}  ${c.id}: ${c.detail}`),
    ...(record.unverified.length
      ? ["", "not established this run:", ...record.unverified.map((u) => `  ${u.id}: ${u.detail}`)]
      : []),
    "",
    "manual observation (recorded — this gates nothing):",
    `  loaded: ${record.manual.loaded} — ${verdict}`,
    `  log:    ${record.manual.log ?? "(none)"}`,
    `  note:   ${record.manual.note ?? "(none)"}`,
    "",
    record.ok
      ? `RESULT: every precondition passed; the app reported: ${verdict}`
      : "RESULT: at least one precondition failed — a capture taken now would not prove what " +
        "it claims",
  ].join("\n");
}

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

  let record;
  try {
    record = checkLiveProfile(opts);
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }

  if (!opts.quiet) err.write(`${formatReport(record)}\n`);
  const json = `${JSON.stringify(record, null, 2)}\n`;
  if (opts.json === "-") out.write(json);
  else if (opts.json) fs.writeFileSync(opts.json, json);

  return record.ok ? 0 : 1;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) process.exit(cli());
