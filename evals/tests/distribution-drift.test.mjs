// Three passes on #69 (#72, #73, #74) each took a box labelled "cannot be asserted in
// CI" and found the half that could. This is the last of them, and the pattern that kept
// it open is the same one #73 had to disprove for the canvas archive: presence is not
// function.
//
// `distribution-surfaces.test.mjs` asserts the skills.sh link and the release links
// *exist*. It never asks whether what they point at agrees with this repository. So both
// of these were green in CI for months while being false:
//
//   * README.md's first badge linked .../releases/tag/v2.6.0 — a tag that was never
//     pushed. The manifest was bumped twice without the release being cut, so the first
//     clickable thing on the repository page was a 404.
//   * The skills.sh listing still advertises the nine pre-#50 skills. The repository has
//     had one since that consolidation, so eight of the nine names resolve to nothing —
//     and the page's own counters put 70 of 101 installs on those eight names.
//
// What is guarded here is the *comparison*, not the third-party state: nobody can make a
// PR refresh someone else's cache, but a checker can stop the drift from being invisible.
// The network lives in .github/workflows/distribution-drift.yml. This suite is offline: it
// feeds the checker a verbatim capture of the real listing and the repository's own files.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseRegistryListing,
  repoSkillNames,
  advertisedRegistryUrl,
  listingDrift,
  advertisedTagLinks,
  danglingTagLinks,
  normalizeVersion,
  compareVersions,
  pluginReleaseTag,
  releaseTrain,
  PLUGIN_CHANGELOG,
  releaseDrift,
  summarize,
  renderReport,
  renderAnnotations,
  fetchPublishedTags,
  fetchPublishedReleases,
  main,
  REGISTRY_URL,
  REPO,
} from "../../scripts/check-distribution.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const LISTING_FIXTURE = read("evals/fixtures/skills-sh-listing-2026-07-31.html");
const README = read("README.md");
const CHANGELOG = read("CHANGELOG.md");
const CHECKER = read("scripts/check-distribution.mjs");

/** The tags that actually existed when this suite was written (git ls-remote --tags). */
const PUBLISHED_TAGS = [
  "v1.0.0",
  "v1.1",
  "v1.1.0",
  "v1.2",
  "v1.3",
  "v1.4",
  "v2.0",
  "v2.1",
  "v2.2",
  "v2.3",
  "v2.4",
  "v2.4.1",
];

/**
 * The same releases with the titles their workflows gave them (gh release list, verbatim).
 * The two trains are indistinguishable by tag — v2.4.1 is a *plugin* release and v1.1.0 is
 * a *canvas* one — so the title is the only thing that separates them.
 */
const PUBLISHED_RELEASES = [
  { tag: "v2.4.1", name: "🎉 Version 2.4.1" },
  { tag: "v2.4", name: "🎉 Version 2.4" },
  { tag: "v2.3", name: "🎉 Version 2.3" },
  { tag: "v2.2", name: "🎉 Version 2.2" },
  { tag: "v2.1", name: "🎉 Version 2.1" },
  { tag: "v1.1.0", name: "srs-navigator 1.1.0" },
  { tag: "v2.0", name: "🎉 Version 2.0" },
  { tag: "v1.4", name: "🎉 Version 1.4" },
  { tag: "v1.3", name: "🎉 Version 1.3" },
  { tag: "v1.2", name: "🎉 Version 1.2 - Business Context Iteration" },
  { tag: "v1.1", name: "Release 1.1 - Complexity Analysis & Enhanced Methodology" },
  { tag: "v1.0.0", name: "Problem-Based SRS v1.0" },
];


describe("the registry listing declares a machine-readable skill set", () => {
  it("reads the CollectionPage block, not the other JSON-LD on the page", () => {
    const listing = parseRegistryListing(LISTING_FIXTURE);
    assert.ok(
      LISTING_FIXTURE.includes('"@type":"BreadcrumbList"') &&
        LISTING_FIXTURE.includes('"@type":"WebSite"'),
      "the fixture must keep the decoy blocks, or this assertion proves nothing",
    );
    assert.ok(
      !listing.skills.includes("Skills"),
      "'Skills' is a breadcrumb label — picking the wrong block would surface it as a skill",
    );
    assert.equal(listing.url, REGISTRY_URL);
  });

  it("returns the skill names the page advertises, in page order", () => {
    const { skills } = parseRegistryListing(LISTING_FIXTURE);
    assert.deepEqual(skills, [
      "problem-based-srs",
      "functional-requirements",
      "business-context",
      "customer-problems",
      "software-vision",
      "zigzag-validator",
      "complexity-analysis",
      "customer-needs",
      "software-glance",
    ]);
  });

  it("reads the count the page states about itself", () => {
    const listing = parseRegistryListing(LISTING_FIXTURE);
    assert.equal(listing.declaredCount, 9);
    assert.equal(
      listing.declaredCount,
      listing.skills.length,
      "the page's prose count and its structured list must agree, or the parser picked " +
        "up a partial payload",
    );
  });
});

describe("the repository's real skill set is derived, not restated", () => {
  it("comes from the frontmatter of every skills/*/SKILL.md", () => {
    const names = repoSkillNames(repoRoot);
    assert.deepEqual(
      names,
      ["problem-based-srs"],
      "since #50 the methodology is one skill; if that ever changes, this comparison's " +
        "input must move with the repository rather than needing a test edit",
    );
  });

  it("agrees with the directory each skill lives in", () => {
    const dirs = fs
      .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    assert.deepEqual(
      repoSkillNames(repoRoot),
      dirs,
      "AgentSkills requires name === directory; a mismatch would make the registry " +
        "comparison compare the wrong thing",
    );
  });
});

