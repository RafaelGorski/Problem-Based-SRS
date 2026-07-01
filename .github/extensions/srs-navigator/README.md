# SRS Navigator Canvas Extension

An interactive force-directed graph visualization for **Problem-Based SRS** specifications, running as a GitHub Copilot (GHCP) canvas extension.

![SRS Navigator Screenshot](docs/screenshot.png)

## Features

- **Learn from your codebase** — Open the navigator without a spec and it offers to scan your code, README, and docs to draft a Problem-Based SRS automatically
- **Interactive D3.js graph** — Force-directed layout showing relationships between problems, needs, and requirements
- **Search & filter** — Find nodes by ID or label text, toggle node types via the legend
- **Detail panel** — Click any node to see its full description and connections
- **Graph/Hierarchy views** — Toggle between force-directed graph and hierarchical layout
- **Zoom controls** — Zoom in/out and reset the viewport
- **Agent actions** — Load specs, validate, inspect nodes, and search programmatically

## Installation

### Method 1: Install from Gist (Recommended)

If this extension has been shared as a gist, you can install it directly in the GitHub Copilot app:

1. Open the **GitHub Copilot** app (desktop or CLI)
2. Open the **Command Palette** (Ctrl+Shift+P / Cmd+Shift+P)
3. Search for **"Install extension from gist…"**
4. Paste the gist URL when prompted
5. Choose the installation scope:
   - **Project** — installs to `.github/extensions/srs-navigator/` in your repo (shared with team)
   - **User** — installs to `~/.copilot/extensions/srs-navigator/` (personal, all projects)
   - **Session** — installs for the current session only (temporary)
6. The extension loads automatically — no restart needed

Alternatively, ask the Copilot agent directly:

```
Install the SRS Navigator extension from gist: <gist-url>
```

### Method 2: Install via `install_extension` Tool

In any Copilot CLI session, use the `install_extension` tool:

```
install_extension({ url: "<gist-url-or-repo-folder-url>", scope: "user" })
```

Supported URL formats:
- **Gist URL**: `https://gist.github.com/<user>/<gist-id>`
- **Repo folder URL**: `https://github.com/RafaelGorski/Problem-Based-SRS/tree/main/.github/extensions/srs-navigator`

### Method 3: Copy into Your Repository

Copy the `.github/extensions/srs-navigator/` folder into your own repo:

```
your-repo/
└── .github/
    └── extensions/
        └── srs-navigator/
            ├── extension.mjs
            ├── copilot-extension.json
            ├── README.md
            ├── docs/
            │   └── screenshot.png
            ├── lib/
            │   ├── parser.mjs
            │   ├── validation.mjs
            │   ├── renderer.mjs
            │   └── demo-spec.mjs
            └── tests/
                ├── parser.test.mjs
                ├── validation.test.mjs
                ├── renderer.test.mjs
                └── integration.test.mjs
```

Once committed, the extension is automatically available to everyone working on the repo.

### Method 4: Share from the GHCP App

If you already have the extension installed and want to share it:

1. Open the **Command Palette** (Ctrl+Shift+P / Cmd+Shift+P)
2. Search for **"Share extension as gist…"**
3. Select **srs-navigator**
4. A private gist is created with all extension files
5. Share the gist URL with your team

Or ask the agent:

```
Share the srs-navigator extension as a gist
```

## Verifying Installation

After installing, verify the extension loaded:

1. Open a Copilot session in the project
2. The agent should list `srs-navigator` as an available canvas
3. Ask the agent: *"Open the SRS Navigator canvas"*
4. The canvas panel should appear with the demo CRM System specification

If the canvas doesn't appear, check:
- Run `extensions_manage({ operation: "list" })` to see loaded extensions
- Run `extensions_manage({ operation: "inspect", name: "srs-navigator" })` for logs

## Usage

Once installed, the canvas is available as `srs-navigator` in any Copilot CLI session.

