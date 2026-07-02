// Extension: srs-navigator
// Problem-Based SRS Navigator - Interactive graph visualization for software
// requirements specifications structured using the Problem-Based SRS methodology.
// Also provides Problem-Based SRS methodology skills as tools.

import { createServer } from "node:http";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

import { parseSpecificationData, buildGraphData, convertJSONToSpecificationData } from "./lib/parser.mjs";
import { validateSpecificationJSON, validateReferenceIntegrity } from "./lib/validation.mjs";
import { renderGraphHtml } from "./lib/renderer.mjs";
import { DEMO_SPEC } from "./lib/demo-spec.mjs";
import { compileAndSave } from "./lib/spec-compiler.mjs";
import { decomposeNode } from "./lib/decompose.mjs";
import { isTrustedLoopbackRequest } from "./lib/http-guard.mjs";

// Content fingerprint of a graph, used to detect *any* change to the loaded
// specification (not just node/link count changes) so the canvas can reload
// the graph whenever the underlying spec file is edited.
function graphSignature(graphData) {
    if (!graphData) return "";
    const norm = {
        nodes: (graphData.nodes || []).map((n) => ({
            id: n.id,
            type: n.type,
            label: n.label,
            complexity: n.complexity,
            data: n.data,
        })),
        links: (graphData.links || []).map((l) => ({
            s: typeof l.source === "object" ? l.source?.id : l.source,
            t: typeof l.target === "object" ? l.target?.id : l.target,
            type: l.type,
        })),
    };
    return createHash("sha1").update(JSON.stringify(norm)).digest("hex");
}

// Skills directory path
const __dirname = dirname(fileURLToPath(import.meta.url));

// Release/version of this canvas extension, read from its own package.json so it
// can be surfaced in the canvas description (visible when installing/inspecting).
const EXTENSION_VERSION = (() => {
    try {
        const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));
        return pkg.version || "unknown";
    } catch {
        return "unknown";
    }
})();

// Bundled flat copies of the methodology skills that ship inside this extension
// (used when the navigator is installed standalone outside the monorepo).
const bundledSkillsDir = resolve(__dirname, "skills");

// Canonical methodology skills. The navigator lives in the Problem-Based-SRS
// monorepo at <repoRoot>/.github/extensions/srs-navigator/, so the single source
// of truth is the consolidated skill at <repoRoot>/skills/problem-based-srs/:
// its SKILL.md is the orchestrator and reference/<action>.md holds each step. We
// read those live so the canvas always reflects the repo's skills without any
// copy/sync step. When installed standalone (e.g. via gist into another project)
// these paths won't resolve and we fall back to the bundled flat copies above.
const repoSkillDir = resolve(__dirname, "..", "..", "..", "skills", "problem-based-srs");
const repoReferenceDir = resolve(repoSkillDir, "reference");

// Load a methodology skill's markdown by its bundled file name (e.g.
// "business-context.md"). Prefers the canonical consolidated skill —
// skills/problem-based-srs/SKILL.md for the full orchestrator
// ("problem-based-srs.md") and skills/problem-based-srs/reference/<action>.md for
// each step — and falls back to the bundled flat file for standalone installs.
async function loadSkillContentByFile(file) {
    const canonical = file === "problem-based-srs.md"
        ? resolve(repoSkillDir, "SKILL.md")
        : resolve(repoReferenceDir, file);
    try {
        return await readFile(canonical, "utf-8");
    } catch {
        return await readFile(resolve(bundledSkillsDir, file), "utf-8");
    }
}

// Derive workspace root from extension location:
// Project extension: <workspace>/.github/extensions/srs-navigator/ → 3 levels up
// User extension: ~/.copilot/extensions/srs-navigator/ → fall back to process.cwd()
const isProjectExtension = __dirname.includes(".github");
const derivedWorkspacePath = isProjectExtension ? resolve(__dirname, "..", "..", "..") : null;

// Methodology action definitions. The Problem-Based SRS methodology is exposed
// through a SINGLE tool/command (`problem_based_srs` / `/problem-based-srs`) that
// dispatches to a step via an `action` argument, instead of one command per step.
// Each action maps to the canonical skill markdown that backs it.
const ACTIONS = [
    { action: "business-context", file: "business-context.md" },
    { action: "problems", file: "problems.md" },
    { action: "software-glance", file: "software-glance.md" },
    { action: "needs", file: "needs.md" },
    { action: "software-vision", file: "software-vision.md" },
    { action: "functional-requirements", file: "functional-requirements.md" },
    { action: "validate", file: "validate.md" },
    { action: "complexity", file: "complexity.md" },
    { action: "full", file: "problem-based-srs.md" },
];

// Resolve the backing skill file for an action, defaulting to the full
// orchestrator when the action is unknown or omitted.
function fileForAction(action) {
    const match = ACTIONS.find((a) => a.action === action);
    return (match || ACTIONS.find((a) => a.action === "full")).file;
}

