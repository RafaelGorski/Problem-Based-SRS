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
 * @param {string} html
 * @returns {{skills:string[], description:string|null, declaredCount:number|null, url:string|null}}
 */
export function parseRegistryListing(html) {
  const page = jsonLdBlocks(html).find((b) => b && b["@type"] === "CollectionPage");
  if (!page) return { skills: [], description: null, declaredCount: null, url: null };

  const parts = Array.isArray(page.hasPart) ? page.hasPart : [];
  const description = typeof page.description === "string" ? page.description : null;
  const stated = description?.match(/^(\d+)\s+agent skills/i);

  return {
    skills: parts.map((p) => p?.name).filter((n) => typeof n === "string"),
    description,
    declaredCount: stated ? Number(stated[1]) : null,
    url: typeof page.url === "string" ? page.url : null,
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

/**
 * Every per-tag release URL a set of documents publishes, with file and line.
 *
 * Deliberately does not match the `/releases` index, `/releases?q=…` filters, or
 * `/releases/download/…` asset URLs: those resolve whether or not a given tag exists, so
 * flagging them would bury the finding that matters.
 *
 * @param {Array<{file:string, text:string}>} sources
 * @returns {Array<{file:string, line:number, repo:string, tag:string, url:string}>}
 */
export function advertisedTagLinks(sources = []) {
  const out = [];
  for (const { file, text } of sources) {
    const lines = String(text ?? "").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const m of line.matchAll(TAG_LINK)) {
        out.push({ file, line: i + 1, repo: m[1], tag: m[2], url: m[0] });
      }
    });
  }
  return out;
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
 * @param {{manifestVersion:string, canvasVersion:string, tags:string[]}} input
 */
export function releaseDrift({ manifestVersion, canvasVersion, tags = [] } = {}) {
  const train = (advertised, match) => {
    const matchedTag = advertised ? match(advertised, tags) : null;
    return { advertised: advertised ?? null, matchedTag, published: matchedTag !== null };
  };

  let newest = null;
  for (const tag of tags) {
    const v = normalizeVersion(tag);
    if (!v) continue;
    if (newest === null || compareVersions(v, normalizeVersion(newest)) > 0) newest = tag;
  }

  return {
    plugin: train(manifestVersion, pluginTag),
    canvas: train(canvasVersion, exactTag),
    newest,
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
 * @param {{errors?: Array<{surface:string, message:string}>}} input
 */
export function summarize({
  listing = { skills: [], declaredCount: null, url: null },
  repoSkills = [],
  tagLinks = [],
  publishedTags = [],
  manifestVersion = null,
  canvasVersion = null,
  errors = [],
} = {}) {
  const findings = [];
  const failed = new Set(errors.map((e) => e.surface));

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

  const dangling = danglingTagLinks(tagLinks, publishedTags);
  if (dangling.length) {
    findings.push({
      id: "dangling-release-links",
      severity: "error",
      title: "Published links point at releases that do not exist",
      detail: dangling.map((l) => `${l.file}:${l.line}  ${l.tag}  ${l.url}`),
    });
  }

  const releases = releaseDrift({ manifestVersion, canvasVersion, tags: publishedTags });
  if (manifestVersion && !releases.plugin.published) {
    findings.push({
      id: "plugin-release-missing",
      severity: "error",
      title: `The plugin advertises ${manifestVersion} but no such release is published`,
      detail: [
        `.claude-plugin/plugin.json: ${manifestVersion}`,
        `newest published release: ${releases.newest ?? "none"}`,
        "Cut it with `git tag vX.Y && git push origin vX.Y` (create-release.yml).",
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
        `newest published release: ${releases.newest ?? "none"}`,
        "release-canvas.yml owns this train and bumps VERSION itself.",
      ],
    });
  }

  return {
    ok: findings.length === 0,
    // Only real disagreement fails a run; warnings are surfaced, not paged on.
    drifted: findings.some((f) => f.severity === "error"),
    findings,
    releases,
  };
}

/** Render a summary as markdown, for a job summary or a terminal. */
export function renderReport(summary) {
  const lines = ["# Distribution drift", ""];
  if (summary.ok) {
    lines.push("Every distribution surface agrees with the repository.");
    return lines.join("\n") + "\n";
  }
  lines.push(`${summary.findings.length} finding(s).`, "");
  for (const f of summary.findings) {
    lines.push(`## ${f.severity === "error" ? "❌" : "⚠️"} ${f.title}`, "");
    for (const line of f.detail) lines.push(`- ${line}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Workflow-command lines so a warning-only run is visible in the Actions UI without
 * failing the job — otherwise "the listing became unparseable" would be a green run whose
 * only trace is a summary nobody opens.
 */
export function renderAnnotations(summary) {
  return summary.findings.map((f) => `::${f.severity}::${f.title} — ${f.detail[0] ?? ""}`);
}

// ---------------------------------------------------------------------------
// CLI (the only part that touches the network)
// ---------------------------------------------------------------------------

export async function fetchRegistryListing({ url = REGISTRY_URL, fetchImpl } = {}) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const res = await doFetch(url, { headers: { accept: "text/html" }, redirect: "follow" });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return await res.text();
}

export async function fetchPublishedTags({ repo = REPO, fetchImpl, token } = {}) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const headers = { accept: "application/vnd.github+json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const url = `https://api.github.com/repos/${repo}/releases?per_page=100`;
  const res = await doFetch(url, { headers });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const body = await res.json();
  return (Array.isArray(body) ? body : [])
    .filter((r) => !r.draft)
    .map((r) => r.tag_name)
    .filter(Boolean);
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
    tagLinks: advertisedTagLinks(sources),
    registryUrl: advertisedRegistryUrl(sources),
  };
}

export async function main(argv = [], { fetchImpl, env = process.env, root = REPO_ROOT } = {}) {
  const asJson = argv.includes("--json");
  const strict = argv.includes("--strict");
  const { registryUrl, ...local } = readLocalState(root);
  const errors = [];

  let listing = { skills: [], description: null, declaredCount: null, url: registryUrl };
  try {
    listing = parseRegistryListing(await fetchRegistryListing({ url: registryUrl, fetchImpl }));
  } catch (err) {
    errors.push({ surface: "registry", message: `${registryUrl}: ${err.message}` });
  }

  let publishedTags = [];
  try {
    publishedTags = await fetchPublishedTags({
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

  const summary = summarize({ listing, ...local, publishedTags, errors });
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
