#!/usr/bin/env node
// Validate the external adoption experiment contract before a public post is made.
// This tool deliberately cannot mark the experiment successful: only an external,
// attributable confirmation can satisfy the signal.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const REQUIRED_FIELDS = [
  "targetChannel",
  "intendedAudience",
  "beforeState",
  "afterState",
  "releasedEvidence",
  "observationStart",
  "observationEnd",
  "contractCreatedAt",
  "signal",
  "measurementSource",
  "positiveThreshold",
  "exclusions",
  "nonQualifyingSignals",
];

const REQUIRED_EXCLUSIONS = [
  "maintainer",
  "bot",
  "collaborator",
  "test",
  "repository automation",
];
const REQUIRED_NON_QUALIFYING_SIGNALS = [
  "impressions",
  "clicks",
  "stars",
  "repository-owner activity",
];
const UTC_TIMESTAMP = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})Z$/;
const UTC_TIMESTAMP_FRACTIONAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const PLACEHOLDER = /<[^>]+>|\b(?:TODO|TBD|placeholder|named channel|specific user group)\b/i;
const OUTCOME_RESULTS = new Set(["positive", "zero", "inconclusive"]);

function isBlank(value) {
  return value === undefined || value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
}

export function parseUtcTimestamp(value) {
  if (typeof value !== "string") return null;
  if (!UTC_TIMESTAMP_FRACTIONAL.test(value) && !UTC_TIMESTAMP.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const canonical = date.toISOString();
  const expected = `${canonical.slice(0, 19)}${value.slice(19)}`;
  return value === expected ? date : null;
}

function addRequiredFieldErrors(contract, errors) {
  for (const field of REQUIRED_FIELDS) {
    const value = contract[field];
    if (isBlank(value)) {
      errors.push(`${field} is required`);
    } else if (typeof value === "string" && PLACEHOLDER.test(value)) {
      errors.push(`${field} cannot be a placeholder`);
    }
  }

  for (const field of ["targetChannel", "intendedAudience", "beforeState", "afterState",
    "releasedEvidence", "signal", "measurementSource"]) {
    if (!isBlank(contract[field]) && typeof contract[field] !== "string") {
      errors.push(`${field} must be a string`);
    }
  }

  for (const [field, required] of [
    ["exclusions", REQUIRED_EXCLUSIONS],
    ["nonQualifyingSignals", REQUIRED_NON_QUALIFYING_SIGNALS],
  ]) {
    const value = contract[field];
    if (!isBlank(value) && (!Array.isArray(value) ||
        required.some((item) => !value.some(
          (entry) => typeof entry === "string" && entry.trim().toLowerCase() === item,
        )))) {
      errors.push(`${field} must include ${required.join(", ")}`);
    }
  }

  if (contract.signal && typeof contract.signal !== "string") {
    errors.push("signal must be one predeclared string");
  }
  if (contract.positiveThreshold !== 1) {
    errors.push("positiveThreshold must be 1");
  }
}

export function validateContract(contract = {}, { phase = "prepublication", now = new Date() } = {}) {
  const errors = [];
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    errors.push("contract must be a JSON object");
    contract = {};
  }
  if (!["prepublication", "outcome"].includes(phase)) {
    errors.push("phase must be prepublication or outcome");
  }

  addRequiredFieldErrors(contract, errors);

  const observationStart = parseUtcTimestamp(contract.observationStart);
  const observationEnd = parseUtcTimestamp(contract.observationEnd);
  const contractCreatedAt = parseUtcTimestamp(contract.contractCreatedAt);
  const publicationAt = parseUtcTimestamp(contract.publicationAt);
  for (const [field, value] of [
    ["contractCreatedAt", contractCreatedAt],
    ["observationStart", observationStart],
    ["observationEnd", observationEnd],
  ]) {
    if (!value) errors.push(`${field} must be a valid UTC timestamp ending in Z`);
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  const validNow = !Number.isNaN(nowDate.getTime());
  if (!validNow) errors.push("now must be a valid date");
  if (contractCreatedAt && validNow && contractCreatedAt > nowDate) {
    errors.push("contractCreatedAt cannot be in the future");
  }
  if (contractCreatedAt && observationStart && contractCreatedAt >= observationStart) {
    errors.push("contractCreatedAt must precede observationStart");
  }
  if (phase === "outcome" && !publicationAt) {
    errors.push("publicationAt must be a valid UTC timestamp ending in Z");
  }
  if (contractCreatedAt && publicationAt && publicationAt <= contractCreatedAt) {
    errors.push("publicationAt must follow contractCreatedAt");
  }
  if (publicationAt && observationStart && publicationAt >= observationStart) {
    errors.push("publicationAt must precede observationStart");
  }
  if (observationStart && observationEnd && observationEnd <= observationStart) {
    errors.push("observationEnd must be after observationStart");
  }

  if (phase === "prepublication") {
    if (!isBlank(contract.publicPostUrl)) {
      errors.push("publicPostUrl must remain unset until publication");
    }
    if (!isBlank(contract.publicationAt)) {
      errors.push("publicationAt must remain unset until publication");
    }
    if (!isBlank(contract.readingAtStart) || !isBlank(contract.readingAtEnd) ||
        !isBlank(contract.result)) {
      errors.push("readings and result must remain unset before publication");
    }
    if (observationStart && validNow && observationStart <= nowDate) {
      errors.push("observationStart must be in the future when the contract is registered");
    }
  } else if (phase === "outcome") {
    if (typeof contract.publicPostUrl !== "string" || isBlank(contract.publicPostUrl)) {
      errors.push("publicPostUrl is required for the outcome");
    } else {
      try {
        const url = new URL(contract.publicPostUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.push("publicPostUrl must use http or https");
        }
      } catch {
        errors.push("publicPostUrl must be a valid URL");
      }
    }

    const readings = ["readingAtStart", "readingAtEnd"].map((field) => {
      const value = contract[field];
      if (!Number.isInteger(value) || value < 0) {
        errors.push(`${field} must be a non-negative integer`);
        return null;
      }
      return value;
    });
    if (readings[0] !== null && readings[1] !== null && readings[1] < readings[0]) {
      errors.push("readingAtEnd cannot be less than readingAtStart");
    }
    if (!OUTCOME_RESULTS.has(contract.result)) {
      errors.push("result must be positive, zero, or inconclusive");
    } else if (readings[0] !== null && readings[1] !== null) {
      const qualifyingSignals = readings[1] - readings[0];
      if (contract.result === "positive" && qualifyingSignals < contract.positiveThreshold) {
        errors.push("positive result does not meet positiveThreshold");
      }
      if (contract.result === "zero" && qualifyingSignals >= contract.positiveThreshold) {
        errors.push("zero result meets positiveThreshold");
      }
    }
    if (observationEnd && validNow && observationEnd > nowDate) {
      errors.push("observationEnd must have elapsed before recording an outcome");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    status: errors.length === 0
      ? phase === "outcome" ? "outcome_recorded" : "ready_for_publication"
      : "incomplete",
    externalResult: errors.length === 0 && phase === "outcome" && OUTCOME_RESULTS.has(contract.result)
      ? contract.result
      : "not_recorded",
  };
}

export function parseArgs(argv) {
  const out = { file: null, json: null, phase: "prepublication" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") {
      out.json = argv[++i];
      if (!out.json || out.json.startsWith("-")) throw new Error("--json needs an output file");
    } else if (argv[i] === "--phase") {
      out.phase = argv[++i];
      if (!["prepublication", "outcome"].includes(out.phase)) {
        throw new Error("--phase must be prepublication or outcome");
      }
    } else if (argv[i].startsWith("-")) throw new Error(`unknown option: ${argv[i]}`);
    else if (!out.file) out.file = argv[i];
    else throw new Error("expected one contract file");
  }
  return out;
}

export function runCli(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 2;
  }
  if (!opts.file) {
    stderr.write(
      "Usage: node evals/tools/adoption-experiment.mjs <contract.json> " +
      "[--phase prepublication|outcome] [--json file]\n",
    );
    return 2;
  }

  try {
    const file = path.resolve(opts.file);
    const contract = JSON.parse(fs.readFileSync(file, "utf8"));
    const result = validateContract(contract, { phase: opts.phase, now: io.now ?? new Date() });
    const output = `${JSON.stringify(result, null, 2)}\n`;
    if (opts.json) fs.writeFileSync(opts.json, output);
    stdout.write(output);
    return result.ok ? 0 : 1;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 2;
  }
}

export function isInvokedDirectly(scriptPath = process.argv[1]) {
  return Boolean(scriptPath) &&
    pathToFileURL(path.resolve(scriptPath)).href === import.meta.url;
}

export function invokeCliIfDirect(
  scriptPath = process.argv[1],
  argv = process.argv.slice(2),
  io = {},
  setExitCode = (code) => { process.exitCode = code; },
) {
  if (!isInvokedDirectly(scriptPath)) return false;
  setExitCode(runCli(argv, io));
  return true;
}

invokeCliIfDirect();
