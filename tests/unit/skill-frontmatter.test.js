const { findSkillFiles, readFile } = require('../helpers/fileUtils');
const { extractFrontmatter, validateRequiredFields } = require('../helpers/yamlParser');

describe('SKILL.md YAML Frontmatter Validation', () => {
  let skillFiles;

  beforeAll(async () => {
    skillFiles = await findSkillFiles();
  });

  test('Should find at least one SKILL.md file', () => {
    expect(skillFiles.length).toBeGreaterThan(0);
  });



  // Generate tests dynamically for each file
  test('All SKILL.md files have valid frontmatter', async () => {
    const results = [];
    
    for (const filePath of skillFiles) {
      const content = readFile(filePath);
      const frontmatter = extractFrontmatter(content);
      
      const fileResult = {
        file: filePath,
        hasFrontmatter: frontmatter.found,
        isValidYAML: frontmatter.parsed !== null,
        hasRequiredFields: false,
        errors: []
      };

      if (frontmatter.found && frontmatter.parsed) {
        const missing = validateRequiredFields(frontmatter.parsed, ['name', 'description', 'license']);
        fileResult.hasRequiredFields = missing.length === 0;
        
        if (missing.length > 0) {
          fileResult.errors.push(`Missing fields: ${missing.join(', ')}`);
        }

        // Check description length
        if (frontmatter.parsed.description && frontmatter.parsed.description.length > 500) {
          fileResult.errors.push(`Description too long (${frontmatter.parsed.description.length} chars)`);
        }

        // Check name format
        if (frontmatter.parsed.name && !/^[a-z0-9-]+$/.test(frontmatter.parsed.name)) {
          fileResult.errors.push('Name should be lowercase with hyphens');
        }
      } else if (frontmatter.found && !frontmatter.parsed) {
        fileResult.errors.push(frontmatter.error);
      } else {
        fileResult.errors.push('No frontmatter found');
      }

      results.push(fileResult);
    }

    // Check all files passed
    const failures = results.filter(r => r.errors.length > 0);
    
    if (failures.length > 0) {
      const errorMessage = failures.map(f => 
        `\n${f.file}:\n  - ${f.errors.join('\n  - ')}`
      ).join('\n');
      
      if (failures.length > 0) {
        throw new Error(`SKILL.md frontmatter validation failed:${errorMessage}`);
      }
    }

    expect(failures.length).toBe(0);
  });

  test('SKILL.md files should be under 500 lines', async () => {
    const results = [];
    
    for (const filePath of skillFiles) {
      const content = readFile(filePath);
      const lines = content.split('\n').length;
      
      if (lines > 500) {
        results.push({ file: filePath, lines });
      }
    }

    if (results.length > 0) {
      const message = results.map(r => 
        `${r.file}: ${r.lines} lines (max 500)`
      ).join('\n');
      
      throw new Error(`SKILL.md files exceed line limit:\n${message}`);
    }

    expect(results.length).toBe(0);
  });
});
