// `npm audit` needs a network and a registry that changes under you, so it cannot be a
// gate. The part that *is* deterministic is whether the fix is still in place: an override
// pin is one `npm install --force` or one careless lockfile regeneration away from
// disappearing, and nothing would say so until the next advisory sweep.
//
// This reads the two files npm itself writes and asserts they agree: every override the
// canvas package declares must actually be what the lockfile resolved. It is offline, has
// no dependencies, and fails loudly if a security pin stops being applied.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANVAS = ".github/extensions/srs-navigator";
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"));

const PKG = readJson(`${CANVAS}/package.json`);
const LOCK = readJson(`${CANVAS}/package-lock.json`);

/** Every version the lockfile resolved for a package name, wherever it appears in the tree. */
export function resolvedVersions(lock, name) {
  return Object.entries(lock.packages ?? {})
    .filter(([p]) => p === `node_modules/${name}` || p.endsWith(`/node_modules/${name}`))
    .map(([, meta]) => meta.version)
    .filter(Boolean);
}

/** Compare dotted numeric versions: -1, 0 or 1. Prerelease tags are ignored. */
export function compareVersions(a, b) {
  const parts = (v) => String(v).split("-")[0].split(".").map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** The floor a `^x.y.z` / `~x.y.z` / `>=x.y.z` / `x.y.z` range allows. */
export function rangeFloor(range) {
  return String(range).replace(/^[\^~>=\s]+/, "").trim();
}

describe("canvas dependency overrides are actually applied", () => {
  test("declares at least one override, and the lockfile honours every one", () => {
    const overrides = Object.entries(PKG.overrides ?? {});
    assert.ok(
      overrides.length > 0,
      "the canvas package declares no overrides — if the security pin was intentionally " +
        "removed because the upstream fix landed, delete this suite in the same change",
    );
    for (const [name, range] of overrides) {
      const resolved = resolvedVersions(LOCK, name);
      assert.ok(
        resolved.length > 0,
        `package.json overrides ${name}, but package-lock.json resolves no copy of it — ` +
          "the override is documentation, not a fix",
      );
      const floor = rangeFloor(range);
      const below = resolved.filter((v) => compareVersions(v, floor) < 0);
      assert.deepEqual(
        below,
        [],
        `${name} is pinned to ${range}, but the lockfile still resolves ${below.join(", ")}. ` +
          "Run `npm install` in .github/extensions/srs-navigator and commit the lockfile.",
      );
    }
  });

  test("the lockfile describes the package.json beside it", () => {
    // A lockfile generated from a different manifest is why the pin can look applied and
    // not be: npm only enforces overrides it was asked to resolve.
    assert.equal(
      LOCK.packages?.[""]?.version,
      PKG.version,
      "package-lock.json is stale — regenerate it with `npm install`",
    );
    assert.deepEqual(
      LOCK.packages?.[""]?.devDependencies ?? {},
      PKG.devDependencies ?? {},
      "package-lock.json's recorded devDependencies must match package.json's",
    );
  });
});
