// `evals/tools/release-preflight.mjs` is the rehearsal that #104 says did not exist, and the
// only gate in this repository that runs on the safe side of an irreversible step. So this
// suite holds two things:
//
//   1. every gate has a **canary** — a scripted world in which that gate is the one that
//      fails, so a gate that stopped working cannot pass silently;
//   2. the rehearsal's own contract: it refuses the train it cannot rehearse, it derives the
//      train verdict from `release-train.mjs` rather than restating it, and it **opens** the
//      archive it just packaged rather than trusting the packager's exit code.
//
// Point 2's last clause is the reason the tool exists at all. The documented pre-flight
// packaged and stopped; `verify-plugin-archive.mjs` only ran after publication. The
// `agents/skills/` defect was wrong in every published zip precisely because nothing opened
// one before it shipped, and a tag cannot be taken back.
//
// The world is scripted rather than real: `runPreflight` takes its runner as an argument, so
// every branch — no interpreter, a failed build, empty notes, a stranded tag, a red suite —
// is reachable offline, deterministically, without a git remote.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  GATE_IDS,
  REHEARSABLE_TRAIN,
  REPO_ROOT,
  USAGE,
  cli,
  defaultRunner,
  evalTestFiles,
  findPython,
  formatReport,
  normalizeResult,
  notesHeadings,
  parseArgs,
  parseGithubOutput,
  resolveCommand,
  runPreflight,
  sha256,
} from "../tools/release-preflight.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

let tmp = "";

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-preflight-"));
});

after(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/* --------------------------------------------------------------------------- fixtures */

const PLUGIN_VERSION = "9.9.0";
const PLUGIN_TAG = "v9.9";
const CANVAS_VERSION = "1.1.0";

/** A repository root the train classifier can read: a manifest and a canvas VERSION. */
function fixtureRoot(name, overrides = {}) {
  const root = path.join(tmp, name);
  fs.rmSync(root, { recursive: true, force: true });
  const files = {
    ".claude-plugin/plugin.json": JSON.stringify({
      name: "problem-based-srs",
      version: PLUGIN_VERSION,
    }),
    VERSION: `${CANVAS_VERSION}\n`,
    ...overrides,
  };
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

const row = (action) => `| \`${action}\` | [\`reference/${action}.md\`](reference/${action}.md) |`;

/** The smallest tree `verifyPluginArchive` accepts, written into `dir`. */
function writeHealthyArchive(dir, overrides = {}) {
  const files = {
    "problem-based-srs/.claude-plugin/plugin.json": JSON.stringify({
      name: "problem-based-srs",
      version: PLUGIN_VERSION,
    }),
    "problem-based-srs/skills/problem-based-srs/SKILL.md": [
      "| Action | File |",
      "|---|---|",
      row("problems"),
      row("live"),
    ].join("\n"),
    "problem-based-srs/skills/problem-based-srs/reference/problems.md": "# problems\n",
    "problem-based-srs/skills/problem-based-srs/reference/live.md": "# live\n",
    ...overrides,
  };
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return dir;
}

/**
 * A runner driven by patterns. The first match wins; anything unmatched succeeds silently,
 * so a test only has to describe the part of the world it is about.
 */
function fakeRun(handlers = []) {
  return (command, args = [], options = {}) => {
    const line = [command, ...args].join(" ");
    for (const [pattern, respond] of handlers) {
      const hit = typeof pattern === "string" ? line.includes(pattern) : pattern.test(line);
      if (hit) {
        return typeof respond === "function"
          ? respond({ command, args, options, line })
          : respond;
      }
    }
    return { status: 0, stdout: "", stderr: "" };
  };
}

const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });
const fail = (stderr = "boom", status = 1) => ({ status, stdout: "", stderr });

const SHA = "a".repeat(40);

/**
 * The handlers that make a rehearsal succeed end to end, before a test breaks one.
 *
 * Pass `null` to let the fake packager choose the archive path from the `$GITHUB_OUTPUT` the
 * tool handed it — which is how a test that does not supply `workDir` can still find it.
 */