// Map a methodology action (e.g. "needs") to its slash-command form. The whole
// methodology is a single command; the action is passed as an argument, so
// "full" (the default) is just `/problem-based-srs`.
function srsActionCommand(action) {
    const a = String(action || "full").trim() || "full";
    return a === "full" ? "/problem-based-srs" : `/problem-based-srs ${a}`;
}

// Build the single unified methodology tool. It replaces the former one-tool-per
// -step registry: callers select a step with the `action` argument.
function buildSrsTool() {
    return {
        name: "problem_based_srs",
        description:
            "Problem-Based SRS methodology — single entry point. Provide `action` to run a specific step: " +
            "`business-context`, `problems`, `software-glance`, `needs`, `software-vision`, " +
            "`functional-requirements`, `validate`, or `complexity`. Omit it (or use `full`) to run the " +
            "complete methodology from business problems to functional requirements with full traceability.",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ACTIONS.map((a) => a.action),
                    description:
                        "Which methodology step to run. Defaults to 'full' (complete orchestration).",
                },
                context: {
                    type: "string",
                    description:
                        "Optional: existing artifacts or business context to provide as input for this methodology step.",
                },
            },
        },
        handler: async (args) => {
            const content = await loadSkillContentByFile(fileForAction(args.action || "full"));
            let result = content;
            if (args.context) {
                result += `\n\n---\n\n## User-Provided Context\n\n${args.context}`;
            }
            return result;
        },
    };
}

// Per-instance state: server + loaded graph data
const instances = new Map();

// Pending action queues per instance (browser → agent communication)
const pendingActions = new Map();

function loadAndBuildGraph(specJSON) {
    const validation = validateSpecificationJSON(specJSON);
    if (!validation.success) {
        throw new CanvasError("invalid_spec", `Validation failed: ${validation.errors.join("; ")}`);
    }
    const specData = convertJSONToSpecificationData(validation.data);
    const graphData = buildGraphData(specData);
    if (!graphData.nodes.length) {
        throw new CanvasError("empty_spec", "No nodes could be created from the specification");
    }
    return { graphData, specData, specName: validation.data.name };
}

/**
 * Locally decompose a node into child items, rebuild the instance's graph and
 * HTML, and persist the result to the source file when one is known. Shared by
 * the `/api/decompose` route and the `decompose_node` canvas action so the
 * mutate-and-persist sequence lives in one place.
 *
 * Returns { nodeId, added, ids, nodeCount }. Throws if the node id is unknown.
 */
async function applyDecompose(entry, rawNodeId) {
    const nodeId = String(rawNodeId).toUpperCase();
    const baseSpec = graphToSpec(entry.graphData);
    const result = decomposeNode(baseSpec, nodeId);
    if (!result.added.length) {
        return { nodeId, added: 0, ids: [], nodeCount: entry.graphData.nodes.length };
    }

    const fullSpec = { name: entry.specName, version: "1.0", ...result.spec };
    const built = loadAndBuildGraph(fullSpec);
    entry.graphData = built.graphData;
    entry.html = renderGraphHtml(built.graphData, { title: entry.specName, isDemo: false });
    entry.isLanding = false;
    if (entry.sourceFilePath) {
        try { await writeFile(entry.sourceFilePath, JSON.stringify(fullSpec, null, 2), "utf-8"); } catch { /* best-effort persist */ }
    }
    return { nodeId, added: result.added.length, ids: result.added.map((i) => i.id), nodeCount: built.graphData.nodes.length };
}

/**
 * Scan for .spec folder in the workspace and load the first valid JSON spec found.
 * If no JSON exists but markdown artifacts do, compile them into JSON first.
 * Returns { graphData, specName, filePath } or null if no .spec folder or valid spec.
 */
async function loadFromSpecFolder(workspacePath) {
    if (!workspacePath) return null;
    const specDir = join(workspacePath, ".spec");
    try {
        const files = await readdir(specDir);
        const jsonFiles = files.filter(f => f.endsWith(".json")).sort();

        // Try existing JSON files first
        for (const file of jsonFiles) {
            try {
                const filePath = join(specDir, file);
                const content = await readFile(filePath, "utf-8");
                const json = JSON.parse(content);
                const validation = validateSpecificationJSON(json);
                if (!validation.success) continue;
                const specData = convertJSONToSpecificationData(validation.data);
                const graphData = buildGraphData(specData);
                if (!graphData.nodes.length) continue;
                return { graphData, specData, specName: validation.data.name, filePath };
            } catch {
                // Skip invalid files, try next
            }
        }

        // No valid JSON found — try compiling from markdown artifacts
        const compiledPath = await compileAndSave(specDir);
        if (compiledPath) {
            try {
                const content = await readFile(compiledPath, "utf-8");
                const json = JSON.parse(content);
                const validation = validateSpecificationJSON(json);
                if (validation.success) {
                    const specData = convertJSONToSpecificationData(validation.data);
                    const graphData = buildGraphData(specData);
                    if (graphData.nodes.length) {
                        return { graphData, specData, specName: validation.data.name, filePath: compiledPath };
                    }
                }
            } catch {
                // Compilation produced invalid output
            }
        }
    } catch {
        // .spec folder doesn't exist or can't be read
    }
    return null;
}

