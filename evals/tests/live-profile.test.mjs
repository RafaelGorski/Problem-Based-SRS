// `evals/tools/live-profile.mjs` checks the preconditions #105 states in prose and nothing
// enforced: that the profile has no prior install, that the workspace contributes no project
// copy of the same extension, that the extracted archive is still the published tree, and
// that the run can say which install supplies `/live` and which supplies the panel.
//
// The reason a *tool* rather than a checklist item: all four conditions are invisible at the
// moment they matter. A maintainer with `srs-navigator` already in `~/.copilot/extensions`,
// running from a clone of this repository, sees a working `/live` and a correct-looking
// screenshot — and has proven nothing about the published archive, because the panel came
// from a double registration of the repository's own project extension. That is not
// hypothetical: it is the state of the machine this suite was written on, and it is what the
// "against this repository" case below pins.
//
// One thing is deliberately **not** a gate: whether the app loaded the archive. A refusal to
// load is a result — arguably the most valuable one — so it is recorded and never asserted.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  GATE_IDS,
  LIVE_ACTION,
  LIVE_REFERENCE,
  LOAD_VERDICTS,
  USAGE,
  canvasActions,
  checkLiveProfile,
  cli,
  defaultExtensionsDir,
  formatReport,
  installedExtensions,
  parseArgs,
  projectExtensions,
} from "../tools/live-profile.mjs";
import { CANVAS_ID } from "../tools/open-archive-canvas.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

let tmp = "";

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-live-profile-"));
});

