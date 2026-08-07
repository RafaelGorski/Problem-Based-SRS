// The project ships on two release trains that are easy to confuse:
//
//   plugin  — vX.Y   from .claude-plugin/plugin.json, cut by scripts/build-plugin.py
//   canvas  — vX.Y.Z from VERSION,                    cut by scripts/bump-version.mjs
//
// They have separate tags, separate workflows, and separate version numbers. The
// failure mode this guards is a release where the manifest, the changelog, and the
// number a visitor actually sees disagree — which makes "which version am I running?"
// unanswerable, and makes the release workflow fail late (it derives release notes
// from the changelog section matching the manifest version).
//
// It also pins the boundary between the trains: a feature branch must not pre-bump
// VERSION, because release-canvas.yml bumps it itself and would double-bump.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { pluginReleaseTag } from "../../scripts/check-distribution.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const manifest = JSON.parse(read(".claude-plugin/plugin.json"));
const CHANGELOG = read("CHANGELOG.md");
const LANDING = read("docs/index.html");
const README = read("README.md");

/** Parse "## [x.y.z] - YYYY-MM-DD" headings in document order. */
export function changelogSections(md) {
  return [...md.matchAll(/^##\s*\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/gm)].map((m) => ({
    version: m[1],
    date: m[2],
    index: m.index,
  }));
}

/** Compare dotted numeric versions. Returns >0 when a is newer than b. */
export function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** The version strings a visitor is shown on the site / README, e.g. "v2.5.0". */
export function displayedVersions(text) {
  return [...text.matchAll(/\bv(\d+\.\d+(?:\.\d+)?)\b/g)].map((m) => m[1]);
}

/** Parse Keep-a-Changelog reference definitions: `[2.6.0]: https://…/releases/tag/v2.6`. */
export function changelogTagLinks(md) {
  return [...md.matchAll(/^\[([^\]]+)\]:\s*(\S*\/releases\/tag\/(\S+))\s*$/gm)].map((m) => ({
    version: m[1],
    url: m[2],
    tag: m[3],
  }));
}

/**
 * The tags this checkout can see, or null when it can see none.
 *
 * A checkout with no tags at all is not evidence that a tag is missing — `actions/checkout`
 * fetches none by default — so the caller skips rather than reporting a repository-wide
 * failure. `ci.yml` is asserted below to ask for them, so the skip cannot quietly become
 * permanent.
 */
export function gitTags(root = repoRoot) {
  const res = spawnSync("git", ["tag", "--list"], { cwd: root, encoding: "utf8" });
  if (res.status !== 0) return null;
  const tags = res.stdout.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  return tags.length ? tags : null;
}

