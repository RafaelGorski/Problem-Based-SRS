# Documentation Helper Scripts

This folder contains PowerShell helper scripts for maintaining the Problem-Based SRS documentation.

## Available Scripts

### render-diagrams.ps1

Converts all Mermaid diagram files (`.mmd`) in `docs/img/` to PNG format with transparent backgrounds.

**Usage:**
```powershell
.\docs\helper\render-diagrams.ps1
```

**Prerequisites:**
- Mermaid CLI must be installed: `npm install -g @mermaid-js/mermaid-cli`

**What it does:**
1. Scans `docs/img/` for all `.mmd` files
2. Renders each file to PNG with transparent background using `mmdc`
3. Reports success/failure for each diagram
4. Lists all generated PNG files with timestamps

**Example output:**
```
Rendering 4 mermaid diagram(s)...
Rendering 5-step-process.mmd -> 5-step-process.png
✓ Successfully rendered 5-step-process.png
...
Rendering complete!
```

---

### cleanup-mmd.ps1

Removes temporary Mermaid source files (`.mmd`) from `docs/img/` after rendering is complete.

**Usage:**
```powershell
.\docs\helper\cleanup-mmd.ps1
```

**What it does:**
1. Finds all `.mmd` files in `docs/img/`
2. Deletes each `.mmd` file
3. Lists remaining files in the folder

**Example output:**
```
Cleaning up 4 .mmd file(s)...
✓ Removed 5-step-process.mmd
...
Cleanup complete!
```

---

## Typical Workflow

When updating diagrams from README.md:

1. Extract mermaid code blocks and save as `.mmd` files in `docs/img/`
2. Run `.\docs\helper\render-diagrams.ps1` to generate PNGs
3. Run `.\docs\helper\cleanup-mmd.ps1` to remove temporary files
4. Update `docs/index.html` to use the new PNG files
5. Commit the PNG files (not the .mmd files)

## Notes

- Scripts use absolute paths, so they can be run from any directory
- Both scripts provide colored console output (green for success, red for errors)
- Scripts will exit gracefully if no files are found
