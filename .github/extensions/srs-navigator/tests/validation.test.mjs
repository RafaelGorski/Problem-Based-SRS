// Unit tests for the validation module
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSpecificationJSON, validateReferenceIntegrity } from "../lib/validation.mjs";

describe("validateSpecificationJSON", () => {
  it("validates a correct specification", () => {
    const spec = {
      name: "Test Spec",
      description: "A test",
      version: "1.0",
      problems: [{ id: "CP-1", title: "Problem", description: "Desc" }],
      needs: [{ id: "CN-1", title: "Need", description: "Desc", problemIds: ["CP-1"] }],
      functionalRequirements: [{ id: "FR-1", title: "Feature", description: "Desc", needIds: ["CN-1"] }],
      nonFunctionalRequirements: [{ id: "NFR-1", title: "Perf", description: "Desc", needIds: ["CN-1"] }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.name, "Test Spec");
  });

  it("rejects null input", () => {
    const result = validateSpecificationJSON(null);
    assert.equal(result.success, false);
    assert.ok(result.errors[0].includes("non-null object"));
  });

  it("rejects missing name", () => {
    const result = validateSpecificationJSON({ version: "1.0", description: "x" });
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.includes("name")));
  });

  it("rejects invalid version format", () => {
    const result = validateSpecificationJSON({ name: "Test", version: "abc", description: "" });
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.includes("version")));
  });

  it("rejects invalid problem ID format", () => {
    const spec = {
      name: "Test",
      version: "1.0",
      description: "",
      problems: [{ id: "INVALID-1", title: "Problem", description: "Desc" }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.includes("Problem")));
  });

  it("rejects invalid need ID format", () => {
    const spec = {
      name: "Test",
      version: "1.0",
      description: "",
      needs: [{ id: "BAD-1", title: "Need", description: "Desc" }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, false);
  });

  it("rejects invalid FR ID format", () => {
    const spec = {
      name: "Test",
      version: "1.0",
      description: "",
      functionalRequirements: [{ id: "X-1", title: "FR", description: "Desc" }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, false);
  });

  it("rejects invalid NFR ID format", () => {
    const spec = {
      name: "Test",
      version: "1.0",
      description: "",
      nonFunctionalRequirements: [{ id: "BAD-1", title: "NFR", description: "Desc" }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, false);
  });

  it("accepts version with patch number (X.Y.Z)", () => {
    const result = validateSpecificationJSON({ name: "Test", version: "1.2.3", description: "" });
    assert.equal(result.success, true);
  });

  it("rejects items with missing title", () => {
    const spec = {
      name: "Test",
      version: "1.0",
      description: "",
      problems: [{ id: "CP-1", title: "", description: "Desc" }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.includes("title")));
  });

  it("rejects items with missing description", () => {
    const spec = {
      name: "Test",
      version: "1.0",
      description: "",
      problems: [{ id: "CP-1", title: "Title", description: "" }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.includes("description")));
  });

  it("handles empty arrays gracefully", () => {
    const result = validateSpecificationJSON({
      name: "Test",
      version: "1.0",
      description: "Desc"
    });
    assert.equal(result.success, true);
    assert.deepEqual(result.data.problems, []);
    assert.deepEqual(result.data.needs, []);
  });

  it("normalizes missing problemIds to empty array", () => {
    const spec = {
      name: "Test",
      version: "1.0",
      description: "",
      needs: [{ id: "CN-1", title: "Need", description: "Desc" }]
    };
    const result = validateSpecificationJSON(spec);
    assert.equal(result.success, true);
    assert.deepEqual(result.data.needs[0].problemIds, []);
  });
});

describe("validateReferenceIntegrity", () => {
  it("passes when all references are valid", () => {
    const spec = {
      problems: [{ id: "CP-1" }],
      needs: [{ id: "CN-1", problemIds: ["CP-1"] }],
      functionalRequirements: [{ id: "FR-1", needIds: ["CN-1"] }],
      nonFunctionalRequirements: [{ id: "NFR-1", needIds: ["CN-1"] }]
    };
    const result = validateReferenceIntegrity(spec);
    assert.equal(result.valid, true);
  });

  it("detects dangling need-to-problem reference", () => {
    const spec = {
      problems: [{ id: "CP-1" }],
      needs: [{ id: "CN-1", problemIds: ["CP-99"] }],
      functionalRequirements: [],
      nonFunctionalRequirements: []
    };
    const result = validateReferenceIntegrity(spec);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes("CN-1"));
    assert.ok(result.errors[0].includes("CP-99"));
  });

  it("detects dangling FR-to-need reference", () => {
    const spec = {
      problems: [],
      needs: [{ id: "CN-1", problemIds: [] }],
      functionalRequirements: [{ id: "FR-1", needIds: ["CN-99"] }],
      nonFunctionalRequirements: []
    };
    const result = validateReferenceIntegrity(spec);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes("FR-1"));
    assert.ok(result.errors[0].includes("CN-99"));
  });

  it("detects dangling NFR-to-need reference", () => {
    const spec = {
      problems: [],
      needs: [{ id: "CN-1", problemIds: [] }],
      functionalRequirements: [],
      nonFunctionalRequirements: [{ id: "NFR-1", needIds: ["CN-50"] }]
    };
    const result = validateReferenceIntegrity(spec);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes("NFR-1"));
  });

  it("handles empty spec without errors", () => {
    const spec = {
      problems: [],
      needs: [],
      functionalRequirements: [],
      nonFunctionalRequirements: []
    };
    const result = validateReferenceIntegrity(spec);
    assert.equal(result.valid, true);
  });

  it("reports multiple errors", () => {
    const spec = {
      problems: [],
      needs: [{ id: "CN-1", problemIds: ["CP-1", "CP-2"] }],
      functionalRequirements: [{ id: "FR-1", needIds: ["CN-99"] }],
      nonFunctionalRequirements: []
    };
    const result = validateReferenceIntegrity(spec);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });
});