describe("the registry it watches is the one the project advertises", () => {
  it("takes the listing URL from the README rather than a second copy of it", () => {
    const url = advertisedRegistryUrl([{ file: "README.md", text: README }]);
    assert.match(
      url,
      /^https:\/\/(www\.)?skills\.sh\/rafaelgorski\/problem-based-srs$/,
      "the monitor must fetch the page readers are actually sent to — hard-coding the " +
        "address would let the README point somewhere the check never looks",
    );
    assert.ok(
      README.includes(url),
      `${url} must appear verbatim in README.md, or it was not derived from it`,
    );
  });

  it("falls back to the canonical URL when a document names no listing", () => {
    assert.equal(advertisedRegistryUrl([{ file: "x.md", text: "no links here" }]), REGISTRY_URL);
    assert.equal(advertisedRegistryUrl([]), REGISTRY_URL);
  });

  it("does not swallow the punctuation around a markdown link", () => {
    assert.equal(
      advertisedRegistryUrl([
        { file: "x.md", text: "see [listing](https://skills.sh/a/b) for more." },
      ]),
      "https://skills.sh/a/b",
    );
    assert.equal(
      advertisedRegistryUrl([{ file: "x.html", text: '<a href="https://skills.sh/a/b">x</a>' }]),
      "https://skills.sh/a/b",
    );
  });
});

describe("listing drift — the comparison nothing was making", () => {
  it("reports the eight skills the listing still advertises and the repo deleted", () => {
    const drift = listingDrift({
      listed: parseRegistryListing(LISTING_FIXTURE).skills,
      actual: repoSkillNames(repoRoot),
    });
    assert.equal(drift.inSync, false);
    assert.deepEqual(drift.phantom, [
      "business-context",
      "complexity-analysis",
      "customer-needs",
      "customer-problems",
      "functional-requirements",
      "software-glance",
      "software-vision",
      "zigzag-validator",
    ]);
    assert.deepEqual(
      drift.missing,
      [],
      "the one skill the repository does have is listed — the drift is all in one direction",
    );
  });

  it("reports a skill the repository ships that the listing never picked up", () => {
    const drift = listingDrift({
      listed: ["problem-based-srs"],
      actual: ["problem-based-srs", "something-new"],
    });
    assert.deepEqual(drift.missing, ["something-new"]);
    assert.deepEqual(drift.phantom, []);
    assert.equal(drift.inSync, false);
  });

  it("is silent when the two agree", () => {
    const drift = listingDrift({ listed: ["a", "b"], actual: ["b", "a"] });
    assert.equal(drift.inSync, true, "order is not drift");
    assert.deepEqual(drift.phantom, []);
    assert.deepEqual(drift.missing, []);
  });
});

