// The shipped demo specification is the /live wow-moment: the first spec a new
// user ever sees. Issue #54 reported it used legacy hyphen IDs (`CP-1`) while the
// docs teach the canonical dotted hierarchy `CP.n → CN.cp.n → FR.cp.cn.n`, so the
// first-run experience contradicted the methodology.
//
// PR #63 migrated both shipped sources, but nothing asserted the *shipped files as
// a whole*. `tests/notation.test.mjs` in the canvas validates only the imported
// `DEMO_SPEC` object; `landing-proof.test.mjs` checks three IDs quoted on the site.
// A partial revert of `.spec/crm-system.json` would slip straight through.
//
// This test reads BOTH real files off disk, deep-compares them, and gates every ID
// and every reference edge — plus in-memory canaries proving the validator rejects
// a reverted ID rather than silently passing.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC_JSON_REL = ".spec/crm-system.json";
const DEMO_SPEC_REL = ".github/extensions/srs-navigator/lib/demo-spec.mjs";

const SECTIONS = ["problems", "needs", "functionalRequirements", "nonFunctionalRequirements"];

/** Canonical dotted notation, per section. Depth is part of the contract. */
const CANONICAL = {
  problems: /^CP\.\d+(?:\.\d+)*$/,
  needs: /^CN\.\d+\.\d+(?:\.\d+)*$/,
  functionalRequirements: /^FR\.\d+\.\d+\.\d+(?:\.\d+)*$/,
  nonFunctionalRequirements: /^NFR\.\d+(?:\.\d+)*$/,
};

/** Accepted-legacy hyphen notation: still parsed, but banned from what we ship. */
const LEGACY = /^(?:CP|CN|FR|NFR|P|N)-\d/i;

/** Which upstream section each section's references point into. */
const REFERENCES = {
  needs: { field: "problemIds", target: "problems" },
  functionalRequirements: { field: "needIds", target: "needs" },
  nonFunctionalRequirements: { field: "needIds", target: "needs" },
};

const SPEC = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, SPEC_JSON_REL), "utf8"));
const { DEMO_SPEC } = await import(
  new URL(`file:///${path.join(REPO_ROOT, DEMO_SPEC_REL).replace(/\\/g, "/")}`)
);

/**
 * Reduce a spec to the fields both sources are contractually required to agree on.
 * Deep-comparing normalized shapes is stronger than comparing counts: it catches a
 * renamed title or a rewired edge, not just a missing node.
 */
