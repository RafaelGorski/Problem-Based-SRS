import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessClaims, parseClaim, parseArgs, readFixture } from "../tools/closure-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = readFixture(path.join(root, "evals/fixtures/closure-2026-08-04.json"));

describe("release claim markers", () => {
  it("normalizes plugin tags but preserves canvas patch tags", () => {
    assert.deepEqual(parseClaim("<!-- release-claim train=plugin version=v2.6.0 -->"), {
      ok: true, train: "plugin", version: "v2.6.0", tag: "v2.6",
    });
    assert.equal(parseClaim("<!-- release-claim train=canvas version=v1.1.1 -->").tag, "v1.1.1");
  });
  it("rejects missing, duplicate, malformed, and ambiguous markers", () => {
    for (const body of [
      "", "<!-- release-claim train=plugin version=v2.6 --> <!-- release-claim train=canvas version=v1.1.1 -->",
      "<!-- release-claim train=other version=v2.6 -->", "<!-- release-claim train=canvas version=v1.1 -->",
    ]) assert.equal(parseClaim(body).ok, false);
  });
});

describe("closure evidence is report-only and deterministic", () => {
  it("replays the four closed-but-unpublished claims from the recorded fixture", () => {
    const result = assessClaims(fixture);
    assert.equal(result.ok, false);
    assert.deepEqual(result.findings.map((f) => f.issue), [89, 90, 129, 130]);
  });
  it("evaluates open issues in prospective mode", () => {
    const result = assessClaims({
      issues: fixture.issues,
      releases: fixture.releases,
      prospective: [137, 138],
    });
    assert.deepEqual(result.findings.map((f) => f.issue), [137, 138]);
    const released = assessClaims({
      issues: fixture.issues,
      releases: [
        ...fixture.releases,
        { tagName: "v2.6", name: "Version 2.6", isDraft: false, isPrerelease: false },
        { tagName: "v1.1.1", name: "srs-navigator 1.1.1", isDraft: false, isPrerelease: false },
      ],
      prospective: [137, 138],
    });
    assert.equal(released.ok, true);
  });
  it("fails when a published release is removed, then passes after restoration", () => {
    const passing = {
      issues: [
        { number: 137, state: "open", body: "<!-- release-claim train=plugin version=v2.6 -->" },
        { number: 138, state: "open", body: "<!-- release-claim train=canvas version=v1.1.1 -->" },
      ],
      releases: [
        { tagName: "v2.6", name: "Version 2.6", isDraft: false, isPrerelease: false },
        { tagName: "v1.1.1", name: "srs-navigator 1.1.1", isDraft: false, isPrerelease: false },
      ],
      prospective: [137, 138],
    };
    const removed = { ...passing, releases: passing.releases.slice(0, 1) };
    const failed = assessClaims(removed);
    assert.equal(failed.ok, false);
    assert.deepEqual(failed.findings.map((f) => f.issue), [138]);
    const restored = assessClaims(passing);
    assert.equal(restored.ok, true);
  });
  it("parses prospective issue numbers without allowing an implicit repository-wide scan", () => {
    assert.deepEqual(parseArgs(["--prospective", "137", "138"]), {
      json: false, fixture: null, prospective: [137, 138], issueNumbers: [],
    });
  });
  it("requires the declared train and ignores draft or prerelease releases", () => {
    const issue = { number: 1, state: "closed", body: "<!-- release-claim train=plugin version=v2.6 -->" };
    assert.equal(assessClaims({ issues: [issue], releases: [{ tagName: "v2.6", name: "srs-navigator 2.6", isDraft: false, isPrerelease: false }] }).ok, false);
    assert.equal(assessClaims({ issues: [issue], releases: [{ tagName: "v2.6", name: "Version 2.6", isDraft: true, isPrerelease: false }] }).ok, false);
  });
});
