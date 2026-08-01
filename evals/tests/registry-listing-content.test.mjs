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

  it("compares the version only when the page publishes one", () => {
    const profile = shipped();
    const clean = skillPageDrift({
      ...pageFor({ description: profile.description, sections: profile.sections }),
      profile,
    });
    assert.equal(
      clean.version,
      null,
      "no published version means no answer, not a passing answer",
    );

    const stale = skillPageDrift({
      ...pageFor({
        description: profile.description,
        version: "1.0",
        sections: profile.sections,
      }),
      profile,
    });
    assert.equal(stale.version.matches, false);
    assert.equal(stale.version.actual, "1.0");
    assert.equal(stale.version.expected, profile.version);
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
    for (const id of ["registry-skill-stale", "registry-skill-unreadable"]) {
      const declared = new RegExp(`id: "${id}",\\s*severity: "(error|warning)"`).exec(CHECKER);
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
