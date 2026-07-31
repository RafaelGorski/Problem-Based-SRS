// Guards the e2e site server.
//
// The screenshot harness had a canvas half (serve-canvas.mjs) and no site half, so
// every claim about the published webpage — "the health dashboard is one click
// away", "the version badge matches the release" — was only ever checked by reading
// the HTML. scripts/serve-site.mjs backs the `site` Playwright project; these
// offline checks (no browser, no Playwright) keep it honest.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  startSiteServer,
  resolveRequestPath,
  contentType,
  DEFAULT_PORT,
  DEFAULT_ROOT,
} from "../scripts/serve-site.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, "..");

describe("e2e site server", () => {
  it("points at the repository's published docs/ directory", () => {
    assert.ok(fs.existsSync(DEFAULT_ROOT), `DEFAULT_ROOT does not exist: ${DEFAULT_ROOT}`);
    assert.ok(
      fs.existsSync(path.join(DEFAULT_ROOT, "index.html")),
      "the default root must be the directory GitHub Pages publishes, not an empty folder",
    );
    assert.equal(path.basename(DEFAULT_ROOT), "docs");
  });

  it("serves the landing page", async () => {
    const s = await startSiteServer({ port: 0 });
    try {
      const res = await fetch(s.url);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") || "", /text\/html/);
      const html = await res.text();
      assert.match(html, /Problem-Based SRS/, "served page is not the landing page");
    } finally {
      await s.close();
    }
  });

  it("serves the health dashboard the landing page links to", async () => {
    const s = await startSiteServer({ port: 0 });
    try {
      const res = await fetch(new URL("/skills-health.html", s.url));
      assert.equal(
        res.status,
        200,
        "the dashboard must resolve: a nav link to a 404 is worse than no link",
      );
      assert.match(await res.text(), /Skills Health/);
    } finally {
      await s.close();
    }
  });

  it("exposes a /health endpoint for the webServer readiness probe", async () => {
    const s = await startSiteServer({ port: 0 });
    try {
      const res = await fetch(new URL("/health", s.url));
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
    } finally {
      await s.close();
    }
  });

  it("returns 404 rather than crashing on a missing file", async () => {
    const s = await startSiteServer({ port: 0 });
    try {
      const res = await fetch(new URL("/no-such-page.html", s.url));
      assert.equal(res.status, 404);
    } finally {
      await s.close();
    }
  });

  it("refuses to serve files outside the site root", async () => {
    const s = await startSiteServer({ port: 0 });
    try {
      const res = await fetch(new URL("/../../../package.json", s.url));
      assert.ok(
        res.status === 403 || res.status === 404,
        `traversal must not succeed; got ${res.status}`,
      );
    } finally {
      await s.close();
    }
  });

  it("rejects traversal before touching the filesystem", () => {
    const root = path.resolve("/site");
    assert.equal(resolveRequestPath(root, "/../secrets.env"), null);
    assert.equal(resolveRequestPath(root, "/%2e%2e/secrets.env"), null);
    assert.equal(resolveRequestPath(root, "/a/../../secrets.env"), null);
    assert.equal(resolveRequestPath(root, "/index.html"), path.join(root, "index.html"));
    assert.equal(
      resolveRequestPath(root, "/"),
      path.join(root, "index.html"),
      "a bare / must map to index.html",
    );
    assert.equal(
      resolveRequestPath(root, "/index.html?v=2#top"),
      path.join(root, "index.html"),
      "query and fragment are not part of the path",
    );
  });

  it("labels the asset types the landing page actually loads", () => {
    assert.match(contentType("a.html"), /text\/html/);
    assert.match(contentType("a.css"), /text\/css/);
    assert.match(contentType("a.json"), /application\/json/);
    assert.equal(contentType("a.svg"), "image/svg+xml");
    assert.equal(contentType("a.png"), "image/png");
    assert.equal(contentType("a.woff2"), "font/woff2");
    assert.equal(
      contentType("a.unknown"),
      "application/octet-stream",
      "unknown types must not be guessed as HTML",
    );
  });

  it("playwright config starts the site server and probes the same port", async () => {
    const config = await readFile(path.join(EXT_ROOT, "playwright.config.mjs"), "utf8");
    assert.match(config, /scripts\/serve-site\.mjs/, "no webServer launches serve-site.mjs");
    assert.ok(
      config.includes(String(DEFAULT_PORT)) || /SITE_PORT/.test(config),
      "playwright config and serve-site.mjs disagree about the port",
    );
    assert.match(
      config,
      /name:\s*["']site["']/,
      "the site specs need their own project so they get the site baseURL",
    );
    assert.match(
      config,
      /name:\s*["']canvas["']/,
      "the canvas project must survive alongside it",
    );
  });

  it("keeps screenshot output out of the repository", async () => {
    const config = await readFile(path.join(EXT_ROOT, "playwright.config.mjs"), "utf8");
    assert.match(config, /outputDir/, "captured evidence needs an explicit output directory");
    const ignore = await readFile(path.join(EXT_ROOT, ".gitignore"), "utf8");
    assert.match(ignore, /test-results/, "screenshots must not be committed");
  });
});
