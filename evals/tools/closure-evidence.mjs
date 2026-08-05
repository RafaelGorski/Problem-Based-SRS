#!/usr/bin/env node
/**
 * Report-only guard for release-claiming issue closure.
 *
 * The tool reads explicitly supplied issue records and the published release list. It never
 * writes to GitHub: a claim is clean only when its machine-readable train/version marker is
 * unambiguous and a matching, non-draft, non-prerelease release exists.
 *
 * Usage:
 *   node evals/tools/closure-evidence.mjs --fixture evals/fixtures/closure-2026-08-04.json
 *   node evals/tools/closure-evidence.mjs --prospective 137 138
 *   node evals/tools/closure-evidence.mjs 137 138
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const REPO = "RafaelGorski/Problem-Based-SRS";

const CLAIM_MARKER = /<!--\s*release-claim\b[\s\S]*?-->/gi;
const VALID_CLAIM = /^<!--\s*release-claim\s+train=(plugin|canvas)\s+version=(v\d+(?:\.\d+){1,2})\s*-->$/i;
const CANVAS_TITLE = /^srs-navigator\b/i;

export function parseClaim(body) {
  const markers = [...String(body ?? "").matchAll(CLAIM_MARKER)].map((m) => m[0]);
  if (markers.length !== 1) {
    return {
      ok: false,
      reason: markers.length === 0 ? "missing release-claim marker" : "duplicate release-claim markers",
    };
  }
  const match = markers[0].match(VALID_CLAIM);
  if (!match) return { ok: false, reason: "malformed release-claim marker" };
  const train = match[1].toLowerCase();
  const raw = match[2].toLowerCase();
  const parts = raw.slice(1).split(".");
  if (train === "canvas" && parts.length !== 3) {
    return { ok: false, reason: "canvas claims must use a vX.Y.Z version" };
  }
  if (train === "plugin" && (parts.length < 2 || parts.length > 3)) {
    return { ok: false, reason: "plugin claims must use a vX.Y or vX.Y.Z version" };
  }
  const normalizedParts = train === "plugin"
    ? parts.slice().join(".").replace(/\.0$/, "")
    : parts.join(".");
  return { ok: true, train, version: raw, tag: `v${normalizedParts}` };
}

export function classifyRelease(release = {}) {
  if (release.train === "plugin" || release.train === "canvas") return release.train;
  const name = typeof release.name === "string" ? release.name.trim() : "";
  if (!name) return "unknown";
  return CANVAS_TITLE.test(name) ? "canvas" : "plugin";
}

export function normalizeRelease(release = {}) {
  const tag = release.tag ?? release.tagName ?? release.tag_name;
  return {
    tag: typeof tag === "string" ? tag : null,
    name: typeof release.name === "string" ? release.name : null,
    train: classifyRelease(release),
    draft: Boolean(release.draft ?? release.isDraft),
    prerelease: Boolean(release.prerelease ?? release.isPrerelease),
  };
}

export function assessClaims({ issues = [], releases = [], prospective = [] } = {}) {
  const prospectiveSet = new Set(prospective.map(Number));
  const published = releases.map(normalizeRelease).filter((r) => !r.draft && !r.prerelease);
  const findings = [];
  const checked = [];

  for (const issue of issues) {
    const number = Number(issue.number);
    const state = String(issue.state ?? "").toLowerCase();
    const shouldCheck = prospectiveSet.size ? prospectiveSet.has(number) : state === "closed";
    if (!shouldCheck) continue;
    if (prospectiveSet.size && state !== "open") {
      findings.push({ issue: number, id: "issue-state-indeterminate", detail: "prospective claims must be open issues" });
      continue;
    }
    if (!prospectiveSet.size && state !== "closed") continue;

    const claim = parseClaim(issue.body);
    checked.push({ issue: number, state, claim });
    if (!claim.ok) {
      findings.push({ issue: number, id: "release-claim-indeterminate", detail: claim.reason });
      continue;
    }
    const matches = published.filter((release) => release.tag === claim.tag && release.train === claim.train);
    if (matches.length === 0) {
      findings.push({
        issue: number,
        id: "release-claim-unpublished",
        detail: `issue #${number} claims ${claim.train} ${claim.tag}, but no matching published release exists`,
      });
    }
  }

  for (const number of prospectiveSet) {
    if (!issues.some((issue) => Number(issue.number) === number)) {
      findings.push({ issue: number, id: "issue-unreadable", detail: `issue #${number} was not supplied` });
    }
  }
  return {
    ok: findings.length === 0,
    mode: prospectiveSet.size ? "prospective" : "audit",
    checked,
    findings,
    releases: published,
  };
}

function ghJson(args) {
  try {
    return JSON.parse(execFileSync("gh", args, { cwd: REPO_ROOT, encoding: "utf8" }));
  } catch (error) {
    throw new Error(error.stderr?.trim() || error.message);
  }
}

export function parseArgs(argv) {
  const options = { json: false, fixture: null, prospective: [], issueNumbers: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") options.json = true;
    else if (arg === "--fixture") options.fixture = argv[++i];
    else if (arg === "--prospective") {
      while (argv[i + 1] && !argv[i + 1].startsWith("-")) options.prospective.push(Number(argv[++i]));
    } else if (/^\d+$/.test(arg)) options.issueNumbers.push(Number(arg));
    else throw new Error(`unknown option: ${arg}`);
  }
  if (options.prospective.some((n) => !Number.isInteger(n))) throw new Error("issue numbers must be integers");
  return options;
}

export function readFixture(file) {
  const value = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  if (!Array.isArray(value.issues) || !Array.isArray(value.releases)) {
    throw new Error("fixture must contain issues and releases arrays");
  }
  return value;
}

export function readLive(issueNumbers) {
  if (!issueNumbers.length) throw new Error("supply issue numbers or --fixture");
  return {
    issues: issueNumbers.map((number) =>
      ghJson(["issue", "view", String(number), "--repo", REPO, "--json", "number,state,body,title"])),
    releases: ghJson(["release", "list", "--repo", REPO, "--limit", "100", "--json", "tagName,name,isDraft,isPrerelease"]),
  };
}

export function formatReport(result) {
  const lines = [`# Closure evidence (${result.mode})`, ""];
  if (result.ok) lines.push("Every checked release claim has a matching published release.", "");
  else {
    lines.push(`${result.findings.length} finding(s).`, "");
    for (const finding of result.findings) lines.push(`- **#${finding.issue}** ${finding.id}: ${finding.detail}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function main(argv = []) {
  const options = parseArgs(argv);
  const liveIssueNumbers = options.issueNumbers.length ? options.issueNumbers : options.prospective;
  const input = options.fixture ? readFixture(options.fixture) : readLive(liveIssueNumbers);
  const issues = options.prospective.length
    ? input.issues.filter((issue) => options.prospective.includes(Number(issue.number)))
    : input.issues;
  const result = assessClaims({ issues, releases: input.releases, prospective: options.prospective });
  console.log(options.json ? JSON.stringify(result, null, 2) : formatReport(result));
  return result.ok ? 0 : 1;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
