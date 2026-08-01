#!/usr/bin/env node
/**
 * Which release train a pushed tag belongs to.
 *
 * The project publishes two products from one repository and one tag namespace:
 *
 *   plugin  — .claude-plugin/plugin.json, released by create-release.yml
 *   canvas  — the srs-navigator extension, released by release-canvas.yml
 *
 * `create-release.yml` triggers on `push: tags: ["v*"]`, which matches both, and the trains
 * cannot be told apart by tag shape: `v2.4.1` is a plugin release and `v1.1.0` is a canvas
 * one. So every canvas release fired the plugin pipeline against a tag that does not match
 * plugin.json — run 28527065984 on tag v1.1.0, the only failure in that workflow's history,
 * four seconds after the canvas release it belonged to succeeded.
 *
 * The tag can only be attributed by asking each train whether it claims it, which is what
 * this module does. Both rules are the pipelines' own, not local restatements:
 *
 *   plugin — build-plugin.py accepts any tag whose *normalized* version equals the manifest's
 *            (`validate --expected-version` compares normalize_version on both sides), so the
 *            same comparison is used here via pluginReleaseTag().
 *   canvas — bump-version.mjs tags `v${version}` verbatim, so the match is exact.
 *
 * Usage (create-release.yml):
 *   node scripts/release-train.mjs --tag v2.6
 *
 * Prints the verdict, appends `train=` and `reason=` to $GITHUB_OUTPUT when set, and exits
 * non-zero when the tag belongs to no train or to both — a tag nobody owns is a mistake worth
 * stopping for, and one both trains claim would have the plugin pipeline publish onto a
 * release the canvas job is about to create.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { pluginReleaseTag } from "./check-distribution.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * The tag release-canvas.yml publishes a canvas version at.
 *
 * `bump-version.mjs` builds `` const tag = `v${version}` `` from the full X.Y.Z version and
 * pushes exactly that, so unlike the plugin train there is no `.0` stripping here: canvas
 * 1.2.0 is published at v1.2.0, never v1.2.
 *
 * @param {string} version
 * @returns {string|null} null when the value is not a dotted numeric version
 */
export function canvasReleaseTag(version) {
  const raw = String(version ?? "").trim().replace(/^v/i, "");
  if (!/^\d+(\.\d+)*$/.test(raw)) return null;
  return `v${raw}`;
}

/** The version the plugin manifest advertises. */
export function readPluginVersion(root = REPO_ROOT) {
  const file = path.join(root, ".claude-plugin", "plugin.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")).version ?? null;
}

/**
 * Every version the canvas train advertises: the extension package.json, which is what
 * bump-version.mjs bumps from, and VERSION, which is what the docs and the drift monitor read.
 * They are asserted to agree elsewhere; both are offered here so a disagreement can never
 * misroute a tag into the wrong pipeline on top of whatever else it breaks.
 */
export function readCanvasVersions(root = REPO_ROOT) {
  const out = [];
  const versionFile = path.join(root, "VERSION");
  if (fs.existsSync(versionFile)) out.push(fs.readFileSync(versionFile, "utf8").trim());
  const pkg = path.join(root, ".github", "extensions", "srs-navigator", "package.json");
  if (fs.existsSync(pkg)) {
    const version = JSON.parse(fs.readFileSync(pkg, "utf8")).version;
    if (version) out.push(String(version).trim());
  }
  return [...new Set(out.filter(Boolean))];
}

/**
 * Attribute a pushed tag to a release train.
 *
 * @param {{tag?:string, pluginVersion?:string|null, canvasVersions?:string[]|string}} input
 * @returns {{train:"plugin"|"canvas"|"ambiguous"|"unknown", tag:string, reason:string}}
 */
export function tagTrain({ tag, pluginVersion, canvasVersions = [] } = {}) {
  const raw = String(tag ?? "").trim();
  const canvasList = (Array.isArray(canvasVersions) ? canvasVersions : [canvasVersions]).filter(
    Boolean,
  );
  const canvasTags = [...new Set(canvasList.map(canvasReleaseTag).filter(Boolean))];

  const pluginTag = pluginReleaseTag(pluginVersion);
  const asPlugin = pluginReleaseTag(raw);
  const claimedByPlugin = pluginTag !== null && asPlugin !== null && asPlugin === pluginTag;
  const claimedByCanvas = canvasTags.includes(raw);

  if (claimedByPlugin && claimedByCanvas) {
    return {
      train: "ambiguous",
      tag: raw,
      reason:
        `${raw} is claimed by both trains: the plugin manifest says ${pluginVersion} ` +
        `(published at ${pluginTag}) and the canvas app advertises ${canvasList.join(", ")}. ` +
        `Releasing either one would publish over the other.`,
    };
  }
  if (claimedByPlugin) {
    return {
      train: "plugin",
      tag: raw,
      reason: `${raw} matches .claude-plugin/plugin.json (${pluginVersion}), released by create-release.yml.`,
    };
  }
  if (claimedByCanvas) {
    return {
      train: "canvas",
      tag: raw,
      reason:
        `${raw} matches the srs-navigator canvas app (${canvasList.join(", ")}), released by ` +
        `release-canvas.yml. The plugin pipeline has nothing to publish for it.`,
    };
  }
  return {
    train: "unknown",
    tag: raw,
    reason:
      `${raw || "(no tag)"} belongs to no release train: the plugin manifest is ` +
      `${pluginVersion ?? "unreadable"} (published at ${pluginTag ?? "n/a"}) and the canvas app ` +
      `advertises ${canvasTags.join(", ") || "nothing"}. Bump the version that should own this ` +
      `tag before pushing it.`,
  };
}

function parseArgs(argv) {
  const out = { tag: process.env.GITHUB_REF_NAME ?? "", root: REPO_ROOT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tag") out.tag = argv[++i];
    else if (argv[i] === "--root") out.root = argv[++i];
  }
  return out;
}

function main(argv) {
  const { tag, root } = parseArgs(argv);
  const verdict = tagTrain({
    tag,
    pluginVersion: readPluginVersion(root),
    canvasVersions: readCanvasVersions(root),
  });

  console.log(`train=${verdict.train}`);
  console.log(verdict.reason);

  const { GITHUB_OUTPUT, GITHUB_STEP_SUMMARY } = process.env;
  if (GITHUB_OUTPUT) {
    fs.appendFileSync(GITHUB_OUTPUT, `train=${verdict.train}\n`);
    fs.appendFileSync(GITHUB_OUTPUT, `reason=${verdict.reason.replace(/\r?\n/g, " ")}\n`);
  }
  if (GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      GITHUB_STEP_SUMMARY,
      `## Release train: ${verdict.train}\n\n${verdict.reason}\n`,
    );
  }
  if (verdict.train === "unknown" || verdict.train === "ambiguous") {
    console.error(`::error::${verdict.reason}`);
    return 1;
  }
  return 0;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) process.exit(main(process.argv.slice(2)));
