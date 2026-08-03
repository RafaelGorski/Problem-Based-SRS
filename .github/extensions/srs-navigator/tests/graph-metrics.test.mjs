// The health-bar metrics used to live inside a template literal in `renderer.mjs`, which
// meant nothing outside a browser could compute them. Issue #92's evidence plan gated on
// "29 nodes, 5 need clusters, 100% traceability" — three numbers that could only be read
// off a screenshot, and a number read off a screenshot gets edited to match the screenshot.
//
// #107's review named the mechanism exactly:
//
//   "'need clusters' is a renderer metric based on graph degree >= 4, not a direct
//    spec-array count; reuse/extract that calculation and guard it with fixtures."
//
// So this suite does two things. It pins the *classification rules* with fixtures — small
// graphs where the right answer is obvious by inspection — and it pins the *sharing*: the
// renderer must inject these functions rather than keep a copy that agrees with them today.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computeHotspots, graphMetricsSource, healthMetrics } from "../lib/graph-metrics.mjs";
import { DEMO_SPEC } from "../lib/demo-spec.mjs";
import { buildGraphData } from "../lib/parser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(here, "..");

const node = (id, type) => ({ id, type });
const link = (source, target) => ({ source, target });

/* ------------------------------------------------------------------- classification */

describe("computeHotspots classifies by connectivity, not by array membership", () => {
  it("calls a problem with no downstream orphaned", () => {
    const nodes = [node("CP.01", "problem"), node("CN.01.1", "need")];
    const h = computeHotspots(nodes, []);
    assert.deepEqual(h.orphanedProblems, ["CP.01"]);
    assert.equal(nodes[0]._hotspot, "orphaned");
    assert.equal(nodes[0]._hotspotSeverity, 3);
  });

  it("calls a need with no downstream unmet — a problem's need is not automatically met", () => {
    const nodes = [node("CP.01", "problem"), node("CN.01.1", "need")];
    const h = computeHotspots(nodes, [link("CP.01", "CN.01.1")]);
    assert.deepEqual(h.orphanedProblems, [], "CP.01 now has a downstream edge");
    assert.deepEqual(h.unmetNeeds, ["CN.01.1"]);
    assert.equal(nodes[1]._hotspotSeverity, 2, "an unmet need is a warning, not critical");
  });

  it("counts a need cluster at total degree 4, and not at 3", () => {
    // The threshold is the whole definition of "need cluster", and it is a *total* degree —
    // in + out. A need with one problem above and two requirements below is degree 3.
    const below = (n) =>
      Array.from({ length: n }, (_, i) => ({
        id: `FR.01.1.${i + 1}`,
        type: "requirement",
      }));

    const atThree = [node("CP.01", "problem"), node("CN.01.1", "need"), ...below(2)];
    const three = computeHotspots(atThree, [
      link("CP.01", "CN.01.1"),
      link("CN.01.1", "FR.01.1.1"),
      link("CN.01.1", "FR.01.1.2"),
    ]);
    assert.equal(atThree[1]._degree, 3);
    assert.deepEqual(three.hubs, [], "degree 3 is not a cluster");

    const atFour = [node("CP.01", "problem"), node("CN.01.1", "need"), ...below(3)];
    const four = computeHotspots(atFour, [
      link("CP.01", "CN.01.1"),
      link("CN.01.1", "FR.01.1.1"),
      link("CN.01.1", "FR.01.1.2"),
      link("CN.01.1", "FR.01.1.3"),
    ]);
    assert.equal(atFour[1]._degree, 4);
    assert.deepEqual(four.hubs, ["CN.01.1"], "degree 4 is");
  });

  it("calls a disconnected node isolated, but never a problem or a need", () => {
    // Order is the definition: a bare CP is orphaned (a traceability gap), a bare
    // requirement is isolated (a stray node). Both have degree 0; they are not the same
    // finding, and swapping the branches would silently retitle every orphan.
    const nodes = [
      node("CP.01", "problem"),
      node("CN.01.1", "need"),
      node("FR.01.1.1", "requirement"),
    ];
    const h = computeHotspots(nodes, []);
    assert.deepEqual(h.orphanedProblems, ["CP.01"]);
    assert.deepEqual(h.unmetNeeds, ["CN.01.1"]);
    assert.deepEqual(h.leafNodes, ["FR.01.1.1"]);
    assert.equal(nodes[2]._hotspot, "isolated");
  });

  it("scales only clusters, so node size means one thing", () => {
    const nodes = [
      node("CP.01", "problem"),
      node("CN.01.1", "need"),
      node("FR.01.1.1", "requirement"),
      node("FR.01.1.2", "requirement"),
      node("FR.01.1.3", "requirement"),
    ];
    computeHotspots(nodes, [
      link("CP.01", "CN.01.1"),
      link("CN.01.1", "FR.01.1.1"),
      link("CN.01.1", "FR.01.1.2"),
      link("CN.01.1", "FR.01.1.3"),
    ]);
    const [, need, ...leaves] = nodes;
    assert.equal(need._hotspot, "hub");
    assert.ok(need._radius > 22, "a cluster is drawn larger");
    for (const leaf of leaves) assert.equal(leaf._radius, 22, "everything else keeps base size");
  });

  it("survives links whose endpoints were replaced by objects", () => {
    // d3's force simulation mutates `link.source`/`link.target` from ids into node objects
    // in place. Reading a graph after a tick must give the same answer as before it.
    const nodes = [node("CP.01", "problem"), node("CN.01.1", "need")];
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const before = computeHotspots(nodes, [link("CP.01", "CN.01.1")]);
    const after = computeHotspots(nodes, [link(byId["CP.01"], byId["CN.01.1"])]);
    assert.deepEqual(after, before);
  });

  it("does not divide by zero on an empty graph", () => {
    assert.deepEqual(computeHotspots([], []), {
      orphanedProblems: [],
      unmetNeeds: [],
      hubs: [],
      leafNodes: [],
      maxDegree: 1,
    });
  });
});

