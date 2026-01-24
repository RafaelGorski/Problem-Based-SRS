const path = require('path');
const fs = require('fs');
const { glob } = require('glob');

describe('Repository Structure Validation', () => {
  const projectRoot = path.join(__dirname, '../..');

  test('skills/ directory should exist', () => {
    const skillsDir = path.join(projectRoot, 'skills');
    expect(fs.existsSync(skillsDir)).toBe(true);
  });

  test('.github/prompts/ directory should exist', () => {
    const promptsDir = path.join(projectRoot, '.github/prompts');
    expect(fs.existsSync(promptsDir)).toBe(true);
  });

  test('Each skill directory should have SKILL.md', async () => {
    const skillDirs = await glob('skills/*/', { cwd: projectRoot });
    
    const results = [];
    for (const dir of skillDirs) {
      const skillMdPath = path.join(projectRoot, dir, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) {
        results.push(dir);
      }
    }

    if (results.length > 0) {
      throw new Error(`Skill directories missing SKILL.md:\n${results.join('\n')}`);
    }

    expect(results.length).toBe(0);
  });

  test('Skill directories should follow naming convention (lowercase-with-hyphens)', async () => {
    const skillDirs = await glob('skills/*/', { cwd: projectRoot });
    
    const results = [];
    for (const dir of skillDirs) {
      const dirName = path.basename(dir);
      if (!/^[a-z0-9-]+$/.test(dirName)) {
        results.push(dirName);
      }
    }

    if (results.length > 0) {
      throw new Error(`Skill directories with invalid names:\n${results.join('\n')}`);
    }

    expect(results.length).toBe(0);
  });

  test('Prompt files should follow naming convention (*.prompt.md)', async () => {
    const promptFiles = await glob('.github/prompts/*.md', { cwd: projectRoot });
    
    const results = [];
    for (const file of promptFiles) {
      const fileName = path.basename(file);
      if (!fileName.endsWith('.prompt.md')) {
        results.push(fileName);
      }
    }

    if (results.length > 0) {
      throw new Error(`Files not following .prompt.md convention:\n${results.join('\n')}`);
    }

    expect(results.length).toBe(0);
  });

  test('Optional skill subdirectories should be valid (scripts, references, assets)', async () => {
    const skillDirs = await glob('skills/*/', { cwd: projectRoot });
    const validSubdirs = ['scripts', 'references', 'assets', 'templates', 'resources'];
    
    const results = [];
    
    for (const skillDir of skillDirs) {
      const fullSkillPath = path.join(projectRoot, skillDir);
      const entries = fs.readdirSync(fullSkillPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !validSubdirs.includes(entry.name)) {
          results.push({
            skill: path.basename(skillDir),
            invalidDir: entry.name
          });
        }
      }
    }

    if (results.length > 0) {
      const message = results.map(r => 
        `${r.skill}: unexpected directory '${r.invalidDir}'`
      ).join('\n');
      throw new Error(`Skills with non-standard directories:\n${message}`);
    }

    expect(results.length).toBe(0);
  });

  test('README.md should exist at project root', () => {
    const readmePath = path.join(projectRoot, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  test('LICENSE file should exist', () => {
    const licensePath = path.join(projectRoot, 'LICENSE');
    expect(fs.existsSync(licensePath)).toBe(true);
  });

  test('.gitignore should exist', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
  });

  test('.gitignore should exclude node_modules', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toMatch(/node_modules/);
  });
});
