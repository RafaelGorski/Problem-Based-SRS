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
  "publicPostUrl",
  "beforeState",
  "afterState",
  "releasedEvidence",
  "observationStart",
  "observationEnd",
  "signal",
  "measurementSource",
  "positiveThreshold",
  "exclusions",
];

export function validateContract(contract = {}) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    const value = contract[field];
    if (value === undefined || value === null || value === "" ||
        (Array.isArray(value) && value.length === 0)) {
      errors.push(`${field} is required`);
    }
  }
  if (contract.signal && typeof contract.signal !== "string") {
    errors.push("signal must be one predeclared string");
  }
  if (contract.positiveThreshold !== undefined &&
      (!Number.isInteger(contract.positiveThreshold) || contract.positiveThreshold < 1)) {
    errors.push("positiveThreshold must be a positive integer");
  }
  if (contract.observationStart && contract.observationEnd &&
      new Date(contract.observationEnd) <= new Date(contract.observationStart)) {
    errors.push("observationEnd must be after observationStart");
  }
  if (contract.readingAtStart === undefined || contract.readingAtEnd === undefined) {
    errors.push("readingAtStart and readingAtEnd are required");
  }
  if (contract.result !== undefined && !["positive", "zero", "blocked"].includes(contract.result)) {
    errors.push("result must be positive, zero, or blocked");
  }
  return {
    ok: errors.length === 0,
    errors,
    status: errors.length === 0 ? "ready_for_publication" : "incomplete",
    externalResult: contract.result ?? "not_recorded",
  };
}

export function parseArgs(argv) {
  const out = { file: null, json: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") out.json = argv[++i];
    else if (argv[i].startsWith("-")) throw new Error(`unknown option: ${argv[i]}`);
    else if (!out.file) out.file = argv[i];
    else throw new Error("expected one contract file");
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.file) throw new Error("Usage: node evals/tools/adoption-experiment.mjs <contract.json> [--json file]");
  const file = path.resolve(opts.file);
  const result = validateContract(JSON.parse(fs.readFileSync(file, "utf8")));
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (opts.json) fs.writeFileSync(opts.json, output);
  process.stdout.write(output);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
