/**
 * Extract all headings from markdown content
 */
function extractHeadings(content) {
  // Remove frontmatter first
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  
  // Match all ATX-style headings
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(withoutFrontmatter)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      raw: match[0]
    });
  }
  
  return headings;
}

/**
 * Validate heading hierarchy (no skipped levels)
 */
function validateHeadingHierarchy(headings) {
  const errors = [];
  
  for (let i = 1; i < headings.length; i++) {
    const prevLevel = headings[i - 1].level;
    const currLevel = headings[i].level;
    
    // Check if we skip levels going down
    if (currLevel > prevLevel + 1) {
      errors.push({
        heading: headings[i].text,
        error: `Skipped from h${prevLevel} to h${currLevel}`,
        level: currLevel
      });
    }
  }
  
  return errors;
}

/**
 * Count H1 headings (should be exactly 1)
 */
function countH1Headings(headings) {
  return headings.filter(h => h.level === 1).length;
}

/**
 * Extract code blocks and check for language tags
 */
function extractCodeBlocks(content) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || null,
      content: match[2],
      hasLanguage: !!match[1]
    });
  }
  
  return blocks;
}

/**
 * Extract internal links
 */
function extractInternalLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];
    // Check if it's an internal link (not http/https)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      links.push({
        text: match[1],
        url: url,
        isInternal: true
      });
    }
  }
  
  return links;
}

/**
 * Check if markdown file has specific sections
 */
function hasSections(content, requiredSections) {
  const headings = extractHeadings(content);
  const headingTexts = headings.map(h => h.text.toLowerCase());
  
  const missing = [];
  for (const section of requiredSections) {
    const found = headingTexts.some(text => 
      text.includes(section.toLowerCase())
    );
    if (!found) {
      missing.push(section);
    }
  }
  
  return { missing, found: requiredSections.length - missing.length };
}

module.exports = {
  extractHeadings,
  validateHeadingHierarchy,
  countH1Headings,
  extractCodeBlocks,
  extractInternalLinks,
  hasSections
};
