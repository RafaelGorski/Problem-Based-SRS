// Spec compiler: reads .spec/ markdown artifacts and produces a unified JSON file
// that the SRS Navigator canvas can render as a graph.

import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { extractRefs } from "./text-refs.mjs";

/**
 * Scan .spec/ folder for markdown artifacts and compile into a JSON specification.
 * Returns the compiled spec object, or null if insufficient data exists.
 */
export async function compileSpecFromFolder(specDir) {
    const problems = [];
    const needs = [];
    const functionalRequirements = [];
    const nonFunctionalRequirements = [];
    let specName = "Project Specification";

    // Try to read business context for project name
    try {
        const bc = await readFile(join(specDir, "00-business-context.md"), "utf-8");
        const nameMatch = bc.match(/^#\s+(.+)/m) || bc.match(/\*\*Project(?:\s+Name)?:\*\*\s*(.+)/im);
        if (nameMatch) {
            specName = nameMatch[1].replace(/^Business Context:?\s*/i, "").trim();
        }
    } catch { /* optional */ }

    // Parse customer problems
    try {
        const cpContent = await readFile(join(specDir, "01-customer-problems.md"), "utf-8");
        const parsed = parseItemsFromMarkdown(cpContent, "CP");
        for (const item of parsed) {
            problems.push({ id: item.id, title: item.title, description: item.description });
        }
    } catch { /* file may not exist yet */ }

    // Parse customer needs
    try {
        const cnContent = await readFile(join(specDir, "03-customer-needs.md"), "utf-8");
        const parsed = parseItemsFromMarkdown(cnContent, "CN");
        for (const item of parsed) {
            needs.push({
                id: item.id,
                title: item.title,
                description: item.description,
                problemIds: extractRefs(item.description, /\bCP-\d+\b/gi)
            });
        }
    } catch { /* file may not exist yet */ }

    // Parse functional requirements (individual files or single file)
    try {
        const frDir = join(specDir, "functional-requirements");
        const frStat = await stat(frDir);
        if (frStat.isDirectory()) {
            const files = (await readdir(frDir)).filter(f => f.match(/^FR-\d+\.md$/i)).sort();
            for (const file of files) {
                const content = await readFile(join(frDir, file), "utf-8");
                const fr = parseSingleRequirement(content, "FR", basename(file, ".md"));
                if (fr) functionalRequirements.push(fr);
            }
        }
    } catch { /* directory may not exist yet */ }

    // If no individual FR files, try the index or a combined file
    if (functionalRequirements.length === 0) {
        try {
            const frIndex = await readFile(join(specDir, "functional-requirements", "_index.md"), "utf-8");
            const parsed = parseItemsFromMarkdown(frIndex, "FR");
            for (const item of parsed) {
                functionalRequirements.push({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    needIds: extractRefs(item.description, /\bCN-\d+\b/gi)
                });
            }
        } catch { /* optional */ }
    }

    // Parse non-functional requirements (individual files or single file)
    try {
        const nfrDir = join(specDir, "non-functional-requirements");
        const nfrStat = await stat(nfrDir);
        if (nfrStat.isDirectory()) {
            const files = (await readdir(nfrDir)).filter(f => f.match(/^NFR-\d+\.md$/i)).sort();
            for (const file of files) {
                const content = await readFile(join(nfrDir, file), "utf-8");
                const nfr = parseSingleRequirement(content, "NFR", basename(file, ".md"));
                if (nfr) nonFunctionalRequirements.push(nfr);
            }
        }
    } catch { /* directory may not exist yet */ }

    if (nonFunctionalRequirements.length === 0) {
        try {
            const nfrIndex = await readFile(join(specDir, "non-functional-requirements", "_index.md"), "utf-8");
            const parsed = parseItemsFromMarkdown(nfrIndex, "NFR");
            for (const item of parsed) {
                nonFunctionalRequirements.push({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    needIds: extractRefs(item.description, /\bCN-\d+\b/gi)
                });
            }
        } catch { /* optional */ }
    }

    // Need at least problems or needs to produce a useful graph
    if (problems.length === 0 && needs.length === 0) {
        return null;
    }

    const spec = {
        name: specName,
        description: `Compiled from .spec/ markdown artifacts`,
        version: "1.0",
        problems,
        needs,
        functionalRequirements,
        nonFunctionalRequirements
    };

    return spec;
}

/**
 * Compile and write the JSON file to .spec/<name>.json
 * Returns the file path written, or null if compilation failed.
 */
export async function compileAndSave(specDir) {
    const spec = await compileSpecFromFolder(specDir);
    if (!spec) return null;

    // Generate a filename from the spec name
    const slug = spec.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        || "specification";

    const filePath = join(specDir, `${slug}.json`);
    await writeFile(filePath, JSON.stringify(spec, null, 2), "utf-8");
    return filePath;
}

/**
 * Parse items from a combined markdown file with ### headers containing IDs.
 * Handles formats like:
 *   ### [CP-1] Title
 *   ### CP-1: Title
 *   ### CP-001 Title
 */
function parseItemsFromMarkdown(content, prefix) {
    const items = [];
    // Match section headers with IDs
    const headerPattern = new RegExp(
        `^###\\s+(?:\\[?(${prefix}-\\d+)\\]?[:\\s-]*)\\s*(.+)`,
        "gmi"
    );

    let match;
    const matches = [];
    while ((match = headerPattern.exec(content)) !== null) {
        matches.push({ id: match[1].toUpperCase(), title: match[2].trim(), index: match.index + match[0].length });
    }

    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index - matches[i + 1].title.length - 10 : content.length;
        const description = content.slice(start, end).trim()
            .replace(/^[\n\r]+/, "")
            .split("\n").slice(0, 10).join(" ").trim();

        items.push({
            id: matches[i].id,
            title: matches[i].title,
            description: description.slice(0, 500)
        });
    }

    return items;
}

/**
 * Parse a single FR/NFR file into a requirement object.
 */
function parseSingleRequirement(content, prefix, fallbackId) {
    // Extract ID from header: # FR-001: Title or # FR-001 Title
    const headerMatch = content.match(new RegExp(`^#\\s+(?:\\[?(${prefix}-\\d+)\\]?)[:\\s-]*\\s*(.+)`, "mi"));
    const id = headerMatch ? headerMatch[1].toUpperCase() : fallbackId.toUpperCase();
    const title = headerMatch ? headerMatch[2].trim() : fallbackId;

    // Extract statement
    const stmtMatch = content.match(/\*\*Statement:\*\*\s*(.+)/i);
    const description = stmtMatch ? stmtMatch[1].trim() : "";

    // Extract need references from traceability section or full content
    const needIds = extractRefs(content, /\bCN-\d+\b/gi);

    return { id, title, description, needIds };
}

