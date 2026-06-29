import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRefs } from "../lib/text-refs.mjs";

test("extracts ungrouped matches (m[0]) and uppercases them", () => {
  const refs = extractRefs("links cn-1 and CN-2", /\bcn-\d+\b/gi);
  assert.deepEqual(refs, ["CN-1", "CN-2"]);
});

test("extracts grouped matches (m[1]) when the pattern has a capture group", () => {
  const refs = extractRefs("see CP-3 or p-4", /\b(CP-\d+|P-\d+)\b/gi);
  assert.deepEqual(refs, ["CP-3", "P-4"]);
});

test("returns an empty array when there are no matches", () => {
  assert.deepEqual(extractRefs("nothing here", /\bFR-\d+\b/gi), []);
});

test("handles null/undefined content without throwing", () => {
  assert.deepEqual(extractRefs(null, /\bCN-\d+\b/gi), []);
  assert.deepEqual(extractRefs(undefined, /\bCN-\d+\b/gi), []);
});
