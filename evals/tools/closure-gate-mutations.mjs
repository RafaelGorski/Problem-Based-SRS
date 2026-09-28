#!/usr/bin/env node
import { buildLedger, ledgerFindingCodes, REPO_ROOT } from "./issue-ledger.mjs";
import { pathToFileURL } from "node:url";

const BASE_ISSUES = new Map([
  [501, [
    "<!-- release-claim train=none -->",
    "- [x] Evidence captured in `evals/tools/issue-ledger.mjs`",
    "- [ ] Blocked on #502 until the coordinator posts the accepted external proof.",
  ].join("\n")],
  [502, "- [x] Supporting proof recorded in `README.md`"],
]);

function fixtureRunner(bodies) {
  return (_command, args) => {
    const number = Number(args[2]);
    if (!bodies.has(number)) {
      return { status: 1, stdout: "", stderr: `issue #${number} not found in fixture` };
    }
    return {
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        number,
        title: `Fixture issue ${number}`,
        url: `https://github.com/example/project/issues/${number}`,
        body: bodies.get(number),
      }),
    };
  };
}

function ledgerResult(bodies) {
  const record = buildLedger(
    {
      root: REPO_ROOT,
      repo: "example/project",
      issues: [501, 502],
      validateCitations: true,
    },
    fixtureRunner(bodies),
  );
  return { ok: record.ok, codes: ledgerFindingCodes(record), record };
}

function withIssue501(body) {
  const bodies = new Map(BASE_ISSUES);
  bodies.set(501, body);
  return bodies;
}

const MUTATIONS = [
  {
    name: "open-box-without-blocker",
    expectedCode: "open-box-without-blocker",
    run: () => ledgerResult(withIssue501([
      "<!-- release-claim train=none -->",
      "- [x] Evidence captured in `evals/tools/issue-ledger.mjs`",
      "- [ ] Waiting for the coordinator post.",
    ].join("\n"))),
  },
  {
    name: "ticked-box-without-citation",
    expectedCode: "ticked-box-without-citation",
    run: () => ledgerResult(withIssue501([
      "<!-- release-claim train=none -->",
      "- [x] Completed",
      "- [ ] Blocked on #502 until the coordinator posts the accepted external proof.",
    ].join("\n"))),
  },
  {
    name: "stale-version-claim",
    expectedCode: "superseded-version-claim",
    run: () => ledgerResult(withIssue501([
      "<!-- release-claim train=none -->",
      "- [x] Release link v2.6 captured in `CHANGELOG.md`",
      "- [ ] Blocked on #502 until the coordinator posts the accepted external proof.",
    ].join("\n"))),
  },
  {
    name: "duplicated-release-claim-marker",
    expectedCode: "duplicate-release-claim-marker",
    run: () => ledgerResult(withIssue501([
      "<!-- release-claim train=none -->",
      "<!-- release-claim train=plugin version=v2.7 -->",
      "- [x] Evidence captured in `evals/tools/issue-ledger.mjs`",
      "- [ ] Blocked on #502 until the coordinator posts the accepted external proof.",
    ].join("\n"))),
  },
  {
    name: "dangling-issue-citation",
    expectedCode: "dangling-issue-citation",
    run: () => ledgerResult(withIssue501([
      "<!-- release-claim train=none -->",
      "- [x] Evidence captured in `evals/tools/issue-ledger.mjs`",
      "- [ ] Blocked on #777 until the coordinator posts the accepted external proof.",
    ].join("\n"))),
  },
];

export function greenFixtureResult() {
  const ledger = ledgerResult(BASE_ISSUES);
  return {
    ok: ledger.ok,
    codes: ledger.codes,
    ledger,
  };
}

export function mutationMatrix() {
  return MUTATIONS.map((mutation) => {
    const result = mutation.run();
    return {
      name: mutation.name,
      expectedCode: mutation.expectedCode,
      exit: result.ok ? 0 : 1,
      codes: result.codes,
      ok: result.ok,
    };
  });
}

export function validateMutationMatrix(results = mutationMatrix()) {
  const failures = [];
  const codes = new Set();
  for (const result of results) {
    if (result.ok) failures.push(`${result.name} passed unexpectedly`);
    if (!result.codes.includes(result.expectedCode)) {
      failures.push(`${result.name} did not report ${result.expectedCode}; got ${result.codes.join(", ") || "(none)"}`);
    }
    for (const code of result.codes) codes.add(code);
  }
  if (codes.size !== results.length) {
    failures.push(`expected ${results.length} distinct finding codes, got ${codes.size}: ${[...codes].join(", ")}`);
  }
  return { ok: failures.length === 0, failures, codes: [...codes].sort() };
}

export function formatMutationMatrixTranscript({ green = greenFixtureResult(), results = mutationMatrix() } = {}) {
  const validation = validateMutationMatrix(results);
  return [
    "# Closure gate mutation matrix",
    "",
    `green fixture exit=${green.ok ? 0 : 1} findings=${green.codes.join(", ") || "none"}`,
    "",
    ...results.flatMap((result) => [
      `mutation=${result.name}`,
      `exit=${result.exit}`,
      `finding=${result.codes.join(", ") || "none"}`,
      "",
    ]),
    `matrix=${validation.ok ? "passed" : "failed"}`,
    ...validation.failures.map((failure) => `failure=${failure}`),
  ].join("\n");
}

export function cli(io = { stdout: process.stdout, stderr: process.stderr }) {
  const green = greenFixtureResult();
  const results = mutationMatrix();
  const validation = validateMutationMatrix(results);
  io.stdout.write(`${formatMutationMatrixTranscript({ green, results })}\n`);
  /* node:coverage ignore next 4 */
  if (!green.ok) {
    io.stderr.write("green fixture failed\n");
    return 1;
  }
  return validation.ok ? 0 : 1;
}

/* node:coverage ignore next 3 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(cli());
}
