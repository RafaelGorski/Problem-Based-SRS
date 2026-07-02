// Loading and structural parsing of the canonical methodology skill at
// skills/problem-based-srs/ (SKILL.md orchestrator + reference/<action>.md).
// Pure/functional helpers so they can be unit-tested with in-memory strings,
// plus filesystem loaders that accept injectable impls.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Parse YAML-ish front matter delimited by `---` fences, tolerating a leading
 * HTML comment (the sync banner) and a BOM. Only top-level `key: value` pairs
 * are captured; nested/indented lines are ignored.
 * @param {string} text
 * @returns {{frontmatter: Record<string,string>, body: string}}
 */
export function parseFrontmatter(text) {
  const s = String(text ?? "").replace(/^\uFEFF/, "");
  const m = s.match(/^(?:<!--[\s\S]*?-->\s*)?---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!m) return { frontmatter: {}, body: s };

  const frontmatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):[ \t]*(.*)$/);
    if (kv) frontmatter[kv[1]] = kv[2].trim();
  }
  const body = s.slice(m[0].length).replace(/^(?:[ \t]*\r?\n)+/, "");
  return { frontmatter, body };
}

/**
 * Split a markdown body into flat heading sections.
 * @param {string} body
 * @returns {Array<{level:number, title:string, body:string}>}
 */
