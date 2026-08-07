// A tag that exists with no release behind it — the state #89's own first command risks.
//
// `scripts/check-distribution.mjs` compares the advertised version against **published
// releases** only: `publishedTags` is `fetchPublishedReleases().map(r => r.tag)`. It never
// reads git refs, so it cannot tell these two states apart:
//
//   A. the release was never dispatched -> no tag exists yet
//   B. the tag exists and the publish run failed -> recovery has to target that tag
//
// In state B `git tag` aborts with "tag already exists", and `git push origin v2.6` sends
// nothing for a ref that is already up to date — so no `push` event fires and
// create-release.yml cannot re-run. The maintainer follows the advice, observes no change,
// and the run stays red. `Create Release` has already failed with a stranded tag in this
// repository (run 28527065984, tag v1.1.0), so this is not a hypothetical.
//
// The two trains do not even recover the same way: the plugin train re-publishes by
// workflow_dispatch, while the canvas train must have the tag **deleted** first, because
// `bump-version.mjs` skips any version whose tag exists and would otherwise skip the
// stranded version forever. One generic "cut it" line cannot be right for both.
//
// Offline, like the rest of the suite: no network, no fixtures of third-party state.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  advertisedTagLinks,
  danglingTagLinks,
  tagsWithoutRelease,
  republishInstruction,
  fetchRepositoryTags,
  summarize,
  renderReport,
  main,
} from "../../scripts/check-distribution.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

/** The releases that exist today (gh release list), as the checker consumes them. */
const RELEASED = ["v2.4.1", "v2.4", "v2.3", "v2.2", "v2.1", "v1.1.0", "v2.0", "v1.4"];

/** The same list plus the two tags a failed publish run would have left behind. */
const TAGS_AFTER_A_FAILED_RUN = [...RELEASED, "v2.6", "v1.1.1"];

const ids = (summary) => summary.findings.map((f) => f.id);
const finding = (summary, id) => summary.findings.find((f) => f.id === id);
const detailOf = (summary, id) => (finding(summary, id)?.detail ?? []).join("\n");

/** The minimum a summarize() call needs before it will look at releases at all. */
const base = {
  listing: { skills: ["problem-based-srs"], declaredCount: 1, url: null },
  repoSkills: ["problem-based-srs"],
  publishedReleases: RELEASED.map((tag) => ({
    tag,
    name: tag.startsWith("v1.1.") ? `srs-navigator ${tag.slice(1)}` : `🎉 Version ${tag.slice(1)}`,
  })),
  publishedTags: RELEASED,
};

describe("a tag with no release is a different state from a tag that was never pushed", () => {
  it("names the plugin tag a failed publish left behind", () => {
    const stranded = tagsWithoutRelease({
      manifestVersion: "2.6.0",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
      publishedTags: RELEASED,
    });
    assert.deepEqual(
      stranded.map((s) => [s.tag, s.train, s.advertised]),
      [["v2.6", "plugin", "2.6.0"]],
      "the manifest says 2.6.0, the pipeline publishes that at v2.6, and the tag is there " +
        "with nothing behind it",
    );
  });

  it("names the canvas tag a failed publish left behind", () => {
    const stranded = tagsWithoutRelease({
      canvasVersion: "1.1.1",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
      publishedTags: RELEASED,
    });
    assert.deepEqual(
      stranded.map((s) => [s.tag, s.train, s.advertised]),
      [["v1.1.1", "canvas", "1.1.1"]],
    );
  });

  it("says nothing when the tag was never pushed — the state the cut advice is written for", () => {
    assert.deepEqual(
      tagsWithoutRelease({
        manifestVersion: "2.6.0",
        canvasVersion: "1.1.1",
        repoTags: RELEASED,
        publishedTags: RELEASED,
      }),
      [],
      "this is state A; `git tag && git push` is the correct instruction and must survive",
    );
  });

  it("says nothing when the release exists", () => {
    assert.deepEqual(
      tagsWithoutRelease({
        manifestVersion: "2.4.1",
        canvasVersion: "1.1.0",
        repoTags: RELEASED,
        publishedTags: RELEASED,
      }),
      [],
    );
  });

  it("accepts the tag shape a hand-push might have used for the plugin train", () => {
    const stranded = tagsWithoutRelease({
      manifestVersion: "2.6.0",
      repoTags: [...RELEASED, "v2.6.0"],
      publishedTags: RELEASED,
    });
    assert.deepEqual(
      stranded.map((s) => s.tag),
      ["v2.6.0"],
      "a tag that normalizes to the advertised version is still a tag in the way; the " +
        "finding must name the tag that actually exists, not the one the pipeline prefers",
    );
  });

  it("does not guess a train for a tag no surface advertises", () => {
    const stranded = tagsWithoutRelease({
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      repoTags: [...RELEASED, "v0.9"],
      publishedTags: RELEASED,
      links: advertisedTagLinks([
        {
          file: "CHANGELOG.md",
          text: "[0.9]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v0.9",
        },
      ]),
    });
    assert.deepEqual(stranded.map((s) => [s.tag, s.train]), [["v0.9", "unknown"]]);
  });

  it("carries the links that point at the stranded tag, so one finding shows both", () => {
    const links = advertisedTagLinks([
      {
        file: "CHANGELOG.md",
        text: "[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6",
      },
    ]);
    const [stranded] = tagsWithoutRelease({
      manifestVersion: "2.6.0",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
      publishedTags: RELEASED,
      links,
    });
    assert.deepEqual(
      stranded.links.map((l) => `${l.file}:${l.line}`),
      ["CHANGELOG.md:1"],
      "the link and the missing release have one cause; reporting them apart hands the " +
        "maintainer two jobs for one failure",
    );
  });

  it("returns nothing at all when the tag list could not be read", () => {
    assert.deepEqual(
      tagsWithoutRelease({
        manifestVersion: "2.6.0",
        repoTags: null,
        publishedTags: RELEASED,
      }),
      [],
      "no evidence is not evidence of drift — the same rule the registry surfaces follow",
    );
  });
});

