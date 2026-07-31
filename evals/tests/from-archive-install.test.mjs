// A release archive that contains the right files is not the same as a release archive
// that works. #72 proved the canvas archive's *shape* — `extension.mjs` is present,
// `skills/` is present, `lib/` is present — and stopped there. Presence is not function:
// "contains extension.mjs" is not "loads on a machine with no node_modules", and
// "contains skills/" is not "the standalone skill fallback resolves once the monorepo is
// gone". Those are exactly the two properties a from-archive install depends on, and
// exactly the two nothing executed. So #69 still carried them as manual claims:
//
//   [ ] follow the install path for the canvas extension and confirm /live opens the graph
//   [ ] verify the release-archive fallback extracts to a working extension
//
// This suite runs them instead. It stages the archive into a temp directory outside the
// monorepo, gives it a stub of the host SDK as the *only* thing in its node_modules, and
// loads the extension from there. Anything else the extension needs has to come out of the
// archive or the import fails — which is the clean-machine condition, expressed as a test.
// Offline: no tar, no network, no build/.
//
// The skill-fallback assertion is the one that matters most. `loadSkillContentByFile()`
// prefers <repoRoot>/skills/problem-based-srs/ and falls back to the bundled flat copies
// "for standalone installs". Inside this repo the preferred path always exists, so every
// other test exercises the branch a standalone installer never takes.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

import { ARCHIVE_ROOT, installManifest, stage } from "../../scripts/package-extension.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

// Bare specifiers the Copilot app injects at runtime. Everything else must resolve from
// inside the archive, because `node_modules/` is deliberately not packaged.
const HOST_MODULES = new Set(["@github/copilot-sdk"]);

/* ------------------------------------------------------------------ helpers */

/** Every file in a directory tree, as forward-slash paths relative to it. */
export function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).replaceAll("\\", "/")];
  });
}

/**
 * Module specifiers a source file imports. The clause may span lines — `import {\n a \n}
 * from "pkg"` is the common shape — but it must not cross a quote or a statement end.
 * Without that bound the scanner would read `lib/renderer.mjs`, which embeds browser code
 * containing prose like `"Derive a Customer Need from " + id`, as importing ` + id`.
 */
export function importedSpecifiers(source) {
  const out = new Set();
  const patterns = [
    /^[ \t]*(?:import|export)\b(?:[^;"'`]|\r?\n)*?\bfrom\s*["']([^"']+)["']/gm, // import x from "y"
    /^[ \t]*import\s*["']([^"']+)["']/gm, //                                       import "y"
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, //                                   await import("y")
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g, //                                  require("y")
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) out.add(m[1]);
  }
  return [...out];
}

/** The npm package a specifier belongs to, or null for relative paths, builtins and URLs. */
export function packageOf(specifier) {
  if (/^[./]/.test(specifier)) return null;
  if (specifier.startsWith("node:")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(specifier)) return null; // http:, data:, file: …
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * Write the smallest possible stand-in for the host SDK into the staged tree's own
 * node_modules, and nothing else. It records the session config the extension registers so
 * the test can drive the same canvas and tool the Copilot app would.
 */
function installHostStub(stagedDir) {
  const dir = path.join(stagedDir, "node_modules", "@github", "copilot-sdk");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "@github/copilot-sdk",
      version: "0.0.0-test-stub",
      type: "module",
      exports: { "./extension": "./extension.mjs" },
    }),
  );
  fs.writeFileSync(
    path.join(dir, "extension.mjs"),
    [
      "globalThis.__srsHostCapture = { tools: [], canvases: [], events: [] };",
      "export class CanvasError extends Error {",
      "  constructor(code, message) { super(message); this.code = code; }",
      "}",
      "export function createCanvas(definition) { return definition; }",
      "export async function joinSession(config) {",
      "  globalThis.__srsHostCapture.tools = config.tools || [];",
      "  globalThis.__srsHostCapture.canvases = config.canvases || [];",
      "  return {",
      "    on(event) { globalThis.__srsHostCapture.events.push(event); },",
      "    log() {}, send() {}, workspacePath: '',",
      "  };",
      "}",
    ].join("\n"),
  );
}

/* --------------------------------------------------- the install, actually installed */

