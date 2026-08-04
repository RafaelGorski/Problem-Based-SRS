#!/usr/bin/env node
// Rehearse a plugin release **before** the tag exists — the step #104 says does not exist.
//
// Why this is a tool and not another paragraph in the runbook. The tag is the point of no
// return: `create-release.yml` is triggered *by* the tag push, so a failed run leaves a tag
// behind and re-pushing an existing ref emits no `push` event. `docs/release-verification.md`
// documents a pre-flight for exactly that reason, and every command in it can be skipped,
// mistyped, or run against a tree other than the one about to be tagged. #104:
//
//   "3. No rehearsal exists. The tag is the point of no return."
//
// One gap in that documented pre-flight is worse than "someone might skip a step", and it is
// the reason this file loads the archive rather than merely building it. The pre-flight
// *packages* (`build-plugin.py build`) and stops there; `verify-plugin-archive.mjs` only ever
// runs **after** publication, against the download. So the defect class #104 exists for —
// `agents/skills/` links that were wrong in *every* published zip because nothing opened one
// — could still sail past the tag and be discovered on the release page. The gate that would
// have caught it therefore has to run on this side of the push, against the bytes the
// packager just wrote. That is `packaged-archive-loads` below.
//
//   #104 — "`npx skills add` does not consume the release … add a direct download/extract
//           inspection of the published zip if the acceptance text claims the released
//           artefact was verified."
//
// Everything here is derived. Nothing restates a rule that lives somewhere else:
//
//   * the train verdict comes from `scripts/release-train.mjs`'s own `tagTrain()`, so this
//     tool cannot disagree with the gate the workflows run;
//   * the archive path and the release notes are read out of the `$GITHUB_OUTPUT` payload
//     `build-plugin.py` writes — the same channel `create-release.yml` consumes, rather than
//     a second parse of `CHANGELOG.md` that could drift from `extract_notes()`;
//   * the archive is checked by `verifyPluginArchive()`, the reader the post-publication step
//     already uses, so pre-flight and post-flight cannot answer differently.
//
// Counts are recorded, never gated, for the reason the rest of this suite gives: a snapshot
// presented as a threshold turns a correct product red on its next routine addition, and the
// number then gets edited to match reality.
//
// Usage:
//   node evals/tools/release-preflight.mjs --tag v2.6 [options]
//
//   --tag <tag>       the tag about to be pushed (required)
//   --against <ref>   the ref HEAD must equal (default: origin/main). Pass HEAD to waive it;
//                     the waiver is then visible in the record instead of being invisible.
//   --root <dir>      repository root (default: this repository)
//   --no-suites       skip the two test-suite gates (they are the slow ones)
//   --keep            keep the packaged archive and the extracted tree, and print where
//   --json <file>     write the machine-readable rehearsal record ("-" for stdout)
//   --quiet           suppress the human transcript on stderr
//
// Exit code is 0 only when every gate passed, so it composes into the release procedure:
//   node evals/tools/release-preflight.mjs --tag v2.6 --json preflight.json \
//     && gh workflow run create-release.yml --ref main -f version=2.6

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { verifyPluginArchive } from "./verify-plugin-archive.mjs";
import { readCanvasVersions, readPluginVersion, tagTrain } from "../../scripts/release-train.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** This repository, when the caller does not name another one. */
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * The only train with a "before the tag" moment to rehearse.
 *
 * This is not a scope shortcut. `release-canvas.yml` is dispatch-only and creates its tag as
 * part of `gh release create`, so a failed publish cannot strand a tag and there is no
 * irreversible step to stand in front of — its ordering is the guarantee, and that ordering
 * is guarded by `evals/tests/release-canvas-ordering.test.mjs`. `create-release.yml` is
 * triggered *by* a tag push, so its tag outlives a failed run. Rehearsing is what you do
 * before something you cannot take back.
 */
export const REHEARSABLE_TRAIN = "plugin";