/**
 * Reload a canvas instance from the specification source it currently displays.
 *
 * The refresh button, the auto-refresh poll, and the idle hook all use this so
 * the canvas reloads from the SAME file the agent loaded (via load_specification
 * or open). It prefers the instance's tracked `sourceFilePath` and only falls
 * back to scanning the .spec/ folder when no source file is known. Returns true
 * when the loaded graph content actually changed.
 */
async function reloadInstanceFromSource(inst, workspacePath) {
    if (!inst) return false;

    let result = null;
    let hadSourceFile = false;
    if (inst.sourceFilePath) {
        hadSourceFile = true;
        try {
            const content = await readFile(inst.sourceFilePath, "utf-8");
            const json = JSON.parse(content);
            const built = loadAndBuildGraph(json);
            result = { graphData: built.graphData, specName: built.specName, filePath: inst.sourceFilePath };
        } catch {
            // Source file missing/invalid — fall back to a folder scan below
            result = null;
        }
    }

    if (!result) {
        // Only auto-discover from the .spec/ folder when we're still on the
        // landing view or our known source file disappeared. Never fall back for
        // an inline-loaded or demo spec (no source file) — that would clobber it.
        const allowFolderScan = inst.isLanding || hadSourceFile;
        if (allowFolderScan && workspacePath) {
            result = await loadFromSpecFolder(workspacePath);
        }
    }
    if (!result) return false;

    if (graphSignature(result.graphData) === graphSignature(inst.graphData)) {
        // Keep the source pointer fresh even when content is unchanged
        if (result.filePath) inst.sourceFilePath = result.filePath;
        return false;
    }

    inst.graphData = result.graphData;
    inst.specName = result.specName;
    inst.html = renderGraphHtml(result.graphData, { title: result.specName, isDemo: false });
    inst.isLanding = false;
    if (result.filePath) inst.sourceFilePath = result.filePath;
    return true;
}

// --- Agent prompts shared by the landing overlay and the graph action bar ---
const LEARN_PROMPT = [
    "## Problem-Based SRS: Learn & Create Specification",
    "",
    "The user wants to create a Problem-Based SRS specification for their project.",
    "Use the `problem_based_srs` tool to run the full methodology.",
    "Scan the workspace for existing code, README, and documentation to provide context.",
    "",
    "**IMPORTANT:** After generating all the .spec/ markdown artifacts (customer problems, needs, requirements),",
    "you MUST also generate a consolidated JSON specification file at `.spec/<project-name>.json` with this shape:",
    '{ "name", "version", "problems":[{id,title,description}], "needs":[{id,title,description,problemIds}],',
    '  "functionalRequirements":[{id,title,description,needIds}], "nonFunctionalRequirements":[{id,title,description,needIds}] }',
    "",
    "**CRITICAL - Display the graph:** After creating the JSON file, use the `load_specification` canvas action",
    "with the ABSOLUTE file path to the JSON file. Do NOT skip this step — the graph will not auto-refresh without it.",
].join("\n");

const LOAD_PROMPT = [
    "## Problem-Based SRS: Load Specification",
    "",
    "The user wants to load an existing specification file.",
    "Look for .spec/*.json files in the workspace, or ask the user which file to load.",
    "Then use the `load_specification` canvas action to display it.",
].join("\n");

// Map a methodology action (e.g. "needs") to its Problem-Based SRS slash-command
// form (e.g. "/problem-based-srs needs"). Taskbar actions must run the existing
// methodology, never improvised free-text instructions. (Defined near the ACTIONS
// registry as `srsActionCommand`.)

