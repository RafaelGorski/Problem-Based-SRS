#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const utc = (value) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) &&
  Number.isFinite(Date.parse(value));
const digest = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export function scoreObservations(record, now = new Date().toISOString()) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("observation record must be an object");
  }
  const { contractId, cohortId, contractSnapshot: contract, publishedAssets, observations } = record;
  if (!contractId || !cohortId || !contract || !Number.isInteger(contract.cohortSize) ||
      contract.cohortSize < 1 || contract.threshold !== 1 || !contract.eligibility ||
      !contract.signal || !Array.isArray(contract.exclusions) || !contract.exclusions.length ||
      !utc(contract.preregisteredAt) || !utc(contract.observationStart) ||
      !utc(contract.observationEnd) || !utc(now) ||
      Date.parse(contract.preregisteredAt) >= Date.parse(contract.observationStart) ||
      Date.parse(contract.observationStart) >= Date.parse(contract.observationEnd) ||
      !Array.isArray(publishedAssets) || publishedAssets.length !== 2 ||
      !["plugin", "canvas"].every((surface) => publishedAssets.some(
        (asset) => asset.surface === surface && asset.tag && digest(asset.sha256),
      )) || !Array.isArray(observations)) {
    throw new Error("observation record lacks a frozen, valid contract and both published assets");
  }

  const start = Date.parse(contract.observationStart);
  const end = Date.parse(contract.observationEnd);
  if (Date.parse(now) < end) {
    return { contractId, classification: "blocked", qualifyingSignalCount: 0, reason: "observation window is still open" };
  }

  const reasons = [];
  const seen = new Set();
  let count = 0;
  for (const observation of observations) {
    if (!observation || typeof observation.participantId !== "string" ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(observation.participantId) ||
        seen.has(observation.participantId) || typeof observation.eligible !== "boolean" ||
        typeof observation.signalObserved !== "boolean" || typeof observation.liveOpened !== "boolean" ||
        !utc(observation.observedAt) || !utc(observation.startedAt) ||
        !("firstTraceAt" in observation) || !("liveOpenedAt" in observation) ||
        !("finishedAt" in observation) || !("abandonmentReason" in observation) ||
        !("evidenceSha256" in observation) || !("installDurationSeconds" in observation) ||
        !("firstTraceDurationSeconds" in observation)) {
      throw new Error("observation is invalid or repeats a participant identifier");
    }
    seen.add(observation.participantId);
    if (Date.parse(observation.startedAt) < start || Date.parse(observation.startedAt) > end ||
        Date.parse(observation.observedAt) < start || Date.parse(observation.observedAt) > end) {
      reasons.push(`${observation.participantId}: observation outside the registered window`);
    }
    if (observation.signalObserved && observation.eligible) {
      if (Date.parse(observation.observedAt) < start || Date.parse(observation.observedAt) > end ||
          !digest(observation.evidenceSha256)) {
        reasons.push(`${observation.participantId}: signal has no in-window timestamp and evidence digest`);
      } else {
        count += 1;
      }
    }
    if (observation.eligible && (!observation.finishedAt || !utc(observation.finishedAt) ||
        Date.parse(observation.finishedAt) < Date.parse(observation.startedAt) ||
        Date.parse(observation.finishedAt) > end ||
        (observation.liveOpened && (!utc(observation.liveOpenedAt) || !utc(observation.firstTraceAt))) ||
        (!observation.liveOpened && !observation.abandonmentReason) ||
        typeof observation.installDurationSeconds !== "number" ||
        observation.installDurationSeconds < 0 ||
        (observation.firstTraceAt && (typeof observation.firstTraceDurationSeconds !== "number" ||
          observation.firstTraceDurationSeconds < 0)))) {
      reasons.push(`${observation.participantId}: required run measurements are incomplete`);
    }
  }
  if (seen.size !== contract.cohortSize) {
    reasons.push(`recorded ${seen.size} of ${contract.cohortSize} registered participants`);
  }
  const classification = reasons.length ? "inconclusive" : count >= contract.threshold ? "positive" : "zero";
  const result = { contractId, classification, qualifyingSignalCount: count, reasons };
  if (record.outcome && (record.outcome.classification !== classification ||
      record.outcome.qualifyingSignalCount !== count)) {
    throw new Error("stored outcome disagrees with recomputed observations");
  }
  return result;
}

export function main(argv = process.argv.slice(2), now = new Date().toISOString()) {
  if (argv.length !== 1) throw new Error("Usage: node evals/tools/score-adoption-observations.mjs <record.json>");
  const record = JSON.parse(fs.readFileSync(path.resolve(argv[0]), "utf8"));
  const result = scoreObservations(record, now);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.classification === "blocked" || result.classification === "inconclusive" ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
