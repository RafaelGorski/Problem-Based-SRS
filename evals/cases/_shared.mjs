// Shared helpers for live eval cases.
//
// Each case injects a skill's full SKILL.md into the prompt as the operating
// instructions, then applies it to a fixture. This tests the skill *content*
// directly and hermetically — independent of how/whether the skill is installed
// in the local Copilot CLI.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function fixturePath(name) {
  return path.resolve(HERE, "..", "fixtures", name);
}

export async function readFixture(name) {
  return readFile(fixturePath(name), "utf8");
}

/**
 * Build a hermetic execution prompt: run the given skill against the input and
 * emit ONLY the resulting artifact markdown (no file writes, no preamble).
 * @param {object} args
 * @param {string} args.skillText  full SKILL.md content
 * @param {string} args.input      the fixture / upstream artifact
 * @param {string} args.task       one-line instruction of what to produce
 * @returns {string}
 */
export function buildExecutionPrompt({ skillText, input, task }) {
  return [
    "You are executing a single step of the Problem-Based SRS methodology.",
    "Follow the SKILL instructions below EXACTLY, including its notation and ID formats.",
    "",
    "IMPORTANT output rules:",
    "- Do NOT create, edit, or write any files. Do NOT run tools.",
    "- Reply with ONLY the resulting artifact as markdown, nothing else.",
    `- Task: ${task}`,
    "",
    "===== SKILL START =====",
    skillText,
    "===== SKILL END =====",
    "",
    "===== INPUT START =====",
    input,
    "===== INPUT END =====",
  ].join("\n");
}
