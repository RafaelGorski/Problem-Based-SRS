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

  it("defaults title to Problem-Based SRS", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("Problem-Based SRS"));
  });

  it("renders type indicators for all node types", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('id="type-indicators"'));
    assert.ok(!html.includes("Problem Focus"));
    assert.ok(!html.includes('data-mode='));
  });

  it("renders a version badge linking to releases", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('class="app-version"'), "version badge element present");
    assert.match(html, /v\d+\.\d+\.\d+/, "version badge shows an x.y.z version");
    assert.ok(html.includes("/releases"), "version badge links to releases");
  });

  it("renders a GitHub source link in the toolbar", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('class="gh-icon-link"'), "github link element present");
    assert.ok(html.includes('href="https://github.com/RafaelGorski/Problem-Based-SRS"'), "links to the repo");
  });

  it("emits a valid whitespace regex for label wrapping (not /s+/)", () => {
    // Guard against the template-literal escaping bug where /\s+/ collapses to
    // /s+/ in the generated script and splits labels on the letter 's'.
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("label.split(/\\s+/)"), "label wrap must split on whitespace, not 's'");
    assert.ok(!html.includes("label.split(/s+/)"), "must not split on the letter 's'");
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

  it("renders the CP badge as an interactive toggle button", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.match(html, /<button class="badge" id="problem-badge"[^>]*aria-pressed="false"/,
      "problem badge is a button with an aria-pressed toggle state");
    assert.ok(html.includes("setProblemHighlight"), "badge wires a highlight toggle");
    assert.ok(html.includes("badge-cp-count"), "badge count is animated via a dedicated span");
  });

  it("lays out the graph hierarchically with tier lanes (CPs on top)", () => {
    const html = renderGraphHtml(sampleGraph);
    // Vertical tier force replaces the old radial center force
    assert.ok(html.includes('d3.forceY'), "uses a vertical tier force");
    assert.ok(!html.includes('d3.forceCenter'), "no longer uses radial centering");
    assert.ok(html.includes("Customer Problems") && html.includes("Requirements"),
      "renders tier lane labels for the decomposition");
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

  it("includes the CP -> CN -> FR intro build animation", () => {
    const html = renderGraphHtml(sampleGraph);
    // Signature entrance: nodes reveal in methodology tier order, once per session.
    assert.ok(html.includes("srsIntroPlayed"), "intro reveal is gated once per session");
    assert.ok(html.includes("introReveal"), "intro reveal routine present");
    assert.ok(html.includes("_introDelay"), "per-node tier delay is computed");
    assert.ok(html.includes("prefers-reduced-motion"), "intro respects reduced motion");
  });

  it("includes hull polygon for selection", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("hull-group"));
    assert.ok(html.includes("polygonHull"));
  });
});

describe("renderGraphHtml - Hierarchical List View", () => {
  const sampleGraph = {
    nodes: [
      { id: "CP-1", type: "problem", label: "Test Problem", data: { description: "Desc" } },
      { id: "CN-1", type: "need", label: "Test Need", data: { description: "Need desc" } },
      { id: "FR-1", type: "fr", label: "Test FR", data: { description: "FR desc" }, complexity: 3 }
    ],
    links: [
      { source: "CP-1", target: "CN-1", type: "addresses" },
      { source: "CN-1", target: "FR-1", type: "implements" }
    ]
  };

  it("wraps graph + list + detail panel in a mode-scoped view wrapper", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('id="view-wrap"'));
    assert.ok(html.includes('class="view-wrap mode-graph"'));
    assert.ok(html.includes('id="list-view"'));
    assert.ok(html.includes('id="list-inner"'));
  });

  it("enables the List toggle button (no longer disabled)", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('id="btn-hierarchy"'));
    assert.ok(!html.includes('id="btn-hierarchy" disabled'), "List toggle must be enabled");
    assert.ok(html.includes('aria-pressed'), "toggle exposes pressed state");
  });

  it("builds the tree and wires a view toggle", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("buildTree"));
    assert.ok(html.includes('function() { setView("list"); }') || html.includes('setView("list")'));
    assert.ok(html.includes('mode-list'));
  });

  it("renders a Decompose row action for every node", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('data-act="decompose"'));
    assert.ok(html.includes("stageComposerAction"));
  });

  it("renders an Implement row action for requirements only", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('data-act="implement"'));
    assert.ok(html.includes('is-implement'));
    // guarded to fr/nfr in the row builder
    assert.ok(html.includes('node.type === "fr" || node.type === "nfr"'));
  });

  it("dispatches the implement action bypassing the empty-prompt guard", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes('actionKey !== "implement"'), "empty-prompt guard exempts implement");
    assert.ok(html.includes('action: actionKey'));
  });

  it("groups unlinked nodes under an Unlinked section", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("Unlinked"));
    assert.ok(html.includes("tree-section-label"));
  });

  it("shows an empty state that captures the first customer problem", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("No customer problems yet"));
    assert.ok(html.includes("establish_context"));
    assert.ok(html.includes('id="list-empty-form"'));
  });

  it("exposes setView on the public API", () => {
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("setView"));
    assert.ok(html.includes("viewMode"));
  });

  it("guards graph auto-zoom against a hidden (zero-size) container", () => {
    // When the list view is active the graph is display:none; applying a d3
    // zoom transform to a 0x0 SVG produces translate(NaN,NaN) console errors.
    const html = renderGraphHtml(sampleGraph);
    assert.ok(html.includes("graphVisible"), "auto-zoom is gated on graph visibility");
    assert.ok(
      html.includes("firstMatch && searchTerm && graphVisible"),
      "search auto-zoom requires a visible graph"
    );
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