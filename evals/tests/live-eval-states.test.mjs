import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyResult, classifyStatus, formatResultStatus, runCase } from "../run-evals.mjs";

const healthyRun = { code: 0, result: { usage: {} }, text: "artifact", durationMs: 1 };

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

  it("supports the dependency-injected status seam", () => {
    const cases = [
      [{ run: healthyRun, passed: true }, "pass"],
      [{ run: healthyRun, passed: false }, "fail"],
      [{ run: { code: 1, result: null }, passed: false }, "error"],
      [{ skipped: true }, "skipped"],
    ];
    cases.forEach(([input, expected]) => assert.equal(classifyStatus(input), expected));
    assert.equal(classifyStatus({ run: healthyRun, passed: false, judgeError: true }), "error");
  });

  it("uses the explicit state in a dependency-injected case run", async () => {
    const c = {
      name: "fixture",
      skill: "fixture",
      rubric: [],
      buildPrompt: async () => "prompt",
    };
    const result = await runCase(c, { model: undefined, timeoutMs: 10, judge: false, verbose: 0 }, ".", {
      loadActionImpl: async () => ({ text: "skill" }),
      runCopilotImpl: async () => healthyRun,
      gradeRubricImpl: () => ({ passed: false, ratio: 0, score: 0, maxScore: 0, results: [] }),
    });
    assert.equal(result.status, "fail");
    assert.equal(result.passed, false);
  });
});
