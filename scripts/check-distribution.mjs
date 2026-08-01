#!/usr/bin/env node
/**
 * Distribution drift checker.
 *
 * This project is distributed through surfaces it does not own: a registry listing on
 * skills.sh, and GitHub Releases for the plugin zip and the canvas archive. Nothing in
 * the repository could see either, so both drifted silently:
 *
 *   * the listing still advertises the nine pre-#50 skills, of which eight no longer
 *     exist — its own counters put 70 of 101 installs on names that resolve to nothing;
 *   * .claude-plugin/plugin.json reached 2.6.0 while the newest release stayed v2.4.1,
 *     so README.md's version badge linked a tag that returns 404.
 *
 * `evals/tests/distribution-surfaces.test.mjs` asserts those links *exist*. This module
 * asks the question that one cannot: does what they point at still agree with this
 * repository? The comparison is pure and unit-tested offline; only the CLI at the bottom
 * touches the network, and only .github/workflows/distribution-drift.yml runs it.
 *
 * Usage:
 *   node scripts/check-distribution.mjs [--json] [--strict]
 *
 *   --json    print the summary as JSON instead of markdown
 *   --strict  exit non-zero when any surface has drifted (what the workflow uses)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "../evals/lib/skills.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

export const REPO = "RafaelGorski/Problem-Based-SRS";
export const REGISTRY_URL = "https://www.skills.sh/rafaelgorski/problem-based-srs";

/** Files that publish release links to readers. */
export const LINK_SOURCES = ["README.md", "CHANGELOG.md", "docs/index.html", "docs/docs.html"];

// ---------------------------------------------------------------------------
// Registry listing
// ---------------------------------------------------------------------------

/** Every JSON-LD payload on a page, skipping blocks that do not parse. */
function jsonLdBlocks(html) {
  const out = [];
  for (const m of String(html ?? "").matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      // A malformed block is the page's problem, not a reason to report drift.
    }
  }
  return out;
}

/**
 * Read the skill set a registry page advertises.
 *
 * Uses the page's JSON-LD `CollectionPage` rather than its markup: it is a declared
 * contract, so it survives a redesign, and picking the wrong block is detectable (the
 * page also carries a BreadcrumbList and a WebSite block).
 *
 * `parts` carries the per-skill page URL alongside each name, because the names are the
 * cheap half of the question. A re-submission makes them agree; whether the page behind
 * a name still renders the skill this repository ships is a different question, and it
 * cannot be asked without the address of the page that answers it.
 *
 * @param {string} html
 * @returns {{skills:string[], parts:Array<{name:string,url:string|null}>, description:string|null, declaredCount:number|null, url:string|null}}
 */
export function parseRegistryListing(html) {
  const page = jsonLdBlocks(html).find((b) => b && b["@type"] === "CollectionPage");
  if (!page) return { skills: [], parts: [], description: null, declaredCount: null, url: null };

  const hasPart = Array.isArray(page.hasPart) ? page.hasPart : [];
  const description = typeof page.description === "string" ? page.description : null;
  const stated = description?.match(/^(\d+)\s+agent skills/i);
  const parts = hasPart
    .filter((p) => typeof p?.name === "string")
    .map((p) => ({ name: p.name, url: typeof p.url === "string" ? p.url : null }));

  return {
    // One list, two readings: the names check and the page fetch must not be able to
    // disagree about what the listing advertises.
    skills: parts.map((p) => p.name),
    parts,
    description,
    declaredCount: stated ? Number(stated[1]) : null,
    url: typeof page.url === "string" ? page.url : null,
  };
}

/**
 * Read the skill a per-skill registry page declares.
 *
 * Same principle as the collection page: the `SoftwareApplication` JSON-LD block is a
 * declared contract, and picking the wrong one is detectable (the page also carries a
 * BreadcrumbList naming the same skill, and a WebSite block).
 *
 * `version` is null today for every page skills.sh serves — it publishes no
 * `softwareVersion`. That is reported as "no answer" rather than quietly dropped: #69's
 * box asks whether the listing renders the current version, and the honest answer is that
 * this surface cannot say. The comparison is wired for the moment it can.
 *
 * @param {string} html
 * @returns {{name:string|null, description:string|null, version:string|null, url:string|null}|null}
 */
