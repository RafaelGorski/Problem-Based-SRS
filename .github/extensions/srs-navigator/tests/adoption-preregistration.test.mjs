import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const guide = fs.readFileSync(path.join(repoRoot, "docs/adoption-experiment.md"), "utf8");
const schema = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "docs/adoption-observation.schema.json"), "utf8"),
);

function registrationBlockers(document) {
  const required = [
    "Registration status: blocked, not preregistered",
    "Do not recruit participants or start an observation window yet",
    "exact cohort size and eligibility",
    "fixed UTC bounds",
    "conflicts with #142's requirement",
  ];
  const normalized = document.replace(/\s+/g, " ");
  return required.filter((phrase) => !normalized.includes(phrase));
}

describe("adoption experiment preregistration guard", () => {
  it("does not present incomplete #185 metadata as a frozen contract", () => {
    assert.deepEqual(registrationBlockers(guide), []);
  });

  it("negative control: removing the registration blocker is detected", () => {
    const weakened = guide.replace("Registration status: blocked, not preregistered", "Registration status: ready");
    assert.notEqual(weakened, guide);
    assert.ok(registrationBlockers(weakened).includes("Registration status: blocked, not preregistered"));
  });

  it("copies the frozen cohort and contract fields with published plugin/canvas digests", () => {
    assert.ok(schema.required.includes("contractId"));
    assert.ok(schema.required.includes("contractSnapshot"));
    for (const field of [
      "cohortSize",
      "eligibility",
      "signal",
      "threshold",
      "exclusions",
      "observationStart",
      "observationEnd",
      "preregisteredAt",
    ]) {
      assert.ok(schema.properties.contractSnapshot.required.includes(field));
    }
    assert.equal(schema.properties.contractSnapshot.properties.threshold.const, 1);
    assert.ok(schema.required.includes("publishedAssets"));
    assert.ok(schema.properties.publishedAssets.items.required.includes("tag"));
    assert.ok(schema.properties.publishedAssets.items.required.includes("sha256"));
    assert.match(guide, /`preregisteredAt` UTC timestamp must be\s+earlier than `observationStart`/);
  });

  it("records UTC observations without admitting direct participant identifiers", () => {
    const observation = schema.properties.observations.items;
    assert.equal(observation.additionalProperties, false);
    assert.ok(observation.required.includes("participantId"));
    for (const field of [
      "observedAt",
      "startedAt",
      "finishedAt",
      "firstTraceAt",
      "liveOpenedAt",
      "installDurationSeconds",
      "firstTraceDurationSeconds",
      "liveOpened",
      "abandonmentReason",
    ]) {
      assert.ok(observation.required.includes(field));
    }
    assert.equal(observation.properties.observedAt.pattern, "Z$");
    assert.match(observation.properties.participantId.description, /never a name, username, email, or account ID/);
    for (const forbidden of ["name", "username", "email", "accountId", "ipAddress"]) {
      assert.equal(forbidden in observation.properties, false);
    }
  });

  it("defines positive, zero, inconclusive, and blocked fixed-window outcomes", () => {
    assert.match(guide, /`positive` when at least one qualifying signal is recorded/);
    assert.match(guide, /`zero` when the full window closed with no qualifying signal/);
    assert.match(guide, /`inconclusive` when the window closed/);
    assert.match(guide, /`blocked` when the contract is not frozen or the observation window is not complete/);
    assert.match(guide, /Do not extend the window/);
    assert.ok(schema.properties.outcome.properties.classification.enum.includes("inconclusive"));
    assert.match(guide, /evals\/tools\/score-adoption-observations\.mjs adoption-observations\.json/);
    assert.match(guide, /complete `zero` result exits zero/);
  });
});
