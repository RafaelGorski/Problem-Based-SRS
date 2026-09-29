#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function assessBehaviorProof(runs, now = new Date()) {
  const completed = runs
    .filter((run) => run.status === "completed")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const latestSuccess = completed.find((run) => run.conclusion === "success");
  const age = latestSuccess ? now.getTime() - Date.parse(latestSuccess.createdAt) : Infinity;
  const findings = [];
  if (!latestSuccess || !Number.isFinite(age) || age < 0 || age > WEEK_MS) {
    findings.push("No successful scheduled behavior proof within the last seven days");
  }
  if (completed.length >= 2 && completed.slice(0, 2).every((run) => run.conclusion === "failure")) {
    findings.push(`Two consecutive scheduled behavior runs failed: ${completed.slice(0, 2).map((run) => run.databaseId).join(", ")}`);
  }
  return { ok: findings.length === 0, latestSuccess: latestSuccess ?? null, findings };
}

export function main({
  run = execFileSync,
  summaryFile = process.env.GITHUB_STEP_SUMMARY,
  now = new Date(),
  error = console.error,
} = {}) {
  try {
    const runs = JSON.parse(run("gh", [
      "run", "list", "--workflow", "skill-behavior.yml", "--event", "schedule",
      "--limit", "30", "--json", "databaseId,status,conclusion,createdAt",
    ], { encoding: "utf8" }));
    const result = assessBehaviorProof(runs, now);
    const lines = [
      "## Scheduled behavior proof",
      "",
      result.latestSuccess
        ? `Latest successful run: https://github.com/RafaelGorski/Problem-Based-SRS/actions/runs/${result.latestSuccess.databaseId}`
        : "No successful scheduled run recorded.",
      ...result.findings.map((finding) => `- ${finding}`),
    ];
    fs.appendFileSync(summaryFile, `${lines.join("\n")}\n`);
    for (const finding of result.findings) error(`::error title=Behavior proof alert::${finding}`);
    return result.ok ? 0 : 1;
  } catch (failure) {
    error(`::error title=Behavior proof unavailable::${failure.message}`);
    return 1;
  }
}
