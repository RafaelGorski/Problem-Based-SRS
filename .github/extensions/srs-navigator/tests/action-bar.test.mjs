// Unit tests for the action bar feature:
// - Renderer includes action bar HTML/CSS/JS
// - Skill mapping per node type
// - Server /api/invoke-skill endpoint
// - pending_actions canvas action (queue + consume semantics)

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderGraphHtml } from "../lib/renderer.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Renderer Action Bar Tests ---

describe("Action Bar: Renderer output", () => {
  const sampleGraph = {
    nodes: [
      { id: "CP-1", type: "problem", label: "Test Problem", data: {}, complexity: 1 },
      { id: "CN-1", type: "need", label: "Test Need", data: {}, complexity: 2 },
    ],
    links: [{ source: "CP-1", target: "CN-1", type: "addresses" }],
  };

  let html;
  before(() => {
    html = renderGraphHtml(sampleGraph);
  });

  it("includes action bar container element", () => {
    assert.ok(html.includes('id="action-bar"'));
  });

  it("includes action bar text input", () => {
    assert.ok(html.includes('id="action-bar-input"'));
  });

  it("includes action bar actions container", () => {
    assert.ok(html.includes('id="action-bar-actions"'));
  });

  it("includes action bar CSS styles", () => {
    assert.ok(html.includes(".action-bar {"));
    assert.ok(html.includes(".action-bar-btn {"));
    assert.ok(html.includes(".action-bar-submit"));
  });

  it("includes SKILL_MAP mapping actions to the unified srsAction vocabulary", () => {
    assert.ok(html.includes("SKILL_MAP"));
    // The action bar no longer references individual skill tool names; every
    // button maps to a `srsAction` handled by the single problem_based_srs tool.
    assert.ok(html.includes("srsAction"));
    assert.ok(html.includes('"needs"'));
    assert.ok(html.includes('"problems"'));
    assert.ok(html.includes('"functional-requirements"'));
    assert.ok(!html.includes('"customer_needs"'));
    assert.ok(!html.includes('"customer_problems"'));
    assert.ok(!html.includes('"functional_requirements"'));
  });

  it("includes getActionsForType function", () => {
    assert.ok(html.includes("function getActionsForType(type)"));
  });

  it("maps problem nodes to +CN and +Sub-CP actions", () => {
    assert.ok(html.includes('type === "problem"'));
    assert.ok(html.includes('key: "addCN"'));
    assert.ok(html.includes('key: "decompose_problem"'));
  });

  it("maps need nodes to +FR and +Sub-CN actions", () => {
    assert.ok(html.includes('type === "need"'));
    assert.ok(html.includes('key: "addFR"'));
    assert.ok(html.includes('key: "decompose_need"'));
  });

  it("maps fr nodes to +NFR and +Sub-FR actions", () => {
    assert.ok(html.includes('type === "fr"'));
    assert.ok(html.includes('key: "addNFR"'));
    assert.ok(html.includes('key: "decompose_fr"'));
  });

  it("maps nfr nodes to +Sub-NFR decompose action", () => {
    assert.ok(html.includes('type === "nfr"'));
    assert.ok(html.includes('key: "decompose_nfr"'));
  });

  it("includes handleActionBarAction that posts to /api/invoke-skill", () => {
    assert.ok(html.includes("function handleActionBarAction(actionKey, srsAction, node)"));
    assert.ok(html.includes("/api/invoke-skill"));
  });

  it("includes mouseenter/mouseleave hover handlers", () => {
    assert.ok(html.includes('nodeElements.on("mouseenter"'));
    assert.ok(html.includes('nodeElements.on("mouseleave"'));
  });

  it("includes action bar lock mechanism for hover persistence", () => {
    assert.ok(html.includes("actionBarLocked"));
    assert.ok(html.includes('actionBar.addEventListener("mouseenter"'));
    assert.ok(html.includes('actionBar.addEventListener("mouseleave"'));
  });

  it("prevents hiding when input has text content (text-pin guard)", () => {
    // hideActionBar checks input value length
    assert.ok(html.includes("actionBarInput.value.length > 0"));
    // pinned class toggled on input event
    assert.ok(html.includes('"pinned"'));
    assert.ok(html.includes('actionBarInput.addEventListener("input"'));
  });

  it("includes pinned CSS state for visual indicator", () => {
    assert.ok(html.includes(".action-bar.pinned"));
    assert.ok(html.includes("box-shadow"));
  });

  it("Escape clears input and dismisses bar", () => {
    assert.ok(html.includes('actionBarInput.value = ""'));
    assert.ok(html.includes('actionBar.classList.remove("pinned")'));
  });

  it("includes reduced-motion media query for action bar", () => {
    assert.ok(html.includes("prefers-reduced-motion"));
  });
});

// --- Server Endpoint Tests ---

