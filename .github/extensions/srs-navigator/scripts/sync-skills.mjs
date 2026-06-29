#!/usr/bin/env node
// Runnable wrapper around lib/skill-sync.mjs. Refreshes the bundled methodology
// skill markdown files that the canvas extension ships with.
//
// In this monorepo the canonical skills live at skills/<slug>/SKILL.md, three
// levels up from this extension. By default we copy them straight from disk so
// the canvas app always bundles the exact skills maintained in this repo. When
// run against an external checkout (or with --remote), it falls back to fetching
// the skills from the upstream Problem-Based-SRS repository over the network.
//
// Usage:
//   node scripts/sync-skills.mjs            # local copy from this repo's skills/
//   node scripts/sync-skills.mjs --remote   # force download from upstream repo
//   node scripts/sync-skills.mjs --ref dev  # download from a non-default ref
//
// Exit code is 0 when every skill synced, 1 when one or more skills failed so
// CI can surface (but a release workflow may choose to treat it as non-fatal).

import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { syncSkills, syncSkillsLocal, SKILL_SOURCE, buildLocalSkillSourcePath } from "../lib/skill-sync.mjs";

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

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ref") out.ref = argv[++i];
    if (argv[i] === "--owner") out.owner = argv[++i];
    if (argv[i] === "--repo") out.repo = argv[++i];
    if (argv[i] === "--remote") out.remote = true;
    if (argv[i] === "--local") out.local = true;
  }
  return out;
}

// Use the local monorepo source when it is available and the caller has not
// explicitly requested a remote sync.
function shouldUseLocal(args) {
  if (args.remote) return false;
  if (args.local) return true;
  return existsSync(buildLocalSkillSourcePath(FILES[0], repoRoot));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let result;
  if (shouldUseLocal(args)) {
    console.log(`Syncing ${FILES.length} skills from local monorepo (${repoRoot}) ...`);
    result = await syncSkillsLocal({
      files: FILES,
      skillsDir,
      repoRoot,
      readFileImpl: readFile,
      writeFileImpl: writeFile,
    });
  } else {
    const source = { ...SKILL_SOURCE, ...args };
    console.log(`Syncing ${FILES.length} skills from ${source.owner}/${source.repo}@${source.ref} ...`);
    result = await syncSkills({
      files: FILES,
      skillsDir,
      source,
      writeFileImpl: writeFile,
    });
  }

  for (const file of result.updated) console.log(`  updated  ${file}`);
  for (const { file, error } of result.failed) console.error(`  FAILED   ${file}: ${error}`);

  const where = result.source === "local" ? "local" : `ref ${result.ref}`;
  console.log(
    `Done: ${result.updated.length} updated, ${result.failed.length} failed (${where}).`
  );

  process.exit(result.failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("sync-skills crashed:", err);
  process.exit(1);
});
