#!/usr/bin/env node
// Serve the published project webpage (`docs/`) for end-to-end tests and preview.
//
// The canvas half of the screenshot harness already existed (serve-canvas.mjs +
// the Playwright webServer block). The *site* half did not, so every claim about
// the landing page — "the health dashboard is reachable in one click", "the
// version badge matches the release" — could only be checked by hand.
//
// This is a deliberately small static file server: it never executes anything, it
// refuses to escape the docs/ root, and it exposes the same /health probe shape as
// serve-canvas.mjs so Playwright can wait on it.
//
// Usage:
//   node scripts/serve-site.mjs              # serve docs/ on 127.0.0.1:56108
//   node scripts/serve-site.mjs --port 8080
//   node scripts/serve-site.mjs --root ../../../docs

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_PORT = 56108;
export const DEFAULT_HOST = "127.0.0.1";
/** The repository's published site directory, relative to this extension. */
export const DEFAULT_ROOT = path.resolve(HERE, "..", "..", "..", "..", "docs");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
};

export const contentType = (file) => MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";

function parseArgs(argv) {
  const opts = { port: Number(process.env.SITE_PORT) || DEFAULT_PORT, host: DEFAULT_HOST, root: DEFAULT_ROOT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") opts.port = Number(argv[++i]);
    else if (argv[i] === "--host") opts.host = argv[++i];
    else if (argv[i] === "--root") opts.root = path.resolve(process.cwd(), argv[++i]);
  }
  return opts;
}

/**
 * Map a request URL to a file inside `root`, or null when it escapes the root.
 * Path traversal is the only interesting attack against a static server, so it is
 * rejected explicitly rather than left to the filesystem.
 * @param {string} root absolute directory
 * @param {string} url request URL (may include a query string)
 * @returns {string|null}
 */
export function resolveRequestPath(root, url) {
  const raw = decodeURIComponent(String(url ?? "/").split("?")[0].split("#")[0]);
  const rel = raw.replace(/^\/+/, "") || "index.html";
  const resolved = path.resolve(root, rel);
  const rootWithSep = path.resolve(root) + path.sep;
  if (resolved !== path.resolve(root) && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

/**
 * Start the static site server.
 * @returns {Promise<{server: import("node:http").Server, url: string, close: () => Promise<void>}>}
 */
export async function startSiteServer({ port = DEFAULT_PORT, host = DEFAULT_HOST, root = DEFAULT_ROOT } = {}) {
  const absRoot = path.resolve(root);

  const server = createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, root: absRoot }));
      return;
    }

    const target = resolveRequestPath(absRoot, req.url);
    if (!target) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    try {
      const info = await stat(target);
      const file = info.isDirectory() ? path.join(target, "index.html") : target;
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
    }
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
  const { url } = await startSiteServer(opts);
  console.log(`Project webpage serving ${opts.root} at ${url}`);
}
