// An install path that works because the reader already has the repository is not an
// install path. This suite exists because a clean-directory run of the documented
// instructions found three things that a reader could not have recovered from:
//
//   1. README said to extract the canvas archive into `~/.copilot/extensions/srs-navigator/`
//      while the landing page said `~/.copilot/extensions/`. The archive already contains a
//      `srs-navigator/` root, so the README's version nests it one level too deep and the
//      extension never loads. Two surfaces, one of them wrong, nothing to catch it.
//   2. Both surfaces linked the bare /releases page for `srs-navigator-<version>.zip`, but
//      the canvas app and the methodology plugin ship on interleaved tag trains — the newest
//      release carries no canvas archive at all.
//   3. `npx skills add` installs into `.agents/skills/`, a directory neither surface named.
//
// The assertions below deliberately derive the archive's shape from the packager itself
// rather than restating it: if the layout changes, the documentation assertion changes
// with it. A test that hard-codes the same string the docs hard-code is just a second copy
// of the docs.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ARCHIVE_ROOT, EXCLUDE, EXCLUDE_FILES, stage } from "../../scripts/package-extension.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const README = read("README.md");
const LANDING = read("docs/index.html");

// The canvas app is released from VERSION on its own vX.Y.Z train, so a link to the
// "latest" release is a link to the methodology plugin. The fallback must be filtered.
const CANVAS_RELEASE_FILTER = "q=srs-navigator";

// Budgets, set against the measured staging output (26 files / ~402 KB) with headroom.
// The published srs-navigator-1.1.0.zip carried 223 entries and 4.3 MB because it bundled
// node_modules/ (Playwright); these bounds make that shape impossible to ship again.
const MAX_PACKAGED_FILES = 80;
const MAX_PACKAGED_BYTES = 1_500_000;

/* ------------------------------------------------------------------ helpers */

/** Split a markdown table row into trimmed cells, discarding the outer pipes. */
export function tableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * Values under the column titled `header` in the first markdown table that has it.
 * Backticks are stripped so callers compare paths rather than formatting.
 */
export function tableColumn(md, header) {
  const lines = md.split("\n");
  const head = lines.findIndex((l) => l.trim().startsWith("|") && tableRow(l).includes(header));
  if (head === -1) return [];
  const col = tableRow(lines[head]).indexOf(header);
  const out = [];
  for (let i = head + 2; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|")) break;
    const cell = tableRow(lines[i])[col];
    if (cell !== undefined) out.push(cell.replaceAll("`", "").trim());
  }
  return out;
}

/**
 * The body of a markdown section: from its heading to the next heading of the same or a
 * higher level. Asserting against the whole README would let a claim made in one section
 * satisfy a requirement about another.
 */
export function section(md, heading) {
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

/** Markdown link targets: [text](target). */
export function linkTargets(md) {
  return [...md.matchAll(/\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]);
}

/** Directories the landing page tells the reader to extract the archive into. */
export function htmlExtractTargets(html) {
  return [...html.matchAll(/extract(?:\s+it)?\s+into\s*<code>([^<]+)<\/code>/gi)].map((m) =>
    m[1].trim(),
  );
}

/** True when `target` is the archive's own root rather than the directory above it. */
export function nestsArchiveRoot(target, root = ARCHIVE_ROOT) {
  return new RegExp(`(^|[\\\\/])${root}[\\\\/]?$`).test(target.trim());
}

/** Every file in a directory tree, as paths relative to it. */
export function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).replaceAll("\\", "/")];
  });
}

/* ------------------------------------------------------- what ships in the archive */

