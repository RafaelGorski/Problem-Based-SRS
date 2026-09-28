import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  formatMutationMatrixTranscript,
  greenFixtureResult,
  cli,
  mutationMatrix,
  validateMutationMatrix,
} from "../tools/closure-gate-mutations.mjs";

describe("closure gate mutation matrix (#297)", () => {
  it("keeps the unmutated fixture green", () => {
    const green = greenFixtureResult();
    assert.equal(green.ok, true);
    assert.deepEqual(green.codes, []);
  });

  it("fails every mutation with its own named finding code", () => {
    const results = mutationMatrix();
    const validation = validateMutationMatrix(results);
    assert.equal(validation.ok, true, validation.failures.join("\n"));
    assert.deepEqual(results.map((result) => result.name), [
      "open-box-without-blocker",
      "ticked-box-without-citation",
      "stale-version-claim",
      "duplicated-release-claim-marker",
      "dangling-issue-citation",
    ]);
    assert.deepEqual(results.map((result) => result.expectedCode), [
      "open-box-without-blocker",
      "ticked-box-without-citation",
      "superseded-version-claim",
      "duplicate-release-claim-marker",
      "dangling-issue-citation",
    ]);
    assert.deepEqual(results.map((result) => result.exit), [1, 1, 1, 1, 1]);
  });

  it("prints a reproducible transcript with an exit code and finding per mutation", () => {
    const transcript = formatMutationMatrixTranscript();
    for (const mutation of mutationMatrix()) {
      assert.match(transcript, new RegExp(`mutation=${mutation.name}[\\s\\S]*?exit=1[\\s\\S]*?finding=${mutation.expectedCode}`));
    }
    assert.match(transcript, /green fixture exit=0 findings=none/);
    assert.match(transcript, /matrix=passed/);
  });

  it("reports matrix validation failures with actionable detail", () => {
    const validation = validateMutationMatrix([
      { name: "bad-mutation", expectedCode: "expected-code", ok: true, codes: [] },
    ]);
    assert.equal(validation.ok, false);
    assert.match(validation.failures.join("\n"), /passed unexpectedly/);
    assert.match(validation.failures.join("\n"), /did not report expected-code/);
    assert.match(validation.failures.join("\n"), /expected 1 distinct finding codes/);

    const transcript = formatMutationMatrixTranscript({
      green: { ok: false, codes: ["green-failure"] },
      results: [{ name: "bad-mutation", expectedCode: "expected-code", ok: true, exit: 0, codes: [] }],
    });
    assert.match(transcript, /green fixture exit=1 findings=green-failure/);
    assert.match(transcript, /matrix=failed/);
    assert.match(transcript, /failure=bad-mutation passed unexpectedly/);
  });

  it("exposes a CLI that prints the same transcript", () => {
    let stdout = "";
    let stderr = "";
    const exit = cli({
      stdout: { write: (chunk) => { stdout += chunk; } },
      stderr: { write: (chunk) => { stderr += chunk; } },
    });
    assert.equal(exit, 0);
    assert.equal(stderr, "");
    assert.match(stdout, /mutation=open-box-without-blocker/);
    assert.match(stdout, /matrix=passed/);
  });
});
