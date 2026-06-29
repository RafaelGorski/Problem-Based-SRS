// Sync the bundled methodology skill markdown files from the upstream
// Problem-Based-SRS repository. Pure and import-testable: all I/O (network
// fetch and file writes) is injected so the logic can be unit-tested offline.
//
// Upstream layout:  skills/<slug>/SKILL.md  (compiled, per-provider)
// Local layout:     skills/<slug>.md        (flat files bundled in this ext)

import { join } from "node:path";

export const SKILL_SOURCE = {
  owner: "RafaelGorski",
  repo: "Problem-Based-SRS",
  ref: "main",
};

// Map a local flat skill file (e.g. "business-context.md") to the path of its
// canonical source inside this monorepo: skills/<slug>/SKILL.md, relative to a
// given repo root.
export function buildLocalSkillSourcePath(fileName, repoRoot) {
  const slug = fileName.replace(/\.md$/i, "");
  return join(repoRoot, "skills", slug, "SKILL.md");
}

// Copy each skill file from the canonical skills/<slug>/SKILL.md in this
// monorepo into skillsDir. Pure and import-testable: all I/O is injected.
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

// Map a local flat skill file (e.g. "business-context.md") to the raw URL of
// its compiled source in the upstream repo (skills/business-context/SKILL.md).
export function buildSkillSourceUrl(fileName, source = SKILL_SOURCE) {
  const slug = fileName.replace(/\.md$/i, "");
  const { owner, repo, ref } = source;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/skills/${slug}/SKILL.md`;
}

// A fetched body must look like a real SKILL.md (YAML front matter, optionally
// preceded by an HTML build comment) before we overwrite a local file, so a
// 404 page or empty response never clobbers a good skill.
export function isValidSkillContent(text) {
  if (typeof text !== "string" || text.length < 50) return false;
  return /^\s*(<!--[\s\S]*?-->\s*)?---\s*\r?\n/.test(text);
}

// Fetch each skill file from the upstream repo and write valid content into
// skillsDir. Returns { updated, failed, ref }. Never throws for a single
// file's failure — it is recorded in `failed` and the rest continue.
export async function syncSkills({
  files,
  skillsDir,
  source = SKILL_SOURCE,
  fetchImpl = fetch,
  writeFileImpl,
}) {
  const updated = [];
  const failed = [];

  for (const file of files) {
    const url = buildSkillSourceUrl(file, source);
    try {
      const res = await fetchImpl(url);
      if (!res.ok) {
        failed.push({ file, error: `HTTP ${res.status}` });
        continue;
      }
      const text = await res.text();
      if (!isValidSkillContent(text)) {
        failed.push({ file, error: "Fetched content is not a valid skill document" });
        continue;
      }
      await writeFileImpl(join(skillsDir, file), text, "utf-8");
      updated.push(file);
    } catch (e) {
      failed.push({ file, error: e.message });
    }
  }

  return { updated, failed, ref: source.ref };
}
