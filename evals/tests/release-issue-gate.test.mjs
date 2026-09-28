import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT_ISSUES, releaseGate } from "../../scripts/check-release-issue-gate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("enumerates the 28 live batch roots and preserves the guard verdict", () => {
  assert.equal(ROOT_ISSUES.length, 28);
  assert.equal(new Set(ROOT_ISSUES).size, 28);
  for (const number of [138, 139, 145, 207, 209, 218, 226, 290, 291]) {
    assert.ok(ROOT_ISSUES.includes(number), `missing root #${number}`);
  }
  const read = (numbers) => {
    assert.deepEqual(numbers, ROOT_ISSUES.map(String));
    return 1;
  };
  assert.equal(releaseGate(read), 1, "a red report must fail the release");
  assert.equal(releaseGate(() => 0), 0);
});

test("API failures cannot produce a green release gate", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-issue-gate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [path.join(root, "scripts/check-release-issue-gate-cli.mjs")], {
    encoding: "utf8",
    env: { ...process.env, PATH: dir },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /release-issue-gate:/);
});

test("all release dispatch paths enforce the live gate before publication", () => {
  for (const file of [
    ".github/workflows/create-release.yml",
    ".github/workflows/release-canvas.yml",
    ".github/workflows/thursday-release.yml",
  ]) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    const gate = content.indexOf("run: node scripts/check-release-issue-gate-cli.mjs");
    const publish = file.includes("thursday")
      ? content.indexOf("gh workflow run create-release.yml")
      : file.includes("canvas")
        ? content.indexOf("Run unit tests")
        : content.indexOf("Build, validate & package");
    assert.ok(gate !== -1 && publish > gate, `${file} must fail on a red gate before dispatch/build`);
    assert.match(content.slice(0, gate), /actions\/checkout@v4/);
    assert.match(content.slice(0, gate), /actions\/setup-node@v4/);
  }
  const runbook = fs.readFileSync(path.join(root, "docs/release-verification.md"), "utf8");
  assert.match(runbook, /require[\s\S]*node scripts\/check-release-issue-gate-cli\.mjs/);
});
