// Single source of truth for Problem-Based SRS identifier notation.
//
// The methodology's canonical notation is DOTTED, encoding traceability in the
// ID itself:
//
//   CP.01            a Customer Problem
//   CN.01.1          a Customer Need addressing CP.01
//   FR.01.1.1        a Functional Requirement implementing CN.01.1
//
// HYPHEN notation (CP-1, CP-001, FR-001) is accepted as legacy so specs written
// before the canonical notation was settled — and the bundled demo spec — keep
// rendering. Both parsers (lib/parser.mjs and lib/spec-compiler.mjs) build their
// regexes from here so the two can never drift apart again.

/** Prefixes used for graph node IDs, including the parser's bare fallbacks. */
export const ID_PREFIXES = ["CP", "CN", "FR", "NFR", "P", "N"];

// First separator may be "-" (legacy) or "." (canonical); any further levels
// are dot-separated only. Keeping subsequent levels dot-only means a filename
// like "FR-001-client-registration.md" still yields the ID "FR-001" rather than
// swallowing the short-name suffix.
const LEVELS = String.raw`\d+(?:\.\d+)*`;

/**
 * Regex source matching one identifier for the given prefix alternatives.
 * @param {string[]} prefixes e.g. ["CP", "P"]
 * @returns {string} regex source, with the ID as the whole match
 */
export function idSource(prefixes) {
  return `(?:${prefixes.join("|")})[-.]${LEVELS}`;
}

/**
 * Build an anchored regex that validates a complete identifier, used to gate
 * specification JSON. Accepts canonical dotted IDs (CP.01, FR.01.1.1) and
 * legacy hyphen IDs (CP-1, FR-001). Rejecting dotted IDs here used to make the
 * canvas refuse every spec written in the methodology's own canonical notation.
 * @param {string[]} prefixes e.g. ["CP", "P"]
 * @returns {RegExp}
 */
export function idPattern(prefixes) {
  return new RegExp(String.raw`^${idSource(prefixes)}$`, "i");
}

/**
 * Build a global, case-insensitive regex that finds references to any of the
 * given prefixes in free text (e.g. "Addresses CP.01 and CP-2").
 * @param {string[]} prefixes
 * @returns {RegExp}
 */
export function refPattern(prefixes) {
  return new RegExp(String.raw`\b(${idSource(prefixes)})\b`, "gi");
}

/**
 * Build a regex matching a markdown heading that carries an ID, tolerating the
 * bracketed and bare forms the methodology templates emit:
 *
 *   ### [CP-1] Title      ### CP-001: Title      ### CP.01 Title
 *
 * @param {string} prefix e.g. "CP"
 * @param {string} hashes heading level, e.g. "###"
 * @param {string} flags  extra regex flags (default "gmi")
 * @returns {RegExp} capture 1 = ID, capture 2 = title
 */
export function headingPattern(prefix, hashes = "###", flags = "gmi") {
  return new RegExp(
    String.raw`^${hashes}\s+\[?(${idSource([prefix])})\]?[:\s-]*\s*(.+)`,
    flags
  );
}

/**
 * Match an ID anywhere inside a heading string, bracketed or bare.
 * @param {string} heading
 * @returns {string|undefined} the upper-cased ID, if present
 */
export function extractHeadingId(heading) {
  const m = String(heading ?? "").match(
    new RegExp(String.raw`\[(${idSource(ID_PREFIXES)})\]|^\s*(${idSource(ID_PREFIXES)})\b`, "i")
  );
  return (m?.[1] ?? m?.[2])?.toUpperCase();
}

/**
 * Strip a leading ID (bracketed or bare, with optional ":" / "-" separator)
 * from a heading, leaving the human title.
 * @param {string} heading
 * @returns {string}
 */
export function stripHeadingId(heading) {
  return String(heading ?? "")
    .replace(new RegExp(String.raw`^\s*\[(?:${idSource(ID_PREFIXES)})\]\s*[:\-]?\s*`, "i"), "")
    .replace(new RegExp(String.raw`^\s*(?:${idSource(ID_PREFIXES)})\s*[:\-]\s*`, "i"), "")
    .replace(new RegExp(String.raw`^\s*(?:${idSource(ID_PREFIXES)})\s+`, "i"), "")
    .trim();
}

/**
 * Build a regex matching per-requirement filenames, tolerating dotted IDs and
 * the documented "-[short-name]" suffix:
 *
 *   FR-001.md   FR-001-client-registration.md   FR.01.1.1-client-registration.md
 *
 * @param {string} prefix "FR" or "NFR"
 * @returns {RegExp}
 */
export function requirementFilePattern(prefix) {
  return new RegExp(String.raw`^${prefix}[-.]${LEVELS}(?:-[^.]*)?\.md$`, "i");
}