after(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/* --------------------------------------------------------------------------- fixtures */

function tree(name, files = {}) {
  const root = path.join(tmp, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

/** An `extension.mjs` whose ACTIONS table dispatches exactly `actions`. */
const extensionSource = (actions) =>
  [
    `const CANVAS_ID = "${CANVAS_ID}";`,
    "const ACTIONS = [",
    ...actions.map((a) => `  { action: "${a}", file: "${a}.md" },`),
    "];",
    "export default {};",
  ].join("\n");

const SHIPPED_ACTIONS = [
  "business-context",
  "problems",
  "software-glance",
  "needs",
  "software-vision",
  "functional-requirements",
  "validate",
  "complexity",
];

/** A canvas archive as published: the extension, no node_modules. */
const archive = (name, actions = SHIPPED_ACTIONS, extra = {}) =>
  tree(name, { "extension.mjs": extensionSource(actions), ...extra });

/** A skills install that ships the reference `/live` comes from. */
const skills = (name, files = { [LIVE_REFERENCE.split(path.sep).join("/")]: "# live\n" }) =>
  tree(name, { "SKILL.md": "# skill\n", ...files });

const gate = (record, id) => record.checks.find((c) => c.id === id);

/** The smallest world in which every gate passes. Defaults are built only when not given. */
function healthy(name, overrides = {}) {
  const base = {};
  if (!("extensionsDir" in overrides)) base.extensionsDir = tree(`${name}-profile`);
  if (!("workspace" in overrides)) base.workspace = tree(`${name}-workspace`);
  if (!("archiveDir" in overrides)) base.archiveDir = archive(`${name}-archive`);
  if (!("skillsDir" in overrides)) base.skillsDir = skills(`${name}-skills`);
  return checkLiveProfile({ ...base, ...overrides });
}

/* ------------------------------------------------------------------------ pure pieces */

describe("the readers", () => {
  it("names the profile the app discovers user-scope extensions from", () => {
    assert.equal(
      defaultExtensionsDir("/home/someone"),
      path.join("/home/someone", ".copilot", "extensions"),
    );
    assert.equal(defaultExtensionsDir(), path.join(os.homedir(), ".copilot", "extensions"));
  });

  it("reads the action enum out of the extension rather than restating it", () => {
    assert.deepEqual(canvasActions(extensionSource(["problems", "validate"])), [
      "problems",
      "validate",
    ]);
    assert.deepEqual(canvasActions("const ACTIONS = [];"), []);
  });

  it("returns null when there is no table to read, which is not the same as an empty one", () => {
    assert.equal(canvasActions("export default {};"), null);
    assert.equal(canvasActions(null), null);
  });

  it("treats a profile with no directory as nothing installed", () => {
    assert.deepEqual(installedExtensions(path.join(tmp, "never-existed")), []);
    assert.deepEqual(installedExtensions(""), []);
    assert.deepEqual(installedExtensions(null), []);
  });

  it("lists installed extensions, ignoring loose files", () => {
    const dir = tree("profile-with-installs", {
      "srs-navigator/extension.mjs": "x",
      "other-ext/extension.mjs": "x",
      "notes.txt": "x",
    });
    assert.deepEqual(installedExtensions(dir), ["other-ext", "srs-navigator"]);
  });

  it("judges a project extension by what it registers, not by its directory name", () => {
    const workspace = tree("workspace-renamed", {
      ".github/extensions/renamed-thing/extension.mjs": extensionSource(["problems"]),
      ".github/extensions/unrelated/extension.mjs": "export default {};",
      ".github/extensions/no-entry/README.md": "no extension.mjs here",
    });
    assert.deepEqual(projectExtensions(workspace).map((p) => [p.name, p.registersCanvas]), [
      ["no-entry", false],
      ["renamed-thing", true],
      ["unrelated", false],
    ]);
  });

  it("treats a workspace with no .github/extensions as contributing nothing", () => {
    assert.deepEqual(projectExtensions(tree("workspace-bare")), []);
  });
});

/* -------------------------------------------------------------------------- the record */

describe("a profile that is actually clean", () => {
  it("passes every precondition and names both install sources", () => {
    const record = healthy("clean");
    assert.equal(record.ok, true, formatReport(record));
    assert.deepEqual(
      record.checks.map((c) => c.id),
      [...GATE_IDS],
    );
    assert.equal(record.commandSources.command.evidence, `skills/problem-based-srs/${LIVE_REFERENCE.split(path.sep).join("/")}`);
    assert.equal(record.manual.loaded, "not-run");
    assert.deepEqual(record.unverified, []);
  });

  it("records the app's verdict without letting it decide the exit code", () => {
    const refused = healthy("refused", { loaded: "no", note: "extension failed to start" });
    assert.equal(refused.ok, true, "a refusal is a result, not a failed precondition");
    assert.equal(refused.manual.loaded, "no");
    assert.match(formatReport(refused), /REFUSED to load the archive — recorded as a result/);

    const loaded = healthy("loaded", { loaded: "yes", log: "C:/logs/ext.log" });
    assert.match(formatReport(loaded), /loaded: yes — the app loaded the archive/);
    assert.equal(loaded.manual.log, "C:/logs/ext.log");
  });

  it("refuses a verdict it does not understand rather than recording a typo", () => {
    assert.throws(() => checkLiveProfile({ loaded: "probably" }), /must be one of/);
    assert.deepEqual([...LOAD_VERDICTS], ["yes", "no", "not-run"]);
  });
});

/* ------------------------------------------------------------------------- canaries */

describe("CANARIES — each precondition fails on the state it exists to catch", () => {
  it("profile-has-no-prior-install rejects a profile that already has the extension", () => {
    const record = healthy("prior", {
      extensionsDir: tree("prior-profile", { [`${CANVAS_ID}/extension.mjs`]: "x" }),
    });
    const g = gate(record, "profile-has-no-prior-install");
    assert.equal(g.ok, false);
    assert.match(g.detail, /would load a previous install rather than the archive under test/);
    assert.equal(record.ok, false);
  });

  it("profile-has-no-prior-install passes with unrelated extensions present", () => {
    const record = healthy("unrelated", {
      extensionsDir: tree("unrelated-profile", { "some-other/extension.mjs": "x" }),
    });
    assert.equal(gate(record, "profile-has-no-prior-install").ok, true);
    assert.deepEqual(record.observed.profileExtensions, ["some-other"]);
  });

  it("workspace-contributes-no-project-extension rejects the double-registration trap", () => {
    const record = healthy("double", {
      workspace: tree("double-workspace", {
        [`.github/extensions/${CANVAS_ID}/extension.mjs`]: extensionSource(SHIPPED_ACTIONS),
      }),
    });
    const g = gate(record, "workspace-contributes-no-project-extension");
    assert.equal(g.ok, false);
    assert.match(g.detail, /registers the same canvas id and tool name twice/);
    assert.match(g.detail, /Use a neutral workspace/);
  });

  it("archive-carries-no-node-modules fails when no archive was named at all", () => {
    const record = healthy("no-archive", { archiveDir: null });
    const g = gate(record, "archive-carries-no-node-modules");
    assert.equal(g.ok, false);
    assert.match(g.detail, /no --archive given/);
    assert.equal(record.archiveDir, null);
  });

  it("archive-carries-no-node-modules fails when the named tree is not there", () => {
    const record = healthy("ghost-archive", {
      archiveDir: path.join(tmp, "no-such-archive"),
    });
    assert.match(gate(record, "archive-carries-no-node-modules").detail, /does not exist/);
    assert.deepEqual(record.observed.archiveEntries, []);
  });

  it("archive-carries-no-node-modules rejects a tree an install step re-created", () => {
    const record = healthy("installed-into", {
      archiveDir: archive("installed-archive", SHIPPED_ACTIONS, {
        "node_modules/left-pad/index.js": "module.exports = 0;",
      }),
    });
    const g = gate(record, "archive-carries-no-node-modules");
    assert.equal(g.ok, false);
    assert.match(g.detail, /no longer the published archive/);
    assert.ok(record.observed.archiveEntries.includes("node_modules"));
  });

  it("command-source-is-established fails when the skills install ships no live reference", () => {
    const record = healthy("no-live-ref", {
      skillsDir: skills("skills-without-live", { "reference/problems.md": "# problems\n" }),
    });
    const g = gate(record, "command-source-is-established");
    assert.equal(g.ok, false);
    assert.match(g.detail, /does not ship/);
  });

  it("command-source-is-established fails when no skills install was named", () => {
    const record = healthy("no-skills", { skillsDir: null });
    assert.match(
      gate(record, "command-source-is-established").detail,
      new RegExp(`no --skills given, so nothing established where /${LIVE_ACTION} comes from`),
    );
  });

  it("command-source-is-established fails when the archive's enum could not be read", () => {
    const record = healthy("no-enum", {
      archiveDir: tree("archive-without-table", { "extension.mjs": "export default {};" }),
    });
    const g = gate(record, "command-source-is-established");
    assert.equal(g.ok, false);
    assert.match(g.detail, /ACTIONS table could not be read/);
    assert.equal(record.observed.canvasActions, null);
  });

  it("command-source-is-established fails when no archive was named to read", () => {
    const record = healthy("enum-unread", { archiveDir: null });
    assert.match(
      gate(record, "command-source-is-established").detail,
      /the canvas archive's action enum was never read/,
    );
  });

  it("command-source-is-established fails once the archive starts dispatching `live`", () => {
    // The claim it guards — "/live comes from the skill, the panel from the canvas" — is only
    // true while `live` is absent from the enum. If the extension ever adds it, evidence
    // built on the old claim is wrong, and this must go red rather than keep passing.
    const record = healthy("live-in-enum", {
      archiveDir: archive("archive-with-live", [...SHIPPED_ACTIONS, LIVE_ACTION]),
    });
    const g = gate(record, "command-source-is-established");
    assert.equal(g.ok, false);
    assert.match(g.detail, /the two-install claim in the runbook is stale/);
    assert.ok(record.observed.canvasActions.includes(LIVE_ACTION));
  });

  it("--profile-only reports the claim as unestablished instead of quietly passing it", () => {
    const record = healthy("profile-only", { profileOnly: true });
    assert.equal(
      record.checks.some((c) => c.id === "command-source-is-established"),
      false,
    );
    assert.equal(record.unverified.length, 1);
    assert.equal(record.unverified[0].id, "command-source-not-established");
    assert.match(formatReport(record), /not established this run:/);
    assert.equal(record.ok, true, "an unestablished claim is reported, not failed");
  });
});

/* ---------------------------------------------------------------------- the CLI surface */

describe("the CLI surface", () => {
  it("parses every option the runbook uses", () => {
    const opts = parseArgs([
      "--extensions-dir", "/p",
      "--workspace", "/w",
      "--archive", "/a",
      "--skills", "/s",
      "--profile-only",
      "--loaded", "no",
      "--log", "/l.log",
      "--note", "it refused",
      "--json", "-",
      "--quiet",
    ]);
    assert.deepEqual(opts, {
      extensionsDir: "/p",
      workspace: "/w",
      archiveDir: "/a",
      skillsDir: "/s",
      profileOnly: true,
      loaded: "no",
      log: "/l.log",
      note: "it refused",
      json: "-",
      quiet: true,
      help: false,
    });
  });

  it("defaults to the real profile and the current directory", () => {
    const opts = parseArgs([]);
    assert.equal(opts.extensionsDir, defaultExtensionsDir());
    assert.equal(opts.workspace, process.cwd());
    assert.equal(opts.loaded, "not-run");
  });

  it("asks for help", () => {
    assert.equal(parseArgs(["--help"]).help, true);
    assert.equal(parseArgs(["-h"]).help, true);
  });

  it("refuses unknown options, missing values and stray arguments", () => {
    assert.throws(() => parseArgs(["--nope"]), /unknown option --nope/);
    assert.throws(() => parseArgs(["--loaded"]), /--loaded needs a value/);
    assert.throws(() => parseArgs(["stray"]), /unexpected argument stray/);
  });

  it("documents every option it accepts", () => {
    for (const flag of [
      "--extensions-dir",
      "--workspace",
      "--archive",
      "--skills",
      "--profile-only",
      "--loaded",
      "--log",
      "--note",
      "--json",
      "--quiet",
    ]) {
      assert.ok(USAGE.includes(flag), `USAGE does not mention ${flag}`);
    }
  });

  it("renders a transcript that separates preconditions from the manual observation", () => {
    const text = formatReport(healthy("transcript"));
    assert.match(text, /preconditions \(derived — these gate the exit code\)/);
    assert.match(text, /manual observation \(recorded — this gates nothing\)/);
    assert.match(text, /RESULT: every precondition passed/);
    assert.match(text, /loaded: not-run — the app has not been run yet/);
    assert.match(text, /log: {4}\(none\)/);
  });

  it("says a capture taken now would prove nothing when a precondition failed", () => {
    const text = formatReport(healthy("transcript-red", { archiveDir: null, skillsDir: null }));
    assert.match(text, /FAIL {2}archive-carries-no-node-modules/);
    assert.match(text, /a capture taken now would not prove what it claims/);
    assert.match(text, /archive: {3}\(not given\)/);
    assert.match(text, /skills: {4}\(not given\)/);
    assert.equal(text.includes("undefined"), false);
  });
});

/* ---------------------------------------------------------------------- the entry point */

describe("the entry point", () => {
  const streams = () => {
    const out = [];
    const err = [];
    return {
      out,
      err,
      io: { stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) } },
    };
  };

  it("exits 0 and writes the record when every precondition passed", () => {
    const s = streams();
    const jsonFile = path.join(tmp, "cli-live.json");
    const code = cli(
      [
        "--extensions-dir", tree("cli-profile"),
        "--workspace", tree("cli-workspace"),
        "--archive", archive("cli-archive"),
        "--skills", skills("cli-skills"),
        "--loaded", "no",
        "--note", "the app refused to start it",
        "--json", jsonFile,
      ],
      s.io,
    );
    assert.equal(code, 0, "a refusal to load is a result, not a failed precondition");
    assert.match(s.err.join(""), /RESULT: every precondition passed/);
    const written = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
    assert.equal(written.manual.loaded, "no");
    assert.equal(written.manual.note, "the app refused to start it");
  });

  it("exits 1 when a precondition failed, and can put the record on stdout", () => {
    const s = streams();
    const code = cli(
      ["--extensions-dir", tree("cli-dirty", { [`${CANVAS_ID}/extension.mjs`]: "x" }),
        "--workspace", tree("cli-workspace-2"),
        "--json", "-",
        "--quiet"],
      s.io,
    );
    assert.equal(code, 1);
    assert.equal(s.err.join(""), "", "--quiet must suppress the transcript");
    assert.equal(JSON.parse(s.out.join("")).ok, false);
  });

  it("prints usage for --help and exits 0", () => {
    const s = streams();
    assert.equal(cli(["--help"], s.io), 0);
    assert.match(s.err.join(""), /Usage: node evals\/tools\/live-profile\.mjs/);
  });

  it("reports a bad option as a message and an exit code, not a stack trace", () => {
    const s = streams();
    assert.equal(cli(["--nope"], s.io), 1);
    assert.match(s.err.join(""), /unknown option --nope/);
  });

  it("reports an unusable load verdict the same way", () => {
    const s = streams();
    assert.equal(cli(["--loaded", "maybe"], s.io), 1);
    assert.match(s.err.join(""), /--loaded must be one of/);
  });

  it("defaults its argv to the process, so the bootstrap needs no arguments", () => {
    const argv = process.argv;
    try {
      process.argv = [argv[0], argv[1], "--help"];
      const s = streams();
      assert.equal(cli(undefined, s.io), 0);
      assert.match(s.err.join(""), /Usage:/);
    } finally {
      process.argv = argv;
    }
  });

  it("defaults its streams to the process, so the bootstrap needs no io either", () => {
    const write = process.stderr.write;
    const captured = [];
    process.stderr.write = (chunk) => {
      captured.push(String(chunk));
      return true;
    };
    try {
      assert.equal(cli(["--help"]), 0);
    } finally {
      process.stderr.write = write;
    }
    assert.match(captured.join(""), /Usage: node evals\/tools\/live-profile\.mjs/);
  });
});

/* ------------------------------------------------------------------ as a real command */

describe("as a real command", () => {
  // The bootstrap that turns `cli`'s return value into an exit code cannot run in-process —
  // it would end the test run — so it is covered the only way it can be: by being run.
  const tool = path.join(repoRoot, "evals", "tools", "live-profile.mjs");
  const invoke = (args) =>
    spawnSync(process.execPath, [tool, ...args], { encoding: "utf8", cwd: repoRoot });

  it("exits 0 for --help", () => {
    const result = invoke(["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stderr, /Usage: node evals\/tools\/live-profile\.mjs/);
  });

  it("exits 1 with a message when an option is unknown", () => {
    const result = invoke(["--nope"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown option --nope/);
  });

  it("exits 1 and prints the failing gate when the profile is not clean", () => {
    const result = invoke(["--extensions-dir", tree("cli-empty-profile"), "--workspace", repoRoot]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /workspace-contributes-no-project-extension/);
  });
});

/* -------------------------------------------------------- the repository it ships with */

describe("against this repository", () => {
  it("fails the workspace precondition when run from this clone, which is the point", () => {
    // A maintainer proving `/live` from a checkout of this repository is testing the project
    // extension the repository itself contributes, not the published archive. That is #105's
    // third problem, and it is invisible without this check.
    const record = checkLiveProfile({
      extensionsDir: tree("real-repo-profile"),
      workspace: repoRoot,
      archiveDir: path.join(repoRoot, ".github", "extensions", CANVAS_ID),
      skillsDir: path.join(repoRoot, "skills", "problem-based-srs"),
    });
    const g = gate(record, "workspace-contributes-no-project-extension");
    assert.equal(g.ok, false);
    assert.match(g.detail, new RegExp(CANVAS_ID));
    assert.ok(
      record.observed.projectExtensions.some((p) => p.name === CANVAS_ID && p.registersCanvas),
    );
  });

  it("reads the shipped extension's real enum, and finds no `live` in it", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, ".github", "extensions", CANVAS_ID, "extension.mjs"),
      "utf8",
    );
    const actions = canvasActions(source);
    assert.ok(Array.isArray(actions) && actions.length > 0, "the ACTIONS table must be readable");
    assert.equal(
      actions.includes(LIVE_ACTION),
      false,
      "`/live` ships with the skill, not the canvas archive — the runbook's claim depends on it",
    );
  });

  it("finds the reference the skills install supplies /live from", () => {
    assert.ok(
      fs.existsSync(path.join(repoRoot, "skills", "problem-based-srs", LIVE_REFERENCE)),
      `the canonical skill must ship ${LIVE_REFERENCE}`,
    );
  });
});