export function parseSkillPage(html) {
  const app = jsonLdBlocks(html).find((b) => b && b["@type"] === "SoftwareApplication");
  if (!app) return null;
  const str = (v) => (typeof v === "string" && v.trim() ? v : null);
  return {
    name: str(app.name),
    description: str(app.description),
    version: str(app.softwareVersion),
    url: str(app.url),
  };
}

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * The text a registry page renders, as close to what a reader sees as is worth getting.
 *
 * Three things make this less crude than it looks. Comments and the JSON-LD blocks are
 * dropped first, so neither the page's own notes nor its declared contract can vouch for
 * the rendered body — otherwise a page could prove its own freshness with its metadata
 * block while serving anything at all. The `\u003c` escapes are resolved next, because the
 * rendered markdown is streamed inside a script payload in that form and nothing would be
 * found without it. Only then are tags stripped, so the decoded payload's tags go with the
 * real ones.
 *
 * Scraped text is not a contract, which is why nothing concluded from it is ever reported
 * as drift on its own — see `skillPageDrift`.
 *
 * @param {string} html
 * @returns {string}
 */
export function pageText(html) {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\[nrt]/g, " ")
    .replace(/\\"/g, '"')
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A heading as it can be looked for in rendered text: decoration dropped, whitespace
 * collapsed. `## 📁 Saving Progress (CRITICAL)` renders with its emoji intact, so the
 * comparison has to be a substring of what the page shows, not an equality against what
 * the file holds.
 */
function normalizeHeading(title) {
  return String(title ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * What this repository ships, per skill: the frontmatter description, the frontmatter
 * `metadata.version`, and the top-level sections of the body.
 *
 * Derived from the files rather than restated, so the comparison moves with the skill. A
 * section list is the coarsest useful shape of a document — it survives every edit to the
 * prose underneath it, and it is exactly what goes missing when a page serves an older
 * copy.
 *
 * @param {string} [root]
 * @returns {Array<{name:string, description:string|null, version:string|null, sections:string[]}>}
 */
export function repoSkillProfiles(root = REPO_ROOT) {
  const dir = path.join(root, "skills");
  if (!fs.existsSync(dir)) return [];
  const profiles = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const text = fs.readFileSync(skillMd, "utf8");
    const { frontmatter, body } = parseFrontmatter(text);
    // parseFrontmatter only keeps top-level keys, and the version is nested under
    // `metadata:`. Read it from the raw block rather than widening a shared parser.
    const block = /^(?:<!--[\s\S]*?-->\s*)?---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
    const version = /^[ \t]+version:[ \t]*["']?([^"'\r\n]+)["']?[ \t]*$/m.exec(block)?.[1] ?? null;
    profiles.push({
      name: frontmatter.name || entry.name,
      description: frontmatter.description || null,
      version: version ? version.trim() : null,
      sections: [...body.matchAll(/^##[ \t]+(.+?)[ \t]*$/gm)]
        .map((m) => normalizeHeading(m[1]))
        .filter(Boolean),
    });
  }
  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

/** Whitespace-insensitive comparison, since a renderer may reflow a description. */
const sameText = (a, b) =>
  String(a ?? "").replace(/\s+/g, " ").trim() === String(b ?? "").replace(/\s+/g, " ").trim();

/**
 * Compare a registry page against the skill it claims to publish.
 *
 * The body half is scraped, and the epistemics of scraping decide the shape of the
 * result. Zero matched sections cannot distinguish "the page renders something else
 * entirely" from "this extraction broke against a redesign", so that is `readable: false`
 * and nothing is reported as missing — the same rule the collection page already gets
 * from `registry-listing-unreadable`. Once some sections match, the extraction has
 * demonstrably worked, and the ones that did not are real.
 *
 * The description and version halves come from JSON-LD, a declared contract, so they stay
 * answerable even when the body cannot be read.
 *
 * `version` carries a `status` rather than collapsing to null, because null said two
 * different things at once — *the surface publishes no version* and *this repository has
 * none to compare against* — and a caller that cannot tell them apart reports neither.
 * skills.sh publishes no `softwareVersion` today, so `page-publishes-none` is the state
 * every real run hits, and #69's box asks about exactly that axis.
 *
 *   compared            both sides have a version; `matches` is the answer
 *   page-publishes-none the registry page carries none; `matches` is null
 *   repo-publishes-none the skill's frontmatter carries none; `matches` is null
 *
 * @param {{page:object|null, text:string, profile:object|null}} input
 */
export function skillPageDrift({ page = null, text = "", profile = null } = {}) {
  const empty = { readable: false, matched: 0, total: 0, missing: [] };
  if (!profile || !page) {
    return { name: profile?.name ?? page?.name ?? null, description: null, version: null, body: empty };
  }

  const sections = Array.isArray(profile.sections) ? profile.sections : [];
  const matched = sections.filter((s) => text.includes(s));
  const readable = sections.length > 0 && matched.length > 0;

  const versionStatus = !page.version
    ? "page-publishes-none"
    : !profile.version
      ? "repo-publishes-none"
      : "compared";

  return {
    name: profile.name,
    description: page.description
      ? {
          expected: profile.description,
          actual: page.description,
          matches: sameText(page.description, profile.description),
        }
      : null,
    version: {
      status: versionStatus,
      expected: profile.version ?? null,
      actual: page.version ?? null,
      matches: versionStatus === "compared" ? sameText(page.version, profile.version) : null,
    },
    body: {
      readable,
      matched: matched.length,
      total: sections.length,
      missing: readable ? sections.filter((s) => !text.includes(s)) : [],
    },
  };
}

/**
 * The skills this repository actually ships, read from each SKILL.md's frontmatter.
 * Derived rather than restated so the comparison moves with the repository.
 * @param {string} [root]
 * @returns {string[]}
 */
export function repoSkillNames(root = REPO_ROOT) {
  const dir = path.join(root, "skills");
  if (!fs.existsSync(dir)) return [];
  const names = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const { frontmatter } = parseFrontmatter(fs.readFileSync(skillMd, "utf8"));
    names.push(frontmatter.name || entry.name);
  }
  return names.sort();
}

/**
 * The registry listing URL the project actually advertises, read from its own docs so the
 * monitor watches the page readers are sent to rather than a second copy of the address.
 * @param {Array<{file:string, text:string}>} sources
 * @param {string} [fallback]
 */
export function advertisedRegistryUrl(sources = [], fallback = REGISTRY_URL) {
  for (const { text } of sources) {
    const m = String(text ?? "").match(/https?:\/\/(?:www\.)?skills\.sh\/[^\s)"'<]+/);
    if (m) return m[0].replace(/[.,]+$/, "");
  }
  return fallback;
}

/**
 * Compare an advertised skill set against the real one.
 * @param {{listed:string[], actual:string[]}} input
 * @returns {{phantom:string[], missing:string[], inSync:boolean}}
 */
export function listingDrift({ listed = [], actual = [] } = {}) {
  const has = (set, name) => set.includes(name);
  const phantom = [...new Set(listed.filter((n) => !has(actual, n)))].sort();
  const missing = [...new Set(actual.filter((n) => !has(listed, n)))].sort();
  return { phantom, missing, inSync: phantom.length === 0 && missing.length === 0 };
}

// ---------------------------------------------------------------------------
// Release links and release trains
// ---------------------------------------------------------------------------

const TAG_LINK = /https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/releases\/tag\/([^\s)"'\]]+)/g;

/** A Keep-a-Changelog reference definition: `[2.6.0]: <url>` at the start of a line. */
const REFERENCE_DEF = /^\[([^\]]+)\]:\s*(\S+)/;

/**
 * Every per-tag release URL a set of documents publishes, with file and line.
 *
 * Deliberately does not match the `/releases` index, `/releases?q=…` filters, or
 * `/releases/download/…` asset URLs: those resolve whether or not a given tag exists, so
 * flagging them would bury the finding that matters.
 *
 * `label` is the version a reference definition claims the link is for, and it is the only
 * thing that makes "does this tag match what the release pipeline creates?" answerable. An
 * inline prose link makes no such claim, so it stays null rather than being guessed at.
 *
 * @param {Array<{file:string, text:string}>} sources
 * @returns {Array<{file:string, line:number, repo:string, tag:string, url:string, label:string|null}>}
 */
export function advertisedTagLinks(sources = []) {
  const out = [];
  for (const { file, text } of sources) {
    const lines = String(text ?? "").split(/\r?\n/);
    lines.forEach((line, i) => {
      const def = line.match(REFERENCE_DEF);
      for (const m of line.matchAll(TAG_LINK)) {
        out.push({
          file,
          line: i + 1,
          repo: m[1],
          tag: m[2],
          url: m[0],
          label: def && def[2] === m[0] ? def[1] : null,
        });
      }
    });
  }
  return out;
}

/**
 * The tag the plugin release pipeline publishes a version at.
 *
 * Not cosmetic. `create-release.yml` builds `TAG="v${VERSION}"` from
 * `steps.build.outputs.version`, i.e. build-plugin.py's *normalized* version, and
 * `normalize_version()` strips a trailing `.0` down to two parts. So manifest `2.6.0` is
 * published at `v2.6` — and because GitHub serves `/releases/tag/<tag>` by exact name, a
 * link naming `v2.6.0` is a 404 that cutting the release does not fix.
 *
 * Kept byte-compatible with build-plugin.py's rule; `release-hygiene.test.mjs` executes the
 * Python function and compares, so the two cannot drift apart silently.
 *
 * @param {string} version
 * @returns {string|null} null when the value is not a dotted numeric version
 */
export function pluginReleaseTag(version) {
  const raw = String(version ?? "").trim().replace(/^v/i, "");
  if (!/^\d+(\.\d+)*$/.test(raw)) return null;
  const parts = raw.split(".");
  while (parts.length > 2 && parts[parts.length - 1] === "0") parts.pop();
  return `v${parts.join(".")}`;
}

/** The title prefix `release-canvas.yml` gives every canvas release. */
const CANVAS_RELEASE_TITLE = /^srs-navigator\b/i;

/**
 * The changelog the plugin release pipeline reads.
 *
 * `build-plugin.py` sets `CHANGELOG = REPO_ROOT / "CHANGELOG.md"` and `create-release.yml`
 * takes its release notes from that file, so a Keep-a-Changelog reference definition there
 * is a claim about the *plugin* train. That matters because only the plugin train strips a
 * trailing `.0`: the canvas train tags `v${VERSION}` verbatim, so applying the plugin rule
 * to a canvas link would condemn `[1.2.0]: …/tag/v1.2.0` — a link a canvas release makes
 * resolve — as one that must be edited instead.
 */
export const PLUGIN_CHANGELOG = "CHANGELOG.md";

/**
 * Which release train a published release belongs to.
 *
 * The trains cannot be told apart by tag — `v2.4.1` is a plugin release and `v1.1.0` is a
 * canvas one — so the only separator is the title each workflow writes:
 * `--title "srs-navigator ${version}"` versus `TITLE="🎉 Version ${VERSION}"`. Without a
 * title the answer is "unknown", not a guess: reporting one train's release as the other's
 * is the mistake this classification exists to prevent.
 *
 * @param {{tag?:string, name?:string|null}} release
 * @returns {"canvas"|"plugin"|"unknown"}
 */
export function releaseTrain(release = {}) {
  const name = typeof release?.name === "string" ? release.name.trim() : "";
  if (!name) return "unknown";
  return CANVAS_RELEASE_TITLE.test(name) ? "canvas" : "plugin";
}


/**
 * Normalize a version or tag to X.Y.Z so the plugin train's two-part tags (`v2.4`, stored
 * in the manifest as `2.4.0` by build-plugin.py) compare equal to the manifest.
 * @param {string} value
 * @returns {string|null} null when the value is not a dotted numeric version
 */
export function normalizeVersion(value) {
  const raw = String(value ?? "").trim().replace(/^v/i, "");
  if (!/^\d+(\.\d+)*$/.test(raw)) return null;
  const parts = raw.split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3).join(".");
}

function exactTag(version, tags) {
  return tags.find((t) => t === `v${version}` || t === version) ?? null;
}

/**
 * The plugin train tags `vX.Y` for a manifest that stores `X.Y.0`, so an exact miss there
 * still has to try the normalized form. The canvas train does not: `bump-version.mjs`
 * always tags `v${VERSION}` in full.
 */
function pluginTag(version, tags) {
  const exact = exactTag(version, tags);
  if (exact) return exact;
  const want = normalizeVersion(version);
  if (!want) return null;
  return tags.find((t) => normalizeVersion(t) === want) ?? null;
}

/**
 * Release links whose tag has no published release behind it.
 *
 * Tags are compared **exactly**: GitHub serves /releases/tag/<tag> by tag name, so
 * `/releases/tag/v2.4.0` is a 404 even though release 2.4.0 exists as `v2.4`. Normalizing
 * here would call a genuinely broken link healthy. Links to other repositories are not
 * this repository's releases to publish, so they are out of scope.
 *
 * @param {ReturnType<typeof advertisedTagLinks>} links
 * @param {string[]} publishedTags
 * @param {{repo?:string}} [options]
 */
export function danglingTagLinks(links = [], publishedTags = [], { repo = REPO } = {}) {
  return links.filter(
    (l) =>
      String(l.repo).toLowerCase() === String(repo).toLowerCase() &&
      !publishedTags.includes(l.tag),
  );
}

/**
 * Compare each release train's advertised version against what is published.
 *
 * The two trains share a tag namespace but not a version file: the plugin's number lives
 * in .claude-plugin/plugin.json and is tagged vX.Y, the canvas app's lives in VERSION and
 * is tagged vX.Y.Z. Matching them by normalized version alone would let the plugin's `v1.2`
 * satisfy a canvas VERSION of 1.2.0 — a release of the *other* product silencing exactly
 * the "bumped but never cut" case this checker exists for.
 *
 * The same separation has to hold in what the report *says*, not only in what it matches:
 * each train carries its own `newest`, derived from the titles the workflows write, so the
 * canvas finding can never cite a plugin release as the thing the canvas app is behind.
 * When no titles came back, `newest` is null per train rather than a cross-train guess.
 *
 * @param {{manifestVersion:string, canvasVersion:string, tags?:string[], releases?:Array<{tag:string,name?:string|null}>}} input
 */
export function releaseDrift({ manifestVersion, canvasVersion, tags = [], releases } = {}) {
  const list =
    Array.isArray(releases) && releases.length
      ? releases
      : tags.map((tag) => ({ tag, name: null }));
  const allTags = list.map((r) => r?.tag).filter(Boolean);

  const newestIn = (entries) => {
    let newest = null;
    for (const { tag } of entries) {
      const v = normalizeVersion(tag);
      if (!v) continue;
      if (newest === null || compareVersions(v, normalizeVersion(newest)) > 0) newest = tag;
    }
    return newest;
  };

  const train = (advertised, match, name) => {
    const matchedTag = advertised ? match(advertised, allTags) : null;
    return {
      advertised: advertised ?? null,
      matchedTag,
      published: matchedTag !== null,
      newest: newestIn(list.filter((r) => releaseTrain(r) === name)),
    };
  };

  return {
    plugin: train(manifestVersion, pluginTag, "plugin"),
    canvas: train(canvasVersion, exactTag, "canvas"),
    newest: newestIn(list),
    // Whether any release could be attributed at all. Without it a train with no releases
    // is indistinguishable from a list that carried no titles, and the report would say
    // "train not identifiable" — then cite the *other* train's newest release as what this
    // one is behind, which is the error the per-train split exists to prevent.
    classified: list.some((r) => releaseTrain(r) !== "unknown"),
  };
}

/** Numeric dotted-version comparison. Returns >0 when a is newer than b. */
export function compareVersions(a, b) {
  const pa = String(a ?? "").split(".").map(Number);
  const pb = String(b ?? "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/**
 * Turn the raw observations into findings a maintainer can act on.
 *
 * A surface that could not be read is a **warning**, never drift: a 503 from a registry is
 * not evidence that its listing is wrong. Only `error` findings mean something actually
 * disagrees with the repository, and only those drive the exit code — a report that cries
 * wolf on a network hiccup is a report that gets ignored.
 *
 * `unverified` is a third channel, deliberately not a third severity. `ok` is
 * `findings.length === 0`, so an axis that is unanswerable on *every* run — skills.sh has
 * never published a version — would leave the monitor permanently non-green if it were a
 * finding, and a monitor that is never green is a monitor that gets muted. These entries
 * say what the run could not compare without claiming anything about whether it agrees.
 *
 * @param {{errors?: Array<{surface:string, message:string}>}} input
 */
export function summarize({
  listing = { skills: [], declaredCount: null, url: null },
  repoSkills = [],
  skillProfiles = [],
  skillPages = [],
  tagLinks = [],
  publishedTags = [],
  publishedReleases = null,
  manifestVersion = null,
  canvasVersion = null,
  errors = [],
} = {}) {
  const findings = [];
  const unverified = [];
  const failed = new Set(errors.map((e) => e.surface));
  // One list, one truth. When the caller has the release titles, they also carry the tags;
  // accepting a second, possibly disagreeing tag list would let a summary report a link as
  // resolved while the same release is reported as missing.
  const releaseList =
    Array.isArray(publishedReleases) && publishedReleases.length
      ? publishedReleases
      : publishedTags.map((tag) => ({ tag, name: null }));
  const tags = releaseList.map((r) => r?.tag).filter(Boolean);

  for (const { surface, message } of errors) {
    findings.push({
      id: "surface-unreachable",
      severity: "warning",
      title: `The ${surface} surface could not be read`,
      detail: [message, "This run has no evidence about that surface either way."],
    });
  }

  if (listing.skills.length === 0) {
    // Already explained by a fetch error above; a second finding for one cause reads as
    // two problems.
    if (!failed.has("registry")) {
      findings.push({
        id: "registry-listing-unreadable",
        severity: "warning",
        title: "The registry listing published no machine-readable skill set",
        detail: [
          `${listing.url ?? REGISTRY_URL} carried no JSON-LD CollectionPage.`,
          "Its markup may have changed — check by hand before trusting a clean run.",
        ],
      });
    }
  } else if (listing.declaredCount !== null && listing.declaredCount !== listing.skills.length) {
    findings.push({
      id: "registry-listing-partial",
      severity: "warning",
      title: "The registry listing returned a partial skill set",
      detail: [
        `${listing.url ?? REGISTRY_URL} says it has ${listing.declaredCount} skills but ` +
          `published ${listing.skills.length}.`,
        "Comparing a truncated payload could report agreement that is not there, so the",
        "comparison was skipped.",
      ],
    });
  } else {
    const drift = listingDrift({ listed: listing.skills, actual: repoSkills });
    if (!drift.inSync) {
      const detail = [`Listing: ${listing.url ?? REGISTRY_URL}`];
      if (drift.phantom.length) {
        detail.push(
          `Advertised but not in this repository (${drift.phantom.length}): ` +
            drift.phantom.join(", "),
        );
      }
      if (drift.missing.length) {
        detail.push(
          `Shipped here but not listed (${drift.missing.length}): ` + drift.missing.join(", "),
        );
      }
      detail.push(
        "Refreshing the listing is third-party state; re-submit it at https://www.skills.sh.",
      );
      findings.push({
        id: "registry-listing-drift",
        severity: "error",
        title: "The registry listing disagrees with the repository",
        detail,
      });
    }
  }

  // The names are the cheap half. A re-submission makes them agree, and this is what is
  // left to check afterwards: whether the page behind a name still renders the skill this
  // repository ships. Only skills that exist on both sides are compared — a name the
  // repository deleted is already reported above, and asking a second question about it
  // would read as two problems with one cause.
  for (const entry of skillPages) {
    const profile = skillProfiles.find((p) => p.name === entry?.name);
    if (!profile) continue;

    const drift = skillPageDrift({ page: entry.page, text: entry.text, profile });
    const stale = [];
    if (drift.description && !drift.description.matches) {
      stale.push(
        `description on the page: "${drift.description.actual}"`,
        `description this repository ships: "${drift.description.expected}"`,
      );
    }
    if (drift.version?.status === "compared" && !drift.version.matches) {
      stale.push(
        `version on the page: ${drift.version.actual}; this repository ships ` +
          `${drift.version.expected} (skills/${profile.name}/SKILL.md, metadata.version)`,
      );
    }
    if (drift.body.missing.length) {
      stale.push(
        `the page renders ${drift.body.matched} of the skill's ${drift.body.total} sections; ` +
          `missing: ${drift.body.missing.join(", ")}`,
      );
    }

    // A version the page does not publish is not agreement, and it is not drift either.
    // Dropping it made a run that compared one axis read as a run that compared them all.
    if (drift.version && drift.version.status !== "compared") {
      const where = entry.url ?? entry.page?.url ?? listing.url ?? REGISTRY_URL;
      unverified.push({
        id: "registry-skill-version-unverifiable",
        severity: "notice",
        title: `The version of ${profile.name} was not compared`,
        detail:
          drift.version.status === "page-publishes-none"
            ? [
                `${where} publishes no version — its JSON-LD carries no softwareVersion — so ` +
                  "the page's version cannot be read.",
                `This repository ships metadata.version ${drift.version.expected ?? "(none)"} in ` +
                  `skills/${profile.name}/SKILL.md — the skill's own version, not the plugin ` +
                  "release version.",
                "Recorded so a clean run is not read as a version that was checked and agreed. " +
                  "It does not fail the run: the limitation is the surface's, not this repository's.",
              ]
            : [
                `${where} publishes version ${drift.version.actual}, but ` +
                  `skills/${profile.name}/SKILL.md declares no metadata.version to compare it ` +
                  "against.",
                "Add metadata.version to the skill's frontmatter and this axis starts answering.",
              ],
      });
    }

    if (stale.length) {
      findings.push({
        id: "registry-skill-stale",
        severity: "error",
        title: `The registry page for ${profile.name} publishes an older copy of the skill`,
        detail: [
          `Page: ${entry.url ?? entry.page?.url ?? listing.url ?? REGISTRY_URL}`,
          ...stale,
          "Section presence is a staleness signal, not a byte-level diff: headings that all " +
            "match do not prove the prose beneath them is current.",
          "The listing is a crawl, not a mirror; re-submit the repository at " +
            "https://www.skills.sh so the page is rebuilt from what is shipped today.",
        ],
      });
    }

    if (!drift.body.readable) {
      findings.push({
        id: "registry-skill-unreadable",
        severity: "warning",
        title: `The registry page for ${profile.name} published no readable skill body`,
        detail: [
          entry.page
            ? `${entry.url ?? entry.page.url}: none of the ${profile.sections.length} sections ` +
              "the shipped skill declares appear on the page."
            : `${entry.url ?? "the page"} carried no JSON-LD SoftwareApplication block.`,
          "A page that renders something else and a page this checker can no longer parse " +
            "look identical from here, so no drift is claimed. Check it by hand.",
        ],
      });
    }
  }

  const dangling = danglingTagLinks(tagLinks, tags);
  // A link that names a tag no pipeline creates is a different job from one that is merely
  // waiting for a tag push. Reporting both under "cut the missing release" hands the
  // maintainer an instruction that cannot work: cutting v2.6 leaves a v2.6.0 link 404, so
  // the run stays red and the advice that produced it is now false.
  const unpublishable = dangling.filter((l) => {
    if (l.file !== PLUGIN_CHANGELOG) return false;
    const expected = l.label ? pluginReleaseTag(l.label) : null;
    return expected !== null && expected !== l.tag;
  });
  const pending = dangling.filter((l) => !unpublishable.includes(l));

  if (unpublishable.length) {
    findings.push({
      id: "unpublishable-release-link",
      severity: "error",
      title: "Published links name tags no release pipeline creates",
      detail: [
        ...unpublishable.map(
          (l) =>
            `${l.file}:${l.line}  [${l.label}] links ${l.tag}, but the pipeline publishes ` +
            `that version at ${pluginReleaseTag(l.label)}`,
        ),
        "Cutting the release will not fix these — GitHub serves /releases/tag/<tag> by " +
          "exact name. Correct the link.",
      ],
    });
  }
  if (pending.length) {
    findings.push({
      id: "dangling-release-links",
      severity: "error",
      title: "Published links point at releases that do not exist",
      detail: pending.map((l) => `${l.file}:${l.line}  ${l.tag}  ${l.url}`),
    });
  }

  const releases = releaseDrift({
    manifestVersion,
    canvasVersion,
    releases: releaseList,
  });
  // Naming the other train's release as what this one is behind is the category error the
  // matching above takes care to avoid; it must not reappear in the prose. "No release on
  // this train" and "the trains could not be told apart" are different answers, and only
  // the second one has any business quoting a number from the other train.
  const newestLine = (train, label) => {
    if (train.newest) return `newest published ${label} release: ${train.newest}`;
    if (releases.classified) return `no ${label} release has been published yet`;
    return `newest published release (train not identifiable): ${releases.newest ?? "none"}`;
  };

  if (manifestVersion && !releases.plugin.published) {
    findings.push({
      id: "plugin-release-missing",
      severity: "error",
      title: `The plugin advertises ${manifestVersion} but no such release is published`,
      detail: [
        `.claude-plugin/plugin.json: ${manifestVersion}`,
        newestLine(releases.plugin, "plugin"),
        `Cut it with \`git tag ${pluginReleaseTag(manifestVersion) ?? "vX.Y"} && git push ` +
          `origin ${pluginReleaseTag(manifestVersion) ?? "vX.Y"}\` (create-release.yml).`,
      ],
    });
  }
  if (canvasVersion && !releases.canvas.published) {
    findings.push({
      id: "canvas-release-missing",
      severity: "error",
      title: `The canvas app advertises ${canvasVersion} but no such release is published`,
      detail: [
        `VERSION: ${canvasVersion}`,
        newestLine(releases.canvas, "canvas"),
        "release-canvas.yml owns this train and bumps VERSION itself.",
      ],
    });
  }

  return {
    ok: findings.length === 0,
    // Only real disagreement fails a run; warnings are surfaced, not paged on, and
    // unverified axes are neither — they are what the run could not ask.
    drifted: findings.some((f) => f.severity === "error"),
    findings,
    unverified,
    releases,
  };
}

/** Render a summary as markdown, for a job summary or a terminal. */
export function renderReport(summary) {
  const lines = ["# Distribution drift", ""];
  const unverified = summary.unverified ?? [];
  if (summary.ok) {
    // The unqualified all-clear is only true when nothing went unasked. Saying it over an
    // axis the run could not compare is the overstatement this section exists to stop.
    lines.push(
      unverified.length
        ? "Every distribution surface agrees with the repository on every axis this run " +
          "could compare."
        : "Every distribution surface agrees with the repository.",
    );
    if (!unverified.length) return lines.join("\n") + "\n";
    lines.push("");
  } else {
    lines.push(`${summary.findings.length} finding(s).`, "");
    for (const f of summary.findings) {
      lines.push(`## ${f.severity === "error" ? "❌" : "⚠️"} ${f.title}`, "");
      for (const line of f.detail) lines.push(`- ${line}`);
      lines.push("");
    }
    if (!unverified.length) return lines.join("\n");
  }
  lines.push(`## ℹ️ Not verified this run (${unverified.length})`, "");
  for (const u of unverified) {
    lines.push(`### ${u.title}`, "");
    for (const line of u.detail) lines.push(`- ${line}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Workflow-command lines so a warning-only run is visible in the Actions UI without
 * failing the job — otherwise "the listing became unparseable" would be a green run whose
 * only trace is a summary nobody opens. Unverified axes ride the same path at `::notice::`,
 * for the same reason: a green run that skipped a comparison has to say so somewhere a
 * human already looks.
 */
export function renderAnnotations(summary) {
  return [
    ...summary.findings.map((f) => `::${f.severity}::${f.title} — ${f.detail[0] ?? ""}`),
    ...(summary.unverified ?? []).map((u) => `::notice::${u.title} — ${u.detail[0] ?? ""}`),
  ];
}

// ---------------------------------------------------------------------------
// CLI (the only part that touches the network)
// ---------------------------------------------------------------------------

async function fetchHtml({ url, fetchImpl }) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const res = await doFetch(url, { headers: { accept: "text/html" }, redirect: "follow" });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return await res.text();
}

export async function fetchRegistryListing({ url = REGISTRY_URL, fetchImpl } = {}) {
  return await fetchHtml({ url, fetchImpl });
}

/**
 * A per-skill listing page. Shares the listing fetch's guard on purpose: a 404 is not an
 * empty page, and swallowing it would report the entire skill body as missing.
 */
export async function fetchSkillPage({ url, fetchImpl } = {}) {
  return await fetchHtml({ url, fetchImpl });
}

/**
 * Published (non-draft) releases with the title their workflow gave them.
 *
 * The title is not decoration: it is the only thing that distinguishes the canvas train
 * from the plugin train, which share a tag namespace. Dropping it — as this function did
 * when it returned tags alone — is what let the report tell the canvas app it was behind
 * `v2.4.1`, a release of the other product.
 */
export async function fetchPublishedReleases({ repo = REPO, fetchImpl, token } = {}) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const headers = { accept: "application/vnd.github+json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const url = `https://api.github.com/repos/${repo}/releases?per_page=100`;
  const res = await doFetch(url, { headers });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const body = await res.json();
  return (Array.isArray(body) ? body : [])
    .filter((r) => !r.draft && r.tag_name)
    .map((r) => ({ tag: r.tag_name, name: typeof r.name === "string" ? r.name : null }));
}

/** The same list flattened to tag names, for callers that only compare tags. */
export async function fetchPublishedTags(options = {}) {
  return (await fetchPublishedReleases(options)).map((r) => r.tag);
}

export function readLocalState(root = REPO_ROOT) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"));
  const versionFile = path.join(root, "VERSION");
  const sources = LINK_SOURCES.filter((rel) => fs.existsSync(path.join(root, rel))).map((rel) => ({
    file: rel,
    text: fs.readFileSync(path.join(root, rel), "utf8"),
  }));
  return {
    manifestVersion: manifest.version,
    canvasVersion: fs.existsSync(versionFile)
      ? fs.readFileSync(versionFile, "utf8").trim()
      : null,
    repoSkills: repoSkillNames(root),
    skillProfiles: repoSkillProfiles(root),
    tagLinks: advertisedTagLinks(sources),
    registryUrl: advertisedRegistryUrl(sources),
  };
}

export async function main(argv = [], { fetchImpl, env = process.env, root = REPO_ROOT } = {}) {
  const asJson = argv.includes("--json");
  const strict = argv.includes("--strict");
  const { registryUrl, ...local } = readLocalState(root);
  const errors = [];

  let listing = { skills: [], parts: [], description: null, declaredCount: null, url: registryUrl };
  try {
    listing = parseRegistryListing(await fetchRegistryListing({ url: registryUrl, fetchImpl }));
  } catch (err) {
    errors.push({ surface: "registry", message: `${registryUrl}: ${err.message}` });
  }

  // Only the pages of skills this repository actually ships. The listing advertises names
  // the repository deleted; fetching their pages would be requests spent learning what the
  // names comparison has already reported.
  const shipped = new Set(local.skillProfiles.map((p) => p.name));
  const skillPages = [];
  for (const part of listing.parts ?? []) {
    if (!part.url || !shipped.has(part.name)) continue;
    try {
      const html = await fetchSkillPage({ url: part.url, fetchImpl });
      skillPages.push({
        name: part.name,
        url: part.url,
        page: parseSkillPage(html),
        text: pageText(html),
      });
    } catch (err) {
      errors.push({ surface: `registry page for ${part.name}`, message: `${part.url}: ${err.message}` });
    }
  }

  let publishedReleases = [];
  try {
    publishedReleases = await fetchPublishedReleases({
      fetchImpl,
      token: env.GITHUB_TOKEN || env.GH_TOKEN,
    });
  } catch (err) {
    errors.push({ surface: "releases", message: `GitHub releases API: ${err.message}` });
    // Without the release list every tag link would look dangling. Drop those inputs
    // rather than emit findings the run has no evidence for.
    local.tagLinks = [];
    local.manifestVersion = null;
    local.canvasVersion = null;
  }

  const summary = summarize({
    listing,
    ...local,
    skillPages,
    publishedTags: publishedReleases.map((r) => r.tag),
    publishedReleases,
    errors,
  });
  const output = asJson ? JSON.stringify(summary, null, 2) : renderReport(summary);
  console.log(output);

  if (env.GITHUB_ACTIONS) {
    for (const line of renderAnnotations(summary)) console.log(line);
  }
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, renderReport(summary));
  }
  return strict && summary.drifted ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(2);
    });
}
