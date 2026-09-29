#!/usr/bin/env node
// Rehearse the canvas strand recovery against an isolated, throwaway git origin.
//
// A canvas release that pushes its tag and then fails leaves an orphan tag: the tag exists,
// no release does. bump-version.mjs skips any version whose tag exists, so the documented
// recovery is to delete the orphan tag first. That path is irreversible on the real origin,
// so it is rehearsed here, end to end, against a bare repository created in a temp dir:
//
//   1. record the version, origin tags, and releases before any mutation;
//   2. strand the next version (tag pushed, no release) and show bump-version skips it;
//   3. show check-distribution reports `release-tag-without-release` for that state;
//   4. show a tag that HAS a published release is refused and never deleted;
//   5. delete only the orphan tag and show the version is publishable again.
//
// Nothing here touches the real remote or GitHub: every git command runs in the sandbox and
// is recorded with its exit code and the resulting origin tag state.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nextVersion } from "../../scripts/bump-version.mjs";
import { summarize } from "../../scripts/check-distribution.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IDENTITY = ["-c", "user.name=rehearsal", "-c", "user.email=rehearsal@example.invalid"];

export function defaultGit(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/** Classify a tag before any recovery touches it. */
export function classifyTag({ tag, remoteTags = [], releasedTags = [] }) {
  if (releasedTags.includes(tag)) return "published";
  if (remoteTags.includes(tag)) return "orphan";
  return "absent";
}

/** The only recovery this runbook allows is deleting an orphan tag. */
export function planRecovery(input) {
  const state = classifyTag(input);
  if (state === "orphan") {
    return { state, action: "delete-tag", reason: `${input.tag} has no release; delete it and re-run` };
  }
  if (state === "published") {
    return { state, action: "refuse", reason: `${input.tag} has a published release; never delete it` };
  }
  return { state, action: "none", reason: `${input.tag} does not exist on origin` };
}

export function parseRemoteTags(stdout) {
  return stdout.split(/\r?\n/)
    .map((line) => line.match(/refs\/tags\/([^\s^]+)$/)?.[1])
    .filter(Boolean);
}

export function monitorFindingIds({ canvasVersion, remoteTags, releasedTags }) {
  const summary = summarize({
    canvasVersion,
    repoTags: remoteTags,
    publishedReleases: releasedTags.map((tag) => ({ tag, name: `srs-navigator ${tag}` })),
  });
  return summary.findings.map((finding) => finding.id);
}

export function rehearse({
  currentVersion,
  releasedTags = [`v${currentVersion}`],
  git = defaultGit,
  tmpRoot = os.tmpdir(),
} = {}) {
  const sandbox = fs.mkdtempSync(path.join(tmpRoot, "canvas-recovery-"));
  const origin = path.join(sandbox, "origin.git");
  const work = path.join(sandbox, "work");
  const steps = [];

  const run = (label, args, cwd = sandbox) => {
    const result = git(args, cwd);
    const command = `git ${args.join(" ")}`.split(sandbox).join("<sandbox>");
    const step = { label, command, exitCode: result.status };
    steps.push(step);
    if (result.status !== 0) {
      throw new Error(`${step.command} exited ${result.status}: ${result.stderr.trim()}`);
    }
    return result;
  };
  const originTags = (label) => {
    const tags = parseRemoteTags(run(label, ["ls-remote", "--tags", origin]).stdout);
    steps.at(-1).originTags = tags;
    return tags;
  };

  try {
    run("create isolated origin", ["init", "--bare", "-q", origin]);
    run("create work tree", ["init", "-q", work]);
    run("seed commit", [...IDENTITY, "commit", "--allow-empty", "-q", "-m", "seed"], work);
    for (const tag of releasedTags) {
      run(`tag published release ${tag}`, ["tag", tag], work);
      run(`push published release ${tag}`, ["push", "-q", origin, tag], work);
    }

    const before = {
      version: currentVersion,
      releasedTags: [...releasedTags],
      originTags: originTags("record origin tags before mutation"),
    };

    const stranded = nextVersion(currentVersion, "patch", before.originTags);
    const strandedTag = `v${stranded}`;
    run(`strand ${strandedTag} (tag pushed, release never created)`, ["tag", strandedTag], work);
    run(`push orphan ${strandedTag}`, ["push", "-q", origin, strandedTag], work);
    const strandedTags = originTags("record origin tags after the failed publish");

    const skippedTo = nextVersion(currentVersion, "patch", strandedTags);
    const monitorWhileStranded = monitorFindingIds({
      canvasVersion: stranded, remoteTags: strandedTags, releasedTags,
    });

    const protectedTag = releasedTags[0];
    const publishedPlan = planRecovery({ tag: protectedTag, remoteTags: strandedTags, releasedTags });
    const orphanPlan = planRecovery({ tag: strandedTag, remoteTags: strandedTags, releasedTags });
    for (const plan of [publishedPlan, orphanPlan]) {
      if (plan.action === "delete-tag") {
        run(`delete orphan ${strandedTag}`, ["push", "-q", origin, "--delete", strandedTag], work);
      }
    }
    const afterTags = originTags("record origin tags after recovery");
    const republishes = nextVersion(currentVersion, "patch", afterTags);
    const monitorAfterRecovery = monitorFindingIds({
      canvasVersion: stranded, remoteTags: afterTags, releasedTags,
    });

    const assertions = {
      bumpSkipsStrandedVersion: skippedTo !== stranded,
      monitorReportsStrandedTag: monitorWhileStranded.includes("release-tag-without-release"),
      publishedTagRefused: publishedPlan.action === "refuse" && afterTags.includes(protectedTag),
      orphanTagDeleted: orphanPlan.action === "delete-tag" && !afterTags.includes(strandedTag),
      versionPublishableAgain: republishes === stranded,
      monitorClearsAfterRecovery: !monitorAfterRecovery.includes("release-tag-without-release"),
    };
    return {
      ok: Object.values(assertions).every(Boolean),
      sandbox: "isolated temporary bare repository; the real origin was not contacted",
      before,
      stranded: { version: stranded, tag: strandedTag, bumpWouldPublish: skippedTo },
      plans: { published: publishedPlan, orphan: orphanPlan },
      monitor: { whileStranded: monitorWhileStranded, afterRecovery: monitorAfterRecovery },
      after: { originTags: afterTags, bumpWouldPublish: republishes },
      assertions,
      steps,
    };
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

export function parseArgs(argv) {
  const out = { version: null, released: null, json: null };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!["--version", "--released", "--json"].includes(flag)) throw new Error(`unknown argument: ${flag}`);
    const value = argv[++i];
    if (!value || value.startsWith("-")) throw new Error(`${flag} needs a value`);
    out[flag.slice(2)] = value;
  }
  return out;
}

export function runCli(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  try {
    const opts = parseArgs(argv);
    const currentVersion = opts.version ??
      fs.readFileSync(path.join(io.root ?? REPO_ROOT, "VERSION"), "utf8").trim();
    const releasedTags = opts.released?.split(",").map((tag) => tag.trim()).filter(Boolean);
    const result = rehearse({ currentVersion, releasedTags, git: io.git, tmpRoot: io.tmpRoot });
    const output = `${JSON.stringify(result, null, 2)}\n`;
    if (opts.json) fs.writeFileSync(opts.json, output);
    stdout.write(output);
    return result.ok ? 0 : 1;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 2;
  }
}

export function invokeCliIfDirect(scriptPath = process.argv[1], argv = process.argv.slice(2), io = {}) {
  if (!scriptPath || pathToFileURL(path.resolve(scriptPath)).href !== import.meta.url) return false;
  process.exitCode = runCli(argv, io);
  return true;
}

invokeCliIfDirect();
