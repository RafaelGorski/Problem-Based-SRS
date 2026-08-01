// Every install path in the README is now executed by a test except one — and it is the
// one that cannot work.
//
//   npx skills add …          → verified by hand, guarded by skills-install.test.mjs
//   the canvas extension      → loaded from a staged archive by from-archive-install.test.mjs
//   extract-and-run           → derived from the packager by install-path.test.mjs
//   the Claude Code plugin    → nothing
//
// What the unguarded section said:
//
//     claude --plugin-dir ./Problem-Based-SRS
//     # or
//     /plugin install https://github.com/RafaelGorski/Problem-Based-SRS
//
// Three defects, in increasing severity. The `--plugin-dir` line points at a directory
// that only exists if the reader already cloned the repository, and the section never
// tells them to — the exact shape #69 is named after. `/plugin install <URL>` is not a
// form the command accepts: Claude Code installs `<plugin>@<marketplace>`, and a
// marketplace is registered first with `/plugin marketplace add <owner/repo>`. And even
// the correct command failed here, because `/plugin marketplace add` reads
// `.claude-plugin/marketplace.json` from the repository root and this repository shipped
// only `plugin.json` — a plugin that no marketplace could catalogue, including its own.
//
// So this suite guards two different things that have to stay true together: the catalog
// resolves to a real plugin directory, and the documentation names the commands that
// catalog makes possible. The command strings are *derived* from the two manifests rather
// than restated, so renaming the plugin or the marketplace fails the documentation
// assertion instead of silently invalidating it. A test that hard-codes the same string
// the docs hard-code is just a second copy of the docs.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const README = read("README.md");
const LANDING = read("docs/index.html");
const BUILD_SCRIPT = read("scripts/build-plugin.py");
const PLUGIN = JSON.parse(read(".claude-plugin/plugin.json"));

const MARKETPLACE_REL = ".claude-plugin/marketplace.json";
const MARKETPLACE_PATH = path.join(repoRoot, MARKETPLACE_REL);

// github.com/<owner>/<repo>, taken from the manifest so the documented
// `/plugin marketplace add <owner/repo>` cannot name a different repository than the one
// the plugin claims to live in. Compared case-insensitively: GitHub slugs are, and the
// manifest spells the owner in lower case while the docs spell it as displayed.
const REPO_SLUG = (PLUGIN.repository || "").replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "");
const namesThisRepo = (arg) => arg.toLowerCase() === REPO_SLUG.toLowerCase();

// Reserved for Anthropic; a marketplace registered under one of these stops loading and
// reports itself as coming from an untrusted source.
// https://code.claude.com/docs/en/plugin-marketplaces
const RESERVED_MARKETPLACE_NAMES = new Set([
  "claude-code-marketplace",
  "claude-code-plugins",
  "claude-plugins-official",
  "claude-plugins-community",
  "claude-community",
  "anthropic-marketplace",
  "anthropic-plugins",
  "agent-skills",
  "anthropic-agent-skills",
  "knowledge-work-plugins",
  "life-sciences",
  "claude-for-legal",
  "claude-for-financial-services",
  "financial-services-plugins",
  "first-party-plugins",
  "healthcare",
]);

/* ------------------------------------------------------------------ helpers */

/**
 * Arguments passed to `plugin install` anywhere in a document, whether written as the
 * slash command (`/plugin install x@y`) or the CLI (`claude plugin install x@y`). Flags
 * are dropped so callers compare plugin references, not switches.
 */
export function pluginInstallArguments(text) {
  const out = [];
  for (const m of text.matchAll(/(?:^|[\s`>])\/?(?:claude\s+)?plugin\s+install\s+([^\s`<]+)/gm)) {
    if (!m[1].startsWith("-")) out.push(m[1]);
  }
  return out;
}

/** Arguments passed to `plugin marketplace add`, in the same two spellings. */
export function marketplaceAddArguments(text) {
  const out = [];
  for (const m of text.matchAll(
    /(?:^|[\s`>])\/?(?:claude\s+)?plugin\s+marketplace\s+add\s+([^\s`<]+)/gm,
  )) {
    if (!m[1].startsWith("-")) out.push(m[1]);
  }
  return out;
}

