import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  invokeCliIfDirect,
  isInvokedDirectly,
  parseArgs,
  parseUtcTimestamp,
  runCli,
  validateContract,
} from "../tools/adoption-experiment.mjs";

const toolPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../tools/adoption-experiment.mjs",
);
const now = new Date("2030-05-01T00:00:00.000Z");
const complete = {
  targetChannel: "requirements-engineering-forum",
  intendedAudience: "external requirements engineers",
  publicPostUrl: "",
  publicationAt: "",
  beforeState: "CRM specification before /live",
  afterState: "same specification rendered by /live",
  releasedEvidence: "canvas v1.2.0 archive sha256:abc with provenance.json",
  contractCreatedAt: "2030-04-30T12:00:00Z",
  observationStart: "2030-05-05T00:00:00Z",
  observationEnd: "2030-05-12T00:00:00.000Z",
  signal: "An external opt-in confirmation with a redacted released-version transcript",
  measurementSource: "https://example.test/replies",
  positiveThreshold: 1,
  exclusions: ["maintainer", "bot", "collaborator", "test", "repository automation"],
  nonQualifyingSignals: ["impressions", "clicks", "stars", "repository-owner activity"],
  readingAtStart: "",
  readingAtEnd: "",
  result: "",
};

const outcome = {
  ...complete,
  publicPostUrl: "https://example.test/post/42",
  publicationAt: "2030-05-02T00:00:00Z",
  readingAtStart: 0,
  readingAtEnd: 1,
  result: "positive",
};

