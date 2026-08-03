// `docs/release-verification.md` is the runbook a maintainer follows during a release, and
// the reviews on #104 and #108 both made the same point about it: the previous copy of these
// instructions lived in `.spec/release-readiness/execution-plan.md`, which is gitignored — so
// the procedure a future maintainer needed was unavailable to them, and nothing could tell
// whether it still matched the workflows it described.
//
// A runbook whose commands have drifted from the pipeline is worse than none: it is followed.
// So this suite does not check that the file says the right words. It reads the workflows,
// the README and the shared library, derives what the runbook must say, and asserts the file
// agrees. When the pipeline changes, this fails — which is the only way a document like this
// stays true without a human re-reading it every release.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  ARTIFACT_FAMILIES,
  coveredReadmeHeadings,
  readmeInstallHeadings,
} from "../lib/distribution-artifacts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

let runbook = "";
let createRelease = "";
let releaseCanvas = "";

before(() => {
  runbook = read("docs/release-verification.md");
  createRelease = read(".github/workflows/create-release.yml");
  releaseCanvas = read(".github/workflows/release-canvas.yml");
});

/* ------------------------------------------------------------------------ it is durable */

describe("the runbook is somewhere a maintainer can actually read it", () => {
  it("is tracked, not gitignored like the plan the reviews flagged", (t) => {
    // The whole reason this file exists. Ask git rather than pattern-match `.gitignore`:
    // the ignore file has several `docs/**` entries already, so a hand-rolled check would
    // answer a different question than the one that matters — is *this file* visible.
    const ignored = (rel) =>
      spawnSync("git", ["check-ignore", "-q", rel], { cwd: repoRoot }).status === 0;
    if (spawnSync("git", ["rev-parse", "--git-dir"], { cwd: repoRoot }).status !== 0) {
      t.skip("not a git checkout");
      return;
    }
    assert.ok(
      ignored(".spec/release-readiness/execution-plan.md"),
      "assumption changed: .spec/ is no longer ignored",
    );
    assert.ok(
      !ignored("docs/release-verification.md"),
      "the runbook is ignored — that is exactly the defect it was written to fix",
    );
    assert.ok(fs.existsSync(path.join(repoRoot, "docs/release-verification.md")));
  });

  it("is reachable from the policy document rather than duplicating it", () => {
    const instructions = read(".github/copilot-instructions.md");
    assert.match(
      instructions,
      /docs\/release-verification\.md/,
      "copilot-instructions.md must link the runbook, or the steps are orphaned again",
    );
  });
});

/* ------------------------------------------------------- families derived from the README */

describe("the artefact-families table is derived from the README, not asserted about it", () => {
  it("names every family the shared library defines", () => {
    for (const family of ARTIFACT_FAMILIES) {
      assert.match(
        runbook,
        new RegExp(`\\*\\*${family.label}\\*\\*`),
        `the runbook does not list the ${family.id} family`,
      );
    }
  });

  it("claims the same method count the README actually documents", () => {
    // #107's review: "three install routes" undercounted the methods *and* overstated what
    // three transcripts cover. The corrected claim is N methods delivering 3 byte streams —
    // and N is read from the README so adding a seventh method fails here.
    const methods = readmeInstallHeadings(read("README.md"));
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
    assert.match(
      runbook,
      new RegExp(`\\*\\*${words[methods.length]}\\*\\* install methods`, "i"),
      `the README documents ${methods.length} install methods; the runbook says otherwise`,
    );
    assert.match(
      runbook,
      new RegExp(`\\*\\*${words[ARTIFACT_FAMILIES.length]}\\*\\* distinct byte streams`, "i"),
    );
  });

  it("covers every README method through some family", () => {
    const documented = readmeInstallHeadings(read("README.md"));
    const covered = coveredReadmeHeadings();
    assert.deepEqual(
      documented.filter((h) => !covered.includes(h)),
      [],
      "a README install method belongs to no artefact family",
    );
  });

  it("cites the verifier for the family that had no reader", () => {
    // The gap #107 opened with: the plugin archive was staged-and-checked, never *loaded*.
    assert.match(runbook, /evals\/tools\/verify-plugin-archive\.mjs/);
    assert.match(runbook, /evals\/tests\/plugin-archive-install\.test\.mjs/);
  });
});