function healthyHandlers(archiveFile, { archiveOverrides = {} } = {}) {
  const archiveFor = (options) =>
    archiveFile ??
    path.join(path.dirname(options.env.GITHUB_OUTPUT), "dist", "problem-based-srs-v9.9.zip");
  return [
    ["git status --porcelain", ok("")],
    ["git rev-parse --abbrev-ref HEAD", ok("main\n")],
    ["git rev-parse HEAD", ok(`${SHA}\n`)],
    ["git rev-parse --verify origin/main", ok(`${SHA}\n`)],
    ["git ls-remote", ok("")],
    ["python3 --version", ok("Python 3.14.0\n")],
    [
      "build-plugin.py",
      ({ options }) => {
        const zip = archiveFor(options);
        fs.appendFileSync(
          options.env.GITHUB_OUTPUT,
          `artifact=${zip}\nversion=9.9\nnotes<<EOF_BUILD_PLUGIN\n### Added\n- a thing\n### Fixed\n- another\nEOF_BUILD_PLUGIN\n`,
        );
        fs.mkdirSync(path.dirname(zip), { recursive: true });
        fs.writeFileSync(zip, "not really a zip, the fake runner extracts for us");
        return ok("[build] success\n");
      },
    ],
    [
      "zipfile.ZipFile",
      ({ args }) => {
        writeHealthyArchive(args[args.length - 1], archiveOverrides);
        return ok();
      },
    ],
  ];
}

function rehearse(overrides = {}, handlerOverrides = []) {
  const name = overrides.name ?? `run-${Math.random().toString(36).slice(2)}`;
  const root = overrides.root ?? fixtureRoot(name);
  const workDir = path.join(tmp, `work-${name}`);
  fs.mkdirSync(workDir, { recursive: true });
  const archiveFile = path.join(workDir, "problem-based-srs-v9.9.zip");
  return runPreflight({
    tag: PLUGIN_TAG,
    root,
    suites: false,
    workDir,
    run: fakeRun([...handlerOverrides, ...healthyHandlers(archiveFile)]),
    ...overrides.options,
  });
}

const gate = (record, id) => record.checks.find((c) => c.id === id);

/* ------------------------------------------------------------------------ pure pieces */

describe("parseGithubOutput reads the payload create-release.yml consumes", () => {
  it("reads plain key=value lines", () => {
    assert.deepEqual(parseGithubOutput("version=2.6\nartifact=/tmp/a.zip"), {
      version: "2.6",
      artifact: "/tmp/a.zip",
    });
  });

  it("reads the heredoc form build-plugin.py uses for multi-line notes", () => {
    const text = "notes<<EOF\n### Added\n- one\n\n- two\nEOF\nversion=2.6\n";
    assert.deepEqual(parseGithubOutput(text), {
      notes: "### Added\n- one\n\n- two",
      version: "2.6",
    });
  });

  it("survives an unterminated heredoc rather than losing the rest of the file", () => {
    assert.deepEqual(parseGithubOutput("notes<<EOF\nline one\nline two"), {
      notes: "line one\nline two",
    });
  });

  it("ignores blank lines and lines with no assignment", () => {
    assert.deepEqual(parseGithubOutput("\n\nnot-an-assignment\n=leading\nk=v\n"), { k: "v" });
  });

  it("treats a missing file as no outputs at all", () => {
    assert.deepEqual(parseGithubOutput(undefined), {});
  });
});

describe("notesHeadings records the shape of the notes without gating on it", () => {
  it("finds ### and #### headings", () => {
    assert.deepEqual(notesHeadings("### Added\ntext\n#### Folded 2.5\n## Ignored\n"), [
      "### Added",
      "#### Folded 2.5",
    ]);
  });

  it("returns nothing for an empty body", () => {
    assert.deepEqual(notesHeadings(null), []);
  });
});