describe("the recovery each train actually needs", () => {
  const pluginText = () =>
    republishInstruction({ tag: "v2.6", train: "plugin", advertised: "2.6.0" }).join("\n");
  const canvasText = () =>
    republishInstruction({ tag: "v1.1.1", train: "canvas", advertised: "1.1.1" }).join("\n");

  it("re-publishes the plugin train by dispatch, which is the only thing that re-triggers it", () => {
    const text = pluginText();
    assert.match(
      text,
      /gh workflow run create-release\.yml/,
      "create-release.yml is dispatch-only, and the stranded-tag recovery still has to target " +
        "that existing tag",
    );
    assert.match(text, /-f version=2\.6/, "the dispatch input must carry the version");
  });

  it("pins the dispatch to the tag, so the recovery packages the tagged commit", () => {
    // #104's review: "Recovery must pin provenance: `gh workflow run create-release.yml
    // --ref v2.6 -f version=2.6`; otherwise a later `main` can package bytes different
    // from the tag." The failure this prevents is worse than the one it recovers from —
    // the release exists, looks right, and does not match its own tag.
    const text = pluginText();
    assert.match(
      text,
      /gh workflow run create-release\.yml --ref v2\.6 -f version=2\.6/,
      "without --ref, `gh workflow run` dispatches on the default branch and the workflow " +
        "checks that out, so the asset is built from main rather than from v2.6",
    );
    assert.match(
      text,
      /--ref pins the provenance/i,
      "the flag without its reason is the first thing dropped when someone retypes the " +
        "command from memory",
    );
  });

  it("says why re-pushing the tag does nothing, instead of leaving it to be re-tried", () => {
    assert.match(
      pluginText(),
      /dispatch-only/i,
      "without the reason, the next maintainer retries the wrong git push and has no way to know why nothing changes",
    );
  });

  it("never tells the plugin maintainer to push a tag that already exists", () => {
    assert.doesNotMatch(
      pluginText().replace(/[^\n]*dispatch-only[^\n]*/gi, ""),
      /git push origin v2\.6\b(?!.*cannot)/,
      "that is the instruction this finding exists to replace",
    );
  });

  it("deletes the canvas tag first, because the bump skips any version already tagged", () => {
    const text = canvasText();
    assert.match(text, /git push --delete origin v1\.1\.1/);
    assert.match(text, /release-canvas\.yml/);
    assert.match(
      text,
      /skip/i,
      "leaving the tag makes bump-version.mjs walk past 1.1.1 forever, so the stranded " +
        "version is never published at all",
    );
  });

  it("keeps a tag it cannot attribute train-neutral rather than guessing", () => {
    const text = republishInstruction({ tag: "v0.9", train: "unknown", advertised: null }).join(
      "\n",
    );
    assert.doesNotMatch(text, /create-release\.yml|release-canvas\.yml/);
    assert.match(text, /re-publish/i);
  });
});

