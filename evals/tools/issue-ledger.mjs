#!/usr/bin/env node
// Report issue-body ledger health for sequenced release/documentation issues.
//
// The goal is not to auto-edit issue bodies. It is to make drift visible in one command:
// how many boxes are open/closed, which open boxes are missing an explicit blocker, which
// ticked boxes carry no citation, and whether any box still names a version older than the
// train that would publish it.
//
// The version check is per *train*, not per repository. This repository publishes two products
// from one tag namespace — the plugin (`.claude-plugin/plugin.json`, 2.x) and the srs-navigator
// canvas app (`VERSION`, 1.x) — and the trains cannot be told apart by tag shape. Comparing every
// mention against the plugin manifest made a canvas issue unable to reach a clean ledger: a box
// naming its own unreleased tag `v1.1.1` was reported as a stale claim purely because 1.1.1 is
// numerically below the plugin's 2.6.0. A mention is therefore compared only against the baseline
// sharing its major series, and a mention matching no train's series is reported separately as
// unattributed rather than being silently passed or falsely failed.

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

/**
 * The version baselines a mention can be measured against, as a flat list.
 *
 * Accepts the historical single-version string, a list, or a train map such as
 * `{ plugin: "2.6.0", canvas: "1.1.0" }`, so callers that only know the manifest keep working.
 */
export function toBaselines(baselines) {
  const raw =
    baselines && typeof baselines === "object" && !Array.isArray(baselines)
      ? Object.values(baselines)
      : [baselines].flat();
  return raw.filter((v) => normalizeVersion(v) !== null).map((v) => String(v).trim());
}

/**
 * The baseline that would publish this mention: the one sharing its major series.
 *
 * Returns null when no train claims the series. That is an honest "cannot attribute", not a
 * pass — `analyzeIssueBody` reports those mentions on a separate channel.
 */
export function attributeVersion(mention, baselines) {
  const left = normalizeVersion(mention);
  if (!left) return null;
  const candidates = toBaselines(baselines).filter(
    (b) => normalizeVersion(b)?.[0] === left[0],
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (compareVersions(a, b) === 1 ? a : b));
}

/** Split a line's version mentions into superseded, unattributed, and current. */
export function classifyVersionMentions(text, baselines) {
  const superseded = [];
  const unattributed = [];
  for (const mention of versionMentions(text)) {
    const baseline = attributeVersion(mention, baselines);
    if (baseline === null) unattributed.push(mention);
    else if (compareVersions(mention, baseline) === -1) superseded.push(mention);
  }
  return { superseded, unattributed };
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

/** Build the classified box record shared by both the line-anchored and collapsed-body paths. */
function classifyBox(checked, text, baselines) {
  const mentions = versionMentions(text);
  const { superseded, unattributed } = classifyVersionMentions(text, baselines);
  return {
    checked,
    text,
    hasCitation: hasCitation(text),
    hasExplicitBlocker: hasExplicitBlocker(text),
    versionMentions: mentions,
    supersededVersions: superseded,
    unattributedVersions: unattributed,
  };
}

export function parseChecklistLine(line, baselines) {
  const m = /^\s*-\s\[( |x|X)\]\s+(.*)\s*$/.exec(line);
  if (!m) return null;
  const checked = m[1].toLowerCase() === "x";
  const text = m[2];
  return classifyBox(checked, text, baselines);
}

// Matches a checklist marker anywhere in the body, not anchored to the start of a line. Issue
// bodies are sometimes rewritten (by an editor, an API round-trip, or a paste) into a single
// paragraph with no newlines at all; anchoring detection to `^\s*-\s\[...\]` makes every box in
// such a body invisible; a ledger reporting "0 boxes" for those is then indistinguishable from an
// issue that genuinely has none, and a batch gate built on that count passes vacuously (#156).
const CHECKLIST_MARKER = /-\s\[( |x|X)\]\s+/g;

/**
 * Extract every checklist box from a body regardless of line formatting.
 *
 * A box's text is delimited by the next checklist marker (or the end of the body), not by a
 * newline — so a collapsed, single-paragraph body is parsed exactly like its multi-line
 * counterpart. Text is trimmed of surrounding whitespace only; internal newlines are preserved
 * so citation/blocker detection keeps seeing the same text it would see in a well-formed body.
 */
export function extractChecklistBoxes(body) {
  const text = String(body ?? "");
  const matches = [...text.matchAll(CHECKLIST_MARKER)];
  return matches.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    return {
      checked: m[1].toLowerCase() === "x",
      text: text.slice(start, end).trim(),
    };
  });
}