/** Gate ids, in the order they run. Every one is a closure property, never a count. */
export const GATE_IDS = Object.freeze([
  "working-tree-is-clean",
  "head-is-the-commit-to-be-tagged",
  "tag-belongs-to-the-plugin-train",
  "tag-is-not-already-on-origin",
  "build-succeeds",
  "release-notes-are-not-empty",
  "packaged-archive-loads",
  "evals-suite-is-green",
  "canvas-suite-is-green",
]);

/* --------------------------------------------------------------------------- the runner */

/**
 * Normalize a `spawnSync` result into the shape every gate reads.
 *
 * Separated out because the fallbacks matter and are otherwise unreachable: a process killed
 * by a signal reports `status: null`, which would compare equal to nothing and silently read
 * as "not zero, but also not a number I can print". A rehearsal that mis-reports that as a
 * clean run is worse than one that crashes.
 *
 * @param {{status?:number|null, stdout?:string|null, stderr?:string|null, error?:Error}} result
 * @returns {{status:number, stdout:string, stderr:string}}
 */
export function normalizeResult(result) {
  if (result.error) {
    return { status: 127, stdout: result.stdout ?? "", stderr: result.error.message };
  }
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/**
 * Resolve how a command must be spawned on this platform.
 *
 * Windows cannot execute a PATH-resolved shim the way POSIX can, and both of the obvious
 * spellings fail in ways that look like a broken repository rather than a broken call:
 * `spawnSync("npm", …)` raises ENOENT, and naming the resolved `npm.cmd` directly raises
 * EINVAL, because Node refuses to `CreateProcess` a batch file. `normalizeResult` maps both
 * to 127, so `canvas-suite-is-green` failed on Windows **whatever the canvas suite did** —
 * a rehearsal reporting a red gate for a green suite, on the platform this repository is
 * maintained from.
 *
 * A blanket `shell: true` would fix npm and break something more important: a genuinely
 * missing executable would come back as the shell's "not recognized" exit code instead of
 * ENOENT, so "the tool is absent" and "the tool ran and failed" would stop being
 * distinguishable. That distinction is the reason `findPython` can tell those apart. So the
 * shell is used only where it is the only option: a command that resolves to a `.cmd`/`.bat`
 * shim. An unresolvable command is deliberately left bare, to keep its ENOENT.
 *
 * @param {string} command
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{command:string, shell:boolean}}
 */
export function resolveCommand(command, env = process.env) {
  if (process.platform !== "win32") return { command, shell: false };
  if (path.isAbsolute(command) || /[\\/]/.test(command) || path.extname(command)) {
    return { command, shell: false };
  }

  const extensions = (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean);
  const directories = (env.Path ?? env.PATH ?? "").split(path.delimiter).filter(Boolean);

  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.join(directory, command + extension);
      if (!fs.existsSync(candidate)) continue;
      // Batch shims are the only case Node cannot spawn directly.
      return /\.(cmd|bat)$/i.test(extension)
        ? { command, shell: true }
        : { command: candidate, shell: false };
    }
  }

  return { command, shell: false };
}

/**
 * Quote one argument for `cmd.exe`.
 *
 * Only reached on the shell path. Node's own warning (DEP0190) is that `args` passed
 * alongside `shell: true` are concatenated without escaping; quoting here and passing a
 * single command string means nothing is concatenated on our behalf.
 *
 * @param {string} argument
 * @returns {string}
 */
