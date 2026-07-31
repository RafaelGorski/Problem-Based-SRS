// End-to-end checks for the published project webpage.
//
// The landing page makes claims that only a browser can settle: that the health
// dashboard is reachable in one click, that the link lands on a real page rather
// than a 404, and that the version a visitor sees matches the release. Reading the
// HTML proves the markup exists; clicking it proves the route works.
//
// Each check also captures a PNG into the git-ignored test-results/ directory, so a
// reviewer can see the surface rather than take the assertion's word for it.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(EXT_ROOT, '..', '..', '..');
const shot = (name) => path.join(EXT_ROOT, 'test-results', name);

const manifest = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'),
);

test.describe('Landing page — the evidence is reachable', () => {
  test('links the skills health dashboard from the navigation', async ({ page }) => {
    await page.goto('/index.html');
    const link = page.locator('nav a[href*="skills-health"]');
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    // An icon-only or empty link is unusable with a screen reader and unfindable
    // by eye; the accessible name is the part that makes it a route.
    await expect(link).toHaveAccessibleName(/health/i);
    await page.screenshot({ path: shot('landing-health-link.png'), fullPage: false });
  });

  test('the navigation link survives a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto('/index.html');
    const link = page.locator('nav a[href*="skills-health"]');
    // The nav wraps rather than collapsing into a menu, so the link must remain
    // on screen — not merely present in the DOM behind a hidden container.
    await expect(link).toBeVisible();
    await page.screenshot({ path: shot('landing-health-link-narrow.png') });
  });

  test('clicking through reaches a real dashboard, not a 404', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('nav a[href*="skills-health"]').first().click();
    await page.waitForURL(/skills-health\.html/);
    await expect(page.locator('h1')).toContainText(/skills health/i);
    // A dashboard with no suites rendered is indistinguishable from a broken build.
    await expect(page.locator('.card').first()).toBeVisible();
    await page.screenshot({ path: shot('skills-health-dashboard.png'), fullPage: true });
  });

  test('the dashboard is also linked from the footer', async ({ page }) => {
    await page.goto('/index.html');
    const link = page.locator('footer a[href*="skills-health"]');
    await expect(link).toHaveCount(1);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
  });

  test('the dashboard links back to the site', async ({ page }) => {
    await page.goto('/skills-health.html');
    const back = page.locator('a[href*="index.html"]').first();
    await expect(back).toBeVisible();
    await back.click();
    await page.waitForURL(/index\.html/);
    await expect(page.locator('nav a[href*="skills-health"]')).toBeVisible();
  });
});

test.describe('Landing page — the release it advertises', () => {
  test('shows the plugin version from the manifest', async ({ page }) => {
    await page.goto('/index.html');
    const badge = page.locator('.version-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(`v${manifest.version}`);
    await badge.screenshot({ path: shot('landing-version-badge.png') });
  });

  test('the dashboard names the same version as the site badge', async ({ page }) => {
    await page.goto('/skills-health.html');
    // The dashboard used to print the canvas extension's VERSION while sitting one
    // click from a badge showing the plugin version — two release trains, presented
    // as one number.
    await expect(page.locator('.sub')).toContainText(`v${manifest.version}`);
  });
});

test.describe('Landing page — how to actually get it', () => {
  test('names the skills.sh listing', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('a[href*="skills.sh"]')).toHaveCount(1);
  });

  test('gives an install path for the canvas extension', async ({ page }) => {
    await page.goto('/index.html');
    const install = page.locator('#start');
    await expect(install).toContainText('.github/extensions/srs-navigator');
    await expect(install).toContainText('/live');
    await install.scrollIntoViewIfNeeded();
    await page.screenshot({ path: shot('landing-install.png') });
  });
});
