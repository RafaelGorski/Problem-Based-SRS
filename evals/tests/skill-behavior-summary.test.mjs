import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { scenarioCounts } from "../../scripts/skill-behavior-summary.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(root, "scripts/skill-behavior-summary.mjs");

test("counts executed scenarios rather than treating skipped scenarios as proof", () => {
  assert.deepEqual(scenarioCounts("ℹ tests 9\nℹ pass 7\nℹ fail 1\nℹ skipped 1\nℹ cancelled 0\n"), {
    executed: 8,
    passed: 7,
    failed: 1,
  });
  assert.deepEqual(scenarioCounts("# tests 2\n# skipped 1\n"), {
    executed: 1,
    passed: 0,
    failed: 0,
  });
});

test("rejects missing totals and zero executed scenarios", () => {
  assert.throws(() => scenarioCounts(""), /missing test totals/);
  assert.throws(() => scenarioCounts("# tests 1\n"), /missing test totals/);
  assert.throws(() => scenarioCounts("# tests 2\n# skipped 2\n"), /zero scenarios executed/);
  assert.throws(() => scenarioCounts("# tests 2\n# skipped 1\n# cancelled 1\n"), /zero scenarios executed/);
});

test("CLI writes the executed count into the Actions summary and fails closed on a skipped suite", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-behavior-summary-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const log = path.join(dir, "behavior.log");
  const summary = path.join(dir, "summary.md");
  const run = () => spawnSync(process.execPath, [script, log], {
    encoding: "utf8",
    env: { ...process.env, GITHUB_STEP_SUMMARY: summary },
  });

  test("scheduled workflow preserves the scenario runner's failure despite tee", () => {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/skill-behavior.yml"), "utf8");
    assert.match(workflow, /set -o pipefail\s+.*npm run test:skill-behavior 2>&1 \| tee skill-behavior\.log/s);
    assert.match(workflow, /if: always\(\) && steps\.provider\.outcome == 'success'/);
    assert.match(workflow, /if: always\(\) && steps\.provider\.outcome != 'success'[\s\S]*Executed scenarios: \*\*0\*\*/);
  });

  fs.writeFileSync(log, "ℹ tests 6\nℹ pass 4\nℹ fail 0\nℹ skipped 2\n");
  const passing = run();
  assert.equal(passing.status, 0, passing.stderr);
  const saved = fs.readFileSync(summary, "utf8");
  assert.match(saved, /Executed scenarios: \*\*4\*\*/);

  fs.writeFileSync(log, "ℹ tests 6\nℹ pass 0\nℹ fail 0\nℹ skipped 6\n");
  const skipped = run();
  assert.equal(skipped.status, 1);
  assert.match(skipped.stderr, /zero scenarios executed/);
  assert.equal(fs.readFileSync(summary, "utf8"), saved, "failed runs must not append success-shaped data");

  fs.rmSync(log);
  const unreadable = run();
  assert.equal(unreadable.status, 1);
  assert.match(unreadable.stderr, /ENOENT/);
});