function quoteForCmd(argument) {
  if (argument.length > 0 && !/[\s"^&|<>()%!]/.test(argument)) return argument;
  return `"${argument.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1")}"`;
}

/**
 * Run one command and return its result. Injected everywhere so the rehearsal's own logic is
 * testable without a git remote, a Python interpreter or a network.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{cwd?:string, env?:Record<string,string>}} [options]
 * @returns {{status:number, stdout:string, stderr:string}}
 */
export function defaultRunner(command, args, options = {}) {
  const env = options.env ? { ...process.env, ...options.env } : process.env;
  const resolved = resolveCommand(command, env);
  const [file, argv] = resolved.shell
    ? [[resolved.command, ...args].map(quoteForCmd).join(" "), []]
    : [resolved.command, args];

  return normalizeResult(
    spawnSync(file, argv, {
      cwd: options.cwd,
      env,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      shell: resolved.shell,
      windowsHide: true,
    }),
  );
}

/**
 * The interpreter `build-plugin.py` will run under, or null when there is none.
 *
 * Probed rather than assumed: "no interpreter" and "the packager is broken" are different
 * results, and a rehearsal that reports the second for the first sends a maintainer looking
 * in the wrong place.
 *
 * @param {typeof defaultRunner} run
 * @returns {string|null}
 */
export function findPython(run) {
  return ["python3", "python"].find((exe) => run(exe, ["--version"]).status === 0) ?? null;
}

/* ------------------------------------------------------------------ deriving, not restating */

/**
 * Parse a `$GITHUB_OUTPUT` file the way Actions does, including the heredoc form
 * `build-plugin.py` uses for multi-line release notes.
 *
 * Reading this file is what makes the notes gate honest: it is the exact payload
 * `create-release.yml` consumes, so the rehearsal cannot approve notes the release would not
 * publish.
 *
 * @param {string} text
 * @returns {Record<string,string>}
 */
export function parseGithubOutput(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const heredoc = /^([^=<]+)<<(.+)$/.exec(line);
    if (heredoc) {
      const [, key, delimiter] = heredoc;
      const body = [];
      i += 1;
      while (i < lines.length && lines[i] !== delimiter) {
        body.push(lines[i]);
        i += 1;
      }
      out[key.trim()] = body.join("\n");
      continue;
    }
    const eq = line.indexOf("=");
    if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1);
  }
  return out;
}

/**
 * The `###` headings inside a release-notes body.
 *
 * Recorded, never gated. #104 asks that the notes "contain the folded 2.5 entries as well as
 * the 2.6 ones", and a *reader* can see that from the headings; a gate on them would encode
 * one release's shape into every later one.
 *
 * @param {string} notes
 * @returns {string[]}
 */
export function notesHeadings(notes) {
  return [...String(notes ?? "").matchAll(/^#{3,4} .*$/gm)].map((m) => m[0].trim());
}

/** SHA-256 of a file, so the record names the bytes the rehearsal read. */
export function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Every `evals/tests/*.test.mjs`, expanded here because spawn does not glob. */
export function evalTestFiles(root) {
  const dir = path.join(root, "evals", "tests");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".test.mjs"))
    .sort()
    .map((f) => path.join("evals", "tests", f));
}

/* ------------------------------------------------------------------------ the rehearsal */

/**
 * Rehearse the release. Returns the record; only throws for input it cannot act on at all,
 * because a caller wants the failing record rather than an exception.
 *
 * @param {{
 *   tag: string,
 *   root?: string,
 *   against?: string,
 *   suites?: boolean,
 *   keep?: boolean,
 *   run?: typeof defaultRunner,
 *   workDir?: string,
 * }} options
 * @returns {object} rehearsal record
 */
