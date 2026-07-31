// Every prompt the canvas sends to the agent, plus the predicates that decide
// whether a prompt is allowed to say what it says.
//
// These used to be `const`s inside extension.mjs, which imports
// `@github/copilot-sdk/extension` and therefore cannot be loaded by a unit test.
// That blind spot is not theoretical: the "Learn & Create Spec" button — the
// primary onboarding path — shipped a prompt telling the agent to derive a
// specification by scanning the workspace, which is precisely what the
// methodology's mandatory Discovery Interview forbids, and no suite could see it.
// Prompts live here so the guard asserts the value that actually ships.

// A prompt tells the agent to run the methodology when it invokes the single
// `problem_based_srs` tool / `/problem-based-srs` command. Those steps each carry
// a mandatory Discovery Interview.
export const RUNS_METHODOLOGY = /problem_based_srs|\/problem-based-srs/;

// A prompt reads repository material when it tells the agent to go look at the
// code, the README, or the docs for context.
export const READS_WORKSPACE =
    /\b(scan|scans|scanning|read|reads|reading|analy[sz]e\w*|inspect\w*|crawl\w*)\b[^.\n]{0,90}\b(workspace|repositor\w+|codebase|source code|README|documentation|docs)\b/i;

// The obligation such a prompt must carry: name the interview, and say the scan
// does not stand in for it.
export const NAMES_INTERVIEW = /Discovery Interview/;
export const DISCLAIMS_WAIVER =
    /\b(does not|doesn't|never|not a)\b[^.\n]{0,90}\b(waive|waiver|replace|substitute|satisfy|skip)\b/i;

/** True when the prompt asks the agent to run a methodology step. */
export function runsMethodology(text) {
    return RUNS_METHODOLOGY.test(String(text ?? ""));
}

/** True when the prompt asks the agent to read repository material for context. */
export function readsWorkspace(text) {
    return READS_WORKSPACE.test(String(text ?? ""));
}

/**
 * True when the prompt both names the mandatory Discovery Interview and states
 * that reading the repository does not waive it.
 */
export function carriesInterviewObligation(text) {
    const s = String(text ?? "");
    return NAMES_INTERVIEW.test(s) && DISCLAIMS_WAIVER.test(s);
}

/**
 * The rule: if you tell the agent to run the methodology over material it
 * scraped out of the repository, you must also tell it the scrape does not
 * waive the Discovery Interview. Returns the ids of prompts that break it.
 *
 * @param {Array<{id:string, text:string}>} prompts
 * @returns {string[]}
 */
export function promptsMissingInterviewObligation(prompts) {
    return (prompts ?? [])
        .filter((p) => runsMethodology(p.text) && readsWorkspace(p.text))
        .filter((p) => !carriesInterviewObligation(p.text))
        .map((p) => p.id);
}

// --- The prompts themselves -------------------------------------------------

// "Learn & Create Spec" — the primary landing action, and the documented answer
// to "I inherited a system with no spec". The workspace scan here is raw
// material for the interview, never a replacement for it: reference/problems.md
// states that a README or source code alone does NOT satisfy its Skip
// Conditions, so a prompt that told the agent to derive Customer Problems from a
// scan would be instructing it to break the methodology it just invoked.
export const LEARN_PROMPT = [
    "## Problem-Based SRS: Learn & Create Specification",
    "",
    "The user wants to create a Problem-Based SRS specification for their project.",
    "Use the `problem_based_srs` tool to run the full methodology.",
    "Scan the workspace for existing code, README, and documentation to gather evidence —",
    "schema and data volumes, recurring ticket themes, TODOs and workarounds, operational metrics.",
    "",
    "**The scan prepares the mandatory Discovery Interview; it does not waive it.** Repository",
    "material is evidence, not answers: it never satisfies the Skip Conditions in the methodology's",
    "`problems` step. Bring what you found back to the user as assert-then-confirm (\"the data shows",
    "X, so the consequence looks like Y — confirm or correct me\") and wait for the reply before",
    "writing Customer Problems. Do not infer a specification from the codebase on your own.",
    "",
    "**IMPORTANT:** After generating all the .spec/ markdown artifacts (customer problems, needs, requirements),",
    "you MUST also generate a consolidated JSON specification file at `.spec/<project-name>.json` with this shape:",
    '{ "name", "version", "problems":[{id,title,description}], "needs":[{id,title,description,problemIds}],',
    '  "functionalRequirements":[{id,title,description,needIds}], "nonFunctionalRequirements":[{id,title,description,needIds}] }',
    "",
    "**CRITICAL - Display the graph:** After creating the JSON file, use the `load_specification` canvas action",
    "with the ABSOLUTE file path to the JSON file. Do NOT skip this step — the graph will not auto-refresh without it.",
].join("\n");

export const LOAD_PROMPT = [
    "## Problem-Based SRS: Load Specification",
    "",
    "The user wants to load an existing specification file.",
    "Look for .spec/*.json files in the workspace, or ask the user which file to load.",
    "Then use the `load_specification` canvas action to display it.",
].join("\n");

/**
 * Map a methodology action (e.g. "needs") to its slash-command form. The whole
 * methodology is a single command; the action is passed as an argument, so
 * "full" (the default) is just `/problem-based-srs`.
 */
export function srsActionCommand(action) {
    const a = String(action || "full").trim() || "full";
    return a === "full" ? "/problem-based-srs" : `/problem-based-srs ${a}`;
}

/** Build the prompt sent by an action-bar button. */
export function buildActionPrompt(action) {
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

/**
 * Every static prompt the canvas can send, so a guard iterates the set instead
 * of naming one constant and missing the next one somebody adds.
 */
export const AGENT_PROMPTS = [
    { id: "learn", text: LEARN_PROMPT },
    { id: "load", text: LOAD_PROMPT },
];
