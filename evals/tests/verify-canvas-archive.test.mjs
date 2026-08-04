import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { verifyCanvasArchive } from "../tools/verify-canvas-archive.mjs";

let tmp;
before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-canvas-reader-")); });
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function archive(name, extra = {}) {
  const root = path.join(tmp, name);
  const tree = path.join(root, "srs-navigator");
  fs.mkdirSync(tree, { recursive: true });
  fs.writeFileSync(path.join(tree, "extension.mjs"), [
    'import { joinSession } from "@github/copilot-sdk/extension";',
    'export const ACTIONS=[{action:"full",file:"problem-based-srs.md"}];',
    'await joinSession({canvases:[{id:"srs-navigator"}]});',
  ].join("\n"));
  fs.writeFileSync(path.join(tree, "package.json"), JSON.stringify({ name: "srs-navigator", version: "1.0.0" }));
  for (const [rel, body] of Object.entries(extra)) {
    const file = path.join(tree, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  const file = path.join(tmp, `${name}.tar.gz`);
  execFileSync("tar", ["-czf", file, "-C", root, "srs-navigator"]);
  return file;
}

describe("verify-canvas-archive", () => {
  it("records archive and extension hashes and accepts a clean archive", async () => {
    const record = await verifyCanvasArchive(archive("healthy", {
      "skills/problem-based-srs.md": "# skill\n",
    }));
    assert.equal(record.ok, true);
    assert.match(record.archive.sha256, /^[0-9a-f]{64}$/);
    assert.match(record.extensionSha256, /^[0-9a-f]{64}$/);
    assert.ok(record.observed.entries > 0);
  });

  it("rejects the known bad published shape", async () => {
    const record = await verifyCanvasArchive(archive("bad", {
      "node_modules/playwright/index.js": "bad",
      "scripts/build.mjs": "bad",
      "tests/e2e.test.mjs": "bad",
      "package-lock.json": "{}",
    }));
    assert.equal(record.ok, false);
    assert.match(record.checks.find((c) => c.id === "carries-no-development-artifacts").detail, /node_modules/);
  });

  it("rejects an escaping or missing flat-bundle link", async () => {
    const record = await verifyCanvasArchive(archive("links", {
      "skills/problem-based-srs.md": "[missing](missing.md)\n",
    }));
    assert.equal(record.ok, false);
    assert.equal(record.checks.find((c) => c.id === "relative-links-resolve").ok, false);
  });
});
