# Markdown Structure Validation Specification

> **Traces to**: CN.01.2 → CP.01.1, CP.01.5

## Purpose

Validate consistent markdown structure across all documentation, prompts, and skill files.

---

## Test Cases

### TC-MD-001: Heading Hierarchy

**Description**: Verify heading levels follow proper hierarchy

**Requirement**: FR.01.1.3

**Rules**:
1. Each file should have exactly one H1 (`#`)
2. H2 (`##`) should follow H1
3. No skipping heading levels (e.g., H1 → H3 is invalid)

**Pass Criteria**:
- [ ] Single H1 per file
- [ ] No heading level skips
- [ ] H1 matches file purpose

**Test Data**:
| File | Expected H1 |
|------|-------------|
| `README.md` | `# Problem-Based SRS` |
| `skills/problem-based-srs/SKILL.md` | `# Problem-Based SRS` |
| `skills/problem-based-srs/references/step1-customer-problems.md` | `# Customer Problems (CP)` |

---

### TC-MD-002: Code Block Language Tags

**Description**: Verify code blocks have language identifiers

**Requirement**: FR.01.1.3

**Pass Criteria**:
- [ ] All code blocks have language tags (```language)
- [ ] Language tags are valid (markdown, yaml, mermaid, javascript, etc.)

---

### TC-MD-003: Link Validity

**Description**: Verify internal links point to existing files

**Requirement**: FR.01.1.3

**Pass Criteria**:
- [ ] All relative links resolve to existing files
- [ ] No broken anchor links

---

### TC-MD-004: Reference File Consistency

**Description**: Verify all step reference files follow same structure

**Requirement**: FR.01.1.3

**Expected Sections** (in order):
1. `# [Step Name]`
2. `## Purpose` or `## Position in Process`
3. `## Prompt`
4. `## Usage`
5. `## References`

**Test Data**:
| File | Has Purpose | Has Prompt | Has Usage |
|------|-------------|------------|-----------|
| `step1-customer-problems.md` | ✓ | ✓ | ✓ |
| `step2-software-glance.md` | ✓ | ✓ | ✓ |
| `step3-customer-needs.md` | ✓ | ✓ | ✓ |
| `step4-software-vision.md` | ✓ | ✓ | ✓ |
| `step5-functional-requirements.md` | ✓ | ✓ | ✓ |
| `zigzag-validator.md` | ✓ | ✓ | ✓ |

---

## Automation Notes

```bash
# Using markdownlint
npx markdownlint "**/*.md" --config .markdownlint.json

# Suggested .markdownlint.json
{
  "MD001": true,  // Heading levels increment by one
  "MD003": { "style": "atx" },  // ATX-style headings
  "MD025": true,  // Single H1 per file
  "MD040": true   // Code blocks should have language
}