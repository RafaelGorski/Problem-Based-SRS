// Generates docs/assets/srs-problems.svg — a self-contained ANIMATED IMAGE (SVG with
// CSS keyframes) for the "Most requirements start in the wrong place" section.
//
// It mirrors the real SRS Navigator rendering the VagrantChefHubot example: the full
// spec appears, then every support node (Needs, FRs, NFRs) dims and the 5 Customer
// Problems light up — the visual argument that requirements should start at the problem.
//
// Node colors + Phosphor icons are sampled verbatim from
// .github/extensions/srs-navigator/lib/renderer.mjs; the chrome mirrors the app on the
// VagrantChefHubot spec. The canvas extension itself is not touched.
//
// Run: node scripts/build-problem-highlight.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'docs', 'assets', 'srs-problems.svg');

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
  surface: 'oklch(0.965 0.004 240)',
  surfaceBorder: 'oklch(0.900 0.006 240)',
  primary: 'oklch(0.45 0.16 266)',
  bg: 'oklch(1 0 0)',
  link: 'oklch(0.74 0.02 262)',
  cpAccent: 'oklch(0.55 0.17 50)',
};

const R = 24;                 // node radius
const ICON_S = 28 / 256;      // icon scale into the node

// VagrantChefHubot slice — the 5 Customer Problems (highlighted) plus a scatter of the
// Needs / FRs / NFRs they trace to. IDs + the three visible CP titles are read from the
// app screenshot; CP-4 / CP-5 (below the fold in that view) use the spec's own domain.
const nodes = [
  // Customer Problems (highlighted)
  { id: 'CP-1', type: 'problem', cp: true, x: 168, y: 214, name: ['Slow, error-prone', 'Hubot + Skype setup'] },
  { id: 'CP-2', type: 'problem', cp: true, x: 132, y: 452, name: ['Environments drift', 'between machines'] },
  { id: 'CP-3', type: 'problem', cp: true, x: 470, y: 486, name: ['New devs can not ship', 'bot commands fast'] },
  { id: 'CP-4', type: 'problem', cp: true, x: 566, y: 196, name: ['Rebuilding a broken', 'box costs a day'] },
  { id: 'CP-5', type: 'problem', cp: true, x: 322, y: 320, name: ['Setup needs undocumented', 'prerequisites'] },
  // Customer Needs (support)
  { id: 'CN-3', type: 'need', x: 300, y: 150, name: ['All OS deps installed'] },
  { id: 'CN-1', type: 'need', x: 452, y: 262, name: ['Automated provisioning'] },
  { id: 'CN-2', type: 'need', x: 470, y: 388, name: ['Ready-to-run Hubot'] },
  { id: 'CN-6', type: 'need', x: 208, y: 340, name: ['Documented lifecycle'] },
  // Functional Requirements (support)
  { id: 'FR-2', type: 'fr', x: 258, y: 230, name: ['Chef Solo core stack'] },
  { id: 'FR-9', type: 'fr', x: 612, y: 314, name: ['Lifecycle scripts'] },
  { id: 'FR-1', type: 'fr', x: 610, y: 452, name: ['Vagrant VM'] },
  { id: 'FR-4', type: 'fr', x: 168, y: 560, name: ['Hubot via npm'] },
  // Non-Functional Requirements (support)
  { id: 'NFR-3', type: 'nfr', x: 430, y: 150, name: ['CLI over SSH'] },
  { id: 'NFR-5', type: 'nfr', x: 74, y: 318, name: ['Pinned versions'] },
  { id: 'NFR-1', type: 'nfr', x: 590, y: 556, name: ['Cross-platform'] },
];

