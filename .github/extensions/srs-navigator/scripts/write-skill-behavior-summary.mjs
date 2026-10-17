#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { formatSummary, parseTapSummary } from "./skill-behavior-summary.mjs";

function main(argv) {
  const logPath = argv[0];
  if (!logPath) throw new Error("Usage: node write-skill-behavior-summary.mjs <tap-log>");
  const tap = fs.readFileSync(path.resolve(logPath), "utf8");
  const counts = parseTapSummary(tap);
  const summary = formatSummary(tap, {
    provider: process.env.SRS_SKILL_BEHAVIOR_PROVIDER,
    model: process.env.SRS_SKILL_BEHAVIOR_MODEL,
  });
  process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  if (counts.fail > 0) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
