// Parser logic ported from the Problem-Based SRS Navigator
// Parses markdown and JSON specifications into graph data structures

import { extractRefs } from "./text-refs.mjs";

const MAX_INPUT_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Parse sub-items from a markdown section using a line-by-line approach
 */
function parseSubItems(section) {
  const items = [];
  const lines = section.split('\n');
  let currentHeader;
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentHeader !== undefined) {
        const id = currentHeader.match(/\[(\w+-\d+)\]/)?.[1]?.toUpperCase();
        const title = currentHeader.replace(/\[[\w-]+\]\s*/, '').trim();
        items.push({ id, title, content: currentContent.join('\n').trim() });
      }
      currentHeader = line.slice(4).trim();
      currentContent = [];
    } else if (currentHeader !== undefined) {
      currentContent.push(line);
    }
  }

  if (currentHeader !== undefined) {
    const id = currentHeader.match(/\[(\w+-\d+)\]/)?.[1]?.toUpperCase();
    const title = currentHeader.replace(/\[[\w-]+\]\s*/, '').trim();
    items.push({ id, title, content: currentContent.join('\n').trim() });
  }

  return items;
}

/**
 * Parse markdown specification into structured data
 */
export function parseSpecificationData(rawData) {
  if (rawData.length > MAX_INPUT_SIZE) {
    throw new Error(`Input too large (${(rawData.length / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${MAX_INPUT_SIZE / 1024 / 1024} MB.`);
  }

  const problems = [];
  const needs = [];
  const functionalRequirements = [];
  const nonFunctionalRequirements = [];

  const sections = rawData.split(/(?=^#\s+[^#])/m);

  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;

    if (trimmedSection.match(/^#\s+(Customer\s+)?Problems?/i)) {
      for (const { id, title, content } of parseSubItems(trimmedSection)) {
        problems.push({
          id: id || `P-${problems.length + 1}`,
          title,
          description: content
        });
      }
    } else if (trimmedSection.match(/^#\s+(Customer\s+)?Needs?/i)) {
      for (const { id, title, content } of parseSubItems(trimmedSection)) {
        needs.push({
          id: id || `N-${needs.length + 1}`,
          title,
          description: content,
          problemIds: extractRefs(content, /\b(CP-\d+|P-\d+)\b/gi)
        });
      }
    } else if (trimmedSection.match(/^#\s+Functional\s*Requirements?/i)) {
      for (const { id, title, content } of parseSubItems(trimmedSection)) {
        functionalRequirements.push({
          id: id || `FR-${functionalRequirements.length + 1}`,
          title,
          description: content,
          needIds: extractRefs(content, /\b(CN-\d+|N-\d+)\b/gi)
        });
      }
    } else if (trimmedSection.match(/^#\s+Non-?Functional\s*Requirements?/i)) {
      for (const { id, title, content } of parseSubItems(trimmedSection)) {
        nonFunctionalRequirements.push({
          id: id || `NFR-${nonFunctionalRequirements.length + 1}`,
          title,
          description: content,
          needIds: extractRefs(content, /\b(CN-\d+|N-\d+)\b/gi)
        });
      }
    }
  }

  return { problems, needs, functionalRequirements, nonFunctionalRequirements };
}

/**
 * Build graph data (nodes + links) from structured specification
 */
export function buildGraphData(spec) {
  const nodes = [];
  const links = [];
  const nodeIds = new Set();

  if (!spec) return { nodes: [], links: [] };

  const problems = spec.problems || [];
  const needs = spec.needs || [];
  const functionalRequirements = spec.functionalRequirements || [];
  const nonFunctionalRequirements = spec.nonFunctionalRequirements || [];

  for (const problem of problems) {
    if (!problem?.id || !problem?.title) continue;
    nodes.push({ id: problem.id, type: 'problem', label: problem.title, data: problem });
    nodeIds.add(problem.id);
  }

  for (const need of needs) {
    if (!need?.id || !need?.title) continue;
    nodes.push({ id: need.id, type: 'need', label: need.title, data: need });
    nodeIds.add(need.id);

    for (const problemId of (need.problemIds || [])) {
      if (problemId && nodeIds.has(problemId)) {
        links.push({ source: problemId, target: need.id, type: 'addresses' });
      }
    }
  }

  const reqSets = [
    { items: functionalRequirements, type: 'fr' },
    { items: nonFunctionalRequirements, type: 'nfr' }
  ];

  for (const { items, type } of reqSets) {
    for (const req of items) {
      if (!req?.id || !req?.title) continue;
      const needIds = req.needIds || [];
      const complexity = calculateComplexity(needIds.length);
      nodes.push({ id: req.id, type, label: req.title, data: req, complexity });
      nodeIds.add(req.id);

      for (const needId of needIds) {
        if (needId && nodeIds.has(needId)) {
          links.push({ source: needId, target: req.id, type: 'implements' });
        }
      }
    }
  }

  return { nodes, links };
}

function calculateComplexity(connectionCount) {
  if (connectionCount === 0) return 1;
  if (connectionCount === 1) return 2;
  if (connectionCount === 2) return 3;
  if (connectionCount <= 4) return 4;
  return 5;
}

/**
 * Convert JSON specification to SpecificationData (strips metadata)
 */
export function convertJSONToSpecificationData(json) {
  return {
    problems: json.problems || [],
    needs: json.needs || [],
    functionalRequirements: json.functionalRequirements || [],
    nonFunctionalRequirements: json.nonFunctionalRequirements || []
  };
}
