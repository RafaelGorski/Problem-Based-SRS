import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const workflow = read(".github/workflows/create-release.yml");

const step = (name, nextName) => {
  const start = workflow.indexOf(`      - name: ${name}`);
  const end = workflow.indexOf(`      - name: ${nextName}`, start);
  assert.notEqual(start, -1, `${name} step must exist`);
  return workflow.slice(start, end === -1 ? undefined : end);
};

describe("create-release.yml dispatch input hardening", () => {
  it("passes the version through the environment and validates its format", () => {
    const source = step("Resolve raw version", "Build, validate & package");
    const run = source.slice(source.indexOf("        run:"));
    assert.match(source, /VERSION_INPUT:\s+\$\{\{\s*inputs\.version\s*\}\}/);
    assert.match(run, /VERSION="\$VERSION_INPUT"/);
    assert.doesNotMatch(run, /\$\{\{\s*inputs\.version\s*\}\}/);
    assert.match(run, /\^\[0-9\]\+\(\\\.\[0-9\]\+\)\{1,2\}\$/);
  });

  it("passes multiline release notes through the environment and a generated delimiter", () => {
    const source = step("Determine release notes", "Create or update GitHub Release");
    const run = source.slice(source.indexOf("        run:"));
    assert.match(source, /RELEASE_BODY:\s+\$\{\{\s*inputs\.release_body\s*\}\}/);
    assert.match(run, /if \[ -n "\$RELEASE_BODY" \]/);
    assert.match(run, /delimiter="EOF_NOTES_\$\(uuidgen\)"/);
    assert.match(run, /while \[\[ "\$RELEASE_BODY" == \*"\$delimiter"\* \]\]/);
    assert.match(run, /printf '%s\\n' "\$RELEASE_BODY"/);
    assert.doesNotMatch(run, /\$\{\{\s*inputs\.release_body\s*\}\}/);
  });
});
