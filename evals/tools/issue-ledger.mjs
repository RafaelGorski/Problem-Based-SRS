#!/usr/bin/env node
// Report issue-body ledger health for sequenced release/documentation issues.
//
// The goal is not to auto-edit issue bodies. It is to make drift visible in one command:
// how many boxes are open/closed, which open boxes are missing an explicit blocker, which
// ticked boxes carry no citation, and whether any box still names a version older than the
// manifest currently advertises.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

export function normalizeResult(result) {
  if (result.error) {
    return { status: 127, stdout: result.stdout ?? "", stderr: result.error.message };
  }
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export function defaultRunner(command, args, options = {}) {
  return normalizeResult(
    spawnSync(command, args, {
      cwd: options.cwd,
      encoding: "utf8",
      env: options.env ? { ...process.env, ...options.env } : process.env,
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
}

export function normalizeVersion(version) {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(version ?? "").trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

export function compareVersions(a, b) {
  const left = normalizeVersion(a);
  const right = normalizeVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }
  return 0;
}

export function versionMentions(text) {
  return [...String(text ?? "").matchAll(/\bv(\d+\.\d+(?:\.\d+)?)\b/g)].map((m) => m[1]);
}

export function hasCitation(text) {
  return (
    /https?:\/\//i.test(text) ||
    /#\d{2,}/.test(text) ||
    /`[^`]+`/.test(text) ||
    /\b[A-Za-z0-9._/-]+\.(?:md|mjs|js|ts|yml|yaml|json)(?::\d+)?\b/.test(text)
  );
}

export function hasExplicitBlocker(text) {
  return (
    /(blocked on|blocked by|blocker|follow-up|tracked observation|downgrade)/i.test(text) &&
    (/#\d{2,}/.test(text) || /https?:\/\//i.test(text))
  );
}

export function parseChecklistLine(line, currentVersion) {
  const m = /^\s*-\s\[( |x|X)\]\s+(.*)\s*$/.exec(line);
  if (!m) return null;
  const checked = m[1].toLowerCase() === "x";
  const text = m[2];
  const mentions = versionMentions(text);
  const superseded = mentions.filter((v) => compareVersions(v, currentVersion) === -1);
  return {
    checked,
    text,
    hasCitation: hasCitation(text),
    hasExplicitBlocker: hasExplicitBlocker(text),
    versionMentions: mentions,
    supersededVersions: superseded,
  };
}

export function analyzeIssueBody(body, currentVersion) {
  const lines = String(body ?? "").split(/\r?\n/);
  const boxes = [];
  for (const line of lines) {
    const parsed = parseChecklistLine(line, currentVersion);
    if (parsed) boxes.push(parsed);
  }
  const checked = boxes.filter((b) => b.checked);
  const open = boxes.filter((b) => !b.checked);
  const openWithoutBlocker = open.filter((b) => !b.hasExplicitBlocker);
  const tickedWithoutCitation = checked.filter((b) => !b.hasCitation);
  const supersededVersionMentions = boxes.flatMap((b) => b.supersededVersions);

  return {
    boxes,
    counts: {
      total: boxes.length,
      checked: checked.length,
      open: open.length,
      openWithoutBlocker: openWithoutBlocker.length,
      tickedWithoutCitation: tickedWithoutCitation.length,
      supersededVersionMentions: supersededVersionMentions.length,
    },
    findings: {
      openWithoutBlocker: openWithoutBlocker.map((b) => b.text),
      tickedWithoutCitation: tickedWithoutCitation.map((b) => b.text),
      supersededVersionMentions,
    },
  };
}

export function readPluginVersion(root = REPO_ROOT) {
  const file = path.join(root, ".claude-plugin", "plugin.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return data.version;
}

export function parseRepoFromRemoteUrl(url) {
  const text = String(url ?? "").trim();
  const m =
    /github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/i.exec(text) ??
    /^https?:\/\/[^/]+\/(?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/i.exec(text);
  if (!m?.groups) return null;
  return `${m.groups.owner}/${m.groups.repo}`;
}

export function detectRepo(root, run = defaultRunner) {
  const remote = run("git", ["config", "--get", "remote.origin.url"], { cwd: root });
  if (remote.status !== 0) return null;
  return parseRepoFromRemoteUrl(remote.stdout);
}

export function fetchIssue(number, repo, run = defaultRunner, root = REPO_ROOT) {
  const args = ["issue", "view", String(number), "--json", "number,title,url,body"];
  if (repo) args.push("--repo", repo);
  const result = run("gh", args, { cwd: root });
  if (result.status !== 0) {
    throw new Error(`issue-ledger: failed to read #${number}: ${result.stderr.trim() || "gh failed"}`);
  }
  return JSON.parse(result.stdout);
}

export function buildLedger(options, run = defaultRunner) {
  const currentVersion = readPluginVersion(options.root);
  const repo = options.repo || detectRepo(options.root, run);
  const issues = options.issues.map((n) => {
    const issue = fetchIssue(n, repo, run, options.root);
    const analysis = analyzeIssueBody(issue.body, currentVersion);
    return {
      number: issue.number,
      title: issue.title,
      url: issue.url,
      ...analysis,
    };
  });

  const totals = issues.reduce(
    (acc, issue) => {
      acc.issues += 1;
      acc.boxes += issue.counts.total;
      acc.checked += issue.counts.checked;
      acc.open += issue.counts.open;
      acc.openWithoutBlocker += issue.counts.openWithoutBlocker;
      acc.tickedWithoutCitation += issue.counts.tickedWithoutCitation;
      acc.supersededVersionMentions += issue.counts.supersededVersionMentions;
      return acc;
    },
    {
      issues: 0,
      boxes: 0,
      checked: 0,
      open: 0,
      openWithoutBlocker: 0,
      tickedWithoutCitation: 0,
      supersededVersionMentions: 0,
    },
  );

  const record = {
    repo,
    currentVersion,
    generatedAt: new Date().toISOString(),
    issues,
    totals,
  };
  record.ok =
    totals.openWithoutBlocker === 0 &&
    totals.tickedWithoutCitation === 0 &&
    totals.supersededVersionMentions === 0;
  return record;
}

export const USAGE = `Usage: node evals/tools/issue-ledger.mjs <issue-number...> [options]

Options:
  --repo <owner/repo>  GitHub repository (default: inferred from remote.origin.url)
  --root <dir>         repository root (default: this repository)
  --json <file>        write JSON output ("-" for stdout)
  --quiet              suppress human-readable output
  --help, -h           show this help`;

export function parseArgs(argv) {
  const out = {
    issues: [],
    repo: null,
    root: REPO_ROOT,
    json: null,
    quiet: false,
    help: false,
  };
  const value = (flag, next) => {
    if (next === undefined) throw new Error(`issue-ledger: ${flag} needs a value`);
    return next;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--repo") out.repo = value(arg, argv[++i]);
    else if (arg === "--root") out.root = path.resolve(value(arg, argv[++i]));
    else if (arg === "--json") out.json = value(arg, argv[++i]);
    else if (arg === "--quiet") out.quiet = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("-")) throw new Error(`issue-ledger: unknown option ${arg}`);
    else if (/^\d+$/.test(arg)) out.issues.push(Number(arg));
    else throw new Error(`issue-ledger: invalid issue number ${arg}`);
  }
  return out;
}

export function formatReport(record) {
  const lines = [
    `issue ledger for ${record.repo ?? "(repo not detected)"}`,
    `manifest version: ${record.currentVersion}`,
    "",
    ...record.issues.map((issue) => {
      const prefix = `#${issue.number} ${issue.title}`;
      return [
        prefix,
        `  boxes: ${issue.counts.checked} checked, ${issue.counts.open} open (${issue.counts.total} total)`,
        `  open without blocker: ${issue.counts.openWithoutBlocker}`,
        `  ticked without citation: ${issue.counts.tickedWithoutCitation}`,
        `  superseded version mentions: ${issue.counts.supersededVersionMentions}`,
      ].join("\n");
    }),
    "",
    `totals: ${record.totals.checked} checked, ${record.totals.open} open, ${record.totals.boxes} boxes`,
    `flags: ${record.totals.openWithoutBlocker} open-without-blocker, ` +
      `${record.totals.tickedWithoutCitation} ticked-without-citation, ` +
      `${record.totals.supersededVersionMentions} superseded-version-mentions`,
    "",
    record.ok ? "RESULT: ledger is consistent" : "RESULT: ledger has drift to reconcile",
  ];
  return lines.join("\n");
}

export function cli(argv = process.argv.slice(2), io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }

  if (opts.help || opts.issues.length === 0) {
    err.write(`${USAGE}\n`);
    return opts.help ? 0 : 1;
  }

  let record;
  try {
    record = buildLedger(opts, io.run ?? defaultRunner);
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }

  if (!opts.quiet) err.write(`${formatReport(record)}\n`);
  const json = `${JSON.stringify(record, null, 2)}\n`;
  if (opts.json === "-") out.write(json);
  else if (opts.json) fs.writeFileSync(opts.json, json);
  return record.ok ? 0 : 1;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) process.exit(cli());
