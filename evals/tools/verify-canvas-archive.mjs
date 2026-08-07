#!/usr/bin/env node
// Structural reader for the canvas release archives. It reads the archive bytes users
// download, rather than a staged directory, and records hashes before extraction.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { ARCHIVE_ROOT } from "../../scripts/package-extension.mjs";
import { walkTree, relativeLinkTargets } from "../lib/distribution-artifacts.mjs";

const tempBase = process.env.RUNNER_TEMP || process.env.TEMP || os.tmpdir();

export function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function extractArchive(file, destination) {
  const lower = file.toLowerCase();
  if (!lower.endsWith(".zip") && !lower.endsWith(".tar.gz") && !lower.endsWith(".tgz")) {
    throw new Error("verify-canvas-archive: archive must be .zip or .tar.gz");
  }
  fs.mkdirSync(destination, { recursive: true });
  if (lower.endsWith(".zip")) {
    execFileSync("unzip", ["-q", file, "-d", destination], { stdio: "ignore" });
  } else {
    execFileSync("tar", ["-xf", file, "-C", destination], { stdio: "ignore" });
  }
  return destination;
}

function findRoot(dir) {
  const direct = path.join(dir, ARCHIVE_ROOT);
  if (fs.existsSync(path.join(direct, "extension.mjs"))) return direct;
  if (fs.existsSync(path.join(dir, "extension.mjs"))) return dir;
  throw new Error(`verify-canvas-archive: archive has no ${ARCHIVE_ROOT}/extension.mjs root`);
}

function check(checks, id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail });
  return Boolean(ok);
}

/** Resolve links in the flat shipped skill bundle without accepting missing targets. */
export function flatLinkClosure(root, files) {
  const broken = [];
  let links = 0;
  for (const rel of files.filter((f) => f.endsWith(".md"))) {
    const source = path.join(root, rel);
    for (const target of relativeLinkTargets(fs.readFileSync(source, "utf8"))) {
      links++;
      const direct = path.resolve(path.dirname(source), target);
      let resolved = direct;
      // Canonical sources use reference/foo.md; the standalone bundle ships foo.md beside
      // the orchestrator. This is a layout normalization, not permission to ignore a link.
      if (!fs.existsSync(resolved) && target.startsWith("reference/")) {
        resolved = path.resolve(path.dirname(source), path.basename(target));
      }
      const inside = !path.relative(root, resolved).startsWith("..");
      if (!inside) broken.push({ file: rel, target, reason: "escapes the tree" });
      else if (!fs.existsSync(resolved)) broken.push({ file: rel, target, reason: "no such file" });
    }
  }
  return { checked: files.filter((f) => f.endsWith(".md")).length, links, broken };
}

