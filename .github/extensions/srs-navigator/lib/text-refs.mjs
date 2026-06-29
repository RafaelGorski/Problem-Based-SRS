// Extract reference IDs (e.g. "CN-1") from free text.
//
// Patterns may be grouped (the ID is captured in group 1) or ungrouped (the
// whole match is the ID). `m[1] ?? m[0]` handles both forms, so a single
// implementation serves both the markdown parser and the spec compiler.
export function extractRefs(content, pattern) {
  return [...(content || "").matchAll(pattern)].map((m) => (m[1] ?? m[0]).toUpperCase());
}