describe("release links the repository publishes", () => {
  const sources = () => [
    { file: "README.md", text: README },
    { file: "CHANGELOG.md", text: CHANGELOG },
  ];

  it("finds every per-tag release URL, with the file and line that carries it", () => {
    const links = advertisedTagLinks(sources());
    assert.ok(links.length >= 13, `expected the changelog's tag links, found ${links.length}`);
    const v241 = links.find((l) => l.tag === "v2.4.1");
    assert.ok(v241, "the changelog links every released version");
    assert.equal(v241.file, "CHANGELOG.md");
    assert.ok(v241.line > 0, "a finding without a line number is not actionable");
  });

  it("keeps the README version badge off a per-tag URL", () => {
    const badge = README.split("\n").find((l) => /!\[Version /.test(l));
    assert.ok(badge, "README.md must carry a version badge");
    const links = advertisedTagLinks([{ file: "README.md", text: badge }]);
    assert.deepEqual(
      links,
      [],
      "the badge's version comes from .claude-plugin/plugin.json, which this project's " +
        "documented process bumps *before* the tag is pushed. Linking a per-tag URL " +
        "therefore 404s for the whole window between bump and release — it did, for two " +
        "consecutive versions. docs/index.html already links the /releases index; the " +
        "README badge must too.",
    );
    assert.match(
      badge,
      /https:\/\/github\.com\/RafaelGorski\/Problem-Based-SRS\/releases\)/,
      "the badge must still be clickable — pointing at the releases index, not nowhere",
    );
  });

  it("flags the links that name a release nobody ever published", () => {
    const dangling = danglingTagLinks(advertisedTagLinks(sources()), PUBLISHED_TAGS);
    const tags = [...new Set(dangling.map((l) => l.tag))].sort();
    for (const expected of ["v2.5", "v2.6"]) {
      assert.ok(
        tags.includes(expected),
        `${expected} must be reported: CHANGELOG.md dates a section for it and links its ` +
          `tag, but neither tag exists — the manifest was bumped twice and the release ` +
          `workflow never ran. (These read v2.5.0/v2.6.0 until the pipeline's own ` +
          `normalization showed the release would be cut at v2.5/v2.6.) Found: ` +
          tags.join(", "),
      );
    }
    assert.ok(
      !tags.includes("v2.4.1"),
      "containment, not equality: every future release adds another changelog link, and " +
        "this suite must not go red because correct work happened",
    );
  });

  it("every link to an already-shipped release resolves", () => {
    // The pending-release links (v2.5.0, v2.6.0) are a maintainer action — a tag push, not
    // an edit. A link to a version *older* than the newest published release has no such
    // excuse: it is a typo, and it is permanently broken. `[1.0]` pointed at v1.0 for the
    // project's entire life; the tag has always been v1.0.0, and
    //   /releases/tag/v1.0   → 404
    //   /releases/tag/v1.0.0 → 200
    // (verified 2026-07-31). Normalized matching had hidden it.
    const newest = "2.4.1";
    const stale = danglingTagLinks(advertisedTagLinks(sources()), PUBLISHED_TAGS).filter(
      (l) => compareVersions(normalizeVersion(l.tag), newest) <= 0,
    );
    assert.deepEqual(
      stale.map((l) => `${l.file}:${l.line} ${l.tag}`),
      [],
      "a link naming a version at or below the newest published release must resolve — " +
        "no unpushed tag can explain it",
    );
  });

  it("is silent when every advertised tag has a release behind it", () => {
    const links = advertisedTagLinks([
      {
        file: "CHANGELOG.md",
        text: "[2.4]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.4",
      },
    ]);
    assert.equal(links.length, 1, "the link must be this repository's, or nothing is proved");
    assert.deepEqual(danglingTagLinks(links, ["v2.4"]), []);
  });

  it("compares tags exactly, because that is how GitHub serves them", () => {
    const links = advertisedTagLinks([
      {
        file: "x.md",
        text: "https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.4.0",
      },
    ]);
    assert.equal(
      danglingTagLinks(links, ["v2.4"]).length,
      1,
      "/releases/tag/v2.4.0 returns 404 even though release 2.4.0 is published as v2.4 — " +
        "normalizing here would call a genuinely broken link healthy",
    );
    assert.deepEqual(danglingTagLinks(links, ["v2.4.0"]), []);
  });

  it("leaves other repositories' release links alone", () => {
    const links = advertisedTagLinks([
      { file: "README.md", text: "https://github.com/github/spec-kit/releases/tag/v9.9.9" },
    ]);
    assert.equal(links.length, 1, "the link is still extracted…");
    assert.deepEqual(
      danglingTagLinks(links, PUBLISHED_TAGS),
      [],
      "…but another project's releases are not ours to publish; reporting them would be " +
        "a false finding the moment the README links a tagged release elsewhere",
    );
  });
});

describe("release drift between the two release trains", () => {
  it("reports a manifest version that was never released", () => {
    const drift = releaseDrift({
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      tags: PUBLISHED_TAGS,
    });
    assert.equal(drift.plugin.advertised, "2.6.0");
    assert.equal(drift.plugin.published, false);
    assert.equal(drift.plugin.matchedTag, null);
    assert.equal(
      drift.newest,
      "v2.4.1",
      "the report has to name what a visitor actually finds on the releases page",
    );
  });

  it("does not report the canvas train, which is published", () => {
    const drift = releaseDrift({
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      tags: PUBLISHED_TAGS,
    });
    assert.equal(drift.canvas.published, true);
    assert.equal(drift.canvas.matchedTag, "v1.1.0");
  });

  it("accepts the plugin train's two-part tags for a three-part manifest", () => {
    assert.equal(normalizeVersion("v2.4"), "2.4.0");
    assert.equal(normalizeVersion("2.4.0"), "2.4.0");
    const drift = releaseDrift({
      manifestVersion: "2.4.0",
      canvasVersion: "1.1.0",
      tags: PUBLISHED_TAGS,
    });
    assert.equal(
      drift.plugin.matchedTag,
      "v2.4",
      "build-plugin.py stores X.Y as X.Y.0 and tags vX.Y — treating those as different " +
        "releases would make this checker cry wolf on every plugin release ever cut",
    );
  });

  it("does not let a plugin tag satisfy the canvas train", () => {
    // VERSION is 1.1.0, so the next canvas minor is 1.2.0 — and v1.2 already exists as a
    // *plugin* release. Matching by normalized version would silence exactly the case this
    // checker exists for: bumped, tagged nowhere.
    const drift = releaseDrift({
      manifestVersion: "2.6.0",
      canvasVersion: "1.2.0",
      tags: PUBLISHED_TAGS,
    });
    assert.ok(PUBLISHED_TAGS.includes("v1.2"), "the collision must actually be present");
    assert.equal(drift.canvas.published, false);
    assert.equal(drift.canvas.matchedTag, null);
  });
});

describe("the tag the release pipeline actually creates", () => {
  it("strips the trailing .0 that build-plugin.py strips", () => {
    // create-release.yml: TAG="v${VERSION}" where VERSION is build-plugin.py's *normalized*
    // output. So the manifest's 2.6.0 is published at v2.6 — and /releases/tag/v2.6.0 stays
    // a 404 after the release is cut, because GitHub serves that path by exact tag name.
    assert.equal(pluginReleaseTag("2.6.0"), "v2.6");
    assert.equal(pluginReleaseTag("2.5.0"), "v2.5");
    assert.equal(pluginReleaseTag("2.4.1"), "v2.4.1", "a real patch keeps its third part");
    assert.equal(pluginReleaseTag("v2.6.0"), "v2.6", "a leading v is stripped, as in Python");
    assert.equal(pluginReleaseTag("2.10.0"), "v2.10", "numeric, not lexical");
  });

  it("never strips below two parts", () => {
    assert.equal(pluginReleaseTag("3.0.0"), "v3.0", "v3 would be a different tag entirely");
    assert.equal(pluginReleaseTag("2.0"), "v2.0");
  });

  it("returns null rather than guessing at something that is not a version", () => {
    for (const junk of ["", null, undefined, "latest", "v", "2.x", "srs-navigator"]) {
      assert.equal(pluginReleaseTag(junk), null, `${JSON.stringify(junk)} is not a version`);
    }
  });
});

