// Graph metrics for the SRS Navigator health bar — one implementation, shared by the
// renderer and by anything that needs to *derive* those numbers instead of quoting them.
//
// Why this was extracted (issue #107). The evidence plan on #92 gated on "29 nodes, 5 need
// clusters, 100% traceability". Those are snapshots of one specification, and the review
// said so:
//
//   "'need clusters' is a renderer metric based on graph degree >= 4, not a direct spec-array
//    count; reuse/extract that calculation and guard it with fixtures."
//
// It was right about the mechanism: `hubs` counts nodes whose total degree reaches 4, which
// is a property of the *graph*, not of any array in the specification. Nothing outside the
// browser could compute it, so a pack wanting the number had to read it off a screenshot —
// and a number read off a screenshot is edited to match the screenshot.
//
// The renderer now injects `computeHotspots` and `healthMetrics` into the page verbatim
// (see `graphMetricsSource()`), so the browser and Node run the same function rather than
// two functions that agree today.
//
// `computeHotspots` deliberately annotates the nodes it is given (`_degree`, `_hotspot`,
// `_hotspotSeverity`, `_radius`): the force simulation reads those fields off the same
// objects. Callers that only want the counts can pass copies.

/**
 * Classify every node by connectivity and annotate it for rendering.
 *
 * The four classes are ordered, and the order is the definition — a problem with no
 * outgoing edge is *orphaned*, never *isolated*, even though both have degree 0 on that
 * side, because the first names a traceability gap and the second names a stray node.
 *
 * @param {Array<{id:string,type:string}>} nodes
 * @param {Array<{source:any,target:any}>} links
 * @returns {{orphanedProblems:string[], unmetNeeds:string[], hubs:string[], leafNodes:string[], maxDegree:number}}
 */
export function computeHotspots(nodes, links) {
  const inDegree = {};
  const outDegree = {};
  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    outDegree[n.id] = 0;
  });
  links.forEach((l) => {
    const src = typeof l.source === "object" ? l.source.id : l.source;
    const tgt = typeof l.target === "object" ? l.target.id : l.target;
    outDegree[src] = (outDegree[src] || 0) + 1;
    inDegree[tgt] = (inDegree[tgt] || 0) + 1;
  });

  const orphanedProblems = []; // CP with no downstream
  const unmetNeeds = []; // CN with no downstream FR/NFR
  const hubs = []; // High connectivity (degree >= 4)
  const leafNodes = []; // Nodes with no connections at all

  nodes.forEach((n) => {
    const totalDegree = (inDegree[n.id] || 0) + (outDegree[n.id] || 0);
    n._degree = totalDegree;
    n._hotspot = null;
    n._hotspotSeverity = 0; // 0=none, 1=info, 2=warning, 3=critical

    if (n.type === "problem" && (outDegree[n.id] || 0) === 0) {
      orphanedProblems.push(n.id);
      n._hotspot = "orphaned";
      n._hotspotSeverity = 3;
    } else if (n.type === "need" && (outDegree[n.id] || 0) === 0) {
      unmetNeeds.push(n.id);
      n._hotspot = "unmet";
      n._hotspotSeverity = 2;
    } else if (totalDegree >= 4) {
      hubs.push(n.id);
      n._hotspot = "hub";
      n._hotspotSeverity = 1;
    } else if (totalDegree === 0) {
      leafNodes.push(n.id);
      n._hotspot = "isolated";
      n._hotspotSeverity = 3;
    }
  });

  // Node size scale: base 22, only scale up for "Need Cluster" hubs
  const maxDegree = Math.max(...nodes.map((n) => n._degree), 1);
  nodes.forEach((n) => {
    n._radius = n._hotspot === "hub" ? 22 + (n._degree / maxDegree) * 10 : 22;
  });

  return { orphanedProblems, unmetNeeds, hubs, leafNodes, maxDegree };
}

/**
 * The figures the health bar shows, from a graph.
 *
 * Coverage is "nodes that are not a gap", where a gap is an orphaned problem, an unmet need
 * or an isolated node — so 100% means every node participates in a chain, not that every
 * requirement traces (which `validation.mjs` answers separately).
 *
 * @param {{nodes:Array, links:Array}} graphData
 * @returns {{nodes:number, links:number, orphanedProblems:number, unmetNeeds:number, isolated:number, needClusters:number, gaps:number, traceability:number}}
 */
export function healthMetrics(graphData) {
  const nodes = (graphData?.nodes ?? []).map((n) => ({ ...n }));
  const links = graphData?.links ?? [];
  const hotspots = computeHotspots(nodes, links);
  const total = nodes.length;
  const gaps =
    hotspots.orphanedProblems.length + hotspots.unmetNeeds.length + hotspots.leafNodes.length;
  return {
    nodes: total,
    links: links.length,
    orphanedProblems: hotspots.orphanedProblems.length,
    unmetNeeds: hotspots.unmetNeeds.length,
    isolated: hotspots.leafNodes.length,
    needClusters: hotspots.hubs.length,
    gaps,
    traceability: total > 0 ? Math.round(((total - gaps) / total) * 100) : 100,
  };
}

/**
 * The source the renderer injects into the page, so the browser runs *these* functions
 * rather than a copy that agrees with them today.
 *
 * `Function.prototype.toString()` returns the original source text, which is what makes
 * this a share rather than a duplication: editing `computeHotspots` above changes what the
 * page executes, and there is no second definition to forget.
 *
 * @returns {string} evaluatable JavaScript defining computeHotspots and healthMetrics
 */
export function graphMetricsSource() {
  return `${computeHotspots.toString()}\n${healthMetrics.toString()}`;
}
