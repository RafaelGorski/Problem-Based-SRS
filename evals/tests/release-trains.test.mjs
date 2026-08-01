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
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  tagTrain,
  canvasReleaseTag,
  readPluginVersion,
  readCanvasVersions,
  expectationFailure,
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
const CLI = path.join(repoRoot, "scripts", "release-train.mjs");

/** The classification inputs as they stand in this repository today. */
const live = () => ({
  pluginVersion: readPluginVersion(repoRoot),
  canvasVersions: readCanvasVersions(repoRoot),
});

/**
 * Run the real CLI, and report what a workflow step would see: exit code and output.
 *
 * The three environment variables are dropped rather than inherited. `GITHUB_OUTPUT` and
 * `GITHUB_STEP_SUMMARY` are files the script *appends to*, so leaving them set would have
 * this suite write `train=` lines into the outputs of whichever CI step is running it;
 * `GITHUB_REF_NAME` is the CLI's default tag, and inheriting CI's ref would make the
 * positional/`--tag` assertions pass for the wrong reason.
 */
function runCli(args) {
  const env = { ...process.env };
  delete env.GITHUB_OUTPUT;
  delete env.GITHUB_STEP_SUMMARY;
  delete env.GITHUB_REF_NAME;
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd: repoRoot, env });
  return { status: res.status, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

/**
 * A repository root carrying nothing but the two files the classifier reads, so a release
 * state can be posed without touching the tracked ones — including states this repository
 * must never be in, like both trains advertising the same version.
 */
function fixtureRoot(t, { plugin, canvas }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-train-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude-plugin", "plugin.json"),
    `${JSON.stringify({ name: "problem-based-srs", version: plugin }, null, 2)}\n`,
  );
  const ext = path.join(dir, ".github", "extensions", "srs-navigator");
  fs.mkdirSync(ext, { recursive: true });
  fs.writeFileSync(
    path.join(ext, "package.json"),
    `${JSON.stringify({ name: "srs-navigator", version: canvas }, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(dir, "VERSION"), `${canvas}\n`);
  return dir;
}

/** Whole-line YAML comments, blanked so prose about `gh release create` cannot be mistaken
 *  for the step that runs it — while leaving every other offset intact. */
const withoutComments = (yaml) =>
  yaml
    .split("\n")
    .map((line) => (/^\s*#/.test(line) ? "" : line))
    .join("\n");

/**
 * Where the canvas train's preflight sits, relative to the two things that bound it.
 *
 * Offsets rather than step names: the gate has to run after `bump-version.mjs` has written
 * the new version (before that, the tag belongs to no train) and before the first action
 * that is visible outside the runner. Which step that is depends on the order of the
 * pipeline, and that order is under active change — so it is derived, not named.
 */
function canvasGateOrder(yaml) {
  const body = withoutComments(yaml);
  const at = (re) => {
    const m = re.exec(body);
    return m ? m.index : Infinity;
  };
  const leaves = [/git push/, /git tag\b/, /gh release create/].map(at);
  return {
    bump: at(/scripts\/bump-version\.mjs/),
    gate: at(/scripts\/release-train\.mjs/),
    leavesRunner: Math.min(...leaves),
  };
}

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

describe("release trains — both pipelines enforce exclusive ownership", () => {
  // #83 gated create-release.yml only, and that is the workflow the collision *arrives* at.
  // The canvas train is where it starts: release-canvas.yml computes the version, pushes the
  // tag and creates the release, so a tag both trains claim is pushed by this pipeline before
  // the plugin one ever sees it. Failing classification downstream does not unpush a tag, and
  // does not stop the canvas job from publishing over a release the plugin train owns.
  it("release-canvas.yml asks which train the tag it is about to publish belongs to", () => {
    assert.match(
      RELEASE_CANVAS,
      /scripts\/release-train\.mjs/,
      "the canvas release must classify its own tag; gating only the plugin workflow leaves " +
        "the pipeline that pushes the tag ungated",
    );
  });

  it("and refuses to continue unless the answer is its own train", () => {
    assert.match(
      RELEASE_CANVAS,
      /--expect\s+canvas/,
      "classifying without acting on the verdict is a log line, not a gate: release-train.mjs " +
        "exits 0 for `plugin` too, so the canvas job would sail past a tag it must not publish",
    );
  });

  it("classifies the tag bump-version.mjs just produced, not one written by hand", () => {
    assert.match(
      RELEASE_CANVAS,
      /release-train\.mjs[^\n]*steps\.bump\.outputs\.tag/,
      "the gate must read the same tag the release will publish",
    );
  });

  it("runs after the bump, because before it the tag belongs to nobody", () => {
    const order = canvasGateOrder(RELEASE_CANVAS);
    assert.notEqual(order.bump, Infinity, "the workflow still bumps the version");
    assert.notEqual(order.gate, Infinity, "the workflow still classifies the tag");
    assert.ok(
      order.gate > order.bump,
      "the classifier reads VERSION and the extension package.json off the disk; run before " +
        "the bump it would report `unknown` for every release this workflow ever cuts",
    );
  });

  it("runs before anything leaves the runner", () => {
    const order = canvasGateOrder(RELEASE_CANVAS);
    assert.notEqual(order.leavesRunner, Infinity, "the workflow still pushes or publishes");
    assert.ok(
      order.gate < order.leavesRunner,
      "a gate that runs after the push cannot prevent the push; the tag is already on origin " +
        "and create-release.yml has already fired against it",
    );
  });

  it("gates the two workflows differently, on purpose", () => {
    // Asymmetric because the trigger is asymmetric. create-release.yml fires on *every* `v*`
    // tag, most of which are not its business, so it skips; failing there would paint every
    // canvas release red. release-canvas.yml was dispatched by hand and is about to publish,
    // so the only safe answer to "this tag is not yours" is to stop.
    assert.match(CREATE_RELEASE, /needs\.train\.outputs\.train\s*==\s*'plugin'/, "plugin: skip");
    assert.doesNotMatch(
      CREATE_RELEASE,
      /--expect/,
      "the plugin workflow must not hard-fail on the canvas train's tags",
    );
    assert.doesNotMatch(
      RELEASE_CANVAS,
      /needs\.train\.outputs/,
      "the canvas workflow has one job and must stop, not skip a downstream one",
    );
  });

  it("the runbook explains the asymmetry, so it survives the next maintainer", () => {
    const runbook = read(".github/copilot-instructions.md");
    assert.match(
      runbook,
      /--expect canvas/,
      "the release process section must say the canvas train checks its own tag too",
    );
    assert.match(
      runbook,
      /both trains|either train|exclusive/i,
      "and why one workflow skips where the other fails",
    );
  });
});

describe("release trains — the classifier can be told which train it must be", () => {
  it("passes silently when the verdict is the expected train", () => {
    assert.equal(expectationFailure({ train: "canvas", tag: "v1.1.1" }, "canvas"), null);
    assert.equal(expectationFailure({ train: "plugin", tag: "v2.6" }, "plugin"), null);
    assert.equal(expectationFailure({ train: "canvas", tag: "v1.1.1" }, null), null, "opt-in");
  });

  it("names both trains when the verdict is the other one", () => {
    const why = expectationFailure({ train: "plugin", tag: "v2.6" }, "canvas");
    assert.ok(why, "a plugin tag must not pass a canvas-train gate");
    assert.match(why, /v2\.6/, "the tag");
    assert.match(why, /plugin/, "what it actually is");
    assert.match(why, /canvas/, "what the caller required");
  });

  it("rejects an expectation that is not a train", () => {
    assert.ok(expectationFailure({ train: "canvas", tag: "v1.1.1" }, "cavnas"), "typo, not a train");
  });

  it("refuses the plugin's tag when the canvas train asks — the gap #83 left", (t) => {
    // The state the reviewer described: a tag both trains claim. The canvas job is about to
    // push it and publish onto it; the plugin workflow's own gate cannot help, because by the
    // time it runs the tag exists.
    const root = fixtureRoot(t, { plugin: "1.1.0", canvas: "1.1.0" });
    const verdict = runCli(["--tag", "v1.1.0", "--root", root]);
    assert.match(verdict.out, /train=ambiguous/, "the classifier already saw this");
    assert.equal(
      runCli(["--tag", "v1.1.0", "--expect", "canvas", "--root", root]).status,
      1,
      "and now the canvas train acts on it",
    );
  });

  it("refuses a tag that belongs to the other train", (t) => {
    const root = fixtureRoot(t, { plugin: "2.6.0", canvas: "1.1.0" });
    assert.equal(runCli(["--tag", "v1.1.0", "--expect", "canvas", "--root", root]).status, 0);
    const wrong = runCli(["--tag", "v2.6", "--expect", "canvas", "--root", root]);
    assert.equal(wrong.status, 1, wrong.out);
    assert.match(wrong.out, /::error::/, "and says so in a form Actions surfaces");
  });

  it("still refuses a tag no train claims", (t) => {
    const root = fixtureRoot(t, { plugin: "2.6.0", canvas: "1.1.0" });
    assert.equal(runCli(["--tag", "v9.9.9", "--expect", "canvas", "--root", root]).status, 1);
  });

  it("is the canvas train's tag only after the bump is written", (t) => {
    // The reviewer's third point, turned into the reason the preflight sits where it does.
    // On the tree as it stands the next canvas tag belongs to nobody; the bump is what makes
    // it the canvas train's, so a gate placed above the bump would reject every release.
    const next = nextVersion(EXT_PKG.version, "patch", []);
    const tag = `v${next}`;

    const before = runCli([
      "--tag",
      tag,
      "--root",
      fixtureRoot(t, { plugin: MANIFEST.version, canvas: EXT_PKG.version }),
    ]);
    assert.match(before.out, /train=unknown/, `${tag} is claimed by nobody before the bump`);
    assert.equal(before.status, 1);

    const after = runCli([
      "--tag",
      tag,
      "--expect",
      "canvas",
      "--root",
      fixtureRoot(t, { plugin: MANIFEST.version, canvas: next }),
    ]);
    assert.equal(after.status, 0, after.out);
    assert.match(after.out, /train=canvas/);
  });

  it("that bumped version is the one bump-version.mjs really produces", () => {
    // The fixture above is only honest if it poses the state a release would actually reach.
    // --dry-run runs the real script and writes nothing, so the prediction is checked against
    // the script rather than against this test's copy of its rule.
    const tags = spawnSync("git", ["tag", "--list"], { encoding: "utf8", cwd: repoRoot });
    const taken = (tags.stdout ?? "").split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
    const dry = spawnSync(process.execPath, [path.join(repoRoot, "scripts/bump-version.mjs"), "--dry-run"], {
      encoding: "utf8",
      cwd: repoRoot,
      env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
    });
    assert.equal(dry.status, 0, dry.stderr);
    const predicted = /Next version:\s+(\d+\.\d+\.\d+)/.exec(dry.stdout);
    assert.ok(predicted, `could not read the next version from:\n${dry.stdout}`);
    assert.equal(predicted[1], nextVersion(EXT_PKG.version, "patch", taken));
    assert.equal(read("VERSION").trim(), VERSION_FILE, "--dry-run wrote nothing");
  });
});

describe("release trains — the CLI does not silently ignore what it was given", () => {
  it("accepts the tag as a bare argument, the form the runbook and issues use", () => {
    // `node scripts/release-train.mjs v2.6` used to drop the argument and classify
    // $GITHUB_REF_NAME instead — locally empty, so it answered `unknown` for a tag that is
    // plainly this repository's next plugin release. A reviewer ran exactly that command.
    const positional = runCli(["v2.6"]);
    assert.equal(positional.status, 0, positional.out);
    assert.match(positional.out, /train=plugin/);
    assert.deepEqual(
      [positional.status, /train=(\w+)/.exec(positional.out)[1]],
      [runCli(["--tag", "v2.6"]).status, /train=(\w+)/.exec(runCli(["--tag", "v2.6"]).out)[1]],
      "both forms must answer the same",
    );
  });

  it("fails on an option it does not know instead of dropping it", () => {
    const typo = runCli(["--tagg", "v2.6"]);
    assert.notEqual(typo.status, 0, "a misspelt gate flag must not pass as an ungated run");
    assert.match(typo.out, /--tagg/, "and must name the option it refused");
  });

  it("fails on a second bare argument rather than picking one", () => {
    assert.notEqual(runCli(["v2.6", "v1.1.0"]).status, 0);
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

  it("a canvas workflow with the preflight deleted fails the wiring assertion", () => {
    const ungated = RELEASE_CANVAS.replace(/^.*scripts\/release-train\.mjs.*$/m, "");
    assert.notEqual(ungated, RELEASE_CANVAS, "the mutation must actually remove the preflight");
    assert.doesNotMatch(ungated, /scripts\/release-train\.mjs/, "this is the state #83 shipped");
    assert.equal(canvasGateOrder(ungated).gate, Infinity, "and the ordering check sees it too");
  });

  it("a preflight without --expect would let the plugin's tag through", (t) => {
    // Why the flag is the gate and the invocation is not: release-train.mjs exits 0 for any
    // attributable tag, so a canvas job that merely *ran* the classifier would continue on a
    // tag it must not publish. Proven by exit code, not by reading the workflow.
    const root = fixtureRoot(t, { plugin: "2.6.0", canvas: "1.1.0" });
    assert.equal(runCli(["--tag", "v2.6", "--root", root]).status, 0, "classified, not gated");
    assert.equal(runCli(["--tag", "v2.6", "--expect", "canvas", "--root", root]).status, 1);
  });

  it("a preflight moved below the push fails the ordering assertion", () => {
    const gateLine = /^.*scripts\/release-train\.mjs.*$/m.exec(RELEASE_CANVAS)[0];
    const moved = `${RELEASE_CANVAS.replace(gateLine, "")}\n${gateLine}\n`;
    const order = canvasGateOrder(moved);
    assert.ok(
      order.gate > order.leavesRunner,
      "the mutation must actually move the gate past the push",
    );
    assert.ok(
      canvasGateOrder(RELEASE_CANVAS).gate < canvasGateOrder(RELEASE_CANVAS).leavesRunner,
      "while the tracked workflow keeps it before — a canary that cannot separate the two " +
        "proves nothing",
    );
  });

  it("a preflight moved above the bump fails the ordering assertion", () => {
    const gateLine = /^.*scripts\/release-train\.mjs.*$/m.exec(RELEASE_CANVAS)[0];
    const bumpLine = /^.*scripts\/bump-version\.mjs.*$/m.exec(RELEASE_CANVAS)[0];
    const moved = RELEASE_CANVAS.replace(gateLine, "").replace(bumpLine, `${gateLine}\n${bumpLine}`);
    const order = canvasGateOrder(moved);
    assert.ok(order.gate < order.bump, "the mutation must actually move the gate above the bump");
  });

  it("prose about publishing cannot be mistaken for the step that does it", () => {
    // The ordering check reads offsets, and both workflows carry long header comments that
    // discuss `gh release create` and pushing tags. If comments counted, a header paragraph
    // would satisfy — or break — the ordering rule depending on where it was written.
    const commented = RELEASE_CANVAS.replace(
      /^jobs:/m,
      "# gh release create and git push, discussed before any step runs\njobs:",
    );
    assert.notEqual(commented, RELEASE_CANVAS, "the mutation must actually add the comment");
    assert.deepEqual(
      canvasGateOrder(commented).gate < canvasGateOrder(commented).leavesRunner,
      canvasGateOrder(RELEASE_CANVAS).gate < canvasGateOrder(RELEASE_CANVAS).leavesRunner,
      "a comment must not change the verdict",
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
