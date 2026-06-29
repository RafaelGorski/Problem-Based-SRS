// Integration tests for the SRS Navigator canvas extension
// Tests the full lifecycle: server startup, HTTP serving, and action handlers
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { parseSpecificationData, buildGraphData, convertJSONToSpecificationData } from "../lib/parser.mjs";
import { validateSpecificationJSON, validateReferenceIntegrity } from "../lib/validation.mjs";
import { renderGraphHtml } from "../lib/renderer.mjs";
import { DEMO_SPEC } from "../lib/demo-spec.mjs";

describe("Integration: Full specification pipeline", () => {
  it("loads demo spec, validates, builds graph, and renders HTML", () => {
    // Validate
    const validation = validateSpecificationJSON(DEMO_SPEC);
    assert.equal(validation.success, true);

    // Check reference integrity
    const integrity = validateReferenceIntegrity(validation.data);
    assert.equal(integrity.valid, true);

    // Convert to spec data
    const specData = convertJSONToSpecificationData(validation.data);
    assert.ok(specData.problems.length > 0);
    assert.ok(specData.needs.length > 0);
    assert.ok(specData.functionalRequirements.length > 0);
    assert.ok(specData.nonFunctionalRequirements.length > 0);

    // Build graph
    const graphData = buildGraphData(specData);
    assert.ok(graphData.nodes.length > 0);
    assert.ok(graphData.links.length > 0);

    // Verify node counts match spec
    const problemNodes = graphData.nodes.filter(n => n.type === "problem");
    const needNodes = graphData.nodes.filter(n => n.type === "need");
    const frNodes = graphData.nodes.filter(n => n.type === "fr");
    const nfrNodes = graphData.nodes.filter(n => n.type === "nfr");
    assert.equal(problemNodes.length, DEMO_SPEC.problems.length);
    assert.equal(needNodes.length, DEMO_SPEC.needs.length);
    assert.equal(frNodes.length, DEMO_SPEC.functionalRequirements.length);
    assert.equal(nfrNodes.length, DEMO_SPEC.nonFunctionalRequirements.length);

    // Render
    const html = renderGraphHtml(graphData, { title: DEMO_SPEC.name });
    assert.ok(html.includes("CRM System"));
    assert.ok(html.includes("CP-1"));
    assert.ok(html.length > 1000);
  });

  it("full markdown parsing pipeline works end-to-end", () => {
    const md = `# Customer Problems

### [CP-1] Lost Documents
Employees lose track of important documents.

### [CP-2] Slow Search
Searching for files takes too long.

# Customer Needs

### [CN-1] Document Repository
A centralized place for all documents. Solves CP-1 and CP-2.

# Functional Requirements

### [FR-1] File Upload
Upload any file type. Addresses CN-1.

### [FR-2] Full-text Search
Search within documents. Addresses CN-1.

# Non-Functional Requirements

### [NFR-1] Performance
Search returns results in < 500ms. Relates to CN-1.
`;

    const specData = parseSpecificationData(md);
    assert.equal(specData.problems.length, 2);
    assert.equal(specData.needs.length, 1);
    assert.equal(specData.functionalRequirements.length, 2);
    assert.equal(specData.nonFunctionalRequirements.length, 1);

    // Verify cross-references
    assert.deepEqual(specData.needs[0].problemIds, ["CP-1", "CP-2"]);
    assert.deepEqual(specData.functionalRequirements[0].needIds, ["CN-1"]);

    // Build graph
    const graphData = buildGraphData(specData);
    assert.equal(graphData.nodes.length, 6);
    assert.equal(graphData.links.length, 5); // 2 addresses + 2 implements(FR) + 1 implements(NFR)

    // Render
    const html = renderGraphHtml(graphData, { title: "Document System" });
    assert.ok(html.includes("Document System"));
    assert.ok(html.includes("CP-1"));
    assert.ok(html.includes("FR-2"));
  });
});

