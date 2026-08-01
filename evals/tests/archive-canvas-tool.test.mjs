// The canvas has never been driven from the artefact a user downloads.
//
// Every existing proof of `/live` runs against the repository: `serve-canvas.mjs` renders
// out of `lib/`, `visual.test.mjs` points at the server that script starts, and
// `from-archive-install.test.mjs` — which does stage a real archive — keeps the whole
// sequence locked inside a `node --test` file as a private helper. So the one thing #90
// asks for, *"Playwright screenshots prove the graph renders from the extracted published
// archive"*, had no way to happen: nothing outside the test runner could produce a URL
// pointing at an archive-booted canvas.
//
// `evals/tools/open-archive-canvas.mjs` is that missing half. This suite is what makes it
// trustworthy, and the assertion that matters most is not "it boots" — it is **that it
// refuses to boot the wrong thing**. Point the tool at `.github/extensions/srs-navigator/`
// and it would start happily, Playwright would go green, and the PNG attached to #90 as
// *published-archive evidence* would be the monorepo checkout, complete with its
// `node_modules` and its in-repo skill path. That is the same defect #69 kept re-committing
// under a different name: presence standing in for function. A tool that can prove the wrong
// thing silently is worse than no tool, so the refusal is tested before the success.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { stage } from "../../scripts/package-extension.mjs";
import {
  openArchiveCanvas,
  installHostStub,
  assertExtractedArchive,
  HOST_SDK_PACKAGE,
} from "../tools/open-archive-canvas.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const TOOL = path.join(repoRoot, "evals", "tools", "open-archive-canvas.mjs");
const EXT_DIR = path.join(repoRoot, ".github", "extensions", "srs-navigator");

/** The canonical chain the demo spec ships; #90 requires it visible in the rendered graph. */
const CANONICAL_CHAIN = ["CP.01", "CN.01.1", "FR.01.1.1", "NFR.01"];

/** Node ids the renderer embedded in the served page. */
function renderedIds(html) {
  return [...new Set([...html.matchAll(/"id":"((?:CP|CN|FR|NFR)\.[0-9.]+)"/g)].map((m) => m[1]))];
}

/** Stage a real archive into a temp directory that cannot be mistaken for the checkout. */
function stageArchive(prefix) {
  const tmp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), prefix));
  const dir = stage(tmp);
  assert.ok(
    !dir.split(path.sep).includes(".github"),
    `staging root ${dir} looks like a project install; this suite would test the checkout`,
  );
  return { tmp, dir };
}

/* ------------------------------------------------------- it refuses to prove the wrong thing */

