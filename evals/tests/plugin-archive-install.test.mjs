// The plugin release archive is the artifact every `vX.Y` release publishes — and the
// artifact the release issue #69 keeps asking for (now produced by `create-release.yml`)
// will publish. Nothing had ever opened it.
//
// Eight passes on #69 proved the two *other* install paths: #73 loaded the canvas archive
// from a staged tree, #74 staged what `npx skills add` copies. Both found real defects by
// looking at the shipped tree instead of the checkout. The plugin archive — the primary
// product, and the only asset attached to a plugin release — had neither a guard nor a
// documented install path, and `evals/` contained zero references to `agents/`, one of the
// five things `PACKAGE_INCLUDES` ships.
//
// It shipped broken. `agents/problem-based-srs/AGENT.md` linked
// `../skills/problem-based-srs/reference/crm-example.md`, which from
// `agents/problem-based-srs/` resolves to `agents/skills/…` — a directory that exists in
// neither the repository nor the archive. `skills-static.test.mjs` resolves every relative
// link it knows about, but only under `skills/`, so nothing looked. Same shape as the ISO
// link #74 found: the only test covering the property never covered the shipped file.
//
// This suite stages what the packager ships into a temp directory outside the checkout and
// reads it as an installer would. Two layers, on purpose:
//
//   A. Substantive assertions run everywhere, offline, with no Python: the staged set is
//      derived by reading PACKAGE_INCLUDES out of build-plugin.py and the archive root out
//      of plugin.json — the packager's own two inputs.
//   B. One fidelity cross-check actually runs `build-plugin.py package` and compares the
//      real zip's entry list against layer A's staging. It skips cleanly without a Python
//      interpreter — only the cross-check skips, never a guard.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

/* ------------------------------------------------------------------ helpers */

/**
 * The paths `build-plugin.py` puts in the archive, read out of the script rather than
 * restated here. A test that hard-codes what the packager hard-codes is a second copy of
 * the packager, and it agrees with itself while the archive drifts.
 */
export function packageIncludes(pySource) {
  const block = pySource.match(/^PACKAGE_INCLUDES\s*=\s*\[([\s\S]*?)^\]/m);
  if (!block) return [];
  return [...block[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
}

/** Every file under a directory, as forward-slash paths relative to it. */
export function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).replaceAll("\\", "/")];
  });
}

/**
 * Markdown link targets that point at another file: not a URL, not a bare anchor, not a
 * mail link. The trailing `#fragment` is dropped — a link to a heading in a real file is
 * still a link to that file.
 */
export function relativeLinkTargets(md) {
  return [...md.matchAll(/\[[^\]]*\]\(\s*([^)\s]+)/g)]
    .map((m) => m[1])
    .filter((t) => !/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(t))
    .map((t) => t.split("#")[0])
    .filter(Boolean);
}

/**
 * The actions `SKILL.md` dispatches, taken from the table that maps each action to its
 * `reference/<action>.md`. That table is the orchestrator's contract — `skills-static`
 * already asserts every row resolves — so it is the right source for "every action the
 * methodology has", parsed at runtime instead of listed here.
 */
export function dispatchActions(skillMd) {
  return [
    ...skillMd.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*\[`reference\/([a-z-]+)\.md`\]/gm),
  ]
    .filter((m) => m[1] === m[2])
    .map((m) => m[1]);
}

