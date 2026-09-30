import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const readme = read("README.md");
const docs = read("docs/docs.html");
const canvasReadme = read(".github/extensions/srs-navigator/README.md");
const skillInstall = "npx skills add RafaelGorski/Problem-Based-SRS";
const extensionInstall =
  'install_extension({ url: "https://github.com/RafaelGorski/Problem-Based-SRS/tree/main/.github/extensions/srs-navigator", scope: "user" })';

function missingOnboardingRequirements(mainReadme, docsHtml, extensionDocs) {
  const missing = [];
  for (const [label, rawContent] of [["README.md", mainReadme], ["docs/docs.html", docsHtml]]) {
    const content = rawContent.replace(/\s+/g, " ");
    if (!content.includes(skillInstall)) missing.push(`${label} misses the skill install command`);
    if (!content.includes(extensionInstall)) missing.push(`${label} misses the repository canvas installer`);
    if (!content.includes("problem-based-srs") || !content.includes("srs-navigator")) {
      missing.push(`${label} does not verify both installed surfaces`);
    }
    if (!content.includes("/live")) missing.push(`${label} does not open the canvas after verification`);
    const sectionStart = label === "README.md" ? content.indexOf("## Quick start") : content.indexOf('id="start"');
    const quickStart = content.slice(sectionStart);
    const verificationIndex = quickStart.indexOf("Ask Copilot to verify");
    const liveIndex = quickStart.indexOf("/live");
    if (verificationIndex < 0 || liveIndex < 0 || verificationIndex > liveIndex) {
      missing.push(`${label} must verify both surfaces before /live`);
    }
  }
  if (!/Install from the repository \(Recommended\)/.test(extensionDocs)) {
    missing.push("canvas README does not recommend the repository-folder installer");
  }
  if (/Install from Gist \(Recommended\)/i.test(extensionDocs)) {
    missing.push("canvas README still recommends a gist");
  }
  return missing;
}

describe("Copilot-first two-surface onboarding", () => {
  it("aligns the README, docs page, and canvas install recommendation", () => {
    assert.deepEqual(missingOnboardingRequirements(readme, docs, canvasReadme), []);
  });

  it("negative control: a skills-only docs path is rejected", () => {
    const skillsOnlyDocs = docs.replace(extensionInstall, "canvas install removed");
    assert.ok(
      missingOnboardingRequirements(readme, skillsOnlyDocs, canvasReadme).includes(
        "docs/docs.html misses the repository canvas installer",
      ),
    );
  });

  it("negative control: opening /live before checking both installs is rejected", () => {
    const prematureLive = docs.replace(
      "Ask Copilot to verify the skill is discoverable and the canvas is available, then run",
      "Run",
    );
    assert.ok(
      missingOnboardingRequirements(readme, prematureLive, canvasReadme).includes(
        "docs/docs.html must verify both surfaces before /live",
      ),
    );
  });

  it("negative control: recommending gist installation is rejected", () => {
    const gistRecommended = canvasReadme.replace(
      "Install from the repository (Recommended)",
      "Install from Gist (Recommended)",
    );
    assert.ok(
      missingOnboardingRequirements(readme, docs, gistRecommended).includes(
        "canvas README does not recommend the repository-folder installer",
      ),
    );
  });
});