### Opening the Canvas

Simply ask the Copilot agent:

```
Open the SRS Navigator to visualize my specification
```

Or the agent can open it programmatically:

```
open_canvas({ canvasId: "srs-navigator", instanceId: "my-srs" })
```

With a specification file:

```
open_canvas({ 
  canvasId: "srs-navigator", 
  instanceId: "my-srs",
  input: { filePath: "./path/to/spec.json" }
})
```

### Available Actions

| Action | Description |
|--------|-------------|
| `learn` | Scan the project (code, README, docs) and generate a specification from scratch — the onboarding action for projects without a spec |
| `load_specification` | Load a new spec (JSON object, file path, or markdown) |
| `validate_specification` | Validate a spec against schema and reference integrity |
| `inspect_node` | Get details about a specific node by ID |
| `get_summary` | Get node/link counts for the loaded spec |
| `search_nodes` | Search nodes by ID or label text |
| `decompose_node` | Split a node into child requirements locally (no model round-trip) |

## Start from your current system

Most specifications are written for software that already exists. When you open the
SRS Navigator and no specification is loaded, the start screen offers three ways in:

| Action | What it does |
|--------|--------------|
| **Learn & Create Spec** | Scans your project and generates a specification |
| **Load Specification** | Opens an existing `.spec` JSON file from your project |
| **Explore Demo** | Loads the CRM sample specification to explore features |

**Learn & Create Spec** is the primary onboarding path. It reads your existing code,
README, and documentation, runs the full Problem-Based SRS methodology (`problem_based_srs`)
to work backward from the system to the customer problems it solves, writes the resulting
artifacts to your `.spec/` folder, and loads them as an interactive graph. You then refine
the draft with the agent using the action bar (`+CN`, `+FR`, `decompose`, and so on). It is
the same path the `learn` agent action triggers programmatically.

## Architecture & Agent Integration

The canvas runs as a local HTTP server (one per instance) whose page is rendered in the Copilot side panel. The **action bar** in the graph UI talks to the agent, the agent edits the specification files in the repo, and the canvas **auto-reloads** the graph when the spec changes — no re-installation or re-download of the extension is involved.

### Action bar ⇄ agent flow

```mermaid
sequenceDiagram
    actor User
    participant Bar as Action Bar (canvas UI)
    participant Srv as Extension HTTP Server
    participant Agent as Copilot Agent
    participant Spec as .spec/*.json (repo)

    User->>Bar: Click +CN / +FR / decompose (with optional prompt)
    Bar->>Srv: POST /api/invoke-skill (node + context)
    Srv->>Agent: session.send(prompt → run skill)
    Srv-->>Bar: { ok: true }
    Note over Bar: Toast: "Agent processing…"

    Agent->>Agent: Run Problem-Based SRS skill
    Agent->>Spec: Write / update specification file
    opt Agent confirms display
        Agent->>Srv: load_specification canvas action
        Note over Srv: Server records sourceFilePath
    end

    Agent-->>Srv: session.idle (turn complete)
    Note over Srv: Idle hook reloads every instance<br/>from its sourceFilePath (no session.send → no loop)

    loop Every 3s (auto-refresh poll)
        Bar->>Srv: GET /api/refresh-spec
        Srv->>Spec: Re-read from sourceFilePath (same file the agent loaded)
        Srv->>Srv: Compare content fingerprint vs displayed
        Srv-->>Bar: { refreshed: true | false }
    end

    Bar->>Bar: window.location.reload()
    Bar->>Srv: GET / (fresh HTML with new graph)
    Srv-->>Bar: Updated graph
    Note over User,Bar: Graph updates in place — no re-install
```

### Component view