describe("the instructions are derived from the pipelines, not asserted about them", () => {
  it("create-release.yml really does accept a version on workflow_dispatch", () => {
    const wf = read(".github/workflows/create-release.yml");
    assert.match(wf, /workflow_dispatch:/, "otherwise the plugin recovery cannot be run");
    const dispatch = wf.slice(wf.indexOf("workflow_dispatch:"), wf.indexOf("permissions:"));
    assert.match(
      dispatch,
      /^\s{6}version:/m,
      "`gh workflow run create-release.yml -f version=…` is only real while this input is",
    );
  });

  it("create-release.yml publishes to a tag that already exists rather than creating one", () => {
    const wf = read(".github/workflows/create-release.yml");
    assert.match(
      wf,
      /gh release create "\$TAG"/,
      "the recovery relies on `gh release create` attaching to the existing tag; if the " +
        "workflow ever hand-created the tag instead, the dispatch would fail on a collision",
    );
    const steps = wf.slice(wf.indexOf("jobs:"));
    assert.ok(
      !/^\s*(git tag|- run: git tag)/m.test(steps),
      "the plugin workflow must never hand-create the tag itself; the release command owns it",
    );
  });

  it("create-release.yml checks out the dispatched ref, which is why --ref is load-bearing", () => {
    // The advice's reason, derived from the workflow rather than asserted about it. A
    // `ref:` added to that checkout would make --ref decorative, and this test says so
    // rather than letting the instruction quietly become superstition.
    const wf = read(".github/workflows/create-release.yml");
    const release = wf.slice(wf.indexOf("  release:"));
    const checkout = release.slice(release.indexOf("actions/checkout@v4"));
    assert.ok(
      !/^\s+with:\s*\n\s+ref:/m.test(checkout.slice(0, 200)),
      "the release job checks out with no explicit ref, so it packages whatever ref the run " +
        "was dispatched on — that is the entire reason the recovery must pass --ref",
    );
  });

  it("bump-version.mjs really does skip a version whose tag exists", () => {
    const bump = read("scripts/bump-version.mjs");
    assert.match(
      bump,
      /while \(taken\.has\(`v\$\{fmt\(next\)\}`\)\)/,
      "the canvas recovery's reason is this loop; if it goes, the reason goes with it",
    );
    assert.match(bump, /export function nextVersion/);
  });

  it("release-canvas.yml is the workflow the canvas recovery names", () => {
    const wf = read(".github/workflows/release-canvas.yml");
    assert.match(wf, /workflow_dispatch:/);
    assert.match(wf, /bump-version\.mjs/);
  });
});