/** Values passed to `--plugin-dir`. */
export function pluginDirArguments(text) {
  return [...text.matchAll(/--plugin-dir\s+([^\s`<]+)/g)].map((m) => m[1]);
}

/**
 * The body of a markdown section: everything after the given heading, up to the next
 * heading at the same or a higher level. Asserting a `git clone` exists "somewhere in the
 * README" is far weaker than asserting it exists in the section that needs it — the
 * reader following the Claude Code instructions never scrolls to the Manual section.
 */
export function sectionOf(md, heading) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading.trim());
  if (start === -1) return "";
  const level = heading.match(/^#+/)[0].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => {
    const m = l.match(/^(#+)\s/);
    return m && m[1].length <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * Where Claude Code looks for the plugin named by a marketplace entry's `source`.
 * Relative sources resolve against the *marketplace root* — the directory containing
 * `.claude-plugin/`, not `.claude-plugin/` itself. Non-relative (github/url/npm) sources
 * are fetched remotely and cannot be resolved on disk, so they return null.
 */
export function resolveSource(source, marketplaceRoot) {
  if (typeof source !== "string") return null;
  if (!source.startsWith("./")) return null;
  return path.resolve(marketplaceRoot, source);
}

/** The PACKAGE_INCLUDES list build-plugin.py ships, read out of the script itself. */
export function packageIncludes(pySource) {
  const block = pySource.match(/PACKAGE_INCLUDES\s*=\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Run build-plugin.py in `root`, returning its exit status, or null with no interpreter. */
function runValidate(root) {
  for (const exe of ["python3", "python"]) {
    const res = spawnSync(exe, ["-B", path.join(root, "scripts", "build-plugin.py"), "validate"], {
      encoding: "utf8",
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });
    if (res.error) continue;
    // A missing interpreter on Windows exits 9009 with no output at all.
    if (res.status !== 0 && !res.stdout && !res.stderr) continue;
    return res;
  }
  return null;
}

/** A throwaway copy of the smallest tree build-plugin.py validates. */
function stageValidatableTree(marketplace) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srs-marketplace-"));
  fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, "skills", "problem-based-srs"), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "scripts/build-plugin.py"), path.join(dir, "scripts/build-plugin.py"));
  fs.copyFileSync(path.join(repoRoot, ".claude-plugin/plugin.json"), path.join(dir, ".claude-plugin/plugin.json"));
  fs.copyFileSync(
    path.join(repoRoot, "skills/problem-based-srs/SKILL.md"),
    path.join(dir, "skills/problem-based-srs/SKILL.md"),
  );
  if (marketplace !== null) {
    fs.writeFileSync(path.join(dir, MARKETPLACE_REL), JSON.stringify(marketplace, null, 2));
  }
  return dir;
}

/* --------------------------------------------------------------- the catalog */

describe("the repository can be added as a Claude Code marketplace", () => {
  it("ships the catalog file /plugin marketplace add reads", () => {
    assert.ok(
      fs.existsSync(MARKETPLACE_PATH),
      `${MARKETPLACE_REL} must exist. \`/plugin marketplace add <owner/repo>\` reads it from ` +
        "the repository root; without it this repository is a plugin no marketplace can " +
        "catalogue, and every documented Claude Code install command fails at step one",
    );
  });

  it("is valid JSON with the fields the marketplace schema requires", () => {
    const mp = JSON.parse(read(MARKETPLACE_REL));
    assert.match(
      mp.name || "",
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "marketplace `name` must be kebab-case: users type it as the @suffix when installing",
    );
    assert.ok(mp.owner && typeof mp.owner.name === "string" && mp.owner.name.trim(), "`owner.name` is required");
    assert.ok(Array.isArray(mp.plugins) && mp.plugins.length > 0, "`plugins` must be a non-empty array");
    for (const entry of mp.plugins) {
      assert.match(entry.name || "", /^[a-z0-9]+(-[a-z0-9]+)*$/, `entry name must be kebab-case: ${entry.name}`);
      assert.ok(entry.source, `entry ${entry.name} must declare a source`);
    }
  });

  it("does not take a marketplace name reserved for Anthropic", () => {
    const mp = JSON.parse(read(MARKETPLACE_REL));
    assert.ok(
      !RESERVED_MARKETPLACE_NAMES.has(mp.name),
      `"${mp.name}" is reserved for official Anthropic use — Claude Code re-checks reserved ` +
        "names on every load, so a marketplace named this way stops loading and reports " +
        "itself as registered from an untrusted source",
    );
  });

  it("catalogs the plugin this repository actually publishes", () => {
    const mp = JSON.parse(read(MARKETPLACE_REL));
    assert.ok(
      mp.plugins.some((p) => p.name === PLUGIN.name),
      `the catalog must list "${PLUGIN.name}" — the name in .claude-plugin/plugin.json is ` +
        "what namespaces the skills, so an entry under any other name installs a plugin " +
        "whose commands the reader cannot find",
    );
  });

  it("points every relative source at a directory that really holds a plugin", () => {
    const mp = JSON.parse(read(MARKETPLACE_REL));
    for (const entry of mp.plugins) {
      const resolved = resolveSource(entry.source, repoRoot);
      if (resolved === null) continue; // github/url/npm sources are fetched, not on disk
      const manifest = path.join(resolved, ".claude-plugin", "plugin.json");
      assert.ok(
        fs.existsSync(manifest),
        `${entry.name}: source "${entry.source}" resolves to ${resolved}, which has no ` +
          ".claude-plugin/plugin.json. Relative sources resolve against the marketplace " +
          "root (the directory containing .claude-plugin/), not against .claude-plugin/ itself",
      );
      assert.equal(
        JSON.parse(fs.readFileSync(manifest, "utf8")).name,
        entry.name,
        `${entry.name}: the plugin manifest at the source declares a different name`,
      );
    }
  });

  it("keeps relative sources inside the marketplace root", () => {
    const mp = JSON.parse(read(MARKETPLACE_REL));
    for (const entry of mp.plugins) {
      if (typeof entry.source !== "string") continue;
      assert.ok(entry.source.startsWith("./"), `${entry.name}: a path source must start with "./"`);
      assert.ok(
        !entry.source.includes(".."),
        `${entry.name}: "../" escapes the marketplace root, and the files outside it are ` +
          "never copied into the plugin cache",
      );
    }
  });

  it("cannot drift from plugin.json", () => {
    const mp = JSON.parse(read(MARKETPLACE_REL));
    const entry = mp.plugins.find((p) => p.name === PLUGIN.name);
    // Both fields are optional in an entry. When one is present it is what the reader sees
    // in the plugin manager, and `version` additionally *pins* the plugin — so a stale copy
    // here freezes updates for everyone who installed from the catalog.
    if (entry.version !== undefined) {
      assert.equal(entry.version, PLUGIN.version, "the entry pins a version plugin.json no longer declares");
    }
    if (entry.description !== undefined) {
      assert.equal(entry.description, PLUGIN.description, "the catalog description has drifted from plugin.json");
    }
  });

  it("rides along in the release archive", () => {
    assert.ok(
      packageIncludes(BUILD_SCRIPT).includes(".claude-plugin"),
      "build-plugin.py must keep packaging .claude-plugin/ — the extracted archive is only " +
        "addable with `/plugin marketplace add ./problem-based-srs` while it carries the catalog",
    );
  });
});

