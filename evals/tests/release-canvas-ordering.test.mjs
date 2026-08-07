// A canvas release must not be able to advertise a version it failed to publish.
//
// `release-canvas.yml` used to push the version bump to `main` and push the tag *before* it
// packaged anything, so a failure in `package-extension.mjs` or `gh release create` left the
// repository advertising a version, a tag on origin, and no release — the drift monitor's
// `canvas-release-missing`. Worse, it was unrecoverable by re-running: `bump-version.mjs`
// starts from the already-bumped package.json and skips versions whose tag exists, so the
// stranded version is skipped forever.
//
// The properties pinned here:
//
//   1. Nothing is pushed until the artifact has been built and read.
//   2. The tag is created by the release, not before it — which is only true while this
//      workflow stays dispatch-only. `gh release create --target` creates the tag when the
//      tag does not yet exist and is *ignored* when it does, so adding a `push: tags`
//      trigger would silently turn the whole mechanism into a no-op.
//   3. A publish failure rolls the bump back, and a publish *success* never does.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const CANVAS_WF_PATH = ".github/workflows/release-canvas.yml";
const PLUGIN_WF_PATH = ".github/workflows/create-release.yml";
const CANVAS_WF = read(CANVAS_WF_PATH);
const PLUGIN_WF = read(PLUGIN_WF_PATH);

/** The guard the canvas pipeline must run before it publishes anything. */
const ARCHIVE_GUARD = "evals/tests/from-archive-install.test.mjs";

/**
 * Split a workflow into its steps, in file order, keeping only the shell each step runs.
 *
 * Deliberately not a YAML parser: this repository ships none, and the property under test is
 * about *order and content of the run blocks*, which a line scan answers exactly. A step
 * starts at a `- name:` list item; everything up to the next one is its body. `command`
 * holds the body minus comment lines, `name:`/`id:`/`if:` keys and `echo` lines, so a rule
 * quoted in a log message or a step title cannot stand in for the rule being followed.
 *
 * @param {string} yaml
 * @returns {{name: string, body: string, command: string, index: number}[]}
 */
