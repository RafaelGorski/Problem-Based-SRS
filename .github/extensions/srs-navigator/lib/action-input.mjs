// Validation and canonicalization for requests sent by the navigator action bar.
// The browser is not a trust boundary: derive the node identity and label from
// the loaded graph instead of forwarding values supplied by the page.

const ACTIONS_BY_NODE_TYPE = Object.freeze({
  problem: Object.freeze({
    addCN: "needs",
    decompose_problem: "problems",
    submit: "problems",
  }),
  need: Object.freeze({
    addFR: "functional-requirements",
    decompose_need: "needs",
    submit: "needs",
  }),
  fr: Object.freeze({
    addNFR: "functional-requirements",
    decompose_fr: "functional-requirements",
    submit: "functional-requirements",
    implement: null,
  }),
  nfr: Object.freeze({
    decompose_nfr: "functional-requirements",
    submit: "functional-requirements",
    implement: null,
  }),
});

const MAX_CONTEXT_LENGTH = 10_000;
const CONTEXT_NODE = Object.freeze({
  action: "establish_context",
  srsAction: "problems",
  nodeId: "CONTEXT",
  nodeType: "problem",
  nodeLabel: "Business context",
});

/**
 * Validate an action-bar payload and replace browser-controlled node metadata
 * with the corresponding values from the loaded graph.
 *
 * @param {unknown} payload
 * @param {{nodes?: Array<{id:string,type:string,label:string}>}} graphData
 * @returns {{valid: true, data: object} | {valid: false, error: string}}
 */
export function validateActionPayload(payload, graphData) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, error: "Action payload must be an object" };
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  const nodeIdInput = typeof payload.nodeId === "string" ? payload.nodeId.trim() : "";
  const nodeTypeInput = typeof payload.nodeType === "string" ? payload.nodeType : "";
  const context = typeof payload.context === "string" ? payload.context : null;
  if (!action || !nodeIdInput || !nodeTypeInput || context === null) {
    return { valid: false, error: "Action, nodeId, nodeType, and context are required" };
  }
  if (context.length > MAX_CONTEXT_LENGTH) {
    return { valid: false, error: `Context must be at most ${MAX_CONTEXT_LENGTH} characters` };
  }

  if (action === CONTEXT_NODE.action) {
    if (
      nodeIdInput.toUpperCase() !== CONTEXT_NODE.nodeId ||
      nodeTypeInput !== CONTEXT_NODE.nodeType ||
      payload.srsAction !== CONTEXT_NODE.srsAction
    ) {
      return { valid: false, error: "Invalid business-context action target" };
    }
    return {
      valid: true,
      data: {
        ...CONTEXT_NODE,
        context: context.trim(),
      },
    };
  }

  const node = (graphData?.nodes || []).find(
    (candidate) => String(candidate?.id || "").toUpperCase() === nodeIdInput.toUpperCase(),
  );
  if (!node) return { valid: false, error: "Action target node was not found" };

  const actions = ACTIONS_BY_NODE_TYPE[node.type];
  const expectedSrsAction = actions?.[action];
  if (!actions || !Object.prototype.hasOwnProperty.call(actions, action)) {
    return { valid: false, error: "Action is not allowed for the target node type" };
  }
  if (nodeTypeInput !== node.type) {
    return { valid: false, error: "Node type does not match the loaded specification" };
  }
  if (payload.srsAction !== expectedSrsAction) {
    return { valid: false, error: "Methodology action does not match the requested node action" };
  }

  return {
    valid: true,
    data: {
      action,
      srsAction: expectedSrsAction,
      nodeId: node.id,
      nodeType: node.type,
      // Never trust nodeLabel from the browser; this is specification text from
      // the server's loaded graph and is quoted before entering an agent prompt.
      nodeLabel: String(node.label ?? ""),
      context: context.trim(),
    },
  };
}

export { ACTIONS_BY_NODE_TYPE, MAX_CONTEXT_LENGTH };
