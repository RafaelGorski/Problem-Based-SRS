const COUNT_NAMES = ["tests", "pass", "fail", "cancelled", "skipped", "todo"];

export function parseTapSummary(tap) {
  const counts = Object.fromEntries(
    COUNT_NAMES.map((name) => {
      const match = new RegExp(`^# ${name} (\\d+)$`, "m").exec(tap);
      if (!match) throw new Error(`TAP summary is missing "# ${name} <count>"`);
      return [name, Number(match[1])];
    }),
  );
  const executed = counts.tests - counts.skipped - counts.todo;
  if (executed <= 0) throw new Error("No skill-behavior scenarios executed");
  if (executed !== counts.pass + counts.fail + counts.cancelled) {
    throw new Error("TAP summary counts are inconsistent");
  }
  return { ...counts, executed };
}

export function formatSummary(tap, { provider, model }) {
  if (!provider || !model) throw new Error("Provider and model identity are required");
  const counts = parseTapSummary(tap);
  return [
    "### Scheduled skill-behavior canary",
    "",
    `- Provider/model: ${provider} / \`${model}\``,
    `- Scenarios executed: ${counts.executed}`,
    `- Passed: ${counts.pass}; failed: ${counts.fail}; skipped: ${counts.skipped}`,
    "",
  ].join("\n");
}