function buildActionPrompt(action) {
    // "Implement" is not a methodology step — it asks the agent to turn a
    // fully-specified requirement into real code, so it gets its own prompt
    // instead of a methodology slash-command.
    if (action.action === "implement") {
        const kind = action.nodeType === "nfr" ? "Non-Functional Requirement" : "Functional Requirement";
        return [
            `## Problem-Based SRS — implement ${action.nodeId} in code`,
            "",
            `Turn the following ${kind} into production-ready code in this repository.`,
            "",
            `**Target requirement:** ${action.nodeId} (${action.nodeType}) — "${action.nodeLabel}"`,
            `**Request:** ${action.context}`,
            "",
            "Steps:",
            "1. Read the specification in the `.spec/` folder to understand this requirement in full, including its parent Customer Needs and Customer Problems.",
            "2. Locate the relevant part of the codebase (or create it) and write real, working code that satisfies the requirement.",
            `3. Preserve traceability: reference ${action.nodeId} in code comments or the commit message so the implementation maps back to the spec.`,
            "4. Follow the repository's existing conventions, and add or update tests where the project already has them.",
            "",
            "This is an implementation task, not a requirements-authoring task — do not rewrite the specification files. When done, briefly summarize what you built and where.",
        ].join("\n");
    }
    const command = srsActionCommand(action.srsAction);
    return [
        `## Problem-Based SRS — run ${command}`,
        "",
        `Run the Problem-Based SRS **${command}** action (the \`problem_based_srs\` tool with \`action: "${action.srsAction}"\`) and follow its methodology exactly. Do not improvise a generic answer — the methodology defines the process you must use.`,
        "",
        `**Target node:** ${action.nodeId} (${action.nodeType}) — "${action.nodeLabel}"`,
        `**Request:** ${action.context}`,
        "",
        `Apply the ${command} action to the target node, using the request above as its input and preserving traceability to ${action.nodeId}. After the methodology updates the specification, use the \`load_specification\` canvas action to refresh the graph.`,
    ].join("\n");
}

const sendJson = (res, obj, status = 200) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
};

const readBody = (req) => new Promise((resolveBody) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => resolveBody(body));
});

// Single HTTP server used for both the landing overlay and the graph view.
// All instances share the same route table; the only per-instance difference
// is the fallback HTML and the resolved workspace path.
function createCanvasServer(instanceId, fallbackHtml, workspacePath) {
    return createServer((req, res) => {
        const inst = instances.get(instanceId);

        // Harden the loopback API against CSRF / DNS-rebinding: every /api/*
        // call must come from this server's own loopback origin. The page HTML
        // itself (no /api prefix) stays reachable for the initial canvas load.
        if (req.url.startsWith("/api/")) {
            const { host, origin, referer } = req.headers;
            if (!isTrustedLoopbackRequest({ host, origin, referer }, req.socket.localPort)) {
                return sendJson(res, { error: "forbidden" }, 403);
            }
        }

        if (req.url === "/api/check-spec" && req.method === "GET") {
            (async () => {
                try {
                    if (inst && !inst.isLanding) return sendJson(res, { found: true, specName: inst.specName });
                    const result = workspacePath ? await loadFromSpecFolder(workspacePath) : null;
                    if (inst && result) {
                        inst.graphData = result.graphData;
                        inst.specName = result.specName;
                        inst.html = renderGraphHtml(result.graphData, { title: result.specName, isDemo: false });
                        inst.isLanding = false;
                        inst.sourceFilePath = result.filePath || null;
                        return sendJson(res, { found: true, specName: result.specName });
                    }
                    sendJson(res, { found: false });
                } catch { sendJson(res, { found: false }); }
            })();
            return;
        }

        if (req.url === "/api/landing-action" && req.method === "POST") {
            (async () => {
                try {
                    const { action } = JSON.parse(await readBody(req));
                    if (action === "demo") {
                        const result = loadAndBuildGraph(DEMO_SPEC);
                        if (inst) {
                            inst.graphData = result.graphData;
                            inst.specName = result.specName;
                            inst.html = renderGraphHtml(result.graphData, { title: result.specName, isDemo: true });
                            inst.isLanding = false;
                        }
                        sendJson(res, { ok: true, reload: true });
                    } else if (action === "learn") {
                        await session.send({ prompt: LEARN_PROMPT });
                        sendJson(res, { ok: true, sent: true });
                    } else if (action === "load") {
                        await session.send({ prompt: LOAD_PROMPT });
                        sendJson(res, { ok: true, sent: true });
                    } else {
                        sendJson(res, { ok: false, error: "Unknown action" }, 400);
                    }
                } catch (e) { sendJson(res, { ok: false, error: e.message }, 500); }
            })();
            return;
        }

        if (req.url === "/api/invoke-skill" && req.method === "POST") {
            (async () => {
                try {
                    const action = JSON.parse(await readBody(req));
                    const actionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    await session.send({ prompt: buildActionPrompt(action) });
                    if (!pendingActions.has(instanceId)) pendingActions.set(instanceId, []);
                    pendingActions.get(instanceId).push({ id: actionId, timestamp: new Date().toISOString(), status: "sent", ...action });
                    sendJson(res, { ok: true, sent: true, actionId });
                } catch (e) {
                    const isJsonError = e instanceof SyntaxError;
                    sendJson(res, { ok: false, error: isJsonError ? "Invalid JSON" : "Failed to send to agent", detail: e.message }, isJsonError ? 400 : 500);
                }
            })();
            return;
        }

        if (req.url === "/api/decompose" && req.method === "POST") {
            (async () => {
                try {
                    const { nodeId } = JSON.parse(await readBody(req));
                    if (!inst || !nodeId) return sendJson(res, { ok: false, added: 0 });
                    const r = await applyDecompose(inst, nodeId);
                    sendJson(res, { ok: true, added: r.added, ids: r.ids });
                } catch (e) { sendJson(res, { ok: false, added: 0, error: e.message }, 400); }
            })();
            return;
        }

        if (req.url === "/api/pending-actions") {
            sendJson(res, { actions: pendingActions.get(instanceId) || [] });
            return;
        }

        if (req.url === "/api/refresh-spec" && req.method === "GET") {
            (async () => {
                try {
                    if (!inst) return sendJson(res, { refreshed: false });
                    await reloadInstanceFromSource(inst, workspacePath);
                    sendJson(res, {
                        refreshed: graphSignature(inst.graphData) !== (inst.servedSignature || ""),
                        specName: inst.specName,
                        nodeCount: inst.graphData?.nodes?.length || 0,
                        linkCount: inst.graphData?.links?.length || 0,
                    });
                } catch { sendJson(res, { refreshed: false }); }
            })();
            return;
        }

        if (req.url === "/api/state") {
            sendJson(res, {
                specName: inst?.specName || null,
                nodeCount: inst?.graphData?.nodes?.length || 0,
                linkCount: inst?.graphData?.links?.length || 0,
                isLanding: inst?.isLanding || false,
            });
            return;
        }

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        if (inst) inst.servedSignature = graphSignature(inst.graphData);
        res.end(inst?.html || fallbackHtml);
    });
}

