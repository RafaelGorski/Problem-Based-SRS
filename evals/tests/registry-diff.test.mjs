import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  cli,
  compareRegistrySnapshots,
  isInvokedDirectly,
  parseArgs,
  runIfInvoked,
} from "../tools/registry-diff.mjs";

const toolPath = fileURLToPath(new URL("../tools/registry-diff.mjs", import.meta.url));

function capture() {
  const output = { stdout: "", stderr: "" };
  return {
    output,
    io: {
      cwd: os.tmpdir(),
      stdout: { write: (text) => (output.stdout += text) },
      stderr: { write: (text) => (output.stderr += text) },
    },
  };
}

function snapshot(overrides = {}) {
  const base = {
    findings: [],
    observations: {
      registry: {
        listing: {
          status: "readable",
          url: "https://www.skills.sh/rafaelgorski/problem-based-srs",
          declaredCount: 1,
          parsedCount: 1,
          advertisedNames: ["problem-based-srs"],
          description: "Current description",
          partial: false,
          error: null,
        },
        repositoryNames: ["problem-based-srs"],
        skills: [{
          name: "problem-based-srs",
          url: "https://www.skills.sh/rafaelgorski/problem-based-srs/problem-based-srs",
          status: "readable",
          description: {
            expected: "Current description",
            actual: "Current description",
            matches: true,
          },
          headings: { expected: 15, matched: 15, missing: [] },
          version: {
            status: "page-publishes-none",
            expected: "1.3",
            actual: null,
            matches: null,
          },
          error: null,
        }],
      },
    },
  };
  const result = structuredClone(base);
  if (Object.hasOwn(overrides, "findings")) result.findings = overrides.findings;
  if (Object.hasOwn(overrides, "observations")) {
    if (overrides.observations === null) {
      result.observations = null;
    } else if (overrides.observations?.registry) {
      const registryOverrides = overrides.observations.registry;
      for (const key of Object.keys(registryOverrides)) {
        if (key === "listing" && registryOverrides.listing && typeof registryOverrides.listing === "object") {
          result.observations.registry.listing = {
            ...result.observations.registry.listing,
            ...registryOverrides.listing,
          };
        } else {
          result.observations.registry[key] = registryOverrides[key];
        }
      }
    }
  }
  return {
    ...result,
  };
}

