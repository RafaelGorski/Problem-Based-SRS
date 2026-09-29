import { parseClaim, normalizeRelease, readLive } from "../evals/tools/closure-evidence.mjs";
import { readPluginVersion, readCanvasVersions, tagTrain } from "./release-train.mjs";
import { ROOT_ISSUES } from "./check-release-issue-gate.mjs";

export function buildCensus(
  { issues, releases },
  { pluginVersion, canvasVersions },
  capturedAt = new Date().toISOString(),
) {
  const published = releases.map(normalizeRelease).filter((release) => !release.draft && !release.prerelease);
  const records = ROOT_ISSUES.map((number) => {
    const issue = issues.find((item) => Number(item.number) === number);
    if (!issue) throw new Error(`release-claim-census: root #${number} was not returned by GitHub`);
    const claim = parseClaim(issue.body);
    if (!claim.ok) return { number, state: issue.state, verdict: "indeterminate", reason: claim.reason };
    if (claim.noRelease) return { number, state: issue.state, claim: "none", verdict: "no-release-claim" };
    const owner = tagTrain({ tag: claim.tag, pluginVersion, canvasVersions });
    const release = published.find((item) => item.tag === claim.tag && item.train === claim.train);
    return {
      number, state: issue.state, claim: claim.train, version: claim.version, tag: claim.tag,
      pipelineTrain: owner.train, published: Boolean(release),
      verdict: owner.train === claim.train && release ? "verified" : "mismatch",
    };
  });
  return {
    capturedAt, source: "live GitHub issues and published releases",
    command: "node scripts/release-claim-census-cli.mjs",
    roots: records,
    ok: records.every((record) => ["verified", "no-release-claim"].includes(record.verdict)),
  };
}

export function liveCensus({
  read = readLive,
  pluginVersion = readPluginVersion(),
  canvasVersions = readCanvasVersions(),
  capturedAt = new Date().toISOString(),
} = {}) {
  return buildCensus(read(ROOT_ISSUES), { pluginVersion, canvasVersions }, capturedAt);
}

export function runCensus({
  get = liveCensus,
  write = console.log,
  report = console.error,
} = {}) {
  try {
    const result = get();
    write(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  } catch (error) {
    report(`release-claim-census: ${error.message}`);
    return 1;
  }
}
