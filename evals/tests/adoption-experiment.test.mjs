import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateContract } from "../tools/adoption-experiment.mjs";

const complete = {
  targetChannel: "named-channel",
  intendedAudience: "external requirements engineers",
  publicPostUrl: "https://example.test/post",
  beforeState: "CRM specification",
  afterState: "same specification rendered by /live",
  releasedEvidence: "sha256:abc",
  observationStart: "2026-08-05T00:00:00Z",
  observationEnd: "2026-08-12T00:00:00Z",
  signal: "external opt-in confirmation with redacted transcript",
  measurementSource: "https://example.test/replies",
  positiveThreshold: 1,
  exclusions: ["maintainer", "bot"],
  readingAtStart: 0,
  readingAtEnd: 0,
};

describe("external adoption experiment contract", () => {
  it("accepts a complete pre-publication contract without claiming an outcome", () => {
    const result = validateContract(complete);
    assert.equal(result.ok, true);
    assert.equal(result.status, "ready_for_publication");
    assert.equal(result.externalResult, "not_recorded");
  });

  it("rejects incomplete or reversed windows", () => {
    const result = validateContract({
      ...complete,
      targetChannel: "",
      observationEnd: complete.observationStart,
      readingAtEnd: undefined,
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /targetChannel/);
    assert.match(result.errors.join("\n"), /observationEnd/);
    assert.match(result.errors.join("\n"), /readingAtStart and readingAtEnd/);
  });

  it("accepts zero as a measured result", () => {
    assert.equal(validateContract({ ...complete, result: "zero" }).externalResult, "zero");
  });
});
