// Generate a static, self-contained SRS Navigator page for embedding on the
// project webpage (docs/). It renders the REAL navigator from the extension's
// own renderer + demo spec, so the landing-page hero shows the genuine app
// (real force-directed graph, real node icons, real chain-building intro
// animation) rather than a hand-built mock.
//
// Run: node scripts/build-navigator-embed.mjs
// Output: docs/navigator-embed.html
//
// Keep in sync with the canvas app: re-run whenever the renderer or demo spec
// changes. This script does NOT modify the extension.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

import { convertJSONToSpecificationData, buildGraphData } from '../.github/extensions/srs-navigator/lib/parser.mjs';
import { renderGraphHtml } from '../.github/extensions/srs-navigator/lib/renderer.mjs';
import { DEMO_SPEC } from '../.github/extensions/srs-navigator/lib/demo-spec.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const specData = convertJSONToSpecificationData(DEMO_SPEC);
const graphData = buildGraphData(specData);

// isDemo:true keeps the page fully standalone (no auto-refresh polling) and
// tags it with a "Demo" badge; the built-in intro plays the CP -> CN -> FR
// chain-building animation on load.
const html = renderGraphHtml(graphData, { title: DEMO_SPEC.name, isDemo: true });

const outPath = resolve(root, 'docs', 'navigator-embed.html');
writeFileSync(outPath, html, 'utf8');
console.log('Wrote ' + outPath + ' (' + html.length + ' bytes, ' + graphData.nodes.length + ' nodes)');
