// Playwright global setup (FR.05.3.1): the site project asserts against
// docs/skills-health.{json,html}. On a checkout where the runner has never written the
// dashboard, generate it before any test reads it, so the suite's verdict does not depend
// on whether a previous run happened to leave the file behind.
//
// With no results to fold in, the dashboard is written with a "Not run" verdict — never a
// pass — so a freshly generated page cannot advertise a green run nobody executed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');

/**
 * Ensure both dashboard artefacts exist under `<root>/docs`.
 * @param {{root?:string}} [opts]
 * @returns {Promise<{generated:boolean, jsonPath:string, htmlPath:string}>}
 */
export async function ensureDashboard(opts = {}) {
  const root = opts.root ?? REPO_ROOT;
  const outDir = path.join(root, 'docs');
  const jsonPath = path.join(outDir, 'skills-health.json');
  const htmlPath = path.join(outDir, 'skills-health.html');
  if (fs.existsSync(jsonPath) && fs.existsSync(htmlPath)) {
    return { generated: false, jsonPath, htmlPath };
  }
  const { writeDashboard } = await import(pathToFileURL(path.join(REPO_ROOT, 'scripts', 'build-health-dashboard.mjs')).href);
  writeDashboard({ suites: [] }, { root, outDir });
  return { generated: true, jsonPath, htmlPath };
}

export default async function globalSetup() {
  await ensureDashboard();
}