export function extractSections(body) {
  const sections = [];
  let current = null;
  for (const line of String(body ?? "").split(/\r?\n/)) {
    const h = line.match(/^(#{1,6})[ \t]+(.*)$/);
    if (h) {
      if (current) sections.push(current);
      current = { level: h[1].length, title: h[2].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

function titleMatches(title, pattern) {
  if (pattern instanceof RegExp) return pattern.test(title);
  return String(title).toLowerCase().includes(String(pattern).toLowerCase());
}

/**
 * True when the body contains a heading whose title matches `pattern`
 * (substring, case-insensitive) or a RegExp.
 * @param {string} body
 * @param {string|RegExp} pattern
 * @returns {boolean}
 */
export function hasSection(body, pattern) {
  return extractSections(body).some((s) => titleMatches(s.title, pattern));
}

/**
 * Count the non-empty lines of markdown body (front matter excluded by the
 * caller). Used to enforce the AgentSkills "< 500 lines" guidance.
 * @param {string} text
 * @returns {number}
 */
export function countLines(text) {
  const s = String(text ?? "");
  if (s === "") return 0;
  return s.split(/\r?\n/).length;
}

/**
 * Parse SKILL.md text into a structured object.
 * @param {string} text
 */
export function parseSkill(text) {
  const { frontmatter, body } = parseFrontmatter(text);
  return { frontmatter, body, sections: extractSections(body) };
}

/**
 * Extract relative markdown link targets: `[label](path)` where path is not an
 * absolute URL or anchor. Returns { target, line } records.
 * @param {string} text
 * @returns {Array<{target:string}>}
 */
export function extractRelativeLinks(text) {
  const links = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(String(text ?? ""))) !== null) {
    const target = m[1].trim();
    if (/^[a-z]+:\/\//i.test(target)) continue; // http(s):// mailto: etc.
    if (target.startsWith("#")) continue; // in-page anchor
    links.push({ target: target.split("#")[0] });
  }
  return links;
}

/** Absolute path to the repo's canonical skills/ directory. */
export function defaultSkillsRoot(metaUrl = import.meta.url) {
  const here = path.dirname(fileURLToPath(metaUrl));
  return path.resolve(here, "..", "..", "skills");
}

/**
 * List skill slugs (subdirectory names) under a skills root.
 * @param {string} skillsRoot
 * @param {{readdirImpl?:Function}} [opts]
 * @returns {Promise<string[]>}
 */
export async function listSkillSlugs(skillsRoot, opts = {}) {
  const { readdirImpl = readdir } = opts;
  const entries = await readdirImpl(skillsRoot, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

/**
 * Load and parse a single skill.
 * @param {string} slug
 * @param {{skillsRoot?:string, readFileImpl?:Function}} [opts]
 */
export async function loadSkill(slug, opts = {}) {
  const { skillsRoot = defaultSkillsRoot(), readFileImpl = readFile } = opts;
  const file = path.join(skillsRoot, slug, "SKILL.md");
  const text = await readFileImpl(file, "utf8");
  return { slug, file, text, ...parseSkill(text) };
}

/**
 * Load and parse every skill under the skills root.
 * @param {{skillsRoot?:string, readFileImpl?:Function, readdirImpl?:Function}} [opts]
 */
export async function loadAllSkills(opts = {}) {
  const { skillsRoot = defaultSkillsRoot() } = opts;
  const slugs = await listSkillSlugs(skillsRoot, opts);
  return Promise.all(slugs.map((slug) => loadSkill(slug, { skillsRoot, ...opts })));
}

// ---------------------------------------------------------------------------
// Consolidated single-skill layout (impeccable-style).
//
// The methodology is now ONE skill — skills/problem-based-srs/ — whose SKILL.md
// is the /problem-based-srs orchestrator and whose reference/<action>.md files
// hold the per-action instructions (filename == action). These helpers load that
// layout for the static evals.
// ---------------------------------------------------------------------------

/** Slug of the single consolidated methodology skill. */
export const MAIN_SKILL_SLUG = "problem-based-srs";

/** Absolute path to the single consolidated skill directory. */
export function mainSkillDir(skillsRoot = defaultSkillsRoot()) {
  return path.join(skillsRoot, MAIN_SKILL_SLUG);
}

/** Absolute path to the reference/ directory holding per-action files. */
export function referenceDir(skillsRoot = defaultSkillsRoot()) {
  return path.join(mainSkillDir(skillsRoot), "reference");
}

/**
 * Load and parse the main SKILL.md (the /problem-based-srs orchestrator).
 * @param {{skillsRoot?:string, readFileImpl?:Function}} [opts]
 */
export async function loadMainSkill(opts = {}) {
  const { skillsRoot = defaultSkillsRoot(), readFileImpl = readFile } = opts;
  const file = path.join(mainSkillDir(skillsRoot), "SKILL.md");
  const text = await readFileImpl(file, "utf8");
  return { slug: MAIN_SKILL_SLUG, file, text, ...parseSkill(text) };
}

/**
 * List per-action reference file names (without extension), sorted. Excludes
 * example walkthroughs (`*-example.md`), which are supporting docs, not actions.
 * @param {{skillsRoot?:string, readdirImpl?:Function}} [opts]
 * @returns {Promise<string[]>}
 */
export async function listActions(opts = {}) {
  const { skillsRoot = defaultSkillsRoot(), readdirImpl = readdir } = opts;
  const entries = await readdirImpl(referenceDir(skillsRoot), { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.endsWith("-example.md"))
    .map((e) => e.name.replace(/\.md$/, ""))
    .sort();
}

/**
 * Load and parse a single action reference file (reference/<action>.md).
 * @param {string} action
 * @param {{skillsRoot?:string, readFileImpl?:Function}} [opts]
 */
export async function loadAction(action, opts = {}) {
  const { skillsRoot = defaultSkillsRoot(), readFileImpl = readFile } = opts;
  const file = path.join(referenceDir(skillsRoot), `${action}.md`);
  const text = await readFileImpl(file, "utf8");
  return { action, file, text, ...parseSkill(text) };
}

/**
 * Load the whole consolidated skill: the main SKILL.md plus every action file.
 * @param {{skillsRoot?:string, readFileImpl?:Function, readdirImpl?:Function}} [opts]
 * @returns {Promise<{main:object, actions:object[]}>}
 */
export async function loadConsolidatedSkill(opts = {}) {
  const { skillsRoot = defaultSkillsRoot() } = opts;
  const main = await loadMainSkill({ skillsRoot, ...opts });
  const actionNames = await listActions({ skillsRoot, ...opts });
  const actions = await Promise.all(
    actionNames.map((a) => loadAction(a, { skillsRoot, ...opts })),
  );
  return { main, actions };
}
