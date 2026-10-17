import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { main, scoreObservations } from "../tools/score-adoption-observations.mjs";

const sha = "a".repeat(64);
const now = "2026-10-09T00:00:00Z";
function fixture() {
  return {
    contractId: "crm-2026-01",
    cohortId: "external-brownfield",
    contractSnapshot: {
      cohortSize: 1,
      eligibility: "external brownfield repository maintainer",
      signal: "first CP to CN to FR chain",
      threshold: 1,
      exclusions: ["project maintainers"],
      preregisteredAt: "2026-09-30T09:00:00Z",
      observationStart: "2026-10-01T00:00:00Z",
      observationEnd: "2026-10-08T00:00:00Z",
    },
    publishedAssets: [
      { surface: "plugin", tag: "v2.7", sha256: sha },
      { surface: "canvas", tag: "v1.1.5", sha256: sha },
    ],
    observations: [{
      participantId: "participant-01",
      eligible: true,
      observedAt: "2026-10-02T00:06:00Z",
      startedAt: "2026-10-02T00:00:00Z",
      finishedAt: "2026-10-02T00:06:00Z",
      firstTraceAt: "2026-10-02T00:04:00Z",
      liveOpenedAt: "2026-10-02T00:06:00Z",
      installDurationSeconds: 90,
      firstTraceDurationSeconds: 240,
      liveOpened: true,
      signalObserved: true,
      abandonmentReason: null,
      evidenceSha256: sha,
    }],
  };
}

describe("frozen adoption scoring", () => {
  it("counts one independently evidenced signal and reproduces the stored outcome", () => {
    const record = fixture();
    const first = scoreObservations(record, now);
    assert.deepEqual(first, {
      contractId: record.contractId, classification: "positive",
      qualifyingSignalCount: 1, reasons: [],
    });
    record.outcome = { classification: "positive", qualifyingSignalCount: 1, scoredAt: now };
    assert.deepEqual(scoreObservations(record, now), first);
    record.outcome.classification = "zero";
    assert.throws(() => scoreObservations(record, now), /stored outcome disagrees/);
  });

  it("reports a complete zero result without extending the window", () => {
    const record = fixture();
    record.observations[0].signalObserved = false;
    assert.equal(scoreObservations(record, now).classification, "zero");
    record.observations[0].eligible = false;
    assert.equal(scoreObservations(record, now).qualifyingSignalCount, 0);
  });

  it("blocks premature scoring and rejects unfrozen contracts or missing assets", () => {
    const record = fixture();
    assert.equal(scoreObservations(record, "2026-10-07T23:59:59Z").classification, "blocked");
    for (const change of [
      (r) => { r.contractSnapshot.preregisteredAt = r.contractSnapshot.observationStart; },
      (r) => { r.contractSnapshot.observationEnd = r.contractSnapshot.observationStart; },
      (r) => { r.contractSnapshot.threshold = 0; },
      (r) => { r.publishedAssets = [r.publishedAssets[0]]; },
      (r) => { r.publishedAssets[1].sha256 = "bad"; },
      (r) => { r.observations = null; },
      (r) => { r.contractId = ""; },
    ]) {
      const invalid = fixture();
      change(invalid);
      assert.throws(() => scoreObservations(invalid, now), /frozen, valid contract/);
    }
    assert.throws(() => scoreObservations(null, now), /must be an object/);
  });

  it("never interprets absent, duplicate, outside-window, or unsupported evidence as a pass", () => {
    const missing = fixture();
    missing.observations = [];
    assert.deepEqual(scoreObservations(missing, now).classification, "inconclusive");
    for (const change of [
      (r) => { r.observations[0].evidenceSha256 = null; },
      (r) => { r.observations[0].observedAt = "2026-10-09T00:00:00Z"; },
      (r) => { r.observations[0].startedAt = "2026-09-30T00:00:00Z"; },
      (r) => { r.observations[0].finishedAt = null; },
      (r) => { r.observations[0].finishedAt = "2026-10-01T00:00:00Z"; },
      (r) => { r.observations[0].finishedAt = "2026-10-09T00:00:00Z"; },
      (r) => { r.observations[0].liveOpenedAt = null; },
      (r) => { r.observations[0].firstTraceDurationSeconds = null; },
    ]) {
      const record = fixture();
      change(record);
      assert.equal(scoreObservations(record, now).classification, "inconclusive");
    }
    const abandoned = fixture();
    abandoned.observations[0].signalObserved = false;
    abandoned.observations[0].liveOpened = false;
    abandoned.observations[0].abandonmentReason = null;
    assert.equal(scoreObservations(abandoned, now).classification, "inconclusive");
    abandoned.observations[0].abandonmentReason = "installation failed";
    assert.equal(scoreObservations(abandoned, now).classification, "zero");
    const duplicate = fixture();
    duplicate.observations.push(structuredClone(duplicate.observations[0]));
    assert.throws(() => scoreObservations(duplicate, now), /repeats a participant/);
    const incomplete = fixture();
    delete incomplete.observations[0].firstTraceDurationSeconds;
    assert.throws(() => scoreObservations(incomplete, now), /observation is invalid/);
  });

  it("reads a saved record through the CLI without mistaking inconclusive for success", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srs-adoption-score-"));
    const file = path.join(dir, "observations.json");
    const stdout = process.stdout.write;
    process.stdout.write = () => true;
    try {
      fs.writeFileSync(file, JSON.stringify(fixture()));
      assert.equal(main([file], now), 0);
      assert.equal(main([file]), 1);
      const record = fixture();
      record.observations = [];
      fs.writeFileSync(file, JSON.stringify(record));
      assert.equal(main([file], now), 1);
      assert.throws(() => main([]), /Usage:/);
    } finally {
      process.stdout.write = stdout;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs as a CLI and reports invalid input without a success-shaped fallback", () => {
    const script = fileURLToPath(new URL("../tools/score-adoption-observations.mjs", import.meta.url));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srs-adoption-cli-"));
    const file = path.join(dir, "observations.json");
    try {
      fs.writeFileSync(file, JSON.stringify(fixture()));
      const blocked = spawnSync(process.execPath, [script, file], { encoding: "utf8" });
      assert.equal(blocked.status, 1);
      assert.match(blocked.stdout, /"classification": "blocked"/);
      const invalid = spawnSync(process.execPath, [script, path.join(dir, "missing.json")], { encoding: "utf8" });
      assert.equal(invalid.status, 1);
      assert.match(invalid.stderr, /ENOENT/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
