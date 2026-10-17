export function classifyIssueVerdict({
  claim,
  state,
  prospective = false,
  releasePublished = false,
} = {}) {
  const issueState = String(state ?? "").toLowerCase();
  if (!["open", "closed"].includes(issueState) || (prospective && issueState !== "open")) {
    return "undecidable";
  }
  if (!claim?.ok) return "undecidable";
  if (claim.noRelease) return "non-claim";
  if ((prospective || issueState === "closed") && !releasePublished) return "undecidable";
  return "claim";
}

export function classifyBatchVerdict({ findings = [], checked = [] } = {}) {
  if (findings.length > 0 || checked.length === 0) return "undecidable";
  return checked.some((issue) => issue.verdict === "claim") ? "claim" : "non-claim";
}
