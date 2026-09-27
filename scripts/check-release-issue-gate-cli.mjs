#!/usr/bin/env node
import { releaseGate } from "./check-release-issue-gate.mjs";

try {
  process.exitCode = releaseGate();
} catch (error) {
  console.error(`release-issue-gate: ${error.message}`);
  process.exitCode = 1;
}