function tempSnapshots(before, after) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "registry-diff-"));
  const beforeFile = path.join(directory, "before.json");
  const afterFile = path.join(directory, "after.json");
  fs.writeFileSync(beforeFile, JSON.stringify(before));
  fs.writeFileSync(afterFile, JSON.stringify(after));
  return {
    beforeFile,
    afterFile,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

describe("parsed registry snapshot comparison", () => {
  it("reports field-level additions, removals, and changes independent of array order", () => {
    const before = snapshot({
      findings: [{ id: "registry-listing-drift" }, { id: "registry-skill-stale" }],
      observations: {
        registry: {
          listing: {
            advertisedNames: ["problem-based-srs", "retired-skill"],
            declaredCount: 2,
            parsedCount: 2,
          },
          repositoryNames: ["problem-based-srs"],
          skills: [{
            name: "problem-based-srs",
            status: "readable",
            description: { actual: "Old description", matches: false },
            headings: { matched: 13, missing: ["Identifier Notation (CANONICAL)", "Lifecycle"] },
          }],
        },
      },
    });
    const after = snapshot({
      findings: [],
      observations: {
        registry: {
          listing: {
            advertisedNames: ["new-skill", "problem-based-srs"],
            declaredCount: 2,
            parsedCount: 2,
          },
          repositoryNames: ["problem-based-srs"],
          skills: [{
            name: "problem-based-srs",
            status: "readable",
            description: { actual: "Current description", matches: true },
            headings: { matched: 15, missing: [] },
          }],
        },
      },
    });
    const result = compareRegistrySnapshots(before, after);
    assert.equal(result.verdict, "changed");
    assert.deepEqual(result.added, [
      { field: "listing.advertisedNames", value: "new-skill" },
    ]);
    assert.deepEqual(result.removed, [
      { field: "listing.advertisedNames", value: "retired-skill" },
      { field: "skills.problem-based-srs.headings.missing", value: "Identifier Notation (CANONICAL)" },
      { field: "skills.problem-based-srs.headings.missing", value: "Lifecycle" },
    ]);
    assert.ok(result.changed.some((item) => item.field === "skills.problem-based-srs.description.actual"));
    assert.deepEqual(result.clearedFindings, ["registry-listing-drift", "registry-skill-stale"]);
    assert.deepEqual(result.remainingFindings, []);
    assert.equal(result.staleContentCanary, false);
  });

  it("does not mistake unchanged stale parsed content for a refreshed page", () => {
    const stale = snapshot({
      findings: [{ id: "registry-skill-stale" }],
      observations: {
        registry: {
          skills: [{
            name: "problem-based-srs",
            status: "readable",
            description: { actual: "Old description", matches: false },
            headings: { expected: 15, matched: 13, missing: ["Identifier Notation (CANONICAL)"] },
          }],
        },
      },
    });
    const result = compareRegistrySnapshots(stale, structuredClone(stale));
    assert.equal(result.verdict, "unchanged");
    assert.equal(result.staleContentCanary, true);
    assert.deepEqual(result.remainingFindings, ["registry-skill-stale"]);
    assert.deepEqual(result.added, []);
    assert.deepEqual(result.removed, []);
    assert.deepEqual(result.changed, []);

    const staleOnlyAfter = compareRegistrySnapshots(
      snapshot(),
      snapshot({ findings: [{ id: "registry-skill-stale" }] }),
    );
    assert.equal(staleOnlyAfter.staleContentCanary, true);

    const staleListing = snapshot({
      findings: [{ id: "registry-listing-drift" }],
      observations: {
        registry: {
          listing: { advertisedNames: ["problem-based-srs", "retired-skill"] },
        },
      },
    });
    const unchangedListing = compareRegistrySnapshots(staleListing, structuredClone(staleListing));
    assert.equal(unchangedListing.verdict, "unchanged");
    assert.equal(unchangedListing.staleContentCanary, true);
    assert.deepEqual(unchangedListing.remainingFindings, ["registry-listing-drift"]);
  });

  it("treats unreadable, partial, missing, empty, and duplicate observations as unverified", () => {
    const unreadable = snapshot({
      observations: { registry: { listing: { status: "unreachable" } } },
    });
    const partial = snapshot({
      observations: { registry: { listing: { partial: true } } },
    });
    const missingListingStatus = snapshot({
      observations: { registry: { listing: { status: undefined } } },
    });
    const noListing = snapshot({ observations: { registry: { listing: null } } });
    const noNames = snapshot({
      observations: { registry: { repositoryNames: "not-an-array" } },
    });
    const noAdvertisedNames = snapshot({
      observations: { registry: { listing: { advertisedNames: undefined } } },
    });
    const noSkillsArray = snapshot({
      observations: { registry: { skills: "not-an-array" } },
    });
    const noPages = snapshot({ observations: { registry: { skills: [] } } });
    const missingName = snapshot({
      observations: { registry: { skills: [{ status: "readable" }] } },
    });
    const unnamedUnreadableSkill = snapshot({
      observations: { registry: { skills: [null] } },
    });
    const duplicateNames = snapshot({
      observations: {
        registry: {
          skills: [
            { name: "same", status: "readable" },
            { name: "same", status: "readable" },
          ],
        },
      },
    });
    const unreadableSkill = snapshot({
      observations: { registry: { skills: [{ name: "problem-based-srs", status: "unreadable" }] } },
    });
    const missingRegistry = { observations: null };
    for (const value of [
      unreadable,
      partial,
      missingListingStatus,
      noListing,
      noNames,
      noAdvertisedNames,
      noSkillsArray,
      noPages,
      missingName,
      unnamedUnreadableSkill,
      duplicateNames,
      unreadableSkill,
      missingRegistry,
    ]) {
      const result = compareRegistrySnapshots(snapshot(), value);
      assert.equal(result.verdict, "unverified");
      assert.ok(result.unverified.length > 0);
      assert.equal(result.staleContentCanary, false);
    }
  });

  it("returns unchanged when the readable snapshots contain the same set in a different order", () => {
    const before = snapshot({
      observations: {
        registry: {
          listing: { advertisedNames: ["problem-based-srs", "retired-skill"] },
          repositoryNames: ["problem-based-srs", "another-skill"],
        },
      },
    });
    const after = snapshot({
      observations: {
        registry: {
          listing: { advertisedNames: ["retired-skill", "problem-based-srs"] },
          repositoryNames: ["another-skill", "problem-based-srs"],
        },
      },
    });
    assert.equal(compareRegistrySnapshots(before, after).verdict, "unchanged");
  });

  it("reports added and removed skill pages by name", () => {
    const before = snapshot();
    const after = snapshot({
      observations: {
        registry: {
          skills: [
            ...snapshot().observations.registry.skills,
            { name: "new-skill", status: "readable" },
          ],
        },
      },
    });
    const result = compareRegistrySnapshots(before, after);
    assert.equal(result.verdict, "changed");
    assert.ok(result.added.some((item) => item.field === "skills.new-skill"));
  });

  it("reports removed fields and changed non-string arrays", () => {
    const before = snapshot();
    before.observations.registry.skills[0].custom = [1];
    const after = structuredClone(before);
    delete after.observations.registry.listing.description;
    after.observations.registry.skills[0].custom = ["one"];
    const result = compareRegistrySnapshots(before, after);
    assert.equal(result.verdict, "changed");
    assert.ok(result.removed.some((item) => item.field === "listing.description"));
    assert.ok(result.changed.some((item) => item.field === "skills.problem-based-srs.custom"));
  });

  it("reports changed evidence finding sets and ignores other distribution findings", () => {
    const before = snapshot({
      findings: [{ id: "registry-listing-drift" }, { id: "plugin-release-missing" }],
    });
    const after = snapshot({ findings: [{ id: "registry-skill-stale" }] });
    const result = compareRegistrySnapshots(before, after);
    assert.deepEqual(result.beforeFindings, ["registry-listing-drift"]);
    assert.deepEqual(result.remainingFindings, ["registry-skill-stale"]);
    assert.deepEqual(result.clearedFindings, ["registry-listing-drift"]);
  });
});

describe("registry diff command", () => {
  it("parses two files and help, rejecting invalid argument shapes", () => {
    assert.deepEqual(parseArgs(["before.json", "after.json"]), {
      files: ["before.json", "after.json"],
      help: false,
    });
    assert.equal(parseArgs(["--help"]).help, true);
    assert.throws(() => parseArgs(["--bad"]), /unknown option/);
    assert.throws(() => parseArgs(["before.json"]), /exactly one before and one after/);
    assert.throws(() => parseArgs(["before.json", "after.json", "extra.json"]), /exactly one before and one after/);
  });

  it("prints help without reading files", () => {
    const { io, output } = capture();
    assert.equal(cli(["--help"], io), 0);
    assert.match(output.stdout, /Usage:/);
  });

  it("uses process streams and repository root defaults, and supports direct invocation", () => {
    const files = tempSnapshots(snapshot(), snapshot());
    const processOutput = { stdout: "", stderr: "" };
    const stdoutWrite = process.stdout.write;
    const stderrWrite = process.stderr.write;
    process.stdout.write = (text) => {
      processOutput.stdout += String(text);
      return true;
    };
    process.stderr.write = (text) => {
      processOutput.stderr += String(text);
      return true;
    };
    try {
      assert.equal(cli(["--help"]), 0);
      assert.equal(cli(["--invalid"]), 1);
      const { io } = capture();
      delete io.cwd;
      assert.equal(cli([files.beforeFile, files.afterFile], io), 0);
      const exits = [];
      assert.equal(runIfInvoked(toolPath, ["--help"], (status) => exits.push(status), capture().io), true);
      assert.deepEqual(exits, [0]);
      assert.equal(runIfInvoked(`${toolPath}.other`, [], assert.fail), false);
      assert.equal(isInvokedDirectly(toolPath), true);
      assert.equal(isInvokedDirectly(undefined), false);
    } finally {
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
      files.cleanup();
    }
    assert.match(processOutput.stdout, /Usage:/);
    assert.match(processOutput.stderr, /unknown option/);
  });

  it("reports invalid arguments through stderr", () => {
    const { io, output } = capture();
    assert.equal(cli(["--invalid"], io), 1);
    assert.match(output.stderr, /unknown option/);
  });

  it("compares files and returns unverified for unreadable content or file errors", () => {
    const good = snapshot();
    const unknown = snapshot({
      observations: { registry: { listing: { status: "unreadable" } } },
    });

    it("fails when a readable fetch still serves the old listing or leaves drift", () => {
      const stale = snapshot({
        findings: [{ id: "registry-listing-drift" }],
        observations: {
          registry: { listing: { advertisedNames: ["problem-based-srs", "retired-skill"] } },
        },
      });
      const files = tempSnapshots(stale, structuredClone(stale));
      try {
        const { io, output } = capture();
        assert.equal(cli([files.beforeFile, files.afterFile], io), 1);
        assert.match(output.stdout, /"staleContentCanary": true/);
        fs.writeFileSync(files.afterFile, JSON.stringify(snapshot({
          findings: [{ id: "registry-skill-stale" }],
        })));
        assert.equal(cli([files.beforeFile, files.afterFile], io), 1);
        assert.match(output.stdout, /"remainingFindings": \[\s*"registry-skill-stale"/);
        fs.writeFileSync(files.afterFile, JSON.stringify(snapshot()));
        assert.equal(cli([files.beforeFile, files.afterFile], io), 0);
      } finally {
        files.cleanup();
      }
    });
    const files = tempSnapshots(good, unknown);
    try {
      const { io, output } = capture();
      assert.equal(cli([files.beforeFile, files.afterFile], io), 1);
      assert.match(output.stdout, /"verdict": "unverified"/);
      assert.equal(cli([files.beforeFile, "missing.json"], io), 1);
      assert.match(output.stderr, /registry-diff:/);
      fs.writeFileSync(files.afterFile, "{");
      assert.equal(cli([files.beforeFile, files.afterFile], io), 1);
      assert.match(output.stderr, /JSON/);
    } finally {
      files.cleanup();
    }
  });

  it("prints a semantic diff and succeeds when both captured states are readable", () => {
    const files = tempSnapshots(snapshot(), snapshot({
      observations: { registry: { listing: { description: "updated" } } },
    }));
    try {
      const { io, output } = capture();
      assert.equal(cli([files.beforeFile, files.afterFile], io), 0);
      assert.match(output.stdout, /"verdict": "changed"/);
      assert.match(output.stdout, /"field": "listing.description"/);
    } finally {
      files.cleanup();
    }
  });
});
