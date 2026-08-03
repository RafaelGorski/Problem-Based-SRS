#!/usr/bin/env node
// Boot the SRS Navigator canvas out of an **extracted release archive** and print the
// loopback URL it serves on, so Playwright can be pointed at the artefact a user actually
// downloads instead of at this repository.
//
// Why this exists (issue #90). Every proof of `/live` we had ran against the checkout:
// `scripts/serve-canvas.mjs` renders straight out of `lib/`, `tests/visual.test.mjs` points
// at the server that script starts, and `evals/tests/from-archive-install.test.mjs` — the
// one place that does stage a real archive — keeps the boot sequence sealed inside a
// `node --test` file. Nothing could hand a *published-archive* URL to a browser, so the
// screenshot #90 asks for could not be taken. This is that sequence, lifted out and given a
// CLI. `from-archive-install.test.mjs` imports the stub from here rather than keeping a
// second copy, so the tool cannot drift from the boot path that suite proves.
//
// The guard is the point. Aimed at `.github/extensions/srs-navigator/` this would start
// perfectly well — `extension.mjs` switches to in-repo mode on `__dirname.includes(".github")`
// — Playwright would go green, and the PNG filed as published-archive evidence would be the
// checkout. `assertExtractedArchive()` refuses that outright, because evidence that proves
// the wrong thing is worse than none.
//
// Usage:
//   node evals/tools/open-archive-canvas.mjs <extracted-archive-dir> [options]
//
//   --spec <file>        render this specification JSON instead of the archive's demo
//   --instance <id>      canvas instance id (default: open-archive-canvas)
//   --landing            keep the extension's "no spec found" landing overlay
//   --provenance <file>  write the capture-source record (see below) as JSON
//
// The URL is the only thing written to stdout, so this composes:
//   CANVAS_URL=$(node evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator)
//
// `--provenance` exists because of #105's first acceptance criterion: *"the evidence
// records the source of the capture — extracted archive path and loopback URL — so it
// cannot be confused with a checkout capture."* A PNG carries no provenance of its own, and
// `live-dotted-notation.png` looks identical whether the pixels came from the published
// archive or from `lib/`. `assertExtractedArchive()` stops the wrong tree being *booted*;
// this records which tree was booted, by path, version and content hash, so the record
// survives being copied into an issue.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

/** The single bare specifier the Copilot app injects; everything else must be in the archive. */
export const HOST_SDK_PACKAGE = "@github/copilot-sdk";

/** The canvas `/live` opens, and the directory the archive unpacks into. */
export const CANVAS_ID = "srs-navigator";

/** Fresh module graph per call, so a second open on the same directory really re-registers. */
let importCounter = 0;

/**
 * Reject anything that is not an extracted archive, and return its real path.
 *
 * The `.github` rule is not a stylistic preference: it is the exact condition
 * `extension.mjs` uses to decide it is a project install and resolve the methodology from
 * `<repoRoot>/skills/` instead of the archive's own bundled copies. A canvas booted there is
 * the repository, not the release.
 *
 * @param {string} dir directory the archive was extracted to (the `srs-navigator/` one)
 * @returns {string} the resolved real path
 */
export function assertExtractedArchive(dir) {
  if (!dir) throw new Error("open-archive-canvas: no archive directory given");
  const resolved = path.resolve(dir);

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `open-archive-canvas: no such directory: ${resolved}\n` +
        "Download and extract the release archive first, then point at the " +
        `${CANVAS_ID}/ directory inside it.`,
    );
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`open-archive-canvas: not a directory: ${resolved}`);
  }

  const real = fs.realpathSync(resolved);
  if (real.split(path.sep).includes(".github")) {
    throw new Error(
      `open-archive-canvas: refusing to boot from ${real}\n` +
        'This path sits under a ".github" directory, which is precisely the condition ' +
        "extension.mjs uses to treat itself as an in-repo project install (it then resolves " +
        "the methodology from the repository instead of the archive). Driving it would prove " +
        "the repository checkout renders, not the published archive — and a capture taken " +
        "here would be filed as evidence for something it never touched.\n" +
        "Extract the release archive outside the repository and point at the " +
        `${CANVAS_ID}/ directory it contains.`,
    );
  }

  if (!fs.existsSync(path.join(real, "extension.mjs"))) {
    throw new Error(
      `open-archive-canvas: ${real} contains no extension.mjs, so it is not an extracted ` +
        `archive.\nThe archive carries its own ${CANVAS_ID}/ root, so extracting it to ` +
        `/tmp/ext gives you /tmp/ext/${CANVAS_ID} — point at that, not at its parent.`,
    );
  }

  return real;
}