/* --------------------------------------------------------- the documented commands */

describe("the README documents Claude Code commands that exist", () => {
  const section = () => sectionOf(README, "### Claude Code plugin");

  it("keeps a Claude Code plugin section to document", () => {
    assert.notEqual(section(), "", "README.md must keep a `### Claude Code plugin` section");
  });

  it("registers the marketplace before installing from it", () => {
    const added = marketplaceAddArguments(section());
    assert.ok(
      added.some(namesThisRepo),
      `the section must run \`/plugin marketplace add ${REPO_SLUG}\` first — install takes a ` +
        `plugin reference, never a repository, so without this line there is nothing to install from. Found: ${added.join(", ") || "nothing"}`,
    );
  });

  it("installs the plugin the catalog declares, from the marketplace the catalog names", () => {
    const mp = JSON.parse(read(MARKETPLACE_REL));
    const expected = `${PLUGIN.name}@${mp.name}`;
    assert.ok(
      pluginInstallArguments(section()).includes(expected),
      `the section must document \`/plugin install ${expected}\`, derived from ` +
        "plugin.json's name and marketplace.json's name — renaming either must break this test",
    );
  });

  it("names the skill command the plugin namespace actually produces", () => {
    const skillDirs = fs
      .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    const namespaced = skillDirs.map((d) => `/${PLUGIN.name}:${d}`);
    assert.ok(
      namespaced.some((cmd) => section().includes(cmd)),
      `plugin skills are namespaced by the plugin name, so the section must name ` +
        `${namespaced.join(" or ")}. A reader who installs the plugin and types the bare ` +
        "skill name finds nothing, and concludes the install failed",
    );
  });

  it("never documents an install argument the command cannot parse", () => {
    for (const arg of pluginInstallArguments(README)) {
      assert.ok(
        !/^https?:/i.test(arg),
        `\`plugin install ${arg}\` cannot work: the command takes <plugin>@<marketplace>, ` +
          "not a URL. Pasting this gets an error, not a plugin",
      );
      assert.match(
        arg,
        /^[a-z0-9-]+@[a-z0-9-]+$/,
        `\`plugin install ${arg}\` is not a plugin reference — the form is <plugin>@<marketplace>`,
      );
    }
  });

  it("tells the reader how to obtain the directory --plugin-dir points at", () => {
    const body = section();
    for (const dir of pluginDirArguments(body)) {
      if (!dir.startsWith("./") && !dir.startsWith("../")) continue; // absolute/expanded paths are the reader's own
      assert.match(
        body,
        /git clone .*Problem-Based-SRS/,
        `--plugin-dir ${dir} names a local checkout, so the same section must show how to ` +
          "get one. A path that only works for someone who already has the repo is not an " +
          "install path",
      );
    }
  });
});

