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
import { NEED_CLUSTER_DEFINITION } from "../tools/evidence-pack.mjs";

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

  it("looks the run up by event, branch and commit rather than by --limit 1", () => {
    // `--limit 1` races with any concurrent run, and the evidence then records a green run
    // that is not the release run — which is unfalsifiable after the fact.
    for (const filter of ["--event workflow_dispatch", "--branch main", "--commit"]) {
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

  it("documents dispatching the release instead of pushing a tag", () => {
    assert.match(runbook, /gh workflow run create-release\.yml --ref main -f version=X\.Y/);
    assert.doesNotMatch(runbook, /git tag vX\.Y && git push origin vX\.Y/);
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

/* -------------------------------------------------- the steps that are also executable */

describe("every step with an executable form names it", () => {
  // A procedure that only prose describes gets performed differently each time — which is how
  // #104's defect class ("no rehearsal exists") survived a runbook that documented the
  // pre-flight. Derive the requirement from the tools: a tool that exists but which the
  // runbook does not name is a tool a maintainer will not run.
  const EXECUTABLE_STEPS = [
    { tool: "evals/tools/release-preflight.mjs", flag: "--tag vX.Y" },
    { tool: "evals/tools/live-profile.mjs", flag: "--archive" },
    { tool: "evals/tools/evidence-pack.mjs", flag: "--markdown" },
  ];

  /** Split a command line the way a shell would, so a quoted value stays one token. */
  const tokenize = (line) =>
    [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => (m[1] === undefined ? m[2] : m[1]));

  for (const { tool, flag } of EXECUTABLE_STEPS) {
    it(`names ${tool}, which exists`, () => {
      assert.ok(fs.existsSync(path.join(repoRoot, tool)), `${tool} is cited but absent`);
      assert.match(
        runbook,
        new RegExp(tool.replace(/[/.]/g, "\\$&")),
        `${tool} exists but the runbook never tells anyone to run it`,
      );
      assert.ok(runbook.includes(flag), `the runbook invokes ${tool} without ${flag}`);
    });

    it(`mentions no option ${tool} does not have`, async () => {
      // Prose is where the last wrong option hid: the runbook offered `--skip-dirty`, which
      // never existed, and the fenced-block check below could not see it because it is not in
      // a fenced block. Read the options named in the prose that follows this tool's
      // invocation, up to the next heading, and require the tool's USAGE to document them.
      // Spans that name a different command (`check-distribution.mjs --strict`) belong to that
      // command, not this one, so they are skipped rather than mis-attributed.
      const { USAGE } = await import(`../tools/${path.basename(tool)}`);
      const name = path.basename(tool);
      const fenced = [...runbook.matchAll(/```bash\r?\n[\s\S]*?```/g)].find((m) =>
        m[0].includes(name),
      );
      assert.ok(fenced, `no fenced invocation of ${name} to read the prose after`);
      const start = fenced.index + fenced[0].length;
      const heading = runbook.slice(start).search(/\r?\n#{2,3} /);
      const region = runbook.slice(start, heading === -1 ? undefined : start + heading);

      const spans = [...region.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
      const mentioned = new Set();
      for (const span of spans) {
        if (/[\w-]+\.(mjs|py|yml|json|md)/.test(span) && !span.includes(name)) continue;
        for (const [option] of span.matchAll(/(?<![-\w])--[a-z][a-z-]*/g)) mentioned.add(option);
      }
      assert.ok(mentioned.size > 0, `the prose after the ${name} invocation offers no options`);
      for (const option of mentioned) {
        assert.ok(
          USAGE.includes(option),
          `the runbook offers ${option} for ${name}, whose usage does not document it`,
        );
      }
    });

    it(`invokes ${tool} with options its own parser accepts`, async () => {
      // The runbook's commands are copy-pasted, so an option that has been renamed would fail
      // at the worst possible moment. Grepping the source for the option string is not enough
      // — `--tags` appears in `release-preflight.mjs` as an argument to `git ls-remote`, so a
      // runbook that said `--tags` would have passed that check while failing at runtime.
      // Run the tool's own `parseArgs` over the runbook's tokens instead.
      const { parseArgs } = await import(`../tools/${path.basename(tool)}`);
      const name = path.basename(tool);
      const blocks = [...runbook.matchAll(/```bash\r?\n([\s\S]*?)```/g)]
        .map((m) => m[1])
        .filter((b) => b.includes(name));
      assert.ok(blocks.length > 0, `no fenced invocation of ${name} in the runbook`);

      let invocations = 0;
      for (const block of blocks) {
        // Join shell line-continuations first, so a wrapped command stays one command.
        for (const line of block.replace(/\\\r?\n\s*/g, " ").split(/\r?\n/)) {
          if (!line.includes(name)) continue;
          const argv = tokenize(line.slice(line.indexOf(name) + name.length));
          assert.ok(argv.some((a) => a.startsWith("--")), `${name} is invoked with no options`);
          assert.doesNotThrow(
            () => parseArgs(argv),
            `the runbook invokes ${name} with arguments it rejects: ${argv.join(" ")}`,
          );
          invocations += 1;
        }
      }
      assert.ok(invocations > 0, `no runnable ${name} command line in the runbook`);
    });
  }

  it("puts the rehearsal before the release dispatch, which is the only place it can help", () => {
    const rehearsal = runbook.indexOf("release-preflight.mjs");
    const dispatch = runbook.indexOf("gh workflow run create-release.yml --ref main -f version=X.Y");
    assert.ok(rehearsal !== -1, "release-preflight.mjs is not mentioned in the runbook");
    assert.ok(
      dispatch !== -1,
      '"gh workflow run create-release.yml --ref main -f version=X.Y" is not in the runbook',
    );
    assert.ok(rehearsal < dispatch, "the rehearsal is documented after the point of no return");
  });

  it("says the rehearsal opens the archive, which is what the pre-flight lacked", () => {
    // Derived: the gate id lives in the tool. If it were renamed or dropped, this fails.
    const source = fs.readFileSync(path.join(repoRoot, "evals/tools/release-preflight.mjs"), "utf8");
    assert.match(source, /"packaged-archive-loads"/, "the archive gate was renamed or removed");
    assert.match(runbook, /packaged-archive-loads/);
    assert.match(runbook, /on this\s*\n?side of the push/);
  });

  it("says a missing artefact family fails the pack rather than being skipped", () => {
    assert.match(runbook, /never skipped/);
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
    // The definition is derived from the tool, not restated: `NEED_CLUSTER_DEFINITION` is the
    // string `evidence-pack.mjs` prints, and the earlier wording here ("degree ≥ 4, not an
    // array length") was true of neither end — `computeHotspots` classifies with an if/else
    // chain, so an orphaned problem or unmet need of degree ≥ 4 is not a hub.
    assert.match(runbook, /graph-metrics\.mjs/);
    assert.match(runbook, /degree ≥ 4 graph property, not an array length/);
    assert.ok(
      NEED_CLUSTER_DEFINITION.includes("orphaned problem"),
      "the tool's definition no longer mentions the exclusion; re-read this claim",
    );
    assert.match(
      runbook,
      /excluding\*\* any already classified as an orphaned problem or an unmet need/,
      "the runbook must carry the exclusion the tool's definition states",
    );
    const hotspots = read(".github/extensions/srs-navigator/lib/graph-metrics.mjs");
    assert.match(hotspots, /orphanedProblems/, "the hotspot buckets were renamed");
    assert.match(hotspots, /unmetNeeds/, "the hotspot buckets were renamed");
    assert.match(
      hotspots,
      /needClusters: hotspots\.hubs\.length/,
      "need clusters no longer come from the hub bucket; the definition needs re-deriving",
    );
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
