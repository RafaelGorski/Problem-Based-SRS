// `evals/tools/verify-plugin-archive.mjs` is the reader for the third artefact family —
// the `problem-based-srs-vX.Y.zip` a plugin release attaches. It is a *tool*, meant to be
// pointed at a downloaded archive during a release, so this suite proves two things a
// release cannot afford to discover late:
//
//   1. it passes the archive this repository actually produces (built here, with the
//      packager, not described);
//   2. it *fails* each of the defects it exists to catch — every gate has a canary.
//
// The canaries are fixture trees. #107's review specifically asked for that rather than a
// "deliberate, reverted addition" to the tracked tree: mutating `main` mid-release adds
// risk to the release without improving the proof that ships.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  MANIFEST,
  findPluginRoot,
  formatReport,
  parseArgs,
  sha256,
  verifyPluginArchive,
} from "../tools/verify-plugin-archive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

let tmp = "";

/* --------------------------------------------------------------------------- fixtures */

const row = (action) => `| \`${action}\` | [\`reference/${action}.md\`](reference/${action}.md) |`;

/** The smallest tree that is a valid plugin archive: manifest, skill, dispatch, links. */
function healthyArchive(overrides = {}) {
  return {
    "problem-based-srs/.claude-plugin/plugin.json": JSON.stringify({
      name: "problem-based-srs",
      version: "9.9.9",
    }),
    "problem-based-srs/skills/problem-based-srs/SKILL.md": [
      "| Action | File |",
      "|---|---|",
      row("problems"),
      row("live"),
    ].join("\n"),
    "problem-based-srs/skills/problem-based-srs/reference/problems.md": "# problems\n",
    "problem-based-srs/skills/problem-based-srs/reference/live.md": "# live\n",
    "problem-based-srs/agents/problem-based-srs/AGENT.md":
      "[skill](../../skills/problem-based-srs/SKILL.md)\n",
    ...overrides,
  };
}

function fixture(name, files) {
  const root = path.join(tmp, name);
  fs.rmSync(root, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

const failed = (record, id) => record.checks.find((c) => c.id === id && !c.ok);
const passed = (record, id) => record.checks.find((c) => c.id === id && c.ok);

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pbsrs-verify-tool-"));
});

