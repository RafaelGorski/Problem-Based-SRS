import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'visual.test.mjs',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
});