/**
 * Write the smallest possible stand-in for the host SDK into a tree's own `node_modules`,
 * and nothing else. It records the session config the extension registers, so a caller can
 * drive the same canvas and tool the Copilot app would.
 *
 * Nothing else is installed on purpose: whatever the extension needs beyond this has to come
 * out of the archive or the import throws, which is the clean-machine condition expressed as
 * code. The archive ships no `node_modules` and no lockfile, so an install step here would
 * quietly re-create the very tree the packaging work removed.
 *
 * @param {string} extensionDir the extracted archive directory
 * @returns {string} path to the installed stub package
 */
export function installHostStub(extensionDir) {
  const dir = path.join(extensionDir, "node_modules", ...HOST_SDK_PACKAGE.split("/"));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: HOST_SDK_PACKAGE,
      version: "0.0.0-test-stub",
      type: "module",
      exports: { "./extension": "./extension.mjs" },
    }),
  );
  fs.writeFileSync(
    path.join(dir, "extension.mjs"),
    [
      // Every registration is kept, so repeat imports (a second canvas from the same
      // directory) do not read the previous one's canvases. `__srsHostCapture` stays as the
      // most recent session for callers that only ever import once.
      "globalThis.__srsArchiveHostSessions ||= [];",
      "export class CanvasError extends Error {",
      "  constructor(code, message) { super(message); this.code = code; }",
      "}",
      "export function createCanvas(definition) { return definition; }",
      "export async function joinSession(config) {",
      "  const session = {",
      "    tools: config.tools || [],",
      "    canvases: config.canvases || [],",
      "    events: [],",
      "  };",
      "  globalThis.__srsArchiveHostSessions.push(session);",
      "  globalThis.__srsHostCapture = session;",
      "  return {",
      "    on(event) { session.events.push(event); },",
      "    log() {}, send() {}, workspacePath: '',",
      "  };",
      "}",
    ].join("\n"),
  );
  return dir;
}

/** Load the extension from the archive and return the session the host stub captured. */
async function loadExtension(extensionDir) {
  installHostStub(extensionDir);

  // A workspace path would send the extension looking for `.spec/` outside the archive, so
  // the graph could come from whatever directory the tool happened to be run in.
  const saved = process.env.COPILOT_WORKSPACE_PATH;
  delete process.env.COPILOT_WORKSPACE_PATH;
  try {
    const entry = pathToFileURL(path.join(extensionDir, "extension.mjs")).href;
    await import(`${entry}?openArchiveCanvas=${++importCounter}`);
  } finally {
    if (saved === undefined) delete process.env.COPILOT_WORKSPACE_PATH;
    else process.env.COPILOT_WORKSPACE_PATH = saved;
  }

  const sessions = globalThis.__srsArchiveHostSessions ?? [];
  const session = sessions[sessions.length - 1];
  if (!session) {
    throw new Error(
      `open-archive-canvas: importing ${extensionDir}/extension.mjs never reached ` +
        "joinSession — the archive is missing something it needs to load.",
    );
  }
  return session;
}

/**
 * Open the canvas from an extracted archive and return its URL.
 *
 * With no specification the archive's **own** `lib/demo-spec.mjs` is passed explicitly
 * rather than letting the extension fall through to its "no spec found" path. That path
 * renders the same demo graph but lays a landing overlay over it, which swallows the clicks
 * `tests/visual.test.mjs` makes on the health bar — so an archive-driven Playwright run
 * would fail on the overlay and read as a `/live` regression. Pass `landing: true` to
 * capture that first-run state deliberately.
 *
 * @param {string} dir extracted archive directory
 * @param {{spec?: object, specPath?: string, instanceId?: string, landing?: boolean}} [options]
 * @returns {Promise<{url: string, close: () => Promise<void>, canvas: object,
 *                    instanceId: string, extensionDir: string, specName: string|null}>}
 */
export async function openArchiveCanvas(dir, options = {}) {
  const { specPath, instanceId = "open-archive-canvas", landing = false } = options;
  const extensionDir = assertExtractedArchive(dir);
  const session = await loadExtension(extensionDir);

  const canvas = session.canvases.find((c) => c.id === CANVAS_ID);
  if (!canvas) {
    throw new Error(
      `open-archive-canvas: the archive registered no "${CANVAS_ID}" canvas; registered: ` +
        `${session.canvases.map((c) => c.id).join(", ") || "(none)"}`,
    );
  }

  let spec = options.spec ?? null;
  if (!spec && specPath) {
    spec = JSON.parse(fs.readFileSync(path.resolve(specPath), "utf8"));
  }
  if (!spec && !landing) {
    const demo = pathToFileURL(path.join(extensionDir, "lib", "demo-spec.mjs")).href;
    ({ DEMO_SPEC: spec } = await import(demo));
  }

  const result = await canvas.open({
    instanceId,
    input: spec ? { specification: spec } : {},
  });

  return {
    url: result.url,
    title: result.title,
    specName: spec?.name ?? null,
    canvas,
    instanceId,
    extensionDir,
    close: async () => {
      try {
        await canvas.onClose({ instanceId });
      } catch {
        /* already closed */
      }
    },
  };
}

