import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_REPO,
  cli,
  defaultRunner,
  findTitleCollision,
  isDuplicateIssueTitle,
  isInvokedDirectly,
  normalizeIssueTitle,
  parseArgs,
  runIfInvoked,
} from "../tools/subissue-guard.mjs";

const toolPath = fileURLToPath(new URL("../tools/subissue-guard.mjs", import.meta.url));
const parent = {
  number: 142,
  title: "Run one external /live adoption experiment and record outcome",
};
const duplicate = {
  number: 389,
  title: "[sub of #142] Run One External /live Adoption Experiment And The Outcome",
};

function capture() {
  const output = { stdout: "", stderr: "" };
  return {
    output,
    io: {
      stdout: { write: (text) => (output.stdout += text) },
      stderr: { write: (text) => (output.stderr += text) },
    },
  };
}

function issueListRunner(issues, calls = []) {
  return (command, args) => {
    calls.push([command, args]);
    if (args[0] === "api") {
      return { status: 0, stdout: JSON.stringify([issues]), stderr: "" };
    }
    return { status: 0, stdout: "https://github.com/example/repo/issues/999\n", stderr: "" };
  };
}

describe("sub-issue title normalization", () => {
  it("strips generated prefixes and rejects near-identical normalized objectives", () => {
    assert.equal(normalizeIssueTitle(duplicate.title), "run one external live adoption experiment and outcome");
    assert.equal(normalizeIssueTitle(parent.title), "run one external live adoption experiment and record outcome");
    assert.equal(
      isDuplicateIssueTitle(duplicate.title, parent.title),
      true,
      "the #142 -> #389 restatement must be rejected despite a missing synonym",
    );
    assert.equal(isDuplicateIssueTitle("Build an unrelated feature", parent.title), false);
    assert.equal(
      isDuplicateIssueTitle("alpha beta gamma delta epsilon zeta", "alpha beta gamma delta epsilon theta"),
      false,
    );
    assert.equal(
      isDuplicateIssueTitle("alpha beta gamma delta epsilon", "alpha beta gamma delta epsilon zeta"),
      false,
    );
    assert.equal(isDuplicateIssueTitle("", parent.title), false);
    assert.equal(isDuplicateIssueTitle("A B C D", "A B C D"), true);
  });

  it("rejects candidates that normalize to no searchable title", () => {
    assert.throws(() => findTitleCollision("the / --", parent), /title must contain searchable words/);
  });

  it("detects parent and sibling collisions but permits distinct objectives", () => {
    assert.equal(findTitleCollision(duplicate.title, parent).relation, "parent");
    const sibling = { number: 143, title: "[sub of #142] Capture a parsed registry state" };
    const siblingCollision = findTitleCollision("Capture A Parsed Registry State", parent, [sibling]);
    assert.equal(siblingCollision.relation, "sibling");
    assert.equal(siblingCollision.issue.number, 143);
    assert.equal(findTitleCollision("Run the closure mutation matrix", parent, [sibling]), null);
    assert.equal(findTitleCollision("A distinct objective", undefined), null);
  });
});

describe("sub-issue guard arguments", () => {
  it("parses parent, title, body, repo, and create options", () => {
    assert.deepEqual(
      parseArgs([
        "--parent",
        "142",
        "--title",
        "Add independent evidence",
        "--body",
        "Acceptance criteria",
        "--repo",
        "owner/repo",
        "--create",
      ]),
      {
        parent: 142,
        title: "Add independent evidence",
        body: "Acceptance criteria",
        repo: "owner/repo",
        create: true,
        help: false,
      },
    );
    assert.equal(parseArgs(["--parent", "142", "--title", "Valid"]).repo, DEFAULT_REPO);
    assert.equal(parseArgs(["--help"]).help, true);
  });

  it("rejects missing values, invalid parent numbers, unknown options, and missing required options", () => {
    for (const args of [
      ["--parent"],
      ["--parent", "0"],
      ["--parent", "abc"],
      ["--title", "Valid"],
      ["--parent", "142"],
      ["--parent", "142", "--title", "Valid", "--repo", "not-a-repo"],
      ["--parent", "142", "--title", "Valid", "--unknown"],
      ["--parent", "142", "--title"],
      ["--parent", "142", "--title", "--create"],
    ]) {
      assert.throws(() => parseArgs(args));
    }
  });
});

