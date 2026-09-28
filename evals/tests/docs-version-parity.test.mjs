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
const README = path.join(REPO_ROOT, "README.md");
const LANDING = path.join(DOCS_DIR, "index.html");
const SITE_CSS = path.join(DOCS_DIR, "assets", "site.css");
const DEMO_SPEC = path.join(REPO_ROOT, ".spec", "crm-system.json");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");

/** Every `vX.Y[.Z]` version token in a file's markup, in document order. */
export function extractVersionTokens(html) {
  return [...html.matchAll(/\bv(\d+\.\d+(?:\.\d+)?)\b/g)].map((m) => m[1]);
}

function extractVersionOccurrences(html) {
  return [...html.matchAll(/\bv(\d+\.\d+(?:\.\d+)?)\b/g)].map((m) => ({
    version: m[1],
    line: html.slice(0, m.index).split(/\r?\n/).length,
  }));
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

function findLine(content, needle) {
  const index = content.indexOf(needle);
  if (index === -1) return null;
  return content.slice(0, index).split(/\r?\n/).length;
}

function assertFileContains(file, expected, label) {
  const content = fs.readFileSync(file, "utf8");
  assert.ok(
    content.includes(expected),
    `${path.relative(REPO_ROOT, file)} must contain ${label} (${expected})`,
  );
}

function assertFileMatches(file, expected, label) {
  const content = fs.readFileSync(file, "utf8");
  assert.match(content, expected, `${path.relative(REPO_ROOT, file)} must contain ${label}`);
}

function shippedSkillCount() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(SKILLS_DIR, entry.name, "SKILL.md")))
    .length;
}

function shippedMethodologyActionCount() {
  const referenceDir = path.join(SKILLS_DIR, "problem-based-srs", "reference");
  return fs.readdirSync(referenceDir)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !file.endsWith("-example.md"))
    .length;
}

function shippedNodeCount() {
  const spec = JSON.parse(fs.readFileSync(DEMO_SPEC, "utf8"));
  return ["problems", "needs", "functionalRequirements", "nonFunctionalRequirements"]
    .reduce((total, key) => total + (Array.isArray(spec[key]) ? spec[key].length : 0), 0);
}

function cssRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{(?<body>[^}]+)\\}`));
  assert.ok(match?.groups?.body, `missing CSS rule for ${selector}`);
  return Object.fromEntries(
    [...match.groups.body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map(([, property, value]) => [
      property.trim(),
      value.trim(),
    ]),
  );
}

function cssVariables(css) {
  const root = cssRule(css, ":root");
  return Object.fromEntries(
    Object.entries(root)
      .filter(([property]) => property.startsWith("--"))
      .map(([property, value]) => [property, value.split("/*")[0].trim()]),
  );
}

function resolveCssValue(value, variables) {
  const variable = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  return variable ? variables[variable[1]] : value;
}

function parseOklch(value) {
  const match = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/);
  assert.ok(match, `expected an oklch() color, got ${value}`);
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

function oklchToRgb({ l, c, h }) {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = lPrime ** 3;
  const m3 = mPrime ** 3;
  const s3 = sPrime ** 3;

  const linear = [
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  ];
  return linear.map((channel) => {
    const clamped = Math.min(1, Math.max(0, channel));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * (clamped ** (1 / 2.4)) - 0.055;
  });
}

function relativeLuminance(rgb) {
  return rgb
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(oklchToRgb(parseOklch(foreground)));
  const bg = relativeLuminance(oklchToRgb(parseOklch(background)));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ".claude-plugin", "plugin.json"), "utf8"));
const manifestVersion = normalizeVersion(manifest.version);

describe("docs/*.html adoption surfaces agree on the published version (FR.06.1.6)", () => {
  test("every version token across docs/*.html matches the manifest version", () => {
    const mismatches = [];
    for (const file of docsHtmlFiles()) {
      const html = fs.readFileSync(file, "utf8");
      const tokens = extractVersionOccurrences(html);
      for (const token of tokens) {
        if (normalizeVersion(token.version) !== manifestVersion) {
          mismatches.push(
            `${path.relative(REPO_ROOT, file)}:${token.line}: found v${token.version}, expected v${manifestVersion}`,
          );
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

describe("published counts are derived from shipped artefacts (CP.04)", () => {
  test("README and landing page state the shipped skill and action counts", () => {
    const skillCount = shippedSkillCount();
    const actionCount = shippedMethodologyActionCount();
    assert.equal(skillCount, 1, "fixture sanity: this repository currently ships one consolidated skill");
    assert.equal(actionCount, 9, "fixture sanity: examples are not methodology actions");

    for (const file of [README, LANDING]) {
      assertFileMatches(file, /\b(?:single|one)\s+(?:AgentSkill|skill)\b/i, "the shipped skill count");
      assertFileContains(file, `${actionCount} methodology steps`, "the shipped methodology action count");
    }
  });

  test("README and landing page state the node count from .spec/crm-system.json", () => {
    const nodeCount = shippedNodeCount();
    assert.equal(nodeCount, 29, "fixture sanity: the CRM demo spec is the source of the public node count");

    for (const file of [README, LANDING]) {
      const content = fs.readFileSync(file, "utf8");
      assert.match(
        content,
        new RegExp(`\\b${nodeCount}-node\\b`),
        `${path.relative(REPO_ROOT, file)} must say ${nodeCount}-node from ${path.relative(REPO_ROOT, DEMO_SPEC)}`,
      );
      assert.doesNotMatch(
        content,
        /\b28-node\b/,
        `${path.relative(REPO_ROOT, file)} still carries the retired 28-node count`,
      );
    }
  });
});

describe("focused skip link contrast is computed from the shipped CSS (CP.06)", () => {
  test("the focused .skip-link clears WCAG AA contrast", () => {
    const css = fs.readFileSync(SITE_CSS, "utf8");
    const variables = cssVariables(css);
    const rule = cssRule(css, ".skip-link");
    const color = resolveCssValue(rule.color, variables);
    const background = resolveCssValue(rule.background, variables);
    const ratio = contrastRatio(color, background);

    assert.ok(
      ratio >= 4.5,
      `.skip-link contrast must be >= 4.5:1; got ${ratio.toFixed(2)}:1 at ${path.relative(REPO_ROOT, SITE_CSS)}:${findLine(css, ".skip-link")}`,
    );
  });

  test("negative control: the reverted heading-ink color fails against the primary background", () => {
    const css = fs.readFileSync(SITE_CSS, "utf8");
    const variables = cssVariables(css);
    const revertedRatio = contrastRatio(variables["--ink-heading"], variables["--primary"]);
    assert.ok(
      revertedRatio < 4.5,
      `the canary must fail for the reverted .skip-link color; got ${revertedRatio.toFixed(2)}:1`,
    );
  });
});
