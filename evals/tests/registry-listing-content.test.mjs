// #69's registry box asks for three things: that the skills.sh listing "resolves and
// renders the current **description, version, and README**". The drift checker answered
// exactly one question about that surface — *are the skill names the same?* — and the
// names are the one part a re-submission fixes trivially. So the moment the listing is
// re-crawled and the eight phantom names disappear, the weekly run goes green while the
// page can keep serving a SKILL.md from before the methodology changed.
//
// It is not hypothetical. Captured 2026-07-31, the page for `problem-based-srs` renders
// fourteen of the shipped skill's fifteen `##` sections. The one it is missing is
// "Identifier Notation (CANONICAL)" — the section that defines the dotted IDs — and the
// body it serves instead still teaches `FR-001.md`, the notation #75/#76 renumbered the
// case studies away from because an ID that names no parent carries no traceability.
// The README sends every reader to that page.
//
// This suite guards the *comparison*, never the third-party state: no PR can refresh
// someone else's cache. What it makes possible is telling whether a re-submission worked.
//
// Epistemics are the whole design. Zero matched sections cannot distinguish "the page
// renders something else entirely" from "our extraction broke against a redesign", so
// that is a warning and never drift — the same rule `registry-listing-unreadable` already
// applies to the collection page. Some sections matched proves the extraction worked, so
// the ones missing are real. Offline: fixtures are verbatim captures, no network.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseRegistryListing,
  parseSkillPage,
  pageText,
  repoSkillProfiles,
  skillPageDrift,
  summarize,
  renderReport,
  renderAnnotations,
  fetchSkillPage,
  readLocalState,
  main,
} from "../../scripts/check-distribution.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

const LISTING_FIXTURE = read("evals/fixtures/skills-sh-listing-2026-07-31.html");
const SKILL_PAGE_FIXTURE = read("evals/fixtures/skills-sh-skill-page-2026-07-31.html");
const CHECKER = read("scripts/check-distribution.mjs");

const MAIN_SKILL = "problem-based-srs";

/** The profile of the one skill this repository ships, read from the repository. */
const shipped = () => repoSkillProfiles(repoRoot).find((p) => p.name === MAIN_SKILL);

/** A synthetic page + body for the branches the captured page cannot exercise. */
const pageFor = ({ description, version, sections = [] }) => ({
  page: {
    name: MAIN_SKILL,
    description,
    version: version ?? null,
    url: `https://www.skills.sh/rafaelgorski/problem-based-srs/${MAIN_SKILL}`,
  },
  text: sections.map((s) => `${s} lorem ipsum`).join(" "),
});

/* ------------------------------------------------------- what the page publishes */

describe("the per-skill page declares a machine-readable skill", () => {
  it("reads the SoftwareApplication block, not the other JSON-LD on the page", () => {
    const page = parseSkillPage(SKILL_PAGE_FIXTURE);
    assert.equal(
      page.name,
      MAIN_SKILL,
      "the BreadcrumbList block names the same skill; picking it would read a crumb as a skill",
    );
    assert.match(page.description, /^Complete Problem-Based Software Requirements/);
    assert.equal(
      page.url,
      "https://www.skills.sh/rafaelgorski/problem-based-srs/problem-based-srs",
    );
  });

  it("reports no version, because the page publishes none", () => {
    assert.equal(
      parseSkillPage(SKILL_PAGE_FIXTURE).version,
      null,
      "skills.sh carries no softwareVersion; inventing one would make the version axis " +
        "look checked when the surface cannot answer it",
    );
  });

  it("reads a version the moment the surface starts publishing one", () => {
    const withVersion = SKILL_PAGE_FIXTURE.replace(
      '"applicationCategory"',
      '"softwareVersion":"1.3","applicationCategory"',
    );
    assert.equal(parseSkillPage(withVersion).version, "1.3");
  });

  it("returns nothing rather than guessing when the block is gone", () => {
    const stripped = SKILL_PAGE_FIXTURE.replace(
      '"@type":"SoftwareApplication"',
      '"@type":"WebPage"',
    );
    assert.equal(parseSkillPage(stripped), null);
    assert.equal(parseSkillPage("<html></html>"), null);
  });

  it("survives a malformed JSON-LD block", () => {
    const broken = '<script type="application/ld+json">{not json}</script>' + SKILL_PAGE_FIXTURE;
    assert.equal(parseSkillPage(broken).name, MAIN_SKILL);
  });
});

/* ------------------------------------------------------------ reading the body */

