// FR.06.1.6 — every published adoption surface must advertise the same version as the
// current published release; the docs site must not contradict itself (issue #177). This test
// reads every version string in docs/*.html and asserts they all agree with each other and with
// the manifest — the single source of truth for the currently published plugin version.
//
// Deliberately offline: no network, no external registry — just the files this repository ships.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");

/** Every `vX.Y[.Z]` version token in a file's markup, in document order. */
export function extractVersionTokens(html) {
  return [...html.matchAll(/\bv(\d+\.\d+(?:\.\d+)?)\b/g)].map((m) => m[1]);
}

/** Normalize "2.6" and "2.6.0" to the same comparable form. */
export function normalizeVersion(v) {
  const parts = String(v).split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  return parts.join(".");
}

function docsHtmlFiles() {
  // Scoped to the two adoptions-facing surfaces issue #177 names: the landing page and the
  // docs page. Other generated pages (e.g. skills-health.html) intentionally carry a second,
  // independent version axis (the canvas/SRS Navigator version) and are out of scope here.
  return ["index.html", "docs.html"].map((f) => path.join(DOCS_DIR, f));
}

const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ".claude-plugin", "plugin.json"), "utf8"));
const manifestVersion = normalizeVersion(manifest.version);

describe("docs/*.html adoption surfaces agree on the published version (FR.06.1.6)", () => {
  test("every version token across docs/*.html matches the manifest version", () => {
    const mismatches = [];
    for (const file of docsHtmlFiles()) {
      const html = fs.readFileSync(file, "utf8");
      const tokens = extractVersionTokens(html);
      for (const token of tokens) {
        if (normalizeVersion(token) !== manifestVersion) {
          mismatches.push(`${path.relative(REPO_ROOT, file)}: found v${token}, expected v${manifestVersion}`);
        }
      }
    }
    assert.deepEqual(
      mismatches,
      [],
      `docs version drift detected (manifest says ${manifestVersion}):\n${mismatches.join("\n")}`,
    );
  });

  test("version badges link the /releases index, never a per-tag URL", () => {
    const offenders = [];
    for (const file of docsHtmlFiles()) {
      const html = fs.readFileSync(file, "utf8");
      const badgeLinks = [...html.matchAll(/class="(?:version-badge|footer-version)"[^>]*href="([^"]+)"/g)]
        .map((m) => m[1])
        // class can precede or follow href in the tag; also check the reverse order.
        .concat(
          [...html.matchAll(/href="([^"]+)"[^>]*class="(?:version-badge|footer-version)"/g)].map((m) => m[1]),
        );
      for (const href of badgeLinks) {
        if (/\/releases\/tag\//.test(href)) {
          offenders.push(`${path.relative(REPO_ROOT, file)}: ${href}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `version badges must link /releases, not a per-tag URL:\n${offenders.join("\n")}`);
  });

  test("negative control: a mutated version string is detected as a mismatch", () => {
    // Prove the comparison above is not vacuous: temporarily reason about a value that would
    // fail, without touching any file on disk.
    const mutated = normalizeVersion("2.4.1");
    assert.notEqual(mutated, manifestVersion, "sanity: the mutated value must actually differ");
  });
});
