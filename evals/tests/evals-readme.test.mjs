// Drift guard for `evals/README.md` (issue #55 → #65).
//
// #55 reported three documented commands that did not work: `npm test` inside
// `evals/`, a phantom `evals/package.json`, and `node --test tests/`. PR #63 fixed
// the text — but nothing asserted it, so the fix was one careless edit from coming
// back. In a product that sells *anti-drift*, an unguarded documentation fix is a
// regression waiting to happen.
//
// The validator is pure (see `lib/readme-contract.mjs`): it reads text, it never
// spawns a shell. That keeps this test deterministic, key-free, and — importantly —
// non-recursive, since the README documents the very command that runs this file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateEvalsReadme,
  parseCommands,
  bareDirectoryTestTargets,
  referencedPaths,
  runnerFileArgs,
  isLiveCommand,
  REQUIRED_COMMANDS,
} from "../lib/readme-contract.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const README_REL = "evals/README.md";
const README = fs.readFileSync(path.join(REPO_ROOT, README_REL), "utf8");

const exists = (rel) => fs.existsSync(path.join(REPO_ROOT, rel));

describe("evals/README.md — documented commands are real (FR.01.1.1)", () => {
  test("the README passes the full command contract", () => {
    const result = validateEvalsReadme(README, exists);
    assert.deepEqual(result.errors, [], "evals/README.md documents commands that do not work");
    assert.equal(result.ok, true);
  });

  test("no reference to the phantom evals/package.json remains", () => {
    assert.ok(!/evals\/package\.json/.test(README), "the phantom manifest must stay out of the docs");
    assert.ok(!exists("evals/package.json"), "evals/ must stay manifest-free");
  });

  test("no command passes a bare directory to node --test", () => {
    assert.deepEqual(bareDirectoryTestTargets(parseCommands(README)), []);
  });

  test("every runner and target file named by a command exists on disk", () => {
    const missing = [];
    for (const cmd of parseCommands(README)) {
      for (const ref of referencedPaths(cmd)) {
        if (!ref.includes("*") && !exists(ref)) missing.push(`${ref} (from: ${cmd.raw})`);
      }
      for (const file of runnerFileArgs(cmd)) {
        if (!exists(`evals/tests/${file}`)) missing.push(`evals/tests/${file} (from: ${cmd.raw})`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test("the documented PowerShell runner exists", () => {
    assert.ok(exists("evals/scripts/run-tests.ps1"));
    assert.ok(exists("evals/run-evals.mjs"));
  });

  test("both command classes are documented, and live ones are repo-root relative", () => {
    const commands = parseCommands(README);
    for (const required of REQUIRED_COMMANDS) {
      assert.ok(
        commands.some((c) => required.pattern.test(c.raw)),
        `missing ${required.klass}: ${required.describe}`,
      );
    }
    const live = commands.filter(isLiveCommand);
    assert.ok(live.length > 0, "the opt-in/live commands must still be documented");
    for (const cmd of live) {
      assert.ok(
        !cmd.args.includes("run-evals.mjs"),
        `"${cmd.raw}" must be repo-root relative (evals/run-evals.mjs)`,
      );
    }
  });

  test("this guard is discovered by both documented offline runners", () => {
    // evals/scripts/run-tests.ps1 globs tests/*.test.mjs and CI uses the same
    // wildcard, so a correctly named file is wired automatically. Prove the glob
    // is really what both use, rather than an enumerated list this file could miss.
    const runner = fs.readFileSync(path.join(REPO_ROOT, "evals/scripts/run-tests.ps1"), "utf8");
    assert.match(runner, /-Filter\s+'\*\.test\.mjs'/, "the runner must glob every test file");
    const ci = fs.readFileSync(path.join(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");
    assert.match(ci, /node --test evals\/tests\/\*\.test\.mjs/, "CI must use the same wildcard");
  });
});

// A test that never fails guards nothing (repo policy). These mutate a copy of the
// README in memory and prove the validator rejects each regression from #55.
describe("evals/README.md — negative canaries (FR.01.1.2)", () => {
  const expectError = (mutated, fragment) => {
    const result = validateEvalsReadme(mutated, exists);
    assert.equal(result.ok, false, `the validator accepted a broken README (${fragment})`);
    assert.ok(
      result.errors.some((e) => e.includes(fragment)),
      `expected an error mentioning "${fragment}", got: ${result.errors.join(" | ")}`,
    );
  };

  test("rejects a reintroduced evals/package.json reference", () => {
    expectError(`${README}\n\nSee evals/package.json for scripts.\n`, "evals/package.json");
  });

  test("rejects `npm test` documented inside evals/", () => {
    expectError(`${README}\n\n\`\`\`bash\nnpm test\n\`\`\`\n`, "evals/ has no package.json");
  });

  test("rejects a bare-directory node --test form", () => {
    expectError(`${README}\n\n\`\`\`bash\nnode --test tests/\n\`\`\`\n`, "bare directory");
  });

  test("rejects a command naming a runner that does not exist", () => {
    expectError(
      `${README}\n\n\`\`\`powershell\npwsh evals/scripts/run-nothing.ps1\n\`\`\`\n`,
      "references missing file",
    );
  });

  test("rejects a live command that is not repo-root relative", () => {
    expectError(
      `${README}\n\n\`\`\`bash\nnode run-evals.mjs --force\n\`\`\`\n`,
      "not repo-root relative",
    );
  });

  test("rejects a -File target that does not exist", () => {
    expectError(
      `${README}\n\n\`\`\`powershell\npwsh evals/scripts/run-tests.ps1 -File ghost.test.mjs\n\`\`\`\n`,
      "missing test file",
    );
  });

  test("rejects removing a required entrypoint", () => {
    const without = README.replace(
      /^pwsh evals\/scripts\/run-tests\.ps1(?!\s+-File)/m,
      "pwsh evals/scripts/run-everything.ps1",
    );
    assert.notEqual(without, README, "the mutation must actually change the README");
    expectError(without, "pwsh evals/scripts/run-tests.ps1");
  });

  test("only fails for real problems — an unrelated prose edit still passes", () => {
    const result = validateEvalsReadme(`${README}\n\nA harmless extra paragraph.\n`, exists);
    assert.deepEqual(result.errors, []);
  });
});

describe("readme-contract parser", () => {
  test("ignores prose, layout trees and non-shell fences", () => {
    const md = [
      "Some prose about node --test tests/ that is not a command.",
      "```",
      "evals/",
      "├── run-evals.mjs",
      "```",
      "```js",
      "node --test tests/",
      "```",
    ].join("\n");
    assert.deepEqual(parseCommands(md), []);
  });

  test("drops env prefixes and trailing comments", () => {
    const [cmd] = parseCommands("```bash\nRUN_SKILL_EVALS=1 node evals/run-evals.mjs   # gate\n```");
    assert.equal(cmd.runner, "node");
    assert.deepEqual(cmd.args, ["evals/run-evals.mjs"]);
    assert.equal(cmd.raw, "RUN_SKILL_EVALS=1 node evals/run-evals.mjs");
  });

  test("treats a glob target as valid but a directory target as bare", () => {
    const glob = parseCommands("```bash\nnode --test evals/tests/*.test.mjs\n```");
    assert.deepEqual(bareDirectoryTestTargets(glob), []);
    const dir = parseCommands("```bash\nnode --test evals/tests\n```");
    assert.equal(bareDirectoryTestTargets(dir).length, 1);
  });

  test("classifies live commands", () => {
    const [live] = parseCommands("```bash\nnode evals/run-evals.mjs needs\n```");
    assert.equal(isLiveCommand(live), true);
    const [offline] = parseCommands("```powershell\npwsh evals/scripts/run-tests.ps1\n```");
    assert.equal(isLiveCommand(offline), false);
  });
});
