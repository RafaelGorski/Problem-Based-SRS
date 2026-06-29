// HTML renderer for the SRS Navigator canvas
// Generates a self-contained HTML page with D3.js force-directed graph
// Styled to match the original Problem-Based SRS Navigator application

const NODE_COLORS = {
  problem: { fill: 'oklch(0.65 0.19 50)', stroke: 'oklch(0.55 0.19 50)', text: '#fff', label: 'Problem', fullLabel: 'Customer Problem' },
  need: { fill: 'oklch(0.60 0.15 200)', stroke: 'oklch(0.50 0.15 200)', text: '#fff', label: 'Need', fullLabel: 'Customer Need' },
  fr: { fill: 'oklch(0.55 0.18 265)', stroke: 'oklch(0.45 0.18 265)', text: '#fff', label: 'FR', fullLabel: 'Functional Requirement' },
  nfr: { fill: 'oklch(0.68 0.15 330)', stroke: 'oklch(0.58 0.15 330)', text: '#fff', label: 'NFR', fullLabel: 'Non-Functional Requirement' }
};

// SVG icons matching Phosphor icons from the original (using currentColor for dynamic coloring)
const NODE_ICONS = {
  problem: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM152,176a8,8,0,0,1-8,8H108a8,8,0,0,1-7.41-11l20-48H108a8,8,0,0,1,0-16h36a8,8,0,0,1,7.41,11l-20,48H144A8,8,0,0,1,152,176Z"/></svg>`,
  need: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="currentColor"><path d="M221.87,83.16l-40-32A8,8,0,0,0,176,48H80a8,8,0,0,0-5.87,2.56l-40,32A8,8,0,0,0,32,88v80a8,8,0,0,0,2.13,5.44l40,44A8,8,0,0,0,80,220h96a8,8,0,0,0,5.87-2.56l40-44A8,8,0,0,0,224,168V88A8,8,0,0,0,221.87,83.16ZM208,165.1l-36.42,40H84.42L48,165.1V90.9l36.42-26.9h87.16L208,90.9Z"/></svg>`,
  fr: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="currentColor"><path d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.29Zm176,27.7-48-40a8,8,0,1,0-10.24,12.29L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z"/></svg>`,
  nfr: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="currentColor"><path d="M208,40H48A16,16,0,0,0,32,56v58.77c0,89.62,75.82,119.34,91,124.39a15.53,15.53,0,0,0,10,0c15.2-5.05,91-34.77,91-124.39V56A16,16,0,0,0,208,40Zm0,74.79c0,78.42-66.35,104.62-80,109.18-13.53-4.51-80-30.69-80-109.18V56H208ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z"/></svg>`
};

/**
 * Render the full interactive HTML page for the SRS graph
 * Styled to match the original Problem-Based SRS Navigator
 */
export function renderGraphHtml(graphData, options = {}) {
  const { title = 'SRS Navigator', analysisMode = 'customer-problem', selectedNodeId = null, isDemo = false, showLanding = false } = options;
  // Escape `<` to its unicode form so spec content cannot break out of the
  // <script> block (e.g. a label containing "</script>") — prevents XSS.
  const graphJSON = JSON.stringify(graphData).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <script src="https://d3js.org/d3.v7.min.js"><\/script>
  <style>
    :root {
      --background: oklch(0.98 0 0);
      --foreground: oklch(0.15 0.02 240);
      --card: oklch(1 0 0);
      --card-foreground: oklch(0.15 0.02 240);
      --primary: oklch(0.35 0.12 265);
      --primary-foreground: oklch(0.98 0 0);
      --secondary: oklch(0.45 0.02 240);
      --muted: oklch(0.75 0.01 240);
      --muted-foreground: oklch(0.40 0.02 240);
      --accent: oklch(0.55 0.15 200);
      --border: oklch(0.87 0.01 240);
      --hover: oklch(0.95 0.005 240);
      --focus: oklch(0.55 0.15 200);
      --node-problem: oklch(0.65 0.19 50);
      --node-need: oklch(0.60 0.15 200);
      --node-fr: oklch(0.55 0.18 265);
      --node-nfr: oklch(0.68 0.15 330);
      --radius: 0.5rem;
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 24px;
      --space-2xl: 32px;
      --transition-fast: 0.15s ease-out;
      --transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    body {
      font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
      background: var(--background);
      color: var(--foreground);
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Focus ring for keyboard navigation */
    :focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    :focus:not(:focus-visible) { outline: none; }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    .toolbar {
      border-bottom: 1px solid var(--border);
      background: var(--card);
      flex-shrink: 0;
    }
    .toolbar-row {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
    }
    .toolbar-row:first-child {
      justify-content: space-between;
    }
    .toolbar-row:last-child {
      padding-top: 0;
      padding-bottom: var(--space-md);
      flex-wrap: wrap;
    }
    .title-section {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      min-width: 0;
    }
    .title-section h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: var(--space-xs) var(--space-sm);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: oklch(0.55 0.12 50);
      color: white;
      white-space: nowrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px var(--space-md);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: transparent;
      color: var(--foreground);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
      white-space: nowrap;
      user-select: none;
    }
    .btn:hover { background: var(--hover); }
    .btn:active { background: oklch(0.92 0.01 240); }
    .btn.active {
      background: var(--primary);
      color: var(--primary-foreground);
      border-color: var(--primary);
    }
    .btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .btn-icon {
      width: 34px;
      height: 34px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--foreground);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .btn-icon:hover { background: var(--hover); }
    .btn-icon:active { background: oklch(0.92 0.01 240); }
    .btn-icon svg { width: 16px; height: 16px; }
    .btn-group {
      display: flex;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 3px;
      background: oklch(0.97 0 0);
      gap: 2px;
    }
    .btn-group .btn {
      border: none;
      height: 30px;
      border-radius: calc(var(--radius) - 2px);
      font-size: 13px;
    }
    .btn-group .btn.active { box-shadow: 0 1px 3px oklch(0 0 0 / 0.08); }
    .search-container {
      position: relative;
      flex: 1;
      min-width: 140px;
      max-width: 320px;
    }
    .search-icon {
      position: absolute;
      left: var(--space-sm);
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted-foreground);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 6px var(--space-sm) 6px 32px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 13px;
      font-family: inherit;
      background: var(--card);
      color: var(--foreground);
      height: 34px;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .search-input:focus { outline: none; border-color: var(--focus); box-shadow: 0 0 0 3px oklch(0.55 0.15 200 / 0.15); }
    .search-input::placeholder { color: var(--muted-foreground); }
    .spec-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px var(--space-md);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      height: 34px;
      font-family: inherit;
      color: var(--foreground);
      transition: background var(--transition-fast);
    }
    .spec-btn:hover { background: var(--hover); }
    .spec-btn svg { flex-shrink: 0; }
    .analysis-section {
      display: flex;
      align-items: center;
      gap: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 3px;
      background: oklch(0.97 0 0);
      height: 34px;
    }
    .analysis-section .btn {
      border: none;
      height: 28px;
      border-radius: calc(var(--radius) - 2px);
      font-size: 13px;
    }
    .analysis-section .btn.active { box-shadow: 0 1px 3px oklch(0 0 0 / 0.08); }
    .type-indicators {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-left: var(--space-sm);
      padding-left: var(--space-sm);
      border-left: 1px solid var(--border);
    }
    .type-indicator {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }
    .type-dot {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .type-dot svg { width: 14px; height: 14px; }
    .type-label { font-size: 12px; font-weight: 600; }
    .graph-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    #graph-svg {
      width: 100%;
      height: 100%;
      background:
        radial-gradient(circle at 20% 30%, oklch(0.80 0.03 200 / 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, oklch(0.80 0.03 280 / 0.08) 0%, transparent 50%),
        oklch(0.975 0.003 240);
    }
    .zoom-controls {
      position: absolute;
      top: var(--space-lg);
      left: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: var(--space-xs);
      box-shadow: 0 2px 8px oklch(0 0 0 / 0.06);
    }
    .zoom-controls .btn-icon {
      border: none;
      width: 30px;
      height: 30px;
      border-radius: calc(var(--radius) - 2px);
    }
    .zoom-controls .btn-icon svg { width: 15px; height: 15px; }
    .node { cursor: pointer; }
    .node:hover { filter: brightness(1.04); }
    .node text.node-id {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 11px;
      font-weight: 600;
      fill: var(--foreground);
      text-anchor: middle;
      pointer-events: none;
    }
    .node text.node-label {
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: 10px;
      font-weight: 500;
      fill: oklch(0.30 0.02 240);
      text-anchor: middle;
      pointer-events: none;
    }
    .link {
      stroke: oklch(0.70 0.03 240);
      stroke-width: 1.5;
      stroke-opacity: 0.35;
      stroke-dasharray: 5,5;
      fill: none;
    }

    /* Detail Panel — uses visibility+opacity for animatable show/hide */
    .detail-panel {
      position: absolute;
      top: 0;
      right: 0;
      width: 360px;
      height: 100%;
      background: var(--card);
      border-left: 1px solid var(--border);
      box-shadow: -4px 0 24px oklch(0 0 0 / 0.06);
      display: flex;
      flex-direction: column;
      z-index: 10;
      transform: translateX(100%);
      visibility: hidden;
      opacity: 0;
      transition: transform var(--transition-normal), opacity var(--transition-normal), visibility 0s 0.25s;
    }
    .detail-panel.active {
      transform: translateX(0);
      visibility: visible;
      opacity: 1;
      transition: transform var(--transition-normal), opacity var(--transition-normal), visibility 0s 0s;
    }
    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-lg);
      border-bottom: 1px solid var(--border);
      gap: var(--space-sm);
    }
    .detail-header h2 {
      font-size: 14px;
      font-weight: 600;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .detail-close {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted-foreground);
      transition: background var(--transition-fast), color var(--transition-fast);
      flex-shrink: 0;
    }
    .detail-close:hover { background: var(--hover); color: var(--foreground); }
    .detail-close svg { width: 16px; height: 16px; }
    .detail-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-xl);
    }
    .detail-body::-webkit-scrollbar { width: 6px; }
    .detail-body::-webkit-scrollbar-track { background: transparent; }
    .detail-body::-webkit-scrollbar-thumb { background: oklch(0.80 0 0); border-radius: 3px; }
    .detail-body::-webkit-scrollbar-thumb:hover { background: oklch(0.70 0 0); }
    .detail-body .node-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: var(--space-xs) var(--space-sm);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: var(--space-md);
      color: white;
    }
    .detail-body .node-badge svg { width: 14px; height: 14px; }
    .detail-body .node-id-text {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 13px;
      color: var(--muted-foreground);
      margin-bottom: var(--space-xs);
    }
    .detail-body .node-title {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: var(--space-lg);
      text-wrap: balance;
    }
    .detail-body .separator {
      height: 1px;
      background: var(--border);
      margin: var(--space-lg) 0;
    }
    .detail-body .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted-foreground);
      margin-bottom: var(--space-sm);
    }
    .detail-body .description {
      font-size: 14px;
      line-height: 1.65;
      color: var(--foreground);
      white-space: pre-wrap;
    }
    .complexity-bar {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .complexity-bar .bar {
      height: 10px;
      width: 28px;
      border-radius: 3px;
      transition: background var(--transition-fast);
    }
    .complexity-bar .bar.filled { background: var(--accent); }
    .complexity-bar .bar.empty { background: oklch(0.92 0 0); }
    .complexity-bar .level {
      margin-left: var(--space-sm);
      font-size: 13px;
      font-weight: 500;
      color: var(--muted-foreground);
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }
    .connections-section { margin-top: var(--space-xs); }
    .conn-direction {
      font-size: 12px;
      font-weight: 500;
      color: var(--muted-foreground);
      margin-bottom: var(--space-sm);
    }
    .conn-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-md); }
    .conn-badge {
      display: inline-flex;
      align-items: center;
      padding: var(--space-xs) var(--space-sm);
      border-radius: 6px;
      border: 1.5px solid;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast), box-shadow var(--transition-fast);
    }
    .conn-badge:hover { box-shadow: 0 1px 4px oklch(0 0 0 / 0.08); }
    /* Hull polygon for selection */
    .hull-path {
      pointer-events: none;
    }

    /* Health Bar */
    .health-bar {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-sm) var(--space-lg);
      border-bottom: 1px solid var(--border);
      background: oklch(0.97 0.003 240);
      font-size: 12px;
      font-weight: 500;
      flex-shrink: 0;
      overflow-x: auto;
    }
    .health-metric {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      white-space: nowrap;
      padding: 3px 8px;
      border-radius: 9999px;
      cursor: pointer;
      transition: background var(--transition-fast), box-shadow var(--transition-fast);
    }
    .health-metric:hover { background: oklch(0.93 0.01 240); }
    .health-metric.active { background: oklch(0.90 0.03 200); box-shadow: 0 0 0 1px oklch(0.55 0.15 200 / 0.3); }
    .health-metric .count {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 12px;
      font-weight: 700;
    }
    .health-metric .count.alert { color: oklch(0.55 0.19 30); }
    .health-metric .count.ok { color: oklch(0.45 0.15 145); }
    .health-metric .label { color: var(--muted-foreground); }
    .health-metric-sep {
      width: 1px;
      height: 16px;
      background: var(--border);
      flex-shrink: 0;
    }

    /* Hot-spot pulse animation on nodes */
    @keyframes hotspot-pulse {
      0%, 100% { r: 26; opacity: 0.4; }
      50% { r: 32; opacity: 0.15; }
    }
    .hotspot-ring {
      animation: hotspot-pulse 2s ease-in-out infinite;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .hotspot-ring { animation: none; opacity: 0.25; r: 28; }
      *, *::before, *::after {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }
    }

    /* Focus visible for keyboard navigation */
    .health-metric:focus-visible,
    .btn:focus-visible,
    .btn-icon:focus-visible,
    .spec-btn:focus-visible,
    .conn-badge:focus-visible,
    .modal-tab:focus-visible {
      outline: 2px solid oklch(0.55 0.15 200);
      outline-offset: 2px;
    }

    /* Text overflow protection */
    .node-label, .node-id {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .node-title {
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .detail-body { overflow-wrap: break-word; }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: var(--space-md);
      color: var(--muted-foreground);
      font-size: 14px;
      text-align: center;
      padding: var(--space-xl);
    }
    .empty-state svg { opacity: 0.4; }

    /* Error state */
    .error-banner {
      padding: var(--space-sm) var(--space-lg);
      background: oklch(0.95 0.05 30);
      border-bottom: 1px solid oklch(0.85 0.10 30);
      color: oklch(0.40 0.15 30);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    .error-banner button {
      margin-left: auto;
      background: none;
      border: none;
      color: inherit;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
    }

    /* Hot-spot insight callout in detail panel */
    .hotspot-insight {
      margin: var(--space-md) 0;
      padding: var(--space-sm) var(--space-md);
      border-radius: 6px;
      background: oklch(0.97 0.01 50);
      border: 1px solid oklch(0.90 0.03 50);
      font-size: 12px;
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
    }
    .hotspot-insight-icon { flex-shrink: 0; font-size: 14px; line-height: 1.3; }

    /* Demo indicator badge */
    .demo-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: oklch(0.85 0.12 80);
      color: oklch(0.35 0.12 80);
      margin-left: 6px;
    }

    /* Load Specification Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: oklch(0 0 0 / 0.4);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: var(--card);
      border-radius: 12px;
      width: 90%;
      max-width: 540px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 48px oklch(0 0 0 / 0.15), 0 0 0 1px var(--border);
      animation: modal-in 0.2s ease-out;
    }
    @keyframes modal-in {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      padding: var(--space-xl);
      border-bottom: 1px solid var(--border);
    }
    .modal-header h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: var(--space-xs);
    }
    .modal-header p {
      font-size: 13px;
      color: var(--muted-foreground);
      line-height: 1.4;
    }
    .modal-close {
      position: absolute;
      top: var(--space-lg);
      right: var(--space-lg);
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted-foreground);
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .modal-close:hover { background: var(--hover); color: var(--foreground); }
    .modal-close svg { width: 16px; height: 16px; }
    .modal-tabs {
      display: flex;
      gap: 2px;
      padding: 0 var(--space-xl);
      padding-top: var(--space-lg);
      border-bottom: 1px solid var(--border);
    }
    .modal-tab {
      padding: var(--space-sm) var(--space-md);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color var(--transition-fast), border-color var(--transition-fast);
    }
    .modal-tab:hover { color: var(--foreground); }
    .modal-tab.active { color: var(--foreground); border-bottom-color: var(--primary); }
    .modal-body {
      padding: var(--space-xl);
      overflow-y: auto;
      flex: 1;
    }
    .modal-section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted-foreground);
      margin-bottom: var(--space-md);
    }
    .spec-card {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: var(--space-lg);
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);
      margin-bottom: var(--space-md);
    }
    .spec-card:hover { background: var(--hover); border-color: oklch(0.70 0.05 240); }
    .spec-card.current { border-color: var(--accent); background: oklch(0.97 0.02 200); }
    .spec-card-header {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-sm);
    }
    .spec-card-header svg { color: var(--muted-foreground); flex-shrink: 0; }
    .spec-card-title { font-size: 14px; font-weight: 600; }
    .spec-card-desc {
      font-size: 13px;
      color: var(--muted-foreground);
      line-height: 1.4;
      margin-bottom: var(--space-sm);
    }
    .spec-card-meta {
      font-size: 12px;
      color: var(--muted);
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }
    .modal-info {
      font-size: 13px;
      color: var(--muted-foreground);
      line-height: 1.6;
      padding: var(--space-lg);
      background: oklch(0.97 0 0);
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    .modal-info code {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 12px;
      background: oklch(0.93 0 0);
      padding: 2px 5px;
      border-radius: 3px;
    }
    .toast {
      position: fixed;
      bottom: var(--space-xl);
      right: var(--space-xl);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: var(--space-md) var(--space-lg);
      box-shadow: 0 4px 16px oklch(0 0 0 / 0.1);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 13px;
      font-weight: 500;
      z-index: 200;
      transform: translateY(100px);
      opacity: 0;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    }
    .toast.show { transform: translateY(0); opacity: 1; }
    .toast svg { color: oklch(0.55 0.18 145); flex-shrink: 0; }
    .toast.toast-pending svg { color: oklch(0.65 0.15 265); }
    .toast.toast-error svg { color: oklch(0.60 0.22 25); }
    .toast-detail {
      font-size: 11px;
      color: oklch(0.55 0.12 25);
      cursor: pointer;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 2px;
      margin-left: 4px;
    }
    .toast-detail:hover { color: oklch(0.70 0.15 25); }
    .toast-dismiss {
      margin-left: 8px;
      cursor: pointer;
      color: oklch(0.50 0.02 265);
      font-size: 16px;
      line-height: 1;
    }
    .toast-dismiss:hover { color: oklch(0.80 0.02 265); }

    /* Error detail modal */
    .error-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: oklch(0 0 0 / 0.45);
      z-index: 500;
      justify-content: center;
      align-items: center;
    }
    .error-modal-overlay.active { display: flex; }
    .error-modal {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 8px 32px oklch(0 0 0 / 0.18);
      max-width: 520px;
      width: 90%;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .error-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--border);
    }
    .error-modal-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: oklch(0.60 0.22 25);
    }
    .error-modal-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--muted);
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .error-modal-close:hover { background: var(--hover); color: var(--foreground); }
    .error-modal-body {
      padding: var(--space-lg);
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
      color: var(--foreground);
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Responsive: narrow widths */
    @media (max-width: 720px) {
      .title-section h1 { font-size: 18px; }
      .badge { font-size: 11px; }
      .toolbar-row { gap: var(--space-sm); padding: var(--space-sm) var(--space-md); }
      .search-container { max-width: none; min-width: 100px; }
      .detail-panel { width: 100%; }
      .type-indicators { display: none; }
    }

    /* Action bar - appears on node hover */
    .action-bar {
      position: fixed;
      display: none;
      align-items: stretch;
      height: 36px;
      background: oklch(0.15 0.008 265);
      border-radius: 10px;
      box-shadow: 0 12px 32px -8px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(0.30 0.02 265 / 0.3);
      z-index: 300;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.15s cubic-bezier(0.22, 1, 0.36, 1), transform 0.15s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: auto;
      overflow: hidden;
    }
    .action-bar.visible {
      display: flex;
      opacity: 1;
      transform: translateY(0);
    }
    .action-bar.pinned {
      box-shadow: 0 0 0 1px oklch(0.45 0.12 265 / 0.6), 0 4px 16px oklch(0 0 0 / 0.4);
    }
    .action-bar-input {
      flex: 1;
      min-width: 140px;
      height: 100%;
      border: none;
      background: transparent;
      color: oklch(0.94 0.02 265);
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 400;
      padding: 0 12px;
      outline: none;
    }
    .action-bar-input::placeholder {
      color: oklch(0.55 0.02 265);
    }
    .action-bar-input:focus::placeholder {
      color: oklch(0.45 0.02 265);
    }
    .action-bar-divider {
      width: 1px;
      align-self: stretch;
      margin: 7px 0;
      background: oklch(0.30 0.02 265);
    }
    .action-bar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 0 4px;
    }
    .action-bar-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      padding: 0 8px;
      border: none;
      border-radius: 6px;
      background: oklch(0.20 0.015 265);
      color: oklch(0.75 0.03 265);
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease;
      position: relative;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .action-bar-btn:hover {
      background: oklch(0.28 0.03 265);
      color: oklch(0.94 0.02 265);
    }
    .action-bar-btn:active {
      background: oklch(0.18 0.03 265);
    }
    .action-bar-btn svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    .action-bar-btn-label {
      font-size: 11px;
      letter-spacing: 0.01em;
    }
    .action-bar-btn[title]::after {
      content: attr(title);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: oklch(0.10 0.01 265);
      color: oklch(0.90 0.02 265);
      font-size: 10px;
      font-weight: 500;
      padding: 3px 6px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.12s ease;
    }
    .action-bar-btn:hover[title]::after {
      opacity: 1;
    }
    .action-bar-submit {
      color: var(--node-fr);
      width: 28px;
      padding: 0;
      justify-content: center;
      background: transparent;
    }
    .action-bar-submit:hover {
      background: oklch(0.25 0.06 265);
      color: oklch(0.75 0.18 265);
    }
    @media (prefers-reduced-motion: reduce) {
      .action-bar { transition: none; }
      .action-bar-btn::after { transition: none; }
    }

    /* Landing action styles (used in spec modal) */
    .landing-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 320px;
    }
    .landing-action-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: oklch(1 0 0 / 0.95);
      color: var(--foreground);
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease-out, border-color 0.15s ease-out, transform 0.15s ease-out;
    }
    .landing-action-btn:hover {
      background: oklch(0.97 0.005 240);
      border-color: oklch(0.78 0.02 240);
    }
    .landing-action-btn:active {
      transform: scale(0.985);
    }
    .landing-action-btn.primary {
      background: var(--primary);
      color: var(--primary-foreground);
      border-color: var(--primary);
    }
    .landing-action-btn.primary:hover {
      background: oklch(0.30 0.12 265);
      border-color: oklch(0.30 0.12 265);
    }
    .landing-action-icon {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: oklch(0.95 0.01 240);
    }
    .landing-action-btn.primary .landing-action-icon {
      background: oklch(0.28 0.10 265);
    }
    .landing-action-icon svg { width: 16px; height: 16px; }
    .landing-action-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .landing-action-text .label {
      font-weight: 600;
      font-size: 13px;
      line-height: 1.3;
    }
    .landing-action-text .desc {
      font-size: 11px;
      font-weight: 400;
      color: oklch(0.45 0.02 240);
      line-height: 1.4;
    }
    .landing-action-btn.primary .landing-action-text .desc {
      color: oklch(0.78 0.03 265);
    }

    .landing-features {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding-top: 4px;
      border-top: 1px solid oklch(0.90 0.01 240);
    }
    .landing-feature {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
    }
    .landing-feature-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .landing-feature:nth-child(1) .landing-feature-dot { background: var(--node-problem); }
    .landing-feature:nth-child(2) .landing-feature-dot { background: var(--node-need); }
    .landing-feature:nth-child(3) .landing-feature-dot { background: var(--node-fr); }
    .landing-feature:nth-child(4) .landing-feature-dot { background: var(--node-nfr); }
    .landing-feature:nth-child(5) .landing-feature-dot { background: var(--accent); }
    .landing-feature:nth-child(6) .landing-feature-dot { background: var(--primary); }
    .landing-feature-text {
      font-size: 11px;
      font-weight: 500;
      line-height: 1.3;
      color: oklch(0.35 0.02 240);
    }

    .landing-action-btn.loading {
      pointer-events: none;
      opacity: 0.7;
    }
    .landing-action-btn.loading .landing-action-icon {
      animation: landing-pulse 1.5s ease-in-out infinite;
    }
    @keyframes landing-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @media (prefers-reduced-motion: reduce) {
      .landing-action-btn.loading .landing-action-icon { animation: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-row">
      <div class="title-section">
        <h1>Problem-Based SRS</h1>
        <span class="badge" id="problem-badge"></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="btn-group">
          <button class="btn active" id="btn-graph">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M200,152a31.84,31.84,0,0,0-19.53,6.68l-23.11-18A31.65,31.65,0,0,0,160,128a31.28,31.28,0,0,0-1.2-8.63l21.4-11.89A32,32,0,1,0,168,88a31.28,31.28,0,0,0,1.2,8.63l-21.4,11.89A32,32,0,0,0,96,104a31.65,31.65,0,0,0,2.64,12.68L75.53,134.68A32,32,0,1,0,88,168a31.65,31.65,0,0,0-2.64-12.68l23.11-18A31.84,31.84,0,0,0,128,160a32,32,0,0,0,19.53-6.68l23.11,18A32,32,0,1,0,200,152Z"/></svg>
            Graph
          </button>
          <button class="btn" id="btn-hierarchy" disabled title="Hierarchy view (not available in canvas mode)">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M168,120H136V88h8a16,16,0,0,0,16-16V40a16,16,0,0,0-16-16H112A16,16,0,0,0,96,40V72a16,16,0,0,0,16,16h8v32H88a24,24,0,0,0-24,24v16H56a16,16,0,0,0-16,16v32a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V176a16,16,0,0,0-16-16H80V144a8,8,0,0,1,8-8h80a8,8,0,0,1,8,8v16h-8a16,16,0,0,0-16,16v32a16,16,0,0,0,16,16h32a16,16,0,0,0,16-16V176a16,16,0,0,0-16-16h-8V144A24,24,0,0,0,168,120Z"/></svg>
            Hierarchy
          </button>
        </div>
      </div>
    </div>
    <div class="toolbar-row">
      <button class="spec-btn" id="spec-btn">
        <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"/></svg>
        <span>${escapeHtml(title)}</span>
        ${isDemo ? '<span class="demo-badge">Demo</span>' : ''}
      </button>
      <div class="search-container">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg>
        <input class="search-input" type="text" placeholder="Search nodes…" id="search" aria-label="Search nodes"/>
      </div>
      <div class="analysis-section">
        <button class="btn ${analysisMode === 'customer-problem' ? 'active' : ''}" data-mode="customer-problem">Problem Focus</button>
        <button class="btn ${analysisMode === 'implementation' ? 'active' : ''}" data-mode="implementation">Implementation</button>
        <div class="type-indicators" id="type-indicators"></div>
      </div>
    </div>
  </div>

  <div class="health-bar" id="health-bar" role="toolbar" aria-label="Specification health metrics"></div>

  <div class="graph-container" id="graph-container">
    <svg id="graph-svg"></svg>
    <div class="zoom-controls">
      <button class="btn-icon" id="zoom-in" title="Zoom in" aria-label="Zoom in">
        <svg viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Zm104,0a8,8,0,0,1-8,8H120v16a8,8,0,0,1-16,0V120H88a8,8,0,0,1,0-16h16V88a8,8,0,0,1,16,0v16h16A8,8,0,0,1,144,112Z"/></svg>
      </button>
      <button class="btn-icon" id="zoom-out" title="Zoom out" aria-label="Zoom out">
        <svg viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Zm104,0a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h48A8,8,0,0,1,144,112Z"/></svg>
      </button>
      <button class="btn-icon" id="zoom-reset" title="Refresh graph from spec" aria-label="Refresh graph from spec">
        <svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V96a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h28.69L163.31,62.63A80,80,0,0,0,48,128a8,8,0,0,1-16,0A96,96,0,0,1,174.63,51.37L200,76.69V48a8,8,0,0,1,16,0ZM224,120a8,8,0,0,0-8,8A80,80,0,0,1,92.69,193.37L68,168H96a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V179.31l25.37,25.32A96,96,0,0,0,232,128,8,8,0,0,0,224,120Z"/></svg>
      </button>
    </div>
    <div class="detail-panel" id="detail-panel">
      <div class="detail-header">
        <h2 id="detail-header-label">Node Details</h2>
        <button class="detail-close" id="close-panel" aria-label="Close details panel">
          <svg viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>
        </button>
      </div>
      <div class="detail-body" id="panel-content"></div>
    </div>
  </div>

  <!-- Specification Modal (unified: load, learn, demo) -->
  <div class="modal-overlay" id="spec-modal">
    <div class="modal" role="dialog" aria-labelledby="modal-title">
      <div class="modal-header" style="position:relative">
        <h2 id="modal-title">SRS Navigator</h2>
        <p>Load or generate a Problem-Based SRS specification to visualize as an interactive graph.</p>
        <button class="modal-close" id="modal-close" aria-label="Close modal">
          <svg viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>
        </button>
      </div>
      <div class="modal-body" id="modal-body" style="padding: 24px; display: flex; flex-direction: column; gap: 12px;">
        <div class="landing-actions" style="max-width:100%">
          <button class="landing-action-btn primary" id="modal-btn-learn" aria-label="Create a specification from your project">
            <span class="landing-action-icon" aria-hidden="true">
              <svg viewBox="0 0 256 256" fill="currentColor"><path d="M232,128a8,8,0,0,1-8,8H136v88a8,8,0,0,1-16,0V136H32a8,8,0,0,1,0-16h88V32a8,8,0,0,1,16,0v88h88A8,8,0,0,1,232,128Z"/></svg>
            </span>
            <span class="landing-action-text">
              <span class="label">Learn &amp; Create Spec</span>
              <span class="desc">Scan your project and generate a specification</span>
            </span>
          </button>
          <button class="landing-action-btn" id="modal-btn-load" aria-label="Load an existing specification file">
            <span class="landing-action-icon" aria-hidden="true">
              <svg viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"/></svg>
            </span>
            <span class="landing-action-text">
              <span class="label">Load Specification</span>
              <span class="desc">Open an existing .spec JSON file from your project</span>
            </span>
          </button>
          <button class="landing-action-btn" id="modal-btn-demo" aria-label="Load the built-in demo specification">
            <span class="landing-action-icon" aria-hidden="true">
              <svg viewBox="0 0 256 256" fill="currentColor"><path d="M208,24H72A32,32,0,0,0,40,56V224a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16H56a16,16,0,0,1,16-16H208a8,8,0,0,0,8-8V32A8,8,0,0,0,208,24Zm-8,160H72a31.82,31.82,0,0,0-16,4.29V56A16,16,0,0,1,72,40H200Z"/></svg>
            </span>
            <span class="landing-action-text">
              <span class="label">Explore Demo</span>
              <span class="desc">Load the CRM sample specification to explore features</span>
            </span>
          </button>
        </div>
        <div class="landing-features" style="margin-top: 8px;">
          <div class="landing-feature"><span class="landing-feature-dot" aria-hidden="true"></span><span class="landing-feature-text">Force-directed graph</span></div>
          <div class="landing-feature"><span class="landing-feature-dot" aria-hidden="true"></span><span class="landing-feature-text">Problem → Requirement tracing</span></div>
          <div class="landing-feature"><span class="landing-feature-dot" aria-hidden="true"></span><span class="landing-feature-text">Focused analysis modes</span></div>
          <div class="landing-feature"><span class="landing-feature-dot" aria-hidden="true"></span><span class="landing-feature-text">Node detail &amp; connections</span></div>
          <div class="landing-feature"><span class="landing-feature-dot" aria-hidden="true"></span><span class="landing-feature-text">Search &amp; filter</span></div>
          <div class="landing-feature"><span class="landing-feature-dot" aria-hidden="true"></span><span class="landing-feature-text">Agent-driven generation</span></div>
        </div>
        <div class="landing-actions" style="max-width:100%; margin-top: 8px; border-top: 1px solid var(--border); padding-top: 16px;">
          <button class="landing-action-btn" id="modal-btn-sync-skills" aria-label="Sync methodology skills from GitHub">
            <span class="landing-action-icon" aria-hidden="true">
              <svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V96a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h28.69L163.31,62.63A80,80,0,0,0,48,128a8,8,0,0,1-16,0A96,96,0,0,1,174.63,51.37L200,76.69V48a8,8,0,0,1,16,0ZM224,120a8,8,0,0,0-8,8A80,80,0,0,1,92.69,193.37L68,168H96a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V179.31l25.37,25.32A96,96,0,0,0,232,128,8,8,0,0,0,224,120Z"/></svg>
            </span>
            <span class="landing-action-text">
              <span class="label">Sync Skills</span>
              <span class="desc">Update methodology skills with the latest version from GitHub</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast notification -->
  <div class="toast" id="toast" role="status" aria-live="polite">
    <svg id="toast-icon" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>
    <span id="toast-text"></span>
    <a class="toast-detail" id="toast-detail" style="display:none"></a>
    <span class="toast-dismiss" id="toast-dismiss" title="Dismiss">&times;</span>
  </div>

  <!-- Error detail modal -->
  <div class="error-modal-overlay" id="error-modal-overlay">
    <div class="error-modal" role="dialog" aria-labelledby="error-modal-title" aria-modal="true">
      <div class="error-modal-header">
        <h3 id="error-modal-title">Action Error Details</h3>
        <button class="error-modal-close" id="error-modal-close" aria-label="Close">&times;</button>
      </div>
      <pre class="error-modal-body" id="error-modal-body"></pre>
    </div>
  </div>

  <!-- Action bar: appears on node hover -->
  <div class="action-bar" id="action-bar" role="toolbar" aria-label="Node actions">
    <input class="action-bar-input" id="action-bar-input" type="text" placeholder="Describe a change..." aria-label="Prompt for this node" autocomplete="off" />
    <div class="action-bar-divider"></div>
    <div class="action-bar-actions" id="action-bar-actions"></div>
  </div>
  <div id="sr-announcer" class="sr-only" aria-live="assertive" aria-atomic="true"></div>

  <script>
  (function() {
    const graphData = ${graphJSON};
    const nodeColors = ${JSON.stringify(NODE_COLORS)};
    const nodeIcons = ${JSON.stringify(NODE_ICONS)};
    let currentMode = "${analysisMode}";
    let searchTerm = "";
    let selectedNode = ${selectedNodeId ? `"${selectedNodeId}"` : 'null'};

    // Guard: validate graph data
    if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.links)) {
      document.getElementById('graph-container').innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg><p>No valid specification data.<br/>Use the agent to load a specification.</p></div>';
      return;
    }

    if (graphData.nodes.length === 0) {
      document.getElementById('graph-container').innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 256 256" fill="currentColor"><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208Z"/></svg><p>Specification is empty.<br/>Add problems, needs, and requirements to visualize.</p></div>';
      return;
    }

    // Problem badge
    const problemCount = graphData.nodes.filter(n => n.type === "problem").length;
    document.getElementById("problem-badge").textContent = problemCount + " Customer Problem" + (problemCount !== 1 ? "s" : "");

    // Type indicators
    function updateTypeIndicators() {
      const types = currentMode === "customer-problem" ? ["problem", "need"] : ["need", "fr", "nfr"];
      const container = document.getElementById("type-indicators");
      container.innerHTML = types.map(type => {
        const c = nodeColors[type];
        return '<div class="type-indicator"><div class="type-dot" style="background:' + c.fill + '">' + nodeIcons[type].replace('width="28" height="28"', 'width="12" height="12"') + '</div><span class="type-label" style="color:' + c.fill + '">' + c.label + '</span></div>';
      }).join("");
    }
    updateTypeIndicators();

    // Analysis mode buttons
    document.querySelectorAll(".analysis-section .btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".analysis-section .btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentMode = btn.dataset.mode;
        updateTypeIndicators();
        updateVisibility();
      });
    });

    // Search
    document.getElementById("search").addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      updateVisibility();
    });

    // D3 Setup
    const container = document.getElementById("graph-container");
    const svg = d3.select("#graph-svg");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const g = svg.append("g");

    // SVG defs for reusable filters
    const defs = svg.append("defs");
    const shadow = defs.append("filter").attr("id", "node-shadow").attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%");
    shadow.append("feDropShadow").attr("dx", 0).attr("dy", 1).attr("stdDeviation", 3).attr("flood-color", "oklch(0 0 0 / 0.1)");

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom);

    // Zoom controls
    document.getElementById("zoom-in").addEventListener("click", () => {
      svg.transition().duration(300).call(zoom.scaleBy, 1.3);
    });
    document.getElementById("zoom-out").addEventListener("click", () => {
      svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    });
    document.getElementById("zoom-reset").addEventListener("click", () => {
      const btn = document.getElementById("zoom-reset");
      btn.disabled = true;
      btn.style.opacity = "0.5";
      fetch("/api/refresh-spec").then(async res => {
        const data = await res.json().catch(() => ({}));
        if (data.refreshed) {
          window.location.reload();
        } else {
          // No newer spec found — fall back to zoom reset
          svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
          btn.disabled = false;
          btn.style.opacity = "";
        }
      }).catch(() => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        btn.disabled = false;
        btn.style.opacity = "";
      });
    });

    // Build simulation
    const links = graphData.links.map(d => ({...d}));
    const nodes = graphData.nodes.map(d => ({...d}));

    // === HOT-SPOT DETECTION ===
    // Compute connectivity and identify nodes that need attention
    const hotspots = (function() {
      const inDegree = {};
      const outDegree = {};
      nodes.forEach(n => { inDegree[n.id] = 0; outDegree[n.id] = 0; });
      links.forEach(l => {
        const src = typeof l.source === 'object' ? l.source.id : l.source;
        const tgt = typeof l.target === 'object' ? l.target.id : l.target;
        outDegree[src] = (outDegree[src] || 0) + 1;
        inDegree[tgt] = (inDegree[tgt] || 0) + 1;
      });

      const orphanedProblems = []; // CP with no downstream
      const unmetNeeds = [];       // CN with no downstream FR/NFR
      const hubs = [];             // High connectivity (degree >= 4)
      const leafNodes = [];        // Nodes with no connections at all

      nodes.forEach(n => {
        const totalDegree = (inDegree[n.id] || 0) + (outDegree[n.id] || 0);
        n._degree = totalDegree;
        n._hotspot = null;
        n._hotspotSeverity = 0; // 0=none, 1=info, 2=warning, 3=critical

        if (n.type === 'problem' && (outDegree[n.id] || 0) === 0) {
          orphanedProblems.push(n.id);
          n._hotspot = 'orphaned';
          n._hotspotSeverity = 3;
        } else if (n.type === 'need' && (outDegree[n.id] || 0) === 0) {
          unmetNeeds.push(n.id);
          n._hotspot = 'unmet';
          n._hotspotSeverity = 2;
        } else if (totalDegree >= 4) {
          hubs.push(n.id);
          n._hotspot = 'hub';
          n._hotspotSeverity = 1;
        } else if (totalDegree === 0) {
          leafNodes.push(n.id);
          n._hotspot = 'isolated';
          n._hotspotSeverity = 3;
        }
      });

      // Node size scale: base 22, only scale up for "Need Cluster" hubs
      const maxDegree = Math.max(...nodes.map(n => n._degree), 1);
      nodes.forEach(n => {
        // Only hubs (Need Clusters) get larger; all other nodes stay at base size
        if (n._hotspot === 'hub') {
          n._radius = 22 + (n._degree / maxDegree) * 10;
        } else {
          n._radius = 22;
        }
      });

      return { orphanedProblems, unmetNeeds, hubs, leafNodes, maxDegree };
    })();

    // Render health bar
    (function renderHealthBar() {
      const bar = document.getElementById('health-bar');
      const total = nodes.length;
      const gaps = hotspots.orphanedProblems.length + hotspots.unmetNeeds.length + hotspots.leafNodes.length;
      const coverage = total > 0 ? Math.round(((total - gaps) / total) * 100) : 100;

      if (total === 0) {
        bar.innerHTML = '<div class="health-metric"><span class="label">No nodes to analyze</span></div>';
        return;
      }

      let html = '';
      html += '<div class="health-metric" role="button" tabindex="0" aria-pressed="false" data-filter="all" aria-label="' + total + ' total nodes"><span class="count">' + total + '</span><span class="label">nodes</span></div>';
      html += '<div class="health-metric-sep" aria-hidden="true"></div>';

      if (hotspots.orphanedProblems.length > 0) {
        html += '<div class="health-metric" role="button" tabindex="0" aria-pressed="false" data-filter="orphaned" title="Problems with no linked needs" aria-label="' + hotspots.orphanedProblems.length + ' orphaned problems"><span class="count alert">' + hotspots.orphanedProblems.length + '</span><span class="label">orphaned problems</span></div>';
      }
      if (hotspots.unmetNeeds.length > 0) {
        html += '<div class="health-metric" role="button" tabindex="0" aria-pressed="false" data-filter="unmet" title="Needs with no linked requirements" aria-label="' + hotspots.unmetNeeds.length + ' unmet needs"><span class="count alert">' + hotspots.unmetNeeds.length + '</span><span class="label">unmet needs</span></div>';
      }
      if (hotspots.leafNodes.length > 0) {
        html += '<div class="health-metric" role="button" tabindex="0" aria-pressed="false" data-filter="isolated" title="Completely disconnected nodes" aria-label="' + hotspots.leafNodes.length + ' isolated nodes"><span class="count alert">' + hotspots.leafNodes.length + '</span><span class="label">isolated</span></div>';
      }
      if (hotspots.hubs.length > 0) {
        html += '<div class="health-metric" role="button" tabindex="0" aria-pressed="false" data-filter="hub" title="High-connectivity need nodes (4+ connections)" aria-label="' + hotspots.hubs.length + ' need clusters"><span class="count ok">' + hotspots.hubs.length + '</span><span class="label">need clusters</span></div>';
      }

      html += '<div class="health-metric-sep" aria-hidden="true"></div>';
      html += '<div class="health-metric" role="button" tabindex="0" aria-pressed="false" data-filter="all" aria-label="' + coverage + '% traceability coverage"><span class="count ' + (coverage === 100 ? 'ok' : coverage >= 80 ? '' : 'alert') + '">' + coverage + '%</span><span class="label">traceability</span></div>';

      bar.innerHTML = html;

      // Wire health metric click → filter hot spots
      function activateFilter(el) {
        const filter = el.dataset.filter;
        const wasActive = el.classList.contains('active');
        bar.querySelectorAll('.health-metric').forEach(m => {
          m.classList.remove('active');
          m.setAttribute('aria-pressed', 'false');
        });
        if (!wasActive && filter !== 'all') {
          el.classList.add('active');
          el.setAttribute('aria-pressed', 'true');
          hotspotFilter = filter;
          announce('Filtering: ' + el.getAttribute('aria-label'));
        } else {
          hotspotFilter = null;
          announce('Filter cleared');
        }
        updateVisibility();
      }

      bar.querySelectorAll('.health-metric[data-filter]').forEach(el => {
        el.addEventListener('click', () => activateFilter(el));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activateFilter(el);
          }
        });
      });
    })();

    // Screen reader announcements
    function announce(message) {
      const el = document.getElementById('sr-announcer');
      if (el) { el.textContent = ''; requestAnimationFrame(() => { el.textContent = message; }); }
    }

    let hotspotFilter = null;

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (d._radius || 22) + 35));

    // Hull group (for selection highlighting)
    const hullGroup = g.append("g").attr("class", "hull-group");

    // Links (dashed like original)
    const linkElements = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link");

    // Nodes
    const nodeElements = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node background plate (rounded rect behind icon — size varies by degree)
    nodeElements.append("rect")
      .attr("x", d => -(d._radius || 22)).attr("y", d => -(d._radius || 22))
      .attr("width", d => (d._radius || 22) * 2).attr("height", d => (d._radius || 22) * 2)
      .attr("rx", 10).attr("ry", 10)
      .attr("fill", "white")
      .attr("stroke", d => nodeColors[d.type]?.stroke || "#ccc")
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#node-shadow)");

    // Hot-spot pulse ring (only for nodes with attention needed)
    nodeElements.filter(d => d._hotspotSeverity >= 2)
      .insert("circle", ":first-child")
      .attr("class", "hotspot-ring")
      .attr("cx", 0).attr("cy", 0)
      .attr("r", d => (d._radius || 22) + 4)
      .attr("fill", "none")
      .attr("stroke", d => d._hotspotSeverity === 3 ? "oklch(0.60 0.19 50)" : "oklch(0.55 0.15 200)")
      .attr("stroke-width", 2);

    // Icon via foreignObject (like original)
    nodeElements.append("foreignObject")
      .attr("x", -20).attr("y", -20)
      .attr("width", 40).attr("height", 40)
      .attr("pointer-events", "none")
      .html(d => '<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:' + (nodeColors[d.type]?.fill || '#666') + '">' + (nodeIcons[d.type] || '') + '</div>');

    // Node ID text (positioned below plate, dynamic based on radius)
    nodeElements.append("text")
      .attr("class", "node-id")
      .attr("dy", d => (d._radius || 22) + 13)
      .text(d => (d.id || '').substring(0, 20));

    // Node label text (with word wrap, max 3 lines to prevent overflow)
    nodeElements.each(function(d) {
      const group = d3.select(this);
      const label = (d.label || '').substring(0, 80); // Truncate very long labels
      const words = label.split(/\s+/).filter(Boolean);
      if (words.length === 0) return;
      const maxWidth = 120;
      const lineHeight = 1.1;
      const maxLines = 3;
      const lines = [];
      let line = [];

      // Simple word wrap estimation (10px font, ~6px per char)
      for (const word of words) {
        line.push(word);
        if (line.join(" ").length * 6 > maxWidth && line.length > 1) {
          line.pop();
          lines.push(line.join(" "));
          line = [word];
          if (lines.length >= maxLines) break;
        }
      }
      if (line.length > 0 && lines.length < maxLines) lines.push(line.join(" "));
      // Add ellipsis if truncated
      if (lines.length >= maxLines && words.length > lines.join(" ").split(/\s+/).length) {
        lines[lines.length - 1] = lines[lines.length - 1].substring(0, 18) + '…';
      }

      const text = group.append("text")
        .attr("class", "node-label")
        .attr("y", d._radius + 26);

      lines.forEach((lineText, i) => {
        text.append("tspan")
          .attr("x", 0)
          .attr("dy", i === 0 ? "0em" : lineHeight + "em")
          .text(lineText);
      });
    });

    nodeElements.on("click", (event, d) => {
      event.stopPropagation();
      selectedNode = d.id;
      showDetail(d);
      updateVisibility();
    });

    svg.on("click", () => {
      selectedNode = null;
      hideDetail();
      updateVisibility();
      // Only dismiss action bar on background click if no text is being composed
      if (actionBarInput.value.length === 0) {
        actionBarLocked = false;
        hideActionBar();
      }
    });

    // === Action Bar (hover micro-toolbar) ===
    const actionBar = document.getElementById("action-bar");
    const actionBarInput = document.getElementById("action-bar-input");
    const actionBarActions = document.getElementById("action-bar-actions");
    let actionBarNode = null;
    let actionBarHideTimer = null;
    let actionBarLocked = false; // locks bar visible while interacting

    const ACTION_ICONS = {
      decompose: '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M128 40v176"/><path d="M56 128h144"/><circle cx="128" cy="40" r="12" fill="currentColor" stroke="none"/><circle cx="56" cy="128" r="12" fill="currentColor" stroke="none"/><circle cx="200" cy="128" r="12" fill="currentColor" stroke="none"/><circle cx="128" cy="216" r="12" fill="currentColor" stroke="none"/></svg>',
      addCP: '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm40,112H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32a8,8,0,0,1,0,16Z"/></svg>',
      addCN: '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M221.87,83.16l-40-32A8,8,0,0,0,176,48H80a8,8,0,0,0-5.87,2.56l-40,32A8,8,0,0,0,32,88v80a8,8,0,0,0,2.13,5.44l40,44A8,8,0,0,0,80,220h96a8,8,0,0,0,5.87-2.56l40-44A8,8,0,0,0,224,168V88A8,8,0,0,0,221.87,83.16Z"/></svg>',
      addFR: '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.29Zm176,27.7-48-40a8,8,0,1,0-10.24,12.29L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z"/></svg>',
      addNFR: '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M208,40H48A16,16,0,0,0,32,56v58.77c0,89.62,75.82,119.34,91,124.39a15.53,15.53,0,0,0,10,0c15.2-5.05,91-34.77,91-124.39V56A16,16,0,0,0,208,40Z"/></svg>',
      submit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    };

    // Maps action bar buttons to their corresponding SRS methodology skills
    // Each action maps to a skill tool name registered in the extension
    const SKILL_MAP = {
      decompose_problem: { skill: "customer_problems", label: "+Sub-CP", icon: "decompose" },
      decompose_need: { skill: "customer_needs", label: "+Sub-CN", icon: "decompose" },
      decompose_fr: { skill: "functional_requirements", label: "+Sub-FR", icon: "decompose" },
      decompose_nfr: { skill: "functional_requirements", label: "+Sub-NFR", icon: "decompose" },
      addCN: { skill: "customer_needs", label: "+CN", icon: "addCN" },
      addFR: { skill: "functional_requirements", label: "+FR", icon: "addFR" },
      addNFR: { skill: "functional_requirements", label: "+NFR", icon: "addNFR" },
      addCP: { skill: "customer_problems", label: "+CP", icon: "addCP" },
    };

    function getActionsForType(type) {
      const actions = [];
      if (type === "problem") {
        // CP can derive CNs and decompose into sub-CPs
        actions.push({ key: "addCN", label: "+CN", icon: ACTION_ICONS.addCN, skill: SKILL_MAP.addCN.skill });
        actions.push({ key: "decompose_problem", label: "+Sub-CP", icon: ACTION_ICONS.decompose, skill: SKILL_MAP.decompose_problem.skill });
      } else if (type === "need") {
        // CN can derive FRs and decompose into sub-CNs
        actions.push({ key: "addFR", label: "+FR", icon: ACTION_ICONS.addFR, skill: SKILL_MAP.addFR.skill });
        actions.push({ key: "decompose_need", label: "+Sub-CN", icon: ACTION_ICONS.decompose, skill: SKILL_MAP.decompose_need.skill });
      } else if (type === "fr") {
        // FR can derive NFRs and decompose into sub-FRs
        actions.push({ key: "addNFR", label: "+NFR", icon: ACTION_ICONS.addNFR, skill: SKILL_MAP.addNFR.skill });
        actions.push({ key: "decompose_fr", label: "+Sub-FR", icon: ACTION_ICONS.decompose, skill: SKILL_MAP.decompose_fr.skill });
      } else if (type === "nfr") {
        // NFR can decompose
        actions.push({ key: "decompose_nfr", label: "+Sub-NFR", icon: ACTION_ICONS.decompose, skill: SKILL_MAP.decompose_nfr.skill });
      }
      return actions;
    }

    function showActionBar(node, svgElement) {
      if (actionBarLocked && actionBarNode && actionBarNode.id === node.id) return;
      actionBarNode = node;

      // Build action buttons for this node type
      const actions = getActionsForType(node.type);
      actionBarActions.innerHTML = "";
      actions.forEach(action => {
        const btn = document.createElement("button");
        btn.className = "action-bar-btn";
        btn.setAttribute("aria-label", action.label);
        btn.setAttribute("title", action.label);
        btn.dataset.action = action.key;
        btn.dataset.skill = action.skill;
        btn.innerHTML = action.icon + '<span class="action-bar-btn-label">' + action.label + '</span>';
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleActionBarAction(action.key, action.skill, node);
        });
        actionBarActions.appendChild(btn);
      });

      // Add submit button for the text input
      const submitBtn = document.createElement("button");
      submitBtn.className = "action-bar-btn action-bar-submit";
      submitBtn.setAttribute("aria-label", "Submit prompt");
      submitBtn.innerHTML = ACTION_ICONS.submit;
      submitBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleActionBarAction("submit", null, node);
      });
      actionBarActions.appendChild(submitBtn);

      // Update placeholder based on node type
      const typeLabels = { problem: "Customer Problem", need: "Customer Need", fr: "Functional Req", nfr: "Non-Functional Req" };
      actionBarInput.placeholder = "Describe changes to " + (typeLabels[node.type] || node.type) + " " + node.id + "...";
      actionBarInput.value = "";

      // Position the bar below the node
      positionActionBar(svgElement);

      // Show with transition
      actionBar.style.display = "flex";
      requestAnimationFrame(() => { actionBar.classList.add("visible"); });
    }

    function positionActionBar(svgElement) {
      const svgRect = document.getElementById("graph-svg").getBoundingClientRect();
      const transform = d3.zoomTransform(document.getElementById("graph-svg"));
      const x = transform.applyX(actionBarNode.x) + svgRect.left;
      const y = transform.applyY(actionBarNode.y) + svgRect.top;

      const barW = Math.max(320, actionBar.offsetWidth);
      const GAP = 12;
      let top = y + 30 + GAP; // below node (node radius ~22 + gap)
      let left = x - barW / 2;

      // Keep in viewport
      if (top + 40 > window.innerHeight - 16) top = y - 30 - 36 - GAP; // above
      if (left < 8) left = 8;
      if (left + barW > window.innerWidth - 8) left = window.innerWidth - barW - 8;

      Object.assign(actionBar.style, { top: top + "px", left: left + "px", width: barW + "px" });
    }

    function hideActionBar() {
      if (actionBarLocked) return;
      // Never hide while user has typed content — prevents losing their work
      if (actionBarInput.value.length > 0) return;
      actionBar.classList.remove("visible");
      setTimeout(() => {
        if (!actionBar.classList.contains("visible")) actionBar.style.display = "none";
      }, 180);
      actionBarNode = null;
    }

    function handleActionBarAction(actionKey, skillName, node) {
      const prompt = actionBarInput.value.trim();

      // Build context message for the skill invocation
      const typeLabels = { problem: "Customer Problem", need: "Customer Need", fr: "Functional Requirement", nfr: "Non-Functional Requirement" };
      const nodeLabel = typeLabels[node.type] || node.type;
      let context = "";

      if (actionKey === "submit") {
        if (!prompt) return;
        const typeSkillMap = { problem: "customer_problems", need: "customer_needs", fr: "functional_requirements", nfr: "functional_requirements" };
        skillName = typeSkillMap[node.type] || "customer_problems";
        context = "Regarding " + nodeLabel + " " + node.id + " (" + node.label + "): " + prompt;
      } else if (actionKey.startsWith("decompose")) {
        context = "Decompose " + nodeLabel + " " + node.id + " (" + node.label + ") into finer-grained sub-items of the same type.";
        if (prompt) context += " Additional context: " + prompt;
      } else if (actionKey === "addCN") {
        context = "Derive a new Customer Need (CN) from " + nodeLabel + " " + node.id + " (" + node.label + "). The CN must trace back to this problem.";
        if (prompt) context += " Additional context: " + prompt;
      } else if (actionKey === "addFR") {
        context = "Derive a new Functional Requirement (FR) from " + nodeLabel + " " + node.id + " (" + node.label + "). The FR must trace back to this need.";
        if (prompt) context += " Additional context: " + prompt;
      } else if (actionKey === "addNFR") {
        context = "Derive a new Non-Functional Requirement (NFR) from " + nodeLabel + " " + node.id + " (" + node.label + "). The NFR must trace back to this requirement.";
        if (prompt) context += " Additional context: " + prompt;
      }

      if (!context || !skillName) return;

      // Fast local path: decompose deterministically on the server (no model
      // round-trip) for instant iteration, then reload the graph.
      if (actionKey.startsWith("decompose")) {
        showToast("⏳ Decomposing " + node.id + "...", { variant: "pending", persistent: true });
        fetch(location.origin + "/api/decompose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId: node.id }),
        }).then(async res => {
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok && data.added > 0) {
            showToast("✓ Added " + data.added + " sub-item(s) — reloading...");
            setTimeout(() => window.location.reload(), 400);
          } else if (data.added === 0) {
            showToast("Nothing to decompose — add detail then retry", { variant: "info" });
          } else {
            showToast("Decompose failed", { variant: "error" });
          }
        }).catch(() => showToast("Decompose failed", { variant: "error" }));
        return;
      }

      // Show persistent pending status
      showToast("⏳ Sending to agent: " + skillName + " on " + node.id + "...", { variant: "pending", persistent: true });

      // Send action to the extension server → triggers session.send()
      const serverBase = location.origin;
      fetch(serverBase + "/api/invoke-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionKey,
          skill: skillName,
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label,
          context: context,
        }),
      }).then(async res => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          showToast("⏳ Agent processing: " + skillName + " → " + node.id + "...", { variant: "pending", persistent: true });
          // Poll for spec changes and auto-refresh when agent finishes
          let polls = 0;
          const maxPolls = 120; // ~2 minutes at 1s intervals
          const pollInterval = setInterval(async () => {
            polls++;
            if (polls > maxPolls) {
              clearInterval(pollInterval);
              showToast("✓ Action sent — refresh manually when ready");
              return;
            }
            try {
              const checkRes = await fetch("/api/refresh-spec");
              const checkData = await checkRes.json().catch(() => ({}));
              if (checkData.refreshed) {
                clearInterval(pollInterval);
                showToast("✓ Spec updated — reloading graph...");
                setTimeout(() => window.location.reload(), 500);
              }
            } catch { /* keep polling */ }
          }, 1000);
        } else {
          showToast("⚠ Failed to reach agent", {
            variant: "error",
            persistent: true,
            detail: data.detail || data.error || ("HTTP " + res.status),
          });
        }
      }).catch(err => {
        showToast("⚠ Connection error", {
          variant: "error",
          persistent: true,
          detail: err.message || "Could not reach the extension server. Check if the canvas is still running.",
        });
      });

      actionBarInput.value = "";
      actionBarLocked = false;
      actionBar.classList.remove("pinned");
      hideActionBar();
    }

    // Hover interactions on nodes
    nodeElements.on("mouseenter", function(event, d) {
      clearTimeout(actionBarHideTimer);
      showActionBar(d, this);
    });
    nodeElements.on("mouseleave", function() {
      if (actionBarLocked) return;
      actionBarHideTimer = setTimeout(hideActionBar, 250);
    });

    // Keep bar visible while hovering it
    actionBar.addEventListener("mouseenter", () => {
      clearTimeout(actionBarHideTimer);
      actionBarLocked = true;
    });
    actionBar.addEventListener("mouseleave", () => {
      // Stay locked if user has typed content — they're thinking
      if (actionBarInput.value.length > 0) return;
      actionBarLocked = false;
      actionBarHideTimer = setTimeout(hideActionBar, 300);
    });

    // Submit on Enter in the input
    actionBarInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleActionBarAction("submit", null, actionBarNode);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        actionBarInput.value = "";
        actionBar.classList.remove("pinned");
        actionBarLocked = false;
        hideActionBar();
      }
      e.stopPropagation();
    });
    actionBarInput.addEventListener("input", () => {
      // Toggle pinned state based on content presence
      actionBar.classList.toggle("pinned", actionBarInput.value.length > 0);
    });
    actionBarInput.addEventListener("click", (e) => e.stopPropagation());

    // Detail panel
    const panel = document.getElementById("detail-panel");
    document.getElementById("close-panel").addEventListener("click", () => {
      selectedNode = null;
      hideDetail();
      updateVisibility();
    });

    function showDetail(node) {
      panel.classList.add("active");
      const colors = nodeColors[node.type];
      const icon = nodeIcons[node.type] || '';
      const smallIcon = icon.replace('width="28" height="28"', 'width="14" height="14"');
      document.getElementById("detail-header-label").textContent = colors.fullLabel;
      const upstream = [];
      const downstream = [];
      for (const link of links) {
        const src = typeof link.source === "object" ? link.source.id : link.source;
        const tgt = typeof link.target === "object" ? link.target.id : link.target;
        if (tgt === node.id) upstream.push(src);
        if (src === node.id) downstream.push(tgt);
      }

      let html = '<span class="node-badge" style="background:' + colors.fill + '">' + smallIcon + ' ' + colors.fullLabel + '</span>';
      html += '<div class="node-id-text">' + escapeHtml(node.id) + '</div>';
      html += '<h3 class="node-title">' + escapeHtml(node.label) + '</h3>';

      // Hot-spot insight
      if (node._hotspot) {
        const insights = {
          orphaned: { icon: '⚠', color: 'oklch(0.55 0.19 50)', text: 'Orphaned — no linked needs. This problem lacks traceability to requirements.' },
          unmet: { icon: '⚠', color: 'oklch(0.55 0.15 200)', text: 'Unmet — no linked requirements. This need has no FR/NFR addressing it.' },
          hub: { icon: '◉', color: 'oklch(0.45 0.15 145)', text: 'Need Cluster — high connectivity (' + node._degree + ' connections). Key convergence point in the dependency graph.' },
          isolated: { icon: '⊘', color: 'oklch(0.55 0.19 50)', text: 'Isolated — no connections at all. This node is disconnected from the spec.' }
        };
        const insight = insights[node._hotspot];
        if (insight) {
          html += '<div class="hotspot-insight" style="color:' + insight.color + '"><span class="hotspot-insight-icon">' + insight.icon + '</span><span>' + insight.text + '</span></div>';
        }
      }

      html += '<div class="separator"></div>';
      html += '<div class="section-title">Description</div>';
      html += '<p class="description">' + escapeHtml(node.data?.description || 'No description available.') + '</p>';

      if (node.complexity) {
        html += '<div class="separator"></div>';
        html += '<div class="section-title">Complexity</div>';
        html += '<div class="complexity-bar">';
        for (let i = 1; i <= 5; i++) {
          html += '<div class="bar ' + (i <= node.complexity ? 'filled' : 'empty') + '"></div>';
        }
        html += '<span class="level">' + node.complexity + '/5</span></div>';
      }

      if (upstream.length > 0 || downstream.length > 0) {
        html += '<div class="separator"></div>';
        html += '<div class="section-title">Dependencies</div>';
        html += '<div class="connections-section">';
        if (upstream.length > 0) {
          html += '<div class="conn-direction">Upstream</div><div class="conn-badges">';
          for (const id of upstream) {
            const n = nodes.find(x => x.id === id);
            const c = n ? nodeColors[n.type] : nodeColors.need;
            html += '<span class="conn-badge" data-id="' + escapeHtml(id) + '" style="border-color:' + c.fill + ';color:' + c.fill + '">' + escapeHtml(id) + '</span>';
          }
          html += '</div>';
        }
        if (downstream.length > 0) {
          html += '<div class="conn-direction">Downstream</div><div class="conn-badges">';
          for (const id of downstream) {
            const n = nodes.find(x => x.id === id);
            const c = n ? nodeColors[n.type] : nodeColors.need;
            html += '<span class="conn-badge" data-id="' + escapeHtml(id) + '" style="border-color:' + c.fill + ';color:' + c.fill + '">' + escapeHtml(id) + '</span>';
          }
          html += '</div>';
        }
        html += '</div>';
      }

      document.getElementById("panel-content").innerHTML = html;
      document.querySelectorAll(".conn-badge").forEach(el => {
        el.addEventListener("click", () => {
          const target = nodes.find(n => n.id === el.dataset.id);
          if (target) { selectedNode = target.id; showDetail(target); updateVisibility(); }
        });
      });
    }

    function hideDetail() { panel.classList.remove("active"); }

    function getVisibleTypes() {
      if (currentMode === "customer-problem") return new Set(["problem", "need"]);
      if (currentMode === "implementation") return new Set(["need", "fr", "nfr"]);
      return new Set(["problem", "need", "fr", "nfr"]);
    }

    function updateVisibility() {
      const visibleTypes = getVisibleTypes();
      const downstreamIds = new Set();
      const downstreamLinkPairs = new Set();

      if (selectedNode) {
        downstreamIds.add(selectedNode);
        const findDownstream = (nodeId) => {
          for (const link of links) {
            const src = typeof link.source === "object" ? link.source.id : link.source;
            const tgt = typeof link.target === "object" ? link.target.id : link.target;
            if (src === nodeId && !downstreamIds.has(tgt)) {
              downstreamIds.add(tgt);
              downstreamLinkPairs.add(src + "->" + tgt);
              findDownstream(tgt);
            }
          }
        };
        findDownstream(selectedNode);
      }

      // Hull polygon
      hullGroup.selectAll("*").remove();
      if (selectedNode && downstreamIds.size > 1) {
        const hullPoints = [];
        downstreamIds.forEach(id => {
          const node = nodes.find(n => n.id === id);
          if (node && node.x != null && node.y != null) {
            const pad = 60;
            hullPoints.push([node.x - pad, node.y - pad]);
            hullPoints.push([node.x + pad, node.y - pad]);
            hullPoints.push([node.x - pad, node.y + pad]);
            hullPoints.push([node.x + pad, node.y + pad]);
          }
        });
        if (hullPoints.length >= 6) {
          const hull = d3.polygonHull(hullPoints);
          if (hull) {
            const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));
            hullGroup.append("path")
              .attr("d", line(hull))
              .attr("fill", "oklch(0.65 0.15 200 / 0.08)")
              .attr("stroke", "oklch(0.65 0.15 200 / 0.3)")
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "8,4")
              .attr("class", "hull-path")
              .style("filter", "drop-shadow(0 4px 16px oklch(0.65 0.15 200 / 0.2))")
              .attr("opacity", 0)
              .transition().duration(400).attr("opacity", 1);
          }
        }
      }

      let firstMatch = null;

      nodeElements.each(function(d) {
        const el = d3.select(this);
        const isFiltered = !visibleTypes.has(d.type);
        const matchesSearch = !searchTerm || d.id.toLowerCase().includes(searchTerm) || d.label.toLowerCase().includes(searchTerm);
        const isSelected = d.id === selectedNode;
        const isDownstream = downstreamIds.has(d.id);
        const matchesHotspot = !hotspotFilter || d._hotspot === hotspotFilter;
        const shouldDim = (isFiltered && !isDownstream) || (searchTerm && !matchesSearch) || (hotspotFilter && !matchesHotspot);

        if (!shouldDim && searchTerm && matchesSearch && !firstMatch) firstMatch = d;

        el.select("rect")
          .transition().duration(250)
          .attr("stroke", isSelected ? "oklch(0.55 0.15 200)" : isDownstream && !isSelected ? "oklch(0.65 0.15 200)" : (nodeColors[d.type]?.stroke || "#ccc"))
          .attr("stroke-width", isSelected ? 2.5 : isDownstream ? 2 : 1.5)
          .attr("fill", isSelected ? "oklch(0.95 0.05 200)" : "white");

        el.select("foreignObject")
          .transition().duration(250)
          .attr("opacity", shouldDim ? 0.15 : 1);

        el.selectAll("text")
          .transition().duration(250)
          .attr("opacity", shouldDim ? 0.15 : 1);

        // Hot-spot ring visibility
        el.select(".hotspot-ring")
          .transition().duration(250)
          .attr("opacity", shouldDim ? 0 : 1);
      });

      linkElements.each(function(d) {
        const src = typeof d.source === "object" ? d.source.id : d.source;
        const tgt = typeof d.target === "object" ? d.target.id : d.target;
        const srcNode = nodes.find(n => n.id === src);
        const tgtNode = nodes.find(n => n.id === tgt);
        const srcVisible = visibleTypes.has(srcNode?.type);
        const tgtVisible = visibleTypes.has(tgtNode?.type);
        const linkKey = src + "->" + tgt;
        const isDownstream = downstreamLinkPairs.has(linkKey);
        const bothVisible = srcVisible && tgtVisible;
        const matchesHotspot = !hotspotFilter || (srcNode?._hotspot === hotspotFilter || tgtNode?._hotspot === hotspotFilter);

        d3.select(this)
          .transition().duration(250)
          .attr("stroke-opacity", isDownstream ? 0.9 : (bothVisible && matchesHotspot ? 0.4 : (hotspotFilter ? 0.05 : 0.35)))
          .attr("stroke", isDownstream ? "oklch(0.65 0.15 200)" : "oklch(0.65 0.05 240)")
          .attr("stroke-width", isDownstream ? 3 : 2)
          .style("display", bothVisible || isDownstream ? null : "none");
      });

      // Auto-zoom to first match
      if (firstMatch && searchTerm) {
        const scale = 1.2;
        const x = firstMatch.x || width / 2;
        const y = firstMatch.y || height / 2;
        const transform = d3.zoomIdentity.translate(width/2, height/2).scale(scale).translate(-x, -y);
        svg.transition().duration(750).call(zoom.transform, transform);
      }

      // Auto-zoom to hotspot group
      if (hotspotFilter && !searchTerm && !selectedNode) {
        const hotNodes = nodes.filter(n => n._hotspot === hotspotFilter && n.x != null);
        if (hotNodes.length > 0) {
          const xs = hotNodes.map(n => n.x);
          const ys = hotNodes.map(n => n.y);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 200);
          const scale = Math.min(width, height) / (span + 200);
          const transform = d3.zoomIdentity.translate(width/2, height/2).scale(Math.min(scale, 2)).translate(-cx, -cy);
          svg.transition().duration(750).call(zoom.transform, transform);
        }
      }
    }

    // Simulation tick
    simulation.on("tick", () => {
      linkElements
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      nodeElements.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Initial visibility
    updateVisibility();

    // Handle resize
    window.addEventListener("resize", () => {
      simulation.force("center", d3.forceCenter(container.clientWidth / 2, container.clientHeight / 2));
      simulation.alpha(0.3).restart();
    });

    // Spec modal (unified: learn, load, demo)
    const specModal = document.getElementById("spec-modal");
    const showLandingOnLoad = ${showLanding};
    const isDemo = ${isDemo};

    function setModalLoading(btn, loading) {
      btn.classList.toggle('loading', loading);
      btn.disabled = loading;
    }

    function openModal() {
      specModal.classList.add("active");
      setTimeout(() => document.getElementById("modal-close").focus(), 100);
    }
    function closeModal() {
      specModal.classList.remove("active");
      const specBtn = document.getElementById("spec-btn");
      if (specBtn) specBtn.focus();
    }

    document.getElementById("spec-btn").addEventListener("click", openModal);
    document.getElementById("modal-close").addEventListener("click", closeModal);
    specModal.addEventListener("click", (e) => { if (e.target === specModal) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && specModal.classList.contains("active")) {
        e.preventDefault();
        closeModal();
      }
    });

    // Modal action buttons
    const modalBtnLearn = document.getElementById("modal-btn-learn");
    const modalBtnLoad = document.getElementById("modal-btn-load");
    const modalBtnDemo = document.getElementById("modal-btn-demo");

    modalBtnLearn.addEventListener("click", async () => {
      setModalLoading(modalBtnLearn, true);
      try {
        const res = await fetch('/api/landing-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'learn' })
        });
        const data = await res.json();
        if (data.ok) startSpecPolling();
        else setModalLoading(modalBtnLearn, false);
      } catch { setModalLoading(modalBtnLearn, false); }
    });

    modalBtnLoad.addEventListener("click", async () => {
      setModalLoading(modalBtnLoad, true);
      try {
        const res = await fetch('/api/landing-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'load' })
        });
        const data = await res.json();
        if (data.ok) startSpecPolling();
        else setModalLoading(modalBtnLoad, false);
      } catch { setModalLoading(modalBtnLoad, false); }
    });

    modalBtnDemo.addEventListener("click", async () => {
      setModalLoading(modalBtnDemo, true);
      try {
        const res = await fetch('/api/landing-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'demo' })
        });
        const data = await res.json();
        if (data.ok && data.reload) window.location.reload();
        else { setModalLoading(modalBtnDemo, false); closeModal(); }
      } catch { setModalLoading(modalBtnDemo, false); }
    });

    // Sync the bundled methodology skills from the upstream GitHub repo.
    const modalBtnSyncSkills = document.getElementById("modal-btn-sync-skills");
    modalBtnSyncSkills.addEventListener("click", async () => {
      setModalLoading(modalBtnSyncSkills, true);
      showToast("Syncing skills from GitHub…", { variant: "pending", persistent: true });
      try {
        const res = await fetch('/api/sync-skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        const data = await res.json();
        const updatedCount = (data.updated && data.updated.length) || 0;
        if (data.ok) {
          showToast('✓ Synced ' + updatedCount + ' skill' + (updatedCount !== 1 ? 's' : '') + ' from GitHub');
        } else {
          const detail = data.failed && data.failed.length
            ? data.failed.map(f => f.file + ': ' + f.error).join('\\n')
            : (data.error || 'Unknown error');
          const msg = updatedCount
            ? 'Synced ' + updatedCount + ', some skills failed'
            : 'Skill sync failed';
          showToast(msg, { variant: 'error', detail });
        }
      } catch (e) {
        showToast('Skill sync failed', { variant: 'error', detail: e.message });
      } finally {
        setModalLoading(modalBtnSyncSkills, false);
      }
    });

    // Polling for spec loaded via agent action
    let specPolling = false;
    function startSpecPolling() {
      if (specPolling) return;
      specPolling = true;
      const iv = setInterval(async () => {
        try {
          const res = await fetch('/api/check-spec');
          const data = await res.json();
          if (data.found) {
            clearInterval(iv);
            window.location.reload();
          }
        } catch {}
      }, 3000);
    }

    // Auto-open modal and start polling on landing pages (no spec loaded)
    if (showLandingOnLoad) {
      openModal();
      startSpecPolling();
    }

    // Toast
    const TOAST_ICONS = {
      success: '<path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/>',
      pending: '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"/>',
      error: '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/>',
    };
    let toastAutoTimer = null;

    // showToast(message, opts?)
    // opts.variant: "success" (default) | "pending" | "error"
    // opts.persistent: if true, stays until dismissed or replaced
    // opts.detail: error detail string (shown as clickable link)
    function showToast(message, opts) {
      opts = opts || {};
      const toast = document.getElementById("toast");
      const toastIcon = document.getElementById("toast-icon");
      const toastDetail = document.getElementById("toast-detail");
      document.getElementById("toast-text").textContent = message;

      // Icon
      const variant = opts.variant || "success";
      toastIcon.innerHTML = TOAST_ICONS[variant] || TOAST_ICONS.success;

      // Variant classes
      toast.classList.remove("toast-pending", "toast-error");
      if (variant === "pending") toast.classList.add("toast-pending");
      if (variant === "error") toast.classList.add("toast-error");

      // Detail link (for errors)
      if (opts.detail) {
        toastDetail.textContent = "Show details";
        toastDetail.title = opts.detail;
        toastDetail.style.display = "inline";
        toastDetail.onclick = (e) => {
          e.preventDefault();
          const overlay = document.getElementById("error-modal-overlay");
          document.getElementById("error-modal-body").textContent = opts.detail;
          overlay.classList.add("active");
        };
      } else {
        toastDetail.style.display = "none";
      }

      // Show
      toast.classList.add("show");
      clearTimeout(toastAutoTimer);
      if (!opts.persistent) {
        toastAutoTimer = setTimeout(() => toast.classList.remove("show"), 3000);
      }
    }

    // Dismiss button
    document.getElementById("toast-dismiss").addEventListener("click", () => {
      clearTimeout(toastAutoTimer);
      document.getElementById("toast").classList.remove("show");
    });

    // Error modal close handlers
    function closeErrorModal() {
      document.getElementById("error-modal-overlay").classList.remove("active");
    }
    document.getElementById("error-modal-close").addEventListener("click", closeErrorModal);
    document.getElementById("error-modal-overlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeErrorModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeErrorModal();
    });

    // Show toast on load if it's the demo
    if (isDemo) {
      setTimeout(() => showToast("Demo: CRM System loaded — use the agent to load your own spec"), 1000);
    }

    // Continuously watch for spec changes and auto-reload the graph.
    // The agent edits the spec file in the repo (.spec/) directly or via the
    // load_specification canvas action; this poll detects the change and
    // refreshes the UI without re-installing the extension.
    if (!showLandingOnLoad && !isDemo) {
      setInterval(async () => {
        try {
          const res = await fetch("/api/refresh-spec");
          const data = await res.json().catch(() => ({}));
          if (data.refreshed) {
            showToast("✓ Spec updated — reloading graph...");
            setTimeout(() => window.location.reload(), 400);
          }
        } catch { /* keep polling */ }
      }, 3000);
    }

    // Public API
    window.srsNavigator = {
      getState: () => ({ selectedNode, currentMode, searchTerm }),
      selectNode: (id) => {
        const node = nodes.find(n => n.id === id);
        if (node) { selectedNode = id; showDetail(node); updateVisibility(); }
      },
      setMode: (mode) => {
        currentMode = mode;
        document.querySelectorAll(".analysis-section .btn").forEach(b => {
          b.classList.toggle("active", b.dataset.mode === mode);
        });
        updateTypeIndicators();
        updateVisibility();
      }
    };
  })();
  <\/script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
