// The project ships on two release trains that share one tag namespace:
//
//   plugin  — .claude-plugin/plugin.json, tagged vX.Y   by create-release.yml
//   canvas  — VERSION / the extension package.json, tagged vX.Y.Z by release-canvas.yml
//
// `create-release.yml` triggers on `push: tags: ["v*"]`, and that glob matches both. The
// trains cannot be told apart by tag shape either — v2.4.1 is a plugin release and v1.1.0 is
// a canvas one. So publishing a canvas release fired the plugin pipeline against a tag that
// does not match plugin.json, and it failed:
//
//   run 28527065984 · tag v1.1.0 · 2026-07-01T15:01:11Z · "Build, validate & package" failed
//     ::error::validation failed: version mismatch: plugin.json has … but expected 1.1.1
//
// four seconds after release-canvas.yml published `srs-navigator 1.1.0`. The only failure in
// that workflow's entire history, and it is structural: it recurs on every canvas release.
//
// This suite pins the classification that keeps the trains apart, and the wiring that makes
// the release pipeline use it. Both rules are read from the pipelines themselves rather than
// restated here — a test that hard-codes what a workflow hard-codes is a second copy of it.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  tagTrain,
  canvasReleaseTag,
  readPluginVersion,
  readCanvasVersions,
} from "../../scripts/release-train.mjs";
import { pluginReleaseTag, summarize, repoSkillNames } from "../../scripts/check-distribution.mjs";
import { nextVersion } from "../../scripts/bump-version.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const MANIFEST = JSON.parse(read(".claude-plugin/plugin.json"));
const VERSION_FILE = read("VERSION").trim();
const EXT_PKG = JSON.parse(read(".github/extensions/srs-navigator/package.json"));
const CREATE_RELEASE = read(".github/workflows/create-release.yml");
const RELEASE_CANVAS = read(".github/workflows/release-canvas.yml");
const BUMP = read("scripts/bump-version.mjs");

/** The classification inputs as they stand in this repository today. */
const live = () => ({
  pluginVersion: readPluginVersion(repoRoot),
  canvasVersions: readCanvasVersions(repoRoot),
});

describe("release trains — a pushed tag belongs to exactly one pipeline", () => {
  it("claims the tag the plugin pipeline creates for the current manifest", () => {
    const tag = pluginReleaseTag(MANIFEST.version);
    assert.equal(tagTrain({ tag, ...live() }).train, "plugin", `${tag} is this repo's next plugin release`);
  });

  it("claims the three-part form of the plugin version too", () => {
    // build-plugin.py accepts any tag whose *normalized* version matches the manifest —
    // `validate --expected-version` compares normalize_version on both sides — so pushing
    // v2.6.0 for manifest 2.6.0 builds today. The classifier must agree with the pipeline it
    // gates, not with a stricter rule of its own, or it would reject a tag that works.
    const three = `v${MANIFEST.version}`;
    assert.equal(tagTrain({ tag: three, ...live() }).train, "plugin");
  });

  it("disclaims the tag release-canvas.yml creates", () => {
    const tag = `v${VERSION_FILE}`;
    assert.equal(
      tagTrain({ tag, ...live() }).train,
      "canvas",
      `${tag} is the canvas train's; the plugin pipeline must not try to release it`,
    );
  });

  it("would have caught the failure that actually happened", () => {
    // The exact state at 2026-07-01: plugin.json 2.0.0, VERSION 1.1.0, tag v1.1.0 pushed by
    // release-canvas.yml. The plugin pipeline ran and failed. This is the regression.
    const verdict = tagTrain({ tag: "v1.1.0", pluginVersion: "2.0.0", canvasVersions: ["1.1.0"] });
    assert.equal(verdict.train, "canvas", "run 28527065984 must not be able to recur");
  });

  it("refuses a tag that belongs to neither train", () => {
    const verdict = tagTrain({ tag: "v9.9.9", pluginVersion: "2.6.0", canvasVersions: ["1.1.0"] });
    assert.equal(verdict.train, "unknown");
    assert.match(String(verdict.reason), /9\.9\.9|neither|no release train/i);
  });

  it("refuses a tag that is not a version at all", () => {
    for (const tag of ["vNext", "v1.1.0-beta", "release", "", null, undefined]) {
      assert.equal(
        tagTrain({ tag, pluginVersion: "2.6.0", canvasVersions: ["1.1.0"] }).train,
        "unknown",
        `${JSON.stringify(tag)} names no release the pipelines create`,
      );
    }
  });

  it("reports a genuine collision rather than picking a winner", () => {
    // Manifest 1.1.0 publishes at v1.1, but build-plugin.py would also accept v1.1.0 — which
    // is exactly the tag bump-version.mjs creates for canvas 1.1.0. Publishing the plugin zip
    // onto the release the canvas job is about to create is worse than stopping, so this must
    // stop rather than guess.
    const verdict = tagTrain({ tag: "v1.1.0", pluginVersion: "1.1.0", canvasVersions: ["1.1.0"] });
    assert.equal(verdict.train, "ambiguous");
  });

  it("gives every verdict a reason a maintainer can act on", () => {
    for (const tag of [pluginReleaseTag(MANIFEST.version), `v${VERSION_FILE}`, "v9.9.9", "vNext"]) {
      const verdict = tagTrain({ tag, ...live() });
      assert.ok(
        typeof verdict.reason === "string" && verdict.reason.length > 10,
        `${tag} was classified "${verdict.train}" with no usable reason`,
      );
    }
  });
});