describe("the small readers", () => {
  it("hashes a file so the record names the bytes", () => {
    const file = path.join(tmp, "hash-me.txt");
    fs.writeFileSync(file, "abc");
    assert.equal(
      sha256(file),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("expands the evals suite because spawn does not glob", () => {
    const files = evalTestFiles(repoRoot);
    assert.ok(files.length > 10, `expected the real suite, got ${files.length} files`);
    assert.ok(files.every((f) => f.endsWith(".test.mjs")));
    assert.ok(files.includes(path.join("evals", "tests", "release-preflight.test.mjs")));
  });

  it("reports no suite rather than throwing when there is none", () => {
    assert.deepEqual(evalTestFiles(path.join(tmp, "no-such-repo")), []);
  });

  it("probes for an interpreter instead of assuming one", () => {
    assert.equal(findPython(fakeRun([["python3 --version", ok()]])), "python3");
    assert.equal(
      findPython(fakeRun([["python3 --version", fail()], ["python --version", ok()]])),
      "python",
    );
    assert.equal(findPython(fakeRun([[/--version/, fail()]])), null);
  });

  it("normalizes a result whose status is not a number, rather than reading it as success", () => {
    // A process killed by a signal reports status null. Treating that as anything but a
    // failure would let a killed packager pass the build gate.
    assert.deepEqual(normalizeResult({ status: null }), { status: 1, stdout: "", stderr: "" });
    assert.deepEqual(normalizeResult({ status: 0, stdout: "hi", stderr: "warn" }), {
      status: 0,
      stdout: "hi",
      stderr: "warn",
    });
    assert.deepEqual(normalizeResult({ error: new Error("ENOENT") }), {
      status: 127,
      stdout: "",
      stderr: "ENOENT",
    });
    assert.equal(normalizeResult({ error: new Error("x"), stdout: "partial" }).stdout, "partial");
  });

  it("runs real commands, and reports a missing executable as a failure not a crash", () => {
    const good = defaultRunner(process.execPath, ["-e", "process.stdout.write('hi')"]);
    assert.equal(good.status, 0);
    assert.equal(good.stdout, "hi");

    const bad = defaultRunner("pbsrs-no-such-executable-xyz", []);
    assert.equal(bad.status, 127);
    assert.ok(bad.stderr.length > 0);

    const withEnv = defaultRunner(
      process.execPath,
      ["-e", "process.stdout.write(process.env.PBSRS_PROBE ?? '')"],
      { cwd: repoRoot, env: { PBSRS_PROBE: "yes" } },
    );
    assert.equal(withEnv.stdout, "yes");
  });

  it("runs a PATH-resolved package-manager shim, which is what the canvas gate does", () => {
    // The canary for the defect this guards. `canvas-suite-is-green` runs `npm test`, and on
    // Windows npm is a `.cmd` shim: `spawnSync("npm", …)` raises ENOENT and naming the
    // resolved `npm.cmd` raises EINVAL, because Node will not CreateProcess a batch file.
    // `normalizeResult` maps both to 127, so the gate reported red for a green suite — on the
    // platform this repository is maintained from. Asserting on `npm --version` rather than on
    // any platform detail keeps the test meaningful everywhere: it fails wherever the runner
    // cannot execute the one kind of command the gate actually needs.
    const npm = defaultRunner("npm", ["--version"]);
    assert.equal(npm.status, 0, `expected npm to run, got ${npm.status}: ${npm.stderr}`);
    assert.match(npm.stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("never hands back a batch shim as a path, and leaves an unresolvable command bare", () => {
    // Two halves of the same rule. A `.cmd`/`.bat` must come back as shell:true, because the
    // path form is unspawnable; and a command that resolves to nothing must come back bare
    // with shell:false, so spawnSync still raises ENOENT. Routing the missing case through a
    // shell would turn it into the shell's "not recognized" exit code, and `findPython`'s
    // ability to tell "no interpreter" from "the packager is broken" depends on that
    // difference surviving.
    const resolved = resolveCommand("npm");
    assert.ok(!/\.(cmd|bat)$/i.test(resolved.command));
    if (resolved.shell) assert.equal(resolved.command, "npm");

    const missing = resolveCommand("pbsrs-no-such-executable-xyz");
    assert.deepEqual(missing, { command: "pbsrs-no-such-executable-xyz", shell: false });

    // An absolute path is never re-resolved, whatever it points at.
    assert.deepEqual(resolveCommand(process.execPath), {
      command: process.execPath,
      shell: false,
    });
  });
});

/* -------------------------------------------------------------- what it refuses to do */

describe("it rehearses the plugin train and refuses the other one", () => {
  it("needs a tag", () => {
    assert.throws(() => runPreflight({}), /no --tag given/);
    assert.throws(() => runPreflight(), /no --tag given/);
  });

  it("refuses a canvas tag, and says why there is nothing to rehearse there", () => {
    const root = fixtureRoot("canvas-tag");
    assert.throws(
      () => runPreflight({ tag: `v${CANVAS_VERSION}`, root, run: fakeRun() }),
      (error) => {
        assert.match(error.message, /classifies as canvas/);
        assert.match(error.message, /dispatch-only/);
        assert.match(error.message, /release-canvas-ordering\.test\.mjs/);
        return true;
      },
    );
  });

  it("refuses a tag no train claims", () => {
    const root = fixtureRoot("orphan-tag");
    assert.throws(
      () => runPreflight({ tag: "v0.0.7", root, run: fakeRun() }),
      /classifies as unknown/,
    );
  });

  it("names the only rehearsable train, so the refusal cannot drift from the reason", () => {
    assert.equal(REHEARSABLE_TRAIN, "plugin");
  });
});

/* ---------------------------------------------------------------------- the happy path */

describe("a clean rehearsal", () => {
  it("passes every gate and records what a maintainer must paste into the issue", () => {
    const record = rehearse({ name: "happy" });

    assert.equal(record.ok, true, formatReport(record));
    assert.equal(record.train, "plugin");
    assert.equal(record.version, "9.9");
    assert.equal(record.observed.sha, SHA);
    assert.equal(record.observed.branch, "main");
    assert.deepEqual(record.observed.notesHeadings, ["### Added", "### Fixed"]);
    assert.ok(record.archive.sha256.length === 64);
    assert.ok(record.archive.bytes > 0);
    assert.equal(record.archive.verification.ok, true);
  });

  it("runs every gate it declares, in the order it declares them", () => {
    const record = rehearse({ name: "order" });
    const ran = record.checks.map((c) => c.id);
    const expected = GATE_IDS.filter(
      (id) => id !== "evals-suite-is-green" && id !== "canvas-suite-is-green",
    );
    assert.deepEqual(ran, expected);
  });

  it("keeps the packaged archive and the extracted tree only when asked", () => {
    const kept = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("kept"),
      suites: false,
      keep: true,
      run: fakeRun(healthyHandlers(null)),
    });
    assert.equal(kept.ok, true, formatReport(kept));
    assert.ok(fs.existsSync(kept.archive.extractedTo));
    fs.rmSync(kept.workDir, { recursive: true, force: true });
  });

  it("cleans up after itself by default, and says so rather than naming a path that is gone", () => {
    const swept = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("swept"),
      suites: false,
      run: fakeRun(healthyHandlers(null)),
    });
    assert.equal(swept.ok, true, formatReport(swept));
    assert.equal(swept.archive.extractedTo, null);
    assert.equal(fs.existsSync(swept.workDir), false);
  });
});

/* ------------------------------------------------------------------------- canaries */

describe("CANARIES — each gate fails on the defect it exists to catch", () => {
  it("working-tree-is-clean rejects uncommitted changes", () => {
    const record = rehearse({ name: "dirty" }, [
      ["git status --porcelain", ok("?? new-file\n M other\n")],
    ]);
    const g = gate(record, "working-tree-is-clean");
    assert.equal(g.ok, false);
    assert.match(g.detail, /2 uncommitted change\(s\)/);
    assert.equal(record.ok, false);
  });

  it("working-tree-is-clean rejects a git that could not answer", () => {
    const record = rehearse({ name: "status-broken" }, [
      ["git status --porcelain", fail("not a git repository")],
    ]);
    assert.match(gate(record, "working-tree-is-clean").detail, /git status failed/);
  });

  it("head-is-the-commit-to-be-tagged rejects a HEAD that is not the release ref", () => {
    const record = rehearse({ name: "behind" }, [
      ["git rev-parse --verify origin/main", ok(`${"b".repeat(40)}\n`)],
    ]);
    const g = gate(record, "head-is-the-commit-to-be-tagged");
    assert.equal(g.ok, false);
    assert.match(g.detail, /HEAD is a{40} but origin\/main is b{40}/);
  });

  it("head-is-the-commit-to-be-tagged rejects an unresolvable ref", () => {
    const record = rehearse({ name: "no-ref" }, [
      ["git rev-parse --verify origin/main", fail("unknown revision")],
    ]);
    assert.match(
      gate(record, "head-is-the-commit-to-be-tagged").detail,
      /origin\/main could not be resolved/,
    );
  });

  it("head-is-the-commit-to-be-tagged rejects a HEAD that cannot be read", () => {
    const record = rehearse({ name: "no-head" }, [["git rev-parse HEAD", fail("no HEAD")]]);
    assert.match(
      gate(record, "head-is-the-commit-to-be-tagged").detail,
      /git rev-parse HEAD failed/,
    );
  });

  it("--against HEAD waives the ref check visibly rather than skipping it", () => {
    const record = rehearse({ name: "waived", options: { against: "HEAD" } }, [
      ["git rev-parse --verify HEAD", ok(`${SHA}\n`)],
    ]);
    const g = gate(record, "head-is-the-commit-to-be-tagged");
    assert.equal(g.ok, true);
    assert.match(g.detail, /waived/, "a waiver that is invisible is a skip");
    assert.equal(record.observed.against, "HEAD");
  });

  it("tag-is-not-already-on-origin rejects a stranded tag, and gives the recovery", () => {
    const record = rehearse({ name: "stranded" }, [
      ["git ls-remote", ok(`${SHA}\trefs/tags/${PLUGIN_TAG}\n`)],
    ]);
    const g = gate(record, "tag-is-not-already-on-origin");
    assert.equal(g.ok, false);
    assert.match(g.detail, /already on origin/);
    assert.match(g.detail, /emits no push event/);
    assert.match(
      g.detail,
      /gh workflow run create-release\.yml --ref v9\.9 -f version=9\.9/,
      "the recovery must be --ref pinned, or it packages a different commit",
    );
  });

  it("tag-is-not-already-on-origin fails when absence could not be established", () => {
    const record = rehearse({ name: "no-remote" }, [
      ["git ls-remote", fail("could not read from remote")],
    ]);
    const g = gate(record, "tag-is-not-already-on-origin");
    assert.equal(g.ok, false);
    assert.match(g.detail, /absence could not be established/);
  });

  it("build-succeeds treats a missing interpreter as a failure, not a skip", () => {
    const record = rehearse({ name: "no-python" }, [[/--version/, fail("not found", 127)]]);
    const g = gate(record, "build-succeeds");
    assert.equal(g.ok, false);
    assert.match(g.detail, /no python3\/python interpreter/);
    assert.match(g.detail, /failure rather than a skip/);
    assert.equal(gate(record, "packaged-archive-loads").ok, false);
  });

  it("build-succeeds rejects a packager that exited non-zero", () => {
    const record = rehearse({ name: "build-red" }, [
      ["build-plugin.py", fail("::error::version mismatch")],
    ]);
    assert.equal(gate(record, "build-succeeds").ok, false);
    assert.match(gate(record, "build-succeeds").detail, /version mismatch/);
  });

  it("build-succeeds quotes stdout when the packager failed without writing to stderr", () => {
    const record = rehearse({ name: "build-red-stdout" }, [
      ["build-plugin.py", { status: 2, stdout: "[error] no CHANGELOG section\n", stderr: "" }],
    ]);
    assert.match(gate(record, "build-succeeds").detail, /no CHANGELOG section/);
  });

  it("reads no outputs at all when the packager removed the output file", () => {
    const record = rehearse({ name: "output-clobbered" }, [
      [
        "build-plugin.py",
        ({ options }) => {
          fs.rmSync(options.env.GITHUB_OUTPUT, { force: true });
          return ok();
        },
      ],
    ]);
    assert.equal(gate(record, "release-notes-are-not-empty").ok, false);
    assert.equal(gate(record, "packaged-archive-loads").ok, false);
    assert.deepEqual(record.observed.notesHeadings, []);
  });

  it("release-notes-are-not-empty rejects a version with no CHANGELOG section", () => {
    const workDir = path.join(tmp, "work-no-notes");
    fs.mkdirSync(workDir, { recursive: true });
    const archiveFile = path.join(workDir, "a.zip");
    const record = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("no-notes"),
      suites: false,
      workDir,
      run: fakeRun([
        ...healthyHandlers(archiveFile).filter(([p]) => p !== "build-plugin.py"),
        [
          "build-plugin.py",
          ({ options }) => {
            fs.appendFileSync(options.env.GITHUB_OUTPUT, `artifact=${archiveFile}\nnotes=\n`);
            fs.writeFileSync(archiveFile, "zip");
            return ok();
          },
        ],
      ]),
    });
    const g = gate(record, "release-notes-are-not-empty");
    assert.equal(g.ok, false);
    assert.match(g.detail, /publishes exactly one CHANGELOG section/);
  });

  it("packaged-archive-loads fails when the build named no artifact", () => {
    const workDir = path.join(tmp, "work-no-artifact");
    fs.mkdirSync(workDir, { recursive: true });
    const record = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("no-artifact"),
      suites: false,
      workDir,
      run: fakeRun([
        ["git rev-parse HEAD", ok(`${SHA}\n`)],
        ["git rev-parse --verify origin/main", ok(`${SHA}\n`)],
        ["python3 --version", ok()],
        [
          "build-plugin.py",
          ({ options }) => {
            fs.appendFileSync(options.env.GITHUB_OUTPUT, "notes<<E\n### Added\nE\n");
            return ok();
          },
        ],
      ]),
    });
    const g = gate(record, "packaged-archive-loads");
    assert.equal(g.ok, false);
    assert.match(g.detail, /produced no artifact/);
  });

  it("packaged-archive-loads fails when the named archive is not there", () => {
    const workDir = path.join(tmp, "work-ghost-artifact");
    fs.mkdirSync(workDir, { recursive: true });
    const record = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("ghost-artifact"),
      suites: false,
      workDir,
      run: fakeRun([
        ["git rev-parse HEAD", ok(`${SHA}\n`)],
        ["git rev-parse --verify origin/main", ok(`${SHA}\n`)],
        ["python3 --version", ok()],
        [
          "build-plugin.py",
          ({ options }) => {
            fs.appendFileSync(
              options.env.GITHUB_OUTPUT,
              "artifact=/nowhere/problem-based-srs-v9.9.zip\nnotes<<E\n### Added\nE\n",
            );
            return ok();
          },
        ],
      ]),
    });
    assert.match(gate(record, "packaged-archive-loads").detail, /which does not exist/);
  });

  it("packaged-archive-loads fails when the archive cannot be extracted", () => {
    const record = rehearse({ name: "bad-zip" }, [
      ["zipfile.ZipFile", fail("BadZipFile: File is not a zip file")],
    ]);
    const g = gate(record, "packaged-archive-loads");
    assert.equal(g.ok, false);
    assert.match(g.detail, /could not be extracted/);
  });

  it("packaged-archive-loads quotes stdout when extraction failed silently on stderr", () => {
    const record = rehearse({ name: "bad-zip-stdout" }, [
      ["zipfile.ZipFile", { status: 1, stdout: "truncated central directory", stderr: "" }],
    ]);
    assert.match(gate(record, "packaged-archive-loads").detail, /truncated central directory/);
  });

  it("packaged-archive-loads catches the defect that shipped in every published zip", () => {
    // The rehearsal's whole reason for opening the archive: `agents/skills/…` resolved to a
    // directory that exists nowhere, in every release, because nothing opened one before the
    // tag. A pre-flight that only checks the packager's exit code passes this tree.
    const workDir = path.join(tmp, "work-escaping-link");
    fs.mkdirSync(workDir, { recursive: true });
    const archiveFile = path.join(workDir, "problem-based-srs-v9.9.zip");
    const record = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("escaping-link"),
      suites: false,
      workDir,
      run: fakeRun([
        ...healthyHandlers(archiveFile).filter(([p]) => p !== "zipfile.ZipFile"),
        [
          "zipfile.ZipFile",
          ({ args }) => {
            writeHealthyArchive(args[args.length - 1], {
              "problem-based-srs/agents/problem-based-srs/AGENT.md":
                "[skill](../skills/problem-based-srs/SKILL.md)\n",
            });
            return ok();
          },
        ],
      ]),
    });
    const g = gate(record, "packaged-archive-loads");
    assert.equal(g.ok, false, "a link escaping the archive root must fail the rehearsal");
    assert.match(g.detail, /relative-links-resolve-inside-the-archive/);
    assert.equal(record.ok, false);
  });

  it("evals-suite-is-green and canvas-suite-is-green report a red suite", () => {
    const workDir = path.join(tmp, "work-red-suites");
    fs.mkdirSync(workDir, { recursive: true });
    const archiveFile = path.join(workDir, "problem-based-srs-v9.9.zip");
    const record = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("red-suites"),
      suites: true,
      workDir,
      run: fakeRun([
        ["node --test", fail("3 failing", 1)],
        ["npm test", fail("2 failing", 1)],
        ...healthyHandlers(archiveFile),
      ]),
    });
    assert.equal(gate(record, "evals-suite-is-green").ok, false);
    assert.equal(gate(record, "canvas-suite-is-green").ok, false);
    assert.equal(record.ok, false);
  });

  it("runs the suites when it is not told to skip them", () => {
    const workDir = path.join(tmp, "work-green-suites");
    fs.mkdirSync(workDir, { recursive: true });
    const archiveFile = path.join(workDir, "problem-based-srs-v9.9.zip");
    const seen = [];
    const handlers = healthyHandlers(archiveFile);
    const record = runPreflight({
      tag: PLUGIN_TAG,
      root: fixtureRoot("green-suites"),
      suites: true,
      workDir,
      run: (command, args, options) => {
        seen.push([command, ...args].join(" "));
        return fakeRun(handlers)(command, args, options);
      },
    });
    assert.equal(gate(record, "evals-suite-is-green").ok, true);
    assert.equal(gate(record, "canvas-suite-is-green").ok, true);
    assert.ok(seen.some((line) => line.startsWith("node --test")));
    assert.ok(seen.some((line) => line.startsWith("npm test")));
    assert.equal(record.ok, true);
  });

  it("says so in the record when the suites were skipped", () => {
    const record = rehearse({ name: "skipped-suites" });
    assert.match(record.observed.suites, /--no-suites/);
  });
});

