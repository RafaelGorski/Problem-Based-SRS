const { findPromptFiles, readFile } = require('../helpers/fileUtils');
const { extractFrontmatter } = require('../helpers/yamlParser');

describe('Prompt File YAML Frontmatter Validation', () => {
  let promptFiles;

  beforeAll(async () => {
    promptFiles = await findPromptFiles();
  });

  test('Should find all expected prompt files', () => {
    expect(promptFiles.length).toBeGreaterThan(0);
    
    const expectedPrompts = [
      'cp.prompt.md',
      'cn.prompt.md',
      'fr.prompt.md',
      'glance.prompt.md',
      'vision.prompt.md',
      'zigzag.prompt.md',
      'srs-coordinator.prompt.md'
    ];

    const fileNames = promptFiles.map(f => f.split('/').pop());
    
    for (const expected of expectedPrompts) {
      expect(fileNames).toContain(expected);
    }
  });

  test('Prompt files may have YAML frontmatter (optional)', async () => {
    const results = [];
    
    for (const filePath of promptFiles) {
      const content = readFile(filePath);
      const frontmatter = extractFrontmatter(content);
      
      // Frontmatter is optional, but if present it must be valid
      if (frontmatter.found && frontmatter.parsed === null) {
        results.push({
          file: filePath.split('/').pop(),
          error: `Invalid YAML: ${frontmatter.error}`
        });
      }
    }

    if (results.length > 0) {
      const message = results.map(r => `${r.file}: ${r.error}`).join('\n');
      expect(results).toEqual([]);
      throw new Error(`Prompt files with frontmatter issues:\n${message}`);
    }

    expect(results.length).toBe(0);
  });

  test('Frontmatter should have valid structure', async () => {
    const results = [];
    
    for (const filePath of promptFiles) {
      const content = readFile(filePath);
      const frontmatter = extractFrontmatter(content);
      
      if (frontmatter.parsed) {
        const errors = [];
        
        // If mode exists, it should be valid
        if (frontmatter.parsed.mode) {
          const validModes = ['agent', 'edit', 'insert'];
          if (!validModes.includes(frontmatter.parsed.mode)) {
            errors.push(`Invalid mode: ${frontmatter.parsed.mode}`);
          }
        }

        // If agent field exists, it should be 'agent'
        if (frontmatter.parsed.agent && frontmatter.parsed.agent !== 'agent') {
          errors.push(`Invalid agent value: ${frontmatter.parsed.agent}`);
        }

        if (errors.length > 0) {
          results.push({
            file: filePath.split('/').pop(),
            errors
          });
        }
      }
    }

    if (results.length > 0) {
      const message = results.map(r => 
        `${r.file}:\n  - ${r.errors.join('\n  - ')}`
      ).join('\n');
      expect(results).toEqual([]);
      throw new Error(`Prompt files with structure issues:\n${message}`);
    }

    expect(results.length).toBe(0);
  });

  test('Frontmatter description field should be present if frontmatter exists', async () => {
    const results = [];
    
    for (const filePath of promptFiles) {
      const content = readFile(filePath);
      const frontmatter = extractFrontmatter(content);
      
      // Only check if frontmatter exists
      if (frontmatter.parsed) {
        if (!frontmatter.parsed.description || frontmatter.parsed.description.trim() === '') {
          results.push(filePath.split('/').pop());
        }
      }
    }

    if (results.length > 0) {
      expect(results).toEqual([]);
      throw new Error(`Prompt files missing description:\n${results.join('\n')}`);
    }

    expect(results.length).toBe(0);
  });

  test('No duplicate YAML keys in frontmatter', async () => {
    const results = [];
    
    for (const filePath of promptFiles) {
      const content = readFile(filePath);
      const frontmatter = extractFrontmatter(content);
      
      if (frontmatter.found && frontmatter.raw) {
        // Check for duplicate keys by looking at the raw YAML
        const lines = frontmatter.raw.split('\n');
        const keys = new Set();
        const duplicates = [];
        
        for (const line of lines) {
          const keyMatch = line.match(/^(\w+):/);
          if (keyMatch) {
            const key = keyMatch[1];
            if (keys.has(key)) {
              duplicates.push(key);
            }
            keys.add(key);
          }
        }
        
        if (duplicates.length > 0) {
          results.push({
            file: filePath.split('/').pop(),
            duplicates
          });
        }
      }
    }

    if (results.length > 0) {
      const message = results.map(r => 
        `${r.file}: duplicate keys [${r.duplicates.join(', ')}]`
      ).join('\n');
      expect(results).toEqual([]);
      throw new Error(`Prompt files with duplicate YAML keys:\n${message}`);
    }

    expect(results.length).toBe(0);
  });
});