export function runPreflight(options) {
  const {
    tag,
    root = REPO_ROOT,
    against = "origin/main",
    suites = true,
    keep = false,
    run = defaultRunner,
  } = options ?? {};

  if (!tag) throw new Error("release-preflight: no --tag given");

  const pluginVersion = readPluginVersion(root);
  const verdict = tagTrain({
    tag,
    pluginVersion,
    canvasVersions: readCanvasVersions(root),
  });

  if (verdict.train !== REHEARSABLE_TRAIN) {
    throw new Error(
      `release-preflight: ${tag} classifies as ${verdict.train}, and only the ` +
        `${REHEARSABLE_TRAIN} train has a step to rehearse.\n${verdict.reason}\n` +
        "release-canvas.yml is dispatch-only and creates its tag as part of publishing, so a " +
        "failed run there cannot strand a tag — there is nothing irreversible to stand in " +
        "front of. Its ordering is guarded by evals/tests/release-canvas-ordering.test.mjs.",
    );
  }

  const version = String(tag).replace(/^v/i, "");
  const checks = [];
  const record = {
    tool: "release-preflight",
    tag,
    train: verdict.train,
    trainReason: verdict.reason,
    version,
    manifestVersion: pluginVersion,
    root,
    rehearsedAt: new Date().toISOString(),
    observed: {},
    checks,
    ok: false,
  };
  const check = (id, ok, detail) => {
    checks.push({ id, ok: Boolean(ok), detail });
    return Boolean(ok);
  };
  const git = (...args) => run("git", args, { cwd: root });

  /* ------------------------------------------------- the tree the tag will point at */

  const status = git("status", "--porcelain");
  const dirty = status.stdout.split(/\r?\n/).filter(Boolean);
  check(
    "working-tree-is-clean",
    status.status === 0 && dirty.length === 0,
    status.status !== 0
      ? `git status failed: ${status.stderr.trim()}`
      : dirty.length === 0
        ? "no uncommitted changes, so the recorded SHA describes what was rehearsed"
        : `${dirty.length} uncommitted change(s): ${dirty.slice(0, 5).join(", ")}`,
  );

  const head = git("rev-parse", "HEAD");
  const sha = head.status === 0 ? head.stdout.trim() : null;
  const target = git("rev-parse", "--verify", against);
  const targetSha = target.status === 0 ? target.stdout.trim() : null;
  check(
    "head-is-the-commit-to-be-tagged",
    Boolean(sha) && sha === targetSha,
    !sha
      ? `git rev-parse HEAD failed: ${head.stderr.trim()}`
      : !targetSha
        ? `${against} could not be resolved: ${target.stderr.trim()}`
        : sha === targetSha
          ? against === "HEAD"
            ? `waived: --against HEAD, so this compares ${sha} with itself`
            : `HEAD is ${sha}, which is ${against}`
          : `HEAD is ${sha} but ${against} is ${targetSha}`,
  );

  record.observed.sha = sha;
  record.observed.against = against;
  record.observed.branch =
    git("rev-parse", "--abbrev-ref", "HEAD").stdout.trim() || null;

  /* ------------------------------------------------------------------------ the tag */

  check(
    "tag-belongs-to-the-plugin-train",
    verdict.train === REHEARSABLE_TRAIN,
    verdict.reason,
  );

  const remote = git("ls-remote", "--tags", "origin", `refs/tags/${tag}`);
  const alreadyThere = remote.stdout.split(/\r?\n/).filter(Boolean);
  check(
    "tag-is-not-already-on-origin",
    remote.status === 0 && alreadyThere.length === 0,
    remote.status !== 0
      ? `git ls-remote failed, so absence could not be established: ${remote.stderr.trim()}`
      : alreadyThere.length === 0
        ? `${tag} is not on origin yet`
        : `${tag} is already on origin. Re-pushing it emits no push event, so nothing would ` +
          "re-run; recover by dispatch instead: " +
          `gh workflow run create-release.yml --ref ${tag} -f version=${version}`,
  );

  /* -------------------------------------------------- build, then open what it built */

  const python = findPython(run);
  const workDir = options?.workDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "release-preflight-"));
  const outDir = path.join(workDir, "dist");
  const outputFile = path.join(workDir, "github-output.txt");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputFile, "");

  let built = null;
  if (!python) {
    check(
      "build-succeeds",
      false,
      "no python3/python interpreter, so build-plugin.py could not run. The release needs " +
        "one, so this is a failure rather than a skip.",
    );
  } else {
    built = run(
      python,
      ["-B", path.join(root, "scripts", "build-plugin.py"), "build", "--version", version,
        "--out-dir", outDir],
      {
        cwd: root,
        env: { PYTHONDONTWRITEBYTECODE: "1", GITHUB_OUTPUT: outputFile },
      },
    );
    check(
      "build-succeeds",
      built.status === 0,
      built.status === 0
        ? `build-plugin.py build --version ${version} succeeded`
        : `build-plugin.py exited ${built.status}: ${(built.stderr || built.stdout).trim()}`,
    );
  }

  const outputs = parseGithubOutput(
    fs.existsSync(outputFile) ? fs.readFileSync(outputFile, "utf8") : "",
  );
  const notes = outputs.notes ?? "";
  check(
    "release-notes-are-not-empty",
    notes.trim().length > 0,
    notes.trim().length > 0
      ? `the notes create-release.yml will publish are ${notes.length} chars across ` +
        `${notesHeadings(notes).length} section(s)`
      : "build-plugin.py emitted no notes for this version, so the release would publish an " +
        "empty body. extract_notes() publishes exactly one CHANGELOG section.",
  );
  record.observed.notesHeadings = notesHeadings(notes);
  record.observed.notesChars = notes.length;

  const archivePath = outputs.artifact ?? null;
  let archiveRecord = null;
  if (!archivePath || !fs.existsSync(archivePath)) {
    check(
      "packaged-archive-loads",
      false,
      archivePath
        ? `the packager named ${archivePath}, which does not exist`
        : "the build produced no artifact to open, so the archive gate could not run",
    );
  } else {
    const extracted = path.join(workDir, "extracted");
    fs.mkdirSync(extracted, { recursive: true });
    const unzip = run(
      python,
      [
        "-B",
        "-c",
        "import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])",
        archivePath,
        extracted,
      ],
      { cwd: root, env: { PYTHONDONTWRITEBYTECODE: "1" } },
    );
    if (unzip.status !== 0) {
      check(
        "packaged-archive-loads",
        false,
        `the archive could not be extracted: ${(unzip.stderr || unzip.stdout).trim()}`,
      );
    } else {
      archiveRecord = verifyPluginArchive(extracted);
      const failed = archiveRecord.checks.filter((c) => !c.ok);
      check(
        "packaged-archive-loads",
        archiveRecord.ok,
        archiveRecord.ok
          ? `every gate in verify-plugin-archive passed against the bytes just packaged ` +
            `(${archiveRecord.checks.length} checks)`
          : `verify-plugin-archive rejected the packaged archive: ` +
            failed.map((c) => `${c.id} — ${c.detail}`).join("; "),
      );
      record.archive = {
        path: archivePath,
        bytes: fs.statSync(archivePath).size,
        sha256: sha256(archivePath),
        extractedTo: extracted,
        verification: archiveRecord,
      };
      record.observed.archive = archiveRecord.observed;
    }
  }

  /* -------------------------------------------------------------------- the suites */

  if (suites) {
    const evalsRun = run("node", ["--test", ...evalTestFiles(root)], { cwd: root });
    check(
      "evals-suite-is-green",
      evalsRun.status === 0,
      evalsRun.status === 0
        ? `node --test evals/tests/*.test.mjs passed (${evalTestFiles(root).length} files)`
        : `node --test evals/tests/*.test.mjs exited ${evalsRun.status}`,
    );

    const canvasDir = path.join(root, ".github", "extensions", "srs-navigator");
    const canvasRun = run("npm", ["test", "--silent"], { cwd: canvasDir });
    check(
      "canvas-suite-is-green",
      canvasRun.status === 0,
      canvasRun.status === 0
        ? "the srs-navigator suite passed"
        : `npm test in ${path.relative(root, canvasDir)} exited ${canvasRun.status}`,
    );
  } else {
    record.observed.suites =
      "skipped with --no-suites; the runbook's own suite commands still apply";
  }

  /* ------------------------------------------------------------------------ cleanup */

  record.workDir = workDir;
  if (!keep && !options?.workDir) {
    fs.rmSync(workDir, { recursive: true, force: true });
    if (record.archive) record.archive.extractedTo = null;
  }

  record.observed.note =
    "Observed values are recorded, not asserted. The gates above are closure properties, " +
    "which survive a tenth action; a count would not.";
  record.ok = checks.every((c) => c.ok);
  return record;
}

