#!/usr/bin/env node
/**
 * Build the Skills Health Dashboard from a run of the consolidated test suite.
 *
 * Reads a results JSON produced by run-tests.ps1 (suite states + counts),
 * computes the "max context" line budget for every skill file, and writes
 *   docs/skills-health.json  — machine-readable snapshot (the daily-eval contract)
 *   docs/skills-health.html  — human-readable page, publishable via GitHub Pages
 *
 * Usage:
 *   node scripts/build-health-dashboard.mjs --results <path.json> [--out-dir docs]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countLines, parseSkill } from "../evals/lib/skills.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

/** AgentSkills "max context" budget: hard cap and soft watch threshold. */
export const HARD_CAP_LINES = 600;
export const SOFT_WATCH_LINES = 500;

/** Suites the runner is expected to report on, in display order. */
export const KNOWN_SUITES = [
  "Plugin validation",
  "Canvas extension",
  "Skill evals",
  "Canvas e2e",
  "Skill behavior (LLM)",
  "Live skill evals (LLM)",
];

/**
 * Measure the line budget of every skill markdown file.
 * @param {string} [root]
 * @returns {{hardCap:number,softWatch:number,state:string,files:Array<object>}}
 */
export function measureLineBudget(root = REPO_ROOT) {
  const skillDir = path.join(root, "skills", "problem-based-srs");
  const targets = [];
  const skillMd = path.join(skillDir, "SKILL.md");
  if (fs.existsSync(skillMd)) targets.push(skillMd);
  const refDir = path.join(skillDir, "reference");
  if (fs.existsSync(refDir)) {
    for (const name of fs.readdirSync(refDir).sort()) {
      if (name.endsWith(".md")) targets.push(path.join(refDir, name));
    }
  }

  const files = targets.map((abs) => {
    const raw = fs.readFileSync(abs, "utf8");
    // SKILL.md carries YAML front matter that does not count toward the budget.
    const body = abs.endsWith("SKILL.md") ? parseSkill(raw).body : raw;
    const lines = countLines(body);
    return {
      file: path.relative(root, abs).split(path.sep).join("/"),
      lines,
      state: lines > HARD_CAP_LINES ? "over" : lines > SOFT_WATCH_LINES ? "watch" : "ok",
      pctOfCap: Math.round((lines / HARD_CAP_LINES) * 1000) / 10,
    };
  });

  const state = files.some((f) => f.state === "over")
    ? "over"
    : files.some((f) => f.state === "watch")
      ? "watch"
      : "ok";
  return { hardCap: HARD_CAP_LINES, softWatch: SOFT_WATCH_LINES, state, files };
}

/**
 * Fold the runner's per-suite results into the dashboard snapshot.
 * @param {{suites?:Array<object>, startedAt?:string, durationSeconds?:number}} results
 * @param {string} [root]
 */
export function buildSnapshot(results, root = REPO_ROOT) {
  const suites = (results.suites ?? []).map((s) => ({
    name: String(s.name ?? "unnamed"),
    state: String(s.state ?? "skipped"),
    command: s.command ?? "",
    tests: Number(s.tests ?? 0),
    pass: Number(s.pass ?? 0),
    fail: Number(s.fail ?? 0),
    skipped: Number(s.skipped ?? 0),
    seconds: Math.round(Number(s.seconds ?? 0) * 10) / 10,
    reason: s.reason ?? "",
  }));

  const sum = (key) => suites.reduce((n, s) => n + s[key], 0);
  const ran = suites.filter((s) => s.state !== "skipped");
  const failed = suites.filter((s) => s.state === "failed");

  // The dashboard is published on the project site next to the plugin version
  // badge, so it must report the *plugin* version. It used to read the canvas
  // extension's VERSION file (1.1.0) and print it beside a site badge that said
  // 2.4.1 — two different release trains, one confusing number.
  const manifestFile = path.join(root, ".claude-plugin/plugin.json");
  const versionFile = path.join(root, "VERSION");
  let version = "";
  if (fs.existsSync(manifestFile)) {
    version = JSON.parse(fs.readFileSync(manifestFile, "utf8")).version ?? "";
  }
  const canvasVersion = fs.existsSync(versionFile)
    ? fs.readFileSync(versionFile, "utf8").trim()
    : "";

  return {
    schema: "skills-health/1",
    generatedAt: results.startedAt ?? new Date().toISOString(),
    repo: "RafaelGorski/Problem-Based-SRS",
    version,
    canvasVersion,
    overall: {
      state: failed.length ? "failed" : "passed",
      suites: suites.length,
      suitesRun: ran.length,
      suitesFailed: failed.length,
      suitesSkipped: suites.length - ran.length,
      tests: sum("tests"),
      pass: sum("pass"),
      fail: sum("fail"),
      skipped: sum("skipped"),
      durationSeconds: Math.round(Number(results.durationSeconds ?? 0) * 10) / 10,
    },
    suites,
    maxContext: measureLineBudget(root),
  };
}

