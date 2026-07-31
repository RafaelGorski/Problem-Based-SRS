#!/usr/bin/env node
// Serve the SRS Navigator canvas for end-to-end tests and local preview.
//
// The Playwright visual suite used to point at a hardcoded http://127.0.0.1:56107
// that nothing started, so `npm run test:e2e` only worked if someone had already
// launched the extension by hand — which meant the suite effectively never ran.
// This renders the bundled demo spec through the same pipeline the extension uses
// (validate -> convert -> graph -> HTML) and serves it, so the e2e suite is
// self-contained.
//
// Usage:
//   node scripts/serve-canvas.mjs              # serve on 127.0.0.1:56107
//   node scripts/serve-canvas.mjs --port 8080
//   node scripts/serve-canvas.mjs --spec ../../../.spec/crm-system.json

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGraphData, convertJSONToSpecificationData } from "../lib/parser.mjs";
import { validateSpecificationJSON } from "../lib/validation.mjs";
import { renderGraphHtml } from "../lib/renderer.mjs";
import { DEMO_SPEC } from "../lib/demo-spec.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_PORT = 56107;
export const DEFAULT_HOST = "127.0.0.1";

function parseArgs(argv) {
  const opts = { port: Number(process.env.CANVAS_PORT) || DEFAULT_PORT, host: DEFAULT_HOST, spec: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") opts.port = Number(argv[++i]);
    else if (argv[i] === "--host") opts.host = argv[++i];
    else if (argv[i] === "--spec") opts.spec = argv[++i];
  }
  return opts;
}

/** Render a specification object to the canvas HTML the extension would show. */
export function renderSpecHtml(spec) {
  const validation = validateSpecificationJSON(spec);
  if (!validation.success) {
    throw new Error(`Specification is invalid:\n  - ${validation.errors.join("\n  - ")}`);
  }
  const graphData = buildGraphData(convertJSONToSpecificationData(validation.data));
  return renderGraphHtml(graphData, { title: spec.name || "SRS Navigator" });
}

async function loadSpec(specPath) {
  if (!specPath) return DEMO_SPEC;
  const resolved = path.isAbsolute(specPath) ? specPath : path.resolve(HERE, specPath);
  return JSON.parse(await readFile(resolved, "utf8"));
}

/**
 * Start the canvas server. Returns { server, url, close } so tests and scripts
 * can await a listening server rather than racing a fixed sleep.
 */
export async function startCanvasServer({ port = DEFAULT_PORT, host = DEFAULT_HOST, spec = DEMO_SPEC } = {}) {
  const html = renderSpecHtml(spec);
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const actual = server.address().port;
  return {
    server,
    url: `http://${host}:${actual}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  const spec = await loadSpec(opts.spec);
  const { url } = await startCanvasServer({ port: opts.port, host: opts.host, spec });
  console.log(`SRS Navigator canvas serving ${spec.name} at ${url}`);
}