/* --------------------------------------------------------------------------------- CLI */

export function parseArgs(argv) {
  const out = {
    tag: null,
    root: REPO_ROOT,
    against: "origin/main",
    suites: true,
    keep: false,
    json: null,
    quiet: false,
    help: false,
  };
  const value = (flag, next) => {
    if (next === undefined) throw new Error(`release-preflight: ${flag} needs a value`);
    return next;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tag") out.tag = value(arg, argv[++i]);
    else if (arg === "--root") out.root = path.resolve(value(arg, argv[++i]));
    else if (arg === "--against") out.against = value(arg, argv[++i]);
    else if (arg === "--no-suites") out.suites = false;
    else if (arg === "--keep") out.keep = true;
    else if (arg === "--json") out.json = value(arg, argv[++i]);
    else if (arg === "--quiet") out.quiet = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("-")) throw new Error(`release-preflight: unknown option ${arg}`);
    else if (!out.tag) out.tag = arg;
    else throw new Error(`release-preflight: unexpected argument ${arg}`);
  }
  return out;
}

export const USAGE = `Usage: node evals/tools/release-preflight.mjs --tag <tag> [options]

  --tag <tag>      the tag about to be published (required)
  --against <ref>  the ref HEAD must equal (default: origin/main; HEAD waives it visibly)
  --root <dir>     repository root
  --no-suites      skip the two test-suite gates
  --keep           keep the packaged archive and extracted tree
  --json <file>    write the rehearsal record ("-" for stdout)
  --quiet          suppress the human transcript on stderr

Exits 0 only when every gate passed, so it composes:
  node evals/tools/release-preflight.mjs --tag v2.6 --json preflight.json &&
  gh workflow run create-release.yml --ref main -f version=2.6`;