describe("the rendered body, read out of the page the site actually serves", () => {
  const text = pageText(SKILL_PAGE_FIXTURE);

  it("decodes the escaped payload the rendered markdown lives in", () => {
    assert.ok(
      text.includes("Handoff Protocol"),
      "the body is streamed as \\u003ch2\\u003e… inside a script payload; without decoding " +
        "it, every section reads as missing and the checker would report total drift",
    );
    assert.ok(!text.includes("\\u003c"), "the escapes must be resolved, not carried through");
    assert.ok(!/<h2>/.test(text), "tags must be stripped once decoded");
  });

  it("does not count the JSON-LD block as rendered body", () => {
    assert.ok(
      !text.includes("applicationCategory"),
      "the declared contract is read separately; leaving it in the body text would let a " +
        "page prove its own freshness with the metadata block alone",
    );
  });

  it("decodes the entities a rendered page carries", () => {
    assert.ok(pageText("<p>Gorski &#x26; Stadzisz</p>").includes("Gorski & Stadzisz"));
    assert.equal(pageText("<p>a&nbsp;b</p>"), "a b");
    assert.equal(pageText(""), "");
  });
});

/* ---------------------------------------------------- what the repository ships */

describe("the shipped skill's profile is derived, not restated", () => {
  it("comes from skills/*/SKILL.md — name, description, version and sections", () => {
    const profile = shipped();
    assert.ok(profile, "the repository must ship the orchestrator skill");
    assert.equal(profile.description, /^description:\s*(.+)$/m.exec(read(
      "skills/problem-based-srs/SKILL.md",
    ))[1].trim());
    assert.equal(profile.version, "1.3", "frontmatter metadata.version is nested, not top level");
    assert.ok(
      profile.sections.length >= 10,
      `the section list must come from the '##' headings, got ${profile.sections.length}`,
    );
  });

  it("strips the decoration a heading carries so it can be found in rendered text", () => {
    const profile = shipped();
    assert.ok(
      profile.sections.includes("Saving Progress (CRITICAL)"),
      "'## 📁 Saving Progress (CRITICAL)' must normalize to text that appears on the page",
    );
    for (const s of profile.sections) {
      assert.ok(s === s.trim() && s.length > 0, `section '${s}' must be normalized`);
    }
  });

  it("declares the canonical Identifier Notation section this repository is built on", () => {
    assert.ok(
      shipped().sections.some((s) => /Identifier Notation/i.test(s)),
      "the dotted-ID rules are canonical in SKILL.md; if this section is renamed, the " +
        "captured-page evidence below has to be re-captured with it",
    );
  });
});

/* ------------------------------------------------------------ the comparison */