describe("the landing page carries the same path", () => {
  it("names the marketplace command the README does", () => {
    assert.ok(
      marketplaceAddArguments(LANDING).some(namesThisRepo),
      `docs/index.html must document \`/plugin marketplace add ${REPO_SLUG}\` — the page ` +
        "lists every other install path, and a reader on Claude Code should not have to " +
        "leave it to find theirs",
    );
  });

  it("never documents an install argument the command cannot parse", () => {
    for (const arg of pluginInstallArguments(LANDING)) {
      assert.match(arg, /^[a-z0-9-]+@[a-z0-9-]+$/, `docs/index.html: \`plugin install ${arg}\` is not a plugin reference`);
    }
  });
});

/* ------------------------------------------------------- the validator, executed */

describe("build-plugin.py validates the catalog", () => {
  it("accepts the catalog this repository ships", (t) => {
    const res = runValidate(repoRoot);
    if (!res) {
      t.skip("no python interpreter available to run build-plugin.py");
      return;
    }
    assert.equal(res.status, 0, `validate must pass on a clean tree:\n${res.stdout}\n${res.stderr}`);
    assert.match(
      res.stdout,
      /marketplace OK/i,
      "validate must report that it checked the catalog — a silent check is " +
        "indistinguishable from no check at all when the file is later deleted",
    );
  });

  it("rejects a catalog whose source points nowhere", (t) => {
    const probe = runValidate(repoRoot);
    if (!probe) {
      t.skip("no python interpreter available to run build-plugin.py");
      return;
    }
    const dir = stageValidatableTree({
      name: "problem-based-srs",
      owner: { name: "Rafael Gorski" },
      plugins: [{ name: PLUGIN.name, source: "./nope" }],
    });
    const res = runValidate(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    assert.notEqual(res.status, 0, "a source with no plugin.json behind it must fail validation");
    assert.match(`${res.stdout}${res.stderr}`, /source/i, "the error must name the unresolvable source");
  });

  it("rejects a catalog that names a plugin this repository does not publish", (t) => {
    const probe = runValidate(repoRoot);
    if (!probe) {
      t.skip("no python interpreter available to run build-plugin.py");
      return;
    }
    const dir = stageValidatableTree({
      name: "problem-based-srs",
      owner: { name: "Rafael Gorski" },
      plugins: [{ name: "some-other-plugin", source: "./" }],
    });
    const res = runValidate(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    assert.notEqual(res.status, 0, "an entry name that disagrees with plugin.json must fail validation");
  });

  it("rejects a catalog pinning a version the manifest no longer declares", (t) => {
    const probe = runValidate(repoRoot);
    if (!probe) {
      t.skip("no python interpreter available to run build-plugin.py");
      return;
    }
    const dir = stageValidatableTree({
      name: "problem-based-srs",
      owner: { name: "Rafael Gorski" },
      plugins: [{ name: PLUGIN.name, source: "./", version: "0.0.1-stale" }],
    });
    const res = runValidate(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    assert.notEqual(res.status, 0, "a pinned version that drifts from plugin.json freezes updates silently");
  });

  it("still passes when the repository ships no catalog at all", (t) => {
    const probe = runValidate(repoRoot);
    if (!probe) {
      t.skip("no python interpreter available to run build-plugin.py");
      return;
    }
    const dir = stageValidatableTree(null);
    const res = runValidate(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    assert.equal(
      res.status,
      0,
      "the catalog is optional to the *plugin*: validate must check it when present and stay " +
        "quiet when absent, or every consumer vendoring only plugin.json breaks",
    );
  });
});

/* ------------------------------------------------------------- negative canaries */

describe("negative canaries", () => {
  it("pluginInstallArguments ignores prose and reads both spellings", () => {
    assert.deepEqual(pluginInstallArguments("run the plugin install step by hand"), ["step"]);
    assert.deepEqual(pluginInstallArguments("`/plugin install a@b`"), ["a@b"]);
    assert.deepEqual(pluginInstallArguments("claude plugin install a@b --scope project"), ["a@b"]);
    assert.deepEqual(pluginInstallArguments("nothing here"), []);
  });

  it("the URL form the README used to carry fails the assertion that replaced it", () => {
    const [arg] = pluginInstallArguments("/plugin install https://github.com/RafaelGorski/Problem-Based-SRS");
    assert.ok(/^https?:/i.test(arg), "the canary must reproduce the exact shape that shipped");
    assert.throws(() => assert.match(arg, /^[a-z0-9-]+@[a-z0-9-]+$/));
  });

  it("sectionOf stops at the next heading of the same level", () => {
    const md = "### A\nalpha\n### B\nbeta\n";
    assert.equal(sectionOf(md, "### A").trim(), "alpha");
    assert.equal(sectionOf(md, "### missing"), "");
    assert.equal(sectionOf("## A\nalpha\n### A2\nnested\n## B\n", "## A").includes("nested"), true);
  });

  it("resolveSource resolves against the marketplace root, not .claude-plugin/", () => {
    assert.equal(resolveSource("./", "/repo"), path.resolve("/repo"));
    assert.equal(resolveSource("./plugins/x", "/repo"), path.resolve("/repo/plugins/x"));
    assert.equal(resolveSource({ source: "github", repo: "a/b" }, "/repo"), null);
  });

  it("packageIncludes reads the real list rather than assuming it", () => {
    assert.deepEqual(packageIncludes('PACKAGE_INCLUDES = [\n  "a",\n  "b",\n]'), ["a", "b"]);
    assert.deepEqual(packageIncludes("no list here"), []);
  });

  it("a catalog that lost its plugin entry fails the assertion this suite makes", () => {
    const stripped = { ...JSON.parse(read(MARKETPLACE_REL)), plugins: [] };
    assert.ok(
      !stripped.plugins.some((p) => p.name === PLUGIN.name),
      "the check must actually notice when the entry is gone",
    );
  });
});