/* -------------------------------------------------- commands derived from the workflows */

describe("the plugin-train commands match what create-release.yml does", () => {
  it("pins the recovery dispatch to the tag, because the workflow checks out the ref", () => {
    // Derived, not restated: the workflow's checkout has no `ref:`, so it takes the
    // dispatched ref, and `gh workflow run` defaults to the default branch. If someone adds
    // an explicit `ref:` to the workflow, this test tells them the runbook needs rewriting.
    assert.match(createRelease, /actions\/checkout@v\d/, "workflow no longer checks out");
    const checkoutBlock = createRelease.slice(createRelease.indexOf("actions/checkout@"));
    const nextStep = checkoutBlock.indexOf("\n      - ");
    assert.ok(
      !/^\s+ref:/m.test(nextStep === -1 ? checkoutBlock : checkoutBlock.slice(0, nextStep)),
      "create-release.yml now pins its own ref; the runbook's --ref rationale is stale",
    );
    assert.match(
      runbook,
      /gh workflow run create-release\.yml --ref vX\.Y -f version=X\.Y/,
      "the recovery command must pin --ref or it packages main against a tag",
    );
    assert.match(runbook, /`--ref` is not optional/);
  });

  it("looks the run up by event, ref and commit rather than by --limit 1", () => {
    // `--limit 1` races with any concurrent run, and the evidence then records a green run
    // that is not the release run — which is unfalsifiable after the fact.
    for (const filter of ["--event push", "--branch vX.Y", "--commit"]) {
      assert.ok(runbook.includes(filter), `run lookup is missing ${filter}`);
    }
    assert.match(runbook, /gh run watch "\$RUN" --exit-status/);
    assert.ok(
      !/gh run list[^\n]*--limit 1 --json databaseId[^\n]*\n[^\n]*gh run watch\s*$/m.test(runbook),
      "the runbook must record which run it watched",
    );
  });

  it("names the tag the pipeline creates, not the manifest string", () => {
    assert.match(runbook, /normalizes the version/);
    assert.match(runbook, /2\.6\.0.*publishes at\s*\n?\*\*`v2\.6`\*\*/s);
  });

  it("verifies the downloaded asset, not the repository at that ref", () => {
    assert.match(runbook, /gh release download vX\.Y -p 'problem-based-srs-\*\.zip'/);
    assert.match(runbook, /npx skills add.*clones the repository; it never opens the release/s);
  });

  it("explains the link closure instead of the grep it replaced", () => {
    assert.match(runbook, /replaces `grep -rn 'agents\/skills\/'`/);
    assert.match(runbook, /link closure/);
    assert.match(runbook, /Counts in its output are \*\*recorded, not gated\*\*/);
  });
});

describe("the canvas-train commands match what release-canvas.yml does", () => {
  it("does not tell anyone to push a canvas tag by hand", () => {
    // The canvas train creates its tag as part of publishing (`gh release create --target`),
    // which is what makes a failed publish unable to strand a tag. A runbook that said
    // `git tag vX.Y.Z` would break that property.
    assert.match(releaseCanvas, /workflow_dispatch/);
    assert.ok(
      !/git tag vX\.Y\.Z/.test(runbook),
      "the canvas train must not be documented as hand-tagged",
    );
    assert.match(runbook, /gh workflow run release-canvas\.yml/);
  });

  it("orders the recovery delete-then-rerun, because bump-version skips existing tags", () => {
    const deleteAt = runbook.indexOf("git push --delete origin vX.Y.Z");
    const rerunAt = runbook.indexOf("gh workflow run release-canvas.yml", deleteAt);
    assert.ok(deleteAt !== -1 && rerunAt > deleteAt, "delete must precede the re-run");
    assert.match(runbook, /skips any version whose tag exists/);
  });

  it("warns against hand-bumping VERSION, which the workflow owns", () => {
    assert.match(releaseCanvas, /bump-version\.mjs/);
    assert.match(runbook, /Do not hand-bump `VERSION`/);
  });
});