describe("comparing the page against the skill it claims to publish", () => {
  it("reports the sections the captured page never rendered", () => {
    const profile = shipped();
    const drift = skillPageDrift({
      page: parseSkillPage(SKILL_PAGE_FIXTURE),
      text: pageText(SKILL_PAGE_FIXTURE),
      profile,
    });
    assert.ok(drift.body.readable, "fourteen sections matched, so the extraction demonstrably worked");
    assert.ok(drift.body.missing.length >= 1, "the captured page is a section short");
    for (const missing of drift.body.missing) {
      assert.ok(
        profile.sections.includes(missing),
        `${missing} was reported missing but the skill never declared it`,
      );
    }
  });

  it("the captured page really is missing the notation section", () => {
    assert.ok(
      !/Identifier Notation/i.test(pageText(SKILL_PAGE_FIXTURE)),
      "this is the evidence the whole check exists for: the listing publishes a SKILL.md " +
        "from before the canonical dotted IDs, and teaches FR-001 instead",
    );
    assert.ok(
      /FR-001/.test(pageText(SKILL_PAGE_FIXTURE)),
      "…and the superseded notation is what it serves in that section's place",
    );
  });

  it("is silent when the page renders every section", () => {
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({ description: profile.description, sections: profile.sections }),
      profile,
    });
    assert.deepEqual(drift.body.missing, []);
    assert.ok(drift.body.readable);
    assert.equal(drift.description.matches, true);
  });

  it("reports a description the page has not caught up with", () => {
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({ description: "An older description.", sections: profile.sections }),
      profile,
    });
    assert.equal(drift.description.matches, false);
    assert.equal(drift.description.actual, "An older description.");
    assert.equal(drift.description.expected, profile.description);
  });

  it("ignores whitespace a renderer reflows, which is not drift", () => {
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({
        description: `  ${profile.description.replace(/ /g, "\n")}  `,
        sections: profile.sections,
      }),
      profile,
    });
    assert.equal(drift.description.matches, true);
  });

  it("answers the version axis with a status, never a silent null", () => {
    const profile = shipped();
    // The state every run hits today. `null` said this and "there is nothing here to
    // compare" with the same value, so the caller could not tell an unanswerable axis
    // from an absent one — and reported neither.
    const unpublished = skillPageDrift({
      ...pageFor({ description: profile.description, sections: profile.sections }),
      profile,
    });
    assert.equal(unpublished.version.status, "page-publishes-none");
    assert.equal(unpublished.version.matches, null, "no published version is not a pass");
    assert.equal(unpublished.version.actual, null);
    assert.equal(
      unpublished.version.expected,
      profile.version,
      "the axis still knows what it would have compared against",
    );

    const stale = skillPageDrift({
      ...pageFor({
        description: profile.description,
        version: "1.0",
        sections: profile.sections,
      }),
      profile,
    });
    assert.equal(stale.version.status, "compared");
    assert.equal(stale.version.matches, false);
    assert.equal(stale.version.actual, "1.0");
    assert.equal(stale.version.expected, profile.version);

    const agrees = skillPageDrift({
      ...pageFor({
        description: profile.description,
        version: profile.version,
        sections: profile.sections,
      }),
      profile,
    });
    assert.equal(agrees.version.status, "compared");
    assert.equal(agrees.version.matches, true);
  });

  it("says which side is silent when this repository is the one with no version", () => {
    // The mirror image, and it must not be reported as the registry's problem: a skill
    // that ships no `metadata.version` leaves the axis just as unanswerable.
    const drift = skillPageDrift({
      ...pageFor({ description: shipped().description, version: "9.9", sections: shipped().sections }),
      profile: { ...shipped(), version: null },
    });
    assert.equal(drift.version.status, "repo-publishes-none");
    assert.equal(drift.version.matches, null);
    assert.equal(drift.version.actual, "9.9");
    assert.equal(drift.version.expected, null);
  });

  it("treats a page that matches nothing as unreadable, never as drift", () => {
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({ description: profile.description, sections: ["Something Else Entirely"] }),
      profile,
    });
    assert.equal(
      drift.body.readable,
      false,
      "a redesign we cannot parse and a page serving the wrong skill look identical from " +
        "here; claiming drift on that would be a report that cries wolf",
    );
    assert.deepEqual(drift.body.missing, [], "and nothing may be reported as missing");
  });

  it("concludes nothing when there is no skill block at all", () => {
    const drift = skillPageDrift({ page: null, text: "", profile: shipped() });
    assert.equal(drift.body.readable, false);
    assert.equal(drift.description, null);
  });
});

/* ---------------------------------------------------------------- the findings */

