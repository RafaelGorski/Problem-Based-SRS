import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyTag,
  defaultGit,
  invokeCliIfDirect,
  monitorFindingIds,
  parseArgs,
  parseRemoteTags,
  planRecovery,
  rehearse,
  runCli,
} from "../tools/recovery-rehearsal.mjs";

const toolPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../tools/recovery-rehearsal.mjs",
);

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "rehearsal-test-"));
}

function sink() {
  const chunks = [];
  return { write: (chunk) => chunks.push(chunk), text: () => chunks.join("") };
}

// In-memory origin: `broken` makes the orphan deletion a silent no-op so the
// rehearsal's own assertions are shown to catch a recovery that did not happen.
function fakeGit({ broken = false, failOn = null } = {}) {
  const tags = new Set();
  return (args) => {
    if (failOn && args.includes(failOn)) return { status: 128, stdout: "", stderr: `fatal: ${failOn}\n` };
    if (args[0] === "ls-remote") {
      return { status: 0, stdout: [...tags].map((t) => `abc\trefs/tags/${t}`).join("\n"), stderr: "" };
    }
    if (args[0] === "push" && args.includes("--delete")) {
      if (!broken) tags.delete(args.at(-1));
    } else if (args[0] === "push") {
      tags.add(args.at(-1));
    }
    return { status: 0, stdout: "", stderr: "" };
  };
}

