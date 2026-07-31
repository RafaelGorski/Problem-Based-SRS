#!/usr/bin/env node
// Package the srs-navigator canvas extension (code + bundled skills) into
// distributable archives. Runtime/dev artifacts (node_modules, test output, maintainer
// scripts, machine-local sync state) are excluded and the shipped package.json is trimmed
// to an install manifest, so an extracted archive is self-contained: it runs as-is and
// never sends an installer to npm.
//
// Produces, under build/:
//   srs-navigator-<version>.tar.gz
//   srs-navigator-<version>.zip   (when the `zip` binary is available)
//
// Usage:
//   node scripts/package-extension.mjs [--version X.Y.Z]
//
// When run in GitHub Actions, archive paths are appended to $GITHUB_OUTPUT.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  appendFileSync,
  rmSync,
  mkdirSync,
  cpSync,
} from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const extDir = resolve(repoRoot, ".github", "extensions", "srs-navigator");
const buildDir = resolve(repoRoot, "build");

// The single top-level directory every archive unpacks into. Install instructions are
// written against it: because the archive already carries this folder, the documented
// extract target must be its *parent*. Exported so the docs guard derives that from the
// packager instead of restating it.
export const ARCHIVE_ROOT = "srs-navigator";

// Paths (relative to the extension dir) that must never be packaged.
//
// `scripts/` is maintainer tooling, not runtime: record-demo drives Playwright,
// serve-canvas backs the e2e runner, serve-site previews the docs, and sync-skills reads
// <repoRoot>/skills/, which a standalone install does not have. Nothing in extension.mjs,
// lib/, or copilot-extension.json imports any of it.
export const EXCLUDE = new Set([
  "node_modules",
  "test-results",
  "playwright-report",
  "tests",
  "docs",
  "scripts",
]);
export const EXCLUDE_FILES = new Set([
  ".sync-state.json", // skills/.sync-state.json — per-machine runtime state
  "playwright.config.mjs",
  "README.md",
  ".gitignore",
  "package-lock.json", // a lockfile in an install archive is an instruction to run `npm ci`
]);

// Fields the shipped package.json keeps. An allowlist, not a denylist: the archive carries
// no node_modules, so anything that would send an installer to npm — devDependencies, a
// lockfile, scripts — must not travel with it. srs-navigator-1.1.0.zip went out at 4.3 MB
// because a Playwright tree was swept in; shipping the manifest that rebuilds that tree is
// the same defect one step removed. `version` stays because extension.mjs reads its own
// displayed version out of this file.
const MANIFEST_FIELDS = ["name", "version", "description", "license", "type"];

/** The trimmed package.json an extracted archive should carry. */
export function installManifest(pkg) {
  const out = {};
  for (const field of MANIFEST_FIELDS) {
    if (pkg[field] !== undefined) out[field] = pkg[field];
  }
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--version") out.version = argv[++i];
  }
  return out;
}

export function resolveVersion(explicit) {
  if (explicit) return explicit;
  const versionFile = resolve(repoRoot, "VERSION");
  if (existsSync(versionFile)) return readFileSync(versionFile, "utf-8").trim();
  const pkg = JSON.parse(readFileSync(resolve(extDir, "package.json"), "utf-8"));
  return pkg.version;
}

/** Copy the shippable extension tree into `stageRoot/<ARCHIVE_ROOT>`; returns that path. */
export function stage(stageRoot) {
  const dest = resolve(stageRoot, ARCHIVE_ROOT);
  cpSync(extDir, dest, {
    recursive: true,
    filter: (src) => {
      const name = src.split(/[\\/]/).pop();
      if (EXCLUDE.has(name)) return false;
      if (EXCLUDE_FILES.has(name)) return false;
      return true;
    },
  });

  const manifestPath = resolve(dest, "package.json");
  const pkg = JSON.parse(readFileSync(manifestPath, "utf-8"));
  writeFileSync(manifestPath, `${JSON.stringify(installManifest(pkg), null, 2)}\n`);

  return dest;
}

function hasBinary(bin) {
  try {
    execSync(process.platform === "win32" ? `where ${bin}` : `command -v ${bin}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const { version: explicit } = parseArgs(process.argv.slice(2));
  const version = resolveVersion(explicit);
  const base = `${ARCHIVE_ROOT}-${version}`;

  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });

  const stageRoot = resolve(buildDir, "stage");
  mkdirSync(stageRoot, { recursive: true });
  stage(stageRoot);

  const artifacts = [];

  // tar.gz (tar is available on Linux, macOS, and Windows 10+/bsdtar).
  const tgz = resolve(buildDir, `${base}.tar.gz`);
  execFileSync("tar", ["-czf", tgz, "-C", stageRoot, ARCHIVE_ROOT], {
    stdio: "inherit",
  });
  artifacts.push(tgz);
  console.log(`Created ${tgz}`);

  // zip (best-effort: only when the zip binary exists, e.g. on CI runners).
  if (hasBinary("zip")) {
    const zip = resolve(buildDir, `${base}.zip`);
    execSync(`zip -r -q "${zip}" ${ARCHIVE_ROOT}`, { cwd: stageRoot, stdio: "inherit" });
    artifacts.push(zip);
    console.log(`Created ${zip}`);
  } else {
    console.warn("`zip` not found — skipping .zip archive (tar.gz still produced).");
  }

  rmSync(stageRoot, { recursive: true, force: true });

  if (process.env.GITHUB_OUTPUT && existsSync(process.env.GITHUB_OUTPUT)) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  }

  console.log(`\nPackaged ${base}: ${artifacts.length} archive(s).`);
}

// Only package when run as a script. Importing this module must stay side-effect free so
// the install-path guard can call stage() into a temp directory without building anything.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
