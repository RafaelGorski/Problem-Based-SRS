#!/usr/bin/env node
// Compute the next incremental project version and stamp it everywhere.
//
// Source of truth for the current version is the extension package.json. The
// next version bumps the requested semver part (patch by default) and skips any
// value that already has a matching git tag (v<version>) so reruns never collide.
//
// Files updated:
//   .github/extensions/srs-navigator/package.json       -> version: "X.Y.Z"
//   .github/extensions/srs-navigator/copilot-extension.json -> version: X (major int)
//   VERSION                                              -> X.Y.Z
//
// Usage:
//   node scripts/bump-version.mjs [--part patch|minor|major] [--dry-run]
//
// When run inside GitHub Actions, the new version is also appended to
// $GITHUB_OUTPUT as `version=` and `tag=` for downstream steps.

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const extDir = resolve(repoRoot, ".github", "extensions", "srs-navigator");
const pkgPath = resolve(extDir, "package.json");
const manifestPath = resolve(extDir, "copilot-extension.json");
const versionFilePath = resolve(repoRoot, "VERSION");

function parseArgs(argv) {
  const out = { part: "patch", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--part") out.part = argv[++i];
    if (argv[i] === "--dry-run") out.dryRun = true;
  }
  if (!["patch", "minor", "major"].includes(out.part)) {
    throw new Error(`Invalid --part "${out.part}" (expected patch|minor|major)`);
  }
  return out;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error(`Cannot parse semver from "${v}"`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bump({ major, minor, patch }, part) {
  if (part === "major") return { major: major + 1, minor: 0, patch: 0 };
  if (part === "minor") return { major, minor: minor + 1, patch: 0 };
  return { major, minor, patch: patch + 1 };
}

const fmt = ({ major, minor, patch }) => `${major}.${minor}.${patch}`;

function tagExists(tag) {
  try {
    const out = execSync(`git tag --list ${tag}`, { cwd: repoRoot, encoding: "utf-8" });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function main() {
  const { part, dryRun } = parseArgs(process.argv.slice(2));
  const pkg = readJson(pkgPath);
  const current = parseSemver(pkg.version);

  let next = bump(current, part);
  // Never reuse an existing tag; keep bumping the patch until we find a free one.
  while (tagExists(`v${fmt(next)}`)) {
    next = bump(next, "patch");
  }

  const version = fmt(next);
  const tag = `v${version}`;
  console.log(`Current version: ${fmt(current)}`);
  console.log(`Next version:    ${version} (${tag})`);

  if (dryRun) {
    console.log("--dry-run: no files written.");
    emitOutputs(version, tag);
    return;
  }

  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const manifest = readJson(manifestPath);
  manifest.version = next.major; // manifest version is an integer major
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  writeFileSync(versionFilePath, version + "\n");

  console.log("Updated package.json, copilot-extension.json, and VERSION.");
  emitOutputs(version, tag);
}

function emitOutputs(version, tag) {
  if (process.env.GITHUB_OUTPUT && existsSync(process.env.GITHUB_OUTPUT)) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
  }
}

main();
