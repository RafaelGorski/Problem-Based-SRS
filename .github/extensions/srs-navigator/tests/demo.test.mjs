// The `/live` demo on the landing page, exercised in a real browser.
//
// `evals/tests/live-demo-asset.test.mjs` proves the markup and the bytes are right.
// It cannot prove the two behaviours that matter to a reader: that the recording
// actually decodes and plays, and that it stays still for someone who asked their
// operating system for no motion. Those need a browser, so they live here.
//
// The reduced-motion case is the one worth having. Its regression is silent — the
// page looks perfect to whoever is testing it — and it lands on exactly the readers
// least able to tolerate it.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, '..');
const shot = (name) => path.join(EXT_ROOT, 'test-results', name);

const DEMO = '#app video';
const TOGGLE = '#app [data-demo-toggle]';

/**
 * Scroll the figure into view the way a reader arriving at the section would.
 *
 * `motion` is applied with `page.emulateMedia` rather than `test.use({ reducedMotion })`
 * on purpose: the preference has to be in place *before* the page's script parses,
 * because `site.js` reads it once at load. Setting it here also keeps the emulation
 * visible at the point it matters instead of relying on runner option resolution.
 */
async function reachTheFigure(page, motion = 'no-preference') {
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto('/index.html');
  // If the emulation ever silently stopped applying, every reduced-motion assertion
  // below would pass for the wrong reason. Fail loudly instead.
  const applied = await page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  expect(applied, `prefers-reduced-motion emulation did not apply for "${motion}"`)
    .toBe(motion === 'reduce');
  await page.locator(DEMO).scrollIntoViewIfNeeded();
}

const isPaused = (page) => page.locator(DEMO).evaluate((v) => v.paused);
const currentTime = (page) => page.locator(DEMO).evaluate((v) => v.currentTime);

test.describe('the /live demo — default motion preference', () => {
  test('plays without the reader having to ask', async ({ page }) => {
    await reachTheFigure(page);
    await expect
      .poll(() => currentTime(page), { timeout: 15000, message: 'the demo never advanced' })
      .toBeGreaterThan(0);
    expect(await isPaused(page)).toBe(false);
  });

  test('the recording decodes — it is a real video, not a broken reference', async ({ page }) => {
    await reachTheFigure(page);
    await expect
      .poll(() => page.locator(DEMO).evaluate((v) => v.videoWidth), { timeout: 15000 })
      .toBeGreaterThan(0);
    const dims = await page.locator(DEMO).evaluate((v) => ({ w: v.videoWidth, h: v.videoHeight }));
    expect(dims.h).toBeGreaterThan(0);
    await page.locator('#app figure').screenshot({ path: shot('landing-live-demo.png') });
  });

  test('the loop is short enough to watch in one sitting', async ({ page }) => {
    await reachTheFigure(page);
    await expect
      .poll(() => page.locator(DEMO).evaluate((v) => v.duration), { timeout: 15000 })
      .toBeGreaterThan(0);
    const duration = await page.locator(DEMO).evaluate((v) => v.duration);
    expect(duration).toBeLessThanOrEqual(10);
  });

  test('the control pauses it', async ({ page }) => {
    await reachTheFigure(page);
    await expect.poll(() => isPaused(page), { timeout: 15000 }).toBe(false);
    await page.locator(TOGGLE).click();
    await expect.poll(() => isPaused(page)).toBe(true);
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('the /live demo — prefers-reduced-motion: reduce', () => {

  test('does not move until it is asked to', async ({ page }) => {
    await reachTheFigure(page, 'reduce');
    // Long enough that an autoplay would have started well before the assertion.
    await page.waitForTimeout(2500);
    expect(await isPaused(page)).toBe(true);
    expect(await currentTime(page)).toBe(0);
    await page.locator('#app figure').screenshot({ path: shot('landing-live-demo-reduced.png') });
  });

  test('shows the poster instead of a blank frame', async ({ page }) => {
    await reachTheFigure(page, 'reduce');
    const poster = await page.locator(DEMO).getAttribute('poster');
    expect(poster).toBeTruthy();
    const res = await page.request.get(new URL(poster, page.url()).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image');
  });

  test('the control is visible, not revealed by hover', async ({ page }) => {
    await reachTheFigure(page, 'reduce');
    // A control that only appears on hover is unreachable by touch and easy to miss;
    // with nothing moving, it is the only cue that the figure is playable at all.
    await expect(page.locator(TOGGLE)).toBeVisible();
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');
  });

  test('the control still starts the demo on request', async ({ page }) => {
    await reachTheFigure(page, 'reduce');
    await page.locator(TOGGLE).click();
    await expect.poll(() => currentTime(page), { timeout: 15000 }).toBeGreaterThan(0);
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('the /live demo — fallbacks', () => {
  test('carries an <img> with an accessible name for browsers without WebM', async ({ page }) => {
    await page.goto('/index.html');
    const alt = await page.locator(`${DEMO} img`).getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt.length).toBeGreaterThan(40);
    expect(alt).toMatch(/problem/i);
  });

  test('the WebM is served with a video content type', async ({ page }) => {
    await page.goto('/index.html');
    const src = await page.locator(`${DEMO} source`).getAttribute('src');
    const res = await page.request.get(new URL(src, page.url()).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('video/webm');
  });
});
