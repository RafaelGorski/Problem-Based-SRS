// The accuracy of the *reason* the stranded-release machinery gives, not its behaviour.
//
// `release-hygiene.test.mjs` and `distribution-drift.test.mjs` already prove the detector
// fires on the right links. This file guards the sentence it fires *with*, because the
// first version of that sentence was false and this repository's own history falsifies it:
//
//   * `git show 69dfe88:.claude-plugin/plugin.json` reads 2.5.0, and that tree ships the
//     skill, so `validate --expected-version 2.5` passes on it;
//   * `create-release.yml` checks out with no `ref:`, so a dispatch pinned to a tag builds
//     *the tagged commit*, not `main`.
//
// `git tag v2.5 <that commit> && git push` therefore publishes v2.5. "The tag can never be
// created" and "a permanent 404" were overstatements, and a monitor that overstates its case
// is one a maintainer learns to discount — the failure mode the whole checker exists to
// avoid. The true constraint is narrower and still decides the same action: `main` cannot
// publish that version by the documented workflow, and a release cut from the older commit
// would carry a tree and notes that predate what the section documents now. Folding into the
// manifest version stays the right call; only the justification has to survive scrutiny.
//
// Scope, stated honestly: the wording scan matches known overstatements, so it catches a
// reversion to the sentences that shipped, not every possible new one. What it makes
// impossible is quietly restoring the claim after it was corrected.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  advertisedTagLinks,
  compareVersions,
  normalizeVersion,
  pluginReleaseTag,
  summarize,
} from "../../scripts/check-distribution.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const MANIFEST_PATH = ".claude-plugin/plugin.json";
const manifest = JSON.parse(read(MANIFEST_PATH));

/**
 * Every file that ships the claim to a human: the checker that prints it, the runbook that
 * explains it, the changelog that records it, and the two suites whose failure messages
 * repeat it. A correction that lands in one and not the others is the drift this catches.
 *
 * This file is deliberately not among them — a guard has to be able to name the sentences it
 * forbids. Which also means quoting them anywhere else would evade the scan; that is a
 * knowing act, not the silent reversion this exists to stop.
 */
const SURFACES = [
  "scripts/check-distribution.mjs",
  ".github/copilot-instructions.md",
  "CHANGELOG.md",
  "evals/tests/release-hygiene.test.mjs",
  "evals/tests/distribution-drift.test.mjs",
];

/**
 * The overstatements that shipped, as patterns rather than lines.
 *
 * Matched against whitespace-normalized text because every one of them was line-wrapped in
 * source: "names a tag that will never\n * exist" is the same claim as the one-line form and
 * a per-line scan misses it. Past-tense statements of fact ("the tag was never pushed", "the
 * workflow never ran") carry no modal and stay out of range on purpose — they are true.
 */
export const OVERCLAIMS = [
  {
    id: "modal-never",
    pattern: /\b(?:can|could|will|would|shall)\s+never\b/i,
    why: "the tag is creatable from the commit whose manifest carried that version",
  },
  {
    id: "never-be-created",
    pattern: /\bnever\s+be\s+(?:created|published|cut|resolved)\b/i,
    why: "same claim without the modal",
  },
  {
    id: "ever-be-created",
    pattern: /\b(?:can|could|will|would)(?:not)?\s+ever\s+(?:be\s+)?(?:created?|exist)/i,
    why: "'no v2.5 can ever be created' is the same overstatement inverted",
  },
  {
    id: "no-pipeline-ever",
    pattern: /\bno\s+pipeline\s+(?:can|could|will|would)\b/i,
    why: "create-release.yml builds the tagged commit, so a pipeline can create it",
  },
  {
    id: "permanent-404",
    pattern: /\bpermanent(?:ly)?\s+404\b/i,
    why: "the link resolves the moment the older commit is tagged; it is unreachable from main, not permanent",
  },
  {
    id: "never-resolves",
    pattern: /\bcannot\s+resolve,\s*ever\b|\bcould\s+never\s+resolve\b/i,
    why: "same overstatement about the link rather than the tag",
  },
  {
    id: "notes-never-published",
    pattern: /\bnotes\s+are\s+never\s+published\b|\bno\s+release\s+would\s+ever\s+carry\b/i,
    why: "the notes are unpublishable from main, not unpublishable",
  },
  {
    id: "no-action-clears-it",
    pattern: /\bno\s+maintainer\s+action\s+could\s+clear\b/i,
    why: "tagging the older commit is a maintainer action that clears it",
  },
];

