const yaml = require('js-yaml');

/**
 * Extract YAML frontmatter from markdown content
 */
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { found: false, raw: null, parsed: null, error: 'No frontmatter found' };
  }
  
  try {
    const parsed = yaml.load(match[1]);
    return { found: true, raw: match[1], parsed, error: null };
  } catch (e) {
    return { found: true, raw: match[1], parsed: null, error: e.message };
  }
}

/**
 * Validate frontmatter has required fields
 */
function validateRequiredFields(frontmatter, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    if (!frontmatter || frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === '') {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * Check if frontmatter is valid YAML
 */
function isValidYAML(yamlString) {
  try {
    yaml.load(yamlString);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  extractFrontmatter,
  validateRequiredFields,
  isValidYAML
};
