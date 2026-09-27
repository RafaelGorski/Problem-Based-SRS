#!/usr/bin/env node
import { main } from "../evals/tools/closure-evidence.mjs";

// The 28 roots of the current release/closure batch. The gate reads each live issue
// and the live release list; this list selects scope, never substitutes fixture state.
export const ROOT_ISSUES = [
  138, 139, 140, 142, 145, 147, 148, 149, 207, 209, 210, 211, 212, 213,
  214, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 289, 290, 291,
];

export function releaseGate(run = main) {
  return run(ROOT_ISSUES.map(String));
}
