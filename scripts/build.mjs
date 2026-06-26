#!/usr/bin/env node

/**
 * Build script for Problem-Based SRS skills.
 *
 * Reads SKILL.src.md files from each skill directory, replaces provider-specific
 * placeholders ({{ask_instruction}}, {{command_prefix}}, {{model}}), and writes
 * the result as SKILL.md in the same directory.
 *
 * Usage:
 *   node scripts/build.mjs [--provider <name>]
 *
 * Default provider: github-copilot (per compatibility priority)
 *
 * Compiles provider-specific SKILL.md files from SKILL.src.md source templates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { replacePlaceholders, DEFAULT_PROVIDER, PROVIDER_PLACEHOLDERS } from './lib/providers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// Parse --provider argument
function parseArgs() {
  const args = process.argv.slice(2);
  let provider = DEFAULT_PROVIDER;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && args[i + 1]) {
      provider = args[i + 1];
      i++;
    }
  }

  if (!PROVIDER_PLACEHOLDERS[provider]) {
    console.error(
      `Unknown provider: "${provider}". Available: ${Object.keys(PROVIDER_PLACEHOLDERS).join(', ')}`
    );
    process.exit(1);
  }

  return { provider };
}

function build() {
  const { provider } = parseArgs();
  console.log(`Building skills for provider: ${provider}`);

  const skillDirs = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let built = 0;
  let skipped = 0;

  for (const skillName of skillDirs) {
    const srcPath = path.join(SKILLS_DIR, skillName, 'SKILL.src.md');
    const outPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');

    if (!fs.existsSync(srcPath)) {
      skipped++;
      continue;
    }

    const source = fs.readFileSync(srcPath, 'utf-8');
    const output = replacePlaceholders(source, provider);

    // Add build header comment
    const header = `<!-- Built from SKILL.src.md for provider: ${provider}. Do not edit directly. -->\n`;
    fs.writeFileSync(outPath, header + output, 'utf-8');
    built++;
    console.log(`  ✓ ${skillName}/SKILL.md`);
  }

  console.log(`\nDone: ${built} built, ${skipped} skipped (no SKILL.src.md)`);
}

build();
