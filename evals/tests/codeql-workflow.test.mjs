import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const workflowPath = ".github/workflows/codeql.yml";
const workflow = fs.readFileSync(path.join(repoRoot, workflowPath), "utf8");

describe("CodeQL workflow", () => {
  it("scans supported source languages on change and on a schedule", () => {
    assert.match(workflow, /push:\s*\n\s+branches:\s+\[main\]/);
    assert.match(workflow, /pull_request:\s*\n\s+branches:\s+\[main\]/);
    assert.match(workflow, /schedule:[\s\S]*?cron:\s*"[^"]+"/);
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /language:\s+\[javascript-typescript,\s*python\]/);
  });

  it("uses the supported CodeQL action and least required permissions", () => {
    assert.match(workflow, /github\/codeql-action\/init@v3/);
    assert.match(workflow, /github\/codeql-action\/analyze@v3/);
    assert.match(workflow, /permissions:\s*\n\s+contents:\s*read\s*\n\s+security-events:\s*write/);
    assert.match(workflow, /timeout-minutes:\s*\d+/);
  });

  it("does not broaden execution to arbitrary branches or privileged write access", () => {
    assert.doesNotMatch(workflow, /pull_request_target:/);
    assert.doesNotMatch(workflow, /contents:\s*write/);
    assert.doesNotMatch(workflow, /actions:\s*write/);
  });
});
