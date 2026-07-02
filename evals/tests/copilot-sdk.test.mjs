// Unit tests for the Copilot SDK wrapper. These are fully deterministic: they
// feed captured/synthetic JSONL through the parsers and drive runCopilot with a
// fake spawn implementation. No real `copilot` process is started.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  parseJsonl,
  extractAssistantText,
  extractLoadedSkills,
  extractToolCalls,
  extractResult,
  buildCopilotArgs,
  isCopilotAvailable,
  runCopilot,
} from "../lib/copilot-sdk.mjs";

// A representative slice of real `copilot --output-format json` output.
const SAMPLE_JSONL = [
  '{"type":"session.skills_loaded","data":{"skills":[{"name":"customer-problems","description":"Identify CP","enabled":true}]}}',
  'not json — should be ignored',
  '{"type":"user.message","data":{"content":"hello"}}',
  '{"type":"assistant.message_delta","data":{"messageId":"m1","deltaContent":"PO"}}',
  '{"type":"assistant.message_delta","data":{"messageId":"m1","deltaContent":"NG"}}',
  '{"type":"assistant.message","data":{"messageId":"m1","content":"PONG","toolRequests":[{"name":"view"}]}}',
  '{"type":"result","exitCode":0,"usage":{"premiumRequests":15}}',
].join("\n");

describe("parseJsonl", () => {
  it("parses only valid JSON object lines and skips noise", () => {
    const events = parseJsonl(SAMPLE_JSONL);
    assert.equal(events.length, 6);
    assert.equal(events[0].type, "session.skills_loaded");
  });
  it("handles empty / null input", () => {
    assert.deepEqual(parseJsonl(""), []);
    assert.deepEqual(parseJsonl(null), []);
  });
});

describe("extractAssistantText", () => {
  it("prefers the final assistant.message content", () => {
    assert.equal(extractAssistantText(parseJsonl(SAMPLE_JSONL)), "PONG");
  });
  it("falls back to concatenated deltas when no final message", () => {
    const events = parseJsonl([
      '{"type":"assistant.message_delta","data":{"deltaContent":"Hel"}}',
      '{"type":"assistant.message_delta","data":{"deltaContent":"lo"}}',
    ].join("\n"));
    assert.equal(extractAssistantText(events), "Hello");
  });
  it("returns empty string when there is nothing", () => {
    assert.equal(extractAssistantText([]), "");
  });
});

describe("extractLoadedSkills / toolCalls / result", () => {
  const events = parseJsonl(SAMPLE_JSONL);
  it("extracts loaded skills", () => {
    const skills = extractLoadedSkills(events);
    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, "customer-problems");
  });
  it("extracts tool calls from assistant messages", () => {
    assert.deepEqual(extractToolCalls(events), [{ name: "view" }]);
  });
  it("extracts the terminal result event", () => {
    assert.equal(extractResult(events).exitCode, 0);
    assert.equal(extractResult(events).usage.premiumRequests, 15);
  });
  it("last session.skills_loaded wins", () => {
    const staged = parseJsonl([
      '{"type":"session.skills_loaded","data":{"skills":[]}}',
      '{"type":"session.skills_loaded","data":{"skills":[{"name":"a"},{"name":"b"}]}}',
    ].join("\n"));
    assert.equal(extractLoadedSkills(staged).length, 2);
  });
});

describe("buildCopilotArgs", () => {
  it("builds headless json args with allow-all-tools", () => {
    const args = buildCopilotArgs("do it");
    assert.deepEqual(args, ["-p", "do it", "--allow-all-tools", "--no-color", "--output-format", "json"]);
  });
  it("adds model and extra args", () => {
    const args = buildCopilotArgs("x", { model: "gpt-5.4", outputFormat: "text", extraArgs: ["--enable-memory"] });
    assert.ok(args.includes("--model") && args.includes("gpt-5.4"));
    assert.ok(args.includes("text"));
    assert.ok(args.includes("--enable-memory"));
  });
});

describe("isCopilotAvailable", () => {
  it("true when exec succeeds", () => {
    assert.equal(isCopilotAvailable({ execFileImpl: () => Buffer.from("1.0.0") }), true);
  });
  it("false when exec throws", () => {
    assert.equal(isCopilotAvailable({ execFileImpl: () => { throw new Error("ENOENT"); } }), false);
  });
});

// A fake child process that emits scripted stdout then closes.
function makeFakeSpawn(stdoutChunks, { code = 0, emitError = null } = {}) {
  return () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    setImmediate(() => {
      if (emitError) {
        child.emit("error", emitError);
        return;
      }
      for (const chunk of stdoutChunks) child.stdout.emit("data", Buffer.from(chunk));
      child.emit("close", code);
    });
    return child;
  };
}

describe("runCopilot (with fake spawn)", () => {
  it("resolves structured result from JSONL stdout", async () => {
    const res = await runCopilot("ping", { spawnImpl: makeFakeSpawn([SAMPLE_JSONL]) });
    assert.equal(res.code, 0);
    assert.equal(res.text, "PONG");
    assert.equal(res.skills[0].name, "customer-problems");
    assert.equal(res.result.exitCode, 0);
    assert.ok(res.durationMs >= 0);
  });

  it("supports text output mode (stdout passthrough)", async () => {
    const res = await runCopilot("ping", {
      outputFormat: "text",
      spawnImpl: makeFakeSpawn(["just some text\n"]),
    });
    assert.equal(res.text, "just some text");
    assert.deepEqual(res.events, []);
  });

  it("rejects on spawn error", async () => {
    await assert.rejects(
      runCopilot("x", { spawnImpl: makeFakeSpawn([], { emitError: new Error("spawn failed") }) }),
      /spawn failed/,
    );
  });

  it("rejects on timeout", async () => {
    const neverCloses = () => {
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => {};
      return child; // never emits close
    };
    await assert.rejects(
      runCopilot("x", { spawnImpl: neverCloses, timeoutMs: 20 }),
      /timed out/,
    );
  });
});
