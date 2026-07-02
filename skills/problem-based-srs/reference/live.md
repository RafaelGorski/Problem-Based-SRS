# Live — Launch the SRS Navigator Canvas

Open the **SRS Navigator** canvas extension in the GitHub Copilot app side panel and
render the current Problem-Based SRS specification as an interactive, force-directed
graph. This is the UX layer for navigating the artifacts produced by the methodology
skills (`business-context` → `customer-problems` → … → `functional-requirements`).

The canvas extension ships in this repository at
`.github/extensions/srs-navigator/` and registers a canvas with id **`srs-navigator`**
plus the full methodology as agent tools.

## When to use

- The user types `/live`.
- The user asks to "open", "launch", "show", "visualize", "navigate", or "render" the
  specification, traceability, or requirements graph.
- After running methodology steps, to inspect the problem → need → requirement chain
  visually instead of reading markdown.

## How to launch

1. **Locate a specification to display.** Look, in order, for:
   - A JSON spec under `.spec/*.json` in the workspace (e.g. `.spec/crm-system.json`).
   - Markdown artifacts under `.spec/` (`01-customer-problems.md`, `03-customer-needs.md`,
     `functional-requirements/`, …). If only markdown exists, compile it to a JSON spec
     first (the extension's `problem_based_srs` / spec tooling can produce a
     `.spec/<name>.json`), then load that file.
   - Nothing yet — open the canvas with the built-in **CRM demo** so the user sees the
     navigator immediately, then offer to generate a real spec.

2. **Open the canvas.** Use the `open_canvas` tool with:
   - `canvasId`: `srs-navigator`
   - `instanceId`: a stable handle for this panel (e.g. `srs-navigator-1`)
   - `input`:
     - `filePath`: absolute path to the chosen `.spec/*.json` (preferred), **or**
     - `specification`: an inline spec JSON object, **or**
     - omit both to load the demo CRM specification.
     - `analysisMode` (optional): `all` (default), `customer-problem` (problems + needs),
       or `implementation` (needs + requirements).

3. **Update the graph as the spec changes.** After editing or regenerating the spec,
   invoke the canvas `load_specification` action on the same `instanceId` with the
   absolute `filePath` to the JSON file. The graph does **not** auto-refresh without this
   explicit action.

## Specification shape

The navigator expects a JSON object with these arrays (see
`.spec/crm-system.json` for a complete example):

```jsonc
{
  "name": "My System",
  "version": "1.0",
  "problems": [ { "id": "CP.01", "label": "…", "description": "…" } ],
  "needs": [ { "id": "CN.01.1", "label": "…", "problem": "CP.01" } ],
  "functionalRequirements": [ { "id": "FR.01.1.1", "label": "…", "need": "CN.01.1" } ],
  "nonFunctionalRequirements": [ { "id": "NFR.1.0", "label": "…" } ]
}
```

Traceability links are derived from the `problem` / `need` references, so keep IDs
consistent with the methodology naming convention (`CP → CN → FR`).

## Notes

- The canvas runs entirely inside the Copilot app on a loopback HTTP server — nothing
  leaves the machine.
- If the `srs-navigator` canvas is not available, the extension may not be installed in
  the current scope. It lives at `.github/extensions/srs-navigator/`; reload extensions
  so the `srs-navigator` canvas and its tools are registered, then retry `open_canvas`.
- This skill only handles **visualization**. To create or refine the underlying
  artifacts, use the `/problem-based-srs` command (e.g. `/problem-based-srs problems`).