describe("external adoption experiment contract", () => {
  it("accepts a pre-registered plan before publication without claiming an outcome", () => {
    const result = validateContract(complete, { now });
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.status, "ready_for_publication");
    assert.equal(result.externalResult, "not_recorded");

    const dateStringClock = validateContract(complete, { now: "2030-05-01T00:00:00Z" });
    assert.equal(dateStringClock.ok, true);
  });

  it("rejects missing and placeholder fields, malformed UTC dates, and reversed windows", () => {
    const result = validateContract({
      ...complete,
      targetChannel: "<one named channel>",
      intendedAudience: " ",
      contractCreatedAt: "2030-04-30T12:00:00-03:00",
      observationStart: "2030-02-30T00:00:00Z",
      observationEnd: "2030-05-04T00:00:00Z",
    }, { now });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /targetChannel cannot be a placeholder/);
    assert.match(result.errors.join("\n"), /intendedAudience is required/);
    assert.match(result.errors.join("\n"), /contractCreatedAt must be a valid UTC timestamp/);
    assert.match(result.errors.join("\n"), /observationStart must be a valid UTC timestamp/);

    const reversed = validateContract({
      ...complete,
      observationEnd: "2030-05-04T00:00:00Z",
    }, { now });
    assert.ok(reversed.errors.includes("observationEnd must be after observationStart"));
  });

  it("accepts fractional UTC precision and rejects non-string or impossible timestamps", () => {
    assert.equal(parseUtcTimestamp("2030-05-05T00:00:00Z").toISOString(),
      "2030-05-05T00:00:00.000Z");
    assert.equal(parseUtcTimestamp("2030-05-05T24:00:00Z"), null);
    assert.equal(parseUtcTimestamp("2030-05-05T00:00:00.123Z").toISOString(),
      "2030-05-05T00:00:00.123Z");
    assert.equal(parseUtcTimestamp("2030-02-30T00:00:00Z"), null);
    assert.equal(parseUtcTimestamp("2030-13-01T00:00:00Z"), null);
    assert.equal(parseUtcTimestamp("2030-05-05T00:00:00.12Z"), null);
    assert.equal(parseUtcTimestamp("2030-05-05T00:00:00.1234Z"), null);
    assert.equal(parseUtcTimestamp(123), null);

    const fractional = validateContract({
      ...complete,
      contractCreatedAt: "2030-04-30T12:00:00.120Z",
      observationStart: "2030-05-05T00:00:00.100Z",
    }, { now });
    assert.equal(fractional.ok, true);

    const invalid = validateContract({
      ...complete,
      contractCreatedAt: 123,
      observationStart: "2030-05-05T00:00:00.1234Z",
      observationEnd: "2030-02-30T00:00:00Z",
    }, { now });
    assert.ok(invalid.errors.includes("contractCreatedAt must be a valid UTC timestamp ending in Z"));
    assert.ok(invalid.errors.includes("observationStart must be a valid UTC timestamp ending in Z"));
    assert.ok(invalid.errors.includes("observationEnd must be a valid UTC timestamp ending in Z"));
  });

  it("rejects non-string fields, an incorrect threshold, and incomplete exclusion lists", () => {
    const result = validateContract({
      ...complete,
      beforeState: 7,
      signal: ["two signals"],
      positiveThreshold: 2,
      exclusions: ["maintainer"],
      nonQualifyingSignals: ["impressions"],
    }, { now });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /beforeState must be a string/);
    assert.match(result.errors.join("\n"), /signal must be one predeclared string/);
    assert.match(result.errors.join("\n"), /positiveThreshold must be 1/);
    assert.match(result.errors.join("\n"), /exclusions must include/);
    assert.match(result.errors.join("\n"), /nonQualifyingSignals must include/);
  });

  it("requires each named exclusion and non-qualifying signal", () => {
    for (const field of ["exclusions", "nonQualifyingSignals"]) {
      const result = validateContract({ ...complete, [field]: [] }, { now });
      assert.ok(result.errors.some((error) => error === `${field} is required`));

      const wrongType = validateContract({ ...complete, [field]: "not a list" }, { now });
      assert.ok(wrongType.errors.some((error) => error.startsWith(`${field} must include`)));
    }

    const nonStringEntries = validateContract({
      ...complete,
      exclusions: [null, 1, "maintainer"],
      nonQualifyingSignals: [false, "impressions"],
    }, { now });
    assert.ok(nonStringEntries.errors.some((error) => error.startsWith("exclusions must include")));
    assert.ok(nonStringEntries.errors.some((error) => error.startsWith("nonQualifyingSignals must include")));
  });

  it("requires registration before the observation window and rejects late preregistration", () => {
    const futureRegistration = validateContract({
      ...complete,
      contractCreatedAt: "2030-05-02T00:00:00Z",
    }, { now });
    assert.ok(futureRegistration.errors.includes("contractCreatedAt cannot be in the future"));

    const lateRegistration = validateContract({
      ...complete,
      contractCreatedAt: "2030-05-06T00:00:00Z",
    }, { now });
    assert.ok(lateRegistration.errors.includes("contractCreatedAt must precede observationStart"));

    const lateWindow = validateContract({
      ...complete,
      observationStart: "2030-04-30T00:00:00Z",
      observationEnd: "2030-05-12T00:00:00Z",
    }, { now });
    assert.ok(lateWindow.errors.includes(
      "observationStart must be in the future when the contract is registered",
    ));

    const earlyPublication = validateContract({
      ...outcome,
      publicationAt: "2030-04-29T00:00:00Z",
    }, { phase: "outcome", now: new Date("2030-05-13T00:00:00Z") });
    assert.ok(earlyPublication.errors.includes("publicationAt must follow contractCreatedAt"));

    const latePublication = validateContract({
      ...outcome,
      publicationAt: "2030-05-06T00:00:00Z",
    }, { phase: "outcome", now: new Date("2030-05-13T00:00:00Z") });
    assert.ok(latePublication.errors.includes("publicationAt must precede observationStart"));
  });

  it("keeps the post URL, readings, and result unset before publication", () => {
    const result = validateContract({
      ...complete,
      publicPostUrl: "https://example.test/post/42",
      publicationAt: "2030-05-02T00:00:00Z",
      readingAtStart: 0,
      readingAtEnd: 1,
      result: "positive",
    }, { now });
    assert.ok(result.errors.includes("publicPostUrl must remain unset until publication"));
    assert.ok(result.errors.includes("publicationAt must remain unset until publication"));
    assert.ok(result.errors.includes("readings and result must remain unset before publication"));

    const unknownResult = validateContract({ ...complete, result: "unknown" }, { now });
    assert.ok(unknownResult.errors.includes("readings and result must remain unset before publication"));
  });

  it("accepts a positive outcome only after the window elapses and the threshold is met", () => {
    const result = validateContract(outcome, {
      phase: "outcome",
      now: new Date("2030-05-13T00:00:00Z"),
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, "outcome_recorded");
    assert.equal(result.externalResult, "positive");
  });

  it("accepts a zero or explicitly inconclusive outcome", () => {
    const zero = validateContract({ ...outcome, readingAtEnd: 0, result: "zero" }, {
      phase: "outcome",
      now: new Date("2030-05-13T00:00:00Z"),
    });
    assert.equal(zero.ok, true);
    assert.equal(zero.externalResult, "zero");

    const inconclusive = validateContract({ ...outcome, result: "inconclusive" }, {
      phase: "outcome",
      now: new Date("2030-05-13T00:00:00Z"),
    });
    assert.equal(inconclusive.ok, true);
    assert.equal(inconclusive.externalResult, "inconclusive");

    const http = validateContract({
      ...outcome,
      publicPostUrl: "http://example.test/post/42",
    }, { phase: "outcome", now: new Date("2030-05-13T00:00:00Z") });
    assert.equal(http.ok, true);
  });

  it("rejects invalid outcome URLs, readings, results, and unelapsed windows", () => {
    const result = validateContract({
      ...outcome,
      publicPostUrl: "file:///private/post",
      publicationAt: "2030-05-02T00:00:00-03:00",
      readingAtStart: -1,
      readingAtEnd: "one",
      result: "blocked",
    }, { phase: "outcome", now });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /publicPostUrl must use http or https/);
    assert.match(result.errors.join("\n"), /publicationAt must be a valid UTC timestamp/);
    assert.match(result.errors.join("\n"), /readingAtStart must be a non-negative integer/);
    assert.match(result.errors.join("\n"), /readingAtEnd must be a non-negative integer/);
    assert.match(result.errors.join("\n"), /result must be positive, zero, or inconclusive/);
    assert.match(result.errors.join("\n"), /observationEnd must have elapsed/);
    assert.equal(result.externalResult, "not_recorded");

    const missingUrl = validateContract({ ...outcome, publicPostUrl: "" }, {
      phase: "outcome",
      now: new Date("2030-05-13T00:00:00Z"),
    });
    assert.ok(missingUrl.errors.includes("publicPostUrl is required for the outcome"));

    const malformedUrl = validateContract({ ...outcome, publicPostUrl: "not a URL" }, {
      phase: "outcome",
      now: new Date("2030-05-13T00:00:00Z"),
    });
    assert.ok(malformedUrl.errors.includes("publicPostUrl must be a valid URL"));

    const missingPublicationTime = validateContract({
      ...outcome,
      publicationAt: "",
    }, { phase: "outcome", now: new Date("2030-05-13T00:00:00Z") });
    assert.ok(missingPublicationTime.errors.includes(
      "publicationAt must be a valid UTC timestamp ending in Z",
    ));
  });

  it("rejects decreasing readings and a result that contradicts the threshold", () => {
    const decreasing = validateContract({
      ...outcome,
      readingAtStart: 2,
      readingAtEnd: 1,
    }, { phase: "outcome", now: new Date("2030-05-13T00:00:00Z") });
    assert.ok(decreasing.errors.includes("readingAtEnd cannot be less than readingAtStart"));
    assert.ok(decreasing.errors.includes("positive result does not meet positiveThreshold"));
    assert.equal(decreasing.externalResult, "not_recorded");

    const falseZero = validateContract({
      ...outcome,
      result: "zero",
    }, { phase: "outcome", now: new Date("2030-05-13T00:00:00Z") });
    assert.ok(falseZero.errors.includes("zero result meets positiveThreshold"));
  });

  it("rejects an unknown phase and non-object contracts", () => {
    const invalidPhase = validateContract(complete, { phase: "draft", now });
    assert.ok(invalidPhase.errors.includes("phase must be prepublication or outcome"));

    assert.ok(validateContract(null, { now }).errors.includes("contract must be a JSON object"));
    assert.ok(validateContract([], { now }).errors.includes("contract must be a JSON object"));
    assert.ok(validateContract("not-an-object", { now }).errors.includes(
      "contract must be a JSON object",
    ));
    assert.ok(validateContract(false, { now }).errors.includes("contract must be a JSON object"));
    assert.equal(validateContract().status, "incomplete");

    const invalidClock = validateContract(complete, { now: "not-a-date" });
    assert.ok(invalidClock.errors.includes("now must be a valid date"));
  });
});