describe("a release link knows which version it was defined for", () => {
  it("reads the label of a Keep-a-Changelog reference definition", () => {
    const links = advertisedTagLinks([
      {
        file: "CHANGELOG.md",
        text: "[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6",
      },
    ]);
    assert.equal(links.length, 1);
    assert.equal(
      links[0].label,
      "2.6.0",
      "without the version a link claims to be for, 'is this the tag the pipeline " +
        "creates?' is unanswerable",
    );
  });

  it("leaves a prose link unlabelled rather than guessing", () => {
    const links = advertisedTagLinks([
      {
        file: "README.md",
        text: "grab it from [here](https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.1.0)",
      },
    ]);
    assert.equal(links.length, 1);
    assert.equal(
      links[0].label,
      null,
      "an inline link carries no version claim; inventing one would produce a finding " +
        "about a contradiction that was never stated",
    );
  });

  it("labels the changelog links this repository actually ships", () => {
    const links = advertisedTagLinks([{ file: "CHANGELOG.md", text: CHANGELOG }]);
    const labelled = links.filter((l) => l.label);
    assert.ok(
      labelled.length >= 12,
      `the changelog defines a link per release; only ${labelled.length} were labelled`,
    );
  });
});

describe("a dangling link that cutting the release would not fix", () => {
  const sources = () => [
    { file: "README.md", text: README },
    { file: "CHANGELOG.md", text: CHANGELOG },
  ];

  const summaryFor = (tagLinks, publishedReleases = PUBLISHED_RELEASES) =>
    summarize({
      listing: { skills: ["problem-based-srs"], declaredCount: 1, url: REGISTRY_URL },
      repoSkills: ["problem-based-srs"],
      tagLinks,
      publishedReleases,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
    });

  it("is reported apart from a link that is merely waiting for a tag push", () => {
    const summary = summaryFor(
      advertisedTagLinks([
        {
          file: "CHANGELOG.md",
          text: [
            "[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6.0",
            "[2.5.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.5",
          ].join("\n"),
        },
      ]),
    );
    const unpublishable = summary.findings.find((f) => f.id === "unpublishable-release-link");
    assert.ok(
      unpublishable,
      "v2.6.0 names a tag no pipeline in this repository creates. Reporting it beside a " +
        "link that a tag push *would* fix hands the maintainer one instruction that works " +
        "and one that cannot, under a heading that says 'cut the release'.",
    );
    assert.ok(
      unpublishable.detail.some((d) => /links v2\.6\.0\b/.test(d) && /at v2\.6$/.test(d)),
      `the finding must name both the link's tag and the tag the pipeline creates: ` +
        unpublishable.detail.join(" | "),
    );
    const pending = summary.findings.find((f) => f.id === "dangling-release-links");
    assert.ok(pending, "v2.5 is unpublished but well-formed — that is a release to cut");
    assert.ok(
      pending.detail.some((d) => d.includes("v2.5")),
      "the cuttable link stays under the cuttable finding",
    );
    assert.ok(
      !pending.detail.some((d) => d.includes("v2.6.0")),
      "and the unpublishable one does not appear under both",
    );
  });

  it("clears once the link names the tag the pipeline creates", () => {
    const summary = summaryFor(
      advertisedTagLinks([
        {
          file: "CHANGELOG.md",
          text: "[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6",
        },
      ]),
      [...PUBLISHED_RELEASES, { tag: "v2.6", name: "🎉 Version 2.6" }],
    );
    assert.deepEqual(
      summary.findings.map((f) => f.id),
      [],
      "after `git tag v2.6 && git push origin v2.6` the report must go quiet — that is " +
        "the whole point of the last open box on #69",
    );
  });

  it("says nothing about a labelled link that already names the right tag", () => {
    const summary = summaryFor(
      advertisedTagLinks([
        {
          file: "CHANGELOG.md",
          text: "[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6",
        },
      ]),
    );
    assert.equal(
      summary.findings.filter((f) => f.id === "unpublishable-release-link").length,
      0,
      "v2.6 is exactly what the pipeline will create; it is simply not cut yet",
    );
  });

  it("holds for the links this repository ships today", () => {
    const summary = summaryFor(advertisedTagLinks(sources()));
    assert.equal(
      summary.findings.filter((f) => f.id === "unpublishable-release-link").length,
      0,
      "every changelog link must name a tag the release pipeline can create. A link that " +
        "cannot resolve even after the release is cut is an edit, not a release.",
    );
  });

  it("only applies the plugin's tag rule to the plugin train's own changelog", () => {
    // The two trains normalize differently: the plugin strips a trailing `.0`, the canvas
    // tags `v${VERSION}` in full. Applying the plugin rule to a canvas link would call
    // `[1.2.0]: …/tag/v1.2.0` unpublishable and tell the maintainer to edit a link that a
    // canvas release will make resolve — the same cross-train category error the per-train
    // `newest` fix exists to prevent.
    const summary = summarize({
      listing: { skills: ["problem-based-srs"], declaredCount: 1, url: REGISTRY_URL },
      repoSkills: ["problem-based-srs"],
      tagLinks: advertisedTagLinks([
        {
          file: ".github/extensions/srs-navigator/CHANGELOG.md",
          text: "[1.2.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.2.0",
        },
      ]),
      publishedReleases: PUBLISHED_RELEASES,
      manifestVersion: "2.4.1",
      canvasVersion: "1.1.0",
    });
    assert.equal(
      summary.findings.filter((f) => f.id === "unpublishable-release-link").length,
      0,
      "release-canvas.yml tags v1.2.0 verbatim, so that link resolves the moment the " +
        "canvas release is cut. Calling it unpublishable would tell the maintainer to " +
        "break a link that was about to start working.",
    );
    assert.ok(
      summary.findings.some((f) => f.id === "dangling-release-links"),
      "it is still dangling — it is simply a release to cut, not a link to edit",
    );
  });

  it("takes the plugin changelog from the file the release pipeline reads", () => {
    const build = read("scripts/build-plugin.py");
    assert.match(
      build,
      /CHANGELOG\s*=\s*REPO_ROOT\s*\/\s*"CHANGELOG\.md"/,
      "the plugin release notes come from CHANGELOG.md, which is what makes a reference " +
        "definition in that file a *plugin*-train claim. If build-plugin.py reads a " +
        "different file, PLUGIN_CHANGELOG must move with it.",
    );
    assert.equal(
      PLUGIN_CHANGELOG,
      "CHANGELOG.md",
      "the checker must attribute the same file the pipeline does",
    );
    const canvasWorkflow = read(".github/workflows/release-canvas.yml");
    assert.ok(
      !canvasWorkflow.includes("CHANGELOG.md"),
      "and the canvas train must not write to it, or the attribution would be ambiguous",
    );
  });
});

