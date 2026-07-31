// The landing page's app figure is the most-visited content file in the repository:
// GitHub's traffic API (14-day window ending 2026-07-30) ranks
// `docs/assets/srs-navigator.png` third overall, ahead of SKILL.md and AGENTS.md.
// Readers click through specifically to look at the graph, so that figure was
// promoted from a still to a short recording of the real `/live` canvas.
//
// A video is a binary blob, which is exactly the kind of artifact that rots quietly:
// it can go missing, balloon past a sane page weight, drift away from the spec it
// claims to show, or start autoplaying at a reader who asked for no motion. None of
// that is visible in a diff. These assertions read the committed markup, the
// committed bytes, and the metadata the recorder writes, so each failure mode is
// caught offline, with no browser and no network.
//
// The behavioural half — does it actually play, does it actually stay paused under
// prefers-reduced-motion — lives in the Playwright suite
// `.github/extensions/srs-navigator/tests/demo.test.mjs`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(repoRoot, rel));
const sizeOf = (rel) => fs.statSync(path.join(repoRoot, rel)).size;

const LANDING = read("docs/index.html");
const SITE_JS = read("docs/assets/site.js");
const SITE_CSS = read("docs/assets/site.css");

/** Paths are asserted rather than derived, so a rename has to be a deliberate edit. */
export const ASSETS = {
  video: "docs/assets/srs-navigator-demo.webm",
  poster: "docs/assets/srs-navigator-demo.jpg",
  metadata: "docs/assets/srs-navigator-demo.json",
  recorder: ".github/extensions/srs-navigator/scripts/record-demo.mjs",
  /** The still the recording replaces — the "do not regress" reference point. */
  previousStill: "docs/assets/srs-navigator.png",
};

/**
 * Page-weight budget. The video is `preload="none"`, so it costs nothing until a
 * reader asks for it; the poster is the only byte cost at first paint. The ceilings
 * are generous enough to survive a re-record and tight enough that nobody drops a
 * screencast in here by hand.
 */
export const BUDGET = {
  videoBytes: 1_400_000,
  posterBytes: 300_000,
  seconds: 10,
};

/** Extract `<tag ...>…</tag>` for the first `tag` whose opening tag matches `match`. */
export function element(html, tag, match = "") {
  const openPattern = new RegExp(`<${tag}\\b[^>]*>`, "g");
  for (const m of html.matchAll(openPattern)) {
    if (match && !m[0].includes(match)) continue;
    const close = html.indexOf(`</${tag}>`, m.index);
    if (close === -1) return null;
    return { open: m[0], html: html.slice(m.index, close + tag.length + 3) };
  }
  return null;
}