after(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/* -------------------------------------------------------------------- locating the root */

describe("findPluginRoot accepts either thing a maintainer will point at", () => {
  it("accepts the plugin root itself", () => {
    const root = fixture("root-direct", healthyArchive());
    assert.equal(
      findPluginRoot(path.join(root, "problem-based-srs")),
      path.join(root, "problem-based-srs"),
    );
  });

  it("accepts the directory the archive was extracted into", () => {
    // `unzip -d /tmp/x` gives /tmp/x/problem-based-srs, because the archive carries its own
    // root. Requiring the caller to know which one is a guess they will get wrong once.
    const root = fixture("root-nested", healthyArchive());
    assert.equal(findPluginRoot(root), path.join(root, "problem-based-srs"));
  });

  it("refuses a directory with no manifest rather than reporting an empty archive", () => {
    const root = fixture("root-none", { "readme.txt": "not a plugin" });
    assert.throws(() => findPluginRoot(root), new RegExp(`no ${MANIFEST.replace(/[.]/g, "\\.")}`));
  });

  it("refuses to guess between two plugin roots", () => {
    const root = fixture("root-two", {
      ...healthyArchive(),
      "other-plugin/.claude-plugin/plugin.json": '{"name":"other-plugin","version":"1.0.0"}',
    });
    assert.throws(() => findPluginRoot(root), /2 plugin roots/);
  });

  it("says so when the path does not exist at all", () => {
    assert.throws(() => findPluginRoot(path.join(tmp, "nope")), /no such directory/);
    assert.throws(() => findPluginRoot(""), /no directory given/);
  });
});

/* ---------------------------------------------------------------- the healthy archive */

describe("a well-formed archive passes every gate", () => {
  let record;

  before(() => {
    record = verifyPluginArchive(fixture("healthy", healthyArchive()));
  });

  it("loads the manifest and identifies the plugin", () => {
    assert.ok(passed(record, "manifest-parses"));
    assert.ok(passed(record, "manifest-identifies-the-plugin"));
    assert.equal(record.manifest.name, "problem-based-srs");
    assert.equal(record.manifest.version, "9.9.9");
    assert.match(record.manifest.sha256, /^[0-9a-f]{64}$/);
  });

  it("resolves the dispatch table against the files in the archive", () => {
    assert.ok(passed(record, "skill-problem-based-srs-dispatch-resolves"));
    assert.deepEqual(record.skills[0].dispatch.actions, ["live", "problems"]);
  });

  it("resolves every relative link inside the archive", () => {
    assert.ok(passed(record, "relative-links-resolve-inside-the-archive"));
    assert.deepEqual(record.links.broken, []);
  });

  it("is ok overall", () => {
    assert.equal(record.ok, true);
  });

  it("records counts without gating on them", () => {
    // The distinction #107 exists to enforce: `observed` is a transcript, `checks` is the
    // contract. If a count ever became a check, a tenth action would fail a correct archive.
    assert.ok(record.observed.files > 0);
    assert.ok(record.observed.actions > 0);
    const countGate = record.checks.find((c) => /\b\d+ (files|actions) exactly\b/.test(c.id));
    assert.equal(countGate, undefined);
    assert.match(record.observed.note, /recorded, not asserted/i);
  });

  it("stays green when an action is added to both sides", () => {
    const grown = healthyArchive();
    grown["problem-based-srs/skills/problem-based-srs/SKILL.md"] += `\n${row("needs")}`;
    grown["problem-based-srs/skills/problem-based-srs/reference/needs.md"] = "# needs\n";
    const after = verifyPluginArchive(fixture("healthy-grown", grown));
    assert.equal(after.ok, true, "a routine addition must not turn a correct archive red");
    assert.equal(after.observed.actions, record.observed.actions + 1);
  });
});

/* --------------------------------------------------------------------------- canaries */

describe("CANARIES — each gate rejects the defect it exists to catch", () => {
  it("rejects a manifest that is not readable JSON", () => {
    const record = verifyPluginArchive(
      fixture("bad-json", {
        ...healthyArchive(),
        "problem-based-srs/.claude-plugin/plugin.json": "{ not json",
      }),
    );
    assert.equal(record.ok, false);
    assert.ok(failed(record, "manifest-parses"));
  });

  it("rejects a manifest missing a name or version", () => {
    const record = verifyPluginArchive(
      fixture("no-version", {
        ...healthyArchive(),
        "problem-based-srs/.claude-plugin/plugin.json": '{"name":"problem-based-srs"}',
      }),
    );
    assert.equal(record.ok, false);
    assert.ok(failed(record, "manifest-identifies-the-plugin"));
  });

  it("rejects an archive whose root does not match the name the manifest declares", () => {
    // The README tells installers to extract into the directory *above* the plugin and then
    // point at `<name>/`. A root that disagrees breaks that instruction silently.
    const record = verifyPluginArchive(
      fixture("wrong-root", {
        "some-other-name/.claude-plugin/plugin.json": JSON.stringify({
          name: "problem-based-srs",
          version: "9.9.9",
        }),
      }),
    );
    assert.equal(record.ok, false);
    assert.ok(failed(record, "archive-root-matches-the-manifest-name"));
  });

  it("rejects an archive that ships no skill at all", () => {
    const record = verifyPluginArchive(
      fixture("no-skills", {
        "problem-based-srs/.claude-plugin/plugin.json": JSON.stringify({
          name: "problem-based-srs",
          version: "9.9.9",
        }),
      }),
    );
    assert.equal(record.ok, false);
    assert.ok(failed(record, "ships-at-least-one-skill"));
  });

  it("rejects a dispatched action whose reference file was not packaged", () => {
    const broken = healthyArchive();
    delete broken["problem-based-srs/skills/problem-based-srs/reference/live.md"];
    const record = verifyPluginArchive(fixture("missing-action", broken));
    assert.equal(record.ok, false);
    assert.match(failed(record, "skill-problem-based-srs-dispatch-resolves").detail, /live/);
  });

  it("rejects the link defect that actually shipped", () => {
    // `../skills/…` from `agents/problem-based-srs/` lands in `agents/skills/`, which exists
    // nowhere. This is the check that replaces `grep -rn 'agents/skills/'` — it catches the
    // shape, not the string, so the next one of these is caught too.
    const record = verifyPluginArchive(
      fixture("dangling-link", {
        ...healthyArchive(),
        "problem-based-srs/agents/problem-based-srs/AGENT.md":
          "[skill](../skills/problem-based-srs/SKILL.md)\n",
      }),
    );
    assert.equal(record.ok, false);
    const check = failed(record, "relative-links-resolve-inside-the-archive");
    assert.match(check.detail, /AGENT\.md/);
    assert.doesNotMatch(
      check.detail,
      /grep/,
      "the check must describe the closure it ran, not the string it used to look for",
    );
  });

  it("rejects an archive carrying development tooling", () => {
    const record = verifyPluginArchive(
      fixture("with-tooling", {
        ...healthyArchive(),
        "problem-based-srs/node_modules/left-pad/index.js": "module.exports = 1;",
      }),
    );
    assert.equal(record.ok, false);
    assert.ok(failed(record, "carries-no-development-tooling"));
  });
});

/* ---------------------------------------------------------- the archive we really ship */

describe("the archive this repository packages passes", () => {
  it("verifies the real packaged zip, or skips if there is no interpreter", (t) => {
    // Layer B of the same split `plugin-archive-install.test.mjs` uses: only the fidelity
    // cross-check needs Python, and only it may skip. Probing for the interpreter separately
    // keeps a broken packager from being reported as a missing interpreter.
    const python = ["python3", "python"].find(
      (exe) => spawnSync(exe, ["--version"], { encoding: "utf8" }).status === 0,
    );
    if (!python) {
      t.skip("no python interpreter available to package the archive");
      return;
    }
    const out = path.join(tmp, "real-zip");
    fs.mkdirSync(out, { recursive: true });
    const res = spawnSync(
      python,
      ["-B", path.join(repoRoot, "scripts/build-plugin.py"), "package", "--out-dir", out],
      { encoding: "utf8", cwd: repoRoot, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } },
    );
    assert.equal(res.status, 0, `packaging failed:\n${res.stdout ?? ""}${res.stderr ?? ""}`);

    const zip = fs.readdirSync(out).find((f) => f.endsWith(".zip"));
    assert.ok(zip, "package() must emit an archive");
    const extracted = path.join(out, "extracted");
    fs.mkdirSync(extracted, { recursive: true });
    const unzip =
      process.platform === "win32"
        ? spawnSync(
            "powershell",
            [
              "-NoProfile",
              "-Command",
              `Expand-Archive -Force -LiteralPath '${path.join(out, zip)}' -DestinationPath '${extracted}'`,
            ],
            { encoding: "utf8" },
          )
        : spawnSync("unzip", ["-q", path.join(out, zip), "-d", extracted], { encoding: "utf8" });
    assert.equal(unzip.status, 0, `could not extract the archive: ${unzip.stderr}`);

    const record = verifyPluginArchive(extracted);
    assert.equal(
      record.ok,
      true,
      `the archive this repository ships fails its own verifier:\n${formatReport(record)}`,
    );
    assert.equal(record.manifest.name, "problem-based-srs");
    assert.ok(record.observed.actions >= 9, "the methodology's dispatch table shrank");
  });
});