// Faint traceability links (background). Plausible CP -> CN -> FR/NFR wiring.
const links = [
  { s: 'CP-1', t: 'CN-3' }, { s: 'CP-1', t: 'CN-1' },
  { s: 'CP-5', t: 'CN-1' }, { s: 'CP-2', t: 'CN-6' },
  { s: 'CP-3', t: 'CN-2' }, { s: 'CP-4', t: 'CN-1' },
  { s: 'CN-1', t: 'FR-2' }, { s: 'CN-1', t: 'NFR-3' },
  { s: 'CN-2', t: 'FR-1' }, { s: 'CN-6', t: 'FR-9' },
  { s: 'CN-3', t: 'NFR-5' }, { s: 'CN-2', t: 'FR-9' },
];
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function linkPath(l) {
  const s = byId[l.s], t = byId[l.t];
  const dx = t.x - s.x, dy = t.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const sx = s.x + ux * R, sy = s.y + uy * R;
  const tx = t.x - ux * R, ty = t.y - uy * R;
  const mx = (sx + tx) / 2 - uy * len * 0.10;
  const my = (sy + ty) / 2 + ux * len * 0.10;
  return `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
}

function nodeGroup(n, i) {
  const c = COLORS[n.type];
  const idY = R + 18;
  const nameStart = R + 32;
  const nameTspans = n.name
    .map((line, k) => `<tspan x="0" y="${nameStart + k * 12}">${esc(line)}</tspan>`)
    .join('');
  const cls = n.cp ? 'node cp' : 'node support';
  const glow = n.cp
    ? `<circle class="glow" r="${R}" fill="none" stroke="${c.fill}" stroke-width="3" style="--i:${i}"/>`
    : '';
  return `
  <g transform="translate(${n.x} ${n.y})">
    <g class="${cls}" style="--i:${i}">
      ${glow}
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

const W = 720, H = 640;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d" preserveAspectRatio="xMidYMid meet">
  <title id="t">The SRS Navigator highlighting five Customer Problems</title>
  <desc id="d">The VagrantChefHubot specification appears in full, then the Needs, Functional and Non-Functional Requirements dim and the five Customer Problems light up, showing that every requirement traces back to a problem.</desc>
  <style>
    :root { color-scheme: light; }
    svg { background: ${T.bg}; }
    text { font-family: 'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
    .wordmark { font-weight: 800; font-size: 16px; letter-spacing: -0.01em; }
    .wordmark .accent { fill: ${T.primary}; }
    .toggle-txt { font-size: 12px; font-weight: 650; text-anchor: middle; dominant-baseline: middle; }
    .chip-txt { font-size: 11.5px; font-weight: 600; fill: ${T.ink}; dominant-baseline: middle; }
    .badge-txt { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 8px; font-weight: 700; letter-spacing: 0.04em; text-anchor: middle; dominant-baseline: middle; }
    .stat { font-size: 11px; fill: ${T.muted}; dominant-baseline: middle; }
    .stat b { font-weight: 700; fill: ${T.cpAccent}; }
    .legend { font-size: 11px; fill: ${T.muted}; dominant-baseline: middle; }
    .zoom-glyph { font-size: 14px; fill: ${T.muted}; text-anchor: middle; dominant-baseline: central; }
    .nid { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11.5px; font-weight: 700; fill: ${T.inkHeading}; text-anchor: middle; }
    .nname { font-size: 9.5px; fill: ${T.muted}; text-anchor: middle; }

    /* Two-phase loop: (1) whole spec present, (2) support dims + CPs pulse. */
    .node { transform-box: fill-box; transform-origin: center; }
    .support { animation: dimCycle 9s ${'cubic-bezier(0.25,1,0.5,1)'} infinite both; }
    .link { animation: linkCycle 9s ${'cubic-bezier(0.25,1,0.5,1)'} infinite both; }
    .cp { animation: cpCycle 9s ${'cubic-bezier(0.25,1,0.5,1)'} infinite both; animation-delay: calc(var(--i) * 0.12s); }
    .glow { opacity: 0; transform-box: fill-box; transform-origin: center;
            animation: glowPulse 9s ease-out infinite both; animation-delay: calc(var(--i) * 0.12s); }

    @keyframes dimCycle { 0%,32%{opacity:1} 46%,88%{opacity:0.28} 100%{opacity:1} }
    @keyframes linkCycle { 0%{opacity:0} 10%,32%{opacity:0.8} 46%,88%{opacity:0.2} 100%{opacity:0} }
    @keyframes cpCycle {
      0%{opacity:0;transform:scale(0.6)} 9%{opacity:1;transform:scale(1)}
      44%{transform:scale(1)} 52%{transform:scale(1.07)} 60%,88%{transform:scale(1)}
      96%,100%{opacity:0;transform:scale(1)}
    }
    @keyframes glowPulse {
      0%,42%{opacity:0;transform:scale(1)}
      54%{opacity:0.55;transform:scale(1)}
      72%{opacity:0;transform:scale(1.55)}
      88%,100%{opacity:0;transform:scale(1.55)}
    }

    @media (prefers-reduced-motion: reduce) {
      .support { animation: none; opacity: 0.32; }
      .link { animation: none; opacity: 0.2; }
      .cp { animation: none; opacity: 1; transform: none; }
      .glow { animation: none; opacity: 0.5; transform: none; }
    }
  </style>

  <defs>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.1" fill="${T.surfaceBorder}" opacity="0.55"/>
    </pattern>
  </defs>

  <!-- canvas -->
  <rect x="0" y="106" width="${W}" height="${H - 106}" fill="url(#dots)"/>

  <!-- header chrome -->
  <text class="wordmark" x="24" y="33"><tspan fill="${T.inkHeading}">Problem-Based </tspan><tspan class="accent">SRS</tspan></text>
  <rect x="196" y="18" width="150" height="22" rx="11" fill="oklch(0.61 0.18 48 / 0.14)"/>
  <text x="271" y="30" class="badge-txt" fill="${T.cpAccent}" style="font-size:9.5px; letter-spacing:0.02em;">5 Customer Problems</text>

  <!-- Graph / Hierarchy toggle -->
  <rect x="470" y="14" width="152" height="30" rx="9" fill="${T.surface}" stroke="${T.surfaceBorder}"/>
  <rect x="474" y="18" width="74" height="22" rx="6" fill="${T.primary}"/>
  <text class="toggle-txt" x="511" y="30" fill="#fff">Graph</text>
  <text class="toggle-txt" x="588" y="30" fill="${T.muted}">Hierarchy</text>

  <!-- github mark -->
  <g transform="translate(666 18) scale(0.83)" fill="${T.muted}"><path d="${GITHUB}"/></g>

  <!-- file chip -->
  <rect x="24" y="58" width="164" height="26" rx="8" fill="${T.surface}" stroke="${T.surfaceBorder}"/>
  <text class="chip-txt" x="40" y="72">VagrantChefHubot</text>

  <!-- legend -->
  ${legendItem(300, COLORS.problem.fill, 'Problem')}
  ${legendItem(392, COLORS.need.fill, 'Need')}
  ${legendItem(462, COLORS.fr.fill, 'FR')}
  ${legendItem(514, COLORS.nfr.fill, 'NFR')}

  <line x1="0" y1="94" x2="${W}" y2="94" stroke="${T.surfaceBorder}"/>
  <!-- stats bar -->
  <text class="stat" x="24" y="101">28 nodes</text>
  <text class="stat" x="120" y="101">5 need clusters</text>
  <text class="stat" x="232" y="101"><tspan>100% traceability</tspan></text>
  <line x1="0" y1="106" x2="${W}" y2="106" stroke="${T.surfaceBorder}"/>

  <!-- zoom controls -->
  <g>
    <rect x="24" y="132" width="28" height="86" rx="9" fill="${T.bg}" stroke="${T.surfaceBorder}"/>
    <line x1="28" y1="161" x2="48" y2="161" stroke="${T.surfaceBorder}"/>
    <line x1="28" y1="189" x2="48" y2="189" stroke="${T.surfaceBorder}"/>
    <text class="zoom-glyph" x="38" y="147">+</text>
    <text class="zoom-glyph" x="38" y="175">&#8722;</text>
    <text class="zoom-glyph" x="38" y="204">&#8635;</text>
  </g>

  <!-- links (drawn behind nodes) -->
  <g fill="none" stroke="${T.link}" stroke-width="1.6" stroke-dasharray="4 5" stroke-linecap="round">
    ${links.map((l) => `<path class="link" d="${linkPath(l)}"/>`).join('\n    ')}
  </g>

  <!-- nodes -->
  ${nodes.map((n, i) => nodeGroup(n, i)).join('\n  ')}
</svg>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg, 'utf8');
console.log(`[problems] wrote ${outPath} (${svg.length} bytes, ${nodes.length} nodes, ${links.length} links)`);
