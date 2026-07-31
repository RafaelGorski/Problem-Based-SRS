// Drift guard: every deterministic test file must actually run in `npm test`.
//
// Why this exists: `tests/http-guard.test.mjs` (the loopback/CSRF guard for the
// canvas's local server) and `tests/text-refs.test.mjs` sat on disk for multiple
// releases while being absent from the `test` script, so they ran in CI never.
// In an anti-drift product, an unwired test file is a silent coverage hole —
// this test fails the moment a new `tests/*.test.mjs` is added without wiring.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, "..");

// Playwright-driven suites must NOT run under `node --test` (they import
// `@playwright/test`, which is only meaningful under the playwright runner).
//
// Which runner a file belongs to is derived from the file itself rather than kept in
// a hand-maintained list here. A list is a second place to remember: the previous
// hardcoded `Set(["visual.test.mjs"])` meant adding a second Playwright suite broke
// this guard for a reason that had nothing to do with wiring.
function isPlaywrightSuite(file) {
  const src = readFileSync(path.join(EXT_ROOT, "tests", file), "utf8");
  return /from\s+["']@playwright\/test["']/.test(src);
}

function readTestScript() {
  const pkg = JSON.parse(readFileSync(path.join(EXT_ROOT, "package.json"), "utf8"));
  return pkg.scripts?.test ?? "";
}

function listTestFiles() {
  return readdirSync(path.join(EXT_ROOT, "tests"))
    .filter((f) => f.endsWith(".test.mjs"))
    .sort();
}

const PLAYWRIGHT_ONLY = new Set(listTestFiles().filter(isPlaywrightSuite));

describe("test wiring", () => {
  it("runs every tests/*.test.mjs in the npm test script", () => {
    const script = readTestScript();
    const missing = listTestFiles()
      .filter((f) => !PLAYWRIGHT_ONLY.has(f))
      .filter((f) => !script.includes(`tests/${f}`));

    assert.deepEqual(
      missing,
      [],
      `Unwired test file(s): ${missing.join(", ")}. Add them to the "test" script in package.json.`
    );
  });

  it("does not run Playwright-only suites under node --test", () => {
    const script = readTestScript();
    assert.ok(PLAYWRIGHT_ONLY.size > 0, "the Playwright suites should still be detectable");
    for (const f of PLAYWRIGHT_ONLY) {
      assert.ok(
        !script.includes(`tests/${f}`),
        `${f} imports @playwright/test and must stay out of the node --test script.`
      );
    }
  });

  it("runs every Playwright suite under the playwright config", () => {
    const config = readFileSync(path.join(EXT_ROOT, "playwright.config.mjs"), "utf8");
    const unmatched = [...PLAYWRIGHT_ONLY].filter((f) => !config.includes(f));
    assert.deepEqual(
      unmatched,
      [],
      `Playwright suite(s) not selected by playwright.config.mjs: ${unmatched.join(", ")}. ` +
        "A spec that no project matches never runs."
    );
  });

  it("only references test files that exist on disk", () => {
    const script = readTestScript();
    const referenced = [...script.matchAll(/tests\/([\w.-]+\.test\.mjs)/g)].map((m) => m[1]);
    const onDisk = new Set(listTestFiles());
    const phantom = referenced.filter((f) => !onDisk.has(f));

    assert.deepEqual(phantom, [], `Test script references missing file(s): ${phantom.join(", ")}`);
  });
});
