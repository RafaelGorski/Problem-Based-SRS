#!/usr/bin/env node
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function scenarioCounts(log) {
  const values = new Map(
    [...log.matchAll(/^(?:#|ℹ)\s*(tests|pass|fail|skipped|cancelled)\s+(\d+)\s*$/gm)]
      .map((match) => [match[1], Number(match[2])]),
  );
  if (!values.has("tests") || !values.has("skipped")) {
    throw new Error("skill-behavior: missing test totals in the runner log");
  }
  const executed = values.get("tests") - values.get("skipped") - (values.get("cancelled") ?? 0);
  if (executed <= 0) {
    throw new Error("skill-behavior: zero scenarios executed; a skipped suite is not a proof");
  }
  return { executed, passed: values.get("pass") ?? 0, failed: values.get("fail") ?? 0 };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const counts = scenarioCounts(fs.readFileSync(process.argv[2], "utf8"));
    const summary = `## Skill behavior proof\n\nExecuted scenarios: **${counts.executed}** (passed: ${counts.passed}, failed: ${counts.failed}).\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log(summary);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