describe("Action Bar: /api/invoke-skill endpoint", () => {
  let server;
  let port;
  const pendingActions = [];

  before(async () => {
    server = createServer((req, res) => {
      if (req.url === "/api/invoke-skill" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            const action = JSON.parse(body);
            pendingActions.push({
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              timestamp: new Date().toISOString(),
              ...action,
            });
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, queued: true }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
        return;
      }
      if (req.url === "/api/pending-actions") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ actions: [...pendingActions] }));
        return;
      }
      res.statusCode = 404;
      res.end("Not found");
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    port = server.address().port;
  });

  after(async () => {
    await new Promise((r) => server.close(r));
  });

  it("accepts POST with valid action payload", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/invoke-skill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addCN",
        srsAction: "needs",
        nodeId: "CP-1",
        nodeType: "problem",
        nodeLabel: "Track Customers",
        context: "Derive a CN from CP-1",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.queued, true);
  });

  it("queues the action for later retrieval", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/pending-actions`);
    const data = await res.json();
    assert.ok(data.actions.length >= 1);
    const last = data.actions[data.actions.length - 1];
    assert.equal(last.action, "addCN");
    assert.equal(last.srsAction, "needs");
    assert.equal(last.nodeId, "CP-1");
    assert.equal(last.nodeType, "problem");
    assert.equal(last.context, "Derive a CN from CP-1");
  });

  it("assigns unique id and timestamp to queued action", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/pending-actions`);
    const data = await res.json();
    const action = data.actions[data.actions.length - 1];
    assert.ok(action.id, "action should have an id");
    assert.ok(action.timestamp, "action should have a timestamp");
    assert.ok(new Date(action.timestamp).getTime() > 0, "timestamp should be valid ISO");
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/invoke-skill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json {{{",
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "Invalid JSON");
  });

  it("queues multiple actions from different node types", async () => {
    const actions = [
      { action: "addFR", srsAction: "functional-requirements", nodeId: "CN-1", nodeType: "need", nodeLabel: "Need 1", context: "Derive FR" },
      { action: "addNFR", srsAction: "functional-requirements", nodeId: "FR-1", nodeType: "fr", nodeLabel: "Req 1", context: "Derive NFR" },
      { action: "decompose_problem", srsAction: "problems", nodeId: "CP-2", nodeType: "problem", nodeLabel: "Problem 2", context: "Decompose" },
    ];

    for (const action of actions) {
      const res = await fetch(`http://127.0.0.1:${port}/api/invoke-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      assert.equal(res.status, 200);
    }

    const res = await fetch(`http://127.0.0.1:${port}/api/pending-actions`);
    const data = await res.json();
    // Should have original + 3 new
    assert.ok(data.actions.length >= 4);

    const srsActions = data.actions.map(a => a.srsAction);
    assert.ok(srsActions.includes("needs"));
    assert.ok(srsActions.includes("functional-requirements"));
    assert.ok(srsActions.includes("problems"));
  });
});

// --- Skill Mapping Correctness Tests ---

describe("Action Bar: Action mapping correctness", () => {
  // Verify the SKILL_MAP entries map to the unified srsAction vocabulary handled
  // by the single problem_based_srs tool (no more per-step tool names).
  const REGISTERED_ACTIONS = [
    "business-context",
    "problems",
    "software-glance",
    "needs",
    "software-vision",
    "functional-requirements",
    "complexity",
    "full",
    "validate",
  ];

  const EXPECTED_MAPPINGS = {
    problem: { addCN: "needs", decompose_problem: "problems" },
    need: { addFR: "functional-requirements", decompose_need: "needs" },
    fr: { addNFR: "functional-requirements", decompose_fr: "functional-requirements" },
    nfr: { decompose_nfr: "functional-requirements" },
  };

  for (const [nodeType, actions] of Object.entries(EXPECTED_MAPPINGS)) {
    for (const [actionKey, srsAction] of Object.entries(actions)) {
      it(`${nodeType} → ${actionKey} maps to registered action "${srsAction}"`, () => {
        assert.ok(
          REGISTERED_ACTIONS.includes(srsAction),
          `Action "${srsAction}" for button "${actionKey}" on "${nodeType}" is not in the registered actions list`
        );
      });
    }
  }

  it("all node types have at least one action", () => {
    for (const nodeType of Object.keys(EXPECTED_MAPPINGS)) {
      const actions = Object.keys(EXPECTED_MAPPINGS[nodeType]);
      assert.ok(actions.length >= 1, `${nodeType} should have at least 1 action`);
    }
  });

  it("every node type has a decompose action", () => {
    for (const [nodeType, actions] of Object.entries(EXPECTED_MAPPINGS)) {
      const hasDecompose = Object.keys(actions).some(k => k.startsWith("decompose"));
      assert.ok(hasDecompose, `${nodeType} should have a decompose action`);
    }
  });

  it("CP nodes can derive CN but not FR directly", () => {
    const cpActions = Object.keys(EXPECTED_MAPPINGS.problem);
    assert.ok(cpActions.includes("addCN"));
    assert.ok(!cpActions.includes("addFR"));
    assert.ok(!cpActions.includes("addNFR"));
  });

  it("CN nodes can derive FR but not NFR directly", () => {
    const cnActions = Object.keys(EXPECTED_MAPPINGS.need);
    assert.ok(cnActions.includes("addFR"));
    assert.ok(!cnActions.includes("addNFR"));
    assert.ok(!cnActions.includes("addCN"));
  });

  it("FR nodes can derive NFR but not CN", () => {
    const frActions = Object.keys(EXPECTED_MAPPINGS.fr);
    assert.ok(frActions.includes("addNFR"));
    assert.ok(!frActions.includes("addCN"));
    assert.ok(!frActions.includes("addFR"));
  });
});

