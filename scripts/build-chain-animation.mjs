// Generates docs/assets/srs-chain.svg — a self-contained ANIMATED IMAGE (SVG with
// CSS keyframes) that shows the SRS Navigator building its traceability chain:
// Customer Problems appear first, then the Customer Needs that address them, then the
// Functional / Non-Functional Requirements that satisfy them, with links drawing in.
//
// It is an image (embedded via <img>), not the live app, but it reuses the real app's
// visual language: node colors and Phosphor icons are sampled verbatim from
// .github/extensions/srs-navigator/lib/renderer.mjs, and the chrome/labels mirror the
// real navigator on the bundled CRM demo spec. The canvas extension is not touched.
//
// Run: node scripts/build-chain-animation.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'docs', 'assets', 'srs-chain.svg');

// ── Node colors — sampled verbatim from renderer.mjs NODE_COLORS ──
const COLORS = {
  problem: { fill: 'oklch(0.61 0.18 48)', stroke: 'oklch(0.51 0.18 48)' },
  need:    { fill: 'oklch(0.58 0.10 202)', stroke: 'oklch(0.48 0.10 202)' },
  fr:      { fill: 'oklch(0.56 0.16 266)', stroke: 'oklch(0.46 0.16 266)' },
  nfr:     { fill: 'oklch(0.54 0.15 320)', stroke: 'oklch(0.44 0.15 320)' },
};

// ── Phosphor icon paths — sampled verbatim from renderer.mjs NODE_ICONS (256 viewBox) ──
const ICON = {
  problem: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM152,176a8,8,0,0,1-8,8H108a8,8,0,0,1-7.41-11l20-48H108a8,8,0,0,1,0-16h36a8,8,0,0,1,7.41,11l-20,48H144A8,8,0,0,1,152,176Z',
  need: 'M221.87,83.16l-40-32A8,8,0,0,0,176,48H80a8,8,0,0,0-5.87,2.56l-40,32A8,8,0,0,0,32,88v80a8,8,0,0,0,2.13,5.44l40,44A8,8,0,0,0,80,220h96a8,8,0,0,0,5.87-2.56l40-44A8,8,0,0,0,224,168V88A8,8,0,0,0,221.87,83.16ZM208,165.1l-36.42,40H84.42L48,165.1V90.9l36.42-26.9h87.16L208,90.9Z',
  fr: 'M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.29Zm176,27.7-48-40a8,8,0,1,0-10.24,12.29L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z',
  nfr: 'M208,40H48A16,16,0,0,0,32,56v58.77c0,89.62,75.82,119.34,91,124.39a15.53,15.53,0,0,0,10,0c15.2-5.05,91-34.77,91-124.39V56A16,16,0,0,0,208,40Zm0,74.79c0,78.42-66.35,104.62-80,109.18-13.53-4.51-80-30.69-80-109.18V56H208ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z',
};

const GITHUB = 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z';

// ── Design tokens (from docs/assets/site.css) ──
const T = {
  ink: 'oklch(0.30 0.012 264)',
  inkHeading: 'oklch(0.19 0.018 264)',
  muted: 'oklch(0.47 0.012 264)',
  mutedLight: 'oklch(0.62 0.012 264)',
  surface: 'oklch(0.965 0.004 240)',
  surfaceBorder: 'oklch(0.900 0.006 240)',
  primary: 'oklch(0.45 0.16 266)',
  bg: 'oklch(1 0 0)',
  link: 'oklch(0.74 0.02 262)',
};

const R = 30;                 // node radius
const ICON_S = 34 / 256;      // icon scale into the node