export function analyzeIssueBody(body, baselines) {
  const raw = extractChecklistBoxes(body);
  const boxes = raw.map((b) => classifyBox(b.checked, b.text, baselines));
  const checked = boxes.filter((b) => b.checked);
  const open = boxes.filter((b) => !b.checked);
  const openWithoutBlocker = open.filter((b) => !b.hasExplicitBlocker);
  const tickedWithoutCitation = checked.filter((b) => !b.hasCitation);
  const supersededVersionMentions = boxes.flatMap((b) => b.supersededVersions);
  const unattributedVersionMentions = boxes.flatMap((b) => b.unattributedVersions);
  // Every checklist marker found by CHECKLIST_MARKER is attributed to exactly one box above, so
  // there is currently no code path that drops a marker silently. This channel exists so a future
  // change that narrows extraction (e.g. to skip markers inside fenced code) has somewhere to
  // report a box it declines to attribute, instead of that box quietly vanishing from the count.
  const unparseable = [];

  return {
    boxes,
    counts: {
      total: boxes.length,
      checked: checked.length,
      open: open.length,
      openWithoutBlocker: openWithoutBlocker.length,
      tickedWithoutCitation: tickedWithoutCitation.length,
      supersededVersionMentions: supersededVersionMentions.length,
      unattributedVersionMentions: unattributedVersionMentions.length,
      unparseable: unparseable.length,
    },
    findings: {
      openWithoutBlocker: openWithoutBlocker.map((b) => b.text),
      tickedWithoutCitation: tickedWithoutCitation.map((b) => b.text),
      supersededVersionMentions,
      unattributedVersionMentions,
      unparseable,
    },
  };
}

export function readPluginVersion(root = REPO_ROOT) {
  const file = path.join(root, ".claude-plugin", "plugin.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return data.version;
}

/**
 * The version the canvas train advertises.
 *
 * `VERSION` is the file the release workflow owns and the drift monitor reads; the extension
 * package.json is asserted to agree with it elsewhere. Either one is enough to know the canvas
 * major series, which is all the ledger needs to stop measuring canvas tags against the plugin.
 */
export function readCanvasVersion(root = REPO_ROOT) {
  const versionFile = path.join(root, "VERSION");
  if (fs.existsSync(versionFile)) {
    const value = fs.readFileSync(versionFile, "utf8").trim();
    if (value) return value;
  }
  const pkg = path.join(root, ".github", "extensions", "srs-navigator", "package.json");
  if (fs.existsSync(pkg)) {
    const version = JSON.parse(fs.readFileSync(pkg, "utf8")).version;
    if (version) return String(version).trim();
  }
  return null;
}

/** Every train's advertised version, keyed by train, as the ledger measures mentions against. */
export function readTrainVersions(root = REPO_ROOT) {
  return { plugin: readPluginVersion(root), canvas: readCanvasVersion(root) };
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
  const trainVersions = readTrainVersions(options.root);
  const currentVersion = trainVersions.plugin;
  const repo = options.repo || detectRepo(options.root, run);
  const issues = options.issues.map((n) => {
    const issue = fetchIssue(n, repo, run, options.root);
    const analysis = analyzeIssueBody(issue.body, trainVersions);
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
      acc.unattributedVersionMentions += issue.counts.unattributedVersionMentions;
      acc.unparseable += issue.counts.unparseable ?? 0;
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
      unattributedVersionMentions: 0,
      unparseable: 0,
    },
  );

  const record = {
    repo,
    currentVersion,
    trainVersions,
    generatedAt: new Date().toISOString(),
    issues,
    totals,
  };
  // Unattributed mentions are reported, never failed: a version no train claims is a
  // comparison that did not run, not a stale claim.
  record.ok =
    totals.openWithoutBlocker === 0 &&
    totals.tickedWithoutCitation === 0 &&
    totals.supersededVersionMentions === 0 &&
    totals.unparseable === 0;
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
  const trains = record.trainVersions ?? { plugin: record.currentVersion };
  const baselineLine = Object.entries(trains)
    .filter(([, v]) => v)
    .map(([train, v]) => `${train} ${v}`)
    .join(", ");
  const lines = [
    `issue ledger for ${record.repo ?? "(repo not detected)"}`,
    `manifest version: ${record.currentVersion}`,
    `version baselines: ${baselineLine || "(none readable)"}`,
    "",
    ...record.issues.map((issue) => {
      const prefix = `#${issue.number} ${issue.title}`;
      return [
        prefix,
        `  boxes: ${issue.counts.checked} checked, ${issue.counts.open} open (${issue.counts.total} total)`,
        `  open without blocker: ${issue.counts.openWithoutBlocker}`,
        `  ticked without citation: ${issue.counts.tickedWithoutCitation}`,
        `  superseded version mentions: ${issue.counts.supersededVersionMentions}`,
        `  unattributed version mentions: ${issue.counts.unattributedVersionMentions ?? 0}`,
        `  unparseable: ${issue.counts.unparseable ?? 0}`,
      ].join("\n");
    }),
    "",
    `totals: ${record.totals.checked} checked, ${record.totals.open} open, ${record.totals.boxes} boxes`,
    `flags: ${record.totals.openWithoutBlocker} open-without-blocker, ` +
      `${record.totals.tickedWithoutCitation} ticked-without-citation, ` +
      `${record.totals.supersededVersionMentions} superseded-version-mentions, ` +
      `${record.totals.unparseable ?? 0} unparseable`,
    `not compared: ${record.totals.unattributedVersionMentions ?? 0} version mention(s) claimed by no train`,
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
