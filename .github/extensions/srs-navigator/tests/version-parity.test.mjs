import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(here, "..");
const repositoryRoot = path.resolve(extensionRoot, "..", "..", "..");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

describe("extension version parity", () => {
  it("keeps package.json, package-lock.json, and VERSION aligned", () => {
    const packageJson = readJson(path.join(extensionRoot, "package.json"));
    const packageLock = readJson(path.join(extensionRoot, "package-lock.json"));
    const version = readFileSync(path.join(repositoryRoot, "VERSION"), "utf8").trim();

    assert.equal(
      packageLock.version,
      packageJson.version,
      `package-lock.json version (${packageLock.version}) must match package.json (${packageJson.version})`,
    );
    assert.equal(
      packageLock.packages?.[""]?.version,
      packageJson.version,
      `package-lock.json root package version (${packageLock.packages?.[""]?.version}) must match package.json (${packageJson.version})`,
    );
    assert.equal(
      version,
      packageJson.version,
      `VERSION (${version}) must match package.json (${packageJson.version})`,
    );
  });
});