describe("release drift names the right train's newest release", () => {
  it("classifies a release by the title its workflow gave it", () => {
    assert.equal(releaseTrain({ tag: "v1.1.0", name: "srs-navigator 1.1.0" }), "canvas");
    assert.equal(releaseTrain({ tag: "v2.4.1", name: "🎉 Version 2.4.1" }), "plugin");
    assert.equal(
      releaseTrain({ tag: "v1.0.0", name: "Problem-Based SRS v1.0" }),
      "plugin",
      "releases cut before the workflows existed are still the plugin's",
    );
    assert.equal(
      releaseTrain({ tag: "v2.4", name: null }),
      "unknown",
      "with no title the trains are indistinguishable — say so rather than guess",
    );
  });

  it("classifies from the titles the workflows actually emit", () => {
    const canvasWf = read(".github/workflows/release-canvas.yml");
    const pluginWf = read(".github/workflows/create-release.yml");
    assert.match(
      canvasWf,
      /--title "srs-navigator /,
      "releaseTrain() keys off this prefix; if the canvas release title changes, its " +
        "releases start counting as the plugin's and the report misreports both trains",
    );
    assert.match(
      pluginWf,
      /TITLE="🎉 Version /,
      "the plugin train's title is the other half of the same contract",
    );
  });

  it("never cites a plugin release as the canvas train's newest", () => {
    const drift = releaseDrift({
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.1",
      releases: PUBLISHED_RELEASES,
    });
    assert.equal(drift.canvas.published, false, "VERSION is 1.1.1 and no v1.1.1 exists");
    assert.equal(
      drift.canvas.newest,
      "v1.1.0",
      "the newest canvas release is srs-navigator 1.1.0. Reporting v2.4.1 — a *plugin* " +
        "release — as what the canvas train is behind is the category error this module's " +
        "own comment warns about, made in its report instead of its matching.",
    );
    assert.equal(drift.plugin.newest, "v2.4.1");
  });

  it("puts the per-train number in the finding a human reads", () => {
    const summary = summarize({
      listing: { skills: ["problem-based-srs"], declaredCount: 1, url: REGISTRY_URL },
      repoSkills: ["problem-based-srs"],
      tagLinks: [],
      publishedTags: PUBLISHED_TAGS,
      publishedReleases: PUBLISHED_RELEASES,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.1",
    });
    const canvas = summary.findings.find((f) => f.id === "canvas-release-missing");
    assert.ok(canvas, "1.1.1 is not published, so the finding must be raised");
    assert.ok(
      canvas.detail.some((d) => d.includes("v1.1.0")),
      `the canvas finding must name v1.1.0: ${canvas.detail.join(" | ")}`,
    );
    assert.ok(
      !canvas.detail.some((d) => d.includes("v2.4.1")),
      "…and must not name a release from the other train",
    );
    const plugin = summary.findings.find((f) => f.id === "plugin-release-missing");
    assert.ok(
      plugin.detail.some((d) => d.includes("v2.4.1")),
      "the plugin finding still names the newest plugin release",
    );
  });

  it("admits it cannot tell the trains apart when no titles came back", () => {
    const drift = releaseDrift({
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.1",
      tags: PUBLISHED_TAGS,
    });
    assert.equal(drift.canvas.newest, null, "tags alone carry no train");
    assert.equal(drift.plugin.newest, null);
    assert.equal(drift.newest, "v2.4.1", "the overall newest is still knowable");
    assert.equal(drift.classified, false, "and it knows that it could not classify");
  });

  it("tells an empty train apart from an unreadable one", () => {
    const drift = releaseDrift({
      manifestVersion: "2.6.0",
      canvasVersion: "1.0.0",
      releases: [{ tag: "v2.6", name: "🎉 Version 2.6" }],
    });
    assert.equal(drift.canvas.newest, null, "no canvas release exists to be newest");
    assert.equal(
      drift.classified,
      true,
      "but the titles were there and were read — 'no release yet' is not 'cannot tell'",
    );
  });

  it("never falls back to the other train's release for an empty train", () => {
    const summary = summarize({
      listing: { skills: ["problem-based-srs"], declaredCount: 1, url: REGISTRY_URL },
      repoSkills: ["problem-based-srs"],
      tagLinks: [],
      publishedReleases: [
        { tag: "v2.4.1", name: "🎉 Version 2.4.1" },
        { tag: "v2.6", name: "🎉 Version 2.6" },
      ],
      manifestVersion: "2.6.0",
      canvasVersion: "1.0.0",
    });
    const canvas = summary.findings.find((f) => f.id === "canvas-release-missing");
    assert.ok(canvas, "1.0.0 has no canvas release, so the finding stands");
    assert.ok(
      !canvas.detail.some((d) => d.includes("v2.6") || d.includes("v2.4.1")),
      "citing a plugin release as what the canvas train is behind is the exact defect " +
        `this classification exists to prevent: ${canvas.detail.join(" | ")}`,
    );
    assert.ok(
      canvas.detail.some((d) => /no .*canvas release/i.test(d)),
      `it must say the train is empty, not that it is unidentifiable: ${canvas.detail.join(" | ")}`,
    );
  });
});