export async function verifyCanvasArchive(archiveFile, { keepExtracted = false } = {}) {
  const archive = path.resolve(archiveFile);
  if (!fs.existsSync(archive) || !fs.statSync(archive).isFile()) {
    throw new Error(`verify-canvas-archive: no such archive: ${archive}`);
  }
  const archiveSha256 = sha256(archive);
  const extracted = fs.mkdtempSync(path.join(tempBase, "pbsrs-canvas-"));
  try {
    extractArchive(archive, extracted);
    const root = findRoot(extracted);
    const files = walkTree(root);
    const checks = [];
    const record = {
      tool: "verify-canvas-archive",
      archive: { path: archive, sha256: archiveSha256, format: archive.toLowerCase().endsWith(".zip") ? "zip" : "tar.gz" },
      root,
      files,
      observed: { entries: files.length, files: files.length, bytes: files.reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0) },
      checks,
      ok: false,
    };
    const manifestFile = path.join(root, "package.json");
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
      check(checks, "manifest-parses", true, "package.json parsed");
    } catch (error) {
      check(checks, "manifest-parses", false, `package.json is not readable JSON: ${error.message}`);
      record.ok = false;
      return record;
    }
    record.manifest = { name: manifest.name ?? null, version: manifest.version ?? null, sha256: sha256(manifestFile) };
    check(checks, "archive-root-matches-packager", path.basename(root) === ARCHIVE_ROOT, `${path.basename(root)} vs ${ARCHIVE_ROOT}`);
    check(checks, "manifest-is-install-manifest", !manifest.devDependencies && !manifest.scripts && (!manifest.main || files.includes(manifest.main)), "no devDependencies/scripts and main resolves");
    const unwanted = files.filter((f) => /(^|\/)(node_modules|scripts|tests)\//.test(f) || /(^|\/)(package-lock\.json|playwright\.config\.mjs|\.sync-state\.json)$/.test(f));
    check(checks, "carries-no-development-artifacts", unwanted.length === 0, unwanted.length ? unwanted.join(", ") : "none");
    const link = flatLinkClosure(root, files);
    record.links = link;
    check(checks, "relative-links-resolve", link.broken.length === 0, link.broken.length ? link.broken.map((b) => `${b.file} -> ${b.target} (${b.reason})`).join("; ") : `${link.links} links resolve`);

    let runtime;
    try {
      const { installHostStub } = await import("./open-archive-canvas.mjs");
      installHostStub(root);
      const entry = pathToFileURL(path.join(root, "extension.mjs")).href;
      const module = await import(`${entry}?verifyCanvasArchive=${Date.now()}`);
      runtime = module.ACTIONS;
      check(checks, "extension-loads", Array.isArray(runtime) && runtime.length > 0, "extension loaded and exported ACTIONS");
      const sessions = globalThis.__srsArchiveHostSessions ?? [];
      check(checks, "canvas-registers", sessions.at(-1)?.canvases?.some((c) => c.id === "srs-navigator"), "srs-navigator canvas registered");
    } catch (error) {
      check(checks, "extension-loads", false, error.message);
    }
    const actions = Array.isArray(runtime) ? runtime.map((a) => a.file) : [];
    const shippedSkills = new Set(files.filter((f) => f.startsWith("skills/") && f.endsWith(".md")).map((f) => path.basename(f)));
    const missing = actions.filter((f) => !shippedSkills.has(f));
    check(checks, "runtime-dispatch-resolves", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${actions.length} runtime actions resolve`);
    record.observed.actionCount = actions.length;
    record.extensionSha256 = sha256(path.join(root, "extension.mjs"));
    record.ok = checks.every((c) => c.ok);
    return record;
  } finally {
    if (!keepExtracted) fs.rmSync(extracted, { recursive: true, force: true });
  }
}

export function formatReport(record) {
  return [
    `canvas archive: ${record.archive.path}`,
    `archive sha256: ${record.archive.sha256}`,
    ...record.checks.map((c) => `  ${c.ok ? "PASS" : "FAIL"} ${c.id}: ${c.detail}`),
    `RESULT: ${record.ok ? "every gate passed" : "at least one gate failed"}`,
  ].join("\n");
}

export function parseArgs(argv) {
  const out = { archive: null, json: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") out.json = argv[++i];
    else if (argv[i].startsWith("-")) throw new Error(`verify-canvas-archive: unknown option ${argv[i]}`);
    else if (!out.archive) out.archive = argv[i];
    else throw new Error("verify-canvas-archive: unexpected argument");
  }
  return out;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.archive) {
    console.error("Usage: node evals/tools/verify-canvas-archive.mjs <archive.zip|archive.tar.gz> [--json file]");
    process.exit(1);
  }
  verifyCanvasArchive(opts.archive).then((record) => {
    console.error(formatReport(record));
    if (opts.json) fs.writeFileSync(opts.json, `${JSON.stringify(record, null, 2)}\n`);
    process.exit(record.ok ? 0 : 1);
  }).catch((error) => { console.error(error.message); process.exit(1); });
}
