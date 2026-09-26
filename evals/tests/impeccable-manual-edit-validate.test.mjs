import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCopyEditPostApplyChecks } from "../../.agents/skills/impeccable/scripts/live-copy-edit-agent.mjs";

// Regression guard for issue #205 (Security: arbitrary command execution via
// package.json impeccable:manual-edit-validate script). The hook used to run any
// workspace-supplied `scripts["impeccable:manual-edit-validate"]` command through a
// shell with no confirmation, allowlist, or sandboxing, so an attacker-controlled or
// untrusted package.json could achieve code execution during validation. It must now
// require an explicit opt-in environment variable before it will ever spawn that
// command.

const OPT_IN_ENV = "IMPECCABLE_ALLOW_MANUAL_EDIT_VALIDATE";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function makeWorkspace(script) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "impeccable-manual-edit-"));
  const sentinel = path.join(dir, "sentinel.txt");
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "fixture", scripts: { "impeccable:manual-edit-validate": script } }),
  );
  return { dir, sentinel };
}

describe("manual-edit-validate opt-in gate (issue #205)", () => {
  let previousEnv;

  beforeEach(() => {
    previousEnv = process.env[OPT_IN_ENV];
    delete process.env[OPT_IN_ENV];
  });

  afterEach(() => {
    if (previousEnv === undefined) delete process.env[OPT_IN_ENV];
    else process.env[OPT_IN_ENV] = previousEnv;
  });

  it("never executes the workspace-supplied command when the opt-in is not set", () => {
    const isWin = process.platform === "win32";
    const command = isWin
      ? `cmd /c echo ran > "sentinel.txt"`
      : `echo ran > sentinel.txt`;
    const { dir, sentinel } = makeWorkspace(command);
    const result = runCopyEditPostApplyChecks({ cwd: dir, files: [] });
    assert.equal(result.ok, true, "no failure should be raised merely for not running the hook");
    assert.equal(fs.existsSync(sentinel), false, "the command must not have run");
    const warning = result.warnings.find((w) => w.reason === "manual_edit_validation_skipped_not_opted_in");
    assert.ok(warning, "a warning must record that validation was skipped");
    assert.match(warning.message, new RegExp(OPT_IN_ENV));
  });

  it("runs the workspace-supplied command once the opt-in env var is set to '1'", () => {
    const isWin = process.platform === "win32";
    const command = isWin
      ? `cmd /c echo ran > "sentinel.txt"`
      : `echo ran > sentinel.txt`;
    const { dir, sentinel } = makeWorkspace(command);
    process.env[OPT_IN_ENV] = "1";
    const result = runCopyEditPostApplyChecks({ cwd: dir, files: [] });
    assert.equal(result.ok, true);
    assert.equal(fs.existsSync(sentinel), true, "the command must run once opted in");
  });

  it("surfaces a failure when the opted-in command exits non-zero", () => {
    const isWin = process.platform === "win32";
    const command = isWin ? "cmd /c exit 1" : "exit 1";
    const { dir } = makeWorkspace(command);
    process.env[OPT_IN_ENV] = "1";
    const result = runCopyEditPostApplyChecks({ cwd: dir, files: [] });
    assert.equal(result.ok, false);
    const failure = result.failures.find((f) => f.reason === "manual_edit_validation_failed");
    assert.ok(failure, "a non-zero exit must be reported as a failure");
  });

  it("is a no-op when no such script is declared", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "impeccable-manual-edit-none-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "fixture" }));
    const result = runCopyEditPostApplyChecks({ cwd: dir, files: [] });
    assert.equal(result.ok, true);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.failures.length, 0);
  });

  it("the vulnerable source module still exists at the path this guard imports", () => {
    assert.ok(
      fs.existsSync(path.join(root, ".agents/skills/impeccable/scripts/live-copy-edit-agent.mjs")),
      "keeps this regression guard honest about which file it is exercising",
    );
  });
});