/* ------------------------------------------------------------------- the health bar */

describe("healthMetrics reports what the health bar shows", () => {
  it("treats every class of gap as a gap", () => {
    const m = healthMetrics({
      nodes: [node("CP.01", "problem"), node("CN.01.1", "need"), node("FR.01.1.1", "requirement")],
      links: [],
    });
    assert.equal(m.gaps, 3);
    assert.equal(m.traceability, 0);
  });

  it("reaches 100% only when no node is a gap", () => {
    const m = healthMetrics({
      nodes: [node("CP.01", "problem"), node("CN.01.1", "need"), node("FR.01.1.1", "requirement")],
      links: [link("CP.01", "CN.01.1"), link("CN.01.1", "FR.01.1.1")],
    });
    assert.equal(m.gaps, 0);
    assert.equal(m.traceability, 100);
  });

  it("does not annotate the caller's nodes", () => {
    // The counting path must not have the side effect the rendering path relies on, or
    // asking for the numbers would perturb the simulation.
    const nodes = [node("CP.01", "problem")];
    healthMetrics({ nodes, links: [] });
    assert.equal(nodes[0]._hotspot, undefined);
    assert.equal(nodes[0]._radius, undefined);
  });

  it("answers 100% for an empty graph rather than NaN", () => {
    assert.equal(healthMetrics({ nodes: [], links: [] }).traceability, 100);
    assert.equal(healthMetrics(undefined).traceability, 100);
  });

  it("derives the demo specification's figures instead of quoting them", () => {
    // This is the assertion #92's evidence pack needed and did not have: the three numbers
    // its plan hard-coded, computed from the specification by the same code the page runs.
    // If the demo spec changes, this fails and the pack's expected values change with it —
    // which is the point. The numbers are not sacred; deriving them is.
    const graph = buildGraphData(DEMO_SPEC);
    const m = healthMetrics(graph);
    assert.equal(m.nodes, 29);
    assert.equal(m.links, 32);
    assert.equal(m.needClusters, 5);
    assert.equal(m.traceability, 100);
    assert.equal(m.gaps, 0);
  });

  it("agrees with the specification's own arrays where the two overlap", () => {
    // Node count *is* an array count, so it can be cross-checked. Cluster count is not,
    // which is exactly why it needed extracting.
    const graph = buildGraphData(DEMO_SPEC);
    const m = healthMetrics(graph);
    const declared =
      DEMO_SPEC.problems.length +
      DEMO_SPEC.needs.length +
      DEMO_SPEC.functionalRequirements.length +
      DEMO_SPEC.nonFunctionalRequirements.length;
    assert.equal(m.nodes, declared);
    assert.notEqual(
      m.needClusters,
      DEMO_SPEC.needs.length,
      "if these ever coincide the fixture stopped distinguishing a degree metric from a count",
    );
  });
});

/* --------------------------------------------------------------- the renderer shares it */

describe("the page runs this module, not a copy of it", () => {
  const rendererSrc = fs.readFileSync(path.join(extRoot, "lib/renderer.mjs"), "utf8");

  it("injects the shared source into the page", () => {
    assert.match(
      rendererSrc,
      /\$\{graphMetricsSource\(\)\}/,
      "renderer.mjs must inject graphMetricsSource(), not restate the functions",
    );
    assert.match(rendererSrc, /from ['"]\.\/graph-metrics\.mjs['"]/);
  });

  it("keeps no second definition of the extracted functions", () => {
    // The failure mode this guards is not a wrong number — it is two right numbers that
    // drift apart later, which is undetectable from either side alone.
    for (const fn of ["computeHotspots", "healthMetrics"]) {
      const defs = rendererSrc.match(new RegExp(`function\\s+${fn}\\s*\\(`, "g")) ?? [];
      assert.equal(defs.length, 0, `renderer.mjs redefines ${fn}`);
    }
  });

  it("emits source the page can actually evaluate", () => {
    const src = graphMetricsSource();
    assert.match(src, /function computeHotspots/);
    assert.match(src, /function healthMetrics/);
    for (const hazard of ["`", "${", "</script>"]) {
      assert.ok(
        !src.includes(hazard),
        `graphMetricsSource() contains ${hazard}, which cannot survive injection into the renderer's template literal`,
      );
    }
  });

  it("the injected source computes what the module computes", () => {
    // Evaluate the emitted text the way the page will, then run both implementations on
    // the demo graph. Equality here is what makes "one implementation" a fact.
    const graph = buildGraphData(DEMO_SPEC);
    const evaluate = new Function(`${graphMetricsSource()}\nreturn { computeHotspots, healthMetrics };`);
    const injected = evaluate();
    assert.deepEqual(injected.healthMetrics(graph), healthMetrics(graph));
    assert.deepEqual(
      injected.computeHotspots(graph.nodes.map((n) => ({ ...n })), graph.links),
      computeHotspots(graph.nodes.map((n) => ({ ...n })), graph.links),
    );
  });

  it("the health bar reads the shared metrics rather than recounting", () => {
    assert.match(
      rendererSrc,
      /healthMetrics\(\s*\{\s*nodes\s*,\s*links\s*\}\s*\)/,
      "the health bar must take its totals from healthMetrics()",
    );
  });
});