describe("what the maintainer is handed", () => {
  const profile = () => shipped();
  const summarizeWith = (skillPages) =>
    summarize({
      listing: { skills: [MAIN_SKILL], declaredCount: 1, url: "https://www.skills.sh/x" },
      repoSkills: [MAIN_SKILL],
      skillProfiles: repoSkillProfiles(repoRoot),
      skillPages,
    });

  it("raises registry-skill-stale, naming the sections and the fix that works", () => {
    const summary = summarizeWith([
      {
        name: MAIN_SKILL,
        url: "https://www.skills.sh/rafaelgorski/problem-based-srs/problem-based-srs",
        page: parseSkillPage(SKILL_PAGE_FIXTURE),
        text: pageText(SKILL_PAGE_FIXTURE),
      },
    ]);
    const finding = summary.findings.find((f) => f.id === "registry-skill-stale");
    assert.ok(finding, `expected registry-skill-stale, got ${summary.findings.map((f) => f.id)}`);
    assert.equal(finding.severity, "error");
    const detail = finding.detail.join("\n");
    assert.match(detail, /Identifier Notation/i, "the finding must name what is missing");
    assert.match(detail, /skills\.sh/, "and the action that clears it");
    assert.ok(summary.drifted, "a stale page is a real disagreement, so the run must fail");
  });

  it("says nothing when the page and the skill agree", () => {
    const p = profile();
    const summary = summarizeWith([
      {
        name: MAIN_SKILL,
        url: "https://www.skills.sh/x",
        ...pageFor({ description: p.description, sections: p.sections }),
      },
    ]);
    assert.deepEqual(
      summary.findings.map((f) => f.id),
      [],
      "a clean surface must produce no findings at all",
    );
    assert.ok(summary.ok);
  });

  it("warns rather than fails when the page cannot be read", () => {
    const summary = summarizeWith([
      { name: MAIN_SKILL, url: "https://www.skills.sh/x", page: null, text: "" },
    ]);
    const finding = summary.findings.find((f) => f.id === "registry-skill-unreadable");
    assert.ok(finding, `expected registry-skill-unreadable, got ${summary.findings.map((f) => f.id)}`);
    assert.equal(finding.severity, "warning");
    assert.equal(
      summary.drifted,
      false,
      "a page we cannot parse is not evidence that the listing is wrong",
    );
  });

  it("reports a description mismatch even when the body is unreadable", () => {
    const summary = summarizeWith([
      {
        name: MAIN_SKILL,
        url: "https://www.skills.sh/x",
        ...pageFor({ description: "An older description.", sections: ["Nothing In Common"] }),
      },
    ]);
    const ids = summary.findings.map((f) => f.id);
    assert.ok(
      ids.includes("registry-skill-stale"),
      "the JSON-LD description is a declared contract; it stays answerable when the body " +
        `extraction does not, ${ids}`,
    );
    assert.ok(ids.includes("registry-skill-unreadable"), `and the body is still unread, ${ids}`);
  });

  it("leaves a page for a skill this repository does not ship to the names check", () => {
    const summary = summarize({
      listing: { skills: ["zigzag-validator"], declaredCount: 1, url: "https://www.skills.sh/x" },
      repoSkills: [MAIN_SKILL],
      skillProfiles: repoSkillProfiles(repoRoot),
      skillPages: [
        { name: "zigzag-validator", url: "https://www.skills.sh/y", page: null, text: "" },
      ],
    });
    const ids = summary.findings.map((f) => f.id);
    assert.ok(
      ids.includes("registry-listing-drift"),
      "a phantom skill is already reported by name; comparing its page would be a second " +
        `finding for one cause, ${ids}`,
    );
    assert.ok(!ids.includes("registry-skill-unreadable"), `${ids}`);
    assert.ok(!ids.includes("registry-skill-stale"), `${ids}`);
  });

  it("renders the finding into the report a human actually opens", () => {
    const report = renderReport(
      summarizeWith([
        {
          name: MAIN_SKILL,
          url: "https://www.skills.sh/x",
          page: parseSkillPage(SKILL_PAGE_FIXTURE),
          text: pageText(SKILL_PAGE_FIXTURE),
        },
      ]),
    );
    assert.match(report, /Identifier Notation/i);
    assert.match(report, /❌/, "an error must not be rendered as a warning");
  });
  it("marks the section comparison as a staleness signal, not a diff", () => {
    // Heading presence is a heuristic: fifteen headings can all be present over prose
    // that moved on years ago. The finding has to say so where it is read, or the next
    // maintainer treats a clean body check as proof the page is byte-current.
    const detail = summarizeWith([
      {
        name: MAIN_SKILL,
        url: "https://www.skills.sh/x",
        page: parseSkillPage(SKILL_PAGE_FIXTURE),
        text: pageText(SKILL_PAGE_FIXTURE),
      },
    ])
      .findings.find((f) => f.id === "registry-skill-stale")
      .detail.join("\n");
    assert.match(detail, /staleness signal/i, "the finding must name what kind of evidence it is");
    assert.match(detail, /not a byte-level diff/i);
  });

  it("calls the thing it compares the skill body, never the README", () => {
    // #69's box said "description, version, and README", and the comparison reads
    // skills/*/SKILL.md. Carrying that word into the shipped surfaces would send the
    // next reader to fix the wrong file.
    const skillPageFindings = summarizeWith([
      {
        name: MAIN_SKILL,
        url: "https://www.skills.sh/x",
        page: parseSkillPage(SKILL_PAGE_FIXTURE),
        text: pageText(SKILL_PAGE_FIXTURE),
      },
    ]).findings.filter((f) => f.id.startsWith("registry-skill-"));
    assert.ok(skillPageFindings.length >= 1, "this must actually inspect a skill-page finding");
    for (const f of skillPageFindings) {
      assert.ok(
        !/README/i.test([f.title, ...f.detail].join("\n")),
        `${f.id} calls the compared document a README; it is the skill body of SKILL.md`,
      );
    }
  });
});

/* ------------------------------------------------- the axis that cannot be answered */