// The chain — a real slice of the CRM demo spec (ids/titles/links verbatim).
const nodes = [
  { id: 'CP-1',  type: 'problem', tier: 0, x: 150, y: 208, name: ['Scattered Customer', 'Information'] },
  { id: 'CP-2',  type: 'problem', tier: 0, x: 150, y: 398, name: ['Missed Follow-ups &', 'Lost Opportunities'] },
  { id: 'CN-1',  type: 'need',    tier: 1, x: 385, y: 208, name: ['Centralized Customer', 'Database'] },
  { id: 'CN-2',  type: 'need',    tier: 1, x: 385, y: 398, name: ['Automated Task &', 'Follow-up Mgmt'] },
  { id: 'FR-1',  type: 'fr',      tier: 2, x: 628, y: 150, name: ['Contact & Company', 'Management'] },
  { id: 'NFR-1', type: 'nfr',     tier: 2, x: 628, y: 262, name: ['Performance'] },
  { id: 'FR-3',  type: 'fr',      tier: 2, x: 628, y: 398, name: ['Task Management', 'System'] },
];
const links = [
  { s: 'CP-1', t: 'CN-1', tier: 1 },
  { s: 'CP-2', t: 'CN-2', tier: 1 },
  { s: 'CN-1', t: 'FR-1', tier: 2 },
  { s: 'CN-1', t: 'NFR-1', tier: 2 },
  { s: 'CN-2', t: 'FR-3', tier: 2 },
];
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function linkPath(l) {
  const s = byId[l.s], t = byId[l.t];
  const sx = s.x + R, sy = s.y, tx = t.x - R, ty = t.y;
  const c = (tx - sx) * 0.55;
  return `M${sx} ${sy} C${sx + c} ${sy}, ${tx - c} ${ty}, ${tx} ${ty}`;
}

function nodeGroup(n) {
  const c = COLORS[n.type];
  const idY = R + 20;
  const nameStart = R + 35;
  const nameTspans = n.name
    .map((line, i) => `<tspan x="0" y="${nameStart + i * 13}">${esc(line)}</tspan>`)
    .join('');
  return `
  <g transform="translate(${n.x} ${n.y})">
    <g class="node t${n.tier}">
      <circle r="${R}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2.5"/>
      <g transform="scale(${ICON_S.toFixed(4)}) translate(-128 -128)" fill="#fff" opacity="0.97">
        <path d="${ICON[n.type]}"/>
      </g>
      <text class="nid" y="${idY}">${n.id}</text>
      <text class="nname">${nameTspans}</text>
    </g>
  </g>`;
}