export function steps(yaml) {
  const lines = yaml.split(/\r?\n/);
  const starts = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\s*-\s+name:\s*(.+?)\s*$/);
    if (m) starts.push({ name: m[1].replace(/^["']|["']$/g, ""), line: i });
  });
  return starts.map((s, i) => {
    const body = lines.slice(s.line, starts[i + 1]?.line ?? lines.length).join("\n");
    return { name: s.name, index: i, body, command: commandsOf(body) };
  });
}

/** A step body reduced to the commands it executes. */
export function commandsOf(body) {
  return body
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .filter((l) => !/^\s*-?\s*(name|id|if|env|working-directory|continue-on-error|uses):/.test(l))
    .filter((l) => !/^\s*echo\s/.test(l))
    .join("\n");
}

/** Whole-line `#` comments removed: a comment explaining a rule must not satisfy it. */
export function stripComments(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
}

/** Index of the first step whose commands match, or -1. */
export function firstStepMatching(stepList, re) {
  return stepList.findIndex((s) => re.test(s.command));
}

const CANVAS_STEPS = steps(CANVAS_WF);

// Steps that hand state to somewhere the next run can see: origin, or the release page.
const PUSHES = /git\s+push\b/;
const PACKAGES = /package-extension\.mjs/;
const PUBLISHES = /gh\s+release\s+create/;
const VERIFIES = new RegExp(ARCHIVE_GUARD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
// Every shape that creates a tag outside a release: `--tags`, an explicit refspec, and a
// bare `v…`/`"$TAG"` argument.
const HAND_TAGGED =
  /git\s+push\b[^\n]*--tags|git\s+push\s+\S+\s+["']?(refs\/tags\/|v\d|\$)/;

describe("release-canvas.yml — the workflow's shape is readable", () => {
  it("parses into an ordered list of named steps", () => {
    assert.ok(
      CANVAS_STEPS.length >= 5,
      `expected several steps in ${CANVAS_WF_PATH}; parsed ${CANVAS_STEPS.length}. ` +
        "If the workflow was restructured, fix steps() — every assertion below reads it, " +
        "so a parser that returns nothing would report a green run having checked nothing.",
    );
    assert.ok(
      CANVAS_STEPS.some((s) => PACKAGES.test(s.command)),
      "no step runs package-extension.mjs; the ordering assertions below would be vacuous",
    );
  });

  it("has no step this parser cannot see", () => {
    // steps() keys on `- name:`. A step declared without one would be invisible to every
    // ordering assertion below — including one that pushes.
    const unnamed = [...CANVAS_WF.matchAll(/^\s{4,}-\s+(run|uses|id|if|env):/gm)].map(
      (m) => m[1],
    );
    assert.deepEqual(
      unnamed,
      [],
      `every step must start with \`- name:\`; found a step starting with \`- ${unnamed[0]}:\`, ` +
        "which this parser cannot see and every assertion below would skip",
    );
  });
});

describe("release-canvas.yml — nothing is pushed before the artifact exists", () => {
  it("packages the extension before the first step that pushes", () => {
    const packageAt = firstStepMatching(CANVAS_STEPS, PACKAGES);
    const pushAt = firstStepMatching(CANVAS_STEPS, PUSHES);
    assert.notEqual(packageAt, -1, "no step runs package-extension.mjs");
    assert.notEqual(pushAt, -1, "no step pushes; the release must publish the bump commit");
    assert.ok(
      packageAt < pushAt,
      `packaging runs at step ${packageAt + 1} ("${CANVAS_STEPS[packageAt]?.name}") but ` +
        `step ${pushAt + 1} ("${CANVAS_STEPS[pushAt]?.name}") pushes first. A packaging ` +
        "failure would then leave main advertising a version with no release behind it, " +
        "and bump-version.mjs skips past it on the next run — permanently.",
    );
  });

  it("verifies the archive after packaging it and before the first step that pushes", () => {
    const packageAt = firstStepMatching(CANVAS_STEPS, PACKAGES);
    const verifyAt = firstStepMatching(CANVAS_STEPS, VERIFIES);
    const pushAt = firstStepMatching(CANVAS_STEPS, PUSHES);
    assert.notEqual(
      verifyAt,
      -1,
      `no step runs ${ARCHIVE_GUARD}. It is the only test that opens what the release ` +
        "attaches — the 4.32 MB node_modules-laden srs-navigator-1.1.0.zip shipped because " +
        "this pipeline runs the extension's npm test and never the eval suite.",
    );
    assert.ok(
      packageAt < verifyAt,
      "the archive guard must run after packaging, or there is no archive to read",
    );
    assert.ok(
      verifyAt < pushAt,
      `the archive guard runs at step ${verifyAt + 1} but step ${pushAt + 1} ` +
        `("${CANVAS_STEPS[pushAt]?.name}") pushes first — a bad archive would already be ` +
        "advertised by the time it was caught",
    );
  });

  it("opens the archive it actually built, not only a freshly staged copy", () => {
    const verify = CANVAS_STEPS.find((s) => VERIFIES.test(s.command));
    assert.match(
      verify?.command ?? "",
      /tar\s+-tzf\s+"?\$?\{?ARCHIVE/,
      "the guard stages its own tree via stage(); without also reading build/*.tar.gz a " +
        "packaging or tar regression passes on the strength of a copy nobody ships",
    );
    assert.match(
      verify?.command ?? "",
      /ARCHIVE_ROOT/,
      "derive the archive's top-level directory from package-extension.mjs rather than " +
        "restating it, or the check drifts the moment the packager changes",
    );
  });

  it("reads the complete archive listing so pipefail cannot turn a match into SIGPIPE", () => {
    const verify = CANVAS_STEPS.find((s) => VERIFIES.test(s.command));
    assert.doesNotMatch(
      verify?.command ?? "",
      /tar\s+-t[a-z]*f\s+"?\$?\{?ARCHIVE"?\s*\|\s*grep/,
      "grep can close the tar pipe early; with pipefail tar then reports SIGPIPE — write the " +
        "listing to a file first and grep the file instead of the pipe",
    );
    assert.match(
      verify?.command ?? "",
      />\s*"?\$?\{?RUNNER_TEMP\}?\/?[^\n]*"?\n[\s\S]*grep\s+-q\b/,
      "the archive member check must write the full listing to a file, then grep that file",
    );
  });

  it("verifies the archive against the tree the release ships, i.e. after the skill sync", () => {
    const syncAt = firstStepMatching(CANVAS_STEPS, /sync-skills\.mjs/);
    const verifyAt = firstStepMatching(CANVAS_STEPS, VERIFIES);
    assert.notEqual(syncAt, -1, "no step refreshes the bundled skills");
    assert.ok(
      syncAt < verifyAt,
      "the archive guard must run after sync-skills.mjs, or it checks a tree the release " +
        "does not ship",
    );
  });

  it("publishes only after the bump commit has been pushed", () => {
    const pushAt = firstStepMatching(CANVAS_STEPS, PUSHES);
    const publishAt = firstStepMatching(CANVAS_STEPS, PUBLISHES);
    assert.notEqual(publishAt, -1, "no step runs `gh release create`");
    assert.ok(
      pushAt < publishAt,
      "the release targets the bump commit, so that commit must be on the remote first",
    );
  });

  it("verifies both assets downloaded from the published release", () => {
    const publishAt = firstStepMatching(CANVAS_STEPS, PUBLISHES);
    const verifyDownloadedAt = firstStepMatching(CANVAS_STEPS, /gh\s+release\s+download/);
    assert.ok(verifyDownloadedAt > publishAt, "downloaded-asset verification must follow publication");
    const step = CANVAS_STEPS[verifyDownloadedAt];
    assert.match(step.command, /sha256sum/);
    assert.match(step.command, /verify-canvas-archive\.mjs[\s\S]*verify-canvas-archive\.mjs/);
    assert.match(step.command, /cmp\s+.*zip\.paths.*tar\.paths/);
    assert.match(step.command, /release-metadata\.json/);
  });
});

describe("release-canvas.yml — the tag is created by the release, not before it", () => {
  it("no step pushes a tag by hand", () => {
    const offenders = CANVAS_STEPS.filter((s) => HAND_TAGGED.test(s.command));
    assert.deepEqual(
      offenders.map((s) => s.name),
      [],
      "a hand-pushed tag exists before the release does. If the publish step then fails, " +
        "the tag is stranded and bump-version.mjs skips its version forever. Let " +
        "`gh release create --target` create the tag instead.",
    );
  });

  it("creates the release with an explicit --target commit", () => {
    const releaseStep = CANVAS_STEPS.find((s) => PUBLISHES.test(s.command));
    assert.match(
      releaseStep?.command ?? "",
      /gh\s+release\s+create[\s\S]*?--target/,
      "`gh release create` must pass --target so GitHub creates the tag as part of the " +
        "release; without it the workflow needs a tag to already exist, which is the " +
        "stranding window this guard closes",
    );
  });

  it("stays dispatch-only, because --target is ignored once the tag exists", () => {
    // The load-bearing assumption. `gh release create --target` creates the tag only when
    // the tag is absent; GitHub ignores --target for an existing tag. A `push: tags`
    // trigger would mean the tag exists before the run and every guarantee above quietly
    // becomes false while this file stays green.
    const triggers = CANVAS_WF.slice(
      CANVAS_WF.indexOf("\non:"),
      CANVAS_WF.indexOf("\npermissions:"),
    );
    assert.doesNotMatch(
      triggers,
      /tags:/,
      `${CANVAS_WF_PATH} gained a tag trigger. The tag would then already exist when the ` +
        "workflow runs, --target would be ignored, and the atomic publish this file " +
        "guards would silently stop happening.",
    );
    assert.match(triggers, /workflow_dispatch:/, "the canvas release is dispatched by hand");
    // Keep the plugin workflow aligned with the cadence too: a tag trigger there would
    // reintroduce an out-of-band release path.
    assert.match(
      PLUGIN_WF.slice(0, PLUGIN_WF.indexOf("\npermissions:")),
      /workflow_dispatch:/,
      `${PLUGIN_WF_PATH} must stay dispatch-only alongside the Thursday cadence`,
    );
    assert.doesNotMatch(
      PLUGIN_WF.slice(0, PLUGIN_WF.indexOf("\npermissions:")),
      /tags:/,
      `${PLUGIN_WF_PATH} must not regain a tag trigger outside the Thursday cadence`,
    );
  });

  it("runs only on the default branch", () => {
    const guard = CANVAS_STEPS.find((s) => /::error::/.test(s.body) && /exit 1/.test(s.body));
    assert.ok(
      guard,
      "workflow_dispatch runs on whichever ref the caller picks, and this workflow pushes " +
        "to that ref and writes global tags — a release cut from a feature branch would " +
        "advertise a version main does not carry",
    );
    assert.match(
      guard.body,
      /if:.*github\.ref_name\s*!=/,
      "the branch guard must be a step condition on github.ref_name",
    );
    assert.doesNotMatch(
      CANVAS_WF,
      /group:\s*release-\$\{\{\s*github\.ref/,
      "the concurrency group must not be per-ref: the tags and release page this workflow " +
        "writes are global, so two dispatches must not run at once",
    );
  });
});

describe("release-canvas.yml — a failed publish does not leave a version advertised", () => {
  const rollback = CANVAS_STEPS.find((s) => /git\s+revert/.test(s.command));

  it("reverts the pushed version bump when a later step fails", () => {
    assert.ok(
      rollback,
      "no step reverts the version bump on failure. Pushing the bump is the last thing " +
        "that can still leave main advertising a version no release delivers — and " +
        "bump-version.mjs starts from the bumped package.json, so a re-run publishes the " +
        "*next* version and strands this one permanently.",
    );
    assert.match(
      rollback.body,
      /if:\s*\(failure\(\)\s*\|\|\s*cancelled\(\)\)/,
      "the rollback must cover cancellation too: failure() alone does not fire when a run " +
        "is cancelled after the bump was pushed",
    );
  });

  it("only reverts a bump that was actually pushed", () => {
    const commit = CANVAS_STEPS.find((s) => /git\s+diff\s+--cached\s+--quiet/.test(s.body));
    assert.ok(commit, "no step commits the bump");
    assert.match(
      commit.body,
      /pushed=(true|false)"?\s*>>/,
      "the commit step must record whether it pushed; a run that had nothing to commit " +
        "has nothing to revert, and reverting an unrelated HEAD would be worse than the bug",
    );
    assert.match(
      rollback?.body ?? "",
      /steps\.commit\.outputs\.pushed\s*==\s*'true'/,
      "the rollback must read that flag rather than assuming a push happened",
    );
  });

  it("never reverts a bump whose release did publish", () => {
    const publish = CANVAS_STEPS.find((s) => PUBLISHES.test(s.command));
    assert.match(
      publish?.body ?? "",
      /published=true"?\s*>>/,
      "the publishing step must record success immediately after `gh release create`, in " +
        "its own step — anything after that point is bookkeeping, and a failure there must " +
        "not be read as 'the release did not publish'",
    );
    assert.doesNotMatch(
      publish?.command ?? "",
      /gh\s+release\s+view/,
      "keep bookkeeping out of the publishing step; a failing `gh release view` there " +
        "would fail the step after the release exists and arm the rollback",
    );
    assert.match(
      rollback?.body ?? "",
      /steps\.publish\.outputs\.published\s*!=\s*'true'/,
      "the rollback must stand down when the release published; reverting then would leave " +
        "main advertising an older version than the release page",
    );
    assert.match(
      rollback?.command ?? "",
      /gh\s+release\s+view[\s\S]*?exit 0/,
      "ask GitHub before rewriting history: if the release exists despite the step output, " +
        "the rollback must do nothing",
    );
  });

  it("reverts on top of the branch as it stands, and never force-pushes", () => {
    assert.match(
      rollback?.command ?? "",
      /git\s+fetch\s+origin/,
      "main may have moved since the bump was pushed; revert on top of the current remote " +
        "head rather than a stale local one",
    );
    assert.doesNotMatch(
      rollback?.command ?? "",
      /--force|-f\b/,
      "a force-push here would destroy whatever moved the branch",
    );
    assert.match(
      rollback?.command ?? "",
      /git\s+revert\s+--no-edit\s+"?\$\{\{\s*steps\.commit\.outputs\.sha\s*\}\}/,
      "the revert must name the bump commit explicitly; reverting HEAD would revert " +
        "whatever happens to be checked out",
    );
  });

  it("targets the release at the commit the bump produced", () => {
    const commit = CANVAS_STEPS.find((s) => /git\s+diff\s+--cached\s+--quiet/.test(s.body));
    assert.match(
      commit?.body ?? "",
      /sha=\$\(git rev-parse HEAD\)/,
      "the commit step must publish the resulting SHA, or --target has nothing accurate " +
        "to point the tag at",
    );
    const releaseStep = CANVAS_STEPS.find((s) => PUBLISHES.test(s.command));
    assert.match(
      releaseStep?.command ?? "",
      /--target\s+"?\$\{\{\s*steps\.commit\.outputs\.sha\s*\}\}/,
      "the release must target the bump commit; targeting anything else tags a tree whose " +
        "VERSION is not the version being released",
    );
  });
});

describe("negative canaries", () => {
  it("steps() finds nothing in a workflow with no steps", () => {
    assert.deepEqual(steps("name: x\non: push\n"), []);
  });

  it("a commented-out push does not count as a push", () => {
    const parsed = steps("    - name: a\n      run: |\n        # git push origin v1\n");
    assert.equal(firstStepMatching(parsed, PUSHES), -1);
  });

  it("a push quoted in a log message does not count as a push", () => {
    const parsed = steps('    - name: a\n      run: |\n        echo "git push origin v1"\n');
    assert.equal(firstStepMatching(parsed, PUSHES), -1);
  });

  it("ordering assertion is falsifiable: a push before packaging is caught", () => {
    const bad = steps(
      "    - name: Push\n      run: git push origin HEAD:main\n" +
        "    - name: Package\n      run: node scripts/package-extension.mjs\n",
    );
    assert.ok(firstStepMatching(bad, PUSHES) < firstStepMatching(bad, PACKAGES));
  });

  it("tag assertion is falsifiable in every shape a tag can be pushed", () => {
    for (const cmd of [
      'git push origin "$TAG"',
      "git push origin v1.2.3",
      "git push origin refs/tags/v1.2.3",
      "git push --tags origin",
    ]) {
      const bad = steps(`    - name: Tag\n      run: ${cmd}\n`);
      assert.ok(HAND_TAGGED.test(bad[0].command), `not caught: ${cmd}`);
    }
  });

  it("pushing a branch is not mistaken for pushing a tag", () => {
    const ok = steps("    - name: Push\n      run: git push origin HEAD:refs/heads/main\n");
    assert.equal(HAND_TAGGED.test(ok[0].command), false);
  });
});