function normalize(spec) {
  const out = {};
  for (const section of SECTIONS) {
    out[section] = (spec[section] ?? [])
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        ...(item.problemIds ? { problemIds: [...item.problemIds].sort() } : {}),
        ...(item.needIds ? { needIds: [...item.needIds].sort() } : {}),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  return out;
}

/** Every identifier in a spec, tagged with the section it came from. */
function allIds(spec) {
  return SECTIONS.flatMap((section) =>
    (spec[section] ?? []).map((item) => ({ section, id: item.id })),
  );
}

/**
 * The reusable gate. Pure, so the canaries below can run it over a mutated clone.
 * @param {object} spec
 * @returns {string[]} human-readable violations, empty when canonical
 */
export function notationViolations(spec) {
  const errors = [];
  const seen = new Map();

  for (const { section, id } of allIds(spec)) {
    if (LEGACY.test(id)) errors.push(`${id} (${section}) uses legacy hyphen notation`);
    else if (!CANONICAL[section].test(id)) {
      errors.push(`${id} (${section}) does not match canonical ${CANONICAL[section]}`);
    }
    if (seen.has(id)) errors.push(`${id} is defined twice (${seen.get(id)}, ${section})`);
    seen.set(id, section);
  }

  for (const [section, { field, target }] of Object.entries(REFERENCES)) {
    const known = new Set((spec[target] ?? []).map((item) => item.id));
    for (const item of spec[section] ?? []) {
      const refs = item[field] ?? [];
      if (refs.length === 0) errors.push(`${item.id} (${section}) has no ${field} — orphaned`);
      for (const ref of refs) {
        if (!known.has(ref)) errors.push(`${item.id} (${section}) references unknown ${ref}`);
      }
    }
  }

  return errors;
}

describe("shipped demo specification — canonical dotted notation (FR.02.1.1)", () => {
  test("the shipped .spec/crm-system.json is fully canonical", () => {
    assert.deepEqual(notationViolations(SPEC), []);
  });

  test("the bundled lib/demo-spec.mjs is fully canonical", () => {
    assert.deepEqual(notationViolations(DEMO_SPEC), []);
  });

  test("both shipped sources are identical", () => {
    assert.deepEqual(
      normalize(DEMO_SPEC),
      normalize(SPEC),
      `${DEMO_SPEC_REL} and ${SPEC_JSON_REL} must ship the same specification`,
    );
  });

  test("zero identifiers use the accepted-legacy hyphen form", () => {
    for (const spec of [SPEC, DEMO_SPEC]) {
      assert.deepEqual(
        allIds(spec)
          .map((e) => e.id)
          .filter((id) => LEGACY.test(id)),
        [],
      );
    }
  });

  test("the raw JSON text contains no legacy identifier anywhere", () => {
    // Descriptions and titles are rendered too — a stale "see CP-1" would mislead
    // a reader even though every `id` field is canonical.
    const raw = fs.readFileSync(path.join(REPO_ROOT, SPEC_JSON_REL), "utf8");
    assert.deepEqual(raw.match(/\b(?:CP|CN|FR|NFR)-\d+/g) ?? [], []);
  });

  test("every reference resolves — 0 dangling CN→CP, FR→CN, NFR→CN", () => {
    for (const spec of [SPEC, DEMO_SPEC]) {
      const dangling = notationViolations(spec).filter((e) => e.includes("references unknown"));
      assert.deepEqual(dangling, []);
    }
  });

  test("the spec keeps the shape the landing page and canvas advertise", () => {
    assert.equal(SPEC.problems.length, 5);
    assert.equal(SPEC.needs.length, 7);
    assert.equal(SPEC.functionalRequirements.length, 12);
    assert.equal(SPEC.nonFunctionalRequirements.length, 5);
    assert.equal(allIds(SPEC).length, 29, "the /live graph advertises 29 nodes");
  });
});

// A guard that cannot fail guards nothing. Each canary mutates a deep clone in
// memory and proves the gate rejects it — the on-disk files are never touched.
describe("shipped demo specification — negative canaries (FR.02.1.1)", () => {
  const clone = () => JSON.parse(JSON.stringify(SPEC));
  const expectViolation = (spec, fragment) => {
    const errors = notationViolations(spec);
    assert.ok(errors.length > 0, `the gate accepted a broken spec (${fragment})`);
    assert.ok(
      errors.some((e) => e.includes(fragment)),
      `expected a violation mentioning "${fragment}", got: ${errors.join(" | ")}`,
    );
  };

  test("rejects a single ID reverted to hyphen notation", () => {
    const spec = clone();
    spec.problems[0].id = "CP-1";
    expectViolation(spec, "legacy hyphen notation");
  });

  test("rejects a need whose dotted ID lost its problem level", () => {
    const spec = clone();
    spec.needs[0].id = "CN.01";
    expectViolation(spec, "does not match canonical");
  });

  test("rejects a duplicated identifier", () => {
    const spec = clone();
    spec.problems[1].id = spec.problems[0].id;
    expectViolation(spec, "is defined twice");
  });

  test("rejects a dangling reference", () => {
    const spec = clone();
    spec.needs[0].problemIds = ["CP.99"];
    expectViolation(spec, "references unknown CP.99");
  });

  test("rejects an orphaned requirement", () => {
    const spec = clone();
    spec.functionalRequirements[0].needIds = [];
    expectViolation(spec, "orphaned");
  });

  test("detects a drift between the two shipped sources", () => {
    const drifted = clone();
    drifted.problems[0].title = "Renamed Behind The Canvas";
    assert.notDeepEqual(normalize(drifted), normalize(DEMO_SPEC));
  });
});