describe("the summary is what a human is handed", () => {
  const drifted = () =>
    summarize({
      listing: parseRegistryListing(LISTING_FIXTURE),
      repoSkills: repoSkillNames(repoRoot),
      tagLinks: advertisedTagLinks([{ file: "CHANGELOG.md", text: CHANGELOG }]),
      publishedTags: PUBLISHED_TAGS,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
    });

  it("is not ok while any surface disagrees with the repository", () => {
    const summary = drifted();
    assert.equal(summary.ok, false);
    assert.deepEqual(
      summary.findings.map((f) => f.id).sort(),
      ["dangling-release-links", "plugin-release-missing", "registry-listing-drift"],
      "the canvas train is published, so it must not be reported",
    );
  });

  it("is ok when every surface agrees", () => {
    const summary = summarize({
      listing: { skills: ["problem-based-srs"], declaredCount: 1, url: REGISTRY_URL },
      repoSkills: ["problem-based-srs"],
      tagLinks: [],
      publishedTags: ["v2.6.0", "v1.1.0"],
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
    });
    assert.equal(summary.ok, true);
    assert.deepEqual(summary.findings, []);
  });

  it("renders a report that names the offenders, not just a count", () => {
    const md = renderReport(drifted());
    assert.match(md, /zigzag-validator/, "a report that omits the names is not actionable");
    assert.match(md, /2\.6\.0/, "the version the manifest advertises");
    assert.match(md, /v2\.6\b/, "and the tag the pipeline would publish it at");
    assert.match(md, /CHANGELOG\.md:\d+/, "findings must carry file:line");
  });

  it("emits a workflow annotation per finding, so warnings are not invisible", () => {
    const lines = renderAnnotations(drifted());
    assert.equal(lines.length, drifted().findings.length);
    assert.ok(
      lines.every((l) => l.startsWith("::error::") || l.startsWith("::warning::")),
      "a warning-only run exits 0, so the Actions UI is the only place it can be seen",
    );
    assert.deepEqual(renderAnnotations({ findings: [] }), []);
  });

  it("separates 'something disagrees' from 'something could not be read'", () => {
    const unreachable = summarize({
      listing: { skills: [], declaredCount: null, url: REGISTRY_URL },
      repoSkills: ["problem-based-srs"],
      tagLinks: [],
      publishedTags: [],
      manifestVersion: null,
      canvasVersion: null,
      errors: [{ surface: "registry", message: "getaddrinfo ENOTFOUND" }],
    });
    assert.equal(unreachable.ok, false, "the run still has something to say");
    assert.equal(
      unreachable.drifted,
      false,
      "a 503 from a registry is not evidence that its listing is wrong; failing on it " +
        "trains the maintainer to ignore this report",
    );
    assert.ok(unreachable.findings.every((f) => f.severity === "warning"));
    assert.equal(
      unreachable.findings.filter((f) => f.id === "registry-listing-unreadable").length,
      0,
      "the fetch error already explains the empty listing — two findings for one cause " +
        "reads as two problems",
    );
    assert.equal(drifted().drifted, true, "real disagreement must still be an error");
  });

  it("refuses to compare a listing the page says is incomplete", () => {
    const summary = summarize({
      listing: { skills: ["problem-based-srs"], declaredCount: 9, url: REGISTRY_URL },
      repoSkills: ["problem-based-srs"],
      tagLinks: [],
      publishedTags: ["v2.6.0", "v1.1.0"],
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
    });
    assert.deepEqual(
      summary.findings.map((f) => f.id),
      ["registry-listing-partial"],
      "a truncated payload that happens to match the repo would otherwise print 'every " +
        "surface agrees' while the live page still advertises the dead names",
    );
    assert.equal(summary.drifted, false, "a partial read is a warning, not a verdict");
  });
});