// The critique on #88: the acceptance criterion promises the version is "reported as
// unverifiable" when the page publishes none, and #85 dropped it instead — `version`
// came back null and `summarize()` said nothing at all. A run therefore named one axis
// (the body) and stayed silent about a second, which reads as "checked, agrees".
//
// It is fixed with a third channel rather than a third severity. `ok` is
// `findings.length === 0`, so a notice-severity *finding* would fire on every run and
// leave the monitor permanently non-green — the state the runbook already warns produces
// a muted monitor. `unverified` records the limitation without touching the verdict.
describe("the axis the surface cannot answer is reported, not dropped", () => {
  const summarizeWith = (skillPages, extra = {}) =>
    summarize({
      listing: { skills: [MAIN_SKILL], declaredCount: 1, url: "https://www.skills.sh/x" },
      repoSkills: [MAIN_SKILL],
      skillProfiles: repoSkillProfiles(repoRoot),
      skillPages,
      ...extra,
    });

  /** A page that agrees with the shipped skill on everything the surface publishes. */
  const agreeingPage = (over = {}) => {
    const p = shipped();
    return {
      name: MAIN_SKILL,
      url: "https://www.skills.sh/x",
      ...pageFor({ description: p.description, sections: p.sections, ...over }),
    };
  };

  const notices = (summary) =>
    (summary.unverified ?? []).filter((u) => u.id === "registry-skill-version-unverifiable");

  it("records the version axis as unverified when the page publishes none", () => {
    const summary = summarizeWith([agreeingPage()]);
    const [notice] = notices(summary);
    assert.ok(notice, `expected an unverified version axis, got ${JSON.stringify(summary.unverified)}`);
    assert.equal(notice.severity, "notice");
    const text = [notice.title, ...notice.detail].join("\n");
    assert.match(text, /problem-based-srs/, "which skill");
    assert.match(text, /https:\/\/www\.skills\.sh\/x/, "and which page");
    assert.match(text, /metadata\.version/, "and where the expected value comes from");
    assert.match(text, /\b1\.3\b/, "and what that value is");
  });

  it("leaves the run's verdict untouched, so the monitor stays usable", () => {
    const summary = summarizeWith([agreeingPage()]);
    assert.deepEqual(summary.findings, [], "an unanswerable axis is not a disagreement");
    assert.equal(summary.ok, true);
    assert.equal(summary.drifted, false, "--strict must not fail on someone else's limitation");
    assert.equal(notices(summary).length, 1);
  });

  it("is the real state of the captured page, alongside the stale body", () => {
    const summary = summarizeWith([
      {
        name: MAIN_SKILL,
        url: "https://www.skills.sh/x",
        page: parseSkillPage(SKILL_PAGE_FIXTURE),
        text: pageText(SKILL_PAGE_FIXTURE),
      },
    ]);
    assert.equal(notices(summary).length, 1, "the captured page carries no softwareVersion");
    assert.ok(
      summary.findings.some((f) => f.id === "registry-skill-stale"),
      "and its body is a section short — the two channels report independently",
    );
  });

  it("empties the moment the surface starts publishing a version that agrees", () => {
    const summary = summarizeWith([agreeingPage({ version: shipped().version })]);
    assert.deepEqual(notices(summary), [], "a compared axis is not an unverified one");
    assert.deepEqual(summary.findings, []);
  });

  it("reports a published version that disagrees as drift, not as unverified", () => {
    const summary = summarizeWith([agreeingPage({ version: "1.0" })]);
    assert.deepEqual(notices(summary), []);
    const stale = summary.findings.find((f) => f.id === "registry-skill-stale");
    assert.ok(stale, `${summary.findings.map((f) => f.id)}`);
    assert.match(stale.detail.join("\n"), /1\.0/);
    assert.equal(summary.drifted, true);
  });

  it("does not add a second voice when the page could not be read at all", () => {
    const summary = summarizeWith([
      { name: MAIN_SKILL, url: "https://www.skills.sh/x", page: null, text: "" },
    ]);
    assert.deepEqual(
      notices(summary),
      [],
      "registry-skill-unreadable already says the page told us nothing",
    );
    assert.ok(summary.findings.some((f) => f.id === "registry-skill-unreadable"));
  });

  it("names the skill's own metadata.version and never the plugin release version", () => {
    const manifest = JSON.parse(read(".claude-plugin/plugin.json")).version;
    assert.notEqual(
      shipped().version,
      manifest,
      "this assertion is only meaningful while the two version domains actually differ",
    );
    const text = notices(
      summarizeWith([agreeingPage()], {
        manifestVersion: manifest,
        canvasVersion: null,
        publishedTags: [`v${manifest}`],
      }),
    )
      .map((u) => [u.title, ...u.detail].join("\n"))
      .join("\n");
    assert.match(text, new RegExp(`\\b${shipped().version.replace(".", "\\.")}\\b`));
    assert.ok(
      !text.includes(manifest),
      `the skill version axis quoted the plugin release version ${manifest}; they are ` +
        "different domains and mixing them is how a reader is told to bump the wrong file",
    );
  });

  it("says what it could not check on a clean run — the only run where silence misleads", () => {
    const report = renderReport(summarizeWith([agreeingPage()]));
    assert.match(report, /Not verified this run/i);
    assert.match(report, /no version/i);
    assert.ok(
      !/^Every distribution surface agrees with the repository\.$/m.test(report),
      "an unqualified all-clear claims the version axis was compared when it was not",
    );
  });

  it("still renders the plain all-clear when there was nothing it could not check", () => {
    const report = renderReport(
      summarize({
        listing: { skills: [MAIN_SKILL], declaredCount: 1, url: "https://www.skills.sh/x" },
        repoSkills: [MAIN_SKILL],
        skillProfiles: repoSkillProfiles(repoRoot),
        skillPages: [],
      }),
    );
    assert.match(report, /^Every distribution surface agrees with the repository\.$/m);
    assert.ok(!/Not verified this run/i.test(report));
  });

  it("carries the section into a red report too", () => {
    const report = renderReport(
      summarizeWith([
        {
          name: MAIN_SKILL,
          url: "https://www.skills.sh/x",
          page: parseSkillPage(SKILL_PAGE_FIXTURE),
          text: pageText(SKILL_PAGE_FIXTURE),
        },
      ]),
    );
    assert.match(report, /Identifier Notation/i, "the finding is still first");
    assert.match(report, /Not verified this run/i, "and the limitation is not crowded out");
  });

  it("annotates the Actions UI at notice level, leaving findings at theirs", () => {
    const lines = renderAnnotations(
      summarizeWith([
        {
          name: MAIN_SKILL,
          url: "https://www.skills.sh/x",
          page: parseSkillPage(SKILL_PAGE_FIXTURE),
          text: pageText(SKILL_PAGE_FIXTURE),
        },
      ]),
    );
    assert.ok(
      lines.some((l) => l.startsWith("::notice::") && /version/i.test(l)),
      `a weekly run is read in the Actions UI, not in this file, ${lines}`,
    );
    assert.ok(
      lines.some((l) => l.startsWith("::error::")),
      "and the stale body must still page at its own severity",
    );
  });
});