/** Collapse source wrapping so a claim split across lines is still one claim. */
export const flatten = (text) => String(text).replace(/\s+/g, " ");

/**
 * What makes a block part of *this* claim.
 *
 * Whole-file scanning was the first attempt and it policed sentences that have nothing to do
 * with releases — "the app and the skill can never state contradictory rules about waiving
 * the interview", in a released changelog section, is true and is not this subject. A guard
 * that rewrites unrelated history is one that gets turned off.
 */
const SUBJECT =
  /stranded|v?2\.5(?:\.\d+)?\b|fold(?:ed|ing)?\s+(?:the|each|it)\b|manifest has already (?:moved )?passed/i;

/**
 * Prose split into the units a claim is actually made in: paragraphs, list items, table rows.
 * Contiguous code and a JSDoc block each stay whole, which is what puts a finding's
 * `detail` array and the doc comment above it in range as single claims.
 */
export function blocks(text) {
  return String(text)
    .split(/\n\s*\n/)
    .flatMap((para) => para.split(/\n(?=\s*(?:[-*]\s|\|))/))
    .map((b) => b.trim())
    .filter(Boolean);
}

/** The blocks of a surface that talk about a stranded release. */
export function claimBlocks(text) {
  return blocks(text).filter((b) => SUBJECT.test(b));
}

/** Which overstatements a piece of text makes, with the offending excerpt. */
export function overclaims(text) {
  const flat = flatten(text);
  return OVERCLAIMS.filter((o) => o.pattern.test(flat)).map((o) => ({
    id: o.id,
    why: o.why,
    excerpt: flat.slice(
      Math.max(0, flat.search(o.pattern) - 90),
      flat.search(o.pattern) + 110,
    ),
  }));
}

/** Every overstatement a surface makes *about this subject*. */
export function surfaceOverclaims(file) {
  return claimBlocks(read(file)).flatMap((block) =>
    overclaims(block).map((o) => `${file}: [${o.id}] …${o.excerpt}… — ${o.why}`),
  );
}

/**
 * What the corrected claim has to say wherever it is stated in full: where it cannot be
 * published from, and why tagging the old commit is not the answer either. Dropping the
 * second half would leave "cut it from somewhere else" as the obvious next thought.
 */
export const REQUIRED_CLAIMS = [
  {
    id: "unreachable-from-main",
    pattern: /no longer publishable from `?main`?|not publishable from `?main`?/i,
    why: "name the tree that cannot publish it, rather than declaring it impossible",
  },
  {
    id: "older-commit-builds",
    pattern: /older commit|historical commit|the commit that (?:still )?(?:read|carried)/i,
    why: "acknowledge the tree that can still build it",
  },
  {
    id: "but-would-mislead",
    pattern: /predate|no longer match|not (?:the )?(?:tree|notes) the section/i,
    why: "say why tagging that commit is still the wrong move",
  },
];

/** The requirements a piece of text fails to state. */
export function missingClaims(text) {
  const flat = flatten(text);
  return REQUIRED_CLAIMS.filter((c) => !c.pattern.test(flat));
}

function git(args) {
  const res = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return res.status === 0 ? res.stdout : null;
}

/** Every version `.claude-plugin/plugin.json` has ever carried, mapped to its commits. */
export function manifestVersionHistory() {
  const log = git(["log", "--format=%H", "--", MANIFEST_PATH]);
  if (log === null) return null;
  const byVersion = new Map();
  for (const sha of log.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
    const blob = git(["show", `${sha}:${MANIFEST_PATH}`]);
    if (!blob) continue;
    let version = null;
    try {
      version = normalizeVersion(JSON.parse(blob).version);
    } catch {
      continue;
    }
    if (!version) continue;
    if (!byVersion.has(version)) byVersion.set(version, []);
    byVersion.get(version).push(sha);
  }
  return byVersion.size ? byVersion : null;
}

