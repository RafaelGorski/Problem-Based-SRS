import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("plugin release procedure follows the dispatch-only workflow", () => {
  it("derives the normal publication path from create-release.yml", () => {
    const workflow = read(".github/workflows/create-release.yml");
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /gh release create/);
    assert.doesNotMatch(workflow, /on:\s*\r?\n\s+push:/);

    for (const file of [
      "docs/release-verification.md",
      "docs/docs.html",
      "evals/tools/release-preflight.mjs",
    ]) {
      const source = read(file);
      assert.doesNotMatch(source, /git tag v(?:X\.Y|2\.6)(?:\s|&amp;|`)/, file);
      assert.doesNotMatch(source, /git push origin v(?:X\.Y|2\.6)/, file);
      assert.doesNotMatch(source, /--event push/, file);
    }
  });
});