/** Render the record as the transcript a release issue can carry. */
export function formatReport(record) {
  return [
    `release rehearsal: ${record.tag} (${record.train} train)`,
    `repository: ${record.root}`,
    `commit to be tagged: ${record.observed.sha ?? "(unknown)"}`,
    "",
    "gates (derived — these gate the exit code):",
    ...record.checks.map((c) => `  ${c.ok ? "PASS" : "FAIL"}  ${c.id}: ${c.detail}`),
    "",
    "observed (recorded — these gate nothing):",
    ...Object.entries(record.observed)
      .filter(([key]) => key !== "note")
      .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`),
    `  ${record.observed.note ?? ""}`,
    "",
    record.ok
      ? `RESULT: every gate passed — ${record.tag} is safe to push`
      : `RESULT: at least one gate failed — do not push ${record.tag}`,
  ].join("\n");
}

/**
 * The CLI as a function: argv in, exit code out, streams injected.
 *
 * Shaped this way so the entry point is reachable from a test rather than only from a
 * subprocess. A `main()` that calls `process.exit` directly cannot be exercised in-process,
 * which means the one path every maintainer actually takes — the command line — is the one
 * path with no coverage. This returns the code instead, and the bootstrap below is the only
 * thing that turns it into an exit.
 *
 * @param {string[]} [argv]
 * @param {{stdout?:{write:Function}, stderr?:{write:Function}, run?:typeof defaultRunner}} [io]
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

  if (opts.help || !opts.tag) {
    err.write(`${USAGE}\n`);
    return opts.help ? 0 : 1;
  }

  let record;
  try {
    record = runPreflight({ ...opts, run: io.run ?? defaultRunner });
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