describe("release trains — the rules are read from the pipelines, not restated", () => {
  it("canvasReleaseTag matches the tag bump-version.mjs pushes", () => {
    assert.match(
      BUMP,
      /const tag = `v\$\{version\}`/,
      "bump-version.mjs tags `v` + the full X.Y.Z version; canvasReleaseTag mirrors that",
    );
    assert.equal(canvasReleaseTag("1.1.0"), "v1.1.0", "verbatim — the canvas train never strips .0");
    assert.equal(canvasReleaseTag("v1.1.0"), "v1.1.0");
    assert.equal(canvasReleaseTag("not-a-version"), null);
  });

  it("release-canvas.yml still pushes that tag itself", () => {
    assert.match(
      RELEASE_CANVAS,
      /git tag -a "\$\{\{ steps\.bump\.outputs\.tag \}\}"/,
      "if the canvas train stops tagging from bump-version's output, the classifier's canvas " +
        "side has to move with it",
    );
  });

  it("create-release.yml still triggers on every v* tag", () => {
    // Kept deliberately: the glob cannot express "tags whose version matches plugin.json", so
    // the trigger is not where the trains get separated. Asserting it stays broad is what makes
    // the gate below load-bearing rather than belt-and-braces.
    assert.match(CREATE_RELEASE, /tags:\s*\n\s*-\s*"v\*"/, "the plugin workflow still sees both trains");
  });

  it("create-release.yml classifies the tag before building anything", () => {
    assert.match(
      CREATE_RELEASE,
      /scripts\/release-train\.mjs/,
      "the plugin release must ask which train the tag belongs to",
    );
  });

  it("create-release.yml releases only when the answer is the plugin train", () => {
    assert.match(
      CREATE_RELEASE,
      /needs\.train\.outputs\.train\s*==\s*'plugin'/,
      "the publishing job must be gated on the classification, not merely informed by it",
    );
    assert.match(CREATE_RELEASE, /needs:\s*train/, "and it must depend on the job that produces it");
    assert.match(
      CREATE_RELEASE,
      /outputs:\s*\n\s*train:/,
      "the classify job has to publish its verdict for the gate to read",
    );
  });

  it("a manual dispatch still releases the plugin", () => {
    // workflow_dispatch carries no tag, so classification has nothing to read. The run was
    // asked for by hand on this workflow, which is the plugin train by definition.
    assert.match(
      CREATE_RELEASE,
      /github\.event_name.*=.*.push./,
      "the classifier must only be consulted for tag pushes",
    );
  });

  it("the runbook tells a maintainer the same rules", () => {
    // A pipeline behaviour nobody documented is one the next maintainer reverts by accident.
    const runbook = read(".github/copilot-instructions.md");
    assert.match(
      runbook,
      /release-train\.mjs/,
      "the release process section must say the pushed tag is attributed to a train",
    );
    assert.match(
      runbook,
      /VERSION.{0,80}owned by .{0,40}release-canvas\.yml/s,
      "and that hand-bumping VERSION in a feature branch skips the number instead of shipping it",
    );
  });
});