describe("the exit code the workflow depends on", () => {
  const stubFetch = ({ listingHtml, releases }) =>
    async (url) => {
      if (String(url).includes("api.github.com")) {
        if (releases instanceof Error) throw releases;
        return { ok: true, status: 200, json: async () => releases };
      }
      if (listingHtml instanceof Error) throw listingHtml;
      return { ok: true, status: 200, text: async () => listingHtml };
    };

  it("is 1 under --strict when a surface really disagrees", async () => {
    const code = await main(["--strict"], {
      fetchImpl: stubFetch({
        listingHtml: LISTING_FIXTURE,
        releases: PUBLISHED_TAGS.map((t) => ({ tag_name: t, draft: false })),
      }),
      env: {},
      root: repoRoot,
    });
    assert.equal(code, 1);
  });

  it("is 0 under --strict when both surfaces are merely unreachable", async () => {
    const code = await main(["--strict"], {
      fetchImpl: stubFetch({
        listingHtml: new Error("ENOTFOUND"),
        releases: new Error("502"),
      }),
      env: {},
      root: repoRoot,
    });
    assert.equal(
      code,
      0,
      "a network hiccup must not turn the weekly run red — the warning is still printed " +
        "and annotated, but nothing is being claimed about drift",
    );
  });

  it("is 0 without --strict even when everything has drifted", async () => {
    const code = await main([], {
      fetchImpl: stubFetch({
        listingHtml: LISTING_FIXTURE,
        releases: PUBLISHED_TAGS.map((t) => ({ tag_name: t, draft: false })),
      }),
      env: {},
      root: repoRoot,
    });
    assert.equal(code, 0, "the plain report is for humans; only the workflow opts into failing");
  });

  it("ignores draft releases, which nobody can download", async () => {
    const tags = await fetchPublishedTags({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => [
          { tag_name: "v2.6.0", draft: true },
          { tag_name: "v2.4.1", draft: false },
          { tag_name: null, draft: false },
        ],
      }),
    });
    assert.deepEqual(
      tags,
      ["v2.4.1"],
      "a draft is visible to the maintainer and to nobody else; counting it would report " +
        "a release as published while every link to it 404s for readers",
    );
  });

  it("carries the release titles through, or the trains cannot be told apart", async () => {
    const releases = await fetchPublishedReleases({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => [
          { tag_name: "v2.4.1", name: "🎉 Version 2.4.1", draft: false },
          { tag_name: "v1.1.0", name: "srs-navigator 1.1.0", draft: false },
          { tag_name: "v9.9.9", name: "draft", draft: true },
        ],
      }),
    });
    assert.deepEqual(releases, [
      { tag: "v2.4.1", name: "🎉 Version 2.4.1" },
      { tag: "v1.1.0", name: "srs-navigator 1.1.0" },
    ]);
    assert.deepEqual(
      releases.map(releaseTrain),
      ["plugin", "canvas"],
      "dropping the title is what let the report tell the canvas train it was behind a " +
        "plugin release",
    );
  });

  it("reports the canvas train against a canvas release end to end", async () => {
    // Staged rather than run against this checkout: the assertion is about what the report
    // *says* when a canvas version is unpublished, and tying that to the repository's own
    // health made the test pass only while the repository was broken — it went red the moment
    // VERSION was reset to the published 1.1.0. The drift belongs in the fixture.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "srs-drift-"));
    try {
      fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
      fs.writeFileSync(
        path.join(root, ".claude-plugin/plugin.json"),
        JSON.stringify({ name: "problem-based-srs", version: "2.6.0" }),
      );
      fs.writeFileSync(path.join(root, "VERSION"), "1.1.1\n");

      const lines = [];
      const log = console.log;
      console.log = (...args) => lines.push(args.join(" "));
      try {
        await main([], {
          fetchImpl: stubFetch({
            listingHtml: LISTING_FIXTURE,
            releases: PUBLISHED_RELEASES.map((r) => ({
              tag_name: r.tag,
              name: r.name,
              draft: false,
            })),
          }),
          env: {},
          root,
        });
      } finally {
        console.log = log;
      }
      const report = lines.join("\n");
      const canvas = report.slice(report.indexOf("canvas app advertises"));
      assert.ok(report.includes("canvas app advertises"), "the canvas finding must be reported");
      assert.ok(
        canvas.includes("v1.1.0"),
        `the CLI must reach the classifier, not just the unit tests: ${canvas.slice(0, 300)}`,
      );
      assert.ok(
        !canvas.slice(0, canvas.indexOf("\n##") + 1 || undefined).includes("v2.4.1"),
        "and it must never cite a plugin release as what the canvas app is behind",
      );
      assert.ok(
        canvas.includes("v1.1.2"),
        "the advice must name the version a release would actually publish, since running " +
          "release-canvas.yml bumps past 1.1.1 rather than publishing it",
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the checker actually runs somewhere", () => {
  const WORKFLOW = ".github/workflows/distribution-drift.yml";

  it("has a scheduled workflow, since nothing else in CI may touch the network", () => {
    assert.ok(
      fs.existsSync(path.join(repoRoot, WORKFLOW)),
      `${WORKFLOW} must exist — a checker nothing invokes is a checker that never runs`,
    );
    const wf = read(WORKFLOW);
    assert.match(wf, /schedule:/, "the point is to notice drift that appears while nobody looks");
    assert.match(wf, /workflow_dispatch:/, "and to be runnable on demand when refreshing");
    assert.match(wf, /scripts\/check-distribution\.mjs/, "it must invoke the checker");
  });

  it("stays out of the PR gate", () => {
    const wf = read(WORKFLOW);
    const trigger = wf.slice(0, wf.indexOf("jobs:"));
    assert.ok(
      !/pull_request/.test(trigger),
      "third-party state is not a property of a pull request; gating PRs on someone " +
        "else's cache would block unrelated work",
    );
  });

  it("needs no dependencies to run", () => {
    const bare = [...CHECKER.matchAll(/^\s*import[\s\S]*?from\s+["']([^"']+)["']/gm)].map(
      (m) => m[1],
    );
    assert.ok(bare.length > 0, "the import scan must actually find imports");
    for (const spec of bare) {
      assert.ok(
        spec.startsWith("node:") || spec.startsWith("."),
        `${spec} is a third-party import — the workflow runs this with no npm install`,
      );
    }
  });

  it("every finding it can raise has a row in the runbook", () => {
    // A red weekly run whose finding id appears nowhere in the maintainer's instructions
    // is a notification with no next step. That is the state #69 was already in.
    const ids = [...CHECKER.matchAll(/\bid:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    assert.ok(ids.length >= 6, `the id scan must find the findings, found ${ids.length}`);
    const runbook = read(".github/copilot-instructions.md");
    for (const id of new Set(ids)) {
      assert.ok(
        runbook.includes(`\`${id}\``),
        `${id} can be reported but the runbook in .github/copilot-instructions.md never ` +
          `says what to do about it`,
      );
    }
  });
});

describe("negative canaries", () => {
  it("parseRegistryListing returns nothing rather than guessing when the block is gone", () => {
    const stripped = LISTING_FIXTURE.replace(/"@type":"CollectionPage"/, '"@type":"WebPage"');
    const listing = parseRegistryListing(stripped);
    assert.deepEqual(listing.skills, []);
    assert.equal(listing.declaredCount, null);
  });

  it("parseRegistryListing survives a malformed JSON-LD block", () => {
    const broken = '<script type="application/ld+json">{not json}</script>' + LISTING_FIXTURE;
    assert.equal(parseRegistryListing(broken).skills.length, 9, "one bad block must not");
    assert.deepEqual(parseRegistryListing("<html></html>").skills, []);
  });

  it("advertisedTagLinks ignores release URLs that are not per-tag", () => {
    const text = [
      "index: https://github.com/RafaelGorski/Problem-Based-SRS/releases",
      "asset: https://github.com/RafaelGorski/Problem-Based-SRS/releases/download/v1.1.0/x.zip",
      "filter: https://github.com/RafaelGorski/Problem-Based-SRS/releases?q=srs-navigator",
      "real:   https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.4",
    ].join("\n");
    assert.deepEqual(
      advertisedTagLinks([{ file: "x.md", text }]).map((l) => l.tag),
      ["v2.4"],
      "the releases index and asset links resolve whether or not a given tag exists; " +
        "flagging them would drown the real finding",
    );
  });

  it("a README badge that goes back to a per-tag link fails this suite's assertion", () => {
    const regressed = README.replace(
      /(!\[Version [^\]]*\]\([^)]*\)\]\(https:\/\/github\.com\/RafaelGorski\/Problem-Based-SRS\/releases)\)/,
      "$1/tag/v9.9.9)",
    );
    const badge = regressed.split("\n").find((l) => /!\[Version /.test(l));
    assert.deepEqual(
      advertisedTagLinks([{ file: "README.md", text: badge }]).map((l) => l.tag),
      ["v9.9.9"],
      "the check must actually notice the regression it exists to prevent",
    );
  });

  it("danglingTagLinks does not paper over a 404 by normalizing the tag", () => {
    // Verified against the live repository on 2026-07-31:
    //   /releases/tag/v2.4    → 200
    //   /releases/tag/v2.4.0  → 404
    // GitHub resolves this path by exact tag name. An earlier draft normalized both sides,
    // which called the second link healthy while a reader following it got a 404 — the
    // precise failure this whole checker exists to catch.
    const links = advertisedTagLinks([
      { file: "x.md", text: `https://github.com/${REPO}/releases/tag/v2.4.0` },
    ]);
    assert.equal(danglingTagLinks(links, ["v2.4"]).length, 1);
    assert.deepEqual(danglingTagLinks(links, ["v2.4.0"]), []);
  });

  it("summarize does not report drift it was not given evidence for", () => {
    const summary = summarize({
      listing: { skills: [], declaredCount: null, url: null },
      repoSkills: ["problem-based-srs"],
      tagLinks: [],
      publishedTags: ["v2.6.0", "v1.1.0"],
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
    });
    assert.equal(
      summary.findings.some((f) => f.id === "registry-listing-drift"),
      false,
      "an unreachable listing is a fetch problem, not proof that the listing is wrong — " +
        "reporting it as drift would teach the maintainer to ignore the report",
    );
    assert.equal(summary.findings.some((f) => f.id === "registry-listing-unreadable"), true);
  });
});
