// Reading a **shipped** distribution tree — an extracted release archive or an installed
// skill directory — rather than the checkout it was built from.
//
// Why this is a library and not another test helper. Three separate places had grown their
// own half of this: `plugin-archive-install.test.mjs` resolves links and parses the
// dispatch table against a staged tree, `skills-install.test.mjs` does the same against
// what `npx skills add` copies, and the evidence plan on #92 asked a human to eyeball
// `grep -rn 'agents/skills/'`. The reviews on #104 and #107 said the same thing twice:
//
//   #104 — "`grep agents/skills/` checks one known defect, not link closure. Run the
//           existing full relative-link validator against the downloaded zip."
//   #107 — "Derive the complete file set from the installed/archive tree and validate
//           dispatch closure separately … Replace the single-string grep with complete
//           relative-link closure."
//
// Both are asking for the checks that already exist to be *runnable against an artefact*,
// not restated a third time. So the checks live here, the suites import them, and
// `evals/tools/verify-plugin-archive.mjs` points them at a downloaded archive.
//
// Everything is derived from the tree under test. Nothing in this file may hard-code a
// count: a snapshot presented as a threshold turns a correct product red on its next
// routine addition, which is how an acceptance criterion quietly becomes a formality.

import fs from "node:fs";
import path from "node:path";

/* ------------------------------------------------------ distribution artifact families */

/**
 * The three artefact families this project distributes, and the README install methods
 * that consume each one.
 *
 * The reviews on #92 and #107 both objected to "three install routes": the README
 * documents six *methods*, so a pack claiming to cover "all three" is either wrong or
 * using a word it never defined. It is three **artefact families** — three distinct byte
 * streams a user can receive — and the methods are equivalent within a family because they
 * differ only in who does the copying. That equivalence is the claim, so it is written
 * down here and asserted against the README rather than left implied.
 *
 * @type {ReadonlyArray<{id:string, label:string, artifact:string, methods:string[], readmeHeadings:string[]}>}
 */
export const ARTIFACT_FAMILIES = Object.freeze([
  Object.freeze({
    id: "repository-clone",
    label: "Repository clone",
    artifact: "the repository tree at a ref",
    methods: Object.freeze([
      "AI-assisted (the agent copies skills/ out of a clone)",
      "Claude Code plugin (the marketplace clones this repository)",
      "AgentSkills CLI (`npx skills add` clones, then copies)",
      "Manual (`git clone` then `cp -r`)",
    ]),
    readmeHeadings: Object.freeze([
      "### AI-assisted (recommended)",
      "### Claude Code plugin",
      "### AgentSkills CLI",
      "### Manual",
    ]),
  }),
  Object.freeze({
    id: "plugin-archive",
    label: "Plugin release archive",
    artifact: "problem-based-srs-v<version>.zip",
    methods: Object.freeze(["Plugin release archive (download, extract, --plugin-dir)"]),
    readmeHeadings: Object.freeze(["### Plugin release archive"]),
  }),
  Object.freeze({
    id: "canvas-archive",
    label: "Canvas release archive",
    artifact: "srs-navigator-<version>.zip / .tar.gz",
    methods: Object.freeze(["SRS Navigator canvas app (download, extract, /live)"]),
    readmeHeadings: Object.freeze(["### SRS Navigator canvas app"]),
  }),
]);

/** Every README install heading the families claim to account for. */
export function coveredReadmeHeadings() {
  return ARTIFACT_FAMILIES.flatMap((f) => [...f.readmeHeadings]).sort();
}

/**
 * The `###` headings inside the README's `## Installation` section — the install methods
 * the README actually documents, read from it rather than listed here.
 * @param {string} readme
 * @returns {string[]}
 */
export function readmeInstallHeadings(readme) {
  const text = String(readme ?? "");
  const from = text.indexOf("## Installation");
  if (from === -1) return [];
  const rest = text.slice(from + "## Installation".length);
  const end = rest.search(/^## /m);
  const section = end === -1 ? rest : rest.slice(0, end);
  return [...section.matchAll(/^### .*$/gm)].map((m) => m[0].trim()).sort();
}

/* ---------------------------------------------------------------------------- the tree */

/**
 * Every file under `dir`, as forward-slash paths relative to it. Sorted, so two trees
 * compare without the caller sorting first.
 * @param {string} dir
 * @param {string} [base]
 * @returns {string[]}
 */
export function walkTree(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory()
        ? walkTree(full, base)
        : [path.relative(base, full).replaceAll("\\", "/")];
    })
    .sort();
}

/* --------------------------------------------------------------------- link resolution */

/**
 * Markdown link targets that point at another file: not a URL, not a bare anchor, not a
 * mail link. A trailing `#fragment` is dropped — a link to a heading in a real file is
 * still a link to that file.
 * @param {string} md
 * @returns {string[]}
 */
export function relativeLinkTargets(md) {
  return [...String(md ?? "").matchAll(/\[[^\]]*\]\(\s*([^)\s]+)/g)]
    .map((m) => m[1])
    .filter((t) => !/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(t))
    .map((t) => t.split("#")[0])
    .filter(Boolean);
}

