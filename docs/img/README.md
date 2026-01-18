# Documentation Images

This folder contains rendered PNG diagrams used in the documentation website (`docs/index.html`).

## Diagrams

- **5-step-process.png** - The 5-step Problem-Based SRS methodology flowchart
- **development-workflow.png** - Development workflow integration diagram
- **problem-classification.png** - Customer problem classification by severity
- **artifact-traceability.png** - Artifact traceability between CP, CN, and FR

## Rendering Diagrams

The diagrams are generated from Mermaid markup definitions found in the README.md.

### Prerequisites

Install the Mermaid CLI globally:

```powershell
npm install -g @mermaid-js/mermaid-cli
```

### Rendering Process

1. Create `.mmd` files with Mermaid diagram definitions in this folder
2. Run the rendering script from the repository root:

```powershell
.\docs\helper\render-diagrams.ps1
```

This will convert all `.mmd` files to PNG format with transparent backgrounds.

3. Clean up temporary `.mmd` files:

```powershell
.\docs\helper\cleanup-mmd.ps1
```

### Manual Rendering

To render a single diagram manually:

```powershell
mmdc -i docs/img/diagram-name.mmd -o docs/img/diagram-name.png -b transparent
```

## Scripts

The helper scripts are located in `docs/helper/`:

- **render-diagrams.ps1** - Converts all .mmd files to PNG with transparent background
- **cleanup-mmd.ps1** - Removes temporary .mmd source files after rendering

## Updating Diagrams

When the README.md mermaid diagrams are updated:

1. Extract the mermaid code blocks and save as `.mmd` files
2. Run `render-diagrams.ps1`
3. Run `cleanup-mmd.ps1`
4. Verify the updated PNG files in the docs website
