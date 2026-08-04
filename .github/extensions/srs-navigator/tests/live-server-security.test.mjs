import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const serverScript = path.join(
  repoRoot,
  '.agents',
  'skills',
  'impeccable',
  'scripts',
  'live-server.mjs',
);

let child;
let cwd;
let port;
let token;

before(async () => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pbsrs-live-server-security-'));
  port = 48500 + Math.floor(Math.random() * 500);
  child = spawn(process.execPath, [serverScript, `--port=${port}`], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`server did not start: ${output}`)), 10_000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/Token: ([0-9a-f-]+)/);
      if (match) {
        clearTimeout(timeout);
        token = match[1];
        resolve();
      }
    });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`server exited with ${code}: ${output}`)));
  });
});

after(async () => {
  if (child && !child.killed) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
  if (cwd) fs.rmSync(cwd, { recursive: true, force: true });
});

async function request(pathname, headers = {}, method = 'GET') {
  return fetch(`http://127.0.0.1:${port}${pathname}`, { headers, method });
}

describe('live-server browser boundary', () => {
  it('rejects cross-origin CORS requests before they can read the token', async () => {
    const response = await request('/live.js', { Origin: 'https://attacker.example' });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.doesNotMatch(await response.text(), new RegExp(token));
  });

  it('rejects cross-site script loads even when the browser omits Origin', async () => {
    const response = await request('/live.js', { 'Sec-Fetch-Site': 'cross-site' });
    assert.equal(response.status, 403);
    assert.doesNotMatch(await response.text(), new RegExp(token));
  });

  it('allows the injected script from a local browser page', async () => {
    const response = await request('/live.js', {
      Referer: 'http://localhost:3000/',
      'Sec-Fetch-Site': 'same-site',
    });
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(`__IMPECCABLE_TOKEN__ = '${token}'`));
  });

  it('allows CORS from loopback development origins only', async () => {
    const response = await request('/health', { Origin: 'http://127.0.0.1:3000' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');
  });
});