/**
 * Resolve every relative markdown link in a shipped tree against that tree.
 *
 * Two ways to fail, reported the same way because they have the same consequence for a
 * reader: the target is missing, or it resolves *outside* the tree. The second is the one
 * `grep 'agents/skills/'` was standing in for — `../skills/…` from `agents/problem-based-srs/`
 * lands in `agents/skills/`, a directory that exists in neither the repository nor the
 * archive. Resolving against the checkout does not ask that question, which is why the
 * defect shipped.
 *
 * @param {string} root
 * @param {{files?: string[]}} [options]
 * @returns {{checked:number, links:number, broken:Array<{file:string,target:string,reason:string}>}}
 */
export function linkClosure(root, options = {}) {
  const files = (options.files ?? walkTree(root)).filter((f) => f.endsWith(".md"));
  const broken = [];
  let links = 0;

  for (const rel of files) {
    const abs = path.join(root, rel);
    const dir = path.dirname(abs);
    for (const target of relativeLinkTargets(fs.readFileSync(abs, "utf8"))) {
      links++;
      const resolved = path.resolve(dir, target);
      const inside = !path.relative(root, resolved).startsWith("..");
      if (!inside) broken.push({ file: rel, target, reason: "escapes the tree" });
      else if (!fs.existsSync(resolved)) broken.push({ file: rel, target, reason: "no such file" });
    }
  }

  return { checked: files.length, links, broken };
}

/* --------------------------------------------------------------------- the skill tree */

/**
 * The actions `SKILL.md` dispatches, taken from the table that maps each action to its
 * `reference/<action>.md`. The orchestrator's contract, parsed at runtime.
 * @param {string} skillMd
 * @returns {string[]}
 */
export function dispatchActions(skillMd) {
  return [
    ...String(skillMd ?? "").matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*\[`reference\/([a-z-]+)\.md`\]/gm),
  ]
    .filter((m) => m[1] === m[2])
    .map((m) => m[1]);
}

/**
 * Describe an installed skill directory (one holding `SKILL.md` and `reference/`) from the
 * tree itself.
 *
 * The complete file set is *not* the dispatch table. #107's review caught the plan
 * deriving "12 files" from a nine-row table: the installed tree also carries `SKILL.md`
 * and the `*-example.md` walkthroughs, which no action dispatches. Two different
 * questions, so two different answers — `files` records what shipped, `actions` gates
 * whether the orchestrator resolves.
 *
 * @param {string} skillDir absolute path to the skill directory
 * @returns {{dir:string, files:string[], skillMd:string|null, referenceFiles:string[], exampleFiles:string[], actionFiles:string[]}}
 */
export function readInstalledSkill(skillDir) {
  const files = fs.existsSync(skillDir) ? walkTree(skillDir) : [];
  const skillMdPath = path.join(skillDir, "SKILL.md");
  const reference = files.filter((f) => f.startsWith("reference/") && f.endsWith(".md"));
  return {
    dir: skillDir,
    files,
    skillMd: fs.existsSync(skillMdPath) ? fs.readFileSync(skillMdPath, "utf8") : null,
    referenceFiles: reference,
    exampleFiles: reference.filter((f) => f.endsWith("-example.md")),
    actionFiles: reference.filter((f) => !f.endsWith("-example.md")),
  };
}

/**
 * Does every action the orchestrator dispatches resolve to a file that is actually in the
 * tree, and does every non-example reference file have an action pointing at it?
 *
 * Closure both ways on purpose. "Every action resolves" alone passes a tree that ships a
 * reference file nothing can reach; "every file is dispatched" alone passes a table that
 * lost a row. The row it loses first is `live` — the only one with prose after the link.
 *
 * @param {ReturnType<typeof readInstalledSkill>} skill
 * @returns {{actions:string[], shipped:string[], unresolved:string[], undispatched:string[], ok:boolean}}
 */
export function dispatchClosure(skill) {
  const actions = dispatchActions(skill.skillMd ?? "");
  const shipped = skill.actionFiles.map((f) => path.basename(f, ".md")).sort();
  const shippedSet = new Set(shipped);
  const actionSet = new Set(actions);
  return {
    actions: [...actions].sort(),
    shipped,
    unresolved: [...actions].filter((a) => !shippedSet.has(a)).sort(),
    undispatched: shipped.filter((a) => !actionSet.has(a)),
    ok:
      actions.length > 0 &&
      shipped.length > 0 &&
      actions.every((a) => shippedSet.has(a)) &&
      shipped.every((a) => actionSet.has(a)),
  };
}