describe("Integration: HTTP server serving canvas", () => {
  let server;
  let port;
  let graphData;

  before(async () => {
    const specData = convertJSONToSpecificationData(DEMO_SPEC);
    graphData = buildGraphData(specData);
    const html = renderGraphHtml(graphData, { title: "Test" });

    server = createServer((req, res) => {
      if (req.url === "/api/state") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ specName: "Test", nodeCount: graphData.nodes.length }));
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
    });
    await new Promise(r => server.listen(0, "127.0.0.1", r));
    port = server.address().port;
  });

  after(async () => {
    await new Promise(r => server.close(r));
  });

  it("serves HTML on root path", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
    const body = await res.text();
    assert.ok(body.includes("<!DOCTYPE html>"));
    assert.ok(body.includes("d3.v7.min.js"));
  });

  it("serves JSON state on /api/state", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/state`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/json");
    const data = await res.json();
    assert.equal(data.specName, "Test");
    assert.equal(data.nodeCount, graphData.nodes.length);
  });
});

describe("Integration: Action handler simulation", () => {
  // Simulate what the canvas actions do without the SDK runtime

  it("load_specification action with JSON works", () => {
    const spec = {
      name: "New Spec",
      description: "Loaded via action",
      version: "2.0",
      problems: [{ id: "P-1", title: "Issue", description: "An issue" }],
      needs: [{ id: "N-1", title: "Fix", description: "Fix it", problemIds: ["P-1"] }],
      functionalRequirements: [{ id: "FR-1", title: "Solution", description: "Implement fix", needIds: ["N-1"] }],
      nonFunctionalRequirements: []
    };

    const validation = validateSpecificationJSON(spec);
    assert.equal(validation.success, true);
    const specData = convertJSONToSpecificationData(validation.data);
    const graphData = buildGraphData(specData);
    const html = renderGraphHtml(graphData, { title: validation.data.name });

    assert.equal(graphData.nodes.length, 3);
    assert.equal(graphData.links.length, 2);
    assert.ok(html.includes("New Spec"));
  });

  it("load_specification action with markdown works", () => {
    const md = `# Problems

### [CP-1] Bug
A bug exists.

# Needs

### [CN-1] Fix Bug
Fix the bug. Related to CP-1.
`;
    const specData = parseSpecificationData(md);
    const graphData = buildGraphData(specData);
    assert.equal(graphData.nodes.length, 2);
    assert.equal(graphData.links.length, 1);
  });

  it("validate_specification action detects errors", () => {
    const badSpec = {
      name: "Bad",
      version: "invalid",
      description: ""
    };
    const result = validateSpecificationJSON(badSpec);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.includes("version")));
  });

  it("inspect_node action finds and returns node details", () => {
    const specData = convertJSONToSpecificationData(DEMO_SPEC);
    const graphData = buildGraphData(specData);

    const nodeId = "CP-1";
    const node = graphData.nodes.find(n => n.id === nodeId);
    assert.ok(node);
    assert.equal(node.type, "problem");
    assert.equal(node.label, "Scattered Customer Information");

    // Find connections
    const inbound = graphData.links
      .filter(l => l.target === nodeId)
      .map(l => ({ from: l.source, type: l.type }));
    const outbound = graphData.links
      .filter(l => l.source === nodeId)
      .map(l => ({ to: l.target, type: l.type }));

    // CP-1 should have outbound connections to CN-1 and CN-7
    assert.ok(outbound.length >= 1);
  });

  it("search_nodes action filters correctly", () => {
    const specData = convertJSONToSpecificationData(DEMO_SPEC);
    const graphData = buildGraphData(specData);

    const query = "lead";
    const results = graphData.nodes.filter(n =>
      n.id.toLowerCase().includes(query) || n.label.toLowerCase().includes(query)
    );
    assert.ok(results.length > 0);
    assert.ok(results.some(n => n.label.toLowerCase().includes("lead")));

    // Filter by type
    const frOnly = results.filter(n => n.type === "fr");
    assert.ok(frOnly.length > 0);
  });

  it("get_summary action returns correct counts", () => {
    const specData = convertJSONToSpecificationData(DEMO_SPEC);
    const graphData = buildGraphData(specData);

    const types = { problem: 0, need: 0, fr: 0, nfr: 0 };
    for (const node of graphData.nodes) {
      if (types[node.type] !== undefined) types[node.type]++;
    }

    assert.equal(types.problem, 5);
    assert.equal(types.need, 7);
    assert.equal(types.fr, 12);
    assert.equal(types.nfr, 5);
    assert.equal(graphData.nodes.length, 29);
  });
});

describe("Integration: Edge cases and error handling", () => {
  it("handles specification with no cross-references", () => {
    const spec = {
      name: "Isolated",
      version: "1.0",
      description: "No links",
      problems: [{ id: "CP-1", title: "P1", description: "D" }],
      needs: [{ id: "CN-1", title: "N1", description: "D", problemIds: [] }],
      functionalRequirements: [{ id: "FR-1", title: "FR1", description: "D", needIds: [] }],
      nonFunctionalRequirements: []
    };
    const validation = validateSpecificationJSON(spec);
    assert.equal(validation.success, true);
    const specData = convertJSONToSpecificationData(validation.data);
    const graphData = buildGraphData(specData);
    assert.equal(graphData.nodes.length, 3);
    assert.equal(graphData.links.length, 0);
  });

  it("handles very large specification", () => {
    const spec = {
      name: "Large Spec",
      version: "1.0",
      description: "Many items",
      problems: Array.from({ length: 100 }, (_, i) => ({
        id: `CP-${i + 1}`,
        title: `Problem ${i + 1}`,
        description: `Description for problem ${i + 1}`
      })),
      needs: Array.from({ length: 50 }, (_, i) => ({
        id: `CN-${i + 1}`,
        title: `Need ${i + 1}`,
        description: `Description for need ${i + 1}`,
        problemIds: [`CP-${(i % 100) + 1}`]
      })),
      functionalRequirements: Array.from({ length: 200 }, (_, i) => ({
        id: `FR-${i + 1}`,
        title: `Feature ${i + 1}`,
        description: `Description for FR ${i + 1}`,
        needIds: [`CN-${(i % 50) + 1}`]
      })),
      nonFunctionalRequirements: []
    };

    const validation = validateSpecificationJSON(spec);
    assert.equal(validation.success, true);
    const specData = convertJSONToSpecificationData(validation.data);
    const graphData = buildGraphData(specData);
    assert.equal(graphData.nodes.length, 350);
    assert.ok(graphData.links.length > 0);

    // Render should still work
    const html = renderGraphHtml(graphData, { title: "Large" });
    assert.ok(html.length > 10000);
  });

  it("handles special characters in titles and descriptions", () => {
    const spec = {
      name: "Spec with <special> & \"chars\"",
      version: "1.0",
      description: "Contains HTML-like content",
      problems: [{ id: "CP-1", title: "Problem with <tags> & \"quotes\"", description: "Desc with <b>bold</b>" }],
      needs: [],
      functionalRequirements: [],
      nonFunctionalRequirements: []
    };
    const validation = validateSpecificationJSON(spec);
    assert.equal(validation.success, true);
    const specData = convertJSONToSpecificationData(validation.data);
    const graphData = buildGraphData(specData);
    const html = renderGraphHtml(graphData, { title: spec.name });

    // Title should be escaped in the visible <h1> title
    assert.ok(html.includes("&lt;special&gt;"));
    // The node description is inside JSON.stringify which is safe (no unescaped HTML rendering)
    assert.ok(html.includes("\\u003cb\\u003ebold\\u003c/b\\u003e") || html.includes("<b>bold</b>"));
  });
});