describe("sub-issue guard CLI", () => {
  it("prints help without querying GitHub", () => {
    const { io, output } = capture();
    const status = cli(["--help"], { ...io, run: () => assert.fail("help must not query GitHub") });
    assert.equal(status, 0);
    assert.match(output.stdout, /--create/);
  });

  it("uses process streams when no streams are injected", () => {
    const writes = { stdout: "", stderr: "" };
    const stdoutWrite = process.stdout.write;
    const stderrWrite = process.stderr.write;
    process.stdout.write = (text) => {
      writes.stdout += String(text);
      return true;
    };
    process.stderr.write = (text) => {
      writes.stderr += String(text);
      return true;
    };
    try {
      assert.equal(cli(["--help"]), 0);
      assert.equal(cli(["--invalid"]), 1);
    } finally {
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
    }
    assert.match(writes.stdout, /Usage:/);
    assert.match(writes.stderr, /unknown option/);
  });

  it("uses the default runner when no runner is injected", () => {
    const { io, output } = capture();
    const status = cli(["--parent", "142", "--title", "A distinct objective"], {
      ...io,
      spawn: (_command, args) => ({
        status: 0,
        stdout: args[0] === "api" ? JSON.stringify([[parent]]) : "",
        stderr: "",
      }),
    });
    assert.equal(status, 0);
    assert.match(output.stdout, /No duplicate title found/);
  });

  it("prints argument errors and refuses a non-issue response entry", () => {
    const invalid = capture();
    assert.equal(cli(["--bad"], invalid.io), 1);
    assert.match(invalid.output.stderr, /unknown option/);

    const { io, output } = capture();
    const status = cli(
      ["--parent", "142", "--title", "Capture independent adoption evidence"],
      {
        ...io,
        run: issueListRunner([
          null,
          { number: 500, title: "A pull request", pull_request: { url: "https://example.test" } },
          parent,
          { number: 501, title: "An unrelated issue" },
          { number: 502 },
        ]),
      },
    );
    assert.equal(status, 0);
    assert.match(output.stdout, /No duplicate title found/);
  });

  it("refuses the #142 -> #389 duplicate before any create request", () => {
    const { io, output } = capture();
    const calls = [];
    const status = cli(
      ["--parent", "142", "--title", duplicate.title, "--create"],
      { ...io, run: issueListRunner([parent, duplicate], calls) },
    );
    assert.equal(status, 1);
    assert.match(output.stderr, /duplicates parent #142/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1][0], "api");
  });

  it("reports a safe title without creating an issue unless --create is passed", () => {
    const { io, output } = capture();
    const calls = [];
    const status = cli(
      ["--parent", "142", "--title", "Capture independent adoption evidence"],
      { ...io, run: issueListRunner([parent, duplicate], calls) },
    );
    assert.equal(status, 0);
    assert.match(output.stdout, /No duplicate title found; no issue was created/);
    assert.equal(calls.length, 1);
  });

  it("creates only after the guard passes and records the parent in title and body", () => {
    const { io, output } = capture();
    const calls = [];
    const status = cli(
      [
        "--parent",
        "142",
        "--title",
        "Capture independent adoption evidence",
        "--body",
        "Unique acceptance criteria",
        "--create",
      ],
      { ...io, run: issueListRunner([parent, duplicate], calls) },
    );
    assert.equal(status, 0);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1][1].slice(0, 2), ["issue", "create"]);
    assert.ok(calls[1][1].includes("[sub of #142] Capture independent adoption evidence"));
    assert.ok(calls[1][1].includes("Unique acceptance criteria\n\nParent issue: #142"));
    assert.match(output.stdout, /issues\/999/);
  });

  it("does not preserve a parent prefix that points at a different issue", () => {
    const { io } = capture();
    const calls = [];
    assert.equal(
      cli(
        ["--parent", "142", "--title", "[sub of #999] A new objective", "--create"],
        { ...io, run: issueListRunner([parent], calls) },
      ),
      0,
    );
    assert.ok(calls[1][1].includes("[sub of #142] [sub of #999] A new objective"));
  });

  it("preserves an already-correct prefix when creating", () => {
    const { io } = capture();
    const calls = [];
    assert.equal(
      cli(
        ["--parent", "142", "--title", "[sub of #142] A new objective", "--create"],
        { ...io, run: issueListRunner([parent], calls) },
      ),
      0,
    );
    assert.ok(calls[1][1].includes("[sub of #142] A new objective"));
    assert.ok(!calls[1][1].includes("[sub of #142] [sub of #142]"));
  });

  it("reports unreadable issue lists, malformed responses, and missing parents", () => {
    for (const run of [
      () => ({ status: 1, stdout: "", stderr: "API unavailable" }),
      () => ({ status: 1, stdout: "", stderr: "" }),
      () => ({ status: 0, stdout: "{", stderr: "" }),
      () => ({ status: 0, stdout: JSON.stringify({ issues: [] }), stderr: "" }),
      () => ({ status: 0, stdout: JSON.stringify([[]]), stderr: "" }),
    ]) {
      const { io, output } = capture();
      assert.equal(
        cli(["--parent", "142", "--title", "A new objective"], { ...io, run }),
        1,
      );
      assert.ok(output.stderr.length > 0);
    }
  });

  it("reports a failed GitHub issue creation", () => {
    const { io, output } = capture();
    let createCalls = 0;
    const run = (command, args) => {
      if (args[0] === "api") return { status: 0, stdout: JSON.stringify([[parent]]), stderr: "" };
      createCalls += 1;
      return { status: 1, stdout: "", stderr: "permission denied" };
    };
    assert.equal(
      cli(["--parent", "142", "--title", "A new objective", "--create"], { ...io, run }),
      1,
    );
    assert.equal(createCalls, 1);
    assert.match(output.stderr, /issue creation failed: permission denied/);

    const noStderr = capture();
    assert.equal(
      cli(
        ["--parent", "142", "--title", "A new objective", "--create"],
        {
          ...noStderr.io,
          run: (command, args) => args[0] === "api"
            ? { status: 0, stdout: JSON.stringify([[parent]]), stderr: "" }
            : { status: 1, stdout: "", stderr: "" },
        },
      ),
      1,
    );
    assert.match(noStderr.output.stderr, /issue creation failed: gh failed/);
  });

  it("normalizes process results and identifies direct invocation paths", () => {
    assert.deepEqual(defaultRunner("unused", [], () => ({ error: new Error("missing") })), {
      status: 127,
      stdout: "",
      stderr: "missing",
    });
    assert.deepEqual(defaultRunner("unused", [], () => ({
      status: null,
      stdout: null,
      stderr: null,
    })), { status: 1, stdout: "", stderr: "" });
    assert.deepEqual(defaultRunner("unused", [], () => ({
      status: 0,
      stdout: "ok",
      stderr: "",
    })), { status: 0, stdout: "ok", stderr: "" });
    assert.equal(defaultRunner(process.execPath, ["--version"]).status, 0);
    assert.equal(isInvokedDirectly(toolPath), true);
    assert.equal(isInvokedDirectly(path.join(path.dirname(toolPath), "other.mjs")), false);
    assert.equal(isInvokedDirectly(undefined), false);
    const exitCodes = [];
    assert.equal(runIfInvoked(toolPath, ["--help"], (code) => exitCodes.push(code)), true);
    assert.deepEqual(exitCodes, [0]);
    assert.equal(runIfInvoked(path.join(path.dirname(toolPath), "other.mjs"), [], assert.fail), false);
  });
});