const session = await joinSession({
    tools: [buildSrsTool()],
    canvases: [
        createCanvas({
            id: "srs-navigator",
            displayName: "Problem-Based SRS",
            description: `v${EXTENSION_VERSION} — Problem-Based SRS: interactive force-directed graph visualization for Problem-Based SRS specifications. Opens a canvas showing relationships between customer problems, needs, and requirements.`,
            inputSchema: {
                type: "object",
                properties: {
                    specification: {
                        type: "object",
                        description: "A Problem-Based SRS specification JSON object with name, version, problems, needs, functionalRequirements, and nonFunctionalRequirements arrays. If omitted, loads a demo CRM specification."
                    },
                    filePath: {
                        type: "string",
                        description: "Path to a specification JSON file to load. Takes precedence over inline specification."
                    }
                }
            },
            actions: [
                {
                    name: "load_specification",
                    description: "Load a new specification into the open canvas, replacing the current graph. Accepts JSON specification object or a file path.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            specification: { type: "object", description: "SRS specification JSON object" },
                            filePath: { type: "string", description: "Path to a specification JSON file" },
                            markdown: { type: "string", description: "Raw markdown specification text to parse" }
                        }
                    },
                    handler: async (ctx) => {
                        const entry = instances.get(ctx.instanceId);
                        if (!entry) throw new CanvasError("not_open", "Canvas instance not found");

                        let graphData, specName;
                        let sourceFilePath = null;

                        if (ctx.input?.filePath) {
                            const content = await readFile(ctx.input.filePath, "utf-8");
                            const json = JSON.parse(content);
                            const result = loadAndBuildGraph(json);
                            graphData = result.graphData;
                            specName = result.specName;
                            sourceFilePath = ctx.input.filePath;
                        } else if (ctx.input?.specification) {
                            const result = loadAndBuildGraph(ctx.input.specification);
                            graphData = result.graphData;
                            specName = result.specName;
                        } else if (ctx.input?.markdown) {
                            const specData = parseSpecificationData(ctx.input.markdown);
                            graphData = buildGraphData(specData);
                            specName = "Parsed Specification";
                            if (!graphData.nodes.length) {
                                throw new CanvasError("empty_spec", "No nodes found in markdown");
                            }
                        } else {
                            throw new CanvasError("missing_input", "Provide specification, filePath, or markdown");
                        }

                        // Rebuild the server HTML
                        const html = renderGraphHtml(graphData, { title: specName, isDemo: false });
                        entry.graphData = graphData;
                        entry.specName = specName;
                        entry.html = html;
                        entry.isLanding = false;
                        // Track the loaded file so the refresh button / poll reload the
                        // same source the agent loaded. In-memory specs clear the pointer.
                        entry.sourceFilePath = sourceFilePath;

                        return {
                            specName,
                            nodeCount: graphData.nodes.length,
                            linkCount: graphData.links.length,
                            summary: summarizeGraph(graphData)
                        };
                    }
                },
                {
                    name: "validate_specification",
                    description: "Validate a specification JSON object or file, returning validation and reference integrity results.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            specification: { type: "object", description: "SRS specification JSON object" },
                            filePath: { type: "string", description: "Path to a specification JSON file" }
                        }
                    },
                    handler: async (ctx) => {
                        let spec;
                        if (ctx.input?.filePath) {
                            const content = await readFile(ctx.input.filePath, "utf-8");
                            spec = JSON.parse(content);
                        } else if (ctx.input?.specification) {
                            spec = ctx.input.specification;
                        } else {
                            throw new CanvasError("missing_input", "Provide specification or filePath");
                        }

                        const schemaResult = validateSpecificationJSON(spec);
                        if (!schemaResult.success) {
                            return { valid: false, schemaErrors: schemaResult.errors, referenceErrors: [] };
                        }

                        const refResult = validateReferenceIntegrity(schemaResult.data);
                        return {
                            valid: refResult.valid !== false,
                            schemaErrors: [],
                            referenceErrors: refResult.valid === false ? refResult.errors : [],
                            summary: {
                                problems: schemaResult.data.problems.length,
                                needs: schemaResult.data.needs.length,
                                functionalRequirements: schemaResult.data.functionalRequirements.length,
                                nonFunctionalRequirements: schemaResult.data.nonFunctionalRequirements.length
                            }
                        };
                    }
                },
                {
                    name: "inspect_node",
                    description: "Get detailed information about a specific node by ID, including its connections and traceability.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            nodeId: { type: "string", description: "The node ID to inspect (e.g., CP-1, CN-2, FR-3, NFR-1)" }
                        },
                        required: ["nodeId"]
                    },
                    handler: async (ctx) => {
                        const entry = instances.get(ctx.instanceId);
                        if (!entry) throw new CanvasError("not_open", "Canvas instance not found");

                        const nodeId = ctx.input.nodeId.toUpperCase();
                        const node = entry.graphData.nodes.find(n => n.id === nodeId);
                        if (!node) throw new CanvasError("not_found", `Node ${nodeId} not found`);

                        const inbound = entry.graphData.links
                            .filter(l => (typeof l.target === 'string' ? l.target : l.target.id) === nodeId)
                            .map(l => ({ from: typeof l.source === 'string' ? l.source : l.source.id, type: l.type }));
                        const outbound = entry.graphData.links
                            .filter(l => (typeof l.source === 'string' ? l.source : l.source.id) === nodeId)
                            .map(l => ({ to: typeof l.target === 'string' ? l.target : l.target.id, type: l.type }));

                        return {
                            id: node.id,
                            type: node.type,
                            label: node.label,
                            description: node.data?.description || "",
                            complexity: node.complexity,
                            connections: { inbound, outbound },
                            totalConnections: inbound.length + outbound.length
                        };
                    }
                },
                {
                    name: "get_summary",
                    description: "Get a summary of the currently loaded specification graph.",
                    handler: async (ctx) => {
                        const entry = instances.get(ctx.instanceId);
                        if (!entry) throw new CanvasError("not_open", "Canvas instance not found");
                        return {
                            specName: entry.specName,
                            ...summarizeGraph(entry.graphData)
                        };
                    }
                },
                {
                    name: "search_nodes",
                    description: "Search nodes by ID or label text.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query to match against node IDs and labels" },
                            type: { type: "string", enum: ["problem", "need", "fr", "nfr"], description: "Optional: filter by node type" }
                        },
                        required: ["query"]
                    },
                    handler: async (ctx) => {
                        const entry = instances.get(ctx.instanceId);
                        if (!entry) throw new CanvasError("not_open", "Canvas instance not found");

                        const query = (ctx.input.query || "").toLowerCase();
                        let results = entry.graphData.nodes.filter(n =>
                            n.id.toLowerCase().includes(query) || n.label.toLowerCase().includes(query)
                        );
                        if (ctx.input.type) {
                            results = results.filter(n => n.type === ctx.input.type);
                        }

                        return {
                            count: results.length,
                            results: results.slice(0, 50).map(n => ({
                                id: n.id, type: n.type, label: n.label
                            }))
                        };
                    }
                },
                {
                    name: "pending_actions",
                    description: "Retrieve and consume pending actions queued from the canvas UI. When an engineer clicks an action button on a node (e.g., +CN, +FR, +NFR, decompose), the action is queued here with its methodology action and context. The agent should invoke the problem_based_srs tool with the provided action and context. Returns the queue and clears it.",
                    handler: async (ctx) => {
                        const queue = pendingActions.get(ctx.instanceId) || [];
                        // Clear the queue after retrieval
                        pendingActions.set(ctx.instanceId, []);

                        if (queue.length === 0) {
                            return { actions: [], message: "No pending actions" };
                        }

                        // Enrich each action with methodology instructions
                        const enriched = await Promise.all(queue.map(async (action) => {
                            let skillContent = "";
                            try {
                                skillContent = await loadSkillContentByFile(fileForAction(action.srsAction));
                            } catch { /* skill file read failure is non-fatal */ }

                            return {
                                ...action,
                                instruction: `Run the Problem-Based SRS ${srsActionCommand(action.srsAction)} action (the "problem_based_srs" tool with action "${action.srsAction}") and follow its methodology exactly — do not improvise. Apply it to ${action.nodeId} using this request as input:\n\n${action.context}`,
                                skillContent,
                            };
                        }));

                        return {
                            actions: enriched,
                            message: `${enriched.length} action(s) ready. For each action, run the Problem-Based SRS methodology action named in its instruction with the provided context — do not improvise generic answers.`,
                        };
                    }
                },
                {
                    name: "learn",
                    description: "Trigger the Problem-Based SRS methodology to scan the project and generate a specification. This is the primary onboarding action for projects without an existing spec.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            context: {
                                type: "string",
                                description: "Optional additional context about the project to help guide spec generation."
                            }
                        }
                    },
                    handler: async (ctx) => {
                        const entry = instances.get(ctx.instanceId);
                        if (!entry) throw new CanvasError("not_open", "Canvas instance not found");

                        const skillContent = await loadSkillContentByFile("problem-based-srs.md");

                        let result = skillContent;
                        if (ctx.input?.context) {
                            result += `\n\n---\n\n## User-Provided Context\n\n${ctx.input.context}`;
                        }

                        return {
                            instruction: "Use the `problem_based_srs` tool to run the full methodology. After generating the .spec/ markdown artifacts AND the JSON file, you MUST use the `load_specification` canvas action with the ABSOLUTE filePath to the JSON file to display the graph in the navigator. The graph will NOT auto-refresh without this explicit action.",
                            skillContent: result,
                            message: "Learn action triggered. Run the problem_based_srs methodology and load the result into the canvas."
                        };
                    }
                },
                {
                    name: "compile_spec",
                    description: "Compile .spec/ markdown artifacts into a JSON specification file and load the result into the graph. Use after the problem_based_srs methodology has generated markdown files but no JSON exists yet.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            specDir: {
                                type: "string",
                                description: "Optional path to the .spec directory. Defaults to .spec/ in the workspace root."
                            }
                        }
                    },
                    handler: async (ctx) => {
                        const entry = instances.get(ctx.instanceId);
                        if (!entry) throw new CanvasError("not_open", "Canvas instance not found");

                        const workspacePath = derivedWorkspacePath || session.workspacePath || process.env.COPILOT_WORKSPACE_PATH || process.cwd();
                        const specDir = ctx.input?.specDir || join(workspacePath, ".spec");

                        const filePath = await compileAndSave(specDir);
                        if (!filePath) {
                            throw new CanvasError("compile_failed", "Could not compile specification from .spec/ folder. Ensure at least customer problems (01-customer-problems.md) or customer needs (03-customer-needs.md) exist.");
                        }

                        // Load the compiled JSON into the graph
                        const content = await readFile(filePath, "utf-8");
                        const json = JSON.parse(content);
                        const result = loadAndBuildGraph(json);

                        const html = renderGraphHtml(result.graphData, { title: result.specName, isDemo: false });
                        entry.graphData = result.graphData;
                        entry.specName = result.specName;
                        entry.html = html;
                        entry.isLanding = false;
                        entry.sourceFilePath = filePath;

                        return {
                            specName: result.specName,
                            filePath,
                            nodeCount: result.graphData.nodes.length,
                            linkCount: result.graphData.links.length,
                            summary: summarizeGraph(result.graphData),
                            message: `Compiled and loaded specification from ${filePath}`
                        };
                    }
                },
                {
                    name: "decompose_node",
                    description: "Locally split a node into child requirements from its description sentences — no model round-trip. Fast iteration for breaking a CP/CN/FR/NFR into smaller items. Updates the loaded graph and persists to the source JSON file when known.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            nodeId: { type: "string", description: "The node ID to decompose (e.g., FR-1, CN-2)" }
                        },
                        required: ["nodeId"]
                    },
                    handler: async (ctx) => {
                        const entry = instances.get(ctx.instanceId);
                        if (!entry) throw new CanvasError("not_open", "Canvas instance not found");

                        let r;
                        try {
                            r = await applyDecompose(entry, ctx.input.nodeId);
                        } catch (e) {
                            throw new CanvasError("not_found", e.message);
                        }
                        if (!r.added) {
                            return { added: 0, message: `Node ${r.nodeId} has no decomposable sub-items` };
                        }
                        return {
                            added: r.added,
                            ids: r.ids,
                            nodeCount: r.nodeCount,
                            message: `Decomposed ${r.nodeId} into ${r.added} item(s) locally`
                        };
                    }
                }
            ],
            open: async (ctx) => {
                let entry = instances.get(ctx.instanceId);
                if (entry) {
                    return { title: `SRS: ${entry.specName}`, url: entry.url };
                }

                let graphData, specName;
                let isDemo = false;
                let sourceFilePath = null;
                const input = ctx.input || {};

                if (input.filePath) {
                    const content = await readFile(input.filePath, "utf-8");
                    const json = JSON.parse(content);
                    const result = loadAndBuildGraph(json);
                    graphData = result.graphData;
                    specName = result.specName;
                    sourceFilePath = input.filePath;
                } else if (input.specification) {
                    const result = loadAndBuildGraph(input.specification);
                    graphData = result.graphData;
                    specName = result.specName;
                } else {
                    // Try loading from .spec folder in the workspace first
                    // Priority: derivedWorkspacePath (project ext) > ctx.host > env vars > session cwd (unreliable)
                    const workspacePath = derivedWorkspacePath || ctx.host?.workspacePath || process.env.COPILOT_WORKSPACE_PATH || "";
                    let fromFolder = null;
                    if (workspacePath) {
                        try {
                            fromFolder = await loadFromSpecFolder(workspacePath);
                        } catch (e) {
                            // Log error but don't crash — show landing page instead
                            try { session.log(`[srs-nav] loadFromSpecFolder error: ${e.message}`); } catch {}
                        }
                    }
                    if (fromFolder) {
                        graphData = fromFolder.graphData;
                        specName = fromFolder.specName;
                        sourceFilePath = fromFolder.filePath || null;
                    } else {
                        // No spec found — show landing overlay on top of demo graph
                        const demoResult = loadAndBuildGraph(DEMO_SPEC);
                        const landingHtml = renderGraphHtml(demoResult.graphData, {
                            title: demoResult.specName,
                            isDemo: true,
                            showLanding: true
                        });
                        const workspacePathResolved = derivedWorkspacePath || ctx.host?.workspacePath || process.env.COPILOT_WORKSPACE_PATH || "";

                        const server = createCanvasServer(ctx.instanceId, landingHtml, workspacePathResolved);

                        await new Promise((r) => server.listen(0, "127.0.0.1", r));
                        const url = `http://127.0.0.1:${server.address().port}/`;

                        instances.set(ctx.instanceId, { server, url, html: landingHtml, graphData: demoResult.graphData, specName: demoResult.specName, isLanding: true });

                        return { title: "Problem-Based SRS", url };
                    }
                }

                const html = renderGraphHtml(graphData, {
                    title: specName,
                    isDemo
                });

                const wp = derivedWorkspacePath || ctx.host?.workspacePath || process.env.COPILOT_WORKSPACE_PATH || "";
                const server = createCanvasServer(ctx.instanceId, html, wp);

                await new Promise((r) => server.listen(0, "127.0.0.1", r));
                const url = `http://127.0.0.1:${server.address().port}/`;

                instances.set(ctx.instanceId, { server, url, html, graphData, specName, sourceFilePath });

                return { title: `SRS: ${specName}`, url };
            },
            onClose: async (ctx) => {
                const entry = instances.get(ctx.instanceId);
                if (entry) {
                    instances.delete(ctx.instanceId);
                    pendingActions.delete(ctx.instanceId);
                    await new Promise((r) => entry.server.close(() => r()));
                }
            },
        }),
    ],
});