describe("the canvas archive the docs point at", () => {
  let tmp;
  let staged;
  let files;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-package-"));
    staged = stage(tmp);
    files = walk(staged);
  });

  after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("puts everything under one top-level directory", () => {
    assert.deepEqual(
      fs.readdirSync(tmp),
      [ARCHIVE_ROOT],
      `the archive must contain exactly one root (${ARCHIVE_ROOT}/) — the extract ` +
        "instructions in README.md and docs/index.html are written against that shape",
    );
  });

  it("contains what the Copilot app needs to load the extension", () => {
    for (const required of ["extension.mjs", "copilot-extension.json", "package.json"]) {
      assert.ok(
        files.includes(required),
        `${required} is missing from the archive — an extracted directory without it is ` +
          "not an installed extension",
      );
    }
    assert.ok(
      files.some((f) => f.startsWith("skills/") && f.endsWith(".md")),
      "the bundled methodology skills must ship with the extension: a standalone install " +
        "has no skills/ directory to fall back to",
    );
    assert.ok(
      files.some((f) => f.startsWith("lib/")),
      "the renderer/parser library must ship with the extension",
    );
  });

  it("carries no development payload", () => {
    const dev = files.filter(
      (f) =>
        f.split("/").some((seg) => EXCLUDE.has(seg)) ||
        EXCLUDE_FILES.has(f.split("/").pop()) ||
        /\.test\.mjs$/.test(f) ||
        /playwright/i.test(f),
    );
    assert.deepEqual(
      dev,
      [],
      "the published srs-navigator-1.1.0.zip shipped 187 node_modules entries (Playwright) " +
        "plus tests/ and docs/, at 4.3 MB. Nothing asserted the archive's shape, so it went " +
        "out unnoticed. These entries must never reappear",
    );
  });

  it("stays inside its size budget", () => {
    const bytes = files.reduce((n, f) => n + fs.statSync(path.join(staged, f)).size, 0);
    assert.ok(
      files.length <= MAX_PACKAGED_FILES,
      `archive holds ${files.length} files, budget is ${MAX_PACKAGED_FILES}`,
    );
    assert.ok(
      bytes <= MAX_PACKAGED_BYTES,
      `archive weighs ${bytes} bytes, budget is ${MAX_PACKAGED_BYTES} — a jump of this ` +
        "size means a dependency tree got swept in",
    );
  });
});

/* ----------------------------------------------- what the documentation tells the reader */

describe("the documented extract target matches the archive", () => {
  const canvas = section(README, "SRS Navigator canvas app");

  it("has a canvas install section with an extract table", () => {
    assert.notEqual(canvas, "", "README.md must keep an `SRS Navigator canvas app` section");
    assert.ok(
      tableColumn(canvas, "Extract into").length > 0,
      "that section must keep its `Extract into` table — the table is the instruction",
    );
  });

  it("names the directory above the archive root, not the archive root itself", () => {
    for (const target of tableColumn(canvas, "Extract into")) {
      assert.ok(
        !nestsArchiveRoot(target),
        `README.md tells the reader to extract into "${target}", which ends in the ` +
          `archive's own root (${ARCHIVE_ROOT}/). The archive already contains that ` +
          `folder, so this yields ${target.replace(/[\\/]$/, "")}/${ARCHIVE_ROOT}/extension.mjs ` +
          "— a nested copy the Copilot app will not load. Document the parent directory.",
      );
    }
  });

  it("agrees with the landing page about where the archive goes", () => {
    const fromLanding = htmlExtractTargets(LANDING);
    assert.ok(
      fromLanding.length > 0,
      'docs/index.html must keep an "extract it into <code>…</code>" instruction',
    );
    for (const target of fromLanding) {
      assert.ok(
        !nestsArchiveRoot(target),
        `docs/index.html tells the reader to extract into "${target}", which nests the ` +
          "archive root",
      );
    }
    const fromReadme = tableColumn(canvas, "Extract into").map((t) => t.replace(/[\\/]$/, ""));
    for (const target of fromLanding) {
      assert.ok(
        fromReadme.includes(target.replace(/[\\/]$/, "")),
        `docs/index.html says "${target}" but README.md's table says ` +
          `${fromReadme.join(", ")}. Two surfaces disagreeing about one path is how the ` +
          "nesting bug survived: each looked correct on its own page.",
      );
    }
  });
});

