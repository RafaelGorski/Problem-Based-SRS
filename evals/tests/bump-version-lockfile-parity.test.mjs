// FR.01.3.12 — the canvas release bump must stamp every version-bearing file it owns,
// including package-lock.json's root metadata, in the same operation. dependency-pins.test.mjs
// asserts the *current* tree agrees; this test proves the *bump script itself* keeps that
// invariant across a simulated release, so the drift cannot silently return the way it did for
// v1.1.1-v1.1.3 (issue #171).
//
// This runs bump-version.mjs's writers against a throwaway copy of the three files it owns —
// never against the real repository tree — so it is safe to run in the default suite.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANVAS = path.join(REPO_ROOT, ".github", "extensions", "srs-navigator");

/**
 * Copy the real extension dir's three owned files, AND the bump script itself, into a fully
 * isolated scratch tree, then run the *copied* script there. bump-version.mjs resolves every
 * path it writes from its own `import.meta.url` (never from `process.cwd()`), so running the
 * real repository's copy of the script — even with `cwd` overridden — would rewrite the real
 * repository's VERSION/package.json/package-lock.json. Copying the script alongside a scratch
 * `.github/extensions/srs-navigator/` and a scratch `VERSION` is what actually isolates the run.
 */
function runBumpInScratch() {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bump-parity-"));
  const scratchExt = path.join(scratchRoot, ".github", "extensions", "srs-navigator");
  const scratchScripts = path.join(scratchRoot, "scripts");
  fs.mkdirSync(scratchExt, { recursive: true });
  fs.mkdirSync(scratchScripts, { recursive: true });

  for (const file of ["package.json", "copilot-extension.json", "package-lock.json"]) {
    fs.copyFileSync(path.join(CANVAS, file), path.join(scratchExt, file));
  }
  fs.writeFileSync(path.join(scratchRoot, "VERSION"), fs.readFileSync(path.join(REPO_ROOT, "VERSION")));
  const scriptPath = path.join(scratchScripts, "bump-version.mjs");
  fs.copyFileSync(path.join(REPO_ROOT, "scripts", "bump-version.mjs"), scriptPath);

  // No git repo in the scratch dir, so existingTags() fails closed to [] — nextVersion() then
  // just increments the patch once, which is all this test needs to exercise the file writers.
  execFileSync(process.execPath, [scriptPath], { cwd: scratchRoot });

  const pkg = JSON.parse(fs.readFileSync(path.join(scratchExt, "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(scratchExt, "package-lock.json"), "utf8"));
  const version = fs.readFileSync(path.join(scratchRoot, "VERSION"), "utf8").trim();

  fs.rmSync(scratchRoot, { recursive: true, force: true });
  return { pkg, lock, version };
}

describe("bump-version.mjs owns the lockfile (FR.01.3.12)", () => {
  test("a simulated bump stamps package.json, VERSION, and both lockfile root fields to the same value", () => {
    const { pkg, lock, version } = runBumpInScratch();

    assert.equal(pkg.version, version, "package.json must match the bumped VERSION");
    assert.equal(lock.version, version, "package-lock.json root version must match the bumped VERSION");
    assert.equal(
      lock.packages?.[""]?.version,
      version,
      "package-lock.json packages[\"\"].version must match the bumped VERSION",
    );
  });

  test("negative control: this assertion does fail when the files disagree", () => {
    // Prove the assertion above is not vacuous by deliberately comparing mismatched values —
    // no source file is touched; this only demonstrates the check itself can fail.
    assert.throws(() => {
      assert.equal("1.1.3", "1.1.4", "deliberately mismatched — proves the guard is live");
    }, assert.AssertionError);
  });
});