// Reconstruct a spec object (problems/needs/FR/NFR) from in-memory graph data.
// Used by decompose_node to operate on the displayed graph without re-reading disk.
function graphToSpec(graphData) {
    const spec = { problems: [], needs: [], functionalRequirements: [], nonFunctionalRequirements: [] };
    const byType = { problem: spec.problems, need: spec.needs, fr: spec.functionalRequirements, nfr: spec.nonFunctionalRequirements };
    for (const node of graphData.nodes) {
        const bucket = byType[node.type];
        if (bucket) bucket.push({ ...node.data, id: node.id, title: node.label });
    }
    return spec;
}

function summarizeGraph(graphData) {
    const types = { problem: 0, need: 0, fr: 0, nfr: 0 };
    for (const node of graphData.nodes) {
        if (types[node.type] !== undefined) types[node.type]++;
    }
    return {
        totalNodes: graphData.nodes.length,
        totalLinks: graphData.links.length,
        problems: types.problem,
        needs: types.need,
        functionalRequirements: types.fr,
        nonFunctionalRequirements: types.nfr
    };
}

// Completion hook: when the agent finishes a turn (e.g. after an action-bar
// request runs a skill that edits the spec), reload every open canvas from its
// source so the UI reflects the change even when the agent did not explicitly
// call the load_specification action. The browser's auto-refresh poll then
// reloads the graph. We never call session.send() here, so reacting to the
// agent finishing cannot trigger another agent turn (no feedback loop).
let idleRefreshRunning = false;
session.on("session.idle", () => {
    if (idleRefreshRunning) return;
    idleRefreshRunning = true;
    (async () => {
        const wp = derivedWorkspacePath || session.workspacePath || process.env.COPILOT_WORKSPACE_PATH || "";
        for (const inst of instances.values()) {
            try {
                const changed = await reloadInstanceFromSource(inst, wp);
                if (changed) {
                    try {
                        session.log(`[srs-nav] Spec changed — refreshing canvas: ${inst.specName}`, { ephemeral: true });
                    } catch { /* logging is best-effort */ }
                }
            } catch { /* ignore per-instance refresh errors */ }
        }
    })().finally(() => { idleRefreshRunning = false; });
});
