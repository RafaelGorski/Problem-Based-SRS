import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildCensus, liveCensus, runCensus } from "../../scripts/release-claim-census.mjs";
import { ROOT_ISSUES } from "../../scripts/check-release-issue-gate.mjs";

const date = "2026-09-27T12:00:00Z";
const versions = { pluginVersion: "2.7.0", canvasVersions: ["1.1.5"] };
const issues = ROOT_ISSUES.map((number) => ({ number, state: "OPEN", body: "<!-- release-claim train=none -->" }));

test("records all roots with a dated command even when no release is claimed", () => {
  const result = buildCensus({ issues, releases: [] }, versions, date);
  assert.equal(result.ok, true);
  assert.equal(result.capturedAt, date);
  assert.equal(result.roots.length, 28);
  assert.equal(result.roots[0].verdict, "no-release-claim");
  assert.match(result.command, /release-claim-census-cli/);
});

test("records a tag, pipeline owner and exact published train without accepting mismatches", () => {
  const plugin = issues.map((item) => item.number === 139
    ? { ...item, body: "<!-- release-claim train=plugin version=v2.7.0 -->" }
    : item);
  const published = [{ tagName: "v2.7", name: "Version 2.7", isDraft: false, isPrerelease: false }];
  const record = buildCensus({ issues: plugin, releases: published }, versions, date).roots.find((item) => item.number === 139);
  assert.deepEqual(
    [record.tag, record.pipelineTrain, record.published, record.verdict],
    ["v2.7", "plugin", true, "verified"],
  );
  const wrongTrain = buildCensus({
    issues: plugin, releases: [{ ...published[0], name: "srs-navigator 2.7" }],
  }, versions, date).roots.find((item) => item.number === 139);
  assert.equal(wrongTrain.published, false);
  assert.equal(wrongTrain.verdict, "mismatch");
  const unknown = buildCensus({
    issues: plugin.map((item) => item.number === 139
      ? { ...item, body: "<!-- release-claim train=plugin version=v2.6 -->" } : item),
    releases: [{ tagName: "v2.6", name: "Version 2.6" }],
  }, versions, date).roots.find((item) => item.number === 139);
  assert.equal(unknown.pipelineTrain, "unknown");
  assert.equal(unknown.verdict, "mismatch");
});

test("malformed and missing markers are indeterminate; missing root fails loudly", () => {
  const broken = issues.map((item) => item.number === 139 ? { ...item, body: "" } : item);
  const record = buildCensus({ issues: broken, releases: [] }, versions, date);
  assert.equal(record.ok, false);
  assert.equal(record.roots.find((item) => item.number === 139).verdict, "indeterminate");
  assert.throws(() => buildCensus({ issues: broken.slice(1), releases: [] }, versions, date), /root #138/);
});

test("live census requests every batch root and passes through timestamp", () => {
  const result = liveCensus({
    read: (numbers) => {
      assert.deepEqual(numbers, ROOT_ISSUES);
      return { issues, releases: [] };
    },
    ...versions, capturedAt: date,
  });
  assert.equal(result.capturedAt, date);
});

test("census command writes complete JSON and fails on mismatch or API error", () => {
  let output;
  const write = (value) => { output = JSON.parse(value); };
  const clean = buildCensus({ issues, releases: [] }, versions, date);
  assert.equal(runCensus({ get: () => clean, write }), 0);
  assert.equal(output.roots.length, 28);
  const mismatched = { ...clean, ok: false };
  assert.equal(runCensus({ get: () => mismatched, write }), 1);
  const messages = [];
  assert.equal(runCensus({
    get: () => { throw new Error("GitHub unavailable"); },
    report: (message) => messages.push(message),
  }), 1);
  assert.deepEqual(messages, ["release-claim-census: GitHub unavailable"]);
});

test("CLI fails closed if GitHub is unavailable", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-census-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const result = spawnSync(process.execPath, [path.join(root, "scripts/release-claim-census-cli.mjs")], {
    encoding: "utf8", env: { ...process.env, PATH: dir },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /release-claim-census:/);
});
