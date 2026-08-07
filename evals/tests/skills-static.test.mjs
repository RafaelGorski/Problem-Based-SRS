// Static skill evals — deterministic, offline assertions over the single
// consolidated methodology skill at skills/problem-based-srs/. The SKILL.md is
// the /problem-based-srs orchestrator; each action lives in reference/<action>.md
// (filename == action), mimicking the impeccable single-skill layout. These run
// with `node --test`, need no Copilot process, and guard the consolidation.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  loadConsolidatedSkill,
  listSkillSlugs,
  defaultSkillsRoot,
  countLines,
  hasSection,
  extractRelativeLinks,
} from "../lib/skills.mjs";
import { countMatches } from "../lib/graders.mjs";

const SKILLS_ROOT = defaultSkillsRoot();

// Body must stay maintainable. AgentSkills guidance is "< 500 lines"; we use a
// slightly higher hard cap as a regression guard so borderline existing files
// pass while genuine bloat fails.
const MAX_BODY_LINES = 600;

// Legacy per-step slash commands removed by the unified-command refactor. None
// of these may reappear anywhere (the form is `/problem-based-srs <action>`).
// The leading boundary (start-of-line, whitespace, or backtick) ensures we match
// the slash-COMMAND form and not artifact folder paths like `.spec/functional-requirements/`.
const LEGACY_COMMANDS = /(?<=^|[\s`(])\/(customer-problems|customer-needs|business-context|software-glance|software-vision|functional-requirements|zigzag-validator|complexity-analysis)\b/gm;

// Canonical artifact IDs are dotted (CP.01 -> CN.01.1 -> FR.01.1.1), which encodes the
// traceability chain in the ID and is what both canvas parsers treat as canonical
// (see .github/extensions/srs-navigator/lib/notation.mjs). Hyphen IDs (CP-001) are
// accepted-legacy for existing specs, so they may only appear in prose that says so.
// The skill previously taught BOTH schemes and one file explicitly banned dots, which
// made agent output non-deterministic and dropped every CP->CN->FR link in the canvas.
const HYPHEN_ID = /\b(?:CP|CN|FR|NFR)-\d/;
const HYPHEN_ID_HEADING = /^#{1,6}\s*(?:CP|CN|FR|NFR)-[\d[]/gm;
const HYPHEN_MANDATES = [
  /do\s+not\s+use\s+dots/i,
  /(?:always\s+)?use\s+`?(?:CP|CN|FR|NFR)-`?\s+with\s+a\s+dash/i,
  /never\s+use\s+dotted/i,
];

// Every action file that must exist under reference/ (filename == action).
// Keyed by action; value is the list of [id, RegExp] content tokens that must
// be present in that action's reference file.
const ACTION_TOKENS = {
  "business-context": [
    ["stakeholders", /stakeholder/i],
    ["principles", /principle/i],
    ["success-criteria", /success/i],
  ],
  "problems": [
    ["cp-notation", /CP[-.]/],
    ["classification", /Obligation|Expectation|Hope/],
  ],
  "software-glance": [
    ["boundaries", /boundar/i],
    ["cp-reference", /CP[-.]/],
  ],
  "needs": [
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
  "validate": [
    ["zigzag", /zig ?zag/i],
    ["traceability", /traceab/i],
  ],
  "complexity": [
    ["axiomatic", /axiomatic/i],
    ["command-footer", /\/problem-based-srs complexity/],
  ],
  "live": [
    ["live-command", /\/live/],
    ["canvas", /canvas/i],
  ],
};

const EXPECTED_ACTIONS = Object.keys(ACTION_TOKENS).sort();

// Actions the orchestrator (main SKILL.md) must advertise as `/problem-based-srs
// <action>` (live is a separate `/live` command, so it is not required here).
const ORCHESTRATOR_ACTIONS = [
  "business-context", "problems", "software-glance", "needs",
  "software-vision", "functional-requirements", "validate", "complexity",
];

let main = null;
let actions = [];
let byAction = new Map();

before(async () => {
  ({ main, actions } = await loadConsolidatedSkill({ skillsRoot: SKILLS_ROOT }));
  byAction = new Map(actions.map((a) => [a.action, a]));
});

describe("consolidated skills/ layout", () => {
  it("contains exactly one skill directory (problem-based-srs)", async () => {
    const slugs = await listSkillSlugs(SKILLS_ROOT);
    assert.deepEqual(slugs, ["problem-based-srs"]);
  });

  it("main SKILL.md is the problem-based-srs orchestrator", () => {
    assert.equal(main.frontmatter.name, "problem-based-srs");
    const d = main.frontmatter.description || "";
    assert.ok(d.length > 0 && d.length <= 1024, "main skill needs a 1..1024 char description");
    assert.ok(!/^\s*(I |You |We )/i.test(d), "main description must be third-person");
  });

  it("reference/ holds exactly one file per action (filename == action)", () => {
    assert.deepEqual(actions.map((a) => a.action).sort(), EXPECTED_ACTIONS);
    for (const a of actions) {
      assert.match(
        a.file.replace(/\\/g, "/"),
        new RegExp(`/problem-based-srs/reference/${a.action}\\.md$`),
      );
    }
  });
});

describe("action reference files (impeccable-style, no frontmatter)", () => {
  it("each action file has no YAML frontmatter and starts with a heading", () => {
    for (const a of actions) {
      assert.deepEqual(a.frontmatter, {}, `${a.action}: reference files must not carry frontmatter`);
      assert.ok(a.sections.length > 0, `${a.action}: no headings found`);
    }
  });
});

describe("body health (main + every action)", () => {
  it(`body stays under ${MAX_BODY_LINES} lines`, () => {
    for (const doc of [main, ...actions]) {
      const n = countLines(doc.body);
      const id = doc.action || doc.slug;
      assert.ok(n <= MAX_BODY_LINES, `${id}: body has ${n} lines (cap ${MAX_BODY_LINES})`);
    }
  });
});

describe("unified-command refactor guard (main + every action)", () => {
  it("contains no legacy per-step slash commands", () => {
    for (const doc of [main, ...actions]) {
      const hits = doc.text.match(LEGACY_COMMANDS) || [];
      const id = doc.action || doc.slug;
      assert.equal(hits.length, 0, `${id}: legacy command(s) ${[...new Set(hits)].join(", ")}`);
    }
  });

  it("uses no stale 'Use skill:' invocation directives", () => {
    for (const doc of [main, ...actions]) {
      const id = doc.action || doc.slug;
      assert.equal(countMatches(doc.text, /Use skill:/i), 0, `${id}: stale "Use skill:" directive`);
    }
  });
});

describe("canonical ID notation (dotted)", () => {
  it("SKILL.md declares dotted notation as canonical", () => {
    assert.ok(
      hasSection(main.body, /identifier notation/i),
      "SKILL.md must carry an 'Identifier Notation' section defining the canonical scheme",
    );
    for (const shape of [/CP\.\{n\}/, /CN\.\{cp\}\.\{n\}/, /FR\.\{cp\}\.\{cn\}\.\{n\}/]) {
      assert.match(main.text, shape, `SKILL.md must document the ${shape} ID shape`);
    }
  });

  it("no file mandates hyphen IDs or forbids dotted IDs", () => {
    for (const doc of [main, ...actions]) {
      const id = doc.action || doc.slug;
      for (const rule of HYPHEN_MANDATES) {
        assert.equal(
          countMatches(doc.text, rule),
          0,
          `${id}: contradicts canonical dotted notation (matched ${rule})`,
        );
      }
    }
  });

  it("artifact templates emit dotted IDs in their headings", () => {
    for (const doc of [main, ...actions]) {
      const id = doc.action || doc.slug;
      const hits = doc.text.match(HYPHEN_ID_HEADING) || [];
      assert.equal(hits.length, 0, `${id}: legacy hyphen heading(s) ${[...new Set(hits)].join(", ")}`);
    }
  });

  it("mentions hyphen IDs only when labelling them legacy", () => {
    for (const doc of [main, ...actions]) {
      const id = doc.action || doc.slug;
      for (const line of doc.text.split(/\r?\n/)) {
        if (!HYPHEN_ID.test(line)) continue;
        assert.match(
          line,
          /legacy/i,
          `${id}: hyphen ID outside a legacy note -> ${line.trim()}`,
        );
      }
    }
  });
  it("uses no placeholder IDs in legacy hyphen form", () => {
    for (const doc of [main, ...actions]) {
      const id = doc.action || doc.slug;
      const hits = doc.text.match(/\b(?:CP|CN|FR|NFR)-(?:XXX|YYY|NNN|N)\b/g) || [];
      assert.equal(
        hits.length,
        0,
        `${id}: placeholder ID(s) in hyphen form ${[...new Set(hits)].join(", ")} — use FR.[CP].[CN].[N]`,
      );
    }
  });
});

// SKILL.md is the orchestrator; detailed artifact shapes belong to the action
// file that owns the step. Two copies of a template drift, and an agent then
// emits a different FR depending on which file it happened to load.
describe("single source of truth for artifact templates", () => {
  it("the FR and NFR templates live in the Step 5 action file", () => {
    const frAction = byAction.get("functional-requirements");
    assert.ok(frAction, "functional-requirements action must be loaded");
    for (const heading of [/Individual FR File Template/i, /Individual NFR File Template/i]) {
      assert.match(frAction.text, heading, `functional-requirements.md must own ${heading}`);
    }
  });

  it("SKILL.md does not carry a second copy of them", () => {
    assert.equal(
      countMatches(main.body, /^#+ .*Individual (?:FR|NFR) File Template/gim),
      0,
      "SKILL.md must point at reference/functional-requirements.md instead of duplicating the templates",
    );
    assert.equal(
      countMatches(main.body, /^\*\*ID:\*\* (?:FR|NFR)\./gim),
      0,
      "SKILL.md must not restate the requirement template fields",
    );
    assert.match(
      main.body,
      /reference\/functional-requirements\.md/,
      "SKILL.md must tell the agent where the templates live",
    );
  });

  it("the canonical templates keep the no-code-snippets guardrail", () => {
    const frAction = byAction.get("functional-requirements");
    for (const heading of ["Individual FR File Template", "Individual NFR File Template"]) {
      const start = frAction.text.indexOf(heading);
      assert.ok(start > 0, `${heading} must exist`);
      const fence = frAction.text.slice(start);
      const open = fence.indexOf("```markdown");
      const close = fence.indexOf("```", open + 3);
      assert.ok(open > 0 && close > open, `${heading} must contain a fenced template`);
      assert.match(
        fence.slice(open, close),
        /NO CODE SNIPPETS/,
        `the ${heading} block must warn against embedding implementation detail in a requirement`,
      );
    }
  });
});

describe("cross-reference links resolve (main + every action)", () => {
  it("every relative markdown link points to an existing file", () => {
    for (const doc of [main, ...actions]) {
      const dir = path.dirname(doc.file);
      const id = doc.action || doc.slug;
      for (const { target } of extractRelativeLinks(doc.text)) {
        const resolved = path.resolve(dir, target);
        assert.ok(existsSync(resolved), `${id}: broken link -> ${target}`);
      }
    }
  });
});

describe("methodology content (per action)", () => {
  for (const [action, tokens] of Object.entries(ACTION_TOKENS)) {
    it(`${action} contains its required methodology tokens`, () => {
      const a = byAction.get(action);
      assert.ok(a, `action ${action} not loaded`);
      for (const [id, pattern] of tokens) {
        assert.ok(pattern.test(a.text), `${action}: missing "${id}" (${pattern})`);
      }
    });
  }
});

describe("problem-based-srs orchestrator", () => {
  it("has traceability guidance and the unified command", () => {
    assert.ok(/traceab/i.test(main.text), "main missing traceability guidance");
    assert.ok(/\/problem-based-srs/.test(main.text), "main missing /problem-based-srs command");
  });

  it("advertises every unified action", () => {
    for (const action of ORCHESTRATOR_ACTIONS) {
      assert.ok(main.text.includes(`/problem-based-srs ${action}`), `orchestrator missing action: /problem-based-srs ${action}`);
    }
  });

  it("documents the full-run default (bare command)", () => {
    assert.ok(/`\/problem-based-srs`/.test(main.text), "orchestrator missing bare /problem-based-srs");
  });

  it("routes actions to their reference/<action>.md file", () => {
    assert.ok(/reference\//.test(main.text),
      "orchestrator must tell the agent to read reference/<action>.md");
  });
});

describe("handoff continuity", () => {
  const chain = [
    ["business-context", /\/problem-based-srs problems/],
    ["problems", /\/problem-based-srs software-glance/],
    ["needs", /\/problem-based-srs software-vision/],
    ["software-vision", /\/problem-based-srs functional-requirements/],
  ];
  it("each step points to the next via the unified command", () => {
    for (const [action, next] of chain) {
      const a = byAction.get(action);
      assert.ok(a, `action ${action} not loaded`);
      assert.ok(hasSection(a.body, /handoff|next step/i), `${action}: missing Handoff/Next Step section`);
      assert.ok(next.test(a.text), `${action}: does not hand off via ${next}`);
    }
  });
});
