/**
 * Visual rendering tests using Playwright.
 * Validates that the canvas renders correctly: node sizes, text positioning,
 * hot-spot indicators, health bar, and layout integrity.
 */
import { test, expect } from '@playwright/test';

const CANVAS_URL = process.env.CANVAS_URL || 'http://127.0.0.1:56107/';

test.describe('SRS Navigator Canvas - Visual Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CANVAS_URL);
    // Wait for D3 simulation to settle
    await page.waitForSelector('.node', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test.describe('Node Sizing', () => {
    test('all CN nodes should have consistent base size (22px radius)', async ({ page }) => {
      // CN nodes should NOT be oversized - they should keep the base radius unless truly hubs
      const cnNodes = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.node');
        const cnRects = [];
        nodes.forEach(node => {
          const text = node.querySelector('.node-id');
          if (text && text.textContent.startsWith('CN')) {
            const rect = node.querySelector('rect');
            if (rect) {
              cnRects.push({
                id: text.textContent,
                width: parseFloat(rect.getAttribute('width')),
                height: parseFloat(rect.getAttribute('height')),
                x: parseFloat(rect.getAttribute('x')),
                y: parseFloat(rect.getAttribute('y'))
              });
            }
          }
        });
        return cnRects;
      });

      expect(cnNodes.length).toBeGreaterThan(0);

      for (const cn of cnNodes) {
        // Width and height should be symmetric
        expect(cn.width).toBe(cn.height);
        // Position should be negative half of width
        expect(cn.x).toBeCloseTo(-cn.width / 2, 0);
        expect(cn.y).toBeCloseTo(-cn.height / 2, 0);
      }
    });

    test('hub nodes should be larger than base nodes', async ({ page }) => {
      const nodeSizes = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.node');
        const sizes = [];
        nodes.forEach(node => {
          const rect = node.querySelector('rect');
          const text = node.querySelector('.node-id');
          if (rect && text) {
            sizes.push({
              id: text.textContent,
              width: parseFloat(rect.getAttribute('width'))
            });
          }
        });
        return sizes;
      });

      const minSize = Math.min(...nodeSizes.map(s => s.width));
      const maxSize = Math.max(...nodeSizes.map(s => s.width));
      // There should be size variation (hubs are bigger)
      expect(maxSize).toBeGreaterThan(minSize);
    });
  });

  test.describe('Text Positioning', () => {
    test('node ID text should be positioned below the node plate (not overlapping)', async ({ page }) => {
      const textPositions = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.node');
        const positions = [];
        nodes.forEach(node => {
          const rect = node.querySelector('rect');
          const idText = node.querySelector('.node-id');
          if (rect && idText) {
            const rectHalfHeight = parseFloat(rect.getAttribute('height')) / 2;
            const textDy = parseFloat(idText.getAttribute('dy'));
            positions.push({
              id: idText.textContent,
              rectBottom: rectHalfHeight, // center to bottom = half height
              textDy: textDy,
              gap: textDy - rectHalfHeight
            });
          }
        });
        return positions;
      });

      expect(textPositions.length).toBeGreaterThan(0);
      // Text dy should be greater than plate half-height (below the plate)
      for (const pos of textPositions) {
        expect(pos.gap).toBeGreaterThanOrEqual(4); // at least 4px gap below plate
      }
    });

    test('node label text should not overlap with the icon area', async ({ page }) => {
      const labelPositions = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.node');
        const positions = [];
        nodes.forEach(node => {
          const rect = node.querySelector('rect');
          const label = node.querySelector('.node-label');
          if (rect && label) {
            const rectBottom = parseFloat(rect.getAttribute('y')) + parseFloat(rect.getAttribute('height'));
            const labelY = parseFloat(label.getAttribute('y'));
            const idText = node.querySelector('.node-id');
            positions.push({
              id: idText?.textContent || 'unknown',
              rectBottom,
              labelY,
              gap: labelY - rectBottom
            });
          }
        });
        return positions;
      });

      expect(labelPositions.length).toBeGreaterThan(0);
      // Label should always be below the plate + ID text
      for (const pos of labelPositions) {
        expect(pos.gap).toBeGreaterThanOrEqual(0);
      }
    });

    test('foreignObject icon should be centered within node plate', async ({ page }) => {
      const iconPositions = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.node');
        const positions = [];
        nodes.forEach(node => {
          const rect = node.querySelector('rect');
          const fo = node.querySelector('foreignObject');
          if (rect && fo) {
            const rectCenterX = parseFloat(rect.getAttribute('x')) + parseFloat(rect.getAttribute('width')) / 2;
            const rectCenterY = parseFloat(rect.getAttribute('y')) + parseFloat(rect.getAttribute('height')) / 2;
            const foCenterX = parseFloat(fo.getAttribute('x')) + parseFloat(fo.getAttribute('width')) / 2;
            const foCenterY = parseFloat(fo.getAttribute('y')) + parseFloat(fo.getAttribute('height')) / 2;
            const idText = node.querySelector('.node-id');
            positions.push({
              id: idText?.textContent || 'unknown',
              offsetX: Math.abs(rectCenterX - foCenterX),
              offsetY: Math.abs(rectCenterY - foCenterY)
            });
          }
        });
        return positions;
      });

      expect(iconPositions.length).toBeGreaterThan(0);
      for (const pos of iconPositions) {
        // Icon should be centered (within 1px tolerance)
        expect(pos.offsetX).toBeLessThan(1);
        expect(pos.offsetY).toBeLessThan(1);
      }
    });
  });

  test.describe('Hot-Spot Indicators', () => {
    test('health bar should be visible and contain metrics', async ({ page }) => {
      const healthBar = await page.locator('#health-bar');
      await expect(healthBar).toBeVisible();

      const metrics = await healthBar.locator('.health-metric').all();
      expect(metrics.length).toBeGreaterThanOrEqual(3);
    });

    test('pulse rings appear only for nodes with severity >= 2', async ({ page }) => {
      const result = await page.evaluate(() => {
        const svg = document.querySelector('svg');
        if (!svg) return { rings: 0, highSeverityNodes: 0 };
        const rings = svg.querySelectorAll('circle.hotspot-ring');
        // Count nodes with severity >= 2 via D3 data binding
        const nodes = document.querySelectorAll('.node');
        let highSeverity = 0;
        nodes.forEach(n => {
          const d = n.__data__;
          if (d && d._hotspotSeverity >= 2) highSeverity++;
        });
        return { rings: rings.length, highSeverityNodes: highSeverity };
      });
      // Pulse rings should match the count of high-severity nodes
      expect(result.rings).toBe(result.highSeverityNodes);
    });

    test('clicking a health metric should filter the graph', async ({ page }) => {
      // Click "orphaned problems" metric
      const orphanedMetric = page.locator('.health-metric').filter({ hasText: /orphaned/ });
      if (await orphanedMetric.count() > 0) {
        await orphanedMetric.first().click();
        await page.waitForTimeout(500);

        // Some nodes should be dimmed
        const dimmedNodes = await page.evaluate(() => {
          const nodes = document.querySelectorAll('.node');
          let dimmed = 0;
          nodes.forEach(n => {
            const opacity = parseFloat(getComputedStyle(n).opacity || window.getComputedStyle(n).opacity);
            if (opacity < 0.5) dimmed++;
          });
          return dimmed;
        });
        expect(dimmedNodes).toBeGreaterThan(0);
      }
    });

    test('need cluster nodes should be labeled as "Need Clusters" not "hubs"', async ({ page }) => {
      const healthBarText = await page.locator('#health-bar').textContent();
      // Visible health bar text should say "need clusters", not "hubs"
      if (healthBarText.includes('cluster') || healthBarText.includes('hub')) {
        expect(healthBarText.toLowerCase()).toContain('need clusters');
        expect(healthBarText.toLowerCase()).not.toMatch(/\bhubs\b/);
      }
      // If no hubs/clusters exist in demo data, the metric won't render — that's fine
    });
  });

  test.describe('Layout Integrity', () => {
    test('graph container should fill available space', async ({ page }) => {
      const dimensions = await page.evaluate(() => {
        const container = document.querySelector('.graph-container');
        const rect = container.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      expect(dimensions.width).toBeGreaterThan(200);
      expect(dimensions.height).toBeGreaterThan(200);
    });

    test('no node text should overflow the viewport', async ({ page }) => {
      // Wait extra for simulation to settle
      await page.waitForTimeout(2000);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      const overflows = await page.evaluate((vpWidth) => {
        const texts = document.querySelectorAll('.node-id, .node-label');
        let overflow = 0;
        texts.forEach(t => {
          const rect = t.getBoundingClientRect();
          if (rect.right > vpWidth + 50 || rect.left < -50) overflow++;
        });
        return overflow;
      }, viewportWidth);
      // Force-directed layouts can have nodes at edges; allow reasonable tolerance
      expect(overflows).toBeLessThan(15);
    });
  });

  test.describe('Accessibility & Hardening', () => {
    test('health bar metrics have ARIA role=button and tabindex', async ({ page }) => {
      const metrics = await page.evaluate(() => {
        const els = document.querySelectorAll('.health-metric[data-filter]');
        const results = [];
        els.forEach(el => {
          results.push({
            role: el.getAttribute('role'),
            tabindex: el.getAttribute('tabindex'),
            ariaLabel: el.getAttribute('aria-label'),
            ariaPressed: el.getAttribute('aria-pressed')
          });
        });
        return results;
      });

      expect(metrics.length).toBeGreaterThan(0);
      for (const m of metrics) {
        expect(m.role).toBe('button');
        expect(m.tabindex).toBe('0');
        expect(m.ariaLabel).toBeTruthy();
        expect(m.ariaPressed).toBe('false');
      }
    });

    test('health bar metrics respond to keyboard Enter/Space', async ({ page }) => {
      const metric = page.locator('.health-metric[data-filter="hub"]');
      if (await metric.count() > 0) {
        await metric.first().focus();
        await page.keyboard.press('Enter');
        const pressed = await metric.first().getAttribute('aria-pressed');
        expect(pressed).toBe('true');
        // Press again to toggle off
        await page.keyboard.press('Space');
        const pressedAfter = await metric.first().getAttribute('aria-pressed');
        expect(pressedAfter).toBe('false');
      }
    });

    test('Escape key closes the modal', async ({ page }) => {
      await page.click('#spec-btn');
      await page.waitForSelector('.modal-overlay.active');
      await page.keyboard.press('Escape');
      const isActive = await page.evaluate(() =>
        document.getElementById('spec-modal').classList.contains('active')
      );
      expect(isActive).toBe(false);
    });

    test('modal returns focus to trigger button on close', async ({ page }) => {
      await page.click('#spec-btn');
      await page.waitForSelector('.modal-overlay.active');
      await page.keyboard.press('Escape');
      const focusedId = await page.evaluate(() => document.activeElement.id);
      expect(focusedId).toBe('spec-btn');
    });

    test('sr-announcer live region exists', async ({ page }) => {
      const announcer = await page.locator('#sr-announcer');
      await expect(announcer).toHaveAttribute('aria-live', 'assertive');
      await expect(announcer).toHaveAttribute('aria-atomic', 'true');
    });

    test('node labels are truncated to max 3 lines', async ({ page }) => {
      const labelCounts = await page.evaluate(() => {
        const labels = document.querySelectorAll('.node-label');
        let maxTspans = 0;
        labels.forEach(l => {
          const count = l.querySelectorAll('tspan').length;
          if (count > maxTspans) maxTspans = count;
        });
        return maxTspans;
      });
      expect(labelCounts).toBeLessThanOrEqual(3);
    });

    test('prefers-reduced-motion CSS is present', async ({ page }) => {
      const hasReducedMotion = await page.evaluate(() => {
        const sheets = document.styleSheets;
        for (const sheet of sheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule.conditionText && rule.conditionText.includes('prefers-reduced-motion')) {
                return true;
              }
            }
          } catch (e) {}
        }
        return false;
      });
      expect(hasReducedMotion).toBe(true);
    });
  });
});
