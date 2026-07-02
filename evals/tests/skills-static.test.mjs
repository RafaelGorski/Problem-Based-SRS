// Static skill evals — deterministic, offline assertions over every canonical
// skills/<slug>/SKILL.md. These run with `node --test` and need no Copilot
// process, so they are fast and always executed. They give the methodology
// skills the regression coverage the canvas-app tests never provided, and they
// guard the "single /problem-based-srs command" refactor.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadAllSkills, defaultSkillsRoot, countLines, hasSection, extractRelativeLinks } from "../lib/skills.mjs";
import { countMatches } from "../lib/graders.mjs";

const SKILLS_ROOT = defaultSkillsRoot();

// Body must stay maintainable. AgentSkills guidance is "< 500 lines"; we use a
// slightly higher hard cap as a regression guard so borderline existing files
// pass while genuine bloat fails.
const MAX_BODY_LINES = 600;

// Legacy per-step slash commands removed by the unified-command refactor. None
// of these may reappear in any skill (the new form is `/problem-based-srs <action>`).
// The leading boundary (start-of-line, whitespace, or backtick) ensures we match
// the slash-COMMAND form and not artifact folder paths like `.spec/functional-requirements/`.
const LEGACY_COMMANDS = /(?<=^|[\s`(])\/(customer-problems|customer-needs|business-context|software-glance|software-vision|functional-requirements|zigzag-validator|complexity-analysis)\b/gm;

// Per-skill required content tokens (verified present in the current sources).
// Each entry is [id, RegExp]. Keep these robust to avoid brittle failures.
const REQUIRED_TOKENS = {
  "business-context": [
    ["stakeholders", /stakeholder/i],
    ["principles", /principle/i],
    ["success-criteria", /success/i],
  ],
  "customer-problems": [
    ["cp-notation", /CP[-.]/],
    ["classification", /Obligation|Expectation|Hope/],
  ],
  "software-glance": [
    ["boundaries", /boundar/i],
    ["cp-reference", /CP[-.]/],
  ],
  "customer-needs": [
    ["cn-notation", /CN[-.]/],
    ["cp-traceability", /CP[-.]/],
    ["traceability", /traceab/i],
  ],
  "software-vision": [
    ["architecture", /architect/i],
    ["vision", /vision/i],
  ],
  "functional-requirements": [
    ["fr-notation", /FR[-.]/],
    ["cn-reference", /CN[-.]/],
    ["traceability", /traceab/i],
  ],
  "zigzag-validator": [
    ["zigzag", /zig ?zag/i],
    ["traceability", /traceab/i],
  ],
  "complexity-analysis": [
    ["axiomatic", /axiomatic/i],
    ["command-footer", /\/problem-based-srs complexity/],
  ],
  "problem-based-srs": [
    ["traceability", /traceab/i],
    ["unified-command", /\/problem-based-srs/],
  ],
  "live": [
    ["live-command", /\/live/],
    ["canvas", /canvas/i],
  ],
};

// Every action the unified orchestrator must advertise.
const ORCHESTRATOR_ACTIONS = [
  "business-context", "problems", "software-glance", "needs",
  "software-vision", "functional-requirements", "validate", "complexity",
];

let skills = [];
let bySlug = new Map();

before(async () => {
  skills = await loadAllSkills({ skillsRoot: SKILLS_ROOT });
  bySlug = new Map(skills.map((s) => [s.slug, s]));
});

describe("skills/ directory", () => {
  it("discovers all ten methodology skills", () => {
    assert.equal(skills.length, 10);
    for (const slug of Object.keys(REQUIRED_TOKENS)) {
      assert.ok(bySlug.has(slug), `missing skill directory: ${slug}`);
    }
  });
});

describe("frontmatter contract (every skill)", () => {
  it("name matches its directory name", () => {
    for (const s of skills) {
      assert.equal(s.frontmatter.name, s.slug, `${s.slug}: name "${s.frontmatter.name}" != dir`);
    }
  });

  it("has a non-empty description within 1024 chars", () => {
    for (const s of skills) {
      const d = s.frontmatter.description || "";
      assert.ok(d.length > 0, `${s.slug}: missing description`);
      assert.ok(d.length <= 1024, `${s.slug}: description too long (${d.length})`);
    }
  });

  it("description is written in third person (not I / You)", () => {
    for (const s of skills) {
      const d = s.frontmatter.description || "";
      assert.ok(!/^\s*(I |You |We )/i.test(d), `${s.slug}: description not third-person`);
    }
  });
});

describe("body health (every skill)", () => {
  it(`body stays under ${MAX_BODY_LINES} lines`, () => {
    for (const s of skills) {
      const n = countLines(s.body);
      assert.ok(n <= MAX_BODY_LINES, `${s.slug}: body has ${n} lines (cap ${MAX_BODY_LINES})`);
    }
  });

  it("has at least one H1/H2 heading", () => {
    for (const s of skills) {
      assert.ok(s.sections.length > 0, `${s.slug}: no headings found`);
    }
  });
});

describe("unified-command refactor guard (every skill)", () => {
  it("contains no legacy per-step slash commands", () => {
    for (const s of skills) {
      const hits = s.text.match(LEGACY_COMMANDS) || [];
      assert.equal(hits.length, 0, `${s.slug}: legacy command(s) ${[...new Set(hits)].join(", ")}`);
    }
  });

  it("uses no stale 'Use skill:' invocation directives", () => {
    for (const s of skills) {
      assert.equal(countMatches(s.text, /Use skill:/i), 0, `${s.slug}: stale "Use skill:" directive`);
    }
  });
});

describe("cross-reference links resolve (every skill)", () => {
  it("every relative markdown link points to an existing file", () => {
    for (const s of skills) {
      const dir = path.dirname(s.file);
      for (const { target } of extractRelativeLinks(s.text)) {
        const resolved = path.resolve(dir, target);
        assert.ok(existsSync(resolved), `${s.slug}: broken link -> ${target}`);
      }
    }
  });
});

describe("methodology content (per skill)", () => {
  for (const [slug, tokens] of Object.entries(REQUIRED_TOKENS)) {
    it(`${slug} contains its required methodology tokens`, () => {
      const s = bySlug.get(slug);
      assert.ok(s, `skill ${slug} not loaded`);
      for (const [id, pattern] of tokens) {
        assert.ok(pattern.test(s.text), `${slug}: missing "${id}" (${pattern})`);
      }
    });
  }
});

describe("problem-based-srs orchestrator", () => {
  it("advertises every unified action", () => {
    const s = bySlug.get("problem-based-srs");
    for (const action of ORCHESTRATOR_ACTIONS) {
      const re = new RegExp("/problem-based-srs " + action.replace(/[-]/g, "\\-"));
      assert.ok(re.test(s.text), `orchestrator missing action: /problem-based-srs ${action}`);
    }
  });

  it("documents the full-run default (bare command)", () => {
    const s = bySlug.get("problem-based-srs");
    assert.ok(/`\/problem-based-srs`/.test(s.text), "orchestrator missing bare /problem-based-srs");
  });
});

describe("handoff continuity", () => {
  const chain = [
    ["business-context", /\/problem-based-srs problems/],
    ["customer-problems", /\/problem-based-srs software-glance/],
    ["customer-needs", /\/problem-based-srs software-vision/],
    ["software-vision", /\/problem-based-srs functional-requirements/],
  ];
  it("each step points to the next via the unified command", () => {
    for (const [slug, next] of chain) {
      const s = bySlug.get(slug);
      assert.ok(hasSection(s.body, /handoff|next step/i), `${slug}: missing Handoff/Next Step section`);
      assert.ok(next.test(s.text), `${slug}: does not hand off via ${next}`);
    }
  });
});
