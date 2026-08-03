#!/usr/bin/env node
/**
 * Build the Thursday release report and the dispatch decisions that go with it.
 *
 * The repository has two release trains with different rules:
 *   - plugin: only releasable when plugin.json + CHANGELOG.md already advertise
 *             an unpublished version
 *   - canvas: releasable whenever there are unreleased commits; the workflow
 *             bumps the patch version itself
 *
 * This script keeps that decision logic in one place so the report workflow and
 * the release-dispatch workflow cannot drift apart.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  fetchPublishedReleases,
  pluginReleaseTag,
  releaseTrain,
} from "./check-distribution.mjs";
import { nextVersion } from "./bump-version.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");
const BUILD_PLUGIN = path.join(REPO_ROOT, "scripts", "build-plugin.py");

export const REPORT_TIME_BRT = "12:00 BRT";
export const RELEASE_TIME_BRT = "16:00 BRT";
export const REPORT_CRON_UTC = "0 15 * * 4";
export const RELEASE_CRON_UTC = "0 19 * * 4";
export const REPORT_TIMEZONE = "America/Sao_Paulo";
export const CANVAS_RELEASE_PART = "patch";

function parseArgs(argv) {
  const out = { markdownOut: null, jsonOut: null, repo: process.env.GITHUB_REPOSITORY ?? undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--markdown-out") out.markdownOut = argv[++i];
    else if (argv[i] === "--json-out") out.jsonOut = argv[++i];
    else if (argv[i] === "--repo") out.repo = argv[++i];
    else throw new Error(`Unknown argument "${argv[i]}".`);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function readPluginVersion(root = REPO_ROOT) {
  return readJson(path.join(root, ".claude-plugin", "plugin.json")).version;
}

export function readCanvasVersion(root = REPO_ROOT) {
  return fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
}

export function existingTags(root = REPO_ROOT) {
  return gitLines(["tag", "--list"], { root });
}

function gitLines(args, { root = REPO_ROOT } = {}) {
  const output = execFileSync("git", args, { cwd: root, encoding: "utf8" });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitCommitsSince(tag, { root = REPO_ROOT } = {}) {
  const args = ["log", "--format=%h%x09%s"];
  if (tag) args.push(`${tag}..HEAD`);
  return gitLines(args, { root }).map((line) => {
    const [sha, subject] = line.split("\t");
    return { sha, subject };
  });
}

function gitFilesSince(tag, { root = REPO_ROOT } = {}) {
  if (!tag) return gitLines(["ls-files"], { root });
  return gitLines(["diff", "--name-only", `${tag}..HEAD`], { root });
}

function hasChangelogSection(version, { root = REPO_ROOT, python = process.env.PYTHON ?? "python" } = {}) {
  try {
    execFileSync(python, [BUILD_PLUGIN, "notes", "--version", version], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function formatDateInZone(date, timeZone = REPORT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function newestRelease(releases, train) {
  return releases.find((release) => releaseTrain(release) === train) ?? null;
}

export function assessPluginRelease({
  currentVersion,
  latestReleaseTag = null,
  hasUnreleasedChanges,
  changelogReady,
}) {
  const targetTag = pluginReleaseTag(currentVersion);
  if (!hasUnreleasedChanges) {
    return {
      train: "plugin",
      ready: false,
      targetVersion: currentVersion,
      targetTag,
      reason: "No commits are waiting for the plugin train.",
    };
  }
  if (!targetTag) {
    return {
      train: "plugin",
      ready: false,
      targetVersion: currentVersion,
      targetTag: null,
      reason: "plugin.json does not contain a publishable dotted version.",
    };
  }
  if (targetTag === latestReleaseTag) {
    return {
      train: "plugin",
      ready: false,
      targetVersion: currentVersion,
      targetTag,
      reason:
        `${targetTag} is already the latest published plugin release. ` +
        "The scheduled run will skip until plugin.json and CHANGELOG.md are prepared for a new version.",
    };
  }
  if (!changelogReady) {
    return {
      train: "plugin",
      ready: false,
      targetVersion: currentVersion,
      targetTag,
      reason: `CHANGELOG.md does not yet contain the release notes for ${currentVersion}.`,
    };
  }
  return {
    train: "plugin",
    ready: true,
    targetVersion: currentVersion,
    targetTag,
    reason: `Ready to dispatch create-release.yml for ${targetTag}.`,
  };
}

export function assessCanvasRelease({
  currentVersion,
  nextPlannedVersion,
  hasUnreleasedChanges,
}) {
  const targetTag = `v${nextPlannedVersion}`;
  if (!hasUnreleasedChanges) {
    return {
      train: "canvas",
      ready: false,
      currentVersion,
      targetVersion: nextPlannedVersion,
      targetTag,
      reason: "No commits are waiting for the canvas train.",
    };
  }
  return {
    train: "canvas",
    ready: true,
    currentVersion,
    targetVersion: nextPlannedVersion,
    targetTag,
    reason: `Ready to dispatch release-canvas.yml (${CANVAS_RELEASE_PART} -> ${nextPlannedVersion}).`,
  };
}

function markdownLinesForCommits(commits) {
  if (commits.length === 0) return ["_No unreleased commits._"];
  return commits.map((commit) => `- \`${commit.sha}\` ${commit.subject}`);
}

function markdownLinesForFiles(files) {
  if (files.length === 0) return ["_No changed files._"];
  return files.map((file) => `- \`${file}\``);
}

export function buildReportMarkdown({ reportDate, plugin, canvas }) {
  const lines = [
    `# Weekly release report — ${reportDate}`,
    "",
    `Review this before ${RELEASE_TIME_BRT} if you want to adjust today's release. ` +
      `The scheduled release still runs at ${RELEASE_TIME_BRT} even if approval does not arrive in time.`,
    "",
    "| Train | Latest published | Planned Thursday target | Ready now? | Status |",
    "| --- | --- | --- | --- | --- |",
    `| Plugin | ${plugin.latestReleaseTag ?? "none"} | ${plugin.targetTag ?? "n/a"} | ${plugin.ready ? "Yes" : "No"} | ${plugin.reason} |`,
    `| Canvas | ${canvas.latestReleaseTag ?? "none"} | ${canvas.targetTag} | ${canvas.ready ? "Yes" : "No"} | ${canvas.reason} |`,
    "",
    "## Plugin train",
    "",
    `- **Latest published release:** ${plugin.latestReleaseTag ?? "none"}`,
    `- **Current advertised version:** ${plugin.currentVersion}`,
    `- **Planned scheduled target:** ${plugin.targetTag ?? "n/a"}`,
    `- **Commits waiting:** ${plugin.commits.length}`,
    `- **Files changed:** ${plugin.files.length}`,
    "",
    "### Commits",
    "",
    ...markdownLinesForCommits(plugin.commits),
    "",
    "### Files",
    "",
    ...markdownLinesForFiles(plugin.files),
    "",
    "## Canvas train",
    "",
    `- **Latest published release:** ${canvas.latestReleaseTag ?? "none"}`,
    `- **Current version on main:** ${canvas.currentVersion}`,
    `- **Planned scheduled target:** ${canvas.targetTag}`,
    `- **Commits waiting:** ${canvas.commits.length}`,
    `- **Files changed:** ${canvas.files.length}`,
    "",
    "### Commits",
    "",
    ...markdownLinesForCommits(canvas.commits),
    "",
    "### Files",
    "",
    ...markdownLinesForFiles(canvas.files),
    "",
  ];
  return lines.join("\n");
}

export async function collectWeeklyReleaseReport({
  root = REPO_ROOT,
  repo = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
  now = new Date(),
} = {}) {
  const releases = repo ? await fetchPublishedReleases({ repo, token }) : [];
  const latestPlugin = newestRelease(releases, "plugin");
  const latestCanvas = newestRelease(releases, "canvas");
  const tags = existingTags(root);

  const pluginVersion = readPluginVersion(root);
  const pluginCommits = gitCommitsSince(latestPlugin?.tag ?? null, { root });
  const pluginFiles = gitFilesSince(latestPlugin?.tag ?? null, { root });
  const pluginStatus = assessPluginRelease({
    currentVersion: pluginVersion,
    latestReleaseTag: latestPlugin?.tag ?? null,
    hasUnreleasedChanges: pluginCommits.length > 0,
    changelogReady: hasChangelogSection(pluginVersion, { root }),
  });

  const canvasVersion = readCanvasVersion(root);
  const canvasCommits = gitCommitsSince(latestCanvas?.tag ?? null, { root });
  const canvasFiles = gitFilesSince(latestCanvas?.tag ?? null, { root });
  const canvasStatus = assessCanvasRelease({
    currentVersion: canvasVersion,
    nextPlannedVersion: nextVersion(canvasVersion, CANVAS_RELEASE_PART, tags),
    hasUnreleasedChanges: canvasCommits.length > 0,
  });

  const reportDate = formatDateInZone(now, REPORT_TIMEZONE);
  const payload = {
    generatedAt: now.toISOString(),
    reportDate,
    reportTitle: `Weekly release report for ${reportDate}`,
    plugin: {
      ...pluginStatus,
      currentVersion: pluginVersion,
      latestReleaseTag: latestPlugin?.tag ?? null,
      commits: pluginCommits,
      files: pluginFiles,
    },
    canvas: {
      ...canvasStatus,
      latestReleaseTag: latestCanvas?.tag ?? null,
      commits: canvasCommits,
      files: canvasFiles,
    },
  };
  payload.markdown = buildReportMarkdown(payload);
  return payload;
}

function emitOutputs(report) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  fs.appendFileSync(out, `report_title=${report.reportTitle}\n`);
  fs.appendFileSync(out, `plugin_ready=${report.plugin.ready}\n`);
  fs.appendFileSync(out, `plugin_version=${report.plugin.targetVersion}\n`);
  fs.appendFileSync(out, `plugin_tag=${report.plugin.targetTag ?? ""}\n`);
  fs.appendFileSync(out, `canvas_ready=${report.canvas.ready}\n`);
  fs.appendFileSync(out, `canvas_version=${report.canvas.targetVersion}\n`);
  fs.appendFileSync(out, `canvas_tag=${report.canvas.targetTag}\n`);
}

async function main(argv) {
  const args = parseArgs(argv);
  const report = await collectWeeklyReleaseReport({ repo: args.repo });
  if (args.markdownOut) fs.writeFileSync(args.markdownOut, `${report.markdown}\n`, "utf8");
  if (args.jsonOut) fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  emitOutputs(report);
  if (!args.markdownOut && !args.jsonOut) process.stdout.write(`${report.markdown}\n`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