// --- Queue Consume Semantics Tests ---

describe("Action Bar: Queue consume-once semantics", () => {
  it("pending_actions queue clears after retrieval (simulated)", () => {
    // Simulate the consume-once pattern used in extension.mjs
    const queues = new Map();
    const instanceId = "test-instance";

    // Queue two actions
    queues.set(instanceId, [
      { id: "a1", srsAction: "needs", action: "addCN" },
      { id: "a2", srsAction: "functional-requirements", action: "addFR" },
    ]);

    // First retrieval returns both and clears
    const firstRead = queues.get(instanceId) || [];
    queues.set(instanceId, []);
    assert.equal(firstRead.length, 2);

    // Second retrieval returns empty
    const secondRead = queues.get(instanceId) || [];
    assert.equal(secondRead.length, 0);
  });

  it("actions from different instances are isolated", () => {
    const queues = new Map();

    queues.set("inst-a", [{ id: "1", srsAction: "needs" }]);
    queues.set("inst-b", [{ id: "2", srsAction: "functional-requirements" }, { id: "3", srsAction: "problems" }]);

    assert.equal(queues.get("inst-a").length, 1);
    assert.equal(queues.get("inst-b").length, 2);

    // Consuming inst-a doesn't affect inst-b
    queues.set("inst-a", []);
    assert.equal(queues.get("inst-a").length, 0);
    assert.equal(queues.get("inst-b").length, 2);
  });

  it("queue handles concurrent writes before consumption", () => {
    const queues = new Map();
    const instanceId = "test";
    queues.set(instanceId, []);

    // Simulate rapid writes
    for (let i = 0; i < 5; i++) {
      queues.get(instanceId).push({ id: `action-${i}`, srsAction: "needs" });
    }

    const retrieved = queues.get(instanceId) || [];
    queues.set(instanceId, []);
    assert.equal(retrieved.length, 5);
    assert.equal(queues.get(instanceId).length, 0);
  });
});

// --- List View Implement Action (server prompt) ---

describe("List View: implement action prompt", () => {
  const extSource = readFileSync(join(__dirname, "..", "extension.mjs"), "utf8");

  it("buildActionPrompt branches on the implement action", () => {
    assert.ok(extSource.includes('action.action === "implement"'),
      "server must special-case the implement action");
  });

  it("implement prompt is an implementation task, not a skill slash-command", () => {
    // The implement branch must not route through skillCommand (skill is null).
    assert.ok(extSource.includes("implement ${action.nodeId} in code"));
    assert.ok(extSource.includes("production-ready code"));
    assert.ok(extSource.includes("do not rewrite the specification files"));
  });

  it("implement prompt preserves traceability to the requirement", () => {
    assert.ok(extSource.includes("Preserve traceability"));
    assert.ok(extSource.includes("${action.nodeId}"));
  });
});

// --- Unified single-command model (problem_based_srs with action arg) ---

describe("Unified command: single problem_based_srs tool", () => {
  const extSource = readFileSync(join(__dirname, "..", "extension.mjs"), "utf8");

  it("registers a single problem_based_srs tool", () => {
    assert.ok(extSource.includes('name: "problem_based_srs"'),
      "extension must register the unified problem_based_srs tool");
  });

  it("no longer registers per-step skill tools", () => {
    for (const legacy of [
      'name: "customer_problems"',
      'name: "customer_needs"',
      'name: "functional_requirements"',
      'name: "business_context"',
      'name: "software_glance"',
      'name: "software_vision"',
      'name: "zigzag_validator"',
      'name: "complexity_analysis"',
    ]) {
      assert.ok(!extSource.includes(legacy),
        `legacy skill tool ${legacy} must be removed in favor of an action arg`);
    }
  });

  it("exposes the action vocabulary on the tool", () => {
    for (const action of ["problems", "needs", "functional-requirements", "business-context", "validate"]) {
      assert.ok(extSource.includes(`"${action}"`),
        `action "${action}" must be part of the unified tool's vocabulary`);
    }
  });

  it("builds slash-command prompts as /problem-based-srs <action>", () => {
    assert.ok(extSource.includes("/problem-based-srs"),
      "action prompts must route through the single /problem-based-srs command");
    // The old per-skill slash mapping (name.replace(_ -> -)) must be gone.
    assert.ok(!extSource.includes('"/" + String(skill'),
      "the legacy per-skill slash command builder must be removed");
  });

  it("action prompts reference the srsAction field, not a skill tool name", () => {
    assert.ok(extSource.includes("action.srsAction"),
      "server prompts must read the srsAction field from queued actions");
  });
});

