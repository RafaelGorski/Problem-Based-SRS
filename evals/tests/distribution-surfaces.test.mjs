// The project makes a public, checkable claim: "we guard against drift, and here is
// the dashboard that proves it". That proof was generated, committed, and published
// by GitHub Pages — and linked from nowhere. A reader evaluating the project could
// not reach it, so the claim was unverifiable at exactly the moment it mattered.
//
// The same is true of distribution: the skills are listed on skills.sh and the graph
// UI installs as a separate canvas extension, but neither path was written down, so a
// reader who wanted the app had no way to get it.
//
// These are link assertions rather than behavior assertions on purpose: the failure
// mode being guarded is a link silently disappearing during an unrelated edit.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const README = read("README.md");
const LANDING = read("docs/index.html");
const DOCS_PAGE = read("docs/docs.html");

/** Every href="..." / href='...' value in a chunk of HTML. */
export function hrefs(html) {
  return [...html.matchAll(/href\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
}

/** Every markdown link target: [text](target). */
export function markdownLinkTargets(md) {
  return [...md.matchAll(/\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]);
}

/**
 * Extract the <nav>…</nav> and <footer>…</footer> regions. Asserting a link exists
 * "somewhere in the file" is far weaker than asserting it exists in navigation: a
 * link buried in prose is not a route.
 */
export function region(html, tag) {
  const open = html.indexOf(`<${tag}`);
  if (open === -1) return "";
  const close = html.indexOf(`</${tag}>`, open);
  return close === -1 ? "" : html.slice(open, close);
}

const HEALTH_TARGET = "skills-health.html";
const SKILLS_SH = "skills.sh/rafaelgorski/problem-based-srs";
const EXTENSION_TREE_PATH = ".github/extensions/srs-navigator";

describe("skills health dashboard is reachable", () => {
  it("is published as a real file the links can resolve to", () => {
    assert.ok(
      fs.existsSync(path.join(repoRoot, "docs", HEALTH_TARGET)),
      "docs/skills-health.html must be committed — GitHub Pages serves /docs from main, " +
        "so an uncommitted dashboard is a 404 behind every link asserted below",
    );
    assert.ok(
      fs.existsSync(path.join(repoRoot, "docs/skills-health.json")),
      "the machine-readable snapshot must be committed alongside the page",
    );
  });

  it("is linked from the landing page navigation", () => {
    const nav = region(LANDING, "nav");
    assert.notEqual(nav, "", "docs/index.html must have a <nav>");
    assert.ok(
      hrefs(nav).some((h) => h.includes(HEALTH_TARGET)),
      `the landing page <nav> must link ${HEALTH_TARGET}; found: ${hrefs(nav).join(", ")}`,
    );
  });

  it("is linked from the landing page footer", () => {
    const footer = region(LANDING, "footer");
    assert.notEqual(footer, "", "docs/index.html must have a <footer>");
    assert.ok(
      hrefs(footer).some((h) => h.includes(HEALTH_TARGET)),
      `the landing page <footer> must link ${HEALTH_TARGET}`,
    );
  });

  it("is linked from the docs page navigation", () => {
    const nav = region(DOCS_PAGE, "nav");
    assert.ok(
      hrefs(nav).some((h) => h.includes(HEALTH_TARGET)),
      `docs/docs.html <nav> must link ${HEALTH_TARGET} — a reader who lands on the docs ` +
        "page should not have to go back to the home page to find the evidence",
    );
  });

  it("is linked from the README with its published URL", () => {
    assert.ok(
      /rafaelgorski\.github\.io\/Problem-Based-SRS\/skills-health\.html/i.test(README),
      "README.md must link the *published* dashboard URL — a relative repo path is not " +
        "clickable for someone reading the project page on skills.sh or npm",
    );
  });

  it("carries a README badge so the claim is visible above the fold", () => {
    const badgeLine = README.split("\n").find((l) => /!\[Skills Health\]/i.test(l));
    assert.ok(badgeLine, "README.md must carry a Skills Health badge");
    assert.match(
      badgeLine,
      /skills-health\.html/,
      "the badge must link the dashboard, not just render an image",
    );
  });

  it("the landing page link is a plain in-repo route, not an external redirect", () => {
    const nav = region(LANDING, "nav");
    const link = hrefs(nav).find((h) => h.includes(HEALTH_TARGET));
    assert.ok(
      !/^https?:/i.test(link),
      `the nav link must stay site-relative (${link}) so it works on a preview deploy ` +
        "and on a local static server, not only on the production domain",
    );
  });
});

describe("distribution paths are documented", () => {
  it("names the skills.sh listing in the README", () => {
    assert.ok(
      markdownLinkTargets(README).some((t) => t.includes(SKILLS_SH)),
      `README.md must link ${SKILLS_SH} — the CLI command alone does not tell a reader ` +
        "the project has a browsable listing",
    );
  });

  it("names the skills.sh listing on the landing page", () => {
    assert.ok(
      hrefs(LANDING).some((h) => h.includes(SKILLS_SH)),
      `docs/index.html must link ${SKILLS_SH}`,
    );
  });

  it("keeps the AgentSkills CLI command alongside the listing", () => {
    assert.match(
      README,
      /npx skills add RafaelGorski\/Problem-Based-SRS/,
      "the one-line install command must survive next to the listing link",
    );
  });

  it("documents an install path for the canvas extension in the README", () => {
    assert.ok(
      README.includes(`tree/main/${EXTENSION_TREE_PATH}`),
      "README.md must give an install-from-repo URL for the SRS Navigator extension: " +
        "pointing at the source directory tells a reader where the code lives, not how " +
        "to get the app running",
    );
    assert.match(
      README,
      /~\/\.copilot\/extensions\//,
      "README.md must name the personal extensions directory for a manual install",
    );
  });

  it("documents an install path for the canvas extension on the landing page", () => {
    assert.ok(
      LANDING.includes(`tree/main/${EXTENSION_TREE_PATH}`),
      "docs/index.html must give the same install-from-repo URL",
    );
  });

  it("tells the reader what to run once the extension is installed", () => {
    for (const [name, text] of [["README.md", README], ["docs/index.html", LANDING]]) {
      assert.match(
        text,
        /\/live/,
        `${name} must name the /live entry point — an installed extension the reader ` +
          "cannot open is not installed",
      );
    }
  });

  it("offers a file-based fallback that matches what the release workflow publishes", () => {
    const packager = read("scripts/package-extension.mjs");
    assert.match(packager, /\.zip/, "the packager must still produce a .zip");
    assert.match(
      README,
      /srs-navigator-<version>\.zip/,
      "the documented archive name must match the artifact the release actually attaches",
    );
  });
});

describe("negative canaries", () => {
  it("region() returns empty for a missing tag rather than matching the whole file", () => {
    assert.equal(region("<div>no nav here</div>", "nav"), "");
    assert.equal(region("<nav><a href='x'>y</a>", "nav"), "", "unclosed tag is not a region");
  });

  it("hrefs() ignores text that merely mentions a path", () => {
    assert.deepEqual(hrefs("<p>see skills-health.html for details</p>"), []);
    assert.deepEqual(hrefs('<a href="skills-health.html">x</a>'), ["skills-health.html"]);
  });

  it("markdownLinkTargets() ignores bare URLs and code spans", () => {
    assert.deepEqual(markdownLinkTargets("visit https://skills.sh/x directly"), []);
    assert.deepEqual(markdownLinkTargets("`[a](b)` in code still parses"), ["b"]);
    assert.deepEqual(markdownLinkTargets("[listing](https://skills.sh/x)"), [
      "https://skills.sh/x",
    ]);
  });

  it("a nav that lost the health link fails the same assertion this suite makes", () => {
    const stripped = region(LANDING, "nav").replaceAll(HEALTH_TARGET, "index.html");
    assert.ok(
      !hrefs(stripped).some((h) => h.includes(HEALTH_TARGET)),
      "the check must actually notice when the link is gone",
    );
  });
});
