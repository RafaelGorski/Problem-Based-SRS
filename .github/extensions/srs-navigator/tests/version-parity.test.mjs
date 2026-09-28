import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(EXT_ROOT, "..", "..", "..");

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

describe("extension version parity", () => {
  it("package.json, package-lock.json, and VERSION all report the same version", () => {
    const pkg = readJson(path.join(EXT_ROOT, "package.json"));
    const lock = readJson(path.join(EXT_ROOT, "package-lock.json"));
    const versionFile = readFileSync(path.join(REPO_ROOT, "VERSION"), "utf8").trim();

    assert.equal(
      lock.version,
      pkg.version,
      `package-lock.json root "version" (${lock.version}) must match package.json "version" (${pkg.version})`
    );
    assert.equal(
      lock.packages?.[""]?.version,
      pkg.version,
      `package-lock.json packages[""].version (${lock.packages?.[""]?.version}) must match package.json "version" (${pkg.version})`
    );
    assert.equal(
      versionFile,
      pkg.version,
      `VERSION (${versionFile}) must match package.json "version" (${pkg.version})`
    );
  });
});