/* ------------------------------------------------------------------------ provenance */

/**
 * What the Copilot app supplies and what the archive supplies are different sources, and
 * `/live` needs both. The canvas archive registers the `srs-navigator` canvas and the
 * `problem_based_srs` tool; that tool's action enum does **not** contain `live`, because
 * `/live` is a *skill* action backed by `reference/live.md`, which travels in the plugin /
 * skills install. Recorded here so an evidence pack naming "`/live` opened the graph"
 * states which install supplied the command and which supplied the panel — #105's review:
 * *"record the separately installed skill that supplies `/live`."*
 */
export const LIVE_COMMAND_SOURCES = Object.freeze({
  command: Object.freeze({
    source: "skills install (plugin archive or `npx skills add`)",
    evidence: "skills/problem-based-srs/reference/live.md",
    note: "the canvas archive's tool action enum excludes `live` — it is not the command's source",
  }),
  panel: Object.freeze({
    source: "canvas archive install",
    evidence: "srs-navigator/extension.mjs registers the `srs-navigator` canvas",
    note: "extract into the directory above the extension, e.g. ~/.copilot/extensions/",
  }),
});

/**
 * A record naming the bytes a capture came from.
 *
 * `extension.mjs`'s hash is the load-bearing field: a path can be re-pointed and a version
 * string can be stale, but two runs quoting the same digest read the same code.
 *
 * @param {{extensionDir:string, url:string, instanceId?:string, specName?:string|null}} opened
 * @returns {object}
 */
export function captureProvenance(opened) {
  const { extensionDir, url, instanceId = null, specName = null } = opened;
  const entry = path.join(extensionDir, "extension.mjs");
  let version = null;
  try {
    version = JSON.parse(fs.readFileSync(path.join(extensionDir, "package.json"), "utf8")).version;
  } catch {
    version = null;
  }
  return {
    tool: "open-archive-canvas",
    capturedAt: new Date().toISOString(),
    source: "extracted release archive",
    extensionDir,
    realPath: fs.existsSync(extensionDir) ? fs.realpathSync(extensionDir) : extensionDir,
    archiveVersion: version,
    extensionSha256: fs.existsSync(entry)
      ? crypto.createHash("sha256").update(fs.readFileSync(entry)).digest("hex")
      : null,
    url,
    instanceId,
    specName,
    liveCommandSources: LIVE_COMMAND_SOURCES,
    note:
      "This proves the published archive's runtime rendered the capture. It does not prove " +
      "the Copilot app's own extension loader accepted it — that is a separate witness, " +
      "taken in a clean profile with every project copy of the extension disabled.",
  };
}

/* --------------------------------------------------------------------------------- CLI */

function parseArgs(argv) {
  const out = {
    dir: null,
    specPath: null,
    instanceId: undefined,
    landing: false,
    provenance: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--spec") out.specPath = argv[++i];
    else if (arg === "--instance") out.instanceId = argv[++i];
    else if (arg === "--landing") out.landing = true;
    else if (arg === "--provenance") out.provenance = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("-")) throw new Error(`open-archive-canvas: unknown option ${arg}`);
    else if (!out.dir) out.dir = arg;
    else throw new Error(`open-archive-canvas: unexpected argument ${arg}`);
  }
  return out;
}

const USAGE = `Usage: node evals/tools/open-archive-canvas.mjs <extracted-archive-dir> [options]

  --spec <file>        render this specification JSON instead of the archive's demo
  --instance <id>      canvas instance id (default: open-archive-canvas)
  --landing            keep the extension's "no spec found" landing overlay
  --provenance <file>  write the capture-source record as JSON ("-" for stderr)

Prints the loopback URL on stdout and keeps serving until interrupted, so:
  CANVAS_URL=$(node evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator)`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.dir) {
    process.stderr.write(`${USAGE}\n`);
    process.exit(opts.help ? 0 : 1);
  }

  const opened = await openArchiveCanvas(opts.dir, {
    specPath: opts.specPath,
    instanceId: opts.instanceId,
    landing: opts.landing,
  });

  // stdout carries the URL and nothing else; everything human goes to stderr.
  process.stdout.write(`${opened.url}\n`);
  process.stderr.write(
    `SRS Navigator canvas serving ${opened.specName ?? "the archive's first-run view"} ` +
      `from ${opened.extensionDir}\nPress Ctrl+C to stop.\n`,
  );

  if (opts.provenance) {
    const record = `${JSON.stringify(captureProvenance(opened), null, 2)}\n`;
    if (opts.provenance === "-") process.stderr.write(record);
    else fs.writeFileSync(opts.provenance, record);
  }

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await opened.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
