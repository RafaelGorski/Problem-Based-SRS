#!/usr/bin/env node
// Guard child-issue creation against normalized restatements of the parent or an open sibling.

import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const DEFAULT_REPO = "RafaelGorski/Problem-Based-SRS";

const ARTICLES = new Set(["a", "an", "the"]);

export const USAGE = `Usage: node evals/tools/subissue-guard.mjs --parent <number> --title <title> [options]

Options:
  --repo <owner/repo>  GitHub repository (default: ${DEFAULT_REPO})
  --body <text>        issue body to use with --create
  --create             create the issue only after the duplicate guard passes
  --help, -h           show this help`;

export function normalizeIssueTitle(title) {
  return String(title ?? "")
    .replace(/^\s*\[sub\s+of\s+#\d+\]\s*/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !ARTICLES.has(word))
    .join(" ");
}

export function isDuplicateIssueTitle(title, existingTitle) {
  const normalizedCandidate = normalizeIssueTitle(title);
  const normalizedExisting = normalizeIssueTitle(existingTitle);
  if (normalizedCandidate && normalizedCandidate === normalizedExisting) return true;
  const candidate = new Set(normalizedCandidate.split(" ").filter(Boolean));
  const existing = new Set(normalizedExisting.split(" ").filter(Boolean));
  if (candidate.size === 0 || existing.size === 0) return false;
  let shared = 0;
  for (const word of candidate) {
    if (existing.has(word)) shared += 1;
  }
  return shared >= 5 && shared === Math.min(candidate.size, existing.size) &&
    shared / Math.max(candidate.size, existing.size) >= 0.85;
}

function parentNumber(issue) {
  const match = /^\s*\[sub\s+of\s+#(\d+)\]/i.exec(String(issue.title ?? ""));
  return match ? Number(match[1]) : null;
}

export function findTitleCollision(title, parent, siblings = []) {
  const normalized = normalizeIssueTitle(title);
  if (!normalized) throw new Error("subissue-guard: title must contain searchable words");

  if (isDuplicateIssueTitle(normalized, parent?.title)) {
    return { issue: parent, relation: "parent" };
  }
  for (const sibling of siblings) {
    if (isDuplicateIssueTitle(normalized, sibling.title)) {
      return { issue: sibling, relation: "sibling" };
    }
  }
  return null;
}

export function parseArgs(argv) {
  const options = { parent: null, title: null, repo: DEFAULT_REPO, body: "", create: false, help: false };
  const value = (flag, next) => {
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`subissue-guard: ${flag} needs a value`);
    }
    return next;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--parent") {
      const raw = value(arg, argv[++i]);
      if (!/^\d+$/.test(raw) || Number(raw) < 1) {
        throw new Error("subissue-guard: parent must be a positive issue number");
      }
      options.parent = Number(raw);
    } else if (arg === "--title") options.title = value(arg, argv[++i]);
    else if (arg === "--repo") options.repo = value(arg, argv[++i]);
    else if (arg === "--body") options.body = value(arg, argv[++i]);
    else if (arg === "--create") options.create = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`subissue-guard: unknown option ${arg}`);
  }

  if (options.help) return options;
  if (options.parent === null) throw new Error("subissue-guard: --parent is required");
  if (!options.title) throw new Error("subissue-guard: --title is required");
  if (!/^[^/]+\/[^/]+$/.test(options.repo)) {
    throw new Error("subissue-guard: --repo must be owner/repo");
  }
  return options;
}

export function defaultRunner(command, args, spawn = spawnSync) {
  const result = spawn(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error) {
    return { status: 127, stdout: result.stdout ?? "", stderr: result.error.message };
  }
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function readOpenIssues(repo, run) {
  const result = run("gh", [
    "api",
    "--paginate",
    "--slurp",
    `/repos/${repo}/issues?state=open&per_page=100`,
  ]);
  if (result.status !== 0) {
    throw new Error(`subissue-guard: failed to read open issues: ${result.stderr.trim() || "gh failed"}`);
  }
  const pages = JSON.parse(result.stdout);
  if (!Array.isArray(pages)) throw new Error("subissue-guard: open issue response must be an array");
  return pages.flat().filter((issue) => issue && !issue.pull_request);
}

function guardedTitle(title, parentNumberValue) {
  const prefix = `[sub of #${parentNumberValue}] `;
  const matchingParent = new RegExp(`^\\s*\\[sub\\s+of\\s+#${parentNumberValue}\\]`, "i");
  return matchingParent.test(title) ? title : `${prefix}${title}`;
}

export function cli(argv = process.argv.slice(2), io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }
  if (options.help) {
    out.write(`${USAGE}\n`);
    return 0;
  }

  try {
    const run = io.run ?? ((command, args) => defaultRunner(command, args, io.spawn));
    const issues = readOpenIssues(options.repo, run);
    const parent = issues.find((issue) => Number(issue.number) === options.parent);
    if (!parent) throw new Error(`subissue-guard: parent #${options.parent} is not an open issue`);
    const siblings = issues.filter(
      (issue) => Number(issue.number) !== options.parent && parentNumber(issue) === options.parent,
    );
    const collision = findTitleCollision(options.title, parent, siblings);
    if (collision) {
      err.write(
        `subissue-guard: title duplicates ${collision.relation} #${collision.issue.number}: ` +
          `${collision.issue.title}\n`,
      );
      return 1;
    }

    if (!options.create) {
      out.write("No duplicate title found; no issue was created. Pass --create to create it.\n");
      return 0;
    }

    const body = [options.body.trim(), `Parent issue: #${options.parent}`].filter(Boolean).join("\n\n");
    const created = run("gh", [
      "issue",
      "create",
      "--repo",
      options.repo,
      "--title",
      guardedTitle(options.title, options.parent),
      "--body",
      body,
    ]);
    if (created.status !== 0) {
      throw new Error(`subissue-guard: issue creation failed: ${created.stderr.trim() || "gh failed"}`);
    }
    out.write(created.stdout);
    return 0;
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }
}

export function isInvokedDirectly(scriptPath = process.argv[1]) {
  return Boolean(scriptPath && pathToFileURL(path.resolve(scriptPath)).href === import.meta.url);
}

export function runIfInvoked(scriptPath = process.argv[1], argv = process.argv.slice(2), exit = process.exit) {
  if (!isInvokedDirectly(scriptPath)) return false;
  exit(cli(argv));
  return true;
}

runIfInvoked();
