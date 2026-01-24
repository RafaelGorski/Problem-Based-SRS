const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Read file content
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Find all SKILL.md files
 */
async function findSkillFiles() {
  const projectRoot = path.join(__dirname, '../..');
  return await glob('skills/**/SKILL.md', { cwd: projectRoot, absolute: true });
}

/**
 * Find all prompt files
 */
async function findPromptFiles() {
  const projectRoot = path.join(__dirname, '../..');
  return await glob('.github/prompts/*.prompt.md', { cwd: projectRoot, absolute: true });
}

/**
 * Find all markdown files
 */
async function findMarkdownFiles(pattern = '**/*.md') {
  const projectRoot = path.join(__dirname, '../..');
  const files = await glob(pattern, { 
    cwd: projectRoot, 
    absolute: true,
    ignore: ['**/node_modules/**', '**/coverage/**']
  });
  return files;
}

module.exports = {
  readFile,
  fileExists,
  findSkillFiles,
  findPromptFiles,
  findMarkdownFiles
};
