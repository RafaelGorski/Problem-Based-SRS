// Unit tests for the HTML renderer
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderGraphHtml } from "../lib/renderer.mjs";

describe("renderGraphHtml", () => {
  const sampleGraph = {
    nodes: [
      { id: "CP-1", type: "problem", label: "Test Problem", data: { description: "Desc" }, complexity: 1 },
      { id: "CN-1", type: "need", label: "Test Need", data: { description: "Need desc" }, complexity: 2 }
    ],
    links: [
      { source: "CP-1", target: "CN-1", type: "addresses" }
    ]
  };

  it("returns valid HTML string", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes("</html>"));
  });

  it("includes D3.js script", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("d3.v7.min.js"));
  });

  it("includes the graph data as JSON", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('"CP-1"'));
    assert.ok(html.includes('"CN-1"'));
    assert.ok(html.includes('"addresses"'));
  });

  it("escapes </script> sequences in embedded graph JSON to prevent script injection", () => {
    const malicious = {
      nodes: [
        { id: "CP-1", type: "problem", label: "</script><img src=x onerror=alert(1)>", data: { description: "x" }, complexity: 1 }
      ],
      links: []
    };
    const html = renderGraphHtml(malicious);
    // The raw closing-script sequence must not appear inside the embedded data
    assert.ok(!html.includes("</script><img"), "raw </script> must be neutralized");
    assert.ok(html.includes("\\u003c"), "< should be unicode-escaped in embedded JSON");
  });

  it("uses the provided title in spec button", () => {
    const html = renderGraphHtml(sampleGraph, { title: "My Custom Title" });
    assert.ok(html.includes("My Custom Title"));
  });

  it("defaults title to SRS Navigator", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("SRS Navigator"));
  });

  it("includes analysis mode buttons", () => {
    const html = renderGraphHtml(sampleGraph, { analysisMode: "customer-problem" });
    assert.ok(html.includes("Problem Focus"));
    assert.ok(html.includes("Implementation"));
    assert.ok(html.includes('data-mode="customer-problem"'));
  });

  it("marks the selected analysis mode as active", () => {
    const html = renderGraphHtml(sampleGraph, { analysisMode: "implementation" });
    assert.ok(html.includes('data-mode="implementation">Implementation</button>'));
    // The implementation button should have "active" class
    assert.ok(html.includes('class="btn active" data-mode="implementation"'));
  });

  it("does not include a network skill-sync button (skills are read live from the repo)", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(!html.includes('id="modal-btn-sync-skills"'));
    assert.ok(!html.includes("/api/sync-skills"));
  });

  it("includes search input with placeholder", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('id="search"'));
    assert.ok(html.includes('placeholder="Search nodes'));
  });

  it("includes detail panel structure", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('id="detail-panel"'));
    assert.ok(html.includes('id="panel-content"'));
    assert.ok(html.includes("detail-header"));
  });

  it("includes auto-refresh polling for live graph (non-demo)", () => {
    const html = renderGraphHtml(sampleGraph, { isDemo: false });
    assert.ok(html.includes("/api/refresh-spec"));
    assert.ok(html.includes("data.refreshed"));
    assert.ok(html.includes("window.location.reload()"));
  });

  it("does not auto-reload away from the demo graph", () => {
    const html = renderGraphHtml(sampleGraph, { isDemo: true });
    // The auto-refresh poll is guarded by `!isDemo`, so isDemo renders true
    assert.ok(html.includes("const isDemo = true"));
  });

  it("escapes HTML in title", () => {
    const html = renderGraphHtml(sampleGraph, { title: "<script>alert('xss')</script>" });
    assert.ok(!html.includes("<script>alert('xss')</script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("handles empty graph data", () => {
    const html = renderGraphHtml({ nodes: [], links: [] });
    assert.ok(html.startsWith("<!DOCTYPE html>"));
  });

  it("includes oklch node color configuration", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("oklch(0.61 0.18 48)")); // problem color
    assert.ok(html.includes("oklch(0.58 0.10 202)")); // need color
    assert.ok(html.includes("oklch(0.56 0.16 266)")); // fr color
  });

  it("includes CSS custom properties for theming", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("--background"));
    assert.ok(html.includes("--foreground"));
    assert.ok(html.includes("--node-problem"));
    assert.ok(html.includes("--border"));
  });

  it("includes window.srsNavigator API", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("window.srsNavigator"));
    assert.ok(html.includes("getState"));
    assert.ok(html.includes("selectNode"));
    assert.ok(html.includes("setMode"));
  });

  it("includes zoom controls", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('id="zoom-in"'));
    assert.ok(html.includes('id="zoom-out"'));
    assert.ok(html.includes('id="zoom-reset"'));
  });

  it("includes Problem-Based SRS title and badge", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("Problem-Based SRS"));
    assert.ok(html.includes('id="problem-badge"'));
  });

  it("includes Space Grotesk and JetBrains Mono fonts", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("Space+Grotesk"));
    assert.ok(html.includes("JetBrains+Mono"));
  });

  it("includes gradient SVG background", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("radial-gradient"));
    assert.ok(html.includes("oklch(0.975"));
  });

  it("uses dashed stroke for links", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("stroke-dasharray: 5,5"));
  });

  it("includes hull polygon for selection", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("hull-group"));
    assert.ok(html.includes("polygonHull"));
  });
});