function publishedVersions() {
  const out = git(["tag", "--list"]);
  if (out === null) return null;
  const tags = out.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  if (!tags.length) return null;
  return new Set(tags.map(normalizeVersion).filter(Boolean));
}

/**
 * Versions this repository could once build and never tagged, below the current manifest —
 * the exact population the stranded finding talks about. Derived from history and tags so
 * it shrinks by itself the day one of them is tagged.
 */
export function strandedVersions() {
  const history = manifestVersionHistory();
  const tagged = publishedVersions();
  if (!history || !tagged) return null;
  const current = normalizeVersion(manifest.version);
  return [...history.keys()]
    .filter((v) => compareVersions(v, current) < 0 && !tagged.has(v))
    .sort(compareVersions);
}

const strandedLink = (version, tag) =>
  `[${version}]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/${tag}`;

/** The live finding, produced by the checker rather than quoted from it. */
function strandedFinding(version = "2.5.0") {
  const summary = summarize({
    listing: { skills: ["problem-based-srs"], declaredCount: 1, url: "" },
    repoSkills: ["problem-based-srs"],
    tagLinks: advertisedTagLinks([
      { file: "CHANGELOG.md", text: strandedLink(version, pluginReleaseTag(version)) },
    ]),
    publishedReleases: [],
    manifestVersion: manifest.version,
    canvasVersion: "1.1.0",
  });
  return summary.findings.find((f) => f.id === "stranded-release-link") ?? null;
}

/** The runbook row that explains the finding to whoever is holding the red run. */
export function runbookRow(id, doc = read(".github/copilot-instructions.md")) {
  return doc.split(/\r?\n/).find((l) => l.startsWith("|") && l.includes(`\`${id}\``)) ?? null;
}