/* ---------------------------------------------------------------------- the CLI surface */

describe("the CLI surface", () => {
  it("parses every option the runbook uses", () => {
    const opts = parseArgs([
      "--tag", "v2.6",
      "--against", "origin/release",
      "--root", repoRoot,
      "--no-suites",
      "--keep",
      "--json", "out.json",
      "--quiet",
    ]);
    assert.equal(opts.tag, "v2.6");
    assert.equal(opts.against, "origin/release");
    assert.equal(opts.root, repoRoot);
    assert.equal(opts.suites, false);
    assert.equal(opts.keep, true);
    assert.equal(opts.json, "out.json");
    assert.equal(opts.quiet, true);
  });

  it("takes the tag positionally, and defaults the rest", () => {
    const opts = parseArgs(["v2.6"]);
    assert.equal(opts.tag, "v2.6");
    assert.equal(opts.against, "origin/main");
    assert.equal(opts.suites, true);
    assert.equal(opts.root, REPO_ROOT);
  });

  it("asks for help", () => {
    assert.equal(parseArgs(["--help"]).help, true);
    assert.equal(parseArgs(["-h"]).help, true);
  });

  it("refuses unknown options, missing values and stray arguments rather than ignoring them", () => {
    assert.throws(() => parseArgs(["--nope"]), /unknown option --nope/);
    assert.throws(() => parseArgs(["--tag"]), /--tag needs a value/);
    assert.throws(() => parseArgs(["v1", "v2"]), /unexpected argument v2/);
  });

  it("documents every option it accepts", () => {
    for (const flag of ["--tag", "--against", "--root", "--no-suites", "--keep", "--json", "--quiet"]) {
      assert.ok(USAGE.includes(flag), `USAGE does not mention ${flag}`);
    }
  });

  it("renders a transcript that separates gates from recorded values", () => {
    const record = rehearse({ name: "report" });
    const text = formatReport(record);
    assert.match(text, /gates \(derived — these gate the exit code\)/);
    assert.match(text, /observed \(recorded — these gate nothing\)/);
    assert.match(text, /RESULT: every gate passed — v9\.9 is safe to push/);
  });

  it("names the failing gate, so the record explains itself", () => {
    const record = rehearse({ name: "report-red" }, [
      ["git status --porcelain", ok("?? junk\n")],
    ]);
    const text = formatReport(record);
    assert.match(text, /FAIL {2}working-tree-is-clean/);
    assert.match(text, /RESULT: at least one gate failed — do not push v9\.9/);
  });

  it("renders a record whose SHA and note are missing rather than printing undefined", () => {
    const noSha = rehearse({ name: "report-no-sha" }, [["git rev-parse HEAD", fail("no HEAD")]]);
    assert.match(formatReport(noSha), /commit to be tagged: \(unknown\)/);

    const bare = formatReport({
      tag: "v9.9",
      train: "plugin",
      root: "/somewhere",
      observed: {},
      checks: [],
      ok: false,
    });
    assert.match(bare, /commit to be tagged: \(unknown\)/);
    assert.equal(bare.includes("undefined"), false);
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

  it("exits 0 and writes the record when every gate passed", () => {
    const s = streams();
    const jsonFile = path.join(tmp, "cli-record.json");
    const code = cli(
      ["--tag", PLUGIN_TAG, "--root", fixtureRoot("cli-green"), "--no-suites", "--json", jsonFile],
      { ...s.io, run: fakeRun(healthyHandlers(null)) },
    );
    assert.equal(code, 0);
    assert.match(s.err.join(""), /RESULT: every gate passed/);
    const written = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
    assert.equal(written.tag, PLUGIN_TAG);
    assert.equal(written.ok, true);
  });

  it("exits 1 when a gate failed, and can put the record on stdout", () => {
    const s = streams();
    const code = cli(
      ["--tag", PLUGIN_TAG, "--root", fixtureRoot("cli-red"), "--no-suites", "--json", "-", "--quiet"],
      {
        ...s.io,
        run: fakeRun([["git status --porcelain", ok("?? junk\n")], ...healthyHandlers(null)]),
      },
    );
    assert.equal(code, 1);
    assert.equal(s.err.join(""), "", "--quiet must suppress the transcript");
    assert.equal(JSON.parse(s.out.join("")).ok, false);
  });

  it("prints usage and exits 1 when no tag was given, and exits 0 for --help", () => {
    const noTag = streams();
    assert.equal(cli([], noTag.io), 1);
    assert.match(noTag.err.join(""), /Usage: node evals\/tools\/release-preflight\.mjs/);

    const help = streams();
    assert.equal(cli(["--help"], help.io), 0);
    assert.match(help.err.join(""), /--against <ref>/);
  });

  it("reports a bad option as a message and an exit code, not a stack trace", () => {
    const s = streams();
    assert.equal(cli(["--nope"], s.io), 1);
    assert.match(s.err.join(""), /unknown option --nope/);
  });

  it("reports a refusal to rehearse as a message and an exit code", () => {
    const s = streams();
    const code = cli(
      ["--tag", `v${CANVAS_VERSION}`, "--root", fixtureRoot("cli-canvas"), "--no-suites"],
      s.io,
    );
    assert.equal(code, 1);
    assert.match(s.err.join(""), /classifies as canvas/);
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
    assert.match(captured.join(""), /Usage: node evals\/tools\/release-preflight\.mjs/);
  });
});

/* ------------------------------------------------------------------ as a real command */

describe("as a real command", () => {
  // The one line `cli` cannot cover from inside this process is the bootstrap that turns its
  // return value into an exit code — running it in-process would end the test run. So it is
  // covered the only way it can be: by being run.
  const tool = path.join(repoRoot, "evals", "tools", "release-preflight.mjs");
  const invoke = (args) =>
    spawnSync(process.execPath, [tool, ...args], { encoding: "utf8", cwd: repoRoot });

  it("exits 0 for --help", () => {
    const result = invoke(["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stderr, /Usage: node evals\/tools\/release-preflight\.mjs/);
  });

  it("exits 1 with usage when no tag was given", () => {
    const result = invoke([]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  });

  it("exits 1 and explains itself when asked to rehearse the canvas train", () => {
    const result = invoke(["--tag", "v1.1.0", "--no-suites"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /only the plugin train has a step to rehearse/);
  });
});


describe("against this repository", () => {
  it("classifies the manifest's own tag as the plugin train", () => {
    const record = runPreflight({
      tag: "v2.6",
      root: repoRoot,
      suites: false,
      against: "HEAD",
      workDir: fs.mkdtempSync(path.join(tmp, "real-")),
      run: fakeRun([
        ["git status --porcelain", ok("")],
        ["git rev-parse", ok(`${SHA}\n`)],
        ["git ls-remote", ok("")],
        [/--version/, fail("no interpreter here", 127)],
      ]),
    });
    assert.equal(record.train, "plugin");
    assert.equal(gate(record, "tag-belongs-to-the-plugin-train").ok, true);
    assert.match(record.trainReason, /plugin\.json/);
  });
});
