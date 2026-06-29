// Refresh the bundled methodology skill markdown files from the canonical
// skills/<slug>/SKILL.md in this monorepo. Pure and import-testable: all I/O
// (file reads and writes) is injected so the logic can be unit-tested offline.
//
// The SRS Navigator lives in the same repository as the methodology skills, so
// there is no cross-repo download: the bundled flat files are simply copies of
// the repo's canonical skills, regenerated at packaging time so a standalone
// install of the extension still carries the methodology with it.
//
// Canonical layout:  skills/<slug>/SKILL.md  (compiled, per-provider)
// Bundled layout:    skills/<slug>.md        (flat files shipped in this ext)

import { join } from "node:path";

// A skill body must look like a real SKILL.md (YAML front matter, optionally
// preceded by an HTML build comment) before we overwrite a bundled file, so a
// truncated or non-skill file never clobbers a good copy.
export function isValidSkillContent(text) {
  if (typeof text !== "string" || text.length < 50) return false;
  return /^\s*(<!--[\s\S]*?-->\s*)?---\s*\r?\n/.test(text);
}

// Map a bundled flat skill file (e.g. "business-context.md") to the path of its
// canonical source inside this monorepo: skills/<slug>/SKILL.md, relative to a
// given repo root.
export function buildLocalSkillSourcePath(fileName, repoRoot) {
  const slug = fileName.replace(/\.md$/i, "");
  return join(repoRoot, "skills", slug, "SKILL.md");
}

// Copy each canonical skills/<slug>/SKILL.md from this monorepo into skillsDir.
// Returns { updated, failed, source: "local" }. Never throws for a single
// file's failure — it is recorded in `failed` and the rest continue.
export async function syncSkillsLocal({
  files,
  skillsDir,
  repoRoot,
  readFileImpl,
  writeFileImpl,
}) {
  const updated = [];
  const failed = [];

  for (const file of files) {
    const sourcePath = buildLocalSkillSourcePath(file, repoRoot);
    try {
      const text = await readFileImpl(sourcePath, "utf-8");
      if (!isValidSkillContent(text)) {
        failed.push({ file, error: "Source file is not a valid skill document" });
        continue;
      }
      await writeFileImpl(join(skillsDir, file), text, "utf-8");
      updated.push(file);
    } catch (e) {
      failed.push({ file, error: e.message });
    }
  }

  return { updated, failed, source: "local" };
}

