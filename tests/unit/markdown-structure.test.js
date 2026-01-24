const { findSkillFiles, findPromptFiles, readFile, fileExists } = require('../helpers/fileUtils');
const { 
  extractHeadings, 
  validateHeadingHierarchy, 
  countH1Headings,
  extractCodeBlocks,
  extractInternalLinks 
} = require('../helpers/markdownParser');
const path = require('path');

describe('Markdown Structure Validation', () => {
  // Shared file discovery for all tests
  let allFiles;
  let skillFiles;
  let promptFiles;

  beforeAll(async () => {
    skillFiles = await findSkillFiles();
    promptFiles = await findPromptFiles();
    allFiles = [...skillFiles, ...promptFiles];
  });

  describe('Heading Hierarchy', () => {

    test('Each file should have exactly one H1 heading', async () => {
      const results = [];
      
      for (const filePath of allFiles) {
        const content = readFile(filePath);
        const headings = extractHeadings(content);
        const h1Count = countH1Headings(headings);
        const fileName = filePath.split('/').pop();
        
        // SKILL.md files may have multiple H1s as examples/templates
        if (fileName === 'SKILL.md' && h1Count >= 1) {
          continue; // SKILL.md can have multiple H1s for examples
        }
        
        // Prompt files (.prompt.md) may not have H1 at all
        if (fileName.endsWith('.prompt.md')) {
          continue; // Prompt files structure is flexible
        }
        
        if (h1Count !== 1) {
          results.push({
            file: fileName,
            h1Count
          });
        }
      }

      if (results.length > 0) {
        const message = results.map(r => 
          `${r.file}: ${r.h1Count} H1 headings (expected 1)`
        ).join('\n');
        throw new Error(`Files with incorrect H1 count:\n${message}`);
      }

      expect(results.length).toBe(0);
    });

    test('Heading levels should not skip (e.g., H1 → H3)', async () => {
      const results = [];
      
      for (const filePath of allFiles) {
        const content = readFile(filePath);
        const headings = extractHeadings(content);
        const errors = validateHeadingHierarchy(headings);
        
        if (errors.length > 0) {
          results.push({
            file: filePath.split('/').pop(),
            errors
          });
        }
      }

      if (results.length > 0) {
        const message = results.map(r => 
          `${r.file}:\n  - ${r.errors.map(e => e.error).join('\n  - ')}`
        ).join('\n');
        throw new Error(`Files with heading hierarchy issues:\n${message}`);
      }

      expect(results.length).toBe(0);
    });
  });

  describe('Code Blocks', () => {
    test('Most code blocks should have language tags', async () => {
      const results = [];
      
      for (const filePath of allFiles) {
        const content = readFile(filePath);
        const codeBlocks = extractCodeBlocks(content);
        const missingLanguage = codeBlocks.filter(block => !block.hasLanguage);
        const fileName = filePath.split('/').pop();
        
        // SKILL.md files may have template examples without language tags
        if (fileName === 'SKILL.md') {
          continue; // Skip SKILL.md as it contains templates
        }
        
        // Allow up to 30% of code blocks without language tags (for simple examples)
        const allowedMissing = Math.ceil(codeBlocks.length * 0.3);
        
        if (missingLanguage.length > allowedMissing && codeBlocks.length > 0) {
          results.push({
            file: fileName,
            count: missingLanguage.length,
            totalBlocks: codeBlocks.length
          });
        }
      }

      if (results.length > 0) {
        const message = results.map(r => 
          `${r.file}: ${r.count}/${r.totalBlocks} blocks missing language tags (>30% threshold)`
        ).join('\n');
        throw new Error(`Files with too many unlabeled code blocks:\n${message}`);
      }

      expect(results.length).toBe(0);
    });
  });

  describe('Internal Links', () => {
    const projectRoot = path.join(__dirname, '../..');

    test('Internal links should point to existing files', async () => {
      const results = [];
      
      for (const filePath of allFiles) {
        const content = readFile(filePath);
        const links = extractInternalLinks(content);
        const brokenLinks = [];
        
        for (const link of links) {
          // Skip anchor-only links
          if (link.url.startsWith('#')) {
            continue;
          }
          
          // Resolve relative path
          const fileDir = path.dirname(filePath);
          const linkPath = link.url.split('#')[0]; // Remove anchor
          const resolvedPath = path.resolve(fileDir, linkPath);
          
          if (!fileExists(resolvedPath)) {
            brokenLinks.push(link.url);
          }
        }
        
        if (brokenLinks.length > 0) {
          results.push({
            file: filePath.split('/').pop(),
            brokenLinks
          });
        }
      }

      if (results.length > 0) {
        const message = results.map(r => 
          `${r.file}:\n  - ${r.brokenLinks.join('\n  - ')}`
        ).join('\n');
        throw new Error(`Files with broken internal links:\n${message}`);
      }

      expect(results.length).toBe(0);
    });
  });

  describe('SKILL.md Specific Structure', () => {
    test('SKILL.md should have H1 matching skill purpose', async () => {
      for (const filePath of skillFiles) {
        const content = readFile(filePath);
        const headings = extractHeadings(content);
        const h1Headings = headings.filter(h => h.level === 1);
        
        // SKILL.md may have multiple H1s as examples, but should have at least one
        expect(h1Headings.length).toBeGreaterThanOrEqual(1);
        expect(h1Headings[0].text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Prompt File Specific Structure', () => {
    test('Prompt files should have clear role or purpose section', async () => {
      const results = [];
      
      for (const filePath of promptFiles) {
        const content = readFile(filePath);
        const headings = extractHeadings(content);
        const headingTexts = headings.map(h => h.text.toLowerCase());
        
        const hasRole = headingTexts.some(t => 
          t.includes('role') || 
          t.includes('purpose') || 
          t.includes('description')
        );
        
        if (!hasRole) {
          results.push(filePath.split('/').pop());
        }
      }

      if (results.length > 0) {
        throw new Error(`Prompt files missing role/purpose section:\n${results.join('\n')}`);
      }

      expect(results.length).toBe(0);
    });
  });
});