/** The actions a markdown table under `heading` lists in its first column. */
export function actionsInTable(md, heading) {
  const from = md.indexOf(heading);
  if (from === -1) return [];
  const section = md.slice(from + heading.length);
  const end = section.search(/^#{2,4} /m);
  const table = end === -1 ? section : section.slice(0, end);
  return [...table.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map((m) => m[1]);
}

/** The actions `AGENT.md` advertises in its Available Actions table. */
export function agentActions(agentMd) {
  return actionsInTable(agentMd, "## Available Actions");
}

/**
 * Stage the archive's contents into `dest`, using the packager's own two inputs: the
 * include list and the archive root (`plugin.json`'s name, which is what `package()`
 * prefixes every arcname with). Returns the staged root.
 */
export function stagePluginArchive(dest, { includes, rootName }) {
  const root = path.join(dest, rootName);
  fs.mkdirSync(root, { recursive: true });
  for (const rel of includes) {
    const src = path.join(repoRoot, rel);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, path.join(root, rel), { recursive: true });
  }
  return root;
}

/* -------------------------------------------------------------------- setup */

const BUILD_PY = read("scripts/build-plugin.py");
const PLUGIN_META = JSON.parse(read(".claude-plugin/plugin.json"));
const INCLUDES = packageIncludes(BUILD_PY);
const ROOT_NAME = PLUGIN_META.name;
const README = read("README.md");
const SKILL_MD = read("skills/problem-based-srs/SKILL.md");

let tmpDir = "";
let stagedRoot = "";
let stagedFiles = [];

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-plugin-archive-"));
  stagedRoot = stagePluginArchive(tmpDir, { includes: INCLUDES, rootName: ROOT_NAME });
  stagedFiles = walk(stagedRoot);
});

