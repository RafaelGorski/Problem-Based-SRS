#!/usr/bin/env node
// Package the srs-navigator canvas extension (code + bundled skills) into
// distributable archives. Runtime/dev artifacts (node_modules, test output,
// machine-local sync state) are excluded so the archive contains only what an
// installer needs.
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
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const extDir = resolve(repoRoot, ".github", "extensions", "srs-navigator");
const buildDir = resolve(repoRoot, "build");

// Paths (relative to the extension dir) that must never be packaged.
const EXCLUDE = new Set([
  "node_modules",
  "test-results",
  "playwright-report",
  "tests",
  "docs",
]);
const EXCLUDE_FILES = new Set([
  ".sync-state.json", // skills/.sync-state.json — per-machine runtime state
  "playwright.config.mjs",
  "README.md",
  ".gitignore",
]);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--version") out.version = argv[++i];
  }
  return out;
}

function resolveVersion(explicit) {
  if (explicit) return explicit;
  const versionFile = resolve(repoRoot, "VERSION");
  if (existsSync(versionFile)) return readFileSync(versionFile, "utf-8").trim();
  const pkg = JSON.parse(readFileSync(resolve(extDir, "package.json"), "utf-8"));
  return pkg.version;
}

function stage(stageRoot) {
  const dest = resolve(stageRoot, "srs-navigator");
  cpSync(extDir, dest, {
    recursive: true,
    filter: (src) => {
      const name = src.split(/[\\/]/).pop();
      if (EXCLUDE.has(name)) return false;
      if (EXCLUDE_FILES.has(name)) return false;
      return true;
    },
  });
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
  const base = `srs-navigator-${version}`;

  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });

  const stageRoot = resolve(buildDir, "stage");
  mkdirSync(stageRoot, { recursive: true });
  stage(stageRoot);

  const artifacts = [];

  // tar.gz (tar is available on Linux, macOS, and Windows 10+/bsdtar).
  const tgz = resolve(buildDir, `${base}.tar.gz`);
  execFileSync("tar", ["-czf", tgz, "-C", stageRoot, "srs-navigator"], {
    stdio: "inherit",
  });
  artifacts.push(tgz);
  console.log(`Created ${tgz}`);

  // zip (best-effort: only when the zip binary exists, e.g. on CI runners).
  if (hasBinary("zip")) {
    const zip = resolve(buildDir, `${base}.zip`);
    execSync(`zip -r -q "${zip}" srs-navigator`, { cwd: stageRoot, stdio: "inherit" });
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

main();