describe("renderGraphHtml - Hardening", () => {
  it("handles empty nodes array gracefully", () => {
    const html = renderGraphHtml({ nodes: [], links: [] });
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("empty"));
  });

  it("escapes HTML special characters in title", () => {
    const html = renderGraphHtml(
      { nodes: [{ id: "CP-1", type: "problem", label: "Test", data: {} }], links: [] },
      { title: '<script>alert("xss")</script>' }
    );
    assert.ok(!html.includes('<script>alert'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it("handles nodes with very long labels", () => {
    const longLabel = "A".repeat(200);
    const html = renderGraphHtml({
      nodes: [{ id: "CP-1", type: "problem", label: longLabel, data: {} }],
      links: []
    });
    assert.ok(html.includes("<!DOCTYPE html>"));
    // Should not crash
    assert.ok(html.length > 1000);
  });

  it("handles nodes with emoji in labels", () => {
    const html = renderGraphHtml({
      nodes: [{ id: "CP-1", type: "problem", label: "🚀 Rocket Feature 🎉", data: {} }],
      links: []
    });
    assert.ok(html.includes("🚀"));
    assert.ok(html.includes("🎉"));
  });

  it("handles nodes with special characters in IDs", () => {
    const html = renderGraphHtml({
      nodes: [{ id: "CP-1/α", type: "problem", label: "Greek", data: {} }],
      links: []
    });
    assert.ok(html.includes("<!DOCTYPE html>"));
  });

  it("includes ARIA roles on health bar", () => {
    const html = renderGraphHtml({
      nodes: [
        { id: "CP-1", type: "problem", label: "P1", data: {} },
        { id: "CN-1", type: "need", label: "N1", data: {} }
      ],
      links: [{ source: "CP-1", target: "CN-1", type: "addresses" }]
    });
    assert.ok(html.includes('role="toolbar"'));
    assert.ok(html.includes('aria-label="Specification health metrics"'));
  });

  it("includes reduced-motion media query", () => {
    const html = renderGraphHtml({
      nodes: [{ id: "CP-1", type: "problem", label: "Test", data: {} }],
      links: []
    });
    assert.ok(html.includes("prefers-reduced-motion"));
    assert.ok(html.includes("transition-duration: 0.01ms"));
  });

  it("includes sr-only class and live region", () => {
    const html = renderGraphHtml({
      nodes: [{ id: "CP-1", type: "problem", label: "Test", data: {} }],
      links: []
    });
    assert.ok(html.includes("sr-only"));
    assert.ok(html.includes('id="sr-announcer"'));
    assert.ok(html.includes('aria-live="assertive"'));
  });

  it("includes empty state guard for invalid graph data", () => {
    const html = renderGraphHtml({
      nodes: [{ id: "CP-1", type: "problem", label: "Test", data: {} }],
      links: []
    });
    // Should have the guard code in the script
    assert.ok(html.includes("No valid specification data"));
    assert.ok(html.includes("Specification is empty"));
  });

  it("handles links referencing nonexistent nodes without crashing", () => {
    const html = renderGraphHtml({
      nodes: [{ id: "CP-1", type: "problem", label: "Only node", data: {} }],
      links: [{ source: "CP-1", target: "NONEXISTENT", type: "addresses" }]
    });
    assert.ok(html.includes("<!DOCTYPE html>"));
  });
});