after(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

const staged = (rel) => path.join(stagedRoot, rel);
const stagedExists = (rel) => fs.existsSync(staged(rel));

/* --------------------------------------------------- the staging is faithful */

describe("the staged tree is derived from the packager, not restated", () => {
  it("reads a non-empty include list out of build-plugin.py", () => {
    assert.ok(
      INCLUDES.length > 0,
      "PACKAGE_INCLUDES could not be parsed from scripts/build-plugin.py — every assertion " +
        "below stages from it, so a silent parse failure would make this suite vacuous",
    );
    for (const rel of INCLUDES) {
      assert.ok(
        fs.existsSync(path.join(repoRoot, rel)),
        `PACKAGE_INCLUDES names ${rel}, which is not in the repository: the archive would ` +
          `silently ship without it (package() skips missing paths)`,
      );
    }
  });

  it("ships the plugin manifest, the agent and the skills", () => {
    // These three are the plugin: without any one of them the extracted tree is not a
    // Claude Code plugin at all. Asserted against the staged tree, not the include list,
    // so a directory that exists but is empty still fails.
    assert.ok(stagedExists(".claude-plugin/plugin.json"), "the manifest must be in the archive");
    assert.ok(
      stagedFiles.some((f) => f.startsWith("agents/") && f.endsWith("AGENT.md")),
      "the agent definition must be in the archive",
    );
    assert.ok(
      stagedExists("skills/problem-based-srs/SKILL.md"),
      "the orchestrator skill must be in the archive",
    );
  });

  it("carries no build tooling, tests or lockfiles", () => {
    // The canvas archive shipped 187 node_modules entries and the manifest that rebuilds
    // them (#73). The same question, asked of the plugin archive before it is published.
    const unwanted = stagedFiles.filter((f) =>
      /(^|\/)(node_modules|evals|tests|scripts|dist|build)\//.test(f) ||
      /(^|\/)(package-lock\.json|\.gitignore)$/.test(f),
    );
    assert.deepEqual(unwanted, [], "the install archive must not carry development tooling");
  });

  it("matches what build-plugin.py actually packages", (t) => {
    // The fidelity cross-check. Layer A stages from the packager's inputs; this proves the
    // staging equals the packager's output. Only this check needs Python, and only this
    // check may skip.
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-plugin-zip-"));
    try {
      // Probe for an interpreter separately from running the packager. Treating a non-zero
      // exit as "no Python" would delete this check the moment build-plugin.py broke — the
      // one failure it exists to catch — and blame a missing interpreter for it.
      const python = ["python3", "python"].find(
        (exe) => spawnSync(exe, ["--version"], { encoding: "utf8" }).status === 0,
      );
      if (!python) {
        t.skip("no python interpreter available to cross-check the packaged archive");
        return;
      }
      const res = spawnSync(
        python,
        ["-B", path.join(repoRoot, "scripts/build-plugin.py"), "package", "--out-dir", outDir],
        { encoding: "utf8", cwd: repoRoot, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } },
      );
      assert.equal(
        res.status,
        0,
        `build-plugin.py package failed (exit ${res.status}) — the release cannot be built:\n` +
          `${res.stdout ?? ""}${res.stderr ?? ""}`,
      );
      const zips = fs.readdirSync(outDir).filter((f) => f.endsWith(".zip"));
      assert.equal(zips.length, 1, "package() must emit exactly one archive");
      assert.match(
        zips[0],
        new RegExp(`^${ROOT_NAME}-v\\d`),
        "the asset name is <plugin name>-v<version>.zip — the README names it, so it is a contract",
      );
      const entries = zipEntries(path.join(outDir, zips[0]));
      const inArchive = entries
        .filter((e) => e.startsWith(`${ROOT_NAME}/`))
        .map((e) => e.slice(ROOT_NAME.length + 1))
        .sort();
      assert.deepEqual(
        inArchive,
        [...stagedFiles].sort(),
        "the staged tree must equal what package() writes; if they diverge, every assertion " +
          "in this suite is checking a tree nobody ships",
      );
      assert.deepEqual(
        entries.filter((e) => !e.startsWith(`${ROOT_NAME}/`)),
        [],
        `every archive entry must sit under the single ${ROOT_NAME}/ root the README tells ` +
          `installers to expect`,
      );
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});

/* ------------------------------------------------- the shipped tree resolves */

describe("every link in the shipped tree resolves inside it", () => {
  it("has no relative link that escapes the archive or misses a file", () => {
    const broken = [];
    for (const rel of stagedFiles.filter((f) => f.endsWith(".md"))) {
      const dir = path.dirname(staged(rel));
      for (const target of relativeLinkTargets(fs.readFileSync(staged(rel), "utf8"))) {
        const resolved = path.resolve(dir, target);
        const inside = !path.relative(stagedRoot, resolved).startsWith("..");
        if (!inside || !fs.existsSync(resolved)) broken.push(`${rel} -> ${target}`);
      }
    }
    assert.deepEqual(
      broken,
      [],
      "a relative link in a shipped file must resolve to a file that is also shipped. " +
        "Resolving it from the checkout is not the same question: `../skills/…` from " +
        "agents/problem-based-srs/ lands in agents/skills/, which exists nowhere, and " +
        "skills-static.test.mjs never looked because it only walks skills/.",
    );
  });
});

/* ------------------------------------- the agent orchestrates what it ships */

describe("the agent ships the methodology it orchestrates", () => {
  const agentFile = () => stagedFiles.find((f) => f.endsWith("AGENT.md"));

  it("dispatches exactly the actions the archive ships a reference file for", () => {
    // The floor this replaces (`actions.length >= 8`) was set one below reality, so a
    // parser that lost a row would shrink the comparison set instead of failing — and the
    // row it loses first is `live`, the only one with prose after the link. Derived from
    // the shipped reference/ listing, by the rule evals/lib/skills.mjs already uses:
    // every `*.md` that is not an `*-example.md` walkthrough.
    const shipped = stagedFiles
      .filter((f) => f.startsWith("skills/problem-based-srs/reference/"))
      .map((f) => path.basename(f, ".md"))
      .filter((a) => !a.endsWith("-example"))
      .sort();
    assert.ok(shipped.length > 0, "no reference files staged — every check below is vacuous");
    assert.deepEqual(
      [...dispatchActions(SKILL_MD)].sort(),
      shipped,
      "SKILL.md's dispatch table must route every action the archive ships and no others; " +
        "it is what this suite compares the agent against, so a row it fails to parse " +
        "silently stops covering that action",
    );
  });

  it("advertises every action the orchestrator dispatches", () => {
    const actions = dispatchActions(SKILL_MD);
    const advertised = new Set(agentActions(fs.readFileSync(staged(agentFile()), "utf8")));
    const missing = actions.filter((a) => !advertised.has(a));
    assert.deepEqual(
      missing,
      [],
      "the agent's Available Actions table must name every action SKILL.md dispatches — " +
        "an action the agent cannot reach is one the archive ships and nobody can run",
    );
  });

  it("advertises no action the orchestrator cannot dispatch", () => {
    const dispatchable = new Set([
      ...dispatchActions(SKILL_MD),
      ...actionsInTable(SKILL_MD, "## Available Actions"),
    ]);
    const phantom = agentActions(fs.readFileSync(staged(agentFile()), "utf8")).filter(
      (a) => !dispatchable.has(a),
    );
    assert.deepEqual(phantom, [], "the agent must not advertise an action with no reference file");
  });

  it("ships a reference file for every dispatched action", () => {
    const missing = dispatchActions(SKILL_MD).filter(
      (a) => !stagedExists(`skills/problem-based-srs/reference/${a}.md`),
    );
    assert.deepEqual(missing, [], "every dispatched action's reference file must be in the archive");
  });

  it("claims no /problem-based-srs invocation the orchestrator does not accept", () => {
    // `live` is reached by its own `/live` command: SKILL.md's Available Actions table —
    // the one listing what the orchestrator takes as an argument — has no `live` row, and
    // the canvas extension's action enum has no `live` member. So an agent row reading
    // `/problem-based-srs live` documents a call that fails. Derived from SKILL.md, so
    // promoting `live` to a real orchestrator action makes this pass on its own.
    const accepted = new Set(actionsInTable(SKILL_MD, "## Available Actions"));
    assert.ok(accepted.size > 0, "SKILL.md's Available Actions table could not be parsed");
    const agentMd = fs.readFileSync(staged(agentFile()), "utf8");
    const bogus = tableColumn(agentMd, "Command")
      .flatMap((cell) => [...cell.matchAll(/`\/problem-based-srs\s+([a-z-]+)`/g)].map((m) => m[1]))
      .filter((a) => !accepted.has(a));
    assert.deepEqual(
      bogus,
      [],
      "the agent's Command column must only show invocations the orchestrator accepts",
    );
  });

  it("keeps the agent's frontmatter name matching its directory", () => {
    // build-plugin.py enforces this for skills and never looks at agents/. The agent is
    // discovered by directory the same way, so the same rule applies to it.
    const rel = agentFile();
    const dir = path.basename(path.dirname(rel));
    const name = fs.readFileSync(staged(rel), "utf8").match(/^name:\s*(.+)$/m)?.[1]?.trim();
    assert.equal(name, dir, `${rel} frontmatter name must match its directory`);
  });
});

/* ------------------------------------ the archive has an install path at all */

describe("the release archive is installable from what the README says", () => {
  const assetPattern = new RegExp(`${ROOT_NAME}-v[^\\s\`]*\\.zip`);

  it("names the asset a plugin release actually publishes", () => {
    assert.match(
      README,
      assetPattern,
      `README.md must name ${ROOT_NAME}-v<version>.zip. It is the only asset attached to ` +
        "every plugin release, and until it is written down the release page hands the " +
        "reader a file with no instructions — the same gap #72 fixed for the canvas archive",
    );
  });

  it("sends the reader to the releases page for it", () => {
    const section = pluginArchiveSection(README);
    assert.match(
      section,
      /https:\/\/github\.com\/[\w-]+\/[\w-]+\/releases/,
      "the section naming the asset must link the releases page it is attached to",
    );
  });

  it("states where to extract it", () => {
    const targets = extractTargets(pluginArchiveSection(README));
    assert.ok(
      targets.length > 0,
      "the section must say where to extract the archive — an asset with no extract target " +
        "is the gap #72 found on the canvas train, where the two surfaces disagreed and the " +
        "README was the wrong one",
    );
  });

  it("does not tell the reader to extract into the folder the archive brings", () => {
    // #72's finding, asked of the other train: the archive carries its own
    // `problem-based-srs/` root, so an extract target ending in that name nests the tree one
    // level too deep and the plugin does not load. The root is derived, not restated.
    const nested = extractTargets(pluginArchiveSection(README)).filter((t) =>
      nestsArchiveRoot(t, ROOT_NAME),
    );
    assert.deepEqual(
      nested,
      [],
      `the archive already contains a ${ROOT_NAME}/ directory, so no documented extract ` +
        `target may end in it`,
    );
  });

  it("names paths inside the archive that are really there", () => {
    // Every `problem-based-srs/...` path the section quotes must exist in the staged tree.
    // This is what makes the instruction checkable rather than plausible.
    const section = pluginArchiveSection(README);
    const quoted = [...section.matchAll(/`(problem-based-srs\/[^`]+)`/g)].map((m) => m[1]);
    assert.ok(
      quoted.length > 0,
      "the section must point at something concrete inside the extracted tree",
    );
    const missing = quoted
      .map((q) => q.replace(/^problem-based-srs\//, "").replace(/\/$/, ""))
      .filter((rel) => !stagedExists(rel) && !stagedFiles.some((f) => f.startsWith(`${rel}/`)));
    assert.deepEqual(missing, [], "a documented path inside the archive must be in the archive");
  });
});

/**
 * The README region that documents the plugin release archive: from the heading whose
 * section names the asset, to the next heading. Asserting "somewhere in the README" would
 * let the extract target and the asset name drift into unrelated sections.
 */
export function pluginArchiveSection(md, rootName = ROOT_NAME) {
  const asset = new RegExp(`${rootName}-v[^\\s\`]*\\.zip`);
  const parts = md.split(/^(?=#{2,4} )/m);
  return parts.find((p) => asset.test(p)) ?? "";
}

/** Cells of a markdown table column, verbatim. */
export function tableColumn(md, header) {
  const lines = md.split("\n");
  const row = (l) =>
    l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const head = lines.findIndex((l) => l.trim().startsWith("|") && row(l).includes(header));
  if (head === -1) return [];
  const col = row(lines[head]).indexOf(header);
  const out = [];
  for (let i = head + 2; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|")) break;
    const cell = row(lines[i])[col];
    if (cell !== undefined) out.push(cell.trim());
  }
  return out;
}

/**
 * Directories the README tells the reader to extract into — the "Extract into" column, or
 * the prose form. Reading the column rather than every backticked path keeps the guard
 * pointed at instructions instead of at illustrations. Each cell yields the path it
 * quotes, not the whole cell: `` `~/plugins/problem-based-srs/` (create it first) `` is
 * still an instruction to extract into the archive's own root, and stripping the backticks
 * instead would leave trailing prose that slides past the end-anchored nesting check.
 */
export function extractTargets(md) {
  return [
    ...tableColumn(md, "Extract into").map((cell) => (cell.match(/`([^`]+)`/)?.[1] ?? cell).trim()),
    ...[...md.matchAll(/extract(?:\s+\w+)?\s+into\s+`([^`]+)`/gi)].map((m) => m[1].trim()),
  ];
}

/** True when `target` is the archive's own root rather than the directory above it. */
export function nestsArchiveRoot(target, root) {
  return new RegExp(`(^|[\\\\/])${root}[\\\\/]?$`).test(target.trim());
}

/** Entry names in a zip, read without a dependency, from the central directory. */
export function zipEntries(zipPath) {
  const buf = fs.readFileSync(zipPath);
  // Scanning local file headers instead would walk the compressed payloads too, and any
  // payload containing the four bytes `PK\x03\x04` — deterministic for a stored entry —
  // would advance the cursor by a garbage length and drop a real entry silently. The
  // central directory is authoritative and immune to that.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.notEqual(eocd, -1, `${zipPath} has no end-of-central-directory record`);
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let n = 0; n < count; n++) {
    assert.equal(
      buf.readUInt32LE(at),
      0x02014b50,
      `${zipPath}: central directory entry ${n} has a bad signature`,
    );
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    names.push(buf.toString("utf8", at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;
  }
  assert.equal(names.length, count, `${zipPath}: read ${names.length} of ${count} entries`);
  return names.filter((n) => !n.endsWith("/")).sort();
}