/* -------------------------------------------------------------- the CLI wiring */

describe("the checker actually fetches the pages", () => {
  const stubFetch = ({ listingHtml, skillHtml, releases = [] }) => {
    const seen = [];
    const impl = async (url) => {
      seen.push(String(url));
      if (String(url).includes("api.github.com")) {
        return { ok: true, status: 200, json: async () => releases };
      }
      const isSkillPage = /\/problem-based-srs\/problem-based-srs$/.test(String(url));
      const body = isSkillPage ? skillHtml : listingHtml;
      if (body instanceof Error) throw body;
      return { ok: true, status: 200, text: async () => body };
    };
    impl.seen = seen;
    return impl;
  };

  const runMain = async (fetchImpl, argv = []) => {
    const lines = [];
    const log = console.log;
    console.log = (...args) => lines.push(args.join(" "));
    try {
      const code = await main(argv, { fetchImpl, env: {}, root: repoRoot });
      return { code, report: lines.join("\n") };
    } finally {
      console.log = log;
    }
  };

  it("reaches the skill page and reports the stale section end to end", async () => {
    const fetchImpl = stubFetch({
      listingHtml: LISTING_FIXTURE,
      skillHtml: SKILL_PAGE_FIXTURE,
    });
    const { report } = await runMain(fetchImpl);
    assert.ok(
      fetchImpl.seen.some((u) => u.endsWith("/problem-based-srs/problem-based-srs")),
      `the CLI must fetch the per-skill page, saw ${fetchImpl.seen}`,
    );
    assert.match(
      report,
      /Identifier Notation/i,
      "unit tests can pass while the CLI never calls the comparison; this is the wire",
    );
  });

  it("fetches only the pages of skills this repository actually ships", async () => {
    const fetchImpl = stubFetch({
      listingHtml: LISTING_FIXTURE,
      skillHtml: SKILL_PAGE_FIXTURE,
    });
    await runMain(fetchImpl);
    const skillFetches = fetchImpl.seen.filter((u) => /problem-based-srs\/[a-z-]+$/.test(u));
    assert.deepEqual(
      skillFetches,
      ["https://www.skills.sh/rafaelgorski/problem-based-srs/problem-based-srs"],
      "the listing advertises nine names, eight of which this repository deleted; fetching " +
        "their pages would be eight requests to learn what the names check already said",
    );
  });

  it("turns a failed page fetch into a warning, not drift", async () => {
    const fetchImpl = stubFetch({
      listingHtml: LISTING_FIXTURE,
      skillHtml: new Error("503"),
    });
    const { report } = await runMain(fetchImpl);
    assert.match(report, /⚠️/, "an unreachable page must be surfaced");
    assert.ok(
      !/registry-skill-stale/.test(report),
      "and must never be reported as the page disagreeing",
    );
  });

  it("carries the unverified axis all the way to the CLI's own output", async () => {
    const fetchImpl = stubFetch({
      listingHtml: LISTING_FIXTURE,
      skillHtml: SKILL_PAGE_FIXTURE,
    });
    const { report } = await runMain(fetchImpl);
    assert.match(
      report,
      /Not verified this run/i,
      "the unit tests can pass while main() never renders it; this is the wire",
    );
    assert.match(report, /metadata\.version/);
  });


  it("hands the comparison the repository's own skills, read from disk", () => {
    const local = readLocalState(repoRoot);
    assert.ok(
      Array.isArray(local.skillProfiles) && local.skillProfiles.length >= 1,
      "readLocalState must carry the profiles, or main() has nothing to compare against",
    );
    assert.equal(local.skillProfiles[0].name, MAIN_SKILL);
  });

  it("fetches a page with the same guard the listing fetch uses", async () => {
    await assert.rejects(
      () => fetchSkillPage({ url: "https://www.skills.sh/x", fetchImpl: async () => ({ ok: false, status: 404 }) }),
      /404/,
      "a 404 is not an empty page; treating it as one would report the whole body missing",
    );
  });
});

