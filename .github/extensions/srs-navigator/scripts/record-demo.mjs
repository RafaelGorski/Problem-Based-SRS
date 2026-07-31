#!/usr/bin/env node
// Record the landing page's `/live` demo from the real canvas.
//
// The figure this feeds is the most-visited content file in the repository, so it is
// also the one most worth keeping honest. A hand-made screencast would drift the
// moment the renderer or the shipped specification changed, and nothing would say so.
// This drives the same pipeline the extension uses — `serve-canvas.mjs` renders
// `.spec/crm-system.json` through validate -> convert -> graph -> HTML — and records
// a browser using it. Re-running the script is the whole maintenance story.
//
// Outputs (all committed, all asserted by evals/tests/live-demo-asset.test.mjs):
//   docs/assets/srs-navigator-demo.webm   the loop
//   docs/assets/srs-navigator-demo.jpg    poster and <img> fallback
//   docs/assets/srs-navigator-demo.json   duration, byte sizes, beats, provenance
//
// Usage:
//   npm run record-demo
//   node scripts/record-demo.mjs --seconds 8.6

import { chromium } from "playwright";
import { mkdtemp, mkdir, rm, readFile, writeFile, stat, rename } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startCanvasServer } from "./serve-canvas.mjs";
import { startSiteServer } from "./serve-site.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(EXT_ROOT, "..", "..", "..");
const DOCS = path.join(REPO_ROOT, "docs");
const ASSETS = path.join(DOCS, "assets");

const OUT = {
  video: path.join(ASSETS, "srs-navigator-demo.webm"),
  poster: path.join(ASSETS, "srs-navigator-demo.jpg"),
  metadata: path.join(ASSETS, "srs-navigator-demo.json"),
};

/** 16:10, matching the frame the landing page reserves for it. */
export const SIZE = { width: 1280, height: 800 };

/**
 * The take, as absolute offsets from the first frame. Absolute rather than relative
 * so that a slow click is absorbed by the following hold instead of pushing the whole
 * recording past its ten-second ceiling.
 *
 * The opening hold is long because the canvas builds its chain on load — problems,
 * then needs, then requirements — and cutting away mid-reveal shows a half-drawn
 * specification. There is no closing "clear the filter" beat: the loop restart is
 * that beat, and it costs no frames.
 */
export const BEATS = [
  { at: 3600, note: "The whole specification lands: 5 problems, 7 needs, 12 requirements, 5 quality attributes." },
  { at: 5700, act: "select", note: "A customer problem is selected and its traceability opens beside the graph." },
  { at: 7600, act: "filter", note: "Filtering to the need clusters dims every node off that path." },
];

const POSTER_AT = 3400;

function parseArgs(argv) {
  const opts = { quality: 68 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--quality") opts.quality = Number(argv[++i]);
  }
  return opts;
}

/** Read the specification the landing page tells readers to open. */
async function loadSpec() {
  return JSON.parse(await readFile(path.join(REPO_ROOT, ".spec", "crm-system.json"), "utf8"));
}

export function nodeCount(spec) {
  return (
    spec.problems.length +
    spec.needs.length +
    spec.functionalRequirements.length +
    spec.nonFunctionalRequirements.length
  );
}

/**
 * Ask a browser how long the recording is. Trusting the wall clock would record how
 * long the *script* took, which is not the same number a reader's browser reports —
 * and `duration` is exactly what the end-to-end suite asserts against.
 */
