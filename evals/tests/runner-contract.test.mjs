import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../run-evals.mjs";

describe("live eval runner contract", () => {
  it("accepts positional case filters", () => {
    const opts = parseArgs(["--force", "brownfield", "--no-judge"]);
    assert.deepEqual(opts.filters, ["brownfield"]);
    assert.equal(opts.force, true);
    assert.equal(opts.judge, false);
  });

  it("rejects unknown options instead of broadening the run", () => {
    assert.throws(() => parseArgs(["--force", "--case", "brownfield"]), /unknown option: --case/);
    assert.throws(() => parseArgs(["--force", "--nope"]), /unknown option: --nope/);
  });

  it("rejects incomplete numeric options", () => {
    assert.throws(() => parseArgs(["--timeout"]), /--timeout requires a positive number/);
    assert.throws(() => parseArgs(["--timeout", "0"]), /--timeout requires a positive number/);
    assert.throws(() => parseArgs(["--model"]), /--model requires a value/);
  });
});