function legendItem(x, color, label) {
  return `<circle cx="${x}" cy="86" r="6" fill="${color}"/><text class="legend" x="${x + 12}" y="90">${label}</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 560" width="760" height="560" role="img" aria-labelledby="t d" preserveAspectRatio="xMidYMid meet">
  <title id="t">SRS Navigator building a traceability chain</title>
  <desc id="d">Customer Problems appear first, then the Customer Needs that address them, then the Functional and Non-Functional Requirements that satisfy them, connected step by step.</desc>
  <style>
    :root { color-scheme: light; }
    svg { background: ${T.bg}; }
    text { font-family: 'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
    .wordmark { font-weight: 800; font-size: 17px; letter-spacing: -0.01em; }
    .wordmark .accent { fill: ${T.primary}; }
    .toggle-txt { font-size: 12.5px; font-weight: 650; text-anchor: middle; dominant-baseline: middle; }
    .chip-txt { font-size: 12px; font-weight: 600; fill: ${T.ink}; dominant-baseline: middle; }
    .badge-txt { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-anchor: middle; dominant-baseline: middle; }
    .legend { font-size: 11px; fill: ${T.muted}; dominant-baseline: middle; }
    .zoom-glyph { font-size: 15px; fill: ${T.muted}; text-anchor: middle; dominant-baseline: central; }
    .nid { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12.5px; font-weight: 700; fill: ${T.inkHeading}; text-anchor: middle; }
    .nname { font-size: 10.5px; fill: ${T.muted}; text-anchor: middle; }

    .node { opacity: 0; transform-box: fill-box; transform-origin: center; animation: 6.5s linear infinite both; }
    .node.t0 { animation-name: revA; }
    .node.t1 { animation-name: revB; }
    .node.t2 { animation-name: revC; }
    .link { fill: none; stroke: ${T.link}; stroke-width: 2.4px; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; animation: 6.5s linear infinite both; }
    .link.l1 { animation-name: drawB; }
    .link.l2 { animation-name: drawC; }

    @keyframes revA { 0%,3%{opacity:0;transform:scale(.55)} 9%{opacity:1;transform:scale(1)} 91%{opacity:1;transform:scale(1)} 97%,100%{opacity:0;transform:scale(1)} }
    @keyframes revB { 0%,20%{opacity:0;transform:scale(.55)} 27%{opacity:1;transform:scale(1)} 91%{opacity:1;transform:scale(1)} 97%,100%{opacity:0;transform:scale(1)} }
    @keyframes revC { 0%,38%{opacity:0;transform:scale(.55)} 46%{opacity:1;transform:scale(1)} 91%{opacity:1;transform:scale(1)} 97%,100%{opacity:0;transform:scale(1)} }
    @keyframes drawB { 0%,22%{opacity:0;stroke-dashoffset:1} 25%{opacity:1} 33%{stroke-dashoffset:0;opacity:1} 91%{stroke-dashoffset:0;opacity:1} 97%,100%{opacity:0} }
    @keyframes drawC { 0%,40%{opacity:0;stroke-dashoffset:1} 43%{opacity:1} 51%{stroke-dashoffset:0;opacity:1} 91%{stroke-dashoffset:0;opacity:1} 97%,100%{opacity:0} }

    @media (prefers-reduced-motion: reduce) {
      .node, .link { animation: none; opacity: 1; transform: none; stroke-dashoffset: 0; }
    }
  </style>

  <defs>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.1" fill="${T.surfaceBorder}" opacity="0.55"/>
    </pattern>
  </defs>

  <!-- canvas -->
  <rect x="0" y="106" width="760" height="454" fill="url(#dots)"/>

  <!-- header chrome -->
  <text class="wordmark" x="26" y="34"><tspan fill="${T.inkHeading}">Problem-Based </tspan><tspan class="accent">SRS</tspan></text>

  <!-- Graph / Hierarchy toggle -->
  <rect x="300" y="12" width="172" height="32" rx="9" fill="${T.surface}" stroke="${T.surfaceBorder}"/>
  <rect x="304" y="16" width="82" height="24" rx="6" fill="${T.primary}"/>
  <text class="toggle-txt" x="345" y="29" fill="#fff">Graph</text>
  <text class="toggle-txt" x="429" y="29" fill="${T.muted}">Hierarchy</text>

  <!-- github mark -->
  <g transform="translate(712 16) scale(0.83)" fill="${T.muted}"><path d="${GITHUB}"/></g>

  <line x1="20" y1="58" x2="740" y2="58" stroke="${T.surfaceBorder}"/>

  <!-- file chip -->
  <rect x="26" y="72" width="150" height="28" rx="8" fill="${T.surface}" stroke="${T.surfaceBorder}"/>
  <text class="chip-txt" x="42" y="87">CRM System</text>
  <rect x="126" y="79" width="42" height="15" rx="7.5" fill="oklch(0.61 0.18 48 / 0.16)"/>
  <text class="badge-txt" x="147" y="87.5" fill="oklch(0.48 0.16 48)">DEMO</text>

  <!-- legend -->
  ${legendItem(470, COLORS.problem.fill, 'Problem')}
  ${legendItem(560, COLORS.need.fill, 'Need')}
  ${legendItem(632, COLORS.fr.fill, 'FR')}
  ${legendItem(686, COLORS.nfr.fill, 'NFR')}

  <line x1="0" y1="106" x2="760" y2="106" stroke="${T.surfaceBorder}"/>

  <!-- zoom controls -->
  <g>
    <rect x="26" y="300" width="30" height="90" rx="9" fill="${T.bg}" stroke="${T.surfaceBorder}"/>
    <line x1="30" y1="330" x2="52" y2="330" stroke="${T.surfaceBorder}"/>
    <line x1="30" y1="360" x2="52" y2="360" stroke="${T.surfaceBorder}"/>
    <text class="zoom-glyph" x="41" y="316">+</text>
    <text class="zoom-glyph" x="41" y="346">&#8722;</text>
    <text class="zoom-glyph" x="41" y="376">&#8635;</text>
  </g>

  <!-- links (drawn behind nodes) -->
  <g>
    ${links.map((l) => `<path class="link l${l.tier}" pathLength="1" d="${linkPath(l)}"/>`).join('\n    ')}
  </g>

  <!-- nodes -->
  ${nodes.map(nodeGroup).join('\n  ')}
</svg>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg, 'utf8');
console.log(`[chain] wrote ${outPath} (${svg.length} bytes, ${nodes.length} nodes, ${links.length} links)`);