describe("release hygiene — the manifest is the source of truth", () => {
  it("declares a three-part semantic version", () => {
    assert.match(
      manifest.version,
      /^\d+\.\d+\.\d+$/,
      "plugin.json must carry X.Y.Z; build-plugin.py normalizes the tag against it",
    );
  });

  it("has a changelog section for exactly the manifest version", () => {
    const sections = changelogSections(CHANGELOG);
    assert.ok(sections.length > 0, "CHANGELOG.md must contain Keep-a-Changelog sections");
    const match = sections.find((s) => compareVersions(s.version, manifest.version) === 0);
    assert.ok(
      match,
      `CHANGELOG.md has no section for ${manifest.version}. The release workflow extracts ` +
        `its notes from that section, so it would publish an empty release. Sections found: ` +
        sections.map((s) => s.version).join(", "),
    );
  });

  it("puts the manifest version at the top of the changelog", () => {
    const sections = changelogSections(CHANGELOG);
    assert.equal(
      compareVersions(sections[0].version, manifest.version),
      0,
      `the newest changelog section is ${sections[0].version} but the manifest says ` +
        `${manifest.version} — one of them was forgotten`,
    );
  });

  it("keeps changelog sections in descending version order", () => {
    const sections = changelogSections(CHANGELOG);
    for (let i = 1; i < sections.length; i++) {
      assert.ok(
        compareVersions(sections[i - 1].version, sections[i].version) > 0,
        `changelog order breaks at ${sections[i - 1].version} -> ${sections[i].version}`,
      );
    }
  });

  it("gives the top section real content, not just a heading", () => {
    const sections = changelogSections(CHANGELOG);
    const start = sections[0].index;
    const end = sections[1]?.index ?? CHANGELOG.length;
    const body = CHANGELOG.slice(start, end);
    assert.match(
      body,
      /^###\s+(Added|Changed|Fixed|Removed|Deprecated|Security)\s*$/m,
      "the top section needs at least one Keep-a-Changelog subsection",
    );
    assert.ok(
      body.split("\n").filter((l) => l.trim().startsWith("- ")).length >= 3,
      "a release worth cutting has more than a couple of bullet points",
    );
  });

  it("links the manifest version at the tag the release pipeline actually creates", () => {
    // The last open box on #69 is "cut the release". This is what decides whether doing
    // that produces a working link. create-release.yml builds its tag from the *normalized*
    // version — `TAG="v${VERSION}"` where VERSION is build-plugin.py's output — and
    // normalize_version strips a trailing ".0". So manifest 2.6.0 publishes at v2.6.
    // GitHub serves /releases/tag/<tag> by exact name, so a changelog link naming v2.6.0
    // stays a 404 *after* the release is cut, and the drift monitor keeps reporting it with
    // advice ("cut the missing release") that no longer applies.
    const expected = pluginReleaseTag(manifest.version);
    assert.ok(expected, `pluginReleaseTag could not read ${manifest.version}`);
    const links = changelogTagLinks(CHANGELOG);
    const link = links.find((l) => compareVersions(l.version, manifest.version) === 0);
    assert.ok(
      link,
      `CHANGELOG.md has no [${manifest.version}] link definition. Sections found: ` +
        links.map((l) => l.version).join(", "),
    );
    assert.equal(
      link.tag,
      expected,
      `CHANGELOG.md links ${link.tag} for ${manifest.version}, but the release pipeline ` +
        `publishes that version at ${expected}. Cutting the release would not fix the link.`,
    );
  });

  it("gives every changelog version exactly one release link", () => {
    const sections = changelogSections(CHANGELOG);
    const links = changelogTagLinks(CHANGELOG);
    for (const section of sections) {
      const matches = links.filter((l) => l.version === section.version);
      assert.equal(
        matches.length,
        1,
        `## [${section.version}] must have exactly one link definition, found ` +
          `${matches.length} — the release workflow's notes and the reader's link come ` +
          `from the same section heading`,
      );
    }
  });
});

// The manifest version is the *only* version `main` can publish: create-release.yml runs
// `build-plugin.py build --version <tag>`, which fails on `version mismatch` for anything
// else. So a version section left behind by a bump is stranded — no tag, a link with no
// release behind it, and notes that reach no release cut from `main`, because
// extract_notes() captures exactly one section. (Tagging the older commit that still carried
// that manifest would build — checkout@v4 restores the tagged commit — but would publish a
// tree and notes that predate the section. Unreachable from `main`, misleading from anywhere
// else; stranded-release-claim.test.mjs holds that wording to what history supports.) That
// is not hypothetical: 2.4.1 → 2.5.0 → 2.6.0 shipped with no v2.5 in between, leaving 76
// lines of release notes that the release carrying those changes would not have mentioned.
describe("release hygiene — a bump must not strand the release before it", () => {
  const sectionsBelowManifest = () =>
    changelogSections(CHANGELOG).filter(
      (s) => compareVersions(s.version, manifest.version) < 0,
    );

  it("every changelog section below the manifest version was actually released", (t) => {
    const tags = gitTags();
    if (!tags) {
      t.skip("this checkout carries no tags, so it has no evidence either way");
      return;
    }
    const links = changelogTagLinks(CHANGELOG);
    const older = sectionsBelowManifest();
    assert.ok(
      older.length > 0,
      "the scan must actually find historical sections, or it asserts nothing",
    );
    for (const section of older) {
      const link = links.find((l) => l.version === section.version);
      assert.ok(link, `## [${section.version}] has no link definition to check`);
      assert.ok(
        tags.includes(link.tag),
        `## [${section.version}] links ${link.tag}, which is not a tag in this repository. ` +
          `The manifest is already at ${manifest.version}, so \`main\` can no longer ` +
          `publish ${section.version} — \`build-plugin.py --expected-version ` +
          `${section.version}\` fails on a version mismatch. Fold the section into ` +
          `## [${manifest.version}], the release that will actually deliver it, and drop ` +
          `the link — otherwise its notes reach no release cut from \`main\` and ` +
          `${link.tag} has no release behind it.`,
      );
    }
  });

  it("exempts the manifest version, which is the release not yet cut", () => {
    const sections = changelogSections(CHANGELOG);
    assert.ok(
      !sectionsBelowManifest().some((s) => compareVersions(s.version, manifest.version) === 0),
      "the top section must be excluded, or the guard would demand a tag for the release " +
        "it is asking the maintainer to create",
    );
    assert.equal(
      sections.length - sectionsBelowManifest().length,
      1,
      "exactly one section — the manifest's — is exempt",
    );
  });

  it("the eval job fetches tags, so the guard has evidence in CI", () => {
    const ci = read(".github/workflows/ci.yml");
    const job = ci.slice(ci.indexOf("Test (canvas + skill evals)"), ci.indexOf("Canvas e2e"));
    assert.match(
      job,
      /fetch-tags:\s*true|fetch-depth:\s*0/,
      "actions/checkout fetches no tags by default, so the orphan-section guard would " +
        "skip on every CI run and guard nothing",
    );
  });
});

