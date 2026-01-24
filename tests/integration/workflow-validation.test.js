const { findSkillFiles, findPromptFiles, readFile } = require('../helpers/fileUtils');
const { extractFrontmatter } = require('../helpers/yamlParser');
const { hasSections } = require('../helpers/markdownParser');

describe('Problem-Based SRS Workflow Integration', () => {
  describe('Step Coordination', () => {
    let promptFiles;
    const expectedSteps = {
      'cp.prompt.md': { step: 1, artifact: 'Customer Problems' },
      'glance.prompt.md': { step: 2, artifact: 'Software Glance' },
      'cn.prompt.md': { step: 3, artifact: 'Customer Needs' },
      'vision.prompt.md': { step: 4, artifact: 'Software Vision' },
      'fr.prompt.md': { step: 5, artifact: 'Functional Requirements' }
    };

    beforeAll(async () => {
      promptFiles = await findPromptFiles();
    });

    test('All 5 main step prompts should exist', () => {
      const fileNames = promptFiles.map(f => f.split('/').pop());
      
      for (const stepFile of Object.keys(expectedSteps)) {
        expect(fileNames).toContain(stepFile);
      }
    });

    test('Step prompts should reference their position in the process', async () => {
      const results = [];
      
      for (const [fileName, stepInfo] of Object.entries(expectedSteps)) {
        const file = promptFiles.find(f => f.endsWith(fileName));
        if (!file) continue;
        
        const content = readFile(file);
        const contentLower = content.toLowerCase();
        
        // Check if step number is mentioned
        const hasStepReference = 
          contentLower.includes(`step ${stepInfo.step}`) ||
          contentLower.includes(`step${stepInfo.step}`) ||
          contentLower.includes(`${stepInfo.step} of 5`);
        
        if (!hasStepReference) {
          results.push({
            file: fileName,
            step: stepInfo.step
          });
        }
      }

      if (results.length > 0) {
        const message = results.map(r => 
          `${r.file}: missing step ${r.step} reference`
        ).join('\n');
        throw new Error(`Step prompts should reference their position:\n${message}`);
      }

      expect(results.length).toBe(0);
    });

    test('Coordinator prompt should reference all step prompts', async () => {
      const coordinatorFile = promptFiles.find(f => f.endsWith('srs-coordinator.prompt.md'));
      expect(coordinatorFile).toBeDefined();
      
      const content = readFile(coordinatorFile);
      const contentLower = content.toLowerCase();
      
      const missingReferences = [];
      
      for (const [fileName, stepInfo] of Object.entries(expectedSteps)) {
        const promptName = fileName.replace('.prompt.md', '');
        
        if (!contentLower.includes(`/${promptName}`) && !contentLower.includes(promptName)) {
          missingReferences.push(fileName);
        }
      }

      if (missingReferences.length > 0) {
        throw new Error(`Coordinator missing references to:\n${missingReferences.join('\n')}`);
      }

      expect(missingReferences.length).toBe(0);
    });
  });

  describe('Traceability Chain', () => {
    let allFiles;

    beforeAll(async () => {
      const skills = await findSkillFiles();
      const prompts = await findPromptFiles();
      allFiles = [...skills, ...prompts];
    });

    test('Files should mention traceability (CP → CN → FR)', async () => {
      const results = [];
      
      for (const filePath of allFiles) {
        const content = readFile(filePath);
        const contentLower = content.toLowerCase();
        
        // Check for traceability mentions
        const hasTraceability = 
          contentLower.includes('traceability') ||
          (contentLower.includes('cp') && contentLower.includes('cn') && contentLower.includes('fr')) ||
          contentLower.includes('→') ||
          contentLower.includes('traces');
        
        if (!hasTraceability) {
          results.push(filePath.split('/').pop());
        }
      }

      // It's OK if some files don't mention traceability, but at least SKILL.md should
      const skillFile = results.find(f => f === 'SKILL.md');
      expect(skillFile).toBeUndefined();
    });

    test('Functional Requirements prompt should enforce traceability notation', async () => {
      const frFile = allFiles.find(f => f.endsWith('fr.prompt.md'));
      expect(frFile).toBeDefined();
      
      const content = readFile(frFile);
      const contentLower = content.toLowerCase();
      
      // Should mention the FR.X → CN.Y notation
      expect(contentLower).toMatch(/fr\.\w+\s*→\s*cn\.\w+|fr\.\w+\s*->\s*cn\.\w+/);
    });

    test('Customer Needs prompt should enforce traceability to Customer Problems', async () => {
      const cnFile = allFiles.find(f => f.endsWith('cn.prompt.md'));
      expect(cnFile).toBeDefined();
      
      const content = readFile(cnFile);
      const contentLower = content.toLowerCase();
      
      // Should mention linking to CPs
      expect(
        contentLower.includes('customer problem') || 
        contentLower.includes('cp.')
      ).toBe(true);
    });
  });

  describe('Quality Standards', () => {
    let promptFiles;

    beforeAll(async () => {
      promptFiles = await findPromptFiles();
    });

    test('FR prompt should mention ISO/IEC/IEEE 29148 or quality standards', async () => {
      const frFile = promptFiles.find(f => f.endsWith('fr.prompt.md'));
      expect(frFile).toBeDefined();
      
      const content = readFile(frFile);
      
      expect(
        content.includes('ISO') || 
        content.includes('29148') ||
        content.includes('quality') ||
        content.includes('testable')
      ).toBe(true);
    });

    test('Prompts should include examples', async () => {
      const results = [];
      
      for (const filePath of promptFiles) {
        const content = readFile(filePath);
        const contentLower = content.toLowerCase();
        
        const hasExamples = 
          contentLower.includes('example') ||
          contentLower.includes('e.g.') ||
          contentLower.includes('for instance');
        
        if (!hasExamples) {
          results.push(filePath.split('/').pop());
        }
      }

      // Most prompts should have examples
      if (results.length > promptFiles.length / 2) {
        throw new Error(`Too many prompts without examples:\n${results.join('\n')}`);
      }
    });

    test('Prompts should have acceptance criteria or quality checklist', async () => {
      const stepPrompts = promptFiles.filter(f => 
        f.endsWith('cp.prompt.md') ||
        f.endsWith('cn.prompt.md') ||
        f.endsWith('fr.prompt.md') ||
        f.endsWith('vision.prompt.md')
      );
      
      const results = [];
      
      for (const filePath of stepPrompts) {
        const content = readFile(filePath);
        const contentLower = content.toLowerCase();
        
        const hasQualitySection = 
          contentLower.includes('acceptance criteria') ||
          contentLower.includes('quality criteria') ||
          contentLower.includes('quality checklist') ||
          contentLower.includes('checklist') ||
          contentLower.includes('pass criteria');
        
        if (!hasQualitySection) {
          results.push(filePath.split('/').pop());
        }
      }

      if (results.length > 0) {
        throw new Error(`Step prompts missing quality sections:\n${results.join('\n')}`);
      }

      expect(results.length).toBe(0);
    });
  });

  describe('SKILL.md Completeness', () => {
    let skillFile;

    beforeAll(async () => {
      const skills = await findSkillFiles();
      skillFile = skills.find(f => f.includes('problem-based-srs'));
    });

    test('SKILL.md should reference the methodology paper', () => {
      const content = readFile(skillFile);
      
      expect(
        content.includes('Gorski') || 
        content.includes('Stadzisz')
      ).toBe(true);
    });

    test('SKILL.md should explain the 5-step process', () => {
      const content = readFile(skillFile);
      const contentLower = content.toLowerCase();
      
      expect(contentLower).toMatch(/5[\s-]step|five[\s-]step|step 1|step 2|step 3|step 4|step 5/);
    });

    test('SKILL.md should have required sections', () => {
      const content = readFile(skillFile);
      const result = hasSections(content, [
        'Methodology',
        'Problem',
        'Customer'
      ]);
      
      // At least one of these key sections should be present
      expect(result.found).toBeGreaterThan(0);
    });
  });
});