describe("a from-archive install of the canvas extension", () => {
  let tmp;
  let staged;
  let host;
  let canvas;
  let srsTool;
  const openInstances = [];
  const savedWorkspaceEnv = process.env.COPILOT_WORKSPACE_PATH;

  before(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-archive-"));
    staged = stage(tmp);
    installHostStub(staged);

    // The extension treats a path containing `.github` as an in-repo project install and
    // derives a workspace root from it. A temp dir must not look like one, or this suite
    // would be testing the monorepo path it exists to avoid.
    assert.ok(
      !staged.includes(".github"),
      `staging directory ${staged} looks like a project install; the standalone path would not be exercised`,
    );
    delete process.env.COPILOT_WORKSPACE_PATH;

    await import(pathToFileURL(path.join(staged, "extension.mjs")).href);
    host = globalThis.__srsHostCapture;
    canvas = host.canvases.find((c) => c.id === "srs-navigator");
    srsTool = host.tools.find((t) => t.name === "problem_based_srs");
  });

  after(async () => {
    for (const instanceId of openInstances) {
      try {
        await canvas.onClose({ instanceId });
      } catch {
        /* already closed */
      }
    }
    if (savedWorkspaceEnv === undefined) delete process.env.COPILOT_WORKSPACE_PATH;
    else process.env.COPILOT_WORKSPACE_PATH = savedWorkspaceEnv;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("loads with only the host SDK available", () => {
    assert.ok(
      host && Array.isArray(host.canvases),
      "importing extension.mjs from the extracted archive did not reach joinSession — " +
        "a dependency it needs is not in the archive",
    );
  });

  it("registers the canvas /live opens", () => {
    assert.ok(
      canvas,
      `the archive must register the "${ARCHIVE_ROOT}" canvas; registered: ` +
        host.canvases.map((c) => c.id).join(", "),
    );
    assert.equal(typeof canvas.open, "function");
    assert.equal(typeof canvas.onClose, "function");
  });

  it("serves the graph when the canvas is opened", async () => {
    const instanceId = "from-archive-live";
    const result = await canvas.open({ instanceId, input: {} });
    openInstances.push(instanceId);

    assert.match(
      result.url,
      /^http:\/\/127\.0\.0\.1:\d+\/$/,
      "opening the canvas must start a loopback server and return its URL",
    );

    const html = await (await fetch(result.url)).text();
    for (const id of ["CP.01", "CN.01.1", "FR.01.1.1", "NFR.01"]) {
      assert.ok(
        html.includes(id),
        `the served page is missing ${id}. "/live opens the graph" means the traceability ` +
          "chain is actually rendered, not that a page returned 200",
      );
    }
    assert.match(html, /<svg|d3\./, "the served page must carry the graph itself");
  });

  it("renders a caller-supplied specification, not just the bundled demo", async () => {
    const instanceId = "from-archive-custom";
    const spec = {
      name: "Archive Smoke Spec",
      version: "1.0",
      problems: [{ id: "CP.01", title: "Scattered Customer Information", description: "d" }],
      needs: [
        {
          id: "CN.01.1",
          title: "Centralized Customer Database",
          description: "d",
          problemIds: ["CP.01"],
        },
      ],
      functionalRequirements: [
        {
          id: "FR.01.1.1",
          title: "Contact and Company Management",
          description: "d",
          needIds: ["CN.01.1"],
        },
      ],
      nonFunctionalRequirements: [],
    };
    const result = await canvas.open({ instanceId, input: { specification: spec } });
    openInstances.push(instanceId);

    const html = await (await fetch(result.url)).text();
    assert.ok(html.includes("Archive Smoke Spec"), "the caller's spec name must reach the page");
    assert.ok(html.includes("FR.01.1.1"), "the caller's requirement must be rendered");
  });

  it("counts the same graph the extension built", async () => {
    const instanceId = "from-archive-summary";
    await canvas.open({ instanceId, input: {} });
    openInstances.push(instanceId);

    const summary = await canvas.actions
      .find((a) => a.name === "get_summary")
      .handler({ instanceId });

    const { DEMO_SPEC } = await import(
      pathToFileURL(path.join(staged, "lib", "demo-spec.mjs")).href
    );
    assert.equal(summary.problems, DEMO_SPEC.problems.length);
    assert.equal(summary.needs, DEMO_SPEC.needs.length);
    assert.equal(summary.functionalRequirements, DEMO_SPEC.functionalRequirements.length);
    assert.equal(summary.nonFunctionalRequirements, DEMO_SPEC.nonFunctionalRequirements.length);
    assert.ok(summary.totalLinks > 0, "a graph with no links has no traceability to show");
  });

  it("releases the port when the canvas closes", async () => {
    const instanceId = "from-archive-close";
    const { url } = await canvas.open({ instanceId, input: {} });
    await canvas.onClose({ instanceId });
    await assert.rejects(
      () => fetch(url),
      "onClose must shut the loopback server down; a leaked listener outlives the canvas",
    );
  });

  /* ----------------------------------------------- the standalone skill fallback */

  it("answers every methodology action from inside the archive", async () => {
    const actions = srsTool.parameters.properties.action.enum;
    assert.ok(actions.length > 0, "the methodology tool must expose its actions");
    for (const action of actions) {
      const markdown = await srsTool.handler({ action });
      assert.ok(
        typeof markdown === "string" && markdown.length > 500,
        `action "${action}" returned no methodology content from a standalone install`,
      );
    }
  });

  it("reads the bundled copies, not a path outside the extension", async () => {
    // The bundled files are byte-identical to the canonical skill, so comparing content
    // cannot tell which one was read. Poison the bundled copy instead: if the marker comes
    // back, the fallback is what served it.
    const bundled = path.join(staged, "skills", "problems.md");
    const original = fs.readFileSync(bundled, "utf8");
    const marker = "<!-- served-from-archive-marker -->";
    fs.writeFileSync(bundled, `${original}\n${marker}\n`);
    try {
      const markdown = await srsTool.handler({ action: "problems" });
      assert.ok(
        markdown.includes(marker),
        "a standalone install must resolve methodology content from the archive's own " +
          "skills/ directory. Without the bundled fallback, `/problem-based-srs` returns " +
          "nothing for anyone who installed from a release archive.",
      );
    } finally {
      fs.writeFileSync(bundled, original);
    }
  });

  it("appends caller context to the methodology content", async () => {
    const markdown = await srsTool.handler({ action: "problems", context: "Northwind CRM" });
    assert.ok(markdown.includes("Northwind CRM"));
  });
});

/* ------------------------------------------- what the archive asks the installer to run */

describe("the archive ships nothing it cannot run", () => {
  let tmp;
  let staged;
  let files;
  let manifest;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-archive-manifest-"));
    staged = stage(tmp);
    files = walk(staged);
    manifest = JSON.parse(fs.readFileSync(path.join(staged, "package.json"), "utf8"));
  });

  after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("imports nothing but node builtins and the host SDK", () => {
    const offenders = [];
    for (const file of files.filter((f) => /\.[cm]?js$/.test(f))) {
      const source = fs.readFileSync(path.join(staged, file), "utf8");
      for (const specifier of importedSpecifiers(source)) {
        const pkg = packageOf(specifier);
        if (pkg && !HOST_MODULES.has(pkg)) offenders.push(`${file} -> ${specifier}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      "these shipped files import a package the archive does not carry and the Copilot app " +
        "does not provide, so they throw on a clean install:\n  " +
        offenders.join("\n  ") +
        "\nThe archive excludes node_modules/ by design — shipping code that needs it is the " +
        "same defect as shipping the tree itself.",
    );
  });

  it("declares no dependencies it cannot satisfy", () => {
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      assert.deepEqual(
        Object.keys(manifest[field] || {}),
        [],
        `the shipped package.json declares ${field}. node_modules/ is deliberately not in ` +
          "the archive, so one `npm install` in the extracted directory rebuilds exactly the " +
          "4.3 MB Playwright tree that srs-navigator-1.1.0.zip shipped by accident. Removing " +
          "the tree while shipping the manifest that recreates it fixes nothing.",
      );
    }
  });

  it("carries no lockfile to install from", () => {
    assert.ok(
      !files.includes("package-lock.json"),
      "a lockfile in an install archive is an instruction to run npm ci",
    );
  });

  it("does not name an entry point that is missing", () => {
    if (!manifest.main) return;
    assert.ok(
      files.includes(manifest.main),
      `package.json points main at "${manifest.main}", which is not in the archive`,
    );
  });

  it("still declares the version the canvas reports", () => {
    const repoPkg = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, ".github", "extensions", "srs-navigator", "package.json"),
        "utf8",
      ),
    );
    assert.equal(
      manifest.version,
      repoPkg.version,
      "extension.mjs reads its displayed version out of this file; trimming the manifest " +
        "must not take the version with it",
    );
  });
});

/* ------------------------------------------------------------------- documentation */

describe("the install instructions match a self-contained archive", () => {
  const README = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
  const LANDING = fs.readFileSync(path.join(repoRoot, "docs", "index.html"), "utf8");

  /** Body of a markdown section, stopping at the next heading of the same or higher level. */
  function section(md, heading) {
    const lines = md.split("\n");
    const start = lines.findIndex((l) => new RegExp(`^#{1,6}\\s+${heading}\\s*$`).test(l));
    if (start === -1) return "";
    const level = lines[start].match(/^#+/)[0].length;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      const m = lines[i].match(/^(#+)\s/);
      if (m && m[1].length <= level) {
        end = i;
        break;
      }
    }
    return lines.slice(start + 1, end).join("\n");
  }

  it("tells the reader no install step follows the extract", () => {
    const canvas = section(README, "SRS Navigator canvas app");
    assert.notEqual(canvas, "", "README.md must keep an `SRS Navigator canvas app` section");
    assert.match(
      canvas,
      /no\s+`?npm install`?/i,
      "the extracted directory contains a package.json, so a reader will reasonably run " +
        "`npm install` in it. The archive is code-only and the host supplies the SDK — say so, " +
        "or the first thing a clean-machine installer does is pull a dependency tree they do " +
        "not need.",
    );
  });

  it("says the same thing on the landing page", () => {
    // One surface saying it is how the nesting bug in #72 survived: each page looked
    // correct on its own. Both surfaces carry the extract instruction, so both carry this.
    assert.match(
      LANDING,
      /no\s+<code>npm install<\/code>/i,
      "docs/index.html gives the same extract instruction as the README and must not stop " +
        "one step earlier than it does",
    );
  });
});

/* ------------------------------------------------------------------- negative canaries */

describe("negative canaries", () => {
  it("importedSpecifiers() ignores prose that merely contains the word from", () => {
    const rendererProse = 'const t = { addCN: "Derive a Customer Need from " + node.id };';
    assert.deepEqual(importedSpecifiers(rendererProse), []);
  });

  it("importedSpecifiers() finds every import form", () => {
    const src = [
      'import { a } from "playwright";',
      'export { b } from "./local.mjs";',
      'import "node:fs";',
      'await import("@scope/pkg/sub");',
      'const c = require("legacy");',
    ].join("\n");
    assert.deepEqual(importedSpecifiers(src).sort(), [
      "./local.mjs",
      "@scope/pkg/sub",
      "legacy",
      "node:fs",
      "playwright",
    ]);
  });

  it("importedSpecifiers() sees imports that span lines", () => {
    // The guard's whole job is to catch a dev script that sneaks back into the archive, and
    // a multi-line clause is the shape most of this repo's own scripts are written in — an
    // import the scanner cannot see is a dependency it cannot stop.
    const multiline = ["import {", "  chromium,", "  devices,", '} from "playwright";"'].join("\n");
    assert.deepEqual(importedSpecifiers(multiline), ["playwright"]);
    const defaultAndNamed = ['import fs, {', '  promises,', '} from "fs-extra";'].join("\n");
    assert.deepEqual(importedSpecifiers(defaultAndNamed), ["fs-extra"]);
    assert.deepEqual(importedSpecifiers('export * from "re-exported";'), ["re-exported"]);
  });

  it("packageOf() keeps only bare package specifiers", () => {
    assert.equal(packageOf("node:fs"), null);
    assert.equal(packageOf("./lib/parser.mjs"), null);
    assert.equal(packageOf("/abs/path.mjs"), null);
    assert.equal(packageOf("https://cdn.example/d3.js"), null);
    assert.equal(packageOf("playwright"), "playwright");
    assert.equal(packageOf("@github/copilot-sdk/extension"), "@github/copilot-sdk");
    assert.equal(packageOf("@ai-sdk/anthropic"), "@ai-sdk/anthropic");
  });

  it("the import guard actually fails on the script that shipped", () => {
    const recordDemo = 'import { chromium } from "playwright";';
    const offending = importedSpecifiers(recordDemo)
      .map(packageOf)
      .filter((p) => p && !HOST_MODULES.has(p));
    assert.deepEqual(
      offending,
      ["playwright"],
      "scripts/record-demo.mjs shipped in the archive importing a devDependency; the guard " +
        "must notice that exact shape",
    );
  });

  it("the host SDK is the only allowance, and it is a real package name", () => {
    assert.deepEqual([...HOST_MODULES], ["@github/copilot-sdk"]);
    assert.equal(packageOf("@github/copilot-sdk/extension"), "@github/copilot-sdk");
  });

  it("installManifest() drops every field that sends an installer to npm", () => {
    const fat = {
      name: "srs-navigator",
      version: "9.9.9",
      description: "d",
      license: "ISC",
      type: "commonjs",
      main: "index.js",
      directories: { test: "tests" },
      scripts: { test: "node --test", postinstall: "playwright install" },
      dependencies: { zod: "^3" },
      devDependencies: { playwright: "^1" },
      peerDependencies: { ai: "^4" },
    };
    assert.deepEqual(installManifest(fat), {
      name: "srs-navigator",
      version: "9.9.9",
      description: "d",
      license: "ISC",
      type: "commonjs",
    });
  });

  it("installManifest() is an allowlist, so a new dev field cannot ride along", () => {
    const withFutureField = { name: "n", version: "1.0.0", bundleDependencies: ["x"] };
    assert.deepEqual(Object.keys(installManifest(withFutureField)), ["name", "version"]);
  });
});