describe("the release fallback link finds the canvas archive", () => {
  it("is filtered in the README, not a link to the newest release", () => {
    const canvas = section(README, "SRS Navigator canvas app");
    const releaseLinks = linkTargets(canvas).filter((t) => t.includes("/releases"));
    assert.ok(releaseLinks.length > 0, "the canvas section must link the releases page");
    assert.ok(
      releaseLinks.some((t) => t.includes(CANVAS_RELEASE_FILTER)),
      `the archive fallback must link a filtered releases view (${CANVAS_RELEASE_FILTER}). ` +
        "The canvas app ships on vX.Y.Z tags and the methodology plugin on vX.Y, so they " +
        `interleave: the newest release carries no canvas archive. Found: ${releaseLinks.join(", ")}`,
    );
  });

  it("is filtered on the landing page too", () => {
    const releaseLinks = [...LANDING.matchAll(/href\s*=\s*["']([^"']*\/releases[^"']*)["']/g)].map(
      (m) => m[1],
    );
    assert.ok(
      releaseLinks.some((t) => t.includes(CANVAS_RELEASE_FILTER)),
      `docs/index.html must link the same filtered view for the archive fallback; found: ${releaseLinks.join(", ")}`,
    );
  });

  it("names an archive whose prefix matches what the packager emits", () => {
    assert.ok(
      README.includes(`${ARCHIVE_ROOT}-<version>.zip`),
      `the documented archive name must start with ${ARCHIVE_ROOT}- so it matches the ` +
        "artifact the release workflow attaches",
    );
  });
});

describe("the AgentSkills CLI section says where the skill lands", () => {
  const cli = section(README, "AgentSkills CLI");

  it("exists", () => {
    assert.notEqual(cli, "", "README.md must keep an `AgentSkills CLI` section");
  });

  it("names the directory the CLI actually writes to", () => {
    assert.match(
      cli,
      /\.agents\/skills\//,
      "a clean-directory run of `npx skills add RafaelGorski/Problem-Based-SRS` installs " +
        "into `.agents/skills/problem-based-srs`, but the README only ever names " +
        "`.github/skills/` and `~/.copilot/skills/`. A reader who runs the documented " +
        "command and checks the documented directory finds nothing and concludes it failed.",
    );
  });

  it("mentions the lockfile the CLI writes alongside it", () => {
    assert.match(
      cli,
      /skills-lock\.json/,
      "the CLI also writes skills-lock.json into the working directory; an unexplained " +
        "new file at the repo root is a surprise, not an install",
    );
  });
});

/* ------------------------------------------------------------------- negative canaries */

describe("negative canaries", () => {
  it("nestsArchiveRoot() distinguishes the parent from the archive root", () => {
    assert.equal(nestsArchiveRoot("~/.copilot/extensions/"), false);
    assert.equal(nestsArchiveRoot(".github/extensions"), false);
    assert.equal(nestsArchiveRoot("~/.copilot/extensions/srs-navigator/"), true);
    assert.equal(nestsArchiveRoot("~/.copilot/extensions/srs-navigator"), true);
    assert.equal(nestsArchiveRoot(".github\\extensions\\srs-navigator\\"), true);
    assert.equal(
      nestsArchiveRoot("~/.copilot/extensions/srs-navigator-old/"),
      false,
      "a different directory that merely starts with the same name is not the archive root",
    );
  });

  it("section() does not leak into the next section", () => {
    const md = "## A\nkeep\n### A.1\nalso keep\n## B\ndrop";
    assert.equal(section(md, "A"), "keep\n### A.1\nalso keep");
    assert.equal(section(md, "B"), "drop");
    assert.equal(section(md, "Missing"), "");
  });

  it("tableColumn() reads the named column and skips the separator row", () => {
    const md = "| Scope | Extract into |\n|---|---|\n| Personal | `~/x/` |\n| Project | `y/` |\nafter";
    assert.deepEqual(tableColumn(md, "Extract into"), ["~/x/", "y/"]);
    assert.deepEqual(tableColumn(md, "Scope"), ["Personal", "Project"]);
    assert.deepEqual(tableColumn(md, "Nope"), []);
  });

  it("htmlExtractTargets() ignores prose that merely mentions a directory", () => {
    assert.deepEqual(htmlExtractTargets("<p>the <code>~/.copilot/extensions/</code> folder</p>"), []);
    assert.deepEqual(
      htmlExtractTargets("<p>extract it into <code>~/.copilot/extensions/</code>.</p>"),
      ["~/.copilot/extensions/"],
    );
  });

  it("the extract assertion actually fails on the shape that shipped", () => {
    const broken = "| Scope | Extract into |\n|---|---|\n| Personal | `~/.copilot/extensions/srs-navigator/` |";
    assert.ok(
      tableColumn(broken, "Extract into").some((t) => nestsArchiveRoot(t)),
      "the guard must notice the exact instruction that was wrong on main",
    );
  });

  it("the release-link assertion actually fails on an unfiltered link", () => {
    const bare = "[release archive](https://github.com/o/r/releases)";
    assert.ok(
      !linkTargets(bare).some((t) => t.includes(CANVAS_RELEASE_FILTER)),
      "the guard must notice a bare /releases link",
    );
  });
});
