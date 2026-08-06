const ACTION_RULES = Object.freeze({
    submit: { nodeTypes: ["problem", "need", "fr", "nfr"], srsActions: ["problems", "needs", "functional-requirements"] },
    addCN: { nodeTypes: ["problem"], srsActions: ["needs"] },
    addFR: { nodeTypes: ["need"], srsActions: ["functional-requirements"] },
    addNFR: { nodeTypes: ["fr"], srsActions: ["functional-requirements"] },
    establish_context: { nodeTypes: ["problem"], srsActions: ["problems"], contextNode: true },
    decompose_problem: { nodeTypes: ["problem"], srsActions: ["problems"] },
    decompose_need: { nodeTypes: ["need"], srsActions: ["needs"] },
    decompose_fr: { nodeTypes: ["fr"], srsActions: ["functional-requirements"] },
    decompose_nfr: { nodeTypes: ["nfr"], srsActions: ["functional-requirements"] },
    implement: { nodeTypes: ["fr", "nfr"], srsActions: [null] },
});

const MAX_FIELD_LENGTH = 12_000;

export function validateActionPayload(payload, graphData) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, error: "Invalid action payload" };
    const rule = ACTION_RULES[payload.action];
    if (!rule) return { ok: false, error: "Unknown action" };
    for (const field of ["action", "nodeId", "nodeType", "nodeLabel", "context"]) {
        if (typeof payload[field] !== "string" || !payload[field].trim() || payload[field].length > MAX_FIELD_LENGTH) {
            return { ok: false, error: `Invalid ${field}` };
        }
    }
    if (payload.srsAction !== undefined && payload.srsAction !== null && typeof payload.srsAction !== "string") {
        return { ok: false, error: "Invalid srsAction" };
    }
    if (!rule.nodeTypes.includes(payload.nodeType)) return { ok: false, error: "Action is not valid for this node type" };
    if (!rule.srsActions.includes(payload.srsAction ?? null)) return { ok: false, error: "Invalid methodology action" };
    if (rule.contextNode && payload.nodeId !== "CONTEXT") return { ok: false, error: "Invalid context node" };
    if (!rule.contextNode) {
        const node = (graphData?.nodes || []).find((candidate) => String(candidate.id) === payload.nodeId);
        if (!node || node.type !== payload.nodeType || String(node.label) !== payload.nodeLabel) {
            return { ok: false, error: "Node does not match the loaded specification" };
        }
    }
    return { ok: true };
}

export { ACTION_RULES, MAX_FIELD_LENGTH };
