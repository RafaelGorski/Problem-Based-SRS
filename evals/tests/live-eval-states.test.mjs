import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyResult, formatResultStatus } from "../run-evals.mjs";

describe("live eval result states", () => {
  it("keeps pass, fail, error, and skipped distinct", () => {
    const cases = [
      [{ rubricPassed: true }, ["pass", true]],
      [{ rubricPassed: false }, ["fail", false]],
      [{ runCode: 1, hasResult: false }, ["error", false]],
      [{ gated: true }, ["skipped", false]],
    ];

    for (const [input, [status, passed]] of cases) {
      const result = classifyResult(input);
      assert.equal(result.status, status);
      assert.equal(result.passed, passed);
      assert.equal(formatResultStatus(result), status.toUpperCase());
    }
  });

  it("preserves judge failures as errors rather than skill failures", () => {
    const result = classifyResult({ judgeError: "judge error: unavailable" });
    assert.deepEqual(result, {
      status: "error",
      passed: false,
      error: "judge error: unavailable",
    });
  });

  it("renders explicit error status instead of deriving it from passed", () => {
    assert.equal(formatResultStatus({ status: "error", passed: false }), "ERROR");
  });
});