describe("summarize routes the stranded state to the instruction that works", () => {
  it("replaces plugin-release-missing rather than reporting one cause twice", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
    });
    assert.ok(ids(summary).includes("release-tag-without-release"));
    assert.ok(
      !ids(summary).includes("plugin-release-missing"),
      "both findings describe the same missing release; only one of them carries an " +
        "instruction that works, and two entries read as two problems",
    );
    assert.match(detailOf(summary, "release-tag-without-release"), /gh workflow run/);
  });

  it("keeps the cut advice when the tag genuinely is not there", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      repoTags: RELEASED,
    });
    assert.ok(ids(summary).includes("plugin-release-missing"));
    assert.ok(!ids(summary).includes("release-tag-without-release"));
    assert.match(
      detailOf(summary, "plugin-release-missing"),
      /Dispatch `create-release\.yml`|Dispatch \`create-release\.yml\`/,
      "state A is the common case and its advice must still name the release path that exists",
    );
  });

  it("keeps today's behaviour when no tag list is supplied at all", () => {
    const summary = summarize({ ...base, manifestVersion: "2.6.0", canvasVersion: "1.1.0" });
    assert.ok(
      ids(summary).includes("plugin-release-missing"),
      "every existing caller passes no repoTags; the change has to be additive for them",
    );
    assert.ok(!ids(summary).includes("release-tag-without-release"));
  });

  it("stops calling a link dangling when the tag it names is the one that exists", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
      tagLinks: advertisedTagLinks([
        {
          file: "CHANGELOG.md",
          text: "[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6",
        },
      ]),
    });
    assert.ok(
      !ids(summary).includes("dangling-release-links"),
      "the runbook row for that finding says the link 'will resolve when the tag exists' — " +
        "which is false once it does",
    );
    assert.match(detailOf(summary, "release-tag-without-release"), /CHANGELOG\.md:1/);
  });

  it("leaves a genuinely untagged link under dangling-release-links", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.4.1",
      canvasVersion: "1.1.0",
      repoTags: RELEASED,
      tagLinks: advertisedTagLinks([
        {
          file: "CHANGELOG.md",
          text: "[2.7.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.7",
        },
      ]),
    });
    assert.ok(ids(summary).includes("dangling-release-links"));
    assert.ok(!ids(summary).includes("release-tag-without-release"));
  });

  it("keeps unpublishable-release-link ahead of it, because a bad tag shape is bad either way", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.4.1",
      canvasVersion: "1.1.0",
      // The tag `v2.6.0` exists, but the label claims 2.6.0, which publishes at v2.6.
      repoTags: [...RELEASED, "v2.6.0"],
      tagLinks: advertisedTagLinks([
        {
          file: "CHANGELOG.md",
          text: "[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6.0",
        },
      ]),
    });
    assert.ok(
      ids(summary).includes("unpublishable-release-link"),
      "correcting the link is still the job; re-publishing would attach the release to " +
        "v2.6 and leave the v2.6.0 link 404",
    );
    assert.ok(
      !detailOf(summary, "release-tag-without-release").includes("CHANGELOG.md:1"),
      "the same link must not be filed under two contradictory instructions",
    );
  });

  it("reports the canvas train's stranded tag with the canvas recovery", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.4.1",
      canvasVersion: "1.1.1",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
    });
    assert.ok(!ids(summary).includes("canvas-release-missing"));
    const detail = detailOf(summary, "release-tag-without-release");
    assert.match(detail, /git push --delete origin v1\.1\.1/);
    assert.ok(
      !/gh workflow run create-release\.yml/.test(detail),
      "that is the other train's recovery and it does not apply here",
    );
  });

  it("is an error, because a release nobody can download is real drift", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
    });
    assert.equal(finding(summary, "release-tag-without-release").severity, "error");
    assert.equal(summary.drifted, true);
  });

  it("names the tag and the version in the report a human reads", () => {
    const summary = summarize({
      ...base,
      manifestVersion: "2.6.0",
      canvasVersion: "1.1.0",
      repoTags: TAGS_AFTER_A_FAILED_RUN,
    });
    const detail = finding(summary, "release-tag-without-release").detail;
    assert.match(
      detail[0],
      /^v2\.6\b/,
      "the finding must open by naming the tag that is in the way — the instruction below " +
        "is useless without knowing which tag it applies to",
    );
    assert.match(detail[0], /2\.6\.0/, "and the version whose release never appeared");
    assert.match(renderReport(summary), /v2\.6/);
  });
});

describe("reading the tags is a fetch like any other, and may fail like one", () => {
  const refsPayload = (tags) => tags.map((t) => ({ ref: `refs/tags/${t}`, object: { sha: "x" } }));

  it("reads tag names off the refs payload", async () => {
    const tags = await fetchRepositoryTags({
      fetchImpl: async (url) => {
        assert.match(String(url), /matching-refs\/tags/);
        return { ok: true, status: 200, json: async () => refsPayload(["v2.6", "v2.4.1"]) };
      },
    });
    assert.deepEqual(tags, ["v2.6", "v2.4.1"]);
  });

  it("ignores a payload that is not a list of refs rather than inventing tags", async () => {
    const tags = await fetchRepositoryTags({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => [{ tag_name: "v2.4.1" }, { name: "🎉 Version 2.4" }, null],
      }),
    });
    assert.deepEqual(
      tags,
      [],
      "a release payload carries no `ref`; mistaking one for the other would report a " +
        "release title as a tag",
    );
  });

  it("surfaces an unreadable tag list as a warning and claims nothing", async () => {
    const lines = [];
    const log = console.log;
    console.log = (...args) => lines.push(args.join(" "));
    let code;
    try {
      code = await main(["--strict"], {
        fetchImpl: async (url) => {
          const u = String(url);
          if (new URL(u).pathname.includes("/git/matching-refs")) throw new Error("502");
          if (new URL(u).hostname === "api.github.com") {
            return {
              ok: true,
              status: 200,
              json: async () => RELEASED.map((t) => ({ tag_name: t, draft: false })),
            };
          }
          throw new Error("ENOTFOUND");
        },
        env: {},
        root: repoRoot,
      });
    } finally {
      console.log = log;
    }
    const report = lines.join("\n");
    assert.match(report, /tags surface could not be read/i);
    assert.ok(
      !report.includes("release-tag-without-release"),
      "a 502 from the refs API is not evidence that a tag is stranded",
    );
    assert.equal(typeof code, "number");
  });

  it("drives the finding end to end through the CLI, not only the unit tests", async () => {
    const lines = [];
    const log = console.log;
    console.log = (...args) => lines.push(args.join(" "));
    try {
      await main([], {
        fetchImpl: async (url) => {
          const u = String(url);
          if (new URL(u).pathname.includes("/git/matching-refs")) {
            const manifest = JSON.parse(read(".claude-plugin/plugin.json"));
            const tag = `v${String(manifest.version).replace(/\.0$/, "")}`;
            return { ok: true, status: 200, json: async () => refsPayload([...RELEASED, tag]) };
          }
          if (new URL(u).hostname === "api.github.com") {
            return {
              ok: true,
              status: 200,
              json: async () => RELEASED.map((t) => ({ tag_name: t, draft: false })),
            };
          }
          return { ok: true, status: 200, text: async () => "<html></html>" };
        },
        env: {},
        root: repoRoot,
      });
    } finally {
      console.log = log;
    }
    const report = lines.join("\n");
    assert.match(
      report,
      /gh workflow run create-release\.yml/,
      "the CLI must reach the new classifier with the repository's own manifest version",
    );
  });
});

describe("the maintainer's runbook says both halves out loud", () => {
  it("has a row for the finding that separates the two recoveries", () => {
    const runbook = read(".github/copilot-instructions.md");
    assert.ok(runbook.includes("`release-tag-without-release`"));
    const row = runbook
      .split("\n")
      .find((l) => l.startsWith("| `release-tag-without-release`"));
    assert.ok(row, "it must be a row of its own in the findings table, not a cross-reference");
    assert.match(row, /gh workflow run create-release\.yml/);
    assert.match(row, /--delete origin/);
  });

  it("stops the release troubleshooting section from advising a re-push", () => {
    const runbook = read(".github/copilot-instructions.md");
    const section = runbook.slice(runbook.indexOf("### Troubleshooting"));
    assert.match(
      section,
      /workflow run create-release\.yml/,
      "the section a maintainer opens when a release run fails must name the recovery " +
        "that works from that state",
    );
  });
});

describe("negative canaries", () => {
  it("the plugin instruction fails this suite if it goes back to a git-tag release path", () => {
    const regressed = "Cut it with `git tag v2.6 && git push origin v2.6`.";
    const real = republishInstruction({
      tag: "v2.6",
      train: "plugin",
      advertised: "2.6.0",
    }).join("\n");
    assert.doesNotMatch(
      regressed,
      /gh workflow run create-release\.yml/,
      "if the old advice matched, every assertion above would pass over the regression",
    );
    assert.match(real, /gh workflow run create-release\.yml/);
    assert.notEqual(real, regressed);
  });

  it("a classifier that ignored the release list would report every tag", () => {
    const blind = tagsWithoutRelease({
      manifestVersion: "2.4.1",
      repoTags: RELEASED,
      publishedTags: [],
    });
    assert.deepEqual(
      blind.map((s) => s.tag),
      ["v2.4.1"],
      "with no releases known, v2.4.1 is genuinely unreleased — proving the comparison " +
        "is against the release list and not hardcoded",
    );
  });

  it("danglingTagLinks still refuses to normalize, so the split cannot hide a 404", () => {
    const links = advertisedTagLinks([
      {
        file: "README.md",
        text: "https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.4.0",
      },
    ]);
    assert.deepEqual(
      danglingTagLinks(links, RELEASED).map((l) => l.tag),
      ["v2.4.0"],
      "release 2.4 is published as v2.4; /releases/tag/v2.4.0 is still a 404",
    );
  });
});
