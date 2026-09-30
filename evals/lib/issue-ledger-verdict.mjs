export function hasLedgerDrift(counts) {
  return (
    counts.openWithoutBlocker > 0 ||
    counts.tickedWithoutCitation > 0 ||
    counts.supersededVersionMentions > 0 ||
    counts.unparseable > 0
  );
}
