// Drift guard for the mandatory Discovery Interview.
//
// The methodology skills REQUIRE a Discovery Interview at every step and state
// that autopilot / non-interactive mode does NOT waive it. An agent was observed
// skipping the interview in autopilot mode, so these tests fail if that guidance
// is weakened, removed, or drifts out of sync between the canonical skill and the
// bundled canvas copies. This is an end-to-end guard over the skill corpus itself,
// not the extension's JS libs.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../..");
const canonicalDir = resolve(repoRoot, "skills/problem-based-srs");
const referenceDir = resolve(canonicalDir, "reference");
const bundledDir = resolve(__dirname, "../skills");

// Steps whose reference file MUST contain a mandatory Discovery Interview.
const STEP_FILES = [
  "business-context",
  "problems",
  "software-glance",
  "needs",
  "software-vision",
  "functional-requirements",
];

// Substring that proves the "autopilot does not waive the interview" guardrail
// is present. Kept short and stable so wording tweaks don't break the test, but
// removing the guardrail entirely will.
const AUTOPILOT_MARKER = "Autopilot / non-interactive mode does NOT waive";

const read = (p) => readFileSync(p, "utf8");

describe("Discovery Interview guard: canonical step reference files", () => {
  for (const step of STEP_FILES) {
    it(`${step}.md keeps the mandatory interview + autopilot guardrail`, () => {
      const md = read(resolve(referenceDir, `${step}.md`));
      assert.match(
        md,
        /###\s+Discovery Interview \(Mandatory\)/,
        `${step}.md must keep the "Discovery Interview (Mandatory)" section`,
      );
      assert.ok(
        md.includes(AUTOPILOT_MARKER),
        `${step}.md must state that autopilot mode does NOT waive the interview`,
      );
      assert.match(
        md,
        /####\s+Skip Conditions/,
        `${step}.md must keep an explicit Skip Conditions section`,
      );
    });
  }
});

describe("Discovery Interview guard: SKILL.md shared policy", () => {
  const skill = read(resolve(canonicalDir, "SKILL.md"));

  it("declares the interview mandatory for every step", () => {
    assert.ok(
      skill.includes("mandatory Discovery Interview"),
      "SKILL.md must declare the Discovery Interview mandatory",
    );
  });

  it("states autopilot / non-interactive mode does NOT waive it", () => {
    assert.ok(
      skill.includes(AUTOPILOT_MARKER),
      "SKILL.md must state autopilot does not waive the Discovery Interview",
    );
  });
});

describe("Discovery Interview guard: problems.md skip conditions are hardened", () => {
  const md = read(resolve(referenceDir, "problems.md"));

  it("rejects inferring context from a README/source as a skip basis", () => {
    assert.match(
      md,
      /README, source code, or other repository documentation alone does/i,
      "problems.md skip conditions must reject README/source inference as a basis to skip",
    );
  });

  it("requires a user-confirmed Step 0 Business Context artifact", () => {
    assert.ok(
      md.includes("00-business-context.md"),
      "problems.md skip conditions must require the confirmed Step 0 artifact",
    );
  });
});

describe("Discovery Interview guard: bundled canvas skills stay in sync", () => {
  // If someone edits the canonical skill but forgets to re-run sync-skills (or
  // edits a bundled copy directly), the guardrail could pass canonically while
  // the shipped canvas skill drifts. Assert byte-for-byte parity.
  const bundledToCanonical = {
    "problem-based-srs.md": resolve(canonicalDir, "SKILL.md"),
    ...Object.fromEntries(
      STEP_FILES.map((s) => [`${s}.md`, resolve(referenceDir, `${s}.md`)]),
    ),
  };

  for (const [bundled, canonical] of Object.entries(bundledToCanonical)) {
    it(`bundled ${bundled} matches its canonical source`, () => {
      assert.equal(
        read(resolve(bundledDir, bundled)),
        read(canonical),
        `${bundled} is out of sync — run: npm run sync-skills`,
      );
    });
  }
});