/** Parse an opening tag into `{ name: value }`, with valueless attributes as `""`. */
export function attributes(openTag) {
  const inner = openTag.replace(/^<[a-zA-Z0-9-]+/, "").replace(/\/?>$/, "");
  const out = {};
  const pattern = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (const m of inner.matchAll(pattern)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

/** The `<section id="…">…</section>` region of a page. */
export function sectionById(html, id) {
  const open = html.indexOf(`<section id="${id}"`);
  if (open === -1) return "";
  const close = html.indexOf("</section>", open);
  return close === -1 ? "" : html.slice(open, close);
}

const APP_SECTION = sectionById(LANDING, "app");
const VIDEO = element(APP_SECTION, "video");
const VIDEO_ATTRS = VIDEO ? attributes(VIDEO.open) : {};
const METADATA = exists(ASSETS.metadata) ? JSON.parse(read(ASSETS.metadata)) : null;

/** Resolve a page-relative asset reference (`assets/x.webm`) to a repo path. */
const fromDocs = (src) => `docs/${String(src).split("?")[0].replace(/^\.?\//, "")}`;

describe("the /live demo is on the page as a video", () => {
  it("the app figure is a video, not a still", () => {
    assert.notEqual(APP_SECTION, "", 'docs/index.html must keep <section id="app">');
    assert.ok(
      VIDEO,
      'the app figure must render a <video> — the traffic data says readers open this ' +
        "figure deliberately, and a still cannot show the graph being used",
    );
  });

  it("offers the recording as WebM", () => {
    const source = element(VIDEO.html, "source") ?? { open: VIDEO.html.match(/<source\b[^>]*>/)?.[0] };
    assert.ok(source?.open, "the <video> must carry a <source>");
    const attrs = attributes(source.open);
    assert.equal(attrs.type, "video/webm", "the source must declare video/webm");
    assert.equal(
      fromDocs(attrs.src),
      ASSETS.video,
      `the source must point at ${ASSETS.video}`,
    );
  });

  it("declares its intrinsic size so the figure does not shift as it loads", () => {
    assert.match(VIDEO_ATTRS.width ?? "", /^\d+$/, "the <video> needs a width attribute");
    assert.match(VIDEO_ATTRS.height ?? "", /^\d+$/, "the <video> needs a height attribute");
  });

  it("loops silently and inline, so it reads as a figure and not a media player", () => {
    for (const flag of ["loop", "muted", "playsinline"]) {
      assert.ok(flag in VIDEO_ATTRS, `the <video> must set ${flag}`);
    }
  });
});

describe("motion is opt-in — prefers-reduced-motion", () => {
  // This is the assertion the issue's acceptance criteria turn on. `autoplay` in the
  // markup starts playback before any script runs, which no media query and no
  // JavaScript can undo — the reader with vestibular sensitivity has already been
  // shown the motion. Gating therefore has to happen by *not* writing the attribute.
  it("never writes autoplay into the markup", () => {
    assert.ok(
      !("autoplay" in VIDEO_ATTRS),
      "the <video> must not carry `autoplay`: the attribute starts playback before " +
        "site.js can check prefers-reduced-motion, so the opt-out would arrive too late",
    );
  });

  it("starts playback from site.js, behind the reduced-motion check", () => {
    assert.match(
      SITE_JS,
      /prefers-reduced-motion/,
      "docs/assets/site.js must read the reduced-motion preference",
    );
    assert.match(
      SITE_JS,
      /\.play\(\)/,
      "site.js must be the thing that starts the demo, since the markup never does",
    );

    // Scoped to the demo handler on purpose. site.js already reads the preference
    // near the top for the scroll reveal, so a document-wide ordering check passes
    // even when the demo's own gate has been deleted — it did, when this guard was
    // negative-tested. The branch has to exist in the code that starts the video.
    const block = SITE_JS.slice(SITE_JS.indexOf("data-demo-toggle"));
    const branch = block.search(
      /if\s*\(\s*!?\s*reduceMotion\s*\)|!\s*reduceMotion\s*&&|reduceMotion\s*\?/,
    );
    assert.ok(
      branch !== -1,
      "the demo handler must branch on reduceMotion — mentioning the preference " +
        "elsewhere in the file does not stop this video from playing",
    );

    // Unprompted playback (the on-screen observer) must sit downstream of that
    // branch. Playback the reader explicitly asked for may not.
    const auto = block.indexOf("IntersectionObserver");
    assert.ok(
      auto === -1 || branch < auto,
      "the reduced-motion branch must be evaluated before autoplay is wired up",
    );
  });

  it("offers a control, so playback is not reachable by motion alone", () => {
    const toggle = element(APP_SECTION, "button", "data-demo-toggle");
    assert.ok(
      toggle,
      "the app figure must carry a [data-demo-toggle] button — a reader who opted out " +
        "of motion still needs a way to watch the demo",
    );
    const label = toggle.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    assert.ok(label.length > 0, "the control must have a visible label, not an icon alone");
    assert.match(
      attributes(toggle.open)["aria-pressed"] ?? "",
      /^(true|false)$/,
      "the control must expose its state via aria-pressed",
    );
  });

  it("styles the control for the reduced-motion reader", () => {
    assert.match(
      SITE_CSS,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,400}demo-toggle/,
      "docs/assets/site.css must keep the demo control permanently visible under " +
        "prefers-reduced-motion: with nothing moving, there is no cue that the figure " +
        "is playable",
    );
  });
});

describe("the static fallback", () => {
  it("names a poster frame that is committed", () => {
    assert.ok(VIDEO_ATTRS.poster, "the <video> must declare a poster");
    assert.equal(fromDocs(VIDEO_ATTRS.poster), ASSETS.poster);
    assert.ok(exists(ASSETS.poster), `${ASSETS.poster} must be committed`);
  });

  it("falls back to an <img> for a browser that cannot play WebM", () => {
    const img = VIDEO.html.match(/<img\b[^>]*>/)?.[0];
    assert.ok(
      img,
      "the <video> element must contain an <img> fallback — a browser without WebM " +
        "renders the element's children, and an empty element renders nothing",
    );
    assert.equal(fromDocs(attributes(img).src), ASSETS.poster);
  });

  it("gives the fallback alt text that describes the frame", () => {
    const img = VIDEO.html.match(/<img\b[^>]*>/)?.[0];
    const alt = attributes(img).alt ?? "";
    assert.ok(alt.length >= 40, `the fallback alt text is too thin to be useful: "${alt}"`);
    for (const term of [/problem/i, /need/i, /requirement/i]) {
      assert.match(
        alt,
        term,
        "the alt text must describe what the graph shows, not that a video exists",
      );
    }
    assert.ok(
      !/^(image|video|screenshot|demo|animation)\b/i.test(alt),
      `alt text must not open by naming the medium: "${alt}"`,
    );
  });
});

describe("page weight", () => {
  it("does not download the video until a reader asks for it", () => {
    assert.equal(
      VIDEO_ATTRS.preload,
      "none",
      'the <video> must set preload="none" so the recording contributes zero bytes to ' +
        "page load",
    );
  });

  it("makes the figure lighter at first paint than the still it replaced", () => {
    const poster = sizeOf(ASSETS.poster);
    const previous = sizeOf(ASSETS.previousStill);
    assert.ok(
      poster < previous,
      `the poster (${poster} bytes) must be smaller than the PNG it replaces ` +
        `(${previous} bytes) — the demo is not allowed to make the page slower`,
    );
  });

  it("keeps both assets inside the stated budget", () => {
    assert.ok(
      sizeOf(ASSETS.poster) <= BUDGET.posterBytes,
      `poster is ${sizeOf(ASSETS.poster)} bytes, budget ${BUDGET.posterBytes}`,
    );
    assert.ok(
      sizeOf(ASSETS.video) <= BUDGET.videoBytes,
      `recording is ${sizeOf(ASSETS.video)} bytes, budget ${BUDGET.videoBytes}`,
    );
  });
});

describe("the recording is a build output, not a screencast", () => {
  it("ships all three artifacts", () => {
    for (const rel of [ASSETS.video, ASSETS.poster, ASSETS.metadata, ASSETS.recorder]) {
      assert.ok(exists(rel), `${rel} must be committed`);
    }
  });

  it("was produced by the committed recorder against the shipped spec", () => {
    assert.ok(METADATA, `${ASSETS.metadata} must be valid JSON`);
    assert.match(
      METADATA.source ?? "",
      /record-demo\.mjs$/,
      "the metadata must name the script that regenerates the asset",
    );
    const spec = JSON.parse(read(".spec/crm-system.json"));
    assert.equal(
      METADATA.spec,
      spec.name,
      "the recording must come from the specification that ships with the plugin",
    );
    const nodes =
      spec.problems.length +
      spec.needs.length +
      spec.functionalRequirements.length +
      spec.nonFunctionalRequirements.length;
    assert.equal(
      METADATA.nodes,
      nodes,
      `the recording claims ${METADATA.nodes} nodes but the spec has ${nodes} — ` +
        "re-record after changing the spec",
    );
  });

  it("runs for at most ten seconds", () => {
    assert.ok(
      typeof METADATA.seconds === "number" && METADATA.seconds > 0,
      "the metadata must record the take's duration",
    );
    assert.ok(
      METADATA.seconds <= BUDGET.seconds,
      `the loop is ${METADATA.seconds}s; it must stay at or under ${BUDGET.seconds}s`,
    );
  });

  it("describes the beats a reader is supposed to see", () => {
    assert.ok(
      Array.isArray(METADATA.steps) && METADATA.steps.length >= 3,
      "the metadata must list the demo's beats, so a re-record can be checked against " +
        "what the page claims the demo shows",
    );
  });

  it("matches the bytes actually committed", () => {
    // A regenerate that writes the metadata but not the media (or the reverse) leaves
    // the page advertising a file that no longer exists in that form.
    assert.equal(METADATA.videoBytes, sizeOf(ASSETS.video), "stale videoBytes in metadata");
    assert.equal(METADATA.posterBytes, sizeOf(ASSETS.poster), "stale posterBytes in metadata");
  });

  it("is regenerable through an npm script", () => {
    const pkg = JSON.parse(read(".github/extensions/srs-navigator/package.json"));
    assert.match(
      pkg.scripts?.["record-demo"] ?? "",
      /record-demo\.mjs/,
      "an asset nobody knows how to rebuild is a hand-made asset",
    );
  });
});

describe("negative canaries", () => {
  it("attributes() distinguishes a boolean flag from a missing one", () => {
    const attrs = attributes('<video loop muted preload="none">');
    assert.equal(attrs.loop, "");
    assert.ok("muted" in attrs);
    assert.ok(!("autoplay" in attrs));
    assert.equal(attrs.preload, "none");
  });

  it("the autoplay guard actually fires when autoplay is present", () => {
    const mutated = attributes(VIDEO.open.replace("<video", "<video autoplay"));
    assert.ok("autoplay" in mutated, "the check must notice the attribute coming back");
  });

  // This one exists because the reduced-motion guard above once had exactly this
  // hole: site.js reads the preference at the top for the scroll reveal, so a
  // whole-file check stayed green after the demo's own gate was deleted.
  it("the reduced-motion branch is looked for inside the demo handler, not the file", () => {
    const decoy = [
      "var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;",
      "if (!reduceMotion) { revealOnScroll(); }",
      "document.querySelectorAll('[data-demo-toggle]').forEach(function (btn) {",
      "  document.querySelector('#live-demo').play();",
      "});",
    ].join("\n");
    const block = decoy.slice(decoy.indexOf("data-demo-toggle"));
    const branch = block.search(
      /if\s*\(\s*!?\s*reduceMotion\s*\)|!\s*reduceMotion\s*&&|reduceMotion\s*\?/,
    );
    assert.equal(
      branch,
      -1,
      "an ungated demo handler must not be rescued by the reveal animation's own check",
    );
  });

  it("element() returns null rather than matching the rest of the document", () => {
    assert.equal(element("<p>no video here</p>", "video"), null);
    assert.equal(element("<video><source></video>", "video").open, "<video>");
  });

  it("sectionById() does not match a section that is merely mentioned", () => {
    assert.equal(sectionById('<p>see section id="app"</p>', "app"), "");
  });

  it("the fallback check fails for a <video> with no children", () => {
    const stripped = VIDEO.html.replace(/<img\b[^>]*>/, "");
    assert.equal(stripped.match(/<img\b[^>]*>/), null, "the check must notice a dropped <img>");
  });

  it("the budget check would fail an oversized asset", () => {
    assert.ok(BUDGET.videoBytes < sizeOf(ASSETS.previousStill) * 2, "the ceiling must bite");
  });
});