describe("release trains — the canvas version files agree", () => {
  it("VERSION and the extension package.json name the same version", () => {
    assert.equal(
      VERSION_FILE,
      EXT_PKG.version,
      "bump-version.mjs bumps from package.json while VERSION is what the docs, the drift " +
        "monitor and the canvas classifier read — if they disagree, the number the repository " +
        "advertises is not the one the next release starts from",
    );
  });

  it("both are offered to the classifier, so neither file alone can misroute a tag", () => {
    const versions = readCanvasVersions(repoRoot);
    assert.ok(versions.includes(VERSION_FILE), "VERSION must be one of the canvas versions");
    assert.ok(versions.includes(EXT_PKG.version), "package.json's version must be too");
  });
});

describe("release trains — the drift monitor predicts the version a release would publish", () => {
  const published = [
    { tag: "v2.6", name: "🎉 Version 2.6" },
    { tag: "v1.1.0", name: "srs-navigator 1.1.0" },
  ];
  const base = {
    listing: { skills: repoSkillNames(repoRoot), declaredCount: null, url: null },
    repoSkills: repoSkillNames(repoRoot),
    manifestVersion: "2.6.0",
    publishedReleases: published,
  };
  const canvasFinding = (canvasVersion, releases = published) =>
    summarize({ ...base, canvasVersion, publishedReleases: releases }).findings.find(
      (f) => f.id === "canvas-release-missing",
    );

  it("names the version running release-canvas.yml would actually publish", () => {
    // The old advice — "release-canvas.yml owns this train and bumps VERSION itself" — reads
    // as "run it and it will publish 1.1.1". It will not: bump-version.mjs *increments*, so it
    // publishes 1.1.2 and 1.1.1 is skipped forever. Same shape as the defect #82 fixed on the
    // plugin side: a finding whose instruction does not produce the state it asks for.
    const finding = canvasFinding("1.1.1");
    assert.ok(finding, "an advertised-but-unpublished canvas version must still be reported");
    const detail = finding.detail.join("\n");
    const willPublish = nextVersion("1.1.1", "patch", published.map((r) => r.tag));
    assert.equal(willPublish, "1.1.2", "the prediction under test");
    assert.ok(
      detail.includes(willPublish),
      `the finding must say the workflow would publish ${willPublish}; it said:\n${detail}`,
    );
  });

  it("still says who owns VERSION, so the fix is not just a number", () => {
    const detail = canvasFinding("1.1.1").detail.join("\n");
    assert.match(detail, /release-canvas\.yml/, "the workflow that owns the bump must stay named");
  });

  it("skips versions already tagged, exactly as bump-version.mjs does", () => {
    const releases = [...published, { tag: "v1.1.2", name: "srs-navigator 1.1.2" }];
    const detail = canvasFinding("1.1.1", releases).detail.join("\n");
    assert.ok(
      detail.includes(nextVersion("1.1.1", "patch", releases.map((r) => r.tag))),
      "the collision-skipping loop is part of the rule, not an implementation detail",
    );
  });

  it("says nothing about a canvas version that is published", () => {
    assert.equal(canvasFinding("1.1.0"), undefined, "v1.1.0 is published; there is no finding");
  });

  it("still reports a VERSION the bump script cannot parse, instead of throwing", () => {
    // A hand-edited "1.2" is exactly the mistake this monitor exists to notice. Predicting the
    // next version from it throws, and a monitor that dies on its own subject reports nothing.
    const finding = canvasFinding("1.2");
    assert.ok(finding, "a malformed VERSION must still surface as drift");
    assert.match(finding.detail.join("\n"), /cannot read 1\.2|X\.Y\.Z/);
  });
});

