// Local (model-free) decomposition of an SRS node into child items.
//
// Splits a node's description into sub-items by sentence, generating fresh
// sequential IDs and preserving parent links. This avoids a slow model
// round-trip for the common "break this requirement into smaller pieces" action.

const TYPE_META = {
  problem: { key: "problems", prefix: "CP", linkField: null },
  need: { key: "needs", prefix: "CN", linkField: "problemIds" },
  fr: { key: "functionalRequirements", prefix: "FR", linkField: "needIds" },
  nfr: { key: "nonFunctionalRequirements", prefix: "NFR", linkField: "needIds" },
};

/** Compute the next sequential id (e.g. "FR-4") given existing ids of a prefix. */
export function nextId(ids, prefix) {
  let max = 0;
  for (const id of ids) {
    const m = String(id).match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${max + 1}`;
}

function detectType(spec, nodeId) {
  for (const [type, meta] of Object.entries(TYPE_META)) {
    if ((spec[meta.key] || []).some((i) => i.id === nodeId)) return type;
  }
  return null;
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/[.!?]+$/, ""))
    .filter((s) => s.length > 0);
}

/**
 * Decompose a node into child items derived from its description sentences.
 * Returns a new spec (input is not mutated) plus the added items.
 */
export function decomposeNode(spec, nodeId) {
  const type = detectType(spec, nodeId);
  if (!type) throw new Error(`Node ${nodeId} not found`);

  const meta = TYPE_META[type];
  const next = structuredClone(spec);
  const list = next[meta.key];
  const parent = list.find((i) => i.id === nodeId);

  const sentences = splitSentences(parent.description);
  if (sentences.length < 2) return { spec: next, added: [] };

  const existingIds = list.map((i) => i.id);
  const added = sentences.map((sentence) => {
    const id = nextId(existingIds, meta.prefix);
    existingIds.push(id);
    const item = { id, title: sentence.slice(0, 80), description: sentence };
    if (meta.linkField) item[meta.linkField] = [...(parent[meta.linkField] || [])];
    return item;
  });

  list.push(...added);
  return { spec: next, added };
}
