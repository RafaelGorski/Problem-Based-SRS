#!/usr/bin/env node
// Refresh the bundled methodology skill markdown files that the canvas extension
// ships with. The SRS Navigator lives in the Problem-Based-SRS monorepo, so the
// canonical skills are right here at skills/<slug>/SKILL.md (four levels up from
// this script). This copies them into the extension's bundled skills/ directory
// so a standalone/packaged install still carries the methodology.
//
// At runtime the extension reads the canonical skills directly; this bundle is
// only needed when the extension is installed on its own outside the monorepo.
//
// Usage:
//   node scripts/sync-skills.mjs            # copy from this repo's skills/
//
// Exit code is 0 when every skill synced, 1 when one or more skills failed.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { syncSkillsLocal } from "../lib/skill-sync.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(__dirname, "..", "skills");
// Extension lives at <repoRoot>/.github/extensions/srs-navigator/scripts, so the
// monorepo root is four levels up from this script.
const repoRoot = resolve(__dirname, "..", "..", "..", "..");

// The canonical list of bundled skill files (kept in sync with extension.mjs).
const FILES = [
  "business-context.md",
  "customer-problems.md",
  "software-glance.md",
  "customer-needs.md",
  "software-vision.md",
  "functional-requirements.md",
  "complexity-analysis.md",
  "problem-based-srs.md",
  "zigzag-validator.md",
];

async function main() {
  console.log(`Refreshing ${FILES.length} bundled skills from ${repoRoot} ...`);

  const result = await syncSkillsLocal({
    files: FILES,
    skillsDir,
    repoRoot,
    readFileImpl: readFile,
    writeFileImpl: writeFile,
  });

  for (const file of result.updated) console.log(`  updated  ${file}`);
  for (const { file, error } of result.failed) console.error(`  FAILED   ${file}: ${error}`);

  console.log(`Done: ${result.updated.length} updated, ${result.failed.length} failed.`);

  process.exit(result.failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("sync-skills crashed:", err);
  process.exit(1);
});