/* ------------------------------------------------- the /live claim, derived from the code */

describe("the /live section separates the two installs it actually depends on", () => {
  it("says the command ships with the skill, not the canvas archive", () => {
    assert.ok(
      fs.existsSync(path.join(repoRoot, "skills/problem-based-srs/reference/live.md")),
      "the runbook cites reference/live.md as the source of /live",
    );
    assert.match(runbook, /skills\/problem-based-srs\/reference\/live\.md/);
  });

  it("is right that the canvas tool cannot dispatch live", () => {
    // Derived from extension.mjs: if `live` were ever added to the action enum, installing
    // only the canvas archive *would* be a fair test of `/live`, and this paragraph would be
    // wrong. Read it rather than trust it.
    const ext = read(".github/extensions/srs-navigator/extension.mjs");
    const table = ext.match(/const ACTIONS = \[([\s\S]*?)\];/);
    assert.ok(table, "could not find the ACTIONS table in extension.mjs");
    const actions = [...table[1].matchAll(/action:\s*["']([a-z-]+)["']/g)].map((m) => m[1]);
    assert.ok(actions.length >= 9, `only found ${actions.length} actions; parser is stale`);
    assert.match(ext, /enum:\s*ACTIONS\.map/, "the tool's enum no longer comes from ACTIONS");
    assert.ok(
      !actions.includes("live"),
      "extension.mjs now dispatches `live`; the runbook's command-source table is stale",
    );
    assert.match(runbook, /action enum does \*\*not\*\* include `live`/);
  });

  it("requires workspace isolation, not merely an empty extensions directory", () => {
    // #105's correction. This repository's own workspace contributes the project extension,
    // so "the extensions directory is empty" does not make the run a clean loader test.
    assert.ok(
      fs.existsSync(path.join(repoRoot, ".github/extensions/srs-navigator/extension.mjs")),
      "the project extension is what makes this workspace non-neutral",
    );
    assert.match(runbook, /neutral workspace/);
    assert.match(runbook, /registers the same\s*\n?\s*canvas id and tool name twice/);
  });

  it("forbids substituting the loopback capture for a failed load", () => {
    assert.match(runbook, /A failed load is a result/);
    assert.match(runbook, /cannot be substituted/);
  });
});

/* ------------------------------------------------------------------- the evidence pack */

describe("the evidence-pack section keeps derived and recorded apart", () => {
  it("labels the skill file count as recorded and says why it cannot be derived", () => {
    // #107's review: the 9-row dispatch table cannot produce the 12-file total, because the
    // tree also carries SKILL.md and the example walkthroughs that no action dispatches.
    assert.match(runbook, /\*recorded\* from the installed tree; never a gate/);
    assert.match(runbook, /`SKILL\.md` and the `\*-example\.md` walkthroughs/);
  });

  it("labels the graph figures as derived and names the function that derives them", () => {
    assert.match(runbook, /graph-metrics\.mjs/);
    assert.match(runbook, /degree ≥ 4 graph property, not an array length/);
    assert.ok(
      fs.existsSync(path.join(repoRoot, ".github/extensions/srs-navigator/lib/graph-metrics.mjs")),
      "the runbook cites a module that must exist",
    );
  });

  it("reads a clean --strict run as zero errors, not as a readable surface", () => {
    // check-distribution.mjs exits 0 on warnings and notices by design. A pack that reported
    // "exit 0" as "everything verified" would be quoting the wrong property.
    const checker = read("scripts/check-distribution.mjs");
    assert.match(checker, /notice/, "severity model changed; re-read this claim");
    assert.match(runbook, /zero \*\*\*error\*\* findings\*\*|zero \*error\* findings/);
    assert.match(runbook, /every warning and notice explained/);
  });

  it("prescribes fixture canaries rather than mutating the tracked tree", () => {
    assert.match(runbook, /\*\*fixture canaries\*\*/);
    assert.match(runbook, /not by mutating the tracked tree/);
  });
});