const esc = (v) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STATE_LABEL = { passed: "Passed", failed: "Failed", skipped: "Skipped", ok: "OK", watch: "Watch", over: "Over" };

/**
 * Render the dashboard HTML. Self-contained: no build step, no JS required.
 * @param {ReturnType<typeof buildSnapshot>} snap
 */
export function renderDashboard(snap) {
  const o = snap.overall;
  const when = new Date(snap.generatedAt);
  const stamp = Number.isNaN(when.valueOf()) ? snap.generatedAt : when.toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const suiteRows = snap.suites
    .map(
      (s) => `        <tr class="state-${esc(s.state)}">
          <td class="name">${esc(s.name)}${s.command ? `<code>${esc(s.command)}</code>` : ""}</td>
          <td><span class="pill pill-${esc(s.state)}">${esc(STATE_LABEL[s.state] ?? s.state)}</span></td>
          <td class="num">${s.state === "skipped" ? "—" : s.tests}</td>
          <td class="num">${s.state === "skipped" ? "—" : s.pass}</td>
          <td class="num ${s.fail ? "bad" : ""}">${s.state === "skipped" ? "—" : s.fail}</td>
          <td class="num">${s.state === "skipped" ? "—" : s.seconds + "s"}</td>
          <td class="note">${esc(s.reason)}</td>
        </tr>`,
    )
    .join("\n");

  const budgetRows = snap.maxContext.files
    .map(
      (f) => `        <tr class="state-${esc(f.state)}">
          <td class="name"><code>${esc(f.file)}</code></td>
          <td class="num">${f.lines}</td>
          <td class="bar-cell"><span class="bar"><i style="width:${Math.min(100, f.pctOfCap)}%"></i></span></td>
          <td><span class="pill pill-${esc(f.state)}">${esc(STATE_LABEL[f.state] ?? f.state)}</span></td>
        </tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Skills Health — Problem-Based SRS</title>
<meta name="description" content="Test-suite and context-budget health for the Problem-Based SRS plugin and the SRS Navigator canvas app.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
<style>
  .health { max-width: 68rem; margin: 0 auto; padding: var(--space-xl) var(--space-md) var(--space-2xl); }
  .health h1 { font-family: var(--font-display); font-size: var(--text-3xl); color: var(--ink-heading); margin: 0 0 var(--space-xs); }
  .health .sub { color: var(--muted); font-size: var(--text-sm); margin: 0 0 var(--space-lg); }
  .health h2 { font-family: var(--font-display); font-size: var(--text-xl); color: var(--ink-heading); margin: var(--space-xl) 0 var(--space-sm); }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: var(--space-sm); }
  .card { background: var(--bg-elevated); border: 1px solid var(--surface-border); border-radius: 0.75rem; padding: var(--space-md); }
  .card .k { display: block; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .card .v { display: block; font-family: var(--font-display); font-size: var(--text-2xl); color: var(--ink-heading); line-height: 1.1; }
  .card.verdict-passed { border-color: oklch(0.55 0.12 150 / 0.45); }
  .card.verdict-failed { border-color: oklch(0.55 0.18 27 / 0.5); }
  .card.verdict-passed .v { color: oklch(0.45 0.12 150); }
  .card.verdict-failed .v { color: oklch(0.50 0.18 27); }
  table.health-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); background: var(--bg-elevated); border: 1px solid var(--surface-border); border-radius: 0.75rem; overflow: hidden; }
  .health-table th { text-align: left; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--surface-border); }
  .health-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--surface); vertical-align: top; color: var(--ink); }
  .health-table tr:last-child td { border-bottom: 0; }
  .health-table .num { text-align: right; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .health-table .num.bad { color: oklch(0.50 0.18 27); font-weight: 600; }
  .health-table .name { font-weight: 600; }
  .health-table .name code { display: block; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 400; color: var(--muted); margin-top: 0.15rem; }
  .health-table .note { color: var(--muted); font-size: var(--text-xs); }
  .pill { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: var(--text-xs); font-weight: 600; }
  .pill-passed, .pill-ok { background: oklch(0.55 0.12 150 / 0.14); color: oklch(0.40 0.12 150); }
  .pill-failed, .pill-over { background: oklch(0.55 0.18 27 / 0.14); color: oklch(0.46 0.18 27); }
  .pill-skipped { background: var(--surface); color: var(--muted); }
  .pill-watch { background: oklch(0.61 0.18 48 / 0.16); color: oklch(0.45 0.15 48); }
  .bar-cell { width: 40%; }
  .bar { display: block; height: 0.4rem; border-radius: 999px; background: var(--surface); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--accent); }
  .state-watch .bar i { background: var(--step-why); }
  .state-over .bar i { background: oklch(0.55 0.18 27); }
  .legend { color: var(--muted); font-size: var(--text-xs); margin-top: var(--space-sm); }
</style>
</head>
<body>
<main class="health">
  <h1>Skills Health</h1>
  <p class="sub">Problem-Based SRS ${snap.version ? `v${esc(snap.version)} · ` : ""}${snap.canvasVersion ? `SRS Navigator v${esc(snap.canvasVersion)} · ` : ""}generated ${esc(stamp)} · <a href="index.html">back to the site</a></p>

  <div class="cards">
    <div class="card verdict-${esc(o.state)}"><span class="k">Verdict</span><span class="v">${esc(STATE_LABEL[o.state] ?? o.state)}</span></div>
    <div class="card"><span class="k">Tests</span><span class="v">${o.tests}</span></div>
    <div class="card"><span class="k">Passing</span><span class="v">${o.pass}</span></div>
    <div class="card"><span class="k">Failing</span><span class="v">${o.fail}</span></div>
    <div class="card"><span class="k">Suites run</span><span class="v">${o.suitesRun}/${o.suites}</span></div>
    <div class="card"><span class="k">Duration</span><span class="v">${o.durationSeconds}s</span></div>
  </div>

  <h2>Suites</h2>
  <table class="health-table">
    <thead><tr><th>Suite</th><th>Result</th><th class="num">Tests</th><th class="num">Pass</th><th class="num">Fail</th><th class="num">Time</th><th>Note</th></tr></thead>
    <tbody>
${suiteRows}
    </tbody>
  </table>

  <h2>Max context — skill line budget</h2>
  <table class="health-table">
    <thead><tr><th>File</th><th class="num">Lines</th><th>Share of cap</th><th>State</th></tr></thead>
    <tbody>
${budgetRows}
    </tbody>
  </table>
  <p class="legend">Hard cap ${snap.maxContext.hardCap} lines · soft watch ${snap.maxContext.softWatch} lines. Front matter is excluded; the metric matches <code>evals/lib/skills.mjs</code>.</p>
</main>
</body>
</html>
`;
}

/**
 * Write both artifacts and return their paths.
 * @param {object} results
 * @param {{root?:string,outDir?:string}} [opts]
 */
export function writeDashboard(results, opts = {}) {
  const root = opts.root ?? REPO_ROOT;
  const outDir = opts.outDir ?? path.join(root, "docs");
  fs.mkdirSync(outDir, { recursive: true });
  const snapshot = buildSnapshot(results, root);
  const jsonPath = path.join(outDir, "skills-health.json");
  const htmlPath = path.join(outDir, "skills-health.html");
  fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  fs.writeFileSync(htmlPath, renderDashboard(snapshot), "utf8");
  return { snapshot, jsonPath, htmlPath };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--results") out.results = argv[++i];
    else if (argv[i] === "--out-dir") out.outDir = argv[++i];
  }
  return out;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.results) {
    console.error("usage: node scripts/build-health-dashboard.mjs --results <path.json> [--out-dir docs]");
    process.exit(2);
  }
  const results = JSON.parse(fs.readFileSync(args.results, "utf8"));
  const { snapshot, jsonPath, htmlPath } = writeDashboard(results, { outDir: args.outDir });
  console.log(`Skills Health Dashboard -> ${htmlPath}`);
  console.log(`Snapshot                -> ${jsonPath}`);
  console.log(
    `Overall: ${snapshot.overall.state} · ${snapshot.overall.pass}/${snapshot.overall.tests} passing · max context ${snapshot.maxContext.state}`,
  );
}
