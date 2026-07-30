// Guards the e2e canvas server.
//
// The Playwright visual suite pointed at a hardcoded 127.0.0.1:56107 that nothing
// started, so 18 visual assertions silently never ran. scripts/serve-canvas.mjs
// now backs playwright.config.mjs's webServer block. These offline checks (no
// browser, no Playwright) make sure the server keeps working and that the config
// stays wired to it.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startCanvasServer, renderSpecHtml, DEFAULT_PORT } from "../scripts/serve-canvas.mjs";
import { DEMO_SPEC } from "../lib/demo-spec.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, "..");

describe("e2e canvas server", () => {
  it("serves the rendered demo canvas", async () => {
    const s = await startCanvasServer({ port: 0 });
    try {
      const res = await fetch(s.url);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") || "", /text\/html/);
      const html = await res.text();
      assert.ok(html.length > 1000, "canvas HTML looks empty");
      // The visual suite waits on `.node`; if the markup stops containing nodes
      // every e2e assertion would time out instead of failing usefully.
      assert.match(html, /class="node/, "rendered canvas has no .node elements");
      assert.match(html, /CP\.01/, "rendered canvas does not contain demo IDs");
    } finally {
      await s.close();
    }
  });

  it("exposes a /health endpoint for the webServer readiness probe", async () => {
    const s = await startCanvasServer({ port: 0 });
    try {
      const res = await fetch(new URL("/health", s.url));
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
    } finally {
      await s.close();
    }
  });

  it("refuses to serve an invalid specification", () => {
    const broken = { ...DEMO_SPEC, problems: [{ id: "NOPE", title: "x", description: "y" }] };
    assert.throws(() => renderSpecHtml(broken), /Specification is invalid/);
  });

  it("playwright config starts the server and probes the same port", async () => {
    const config = await readFile(path.join(EXT_ROOT, "playwright.config.mjs"), "utf8");
    assert.match(config, /webServer/, "playwright config has no webServer block");
    assert.match(config, /scripts\/serve-canvas\.mjs/, "webServer does not launch serve-canvas.mjs");
    assert.match(config, /\/health/, "webServer readiness probe should use /health");
    assert.ok(
      config.includes(String(DEFAULT_PORT)) || /CANVAS_PORT/.test(config),
      "playwright config and serve-canvas.mjs disagree about the port",
    );
  });

  it("the visual suite uses the config baseURL rather than a hardcoded host", async () => {
    const visual = await readFile(path.join(EXT_ROOT, "tests", "visual.test.mjs"), "utf8");
    assert.doesNotMatch(
      visual,
      /['"`]http:\/\/127\.0\.0\.1:\d+/,
      "visual.test.mjs hardcodes a host again; use the Playwright baseURL",
    );
  });
});
