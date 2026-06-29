import { test } from "node:test";
import assert from "node:assert/strict";
import { isTrustedLoopbackRequest } from "../lib/http-guard.mjs";

const PORT = 51234;
const ORIGIN = `http://127.0.0.1:${PORT}`;

test("accepts a same-origin request from the canvas page", () => {
  assert.equal(
    isTrustedLoopbackRequest({ host: `127.0.0.1:${PORT}`, origin: ORIGIN }, PORT),
    true
  );
});

test("accepts a request with a matching referer and no origin", () => {
  assert.equal(
    isTrustedLoopbackRequest({ host: `127.0.0.1:${PORT}`, referer: `${ORIGIN}/` }, PORT),
    true
  );
});

test("accepts a loopback request with no origin/referer (direct fetch)", () => {
  assert.equal(isTrustedLoopbackRequest({ host: `127.0.0.1:${PORT}` }, PORT), true);
});

test("rejects a cross-origin request (CSRF)", () => {
  assert.equal(
    isTrustedLoopbackRequest({ host: `127.0.0.1:${PORT}`, origin: "http://evil.example" }, PORT),
    false
  );
});

test("rejects a DNS-rebinding request (non-loopback Host header)", () => {
  assert.equal(
    isTrustedLoopbackRequest({ host: `attacker.example:${PORT}`, origin: ORIGIN }, PORT),
    false
  );
});

test("rejects a request with a cross-origin referer", () => {
  assert.equal(
    isTrustedLoopbackRequest({ host: `127.0.0.1:${PORT}`, referer: "http://evil.example/x" }, PORT),
    false
  );
});

test("rejects a request with a missing Host header", () => {
  assert.equal(isTrustedLoopbackRequest({ origin: ORIGIN }, PORT), false);
});
