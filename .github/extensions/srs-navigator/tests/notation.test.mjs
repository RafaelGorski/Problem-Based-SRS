// Regression tests for ID notation handling across both parsers.
//
// Why this exists: the methodology's canonical notation is DOTTED
// (CP.01 → CN.01.1 → FR.01.1.1) and `reference/validate.md` — the file that
// defines traceability — uses it throughout. But both parsers accepted only
// HYPHEN IDs, because `\w` in `/\[(\w+-\d+)\]/` excludes ".". A spec authored
// per the methodology therefore lost every ID (falling back to auto-generated
// P-1/N-1) and every CP→CN→FR link, so the /live canvas rendered an unlinked
// graph. These tests pin both notations, in both parsers.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseSpecificationData } from "../lib/parser.mjs";
import { compileSpecFromFolder } from "../lib/spec-compiler.mjs";
import { validateSpecificationJSON, validateReferenceIntegrity } from "../lib/validation.mjs";
import { decomposeNode } from "../lib/decompose.mjs";
import { DEMO_SPEC } from "../lib/demo-spec.mjs";
import {
  refPattern,
  extractHeadingId,
  stripHeadingId,
  requirementFilePattern,
  headingPattern,
} from "../lib/notation.mjs";

describe("notation: canonical dotted IDs in markdown", () => {
  it("keeps dotted problem IDs instead of falling back to P-n", () => {
    const md = `# Customer Problems

### [CP.01] Scattered Customer Information
Sales teams waste time searching across systems.

### CP.02: Missed Follow-ups
Reps miss important touchpoints.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.problems.length, 2);
    assert.equal(result.problems[0].id, "CP.01");
    assert.equal(result.problems[0].title, "Scattered Customer Information");
    assert.equal(result.problems[1].id, "CP.02");
    assert.equal(result.problems[1].title, "Missed Follow-ups");
  });

  it("links multi-level needs to dotted problems", () => {
    const md = `# Customer Needs

### [CN.01.1] Centralized Customer Database
Addresses CP.01 and CP.05.

### CN.02.1: Automated Follow-ups
Addresses CP.02.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.needs[0].id, "CN.01.1");
    assert.deepEqual(result.needs[0].problemIds, ["CP.01", "CP.05"]);
    assert.equal(result.needs[1].id, "CN.02.1");
    assert.deepEqual(result.needs[1].problemIds, ["CP.02"]);
  });

  it("links three-level FRs to multi-level needs", () => {
    const md = `# Functional Requirements

### [FR.01.1.1] Contact Management
Implements CN.01.1.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.functionalRequirements[0].id, "FR.01.1.1");
    assert.deepEqual(result.functionalRequirements[0].needIds, ["CN.01.1"]);
  });

  it("parses the bare (unbracketed) heading form the skill templates emit", () => {
    // skills/problem-based-srs/reference/problems.md emits "### CP-001: Title"
    const md = `# Customer Problems

### CP-001: Regulatory Compliance
Must satisfy the audit requirement.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.problems[0].id, "CP-001");
    assert.equal(result.problems[0].title, "Regulatory Compliance");
  });

  it("still supports legacy hyphen notation end to end", () => {
    const md = `# Customer Problems

### [CP-1] Legacy Problem
Body.

# Customer Needs

### [CN-1] Legacy Need
Addresses CP-1.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.problems[0].id, "CP-1");
    assert.deepEqual(result.needs[0].problemIds, ["CP-1"]);
  });

  it("does not swallow a trailing sentence period into the ID", () => {
    const md = `# Customer Needs

### [CN.01.1] A Need
This addresses CP.01. Nothing else.
`;
    const result = parseSpecificationData(md);
    assert.deepEqual(result.needs[0].problemIds, ["CP.01"]);
  });
});

describe("notation helpers", () => {
  it("extracts IDs from bracketed and bare headings", () => {
    assert.equal(extractHeadingId("[CP.01] Title"), "CP.01");
    assert.equal(extractHeadingId("CP-001: Title"), "CP-001");
    assert.equal(extractHeadingId("[FR.01.1.1] Title"), "FR.01.1.1");
    assert.equal(extractHeadingId("No identifier here"), undefined);
  });

  it("strips the ID and separator from headings", () => {
    assert.equal(stripHeadingId("[CP.01] Scattered Info"), "Scattered Info");
    assert.equal(stripHeadingId("CP-001: Regulatory Compliance"), "Regulatory Compliance");
    assert.equal(stripHeadingId("CN.01.1 Centralized Database"), "Centralized Database");
  });

  it("finds both notations as references in free text", () => {
    const refs = [..."Addresses CP.01, CP-2 and CN.03.1.".matchAll(refPattern(["CP", "CN"]))].map(
      (m) => m[1]
    );
    assert.deepEqual(refs, ["CP.01", "CP-2", "CN.03.1"]);
  });

  it("matches requirement filenames with dotted IDs and short-name suffixes", () => {
    const fr = requirementFilePattern("FR");
    // The documented convention: FR-001-[short-name].md — previously rejected.
    assert.ok(fr.test("FR-001-client-registration.md"));
    assert.ok(fr.test("FR-001.md"));
    assert.ok(fr.test("FR.01.1.1.md"));
    assert.ok(fr.test("FR.01.1.1-client-registration.md"));
    assert.ok(!fr.test("_index.md"));
    assert.ok(!fr.test("NFR-001.md"));
    assert.ok(!fr.test("notes.md"));
  });

  it("builds heading patterns that capture ID and title", () => {
    const m = "### [CN.01.1] Centralized Database".match(headingPattern("CN", "###", "mi"));
    assert.equal(m[1], "CN.01.1");
    assert.equal(m[2].trim(), "Centralized Database");
  });
});

describe("notation: spec-compiler reads a .spec/ folder", () => {
  // Covers Finding C: the documented filename `FR-001-[short-name].md` was
  // rejected by `/^FR-\d+\.md$/i`, so every FR written per the convention was
  // silently skipped and the compiler fell back to _index.md.
  let dir;

  before(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "srs-spec-"));
    await writeFile(
      path.join(dir, "01-customer-problems.md"),
      "# Customer Problems\n\n### CP.01: Scattered Customer Information\nSales teams waste time.\n"
    );
    await writeFile(
      path.join(dir, "03-customer-needs.md"),
      "# Customer Needs\n\n### CN.01.1: Centralized Database\nAddresses CP.01.\n"
    );
    await mkdir(path.join(dir, "functional-requirements"));
    await writeFile(
      path.join(dir, "functional-requirements", "FR-001-client-registration.md"),
      "# FR-001: Client Registration\n\n**Statement:** The system shall register clients.\n\nTraceability: CN.01.1\n"
    );
    await writeFile(
      path.join(dir, "functional-requirements", "FR.01.1.2-contact-search.md"),
      "# FR.01.1.2: Contact Search\n\n**Statement:** The system shall search contacts.\n\nTraceability: CN.01.1\n"
    );
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("compiles dotted problems and needs with links intact", async () => {
    const spec = await compileSpecFromFolder(dir);
    assert.equal(spec.problems[0].id, "CP.01");
    assert.equal(spec.needs[0].id, "CN.01.1");
    assert.deepEqual(spec.needs[0].problemIds, ["CP.01"]);
  });

  it("reads FR files named per the documented -[short-name] convention", async () => {
    const spec = await compileSpecFromFolder(dir);
    const ids = spec.functionalRequirements.map((f) => f.id).sort();
    assert.deepEqual(ids, ["FR-001", "FR.01.1.2"]);
    for (const fr of spec.functionalRequirements) {
      assert.deepEqual(fr.needIds, ["CN.01.1"], `${fr.id} should trace to CN.01.1`);
    }
  });
});

describe("specification JSON validation accepts both notations", () => {
  // The validation gate is the harshest form of the notation bug: a spec written
  // in the methodology's own canonical notation was not merely mis-linked, it was
  // rejected outright ("Problem ID must match format").
  const spec = (ids) => ({
    name: "T",
    description: "d",
    version: "1.0",
    problems: [{ id: ids.cp, title: "P", description: "d" }],
    needs: [{ id: ids.cn, title: "N", description: "d", problemIds: [ids.cp] }],
    functionalRequirements: [{ id: ids.fr, title: "F", description: "d", needIds: [ids.cn] }],
    nonFunctionalRequirements: [{ id: ids.nfr, title: "Q", description: "d", needIds: [ids.cn] }],
  });

  it("accepts canonical dotted IDs", () => {
    const res = validateSpecificationJSON(spec({ cp: "CP.01", cn: "CN.01.1", fr: "FR.01.1.1", nfr: "NFR.01" }));
    assert.equal(res.success, true, `errors: ${(res.errors || []).join("; ")}`);
  });

  it("still accepts legacy hyphen IDs", () => {
    const res = validateSpecificationJSON(spec({ cp: "CP-1", cn: "CN-1", fr: "FR-1", nfr: "NFR-1" }));
    assert.equal(res.success, true, `errors: ${(res.errors || []).join("; ")}`);
  });

  it("still rejects malformed IDs", () => {
    const res = validateSpecificationJSON(spec({ cp: "PROBLEM_ONE", cn: "CN-1", fr: "FR-1", nfr: "NFR-1" }));
    assert.equal(res.success, false);
  });

  it("keeps the bundled demo spec on canonical dotted IDs", () => {
    const res = validateSpecificationJSON(DEMO_SPEC);
    assert.equal(res.success, true, `errors: ${(res.errors || []).join("; ")}`);
    const all = [
      ...DEMO_SPEC.problems,
      ...DEMO_SPEC.needs,
      ...DEMO_SPEC.functionalRequirements,
      ...DEMO_SPEC.nonFunctionalRequirements,
    ];
    for (const item of all) {
      assert.match(item.id, /^(?:CP|CN|FR|NFR)\.\d/, `demo spec id ${item.id} is not canonical dotted`);
    }
    assert.equal(validateReferenceIntegrity(res.data).valid, true);
  });
});

describe("decomposition follows the notation of the spec", () => {
  const dotted = {
    problems: [{ id: "CP.01", title: "Slow", description: "Search is slow. Reports lag." }],
    needs: [], functionalRequirements: [], nonFunctionalRequirements: [],
  };

  it("extends the parent ID for dotted specs", () => {
    const { added } = decomposeNode(dotted, "CP.01");
    assert.deepEqual(added.map((a) => a.id), ["CP.01.1", "CP.01.2"]);
  });

  it("does not collide when the same node is decomposed twice", () => {
    const once = decomposeNode(dotted, "CP.01");
    const twice = decomposeNode(once.spec, "CP.01");
    assert.deepEqual(twice.added.map((a) => a.id), ["CP.01.3", "CP.01.4"]);
    const ids = twice.spec.problems.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, "decomposition produced duplicate IDs");
  });

  it("keeps sequential IDs for legacy hyphen specs", () => {
    const legacy = {
      problems: [{ id: "CP-1", title: "Slow", description: "Search is slow. Reports lag." }],
      needs: [], functionalRequirements: [], nonFunctionalRequirements: [],
    };
    const { added } = decomposeNode(legacy, "CP-1");
    assert.deepEqual(added.map((a) => a.id), ["CP-2", "CP-3"]);
  });
});
