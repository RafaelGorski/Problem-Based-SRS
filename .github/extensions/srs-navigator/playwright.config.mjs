import { defineConfig } from '@playwright/test';

const CANVAS_PORT = Number(process.env.CANVAS_PORT) || 56107;
const SITE_PORT = Number(process.env.SITE_PORT) || 56108;
const BASE_URL = process.env.CANVAS_URL || `http://127.0.0.1:${CANVAS_PORT}/`;
const SITE_URL = process.env.SITE_URL || `http://127.0.0.1:${SITE_PORT}/`;

// Start both servers ourselves so `npm run test:e2e` is self-contained. Without
// this the suite pointed at a port nothing was listening on and never ran. The
// site server exists so landing-page claims (and their PNG evidence) are checked
// the same way the canvas is, with no manual setup.
// Set CANVAS_URL / SITE_URL to test against already-running servers instead.
const servers = [];
if (!process.env.CANVAS_URL) {
  servers.push({
    command: `node scripts/serve-canvas.mjs --port ${CANVAS_PORT}`,
    url: `http://127.0.0.1:${CANVAS_PORT}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  });
}
if (!process.env.SITE_URL) {
  servers.push({
    command: `node scripts/serve-site.mjs --port ${SITE_PORT}`,
    url: `http://127.0.0.1:${SITE_PORT}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  });
}

export default defineConfig({
  testDir: './tests',
  testMatch: ['visual.test.mjs', 'site.test.mjs', 'demo.test.mjs'],
  timeout: 30000,
  // Screenshot evidence for the /live graph and the landing page lands here.
  // `test-results/` is git-ignored, so captures are never committed.
  outputDir: './test-results',
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    baseURL: BASE_URL,
  },
  projects: [
    { name: 'canvas', testMatch: 'visual.test.mjs', use: { baseURL: BASE_URL } },
    { name: 'site', testMatch: /(site|demo)\.test\.mjs/, use: { baseURL: SITE_URL } },
  ],
  webServer: servers.length ? servers : undefined,
});
