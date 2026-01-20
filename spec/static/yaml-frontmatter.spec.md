# YAML Frontmatter Validation Specification

> **Traces to**: CN.01.1 → CP.01.1, CP.01.5

## Purpose

Validate that all prompt and skill files contain correctly structured YAML frontmatter for AI agent parsing.

---

## Test Cases

### TC-YAML-001: SKILL.md Frontmatter Completeness

**Description**: Verify SKILL.md files contain required frontmatter fields

**Requirement**: FR.01.1.1

**Input**: All files matching `skills/**/SKILL.md`

**Expected Fields**:
```yaml
---
name: <required, string>
description: <required, string, max 500 chars>
license: <required, string>
metadata:
  author: <optional, string>
  version: <optional, string>
---
```

**Pass Criteria**:
- [ ] `name` field exists and is non-empty
- [ ] `description` field exists and is non-empty
- [ ] `license` field exists
- [ ] Frontmatter is valid YAML (parseable)

**Test Data**:
| File | Expected Result |
|------|-----------------|
| `skills/problem-based-srs/SKILL.md` | PASS |

---

### TC-YAML-002: Prompt File Frontmatter

**Description**: Verify .prompt.md files contain valid frontmatter

**Requirement**: FR.01.1.2

**Input**: All files matching `.github/prompts/*.prompt.md`

**Expected Structure**:
```yaml
---
mode: <optional, enum: agent|edit|insert>
tools: <optional, array>
description: <optional, string>
---
```

**Pass Criteria**:
- [ ] Frontmatter section exists (between `---` markers)
- [ ] YAML is syntactically valid
- [ ] If `mode` exists, value is one of: agent, edit, insert

**Test Data**:
| File | Expected Result |
|------|-----------------|
| `.github/prompts/cp.prompt.md` | PASS |
| `.github/prompts/cn.prompt.md` | PASS |
| `.github/prompts/fr.prompt.md` | PASS |
| `.github/prompts/glance.prompt.md` | PASS |
| `.github/prompts/vision.prompt.md` | PASS |
| `.github/prompts/zigzag.prompt.md` | PASS |
| `.github/prompts/srs-coordinator.prompt.md` | PASS |

---

### TC-YAML-003: No Duplicate Keys

**Description**: Verify YAML frontmatter has no duplicate keys

**Requirement**: FR.01.1.1, FR.01.1.2

**Pass Criteria**:
- [ ] No YAML key appears more than once
- [ ] Parser does not throw duplicate key warning

---

## Automation Notes

```javascript
// Example validation with js-yaml
const yaml = require('js-yaml');
const fs = require('fs');

function validateFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { valid: false, error: 'No frontmatter found' };  
  
  try {
    const parsed = yaml.load(match[1]);
    return { valid: true, data: parsed };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}
```