describe("open-archive-canvas refuses anything that is not an extracted archive", () => {
  it("rejects the monorepo checkout, naming what the run would have proven", () => {
    let error;
    try {
      assertExtractedArchive(EXT_DIR);
    } catch (e) {
      error = e;
    }
    assert.ok(
      error,
      "pointing the tool at .github/extensions/srs-navigator must fail. extension.mjs " +
        'switches to in-repo mode on `__dirname.includes(".github")`, so booting it there ' +
        "renders the checkout — and a screenshot of the checkout attached as published-" +
        "archive evidence is exactly the substitution #69 kept making.",
    );
    assert.match(
      error.message,
      /\.github/,
      "the error must name the condition that triggered it so it is actionable",
    );
    assert.match(
      error.message,
      /checkout|repositor/i,
      "the error must say the run would have proven the checkout, not the published archive",
    );
  });

  it("rejects a path that does not exist", () => {
    const missing = path.join(os.tmpdir(), "pbsrs-does-not-exist-ever");
    assert.throws(
      () => assertExtractedArchive(missing),
      (e) => e.message.includes(missing),
      "the error must name the path the caller passed",
    );
  });

  it("rejects a directory with no extension.mjs, and says where to point instead", () => {
    const tmp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "pbsrs-empty-"));
    try {
      let error;
      try {
        assertExtractedArchive(tmp);
      } catch (e) {
        error = e;
      }
      assert.ok(error, "a directory without extension.mjs is not an extracted archive");
      assert.match(error.message, /extension\.mjs/);
      assert.match(
        error.message,
        /srs-navigator/,
        "the archive carries its own srs-navigator/ root, so the commonest mistake is " +
          "pointing at the extract target rather than the directory inside it — say so",
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("accepts a genuinely extracted archive", () => {
    const { tmp, dir } = stageArchive("pbsrs-accept-");
    try {
      assert.equal(assertExtractedArchive(dir), fs.realpathSync(dir));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

/* ------------------------------------------------------------ it boots the published shape */

describe("open-archive-canvas serves the graph out of an extracted archive", () => {
  let tmp;
  let dir;
  let opened;
  let html;

  before(async () => {
    ({ tmp, dir } = stageArchive("pbsrs-open-"));
    opened = await openArchiveCanvas(dir, { instanceId: "archive-canvas-tool" });
    html = await (await fetch(opened.url)).text();
  });

  after(async () => {
    await opened?.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns a loopback URL Playwright can be pointed at", () => {
    assert.match(
      opened.url,
      /^http:\/\/127\.0\.0\.1:\d+\/$/,
      "CANVAS_URL is consumed verbatim by playwright.config.mjs; anything else is unusable",
    );
  });

  it("renders the graph itself, not merely a page that returned 200", () => {
    assert.match(html, /<svg|d3\./);
    for (const id of CANONICAL_CHAIN) {
      assert.ok(html.includes(id), `the served page is missing ${id}`);
    }
  });

  it("renders the whole demo spec the visual suite counts", () => {
    assert.equal(
      renderedIds(html).length,
      29,
      "visual.test.mjs asserts 29 rendered nodes. If the archive serves a different graph, " +
        "an archive-driven Playwright run fails for a reason that has nothing to do with /live",
    );
  });

  it("renders zero legacy hyphen identifiers", () => {
    assert.deepEqual(
      [...new Set(html.match(/\b(?:CP|CN|FR|NFR)-\d+/g) ?? [])],
      [],
      "#90 requires the archive-driven capture to show canonical dotted IDs only",
    );
  });

  it("does not raise the first-run landing overlay over the graph", () => {
    assert.match(
      html,
      /showLandingOnLoad\s*=\s*false/,
      "opened with no input the extension finds no .spec/ folder and lays a landing overlay " +
        "over the demo graph. visual.test.mjs clicks the health bar, the overlay swallows " +
        "those clicks, and an archive-driven run would fail as if /live had regressed. The " +
        "tool therefore passes the archive's own lib/demo-spec.mjs explicitly — still " +
        "entirely from the archive, but rendered through the same path serve-canvas.mjs uses.",
    );
  });

  it("can still capture that first-run view when asked for it", async () => {
    const first = await openArchiveCanvas(dir, {
      instanceId: "archive-canvas-landing",
      landing: true,
    });
    try {
      const page = await (await fetch(first.url)).text();
      assert.match(page, /showLandingOnLoad\s*=\s*true/);
    } finally {
      await first.close();
    }
  });

  it("needs no npm install: the only thing added is the host SDK stub", () => {
    const modules = path.join(dir, "node_modules");
    const scoped = HOST_SDK_PACKAGE.split("/");
    assert.deepEqual(fs.readdirSync(modules), [scoped[0]]);
    assert.deepEqual(fs.readdirSync(path.join(modules, scoped[0])), [scoped[1]]);
  });

  it("renders a caller-supplied specification when one is given", async () => {
    const spec = {
      name: "Archive Tool Spec",
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
    const custom = await openArchiveCanvas(dir, { instanceId: "archive-canvas-spec", spec });
    try {
      const page = await (await fetch(custom.url)).text();
      assert.ok(page.includes("Archive Tool Spec"));
      assert.ok(page.includes("FR.01.1.1"));
    } finally {
      await custom.close();
    }
  });

  it("releases the port when closed, so a capture run leaves nothing listening", async () => {
    const short = await openArchiveCanvas(dir, { instanceId: "archive-canvas-close" });
    await short.close();
    await assert.rejects(() => fetch(short.url));
  });
});

/* ------------------------------------------------------------------------- the CLI contract */

describe("the open-archive-canvas CLI", () => {
  let tmp;
  let dir;

  before(() => ({ tmp, dir } = stageArchive("pbsrs-cli-")));
  after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  /** Run the CLI, exposing its streams and a lazily-awaited first stdout line. */
  function runCli(args) {
    const child = spawn(process.execPath, [TOOL, ...args], { cwd: repoRoot });
    let out = "";
    let err = "";
    let exited = null;
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("exit", (code) => (exited = code));

    // Created on demand: a promise built up front would still be pending when the
    // bad-path test ends, and its rejection would surface as an unhandledRejection.
    const firstLine = () =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`no stdout line in 30s. stderr:\n${err}`)),
          30000,
        );
        const check = () => {
          const nl = out.indexOf("\n");
          if (nl === -1) return false;
          clearTimeout(timer);
          resolve(out.slice(0, nl).trim());
          return true;
        };
        if (check()) return;
        child.stdout.on("data", check);
        child.on("exit", (code) => {
          clearTimeout(timer);
          reject(new Error(`exited ${code} before printing a URL. stderr:\n${err}`));
        });
      });

    return {
      child,
      firstLine,
      stdout: () => out,
      stderr: () => err,
      exit: () =>
        exited !== null ? Promise.resolve(exited) : new Promise((r) => child.on("exit", r)),
    };
  }

  it("prints exactly one loopback URL on stdout and keeps serving", async () => {
    const cli = runCli([dir]);
    try {
      const url = await cli.firstLine();
      assert.match(
        url,
        /^http:\/\/127\.0\.0\.1:\d+\/$/,
        "the documented usage is CANVAS_URL=$(node evals/tools/open-archive-canvas.mjs …), " +
          "so stdout must carry the URL and nothing else",
      );
      const page = await (await fetch(url)).text();
      assert.ok(page.includes("FR.01.1.1"), "the process must still be serving after it prints");
      assert.equal(
        cli.stdout().trim(),
        url,
        "stdout must carry the URL and nothing else, or command substitution captures noise",
      );
    } finally {
      cli.child.kill();
      await cli.exit();
    }
  });

  it("exits non-zero with a diagnostic when pointed somewhere unusable", async () => {
    const bogus = path.join(os.tmpdir(), "pbsrs-cli-nowhere");
    const cli = runCli([bogus]);
    const code = await cli.exit();
    assert.notEqual(code, 0, "a silent success on a bad path would produce empty evidence");
    assert.match(cli.stderr(), new RegExp(bogus.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")));
  });
});

/* ------------------------------------------- the harness the tool is meant to plug into */

describe("the archive-driven capture is actually wired to Playwright", () => {
  const config = fs.readFileSync(path.join(EXT_DIR, "playwright.config.mjs"), "utf8");
  const visual = fs.readFileSync(path.join(EXT_DIR, "tests", "visual.test.mjs"), "utf8");

  it("lets CANVAS_URL choose the target", () => {
    assert.match(config, /process\.env\.CANVAS_URL/);
    assert.match(visual, /process\.env\.CANVAS_URL/);
  });

  it("does not start its own canvas server when CANVAS_URL is set", () => {
    assert.match(
      config,
      /if\s*\(!process\.env\.CANVAS_URL\)/,
      "if the config started serve-canvas.mjs anyway, an archive-driven run would race the " +
        "repo checkout for the port and could screenshot the checkout instead",
    );
  });
});

/* --------------------------------------------------- the tool is the sequence, not a copy */

describe("the tool is the extraction the from-archive suite already proves", () => {
  const suite = fs.readFileSync(path.join(here, "from-archive-install.test.mjs"), "utf8");

  it("supplies the host SDK stub that suite installs", () => {
    assert.match(
      suite,
      /from\s+"\.\.\/tools\/open-archive-canvas\.mjs"/,
      "from-archive-install.test.mjs must import the stub from the tool. Two copies of the " +
        "clean-machine boot sequence means the tool can drift from the one that is proven, " +
        "and the drift would show up only in evidence nobody re-checks.",
    );
    assert.doesNotMatch(
      suite,
      /^\s*function\s+installHostStub\b/m,
      "the local copy of installHostStub must be gone, not merely unused",
    );
  });

  it("stubs only the host SDK, so the archive must supply everything else", () => {
    const tmp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "pbsrs-stub-"));
    try {
      installHostStub(tmp);
      const pkg = JSON.parse(
        fs.readFileSync(path.join(tmp, "node_modules", HOST_SDK_PACKAGE, "package.json"), "utf8"),
      );
      assert.equal(pkg.name, HOST_SDK_PACKAGE);
      assert.deepEqual(fs.readdirSync(path.join(tmp, "node_modules")), ["@github"]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

/* ------------------------------------------------------------------------- documentation */

describe("the archive-driven verification is documented where the evals are", () => {
  const readme = fs.readFileSync(path.join(repoRoot, "evals", "README.md"), "utf8");

  it("names the tool by its real path", () => {
    assert.ok(
      readme.includes("evals/tools/open-archive-canvas.mjs"),
      "evals/README.md must document the archive-driven run. Naming it there also puts it " +
        "under evals-readme.test.mjs, which fails if the path stops existing.",
    );
  });

  it("says what it is for, not just how to type it", () => {
    assert.match(
      readme,
      /published|release archive/i,
      "the point of the tool is that the capture comes from the published artefact",
    );
  });
});