async function measureDuration(browser, file) {
  const site = await startSiteServer({ port: 0, root: DOCS });
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<video id="probe" preload="metadata" src="${new URL(`assets/${path.basename(file)}`, site.url)}"></video>`,
    );
    const seconds = await page.evaluate(async () => {
      const v = document.getElementById("probe");
      if (!Number.isFinite(v.duration)) {
        await new Promise((resolve) => {
          v.addEventListener("loadedmetadata", resolve, { once: true });
          v.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 10000);
        });
      }
      // A WebM muxed without a duration reports Infinity until it is seeked past the
      // end, at which point the demuxer knows where the last cluster is.
      if (!Number.isFinite(v.duration)) {
        await new Promise((resolve) => {
          v.addEventListener("seeked", resolve, { once: true });
          v.addEventListener("durationchange", resolve, { once: true });
          setTimeout(resolve, 10000);
          v.currentTime = Number.MAX_SAFE_INTEGER;
        });
      }
      return v.duration;
    });
    await page.close();
    return seconds;
  } finally {
    await site.close();
  }
}

export async function record({ quality = 68 } = {}) {
  const spec = await loadSpec();
  const canvas = await startCanvasServer({ port: 0, spec });
  const tmp = await mkdtemp(path.join(os.tmpdir(), "srs-demo-"));
  const browser = await chromium.launch();

  let videoPath;
  try {
    const context = await browser.newContext({
      viewport: SIZE,
      recordVideo: { dir: tmp, size: SIZE },
      reducedMotion: "no-preference",
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const startedAt = Date.now();
    const until = async (ms) => {
      const remaining = startedAt + ms - Date.now();
      if (remaining > 0) await page.waitForTimeout(remaining);
    };

    await page.goto(canvas.url);
    await page.waitForSelector(".node", { timeout: 30000 });

    await until(POSTER_AT);
    await mkdir(ASSETS, { recursive: true });
    await page.screenshot({ path: OUT.poster, type: "jpeg", quality });

    const problem = page
      .locator(".node")
      .filter({ has: page.locator(".node-id", { hasText: "CP.01" }) })
      .first();
    const clusters = page.locator('.health-metric[data-filter="hub"]').first();

    // Each beat is checked, not just performed. A click that lands on nothing still
    // produces a perfectly valid ten-second video of a graph sitting still, and the
    // page would go on claiming it shows the canvas being used.
    const acts = {
      select: async () => {
        await problem.click({ force: true });
        await page.waitForSelector("#detail-panel.active", { timeout: 5000 });
      },
      filter: async () => {
        await clusters.click();
        // Dimming is applied to each node's child shapes via the `opacity`
        // *attribute*, not to the group's computed style — asserting on the group
        // would pass forever without anything visibly changing.
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll(".node rect")].some(
              (r) => parseFloat(r.getAttribute("opacity")) < 0.5,
            ),
          undefined,
          { timeout: 5000 },
        );
      },
    };

    for (const beat of BEATS) {
      if (beat.act) await acts[beat.act]();
      await until(beat.at);
    }

    const video = page.video();
    await context.close();
    videoPath = await video.path();
    await rm(OUT.video, { force: true });
    // Copy rather than rename: on Windows the recorder's own handle on the temp file
    // can outlive context.close() just long enough to make a move fail.
    await writeFile(OUT.video, await readFile(videoPath));

    const seconds = await measureDuration(browser, OUT.video);
    const [videoStat, posterStat] = await Promise.all([stat(OUT.video), stat(OUT.poster)]);

    const metadata = {
      source: path.posix.join(".github/extensions/srs-navigator/scripts", "record-demo.mjs"),
      spec: spec.name,
      nodes: nodeCount(spec),
      width: SIZE.width,
      height: SIZE.height,
      seconds: Number.isFinite(seconds) ? Math.round(seconds * 100) / 100 : null,
      videoBytes: videoStat.size,
      posterBytes: posterStat.size,
      recordedAt: new Date().toISOString(),
      steps: BEATS.map((b) => b.note),
    };
    await writeFile(OUT.metadata, `${JSON.stringify(metadata, null, 2)}\n`);
    return metadata;
  } finally {
    await browser.close();
    await canvas.close();
    // Best effort: a leftover temp file is the OS's problem, not a failed recording.
    await rm(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  const meta = await record(opts);
  console.log(`Recorded ${meta.spec} — ${meta.nodes} nodes, ${meta.seconds}s`);
  console.log(`  ${path.relative(REPO_ROOT, OUT.video)}  ${meta.videoBytes} bytes`);
  console.log(`  ${path.relative(REPO_ROOT, OUT.poster)}  ${meta.posterBytes} bytes`);
  console.log(`  ${path.relative(REPO_ROOT, OUT.metadata)}`);
}