```mermaid
flowchart LR
    subgraph Panel["Copilot Side Panel (webview)"]
        UI["D3 Graph + Action Bar"]
    end
    subgraph Ext["srs-navigator extension process"]
        Server["HTTP server<br/>/api/invoke-skill<br/>/api/refresh-spec"]
        Canvas["createCanvas()<br/>open + actions"]
        Skills["Methodology skills<br/>(repo skills/ or bundled, read-only)"]
    end
    Agent["Copilot Agent / Session"]
    Repo[(".spec/ JSON + markdown")]

    UI -- "fetch /api/*" --> Server
    Server -- "session.send()" --> Agent
    Agent -- "session.idle hook" --> Server
    Agent -- "edits files" --> Repo
    Server -- "reads sourceFilePath on poll/idle" --> Repo
    Canvas -- "load_specification" --> Server
    Canvas --- Skills
    Server -- "serves graph HTML" --> UI
```

**Key design points:**

- **Content-based refresh.** `/api/refresh-spec` compares a fingerprint of the loaded graph against what the browser currently displays, so the canvas reloads on *any* spec change — not only when node/link counts differ.
- **Source-aligned refresh.** The refresh button, the auto-refresh poll, and the idle hook all reload through one helper (`reloadInstanceFromSource`) that re-reads the **same file the agent loaded** (the instance's tracked `sourceFilePath`), only falling back to a `.spec/` folder scan when no source file is known. This keeps the manual refresh button in lock-step with what `load_specification` shows.
- **Idle completion hook.** The extension listens for `session.idle`; when the agent finishes a turn it reloads every open canvas from its source so the UI reflects spec edits even if the agent never called `load_specification`. The hook never calls `session.send()`, so it cannot trigger another agent turn (no feedback loop) — the browser's 3s poll then performs the actual reload.
- **Continuous polling.** The live graph polls every 3s and reloads itself when the spec changes, whether the agent edits `.spec/` directly or calls the `load_specification` action.
- **Single source of truth for skills.** Inside the Problem-Based-SRS monorepo the extension reads the methodology skills **live** from the repo's canonical `skills/<slug>/SKILL.md`, so there is no copy to keep up to date. When the extension is installed standalone (gist/user install) it falls back to the flat `skills/*.md` copies bundled in the extension. Either way the skills are read locally — the extension never downloads skill files at runtime, so opening the canvas never triggers an extension re-install / "downloaded" notification. The bundled copies are regenerated from the canonical skills at packaging time via `npm run sync-skills`.

### Specification Format

The extension accepts specifications in the Problem-Based SRS JSON format:

```json
{
  "name": "My System",
  "description": "System description",
  "version": "1.0",
  "problems": [
    { "id": "CP-1", "title": "...", "description": "..." }
  ],
  "needs": [
    { "id": "CN-1", "title": "...", "description": "...", "problemIds": ["CP-1"] }
  ],
  "functionalRequirements": [
    { "id": "FR-1", "title": "...", "description": "...", "needIds": ["CN-1"] }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-1", "title": "...", "description": "...", "needIds": ["CN-1"] }
  ]
}
```

## Testing

Run the test suite with Node.js built-in test runner:

```bash
cd .github/extensions/srs-navigator
node --test tests/parser.test.mjs tests/validation.test.mjs tests/renderer.test.mjs tests/action-bar.test.mjs tests/integration.test.mjs tests/decompose.test.mjs
```

Expected output: **125 tests passing** across the parser, validation, renderer, action-bar, integration, and decompose suites. (The Playwright-based `visual.test.mjs` runs separately via `npm run test:e2e`.)

## Requirements

- **GitHub Copilot** app (desktop) or **Copilot CLI** v1.0+
- **Node.js** v18+ (auto-provided by the Copilot runtime)
- No additional dependencies required (`@github/copilot-sdk` is auto-resolved)

## Related

- [Problem-Based SRS Methodology](https://github.com/RafaelGorski/Problem-Based-SRS)
- [Problem-Based SRS Navigator (original web app)](https://github.com/RafaelGorski/problem-based-srs-na)