/* -------------------------------------------------------------------------- the CLI */

describe("the CLI surface", () => {
  it("parses the options the runbook uses", () => {
    assert.deepEqual(parseArgs(["/tmp/x", "--json", "e.json", "--quiet"]), {
      dir: "/tmp/x",
      json: "e.json",
      quiet: true,
      help: false,
    });
  });

  it("refuses unknown options and stray arguments rather than ignoring them", () => {
    assert.throws(() => parseArgs(["--nope"]), /unknown option/);
    assert.throws(() => parseArgs(["a", "b"]), /unexpected argument/);
  });

  it("renders a transcript that separates gates from recorded values", () => {
    const text = formatReport(verifyPluginArchive(fixture("report", healthyArchive())));
    assert.match(text, /checks \(derived — these gate the exit code\)/);
    assert.match(text, /observed \(recorded — these gate nothing\)/);
    assert.match(text, /RESULT: every gate passed/);
  });

  it("names the failing gate in the transcript, so the record is self-explaining", () => {
    const broken = healthyArchive();
    delete broken["problem-based-srs/skills/problem-based-srs/reference/live.md"];
    const text = formatReport(verifyPluginArchive(fixture("report-bad", broken)));
    assert.match(text, /FAIL {2}skill-problem-based-srs-dispatch-resolves/);
    assert.match(text, /RESULT: at least one gate failed/);
  });

  it("hashes what it read, so the record names the bytes", () => {
    const root = fixture("hash", healthyArchive());
    const file = path.join(root, "problem-based-srs", MANIFEST);
    assert.equal(sha256(file), sha256(file));
    assert.match(sha256(file), /^[0-9a-f]{64}$/);
  });
});