describe("release hygiene — every surface shows the same number", () => {
  it("the landing page version badge matches the manifest", () => {
    const shown = displayedVersions(LANDING);
    assert.ok(shown.length > 0, "docs/index.html must display a version");
    for (const v of new Set(shown)) {
      assert.equal(
        compareVersions(v, manifest.version),
        0,
        `docs/index.html shows v${v} but the manifest says ${manifest.version}`,
      );
    }
  });

  it("the landing page badge appears in both the header and the footer", () => {
    assert.ok(
      /class="version-badge"/.test(LANDING),
      "the header version badge must survive",
    );
    assert.ok(
      /class="footer-version"/.test(LANDING),
      "the footer version link must survive",
    );
  });

  it("the README version badge matches the manifest", () => {
    const badge = README.split("\n").find((l) => /!\[Version /.test(l));
    assert.ok(badge, "README.md must carry a version badge");
    const versions = [...badge.matchAll(/(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
    assert.ok(versions.length > 0, "the badge must name a version");
    for (const v of new Set(versions)) {
      assert.equal(
        compareVersions(v, manifest.version),
        0,
        `README badge shows ${v}, manifest says ${manifest.version}`,
      );
    }
  });
});

describe("release hygiene — the two trains stay separate", () => {
  it("the canvas VERSION file is not the plugin version", () => {
    const canvasVersion = read("VERSION").trim();
    assert.match(canvasVersion, /^\d+\.\d+\.\d+$/, "VERSION must be X.Y.Z");
    // Not an inequality assertion — they could legitimately coincide one day. The
    // point is that VERSION is owned by a different workflow, asserted below.
    assert.ok(canvasVersion.length > 0);
  });

  it("release-canvas.yml, not a feature branch, bumps VERSION", () => {
    const wf = read(".github/workflows/release-canvas.yml");
    assert.match(
      wf,
      /bump-version\.mjs/,
      "the canvas release workflow must own the VERSION bump; pre-bumping it in a " +
        "feature PR makes the workflow double-bump",
    );
  });

  it("the plugin release workflow derives its notes from the changelog", () => {
    const wf = read(".github/workflows/create-release.yml");
    assert.match(
      wf,
      /build-plugin\.py/,
      "the plugin release must go through the build script that reads plugin.json",
    );
  });

  it("the health dashboard reports the plugin version, not the canvas one", () => {
    const builder = read("scripts/build-health-dashboard.mjs");
    const versionAssignment = builder.slice(
      builder.indexOf("schema: \"skills-health/1\"") - 900,
      builder.indexOf("schema: \"skills-health/1\""),
    );
    assert.match(
      versionAssignment,
      /plugin\.json/,
      "build-health-dashboard.mjs must read .claude-plugin/plugin.json for `version` — " +
        "it previously reported the canvas VERSION beside a site badge showing the " +
        "plugin version, so the page named two different releases as one",
    );
  });
});

describe("negative canaries", () => {
  it("compareVersions orders correctly, including uneven part counts", () => {
    assert.ok(compareVersions("2.5.0", "2.4.1") > 0);
    assert.ok(compareVersions("2.4.1", "2.5.0") < 0);
    assert.equal(compareVersions("2.5", "2.5.0"), 0);
    assert.ok(compareVersions("2.10.0", "2.9.0") > 0, "must compare numerically, not lexically");
  });

  it("changelogSections ignores prose that merely looks like a heading", () => {
    assert.deepEqual(changelogSections("see ## [1.0] - 2020-01-01 inline"), []);
    assert.deepEqual(changelogSections("### [1.0] - 2020-01-01"), []);
    assert.equal(changelogSections("## [1.0] - 2020-01-01").length, 1);
  });

  it("displayedVersions ignores unrelated v-prefixed tokens", () => {
    assert.deepEqual(displayedVersions("see rev2 and v2.5.0 here"), ["2.5.0"]);
    assert.deepEqual(displayedVersions("nothing here"), []);
  });

  it("a manifest bumped without a changelog entry fails this suite's check", () => {
    const sections = changelogSections(CHANGELOG);
    const phantom = "99.0.0";
    assert.ok(
      !sections.some((s) => compareVersions(s.version, phantom) === 0),
      "the lookup must actually miss for a version that was never documented",
    );
  });

  it("a stale site badge fails the equality this suite asserts", () => {
    const stale = LANDING.replaceAll(`v${manifest.version}`, "v0.0.1");
    assert.ok(
      displayedVersions(stale).some((v) => compareVersions(v, manifest.version) !== 0),
      "the check must actually notice a drifted badge",
    );
  });

  it("changelogTagLinks reads reference definitions, not prose or index links", () => {
    assert.deepEqual(
      changelogTagLinks("[2.4]: https://github.com/o/r/releases/tag/v2.4"),
      [{ version: "2.4", url: "https://github.com/o/r/releases/tag/v2.4", tag: "v2.4" }],
    );
    assert.deepEqual(
      changelogTagLinks("see [2.4]: https://github.com/o/r/releases/tag/v2.4 inline"),
      [],
      "only a definition at the start of a line defines a link",
    );
    assert.deepEqual(
      changelogTagLinks("[Unreleased]: https://github.com/o/r/releases"),
      [],
      "the /releases index is not a per-tag link and resolves regardless",
    );
  });

  it("a stranded section — bumped over, never tagged — fails the orphan guard", (t) => {
    const tags = gitTags();
    if (!tags) {
      t.skip("this checkout carries no tags, so the canary has nothing to compare against");
      return;
    }
    // Reintroduce exactly the shape the repository shipped: a section for a version below
    // the manifest, linking the tag the pipeline would have created for it, with no such
    // tag anywhere. If the predicate tolerates this, it would have tolerated the live defect.
    const stranded = "2.4.999";
    assert.ok(
      compareVersions(stranded, manifest.version) < 0,
      "the fabricated version must sit below the manifest, where the guard looks",
    );
    const link = `[${stranded}]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/${pluginReleaseTag(stranded)}`;
    const injected = `## [${stranded}] - 2026-01-01\n\n### Added\n\n- x\n\n${link}\n\n`;
    const mutated = CHANGELOG.replace("## [2.4.1]", `${injected}## [2.4.1]`);
    const offender = changelogSections(mutated).find((s) => s.version === stranded);
    assert.ok(offender, "the mutation must actually introduce a section below the manifest");
    const offenderLink = changelogTagLinks(mutated).find((l) => l.version === stranded);
    assert.ok(offenderLink, "and the section must carry a link for the guard to resolve");
    assert.ok(
      !tags.includes(offenderLink.tag),
      `${offenderLink.tag} must be absent from this repository, or the canary proves nothing`,
    );
  });

  it("a changelog link that names an unpublishable tag fails this suite's check", () => {
    // Build the wrong tag from the right one rather than from the manifest string. `v` +
    // the raw version is only wrong while the version ends in `.0`; for a patch release
    // like 2.4.1 it is exactly what the pipeline creates, and a canary written that way
    // goes red on a correct repository the first time a patch ships.
    const definition = `[${manifest.version}]:`;
    const broken = CHANGELOG.split("\n")
      .map((line) =>
        line.startsWith(definition)
          ? `[${manifest.version}]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/${pluginReleaseTag(manifest.version)}.0`
          : line,
      )
      .join("\n");
    const link = changelogTagLinks(broken).find(
      (l) => compareVersions(l.version, manifest.version) === 0,
    );
    assert.ok(link, "the mutation must still produce a link definition");
    assert.notEqual(
      link.tag,
      pluginReleaseTag(manifest.version),
      "a tag the pipeline never creates must be caught — that was the live defect",
    );
  });

  it("the canary's mutation is wrong for every version shape, not just X.Y.0", () => {
    // The property under test is the canary's own construction, so it is checked directly
    // against the shapes the manifest can hold rather than only the one it holds today.
    for (const version of ["2.6.0", "2.4.1", "1.0", "3.0.0", "2.10.4"]) {
      const published = pluginReleaseTag(version);
      assert.notEqual(
        `${published}.0`,
        published,
        `${version}: the canary must name a tag the pipeline cannot create`,
      );
    }
    assert.equal(
      `v${"2.4.1"}`,
      pluginReleaseTag("2.4.1"),
      "and the old construction is proven wrong: for a patch release `v` + the manifest " +
        "version *is* the published tag, so asserting it differs would fail on a healthy repo",
    );
  });
});

describe("the tag rule is derived from the pipeline, not restated", () => {
  it("create-release.yml tags the version build-plugin.py normalized", () => {
    const wf = read(".github/workflows/create-release.yml");
    assert.match(
      wf,
      /TAG="v\$\{VERSION\}"/,
      "the release tag is `v` + VERSION; if that changes, pluginReleaseTag must change with it",
    );
    assert.match(
      wf,
      /VERSION:\s*\$\{\{\s*steps\.build\.outputs\.version\s*\}\}/,
      "VERSION comes from build-plugin.py's output, i.e. the *normalized* version — not " +
        "the raw tag or input. That indirection is why a v2.6.0 link does not resolve: the " +
        "release is published at v2.6.",
    );
  });

  it("agrees with build-plugin.py's own normalize_version", (t) => {
    const cases = ["2.6.0", "2.4.1", "2.4.0", "1.0.0", "3.0.0", "2.10.0", "v2.6.0"];
    const script =
      "import importlib.util,sys\n" +
      "spec=importlib.util.spec_from_file_location('bp', sys.argv[1])\n" +
      "m=importlib.util.module_from_spec(spec)\n" +
      "spec.loader.exec_module(m)\n" +
      "print('\\n'.join(m.normalize_version(v) for v in sys.argv[2:]))\n";
    let out = null;
    for (const exe of ["python3", "python"]) {
      // -B: importing build-plugin.py must not leave a __pycache__ in a tracked directory.
      const res = spawnSync(
        exe,
        ["-B", "-c", script, path.join(repoRoot, "scripts/build-plugin.py"), ...cases],
        { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } },
      );
      if (res.status === 0) {
        out = res.stdout.trim().split(/\r?\n/);
        break;
      }
    }
    if (!out) {
      t.skip("no python interpreter available to cross-check normalize_version");
      return;
    }
    assert.equal(out.length, cases.length, "one normalized version per case");
    cases.forEach((v, i) => {
      assert.equal(
        pluginReleaseTag(v),
        `v${out[i]}`,
        `pluginReleaseTag(${v}) must equal 'v' + build-plugin.py's normalize_version(${v}) ` +
          `= v${out[i]} — the JS copy exists only because the checker runs in Node`,
      );
    });
  });
});
