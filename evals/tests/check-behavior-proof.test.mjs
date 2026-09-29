import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assessBehaviorProof, main } from "../../scripts/check-behavior-proof.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const now = new Date("2026-09-27T12:00:00Z");
const run = (databaseId, createdAt, conclusion, status = "completed") => ({
  databaseId, createdAt, conclusion, status,
});

test("accepts a fresh scheduled execution and ignores in-progress runs", () => {
  const result = assessBehaviorProof([
    run(3, "2026-09-27T11:00:00Z", "", "in_progress"),
    run(2, "2026-09-20T12:00:00Z", "failure"),
    run(1, "2026-09-20T12:00:00Z", "success"),
  ], now);
  assert.equal(result.ok, true);
  assert.equal(result.latestSuccess.databaseId, 1);
  assert.deepEqual(result.findings, []);
});

test("alerts on no proof, stale proof, invalid timestamp and future proof", () => {
  assert.match(assessBehaviorProof([], now).findings[0], /No successful/);
  assert.match(assessBehaviorProof([run(1, "2026-09-20T11:59:59Z", "success")], now).findings[0], /seven days/);
  assert.equal(assessBehaviorProof([run(1, "2026-09-20T12:00:00Z", "success")], now).ok, true);
  assert.equal(assessBehaviorProof([run(1, "invalid", "success")], now).ok, false);
  assert.equal(assessBehaviorProof([run(1, "2026-09-28T12:00:00Z", "success")], now).ok, false);
});

test("alerts after two consecutive failures, not after a single failure", () => {
  const success = run(1, "2026-09-26T12:00:00Z", "success");
  assert.equal(assessBehaviorProof([success, run(2, "2026-09-27T10:00:00Z", "failure")], now).ok, true);
  const result = assessBehaviorProof([
    success, run(2, "2026-09-27T09:00:00Z", "failure"),
    run(3, "2026-09-27T10:00:00Z", "failure"),
  ], now);
  assert.equal(result.ok, false);
  assert.deepEqual(result.findings, ["Two consecutive scheduled behavior runs failed: 3, 2"]);
});

test("CLI contract writes the success link and emits actionable error annotations", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "behavior-health-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const summaryFile = path.join(dir, "summary.md");
  const errors = [];
  const options = {
    summaryFile, now, error: (message) => errors.push(message),
  };
  const success = run(1, "2026-09-26T12:00:00Z", "success");
  assert.equal(main({ ...options, run: () => JSON.stringify([success]) }), 0);
  assert.match(fs.readFileSync(summaryFile, "utf8"), /actions\/runs\/1/);
  assert.equal(main({ ...options, run: () => JSON.stringify([]) }), 1);
  assert.match(fs.readFileSync(summaryFile, "utf8"), /No successful scheduled run recorded/);
  assert.match(errors[0], /Behavior proof alert/);
  assert.equal(main({ ...options, run: () => { throw new Error("API unavailable"); } }), 1);
  assert.match(errors[1], /Behavior proof unavailable::API unavailable/);
});

test("CLI fails closed when live GitHub state is unreadable", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "behavior-cli-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [path.join(root, "scripts/check-behavior-proof-cli.mjs")], {
    encoding: "utf8",
    env: { ...process.env, PATH: dir, GITHUB_STEP_SUMMARY: path.join(dir, "summary.md") },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Behavior proof unavailable/);
});

test("daily Actions workflow runs the alert and the weekly run rejects zero scenarios", () => {
  const daily = fs.readFileSync(path.join(root, ".github/workflows/behavior-proof-health.yml"), "utf8");
  const weekly = fs.readFileSync(path.join(root, ".github/workflows/skill-behavior.yml"), "utf8");
  assert.match(daily, /cron: "30 7 \* \* \*"/);
  assert.match(daily, /run: node scripts\/check-behavior-proof-cli\.mjs/);
  assert.match(weekly, /run: node scripts\/skill-behavior-summary\.mjs/);
});