/* ------------------------------------------------------------ negative canaries */

describe("negative canaries", () => {
  it("every finding this suite adds has a row in the runbook, at the severity it is raised at", () => {
    const runbook = read(".github/copilot-instructions.md");
    for (const id of [
      "registry-skill-stale",
      "registry-skill-unreadable",
      "registry-skill-version-unverifiable",
    ]) {
      const declared = new RegExp(`id: "${id}",\\s*severity: "(error|warning|notice)"`).exec(CHECKER);
      assert.ok(declared, `${id} must be a finding the checker can actually raise`);

      // A row, not a passing mention: an id named only inside another finding's prose is
      // not somewhere an operator can look up what to do.
      const row = new RegExp(`^\\|\\s*\`${id}\`\\s*\\|([^|]*)\\|`, "m").exec(runbook);
      assert.ok(row, `${id} can be reported but the runbook has no row for it`);
      assert.equal(
        row[1].trim(),
        declared[1],
        `the runbook files ${id} under the wrong severity, so it tells the operator ` +
          "the wrong thing about whether the run failed",
      );
    }
  });

  it("the runbook says a notice does not fail the run, or the severity is a guess", () => {
    // A third severity that the exit-code paragraph never mentions leaves an operator
    // reading `::notice::` in a red-looking log with no way to know it was not the cause.
    const runbook = read(".github/copilot-instructions.md");
    const exitCodes = /\*\*Exit codes\.\*\*[\s\S]{0,900}/.exec(runbook)?.[0] ?? "";
    assert.match(exitCodes, /notice/i, "the exit-code rule must account for notices");
    assert.match(
      exitCodes,
      /`unverified`/,
      "and name the channel they arrive on, which is not `findings`",
    );
  });

  it("the runbook's skill-page rows call it the skill body, not the README", () => {
    const runbook = read(".github/copilot-instructions.md");
    for (const id of [
      "registry-skill-stale",
      "registry-skill-unreadable",
      "registry-skill-version-unverifiable",
    ]) {
      const row = new RegExp(`^\\|\\s*\`${id}\`\\s*\\|.*$`, "m").exec(runbook);
      assert.ok(row, `${id} has no runbook row`);
      assert.ok(
        !/README/i.test(row[0]),
        `${id}'s row calls the compared document a README; it is skills/*/SKILL.md`,
      );
    }
  });


  it("the listing parse still hands over the per-skill URLs the fetch needs", () => {
    const listing = parseRegistryListing(LISTING_FIXTURE);
    const part = listing.parts.find((p) => p.name === MAIN_SKILL);
    assert.ok(part, "the CollectionPage's hasPart entries carry the page URLs");
    assert.equal(
      part.url,
      "https://www.skills.sh/rafaelgorski/problem-based-srs/problem-based-srs",
    );
    assert.deepEqual(
      listing.skills,
      listing.parts.map((p) => p.name),
      "the names check and the page fetch must read one list, not two",
    );
  });

  it("pageText finds a section only when the page really renders it", () => {
    assert.ok(pageText("<h2>Quality Gates</h2>").includes("Quality Gates"));
    assert.ok(!pageText("<h2>Quality Gate</h2>").includes("Quality Gates"));
  });
});

/* ------------------------------------- the axis #91's criteria may and may not claim */

