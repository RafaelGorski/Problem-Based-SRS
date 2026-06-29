// Unit tests for the SRS Navigator canvas extension
// Uses Node.js built-in test runner (node:test)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSpecificationData, buildGraphData, convertJSONToSpecificationData } from "../lib/parser.mjs";

describe("parseSpecificationData", () => {
  it("parses markdown with problems section", () => {
    const md = `# Customer Problems

### [CP-1] First Problem
Description of first problem.

### [CP-2] Second Problem
Description of second problem.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.problems.length, 2);
    assert.equal(result.problems[0].id, "CP-1");
    assert.equal(result.problems[0].title, "First Problem");
    assert.ok(result.problems[0].description.includes("Description of first problem"));
    assert.equal(result.problems[1].id, "CP-2");
  });

  it("parses needs with problemId references", () => {
    const md = `# Customer Needs

### [CN-1] First Need
Solves CP-1 and CP-2 problems.

### [CN-2] Second Need
Addresses CP-1.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.needs.length, 2);
    assert.equal(result.needs[0].id, "CN-1");
    assert.deepEqual(result.needs[0].problemIds, ["CP-1", "CP-2"]);
    assert.deepEqual(result.needs[1].problemIds, ["CP-1"]);
  });

  it("parses functional requirements with needId references", () => {
    const md = `# Functional Requirements

### [FR-1] Login System
Implements CN-1 requirements.

### [FR-2] Dashboard
Addresses CN-1 and CN-2.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.functionalRequirements.length, 2);
    assert.equal(result.functionalRequirements[0].id, "FR-1");
    assert.deepEqual(result.functionalRequirements[0].needIds, ["CN-1"]);
    assert.deepEqual(result.functionalRequirements[1].needIds, ["CN-1", "CN-2"]);
  });

  it("parses non-functional requirements", () => {
    const md = `# Non-Functional Requirements

### [NFR-1] Performance
Response time < 200ms. Relates to CN-1.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.nonFunctionalRequirements.length, 1);
    assert.equal(result.nonFunctionalRequirements[0].id, "NFR-1");
    assert.deepEqual(result.nonFunctionalRequirements[0].needIds, ["CN-1"]);
  });

  it("assigns fallback IDs when not present in headers", () => {
    const md = `# Problems

### Some Problem Without ID
Description here.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.problems.length, 1);
    assert.equal(result.problems[0].id, "P-1");
    assert.equal(result.problems[0].title, "Some Problem Without ID");
  });

  it("parses a full spec with all sections", () => {
    const md = `# Customer Problems

### [CP-1] Data Loss
Users lose data frequently.

# Customer Needs

### [CN-1] Auto-save
Auto-save prevents data loss. Related to CP-1.

# Functional Requirements

### [FR-1] Auto-save Feature
Implement auto-save every 30s. Addresses CN-1.

# Non-Functional Requirements

### [NFR-1] Reliability
99.9% uptime. Supports CN-1.
`;
    const result = parseSpecificationData(md);
    assert.equal(result.problems.length, 1);
    assert.equal(result.needs.length, 1);
    assert.equal(result.functionalRequirements.length, 1);
    assert.equal(result.nonFunctionalRequirements.length, 1);
  });

  it("throws on oversized input", () => {
    const huge = "x".repeat(3 * 1024 * 1024);
    assert.throws(() => parseSpecificationData(huge), /Input too large/);
  });

  it("returns empty arrays for empty input", () => {
    const result = parseSpecificationData("");
    assert.equal(result.problems.length, 0);
    assert.equal(result.needs.length, 0);
    assert.equal(result.functionalRequirements.length, 0);
    assert.equal(result.nonFunctionalRequirements.length, 0);
  });
});

describe("buildGraphData", () => {
  it("creates nodes and links from specification data", () => {
    const spec = {
      problems: [{ id: "CP-1", title: "Problem 1", description: "Desc" }],
      needs: [{ id: "CN-1", title: "Need 1", description: "Desc", problemIds: ["CP-1"] }],
      functionalRequirements: [{ id: "FR-1", title: "Feature 1", description: "Desc", needIds: ["CN-1"] }],
      nonFunctionalRequirements: []
    };
    const graph = buildGraphData(spec);
    assert.equal(graph.nodes.length, 3);
    assert.equal(graph.links.length, 2);

    const problemNode = graph.nodes.find(n => n.id === "CP-1");
    assert.ok(problemNode);
    assert.equal(problemNode.type, "problem");

    const needNode = graph.nodes.find(n => n.id === "CN-1");
    assert.ok(needNode);
    assert.equal(needNode.type, "need");

    const frNode = graph.nodes.find(n => n.id === "FR-1");
    assert.ok(frNode);
    assert.equal(frNode.type, "fr");
  });

  it("creates correct link types", () => {
    const spec = {
      problems: [{ id: "CP-1", title: "P1", description: "D" }],
      needs: [{ id: "CN-1", title: "N1", description: "D", problemIds: ["CP-1"] }],
      functionalRequirements: [{ id: "FR-1", title: "FR1", description: "D", needIds: ["CN-1"] }],
      nonFunctionalRequirements: [{ id: "NFR-1", title: "NFR1", description: "D", needIds: ["CN-1"] }]
    };
    const graph = buildGraphData(spec);

    const addressLink = graph.links.find(l => l.type === "addresses");
    assert.ok(addressLink);
    assert.equal(addressLink.source, "CP-1");
    assert.equal(addressLink.target, "CN-1");

    const implLinks = graph.links.filter(l => l.type === "implements");
    assert.equal(implLinks.length, 2);
  });

  it("skips links to non-existent nodes", () => {
    const spec = {
      problems: [],
      needs: [{ id: "CN-1", title: "N1", description: "D", problemIds: ["CP-99"] }],
      functionalRequirements: [],
      nonFunctionalRequirements: []
    };
    const graph = buildGraphData(spec);
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.links.length, 0);
  });

  it("handles null/undefined spec", () => {
    assert.deepEqual(buildGraphData(null), { nodes: [], links: [] });
    assert.deepEqual(buildGraphData(undefined), { nodes: [], links: [] });
  });

  it("skips nodes with missing id or title", () => {
    const spec = {
      problems: [{ id: "", title: "No ID", description: "D" }, { id: "CP-1", title: "", description: "D" }],
      needs: [],
      functionalRequirements: [],
      nonFunctionalRequirements: []
    };
    const graph = buildGraphData(spec);
    assert.equal(graph.nodes.length, 0);
  });

  it("calculates complexity based on connection count", () => {
    const spec = {
      problems: [],
      needs: [
        { id: "CN-1", title: "N1", description: "D", problemIds: [] },
        { id: "CN-2", title: "N2", description: "D", problemIds: [] },
        { id: "CN-3", title: "N3", description: "D", problemIds: [] }
      ],
      functionalRequirements: [
        { id: "FR-1", title: "FR1", description: "D", needIds: [] },
        { id: "FR-2", title: "FR2", description: "D", needIds: ["CN-1"] },
        { id: "FR-3", title: "FR3", description: "D", needIds: ["CN-1", "CN-2"] },
        { id: "FR-4", title: "FR4", description: "D", needIds: ["CN-1", "CN-2", "CN-3"] }
      ],
      nonFunctionalRequirements: []
    };
    const graph = buildGraphData(spec);
    const fr1 = graph.nodes.find(n => n.id === "FR-1");
    const fr2 = graph.nodes.find(n => n.id === "FR-2");
    const fr3 = graph.nodes.find(n => n.id === "FR-3");
    const fr4 = graph.nodes.find(n => n.id === "FR-4");
    assert.equal(fr1.complexity, 1);
    assert.equal(fr2.complexity, 2);
    assert.equal(fr3.complexity, 3);
    assert.equal(fr4.complexity, 4);
  });
});

describe("convertJSONToSpecificationData", () => {
  it("extracts spec data from JSON format", () => {
    const json = {
      name: "Test",
      description: "Test spec",
      version: "1.0",
      problems: [{ id: "CP-1", title: "P1", description: "D" }],
      needs: [{ id: "CN-1", title: "N1", description: "D", problemIds: [] }],
      functionalRequirements: [],
      nonFunctionalRequirements: []
    };
    const result = convertJSONToSpecificationData(json);
    assert.equal(result.problems.length, 1);
    assert.equal(result.needs.length, 1);
    assert.equal(result.functionalRequirements.length, 0);
  });

  it("handles missing arrays gracefully", () => {
    const json = { name: "Test", version: "1.0" };
    const result = convertJSONToSpecificationData(json);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.needs, []);
    assert.deepEqual(result.functionalRequirements, []);
    assert.deepEqual(result.nonFunctionalRequirements, []);
  });
});