describe("the stranded-release claim — the history that falsifies the strong form", () => {
  it("a version the manifest passed without a tag is still buildable from its own commit", (t) => {
    const stranded = strandedVersions();
    if (stranded === null) {
      t.skip("no git history or no tags in this checkout, so there is no evidence either way");
      return;
    }
    if (!stranded.length) {
      t.skip("history carries no stranded version — nothing for the claim to be about");
      return;
    }
    const history = manifestVersionHistory();
    for (const version of stranded) {
      const commits = history.get(version) ?? [];
      assert.ok(
        commits.length > 0,
        `${version} must come from a commit, or it was not read out of history`,
      );
      const sha = commits[0];
      // build-plugin.py's validate() compares normalize_version(manifest) against the
      // expected version and looks at nothing else, so this *is* the check the release
      // workflow runs — against that tree, which checkout@v4 restores for a tag push.
      const blob = JSON.parse(git(["show", `${sha}:${MANIFEST_PATH}`]));
      assert.equal(
        normalizeVersion(blob.version),
        version,
        `${sha.slice(0, 7)} must still carry ${version} for the tag to validate against it`,
      );
      const skills = git(["ls-tree", "--name-only", sha, "skills/problem-based-srs/SKILL.md"]);
      assert.match(
        String(skills),
        /SKILL\.md/,
        `${sha.slice(0, 7)} must ship the skill, or validate() would fail for a second reason`,
      );
    }
  });

  it("and build-plugin.py says so itself, when there is an interpreter to ask", (t) => {
    const stranded = strandedVersions();
    if (!stranded?.length) {
      t.skip("nothing stranded in this checkout");
      return;
    }
    const version = stranded[0];
    const sha = manifestVersionHistory().get(version)[0];
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stranded-build-"));
    try {
      const tar = path.join(tmp, "tree.tar");
      if (git(["archive", "--format=tar", "-o", tar, sha]) === null) {
        t.skip("git archive unavailable");
        return;
      }
      const dir = path.join(tmp, "tree");
      fs.mkdirSync(dir);
      if (spawnSync("tar", ["-xf", tar, "-C", dir], { encoding: "utf8" }).status !== 0) {
        t.skip("no tar to expand the exported tree");
        return;
      }
      for (const exe of ["python3", "python"]) {
        const res = spawnSync(
          exe,
          ["scripts/build-plugin.py", "validate", "--expected-version", version],
          { cwd: dir, encoding: "utf8" },
        );
        if (res.error) continue;
        assert.equal(
          res.status,
          0,
          `the release pipeline validates ${version} against ${sha.slice(0, 7)}, so the ` +
            `tag is publishable from that commit. Output: ${res.stdout}${res.stderr}`,
        );
        assert.match(res.stdout, /\[validate\] success/);
        return;
      }
      t.skip("no python interpreter available to run build-plugin.py");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("the stranded-release claim — what the surfaces are allowed to say", () => {
  it("no surface tells the maintainer the tag can never exist", () => {
    const offenders = SURFACES.flatMap(surfaceOverclaims);
    assert.deepEqual(
      offenders,
      [],
      "the strong form is false and the repository's own history disproves it; state the " +
        "narrower constraint instead:\n" +
        offenders.join("\n"),
    );
  });

  it("and each surface actually has blocks in range to scan", () => {
    // Subject scoping is what keeps the guard off unrelated prose; it is also the way it
    // could quietly come to scan nothing. If a surface stops talking about the subject, the
    // claim moved and this list is what needs updating.
    for (const file of SURFACES) {
      assert.ok(
        claimBlocks(read(file)).length > 0,
        `${file} carries no block about a stranded release, so scanning it proves nothing`,
      );
    }
  });

  it("the finding states the constraint that is true", () => {
    const finding = strandedFinding();
    assert.ok(finding, "the checker must still report a stranded link at all");
    const text = [finding.title, ...finding.detail].join(" ");
    assert.deepEqual(
      overclaims(text).map((o) => o.id),
      [],
      `the live finding still overstates: ${text}`,
    );
    assert.deepEqual(
      missingClaims(text).map((c) => `${c.id} — ${c.why}`),
      [],
      `the live finding is missing part of the accurate claim: ${text}`,
    );
    assert.ok(
      text.includes(manifest.version),
      "and must still name the version that will carry the folded notes",
    );
  });

  it("the runbook row says the same thing as the finding", () => {
    const row = runbookRow("stranded-release-link");
    assert.ok(row, "every finding id has a runbook row; the id-scan already requires it");
    assert.deepEqual(overclaims(row).map((o) => o.id), [], `the runbook row overstates: ${row}`);
    assert.deepEqual(
      missingClaims(row).map((c) => c.id),
      [],
      `the runbook is what a maintainer reads while the run is red: ${row}`,
    );
    assert.match(
      row,
      /fold/i,
      "and must still give the action that works, not only the diagnosis",
    );
  });

  it("folding was still right: the section outgrew the commit that could publish it", (t) => {
    const stranded = strandedVersions();
    if (!stranded?.length) {
      t.skip("nothing stranded in this checkout");
      return;
    }
    const version = stranded[0];
    const sha = manifestVersionHistory().get(version)[0];
    const historical = git(["show", `${sha}:CHANGELOG.md`]);
    if (!historical) {
      t.skip("that commit carries no changelog to compare against");
      return;
    }
    const current = read("CHANGELOG.md");
    const start = current.indexOf(`## [${manifest.version}]`);
    assert.ok(start >= 0, `CHANGELOG.md must carry a ## [${manifest.version}] section`);
    const rest = current.slice(start + 1);
    const end = rest.indexOf("\n## [");
    const section = end >= 0 ? rest.slice(0, end) : rest;
    const headlines = [...section.matchAll(/^-\s+\*\*(.+?)\*\*/gm)].map((m) => m[1].trim());
    assert.ok(headlines.length > 0, "the section must actually list entries");
    const laterThanThatTree = headlines.filter((h) => !historical.includes(h));
    assert.ok(
      laterThanThatTree.length > 0,
      `every entry now under ## [${manifest.version}] already existed at ${sha.slice(0, 7)}, ` +
        `so a release tagged there would have carried them and the fold would need a ` +
        `different justification than the one the surfaces give`,
    );
  });
});

describe("negative canaries", () => {
  it("restoring the shipped overstatements fails the scan", () => {
    // The exact sentences that were on this branch before the correction, put back into the
    // real tracked files at the place they lived. If the scan tolerates these, it would have
    // tolerated the defect.
    const reverted = [
      [
        "scripts/check-distribution.mjs",
        (t) =>
          t.replace(
            "export function strandedReleaseLinks",
            "// A changelog link for a version the manifest passed — v2.5 — names a tag\n" +
              "// that will never exist.\nexport function strandedReleaseLinks",
          ),
      ],
      [
        "CHANGELOG.md",
        (t) =>
          t.replace(
            "## [Unreleased]",
            "## [Unreleased]\n\n- The stranded `v2.5` can never be created: a permanent 404.",
          ),
      ],
      [
        ".github/copilot-instructions.md",
        (t) =>
          t.replace(
            "**Decision — no second registry",
            "**Stranded links.** No pipeline can create `v2.5`.\n\n**Decision — no second registry",
          ),
      ],
    ];
    for (const [file, mutate] of reverted) {
      const original = read(file);
      const mutated = mutate(original);
      assert.notEqual(mutated, original, `${file}: the mutation must change something`);
      assert.ok(
        claimBlocks(mutated).flatMap(overclaims).length > 0,
        `${file}: the scan must reject the wording that shipped`,
      );
      assert.deepEqual(surfaceOverclaims(file), [], `${file}: and accept the corrected wording`);
    }
  });

  it("subject scoping narrows the scan without disarming it", () => {
    const offending = "`v2.5` can never be created.";
    const unrelated = "The skill and the app can never state contradictory rules.";
    assert.equal(claimBlocks(offending).length, 1, "the stranded claim is in range");
    assert.ok(overclaims(offending).length > 0, "and is rejected");
    assert.deepEqual(claimBlocks(unrelated), [], "an unrelated invariant is out of range");
    assert.ok(
      overclaims(unrelated).length > 0,
      "even though the same pattern matches it — scoping, not a weaker pattern, is what " +
        "keeps this guard from rewriting sentences that are true",
    );
  });

  it("a past-tense statement of fact is not an overstatement", () => {
    // These are true and appear across the repository. A scan that flagged them would be
    // deleted within a week, and the guard with it.
    for (const honest of [
      "the manifest was bumped twice and the release workflow never ran",
      "a detector that has never fired proves nothing",
      "`v2.5` was never tagged",
      "a test that never fails guards nothing",
    ]) {
      assert.deepEqual(overclaims(honest), [], `must not flag: ${honest}`);
    }
  });

  it("a claim that names no escape route is reported as incomplete", () => {
    const halfTrue = "that tag is no longer publishable from `main`.";
    assert.deepEqual(overclaims(halfTrue), [], "it makes no overstatement");
    assert.ok(
      missingClaims(halfTrue).some((c) => c.id === "older-commit-builds"),
      "but leaves the reader thinking nothing can publish it",
    );
    const whole =
      "that tag is no longer publishable from `main`; the older commit that still read " +
      "2.5.0 would build, but its notes predate the section.";
    assert.deepEqual(missingClaims(whole), [], `the full claim must pass: ${whole}`);
  });

  it("a stranded version with a tag behind it leaves the population", () => {
    // The guard must retire itself rather than assert about a version somebody released.
    const tagged = publishedVersions();
    if (!tagged) return;
    const history = manifestVersionHistory();
    const current = normalizeVersion(manifest.version);
    const released = [...history.keys()].filter(
      (v) => compareVersions(v, current) < 0 && tagged.has(v),
    );
    assert.ok(
      released.length > 0,
      "history must contain versions that were released, or the filter is doing nothing",
    );
    for (const v of released) {
      assert.ok(
        !(strandedVersions() ?? []).includes(v),
        `${v} has a tag; calling it stranded would be the false positive this filter prevents`,
      );
    }
  });
});
