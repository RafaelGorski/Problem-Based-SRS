// Unit tests for local (model-free) requirement decomposition
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decomposeNode, nextId } from "../lib/decompose.mjs";

const baseSpec = () => ({
  name: "S", version: "1.0",
  problems: [{ id: "CP-1", title: "Slow", description: "Search is slow. Reports lag." }],
  needs: [{ id: "CN-1", title: "Fast", description: "Cache results. Index data.", problemIds: ["CP-1"] }],
  functionalRequirements: [{ id: "FR-1", title: "Cache", description: "Add cache. Add index. Warm it.", needIds: ["CN-1"] }],
  nonFunctionalRequirements: []
});

describe("nextId", () => {
  it("returns next sequential id for a prefix", () => {
    assert.equal(nextId(["FR-1", "FR-3"], "FR"), "FR-4");
  });
  it("starts at 1 when none exist", () => {
    assert.equal(nextId([], "CN"), "CN-1");
  });
});

describe("decomposeNode (FR)", () => {
  it("creates one sub-requirement per sentence, linked to same needs", () => {
    const spec = baseSpec();
    const res = decomposeNode(spec, "FR-1");
    assert.equal(res.added.length, 3);
    assert.ok(res.spec.functionalRequirements.length === 4);
    for (const fr of res.added) {
      assert.deepEqual(fr.needIds, ["CN-1"]);
      assert.ok(/^FR-\d+$/.test(fr.id));
    }
  });
  it("does not mutate the original spec", () => {
    const spec = baseSpec();
    decomposeNode(spec, "FR-1");
    assert.equal(spec.functionalRequirements.length, 1);
  });
  it("throws for unknown node", () => {
    assert.throws(() => decomposeNode(baseSpec(), "FR-99"));
  });
  it("returns no children for single-sentence description", () => {
    const spec = baseSpec();
    spec.functionalRequirements[0].description = "Only one.";
    assert.equal(decomposeNode(spec, "FR-1").added.length, 0);
  });
});

describe("decomposeNode (CN)", () => {
  it("decomposes a need preserving problemIds", () => {
    const res = decomposeNode(baseSpec(), "CN-1");
    assert.equal(res.added.length, 2);
    assert.deepEqual(res.added[0].problemIds, ["CP-1"]);
  });
});
