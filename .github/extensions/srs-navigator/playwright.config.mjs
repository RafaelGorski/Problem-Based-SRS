import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.CANVAS_PORT) || 56107;
const BASE_URL = process.env.CANVAS_URL || `http://127.0.0.1:${PORT}/`;

export default defineConfig({
  testDir: './tests',
  testMatch: 'visual.test.mjs',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    baseURL: BASE_URL,
  },
  // Start the canvas ourselves so `npm run test:e2e` is self-contained. Without
  // this the suite pointed at a port nothing was listening on and never ran.
  // Set CANVAS_URL to test against an already-running canvas instead.
  webServer: process.env.CANVAS_URL
    ? undefined
    : {
        command: `node scripts/serve-canvas.mjs --port ${PORT}`,
        url: `http://127.0.0.1:${PORT}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
});
