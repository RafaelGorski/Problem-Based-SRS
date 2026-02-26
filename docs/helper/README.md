# Documentation Helper Scripts

This folder contains helper scripts for maintaining the Problem-Based SRS documentation.

## Available Scripts

### extract-pdf.py

Extracts text and images from PDF files to Markdown format.

**Usage:**
```bash
python docs/helper/extract-pdf.py <input_pdf> <output_md> [--img-dir <img_directory>]
```

**Example:**
```bash
python docs/helper/extract-pdf.py docs/document.pdf docs/output.md --img-dir docs/img
```

**Prerequisites:**
- Python 3.x
- Required packages: `pip install pdfplumber pillow`

**What it does:**
1. Opens the PDF file
2. Extracts text content page by page
3. Extracts all images and saves them to the specified directory
4. Creates a Markdown file with page markers and image references

---

### translate-md.py

Translates a Markdown file from Portuguese to English while preserving formatting.

**Usage:**
```bash
python docs/helper/translate-md.py <input_md> <output_md>
```

**Example:**
```bash
python docs/helper/translate-md.py docs/document_PT.md docs/document_EN.md
```

**Prerequisites:**
- Python 3.x
- Required packages: `pip install deep_translator`

**What it does:**
1. Reads the Portuguese Markdown file
2. Translates text content while preserving:
   - Page markers (<!-- Page N -->)
   - Image references
   - Markdown formatting
3. Writes the translated content to a new file

---

### split-md-sections.py

Splits a large markdown document into smaller files based on chapter/section structure.

**Usage:**
```bash
python docs/helper/split-md-sections.py <input_md> <output_dir>
```

**Example:**
```bash
python docs/helper/split-md-sections.py docs/document_EN.md docs/dissertation-en
```

**Prerequisites:**
- Python 3.x (no additional packages required)

**What it does:**
1. Parses the markdown file using page markers
2. Splits content into logical sections (chapters, appendices, etc.)
3. Creates numbered markdown files with headers
4. Generates a README.md index linking all sections

---

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