// Issue #106 asked for no behaviour change — only for #91's acceptance criteria to stop
// claiming more than the checker verifies. That correction is only worth writing down if
// something holds the line it draws, because the criteria are prose and the checker is code.
//
// The line runs between two kinds of claim:
//
//   checker-gated  — the listing's names and count; the body's readability and heading
//                    presence; the description *when the page publishes one*; the version
//                    axis, compared or explicitly reported unverified.
//   observed       — that the page publishes a description at all, and what its identifiers
//                    mean. Nothing in the checker answers either.
//
// The asymmetry between the description axis and the version axis is the crux: an absent
// version became a *reported* `registry-skill-version-unverifiable` notice (#88/#101), while
// an absent description is still dropped silently. The captured page happens to publish a
// description, so the axis is answered on real runs today — but by a property of the page,
// not of the checker. These tests pin that as it stands, so #91's criteria describe the
// checker that exists rather than the one the wording implies.
describe("the description axis is compared only when the page publishes one", () => {
  it("compares it when the page publishes one", () => {
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({ description: profile.description, sections: profile.sections }),
      profile,
    });
    assert.equal(drift.description.matches, true);
    assert.equal(drift.description.actual, profile.description);
  });

  it("does not compare it when the page publishes none — absence is not agreement", () => {
    // The trap #91's original criteria walked into. `description: null` reads like "nothing
    // to report", and a criterion saying "the description matches" would be satisfied by a
    // page that publishes no description at all.
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({ description: undefined, sections: profile.sections }),
      profile,
    });
    assert.equal(drift.description, null, "no description means no comparison, not a pass");
    assert.notEqual(drift.description?.matches, true);
  });

  it("raises nothing about a description the page never published", () => {
    const profile = shipped();
    const summary = summarize({
      listing: { skills: [MAIN_SKILL], count: 1, parts: [] },
      skillPages: [
        skillPageDrift({
          ...pageFor({ description: undefined, sections: profile.sections }),
          profile,
        }),
      ],
      repoSkills: [MAIN_SKILL],
      releases: [],
      links: [],
      tags: [],
    });
    const about = [...summary.findings, ...(summary.unverified ?? [])].filter((f) =>
      JSON.stringify(f).toLowerCase().includes("description"),
    );
    assert.deepEqual(
      about,
      [],
      "an absent description currently produces neither a finding nor a notice — #91 may " +
        "not claim it was verified",
    );
  });

  it("the captured page answers the axis today — which is why 'when present' is the wording", () => {
    // Not hypothetical in either direction. The page skills.sh served on 2026-07-31 *does*
    // publish a description, and it agrees with the shipped skill. So #91 may claim the
    // description was compared — but only because of a property of the page, not of the
    // checker. If skills.sh stops publishing one, the claim silently becomes unfounded and
    // nothing goes red. That contingency is the whole content of "when present".
    const page = parseSkillPage(SKILL_PAGE_FIXTURE);
    assert.ok(page, "fixture must still parse");
    assert.ok(page.description, "the captured page publishes a description");
    const drift = skillPageDrift({ page, text: pageText(SKILL_PAGE_FIXTURE), profile: shipped() });
    assert.equal(drift.description.matches, true);
    assert.deepEqual(
      drift.body.missing.length > 0,
      true,
      "and the same page is stale in its body — the axes are independent",
    );
  });

  it("the version axis does say so, which is why the two are not interchangeable", () => {
    // Same shape of absence, different treatment — and #91's criteria have to reflect that
    // rather than average over it. If the description axis ever grows its own notice, this
    // fails and the criteria get revisited deliberately.
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({ description: undefined, sections: profile.sections }),
      profile,
    });
    assert.equal(drift.version.status, "page-publishes-none");
    assert.equal(drift.description, null, "the description axis has no equivalent status");
    assert.match(
      CHECKER,
      /registry-skill-version-unverifiable/,
      "the reported-unverifiable precedent must still exist for the contrast to hold",
    );
  });

  it("body readability is a separate claim from either", () => {
    // #106 also removed Playwright from its close gate: heading presence is what the checker
    // reads, and it reads it out of the served HTML — no browser is involved, so a criterion
    // gated on a rendering harness was gating on the wrong thing.
    const profile = shipped();
    const drift = skillPageDrift({
      ...pageFor({ description: undefined, sections: profile.sections.slice(0, 1) }),
      profile,
    });
    assert.ok(drift.body.readable, "sections are found in served text, not in a rendered DOM");
    assert.ok(drift.body.missing.length > 0, "and missing ones are still reported");
    assert.ok(
      !/playwright|puppeteer|headless/i.test(CHECKER),
      "the checker must not need a browser for the axis #91 gates on",
    );
  });
});