describe("canvas strand-recovery rehearsal", () => {
  it("classifies tags and allows deleting only an orphan", () => {
    const input = { remoteTags: ["v1.1.5", "v1.1.6"], releasedTags: ["v1.1.5"] };
    assert.equal(classifyTag({ ...input, tag: "v1.1.5" }), "published");
    assert.equal(classifyTag({ ...input, tag: "v1.1.6" }), "orphan");
    assert.equal(classifyTag({ tag: "v9.9.9" }), "absent");
    assert.equal(planRecovery({ ...input, tag: "v1.1.5" }).action, "refuse");
    assert.equal(planRecovery({ ...input, tag: "v1.1.6" }).action, "delete-tag");
    assert.equal(planRecovery({ ...input, tag: "v9.9.9" }).action, "none");
  });

  it("parses ls-remote output and ignores peeled refs and blank lines", () => {
    assert.deepEqual(
      parseRemoteTags("a\trefs/tags/v1.1.5\nb\trefs/tags/v1.1.5^{}\n\nc\trefs/tags/v1.1.6\r\n"),
      ["v1.1.5", "v1.1.6"],
    );
  });

  it("reports release-tag-without-release only while the orphan tag is on origin", () => {
    const stranded = monitorFindingIds({
      canvasVersion: "1.1.6", remoteTags: ["v1.1.5", "v1.1.6"], releasedTags: ["v1.1.5"],
    });
    assert.ok(stranded.includes("release-tag-without-release"));
    const recovered = monitorFindingIds({
      canvasVersion: "1.1.6", remoteTags: ["v1.1.5"], releasedTags: ["v1.1.5"],
    });
    assert.ok(!recovered.includes("release-tag-without-release"));
  });

  it("rehearses the full recovery against a real throwaway git origin", () => {
    const root = tempRoot();
    try {
      const result = rehearse({ currentVersion: "1.1.5", tmpRoot: root });
      assert.equal(result.ok, true);
      assert.deepEqual(result.before.originTags, ["v1.1.5"]);
      assert.equal(result.stranded.tag, "v1.1.6");
      assert.equal(result.stranded.bumpWouldPublish, "1.1.7");
      assert.equal(result.plans.published.action, "refuse");
      assert.deepEqual(result.after.originTags, ["v1.1.5"]);
      assert.equal(result.after.bumpWouldPublish, "1.1.6");
      assert.ok(result.steps.every((step) => step.exitCode === 0));
      assert.ok(result.steps.every((step) => !step.command.includes(root)));
      assert.ok(result.steps.some((step) => step.command.includes("--delete v1.1.6")));
      assert.ok(!result.steps.some((step) => step.command.includes("--delete v1.1.5")));
      assert.deepEqual(fs.readdirSync(root), [], "sandbox is removed");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails its own assertions when the orphan deletion silently does nothing", () => {
    const result = rehearse({ currentVersion: "2.0.0", releasedTags: ["v2.0.0"], git: fakeGit({ broken: true }) });
    assert.equal(result.ok, false);
    assert.equal(result.assertions.orphanTagDeleted, false);
    assert.equal(result.assertions.versionPublishableAgain, false);
    assert.equal(result.assertions.monitorClearsAfterRecovery, false);
    assert.equal(result.assertions.publishedTagRefused, true);
  });

  it("stops on the first failing git command and still removes the sandbox", () => {
    const root = tempRoot();
    try {
      assert.throws(
        () => rehearse({ currentVersion: "1.1.5", git: fakeGit({ failOn: "--delete" }), tmpRoot: root }),
        /--delete v1\.1\.6 exited 128: fatal: --delete/,
      );
      assert.deepEqual(fs.readdirSync(root), []);
      assert.throws(() => rehearse(), /Cannot parse semver/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a git process that could not start as a failure", () => {
    const result = defaultGit(["status"], path.join(tempRoot(), "missing"));
    assert.equal(result.status, null);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  });
});

describe("recovery rehearsal CLI", () => {
  it("parses options and rejects unknown or valueless flags", () => {
    assert.deepEqual(parseArgs([]), { version: null, released: null, json: null });
    assert.deepEqual(parseArgs(["--version", "1.2.3", "--released", "v1.2.3", "--json", "o.json"]),
      { version: "1.2.3", released: "v1.2.3", json: "o.json" });
    assert.throws(() => parseArgs(["--bogus"]), /unknown argument: --bogus/);
    assert.throws(() => parseArgs(["--json"]), /--json needs a value/);
    assert.throws(() => parseArgs(["--version", "--json"]), /--version needs a value/);
  });

  it("writes the transcript and returns 0 for a clean rehearsal", () => {
    const root = tempRoot();
    try {
      const out = sink();
      const json = path.join(root, "rehearsal.json");
      const code = runCli(["--version", "3.0.0", "--released", "v3.0.0, ,v2.9.9", "--json", json],
        { stdout: out, stderr: sink(), git: fakeGit() });
      assert.equal(code, 0);
      assert.equal(JSON.parse(fs.readFileSync(json, "utf8")).stranded.tag, "v3.0.1");
      assert.equal(JSON.parse(out.text()).before.releasedTags.length, 2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reads VERSION from the root, returns 1 on failed assertions and 2 on errors", () => {
    const root = tempRoot();
    try {
      fs.writeFileSync(path.join(root, "VERSION"), "4.1.0\n");
      const out = sink();
      assert.equal(runCli([], { root, stdout: out, stderr: sink(), git: fakeGit({ broken: true }) }), 1);
      assert.equal(JSON.parse(out.text()).before.version, "4.1.0");

      const repoOut = sink();
      assert.equal(runCli([], { stdout: repoOut, stderr: sink(), git: fakeGit() }), 0);
      assert.equal(JSON.parse(repoOut.text()).before.version,
        fs.readFileSync(path.resolve(toolPath, "../../../VERSION"), "utf8").trim());

      const err = sink();
      assert.equal(runCli(["--bogus"], { stdout: sink(), stderr: err }), 2);
      assert.match(err.text(), /unknown argument/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses process streams by default", () => {
    const original = { out: process.stdout.write, err: process.stderr.write };
    const out = sink();
    const err = sink();
    process.stdout.write = out.write;
    process.stderr.write = err.write;
    try {
      assert.equal(runCli(["--version", "1.0.0"], { git: fakeGit() }), 0);
      assert.equal(runCli(["--nope"]), 2);
    } finally {
      process.stdout.write = original.out;
      process.stderr.write = original.err;
    }
    assert.equal(JSON.parse(out.text()).ok, true);
    assert.match(err.text(), /unknown argument: --nope/);
  });

  it("runs only when invoked as this module", () => {
    assert.equal(invokeCliIfDirect(undefined), false);
    assert.equal(invokeCliIfDirect(path.join(os.tmpdir(), "other.mjs")), false);
    const err = sink();
    const previous = process.exitCode;
    try {
      assert.equal(invokeCliIfDirect(toolPath, ["--nope"], { stdout: sink(), stderr: err }), true);
      assert.equal(process.exitCode, 2);
    } finally {
      process.exitCode = previous;
    }
    assert.match(err.text(), /unknown argument/);
  });
});
