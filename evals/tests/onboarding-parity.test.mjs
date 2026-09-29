// Guards CP-B (issue #227 daily-eval digest): docs/docs.html's quick-start used to present
// `/live` as step 3 right after only installing the skills, while README.md's own install
// section says the SRS Navigator canvas is "installed separately from the skills" and needs
// its own install step. A skeptical first-time reader following only the quick-start would
// hit a missing-canvas error at step 3. This test fails if that contradiction reappears.
//
// Also guards CP-D (issue #218): docs/index.html used to claim "Ten AgentSkills" after the
// repository was consolidated to a single skill (`skills/problem-based-srs/`, per the #50
// consolidation noted in .github/copilot-instructions.md) with nine reference actions
// (business-context, problems, software-glance, needs, software-vision,
// functional-requirements, validate, complexity, live). That stale count contradicted the
// repository's own current skill layout.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsHtml = fs.readFileSync(path.join(REPO_ROOT, "docs", "docs.html"), "utf8");
const readme = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8");
const indexHtml = fs.readFileSync(path.join(REPO_ROOT, "docs", "index.html"), "utf8");

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function docsQuickStartSteps(html = docsHtml) {
  const start = html.slice(
    html.indexOf('id="start"'),
    html.indexOf("</section>", html.indexOf('id="start"')),
  );
  return [...start.matchAll(/<div class="qs-step">([\s\S]*?)<\/div>/g)].map((match) => {
    const block = match[1];
    return {
      label: stripTags(block.match(/<span class="qs-label">([\s\S]*?)<\/span>/)?.[1] ?? ""),
      text: stripTags(block),
    };
  });
}

function readmeQuickStartSteps(markdown = readme) {
  const start = markdown.slice(
    markdown.indexOf("## Quick start"),
    markdown.indexOf("## Full example"),
  );
  return [...start.matchAll(/(?:^|\n)\d+\.\s+\*\*([^*]+)\*\*([\s\S]*?)(?=\n\d+\.\s+\*\*|\n## |\s*$)/g)].map((match) => ({
    label: match[1].replace(/:$/, "").trim(),
    text: match[0].replace(/\s+/g, " ").trim(),
  }));
}

function assertQuickStartSuccessChecks(steps, surface) {
  assert.equal(steps.length, 3, `${surface} must keep the three-step quick start`);
  for (const step of steps) {
    assert.match(
      step.text,
      /Success check:/i,
      `${surface} step "${step.label}" must state an observable success check`,
    );
  }
  assert.match(
    steps[2].text,
    /renders an interactive graph/i,
    `${surface} final step must end in a concretely described rendered graph`,
  );
  assert.match(
    steps[2].text,
    /CP[\s\S]*CN[\s\S]*FR[\s\S]*NFR/i,
    `${surface} final graph success check must name CP, CN, FR and NFR nodes`,
  );
}

describe("onboarding quick-start agrees with the README on the canvas install (CP-B)", () => {
  test("README still documents the canvas as a separate install", () => {
    assert.match(
      readme,
      /SRS Navigator canvas app[\s\S]*?installed separately from\s+the\s+skills/,
      "if this wording changes, the docs.html quick-start below must be re-checked against it",
    );
  });

  test("the quick-start's visualize step names the canvas as a separate install", () => {
    const startSection = docsHtml.slice(
      docsHtml.indexOf('id="start"'),
      docsHtml.indexOf("</section>", docsHtml.indexOf('id="start"')),
    );
    assert.match(
      startSection,
      /separate install/i,
      "step 03 (Visualize) must tell the reader the canvas is not part of the skills bundle, " +
        "matching README.md's install instructions — otherwise following only the quick-start " +
        "leads to a missing-canvas dead end at `/live`",
    );
  });

  test("README and docs quick starts give every step an observable success check", () => {
    assertQuickStartSuccessChecks(readmeQuickStartSteps(), "README.md");
    assertQuickStartSuccessChecks(docsQuickStartSteps(), "docs/docs.html");
  });

  test("negative control: removing one success check fails the quick-start contract", () => {
    const steps = docsQuickStartSteps(docsHtml.replace(/<strong>Success check:<\/strong>/, "<strong>Check:<\/strong>"));
    assert.throws(
      () => assertQuickStartSuccessChecks(steps, "mutated docs/docs.html"),
      /must state an observable success check/,
    );
  });
});

describe("docs/index.html states the current skill count (CP-D)", () => {
  test("does not claim the retired 'Ten AgentSkills' count", () => {
    assert.doesNotMatch(
      indexHtml,
      /Ten AgentSkills/,
      "the repository ships a single consolidated skill (skills/problem-based-srs/) with " +
        "nine reference actions, not ten separate skills — restore the accurate count instead " +
        "of reintroducing the pre-consolidation figure",
    );
  });
});