describe("bump-version — the rule is importable without running a release", () => {
  it("importing the module does not bump anything", () => {
    // The drift monitor imports this to predict the next version. If importing still ran
    // main(), reading the report would rewrite VERSION, package.json and copilot-extension.json.
    assert.match(
      BUMP,
      /import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href|path\.resolve\(process\.argv\[1\]\)/,
      "main() must sit behind an entry guard",
    );
    assert.equal(VERSION_FILE, read("VERSION").trim(), "VERSION survived this suite's imports");
    assert.equal(
      EXT_PKG.version,
      JSON.parse(read(".github/extensions/srs-navigator/package.json")).version,
      "package.json survived this suite's imports",
    );
  });

  it("nextVersion increments, and never reuses a published tag", () => {
    assert.equal(nextVersion("1.1.0", "patch", []), "1.1.1");
    assert.equal(nextVersion("1.1.0", "minor", []), "1.2.0");
    assert.equal(nextVersion("1.1.0", "major", []), "2.0.0");
    assert.equal(nextVersion("1.1.0", "patch", ["v1.1.1", "v1.1.2"]), "1.1.3");
    assert.equal(nextVersion("1.1.0"), "1.1.1", "patch is the default, as in the workflow input");
  });
});

describe("negative canaries", () => {
  it("an ungated workflow fails the gate assertion", () => {
    const ungated = CREATE_RELEASE.replace(/^\s*if:\s*needs\.train\.outputs\.train.*$/m, "");
    assert.notEqual(ungated, CREATE_RELEASE, "the mutation must actually remove the gate");
    assert.doesNotMatch(
      ungated,
      /needs\.train\.outputs\.train\s*==\s*'plugin'/,
      "removing the gate must be detectable — that was the live defect",
    );
  });

  it("a classifier that only knew the plugin train would misroute the canvas tag", () => {
    // Proves the canvas side of the rule does work, rather than the verdict falling out of a
    // default. Without canvasVersions, v1.1.0 is not claimed by anyone.
    const withoutCanvas = tagTrain({ tag: "v1.1.0", pluginVersion: "2.6.0", canvasVersions: [] });
    assert.equal(withoutCanvas.train, "unknown");
    assert.equal(
      tagTrain({ tag: "v1.1.0", pluginVersion: "2.6.0", canvasVersions: ["1.1.0"] }).train,
      "canvas",
    );
  });

  it("disagreeing canvas version files would make the monitor predict the wrong version", () => {
    // Why the agreement above is load-bearing rather than tidy: bump-version.mjs starts from
    // package.json, the monitor reports VERSION. Predicting from the wrong file names a release
    // that will never be cut.
    assert.notEqual(
      nextVersion("1.1.1", "patch", []),
      nextVersion("1.1.5", "patch", []),
      "a drifted pair predicts two different next releases",
    );
  });

  it("the plugin tag rule is the pipeline's, not a stricter local one", () => {
    // If the classifier compared tags byte-for-byte against pluginReleaseTag, v2.6.0 — which
    // build-plugin.py accepts — would be refused and a legitimate release would stop.
    assert.notEqual(`v${MANIFEST.version}`, pluginReleaseTag(MANIFEST.version));
    assert.equal(tagTrain({ tag: `v${MANIFEST.version}`, ...live() }).train, "plugin");
  });
});
