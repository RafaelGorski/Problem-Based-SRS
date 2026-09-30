#!/usr/bin/env node
// Compare saved check-distribution JSON snapshots without treating unreadable pages as clean.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const USAGE = "Usage: node evals/tools/registry-diff.mjs <before.json> <after.json>";

const REGISTRY_FINDINGS = new Set([
  "surface-unreachable",
  "registry-listing-drift",
  "registry-listing-unreadable",
  "registry-listing-partial",
  "registry-skill-stale",
  "registry-skill-unreadable",
]);

function inspectSnapshot(summary, label) {
  const reasons = [];
  const registry = summary?.observations?.registry;
  if (!registry || typeof registry !== "object") {
    return { registry: null, reasons: [`${label}: observations.registry is missing`] };
  }

  const listing = registry.listing;
  if (!listing || typeof listing !== "object") {
    reasons.push(`${label}: registry listing observation is missing`);
  } else {
    if (listing.status !== "readable") reasons.push(`${label}: registry listing is ${listing.status ?? "unreadable"}`);
    if (listing.partial !== false) reasons.push(`${label}: registry listing is partial or its completeness is unknown`);
    if (!Array.isArray(listing.advertisedNames)) {
      reasons.push(`${label}: registry advertisedNames is not an array`);
    }
  }

  if (!Array.isArray(registry.repositoryNames)) {
    reasons.push(`${label}: repositoryNames is not an array`);
  }
  if (!Array.isArray(registry.skills)) {
    reasons.push(`${label}: registry skills is not an array`);
  } else {
    const names = new Set();
    for (const skill of registry.skills) {
      if (!skill || typeof skill.name !== "string" || !skill.name) {
        reasons.push(`${label}: a registry skill has no name`);
      } else if (names.has(skill.name)) {
        reasons.push(`${label}: registry skill ${skill.name} occurs more than once`);
      } else {
        names.add(skill.name);
      }
      if (skill?.status !== "readable") {
        reasons.push(`${label}: registry skill ${skill?.name ?? "(unnamed)"} is ${skill?.status ?? "unreadable"}`);
      }
    }
  }
  if (Array.isArray(registry.skills) && registry.skills.length === 0) {
    reasons.push(`${label}: no registry skill pages were observed`);
  }
  return { registry, reasons };
}

function findingIds(summary) {
  return (Array.isArray(summary?.findings) ? summary.findings : [])
    .map((finding) => finding?.id)
    .filter((id) => REGISTRY_FINDINGS.has(id));
}

function addChange(changes, kind, field, value, previous) {
  const change = { field, value };
  if (kind === "changed") change.previous = previous;
  changes[kind].push(change);
}

function diffValue(before, after, field, changes) {
  if (before === undefined) {
    addChange(changes, "added", field, after);
    return;
  }
  if (after === undefined) {
    addChange(changes, "removed", field, before);
    return;
  }
  if (Array.isArray(before) && Array.isArray(after) &&
      before.every((value) => typeof value === "string") &&
      after.every((value) => typeof value === "string")) {
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    for (const value of [...afterSet].filter((item) => !beforeSet.has(item)).sort()) {
      addChange(changes, "added", field, value);
    }
    for (const value of [...beforeSet].filter((item) => !afterSet.has(item)).sort()) {
      addChange(changes, "removed", field, value);
    }
    return;
  }
  if (before && after && typeof before === "object" && typeof after === "object" &&
      !Array.isArray(before) && !Array.isArray(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      diffValue(before[key], after[key], `${field}.${key}`, changes);
    }
    return;
  }
  if (!Object.is(before, after)) addChange(changes, "changed", field, after, before);
}

function skillMap(registry) {
  return new Map(registry.skills.map((skill) => [skill.name, skill]));
}

export function compareRegistrySnapshots(beforeSummary, afterSummary) {
  const before = inspectSnapshot(beforeSummary, "before");
  const after = inspectSnapshot(afterSummary, "after");
  const unverified = [...before.reasons, ...after.reasons];
  const beforeFindings = findingIds(beforeSummary);
  const afterFindings = findingIds(afterSummary);
  if (unverified.length) {
    return {
      verdict: "unverified",
      added: [],
      removed: [],
      changed: [],
      unverified,
      beforeFindings,
      remainingFindings: afterFindings,
      clearedFindings: [],
      staleContentCanary: false,
    };
  }

  const changes = { added: [], removed: [], changed: [] };
  diffValue(before.registry.listing, after.registry.listing, "listing", changes);
  diffValue(before.registry.repositoryNames, after.registry.repositoryNames, "repositoryNames", changes);
  const beforeSkills = skillMap(before.registry);
  const afterSkills = skillMap(after.registry);
  const names = new Set([...beforeSkills.keys(), ...afterSkills.keys()]);
  for (const name of [...names].sort()) {
    diffValue(beforeSkills.get(name), afterSkills.get(name), `skills.${name}`, changes);
  }
  const hasChanges = Object.values(changes).some((items) => items.length > 0);
  const clearedFindings = beforeFindings.filter((id) => !afterFindings.includes(id));
  return {
    verdict: hasChanges ? "changed" : "unchanged",
    ...changes,
    unverified: [],
    beforeFindings,
    remainingFindings: afterFindings,
    clearedFindings: [...new Set(clearedFindings)].sort(),
    staleContentCanary:
      !hasChanges &&
      (beforeFindings.includes("registry-skill-stale") || afterFindings.includes("registry-skill-stale")),
  };
}

export function parseArgs(argv) {
  const options = { files: [], help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("-")) throw new Error(`registry-diff: unknown option ${arg}`);
    else options.files.push(arg);
  }
  if (!options.help && options.files.length !== 2) {
    throw new Error("registry-diff: provide exactly one before and one after JSON file");
  }
  return options;
}

export function cli(argv = process.argv.slice(2), io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    err.write(`${error.message}\n`);
    return 1;
  }
  if (options.help) {
    out.write(`${USAGE}\n`);
    return 0;
  }

  try {
    const files = options.files.map((file) => path.resolve(io.cwd ?? REPO_ROOT, file));
    const before = JSON.parse(fs.readFileSync(files[0], "utf8"));
    const after = JSON.parse(fs.readFileSync(files[1], "utf8"));
    const result = compareRegistrySnapshots(before, after);
    out.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.verdict === "unverified" ? 1 : 0;
  } catch (error) {
    err.write(`registry-diff: ${error.message}\n`);
    return 1;
  }
}

export function isInvokedDirectly(scriptPath = process.argv[1]) {
  return Boolean(scriptPath && pathToFileURL(path.resolve(scriptPath)).href === import.meta.url);
}

export function runIfInvoked(
  scriptPath = process.argv[1],
  argv = process.argv.slice(2),
  exit = process.exit,
  io = {},
) {
  if (!isInvokedDirectly(scriptPath)) return false;
  exit(cli(argv, io));
  return true;
}

runIfInvoked();