describe("adoption experiment CLI arguments", () => {
  it("defaults to prepublication and accepts an outcome phase with JSON output", () => {
    assert.deepEqual(parseArgs(["contract.json"]), {
      file: "contract.json",
      json: null,
      phase: "prepublication",
    });
    assert.deepEqual(parseArgs([
      "contract.json", "--phase", "outcome", "--json", "result.json",
    ]), {
      file: "contract.json",
      json: "result.json",
      phase: "outcome",
    });
  });

  it("rejects missing option values, unknown phases, options, and extra contract files", () => {
    assert.throws(() => parseArgs(["contract.json", "--json"]), /--json needs/);
    assert.throws(() => parseArgs(["contract.json", "--json", "--phase"]), /--json needs/);
    assert.throws(() => parseArgs(["contract.json", "--phase"]), /--phase must/);
    assert.throws(() => parseArgs(["contract.json", "--phase", "publish"]), /--phase must/);
    assert.throws(() => parseArgs(["contract.json", "--unknown"]), /unknown option/);
    assert.throws(() => parseArgs(["first.json", "second.json"]), /expected one contract file/);
  });

  it("runs directly only when the entry path is this module", () => {
    assert.equal(isInvokedDirectly(toolPath), true);
    assert.equal(isInvokedDirectly(null), false);
    assert.equal(isInvokedDirectly(path.join(os.tmpdir(), "another-tool.mjs")), false);
    assert.equal(isInvokedDirectly(), false);
    assert.equal(invokeCliIfDirect(path.join(os.tmpdir(), "another-tool.mjs")), false);
  });

  it("reads a contract, writes requested JSON, and returns the validation status", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adoption-cli-"));
    try {
      const input = path.join(dir, "contract.json");
      const output = path.join(dir, "result.json");
      fs.writeFileSync(input, JSON.stringify(complete));
      let stdout = "";
      let stderr = "";
      const status = runCli([input, "--json", output], {
        now,
        stdout: { write: (text) => (stdout += text) },
        stderr: { write: (text) => (stderr += text) },
      });
      assert.equal(status, 0);
      assert.equal(stderr, "");
      assert.equal(JSON.parse(stdout).status, "ready_for_publication");
      assert.equal(fs.readFileSync(output, "utf8"), stdout);
      assert.equal(runCli([input], {
        now,
        stdout: { write: () => {} },
        stderr: { write: () => {} },
      }), 0);

      let exitCode;
      assert.equal(invokeCliIfDirect(toolPath, [input], {
        now,
        stdout: { write: () => {} },
        stderr: { write: () => {} },
      }, (code) => { exitCode = code; }), true);
      assert.equal(exitCode, 0);

      const previousExitCode = process.exitCode;
      try {
        assert.equal(invokeCliIfDirect(toolPath, [input], {
          now,
          stdout: { write: () => {} },
          stderr: { write: () => {} },
        }), true);
        assert.equal(process.exitCode, 0);
      } finally {
        process.exitCode = previousExitCode;
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports incomplete input, bad arguments, unreadable files, and missing file usage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adoption-cli-errors-"));
    const input = path.join(dir, "bad.json");
    fs.writeFileSync(input, JSON.stringify({}));
    try {
      let stdout = "";
      let stderr = "";
      const invalidStatus = runCli([input], {
        now,
        stdout: { write: (text) => (stdout += text) },
        stderr: { write: (text) => (stderr += text) },
      });
      assert.equal(invalidStatus, 1);
      assert.equal(JSON.parse(stdout).status, "incomplete");
      assert.equal(stderr, "");

      stderr = "";
      assert.equal(runCli(["--unknown"], { stderr: { write: (text) => (stderr += text) } }), 2);
      assert.match(stderr, /unknown option/);

      stderr = "";
      assert.equal(runCli([], { stderr: { write: (text) => (stderr += text) } }), 2);
      assert.match(stderr, /Usage:/);

      stderr = "";
      assert.equal(runCli([path.join(dir, "missing.json")], {
        stderr: { write: (text) => (stderr += text) },
      }), 2);
      assert.match(stderr, /ENOENT/);

      const malformed = path.join(dir, "malformed.json");
      fs.writeFileSync(malformed, "{");
      stderr = "";
      assert.equal(runCli([malformed], { stderr: { write: (text) => (stderr += text) } }), 2);
      assert.match(stderr, /JSON/);

      stderr = "";
      assert.equal(runCli([input, "--json", dir], {
        stderr: { write: (text) => (stderr += text) },
      }), 2);
      assert.match(stderr, /EISDIR|illegal operation/i);

      stderr = "";
      assert.equal(runCli([input], {
        stdout: { write: () => { throw new Error("output stream closed"); } },
        stderr: { write: (text) => (stderr += text) },
      }), 2);
      assert.match(stderr, /output stream closed/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("uses process streams when no IO overrides are supplied", () => {
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;
    let stdout = "";
    let stderr = "";
    process.stdout.write = (text) => {
      stdout += text;
      return true;
    };
    process.stderr.write = (text) => {
      stderr += text;
      return true;
    };
    try {
      assert.equal(runCli([]), 2);
      assert.match(stderr, /Usage:/);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adoption-cli-default-"));
      try {
        const input = path.join(dir, "contract.json");
        fs.writeFileSync(input, JSON.stringify(complete));
        assert.equal(runCli([input], { now }), 0);
        assert.equal(JSON.parse(stdout).status, "ready_for_publication");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } finally {
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    }
  });
});
