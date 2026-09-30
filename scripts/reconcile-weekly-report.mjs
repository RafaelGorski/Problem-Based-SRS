#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { releaseTrain } from "./check-distribution.mjs";
import { isoWeekPeriod } from "./weekly-release-report.mjs";

const REPO = "RafaelGorski/Problem-Based-SRS";

function parseReport(issue) {
  const rows = [...issue.body.matchAll(/^\|\s*(Plugin|Canvas)\s*\|\s*(v[\d.]+|none)\s*\|\s*(v[\d.]+|n\/a)\s*\|\s*(Yes|No)\s*\|/gim)];
  if (rows.length !== 2 || new Set(rows.map((row) => row[1].toLowerCase())).size !== 2) {
    throw new Error("Report must have exactly one plugin and one canvas train row.");
  }
  const created = new Date(issue.created_at);
  if (Number.isNaN(created.getTime())) throw new Error("Report has no valid creation timestamp.");
  const period = isoWeekPeriod(created);
  const stated = issue.body.match(/^\*\*Report period:\*\*\s*(\d{4}-W\d{2})\s*·\s*(\S+)\s+through\s+(\S+)\s+\(UTC\)/m);
  if (stated && [period.isoWeek, period.periodStart, period.periodEnd].some((value, i) => value !== stated[i + 1])) {
    throw new Error("Report's stated UTC period disagrees with its creation week.");
  }
  return {
    period,
    inferredPeriod: !stated,
    rows: Object.fromEntries(rows.map((row) => [
      row[1].toLowerCase(),
      { latest: row[2] === "none" ? null : row[2], planned: row[3] === "n/a" ? null : row[3], ready: row[4] === "Yes" },
    ])),
    createdAt: created.toISOString(),
  };
}

export function reconcileWeeklyReport(issue, releases, repo = REPO) {
  const { period, inferredPeriod, rows, createdAt } = parseReport(issue);
  const seen = new Set();
  const matches = [];
  const discrepancies = [];
  const start = Date.parse(period.periodStart);
  const end = Date.parse(period.periodEnd) + 1000;
  for (const train of ["plugin", "canvas"]) {
    const { latest, planned, ready } = rows[train];
    if (latest) {
      const release = releases.find((item) => item.tag_name === latest && !item.draft);
      if (!release || releaseTrain(release) !== train || Date.parse(release.published_at) > Date.parse(createdAt)) {
        discrepancies.push(`${train}: latest published ${latest} was not a published ${train} release at report time`);
      } else {
        matches.push(`${train}: latest ${latest} published ${release.published_at} (${release.html_url})`);
      }
    }
    if (ready && !planned) discrepancies.push(`${train}: ready without a planned tag`);
  }
  for (const release of releases) {
    if (release.draft || !release.published_at) continue;
    const published = Date.parse(release.published_at);
    if (!Number.isFinite(published)) throw new Error(`Release ${release.tag_name} has an invalid published_at timestamp.`);
    if (published < start || published >= end) continue;
    const train = releaseTrain(release);
    if (train === "unknown") {
      discrepancies.push(`Unclassified release ${release.tag_name} published ${release.published_at}`);
      continue;
    }
    if (seen.has(release.tag_name)) throw new Error(`Duplicate published release tag ${release.tag_name}.`);
    seen.add(release.tag_name);
    const row = rows[train];
    if (release.tag_name !== row.latest && release.tag_name !== row.planned) {
      discrepancies.push(`${train}: published ${release.tag_name} on ${release.published_at} was omitted from the report`);
    } else {
      matches.push(`${train}: ${release.tag_name} published in ${period.isoWeek} on ${release.published_at} (${release.html_url})`);
    }
  }
  return {
    issue: issue.html_url,
    createdAt,
    ...period,
    inferredPeriod,
    source: `https://api.github.com/repos/${repo}/releases?per_page=100 (all pages)`,
    matches,
    discrepancies,
    status: discrepancies.length ? "discrepancies" : "reconciled",
  };
}

function ghJson(args) {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
}

export function selectPreviousReport(issues, now) {
  const previous = new Date(now);
  previous.setUTCDate(previous.getUTCDate() - 7);
  const week = isoWeekPeriod(previous).isoWeek;
  const matches = issues.filter((issue) =>
    /^Weekly release report for \d{4}-\d{2}-\d{2}$/.test(issue.title) &&
    isoWeekPeriod(new Date(issue.created_at)).isoWeek === week);
  if (matches.length !== 1) throw new Error(`Expected one release report for ${week}; found ${matches.length}.`);
  return matches[0];
}

export function runReconciliation(argv, { api = ghJson, now = new Date(), write = console.log } = {}) {
  if (argv.length !== 1 || (argv[0] !== "--previous" && !/^\d+$/.test(argv[0]))) {
    throw new Error("Usage: node scripts/reconcile-weekly-report.mjs <report-issue-number|--previous>");
  }
  const number = argv[0] === "--previous"
    ? selectPreviousReport(api(["api", "--paginate", "--slurp", `repos/${REPO}/issues?state=all&per_page=100`]).flat(), now).number
    : argv[0];
  const issue = api(["api", `repos/${REPO}/issues/${number}`]);
  const pages = api(["api", "--paginate", "--slurp", `repos/${REPO}/releases?per_page=100`]);
  if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) {
    throw new Error("Release census is not a paginated array.");
  }
  const result = reconcileWeeklyReport(issue, pages.flat());
  write(JSON.stringify(result, null, 2));
  return result.discrepancies.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runReconciliation(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
