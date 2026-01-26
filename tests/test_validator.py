"""Tests for validator module."""

from pathlib import Path
from tests.validator import (
    validate_skill,
    validate_prompt,
    validate_markdown_structure,
)


def test_valid_skill(tmp_path):
    """Test validating a valid skill."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my-skill
description: A test skill
---
# My Skill
""")
    errors = validate_skill(skill_dir)
    assert errors == []


def test_nonexistent_skill(tmp_path):
    """Test validating a nonexistent skill directory."""
    errors = validate_skill(tmp_path / "nonexistent")
    assert len(errors) == 1
    assert "does not exist" in errors[0]


def test_skill_not_a_directory(tmp_path):
    """Test validating a file instead of directory."""
    file_path = tmp_path / "file.txt"
    file_path.write_text("test")
    errors = validate_skill(file_path)
    assert len(errors) == 1
    assert "Not a directory" in errors[0]


def test_missing_skill_md(tmp_path):
    """Test skill directory without SKILL.md."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    errors = validate_skill(skill_dir)
    assert len(errors) == 1
    assert "Missing required file: SKILL.md" in errors[0]


def test_invalid_name_uppercase(tmp_path):
    """Test skill with uppercase name."""
    skill_dir = tmp_path / "MySkill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: MySkill
description: A test skill
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("lowercase" in e for e in errors)


def test_name_too_long(tmp_path):
    """Test skill with name exceeding 64 characters."""
    long_name = "a" * 70
    skill_dir = tmp_path / long_name
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(f"""---
name: {long_name}
description: A test skill
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("exceeds" in e and "character limit" in e for e in errors)


def test_name_leading_hyphen(tmp_path):
    """Test skill with leading hyphen in name."""
    skill_dir = tmp_path / "-my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: -my-skill
description: A test skill
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("cannot start or end with a hyphen" in e for e in errors)


def test_name_consecutive_hyphens(tmp_path):
    """Test skill with consecutive hyphens."""
    skill_dir = tmp_path / "my--skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my--skill
description: A test skill
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("consecutive hyphens" in e for e in errors)


def test_name_invalid_characters(tmp_path):
    """Test skill with invalid characters in name."""
    skill_dir = tmp_path / "my_skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my_skill
description: A test skill
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("invalid characters" in e for e in errors)


def test_name_directory_mismatch(tmp_path):
    """Test skill where name doesn't match directory."""
    skill_dir = tmp_path / "wrong-name"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: correct-name
description: A test skill
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("must match skill directory name" in e for e in errors)


def test_unexpected_fields(tmp_path):
    """Test skill with unexpected fields in frontmatter."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my-skill
description: A test skill
unknown_field: should not be here
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("Unexpected fields" in e for e in errors)


def test_description_too_long(tmp_path):
    """Test skill with description exceeding 1024 characters."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    long_desc = "x" * 1100
    (skill_dir / "SKILL.md").write_text(f"""---
name: my-skill
description: {long_desc}
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("exceeds" in e and "1024" in e for e in errors)


def test_valid_with_all_fields(tmp_path):
    """Test skill with all valid optional fields."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my-skill
description: A test skill
license: MIT
metadata:
  author: Test
  version: "1.0"
---
Body
""")
    errors = validate_skill(skill_dir)
    assert errors == []


def test_compatibility_field(tmp_path):
    """Test skill with compatibility field."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my-skill
description: A test skill
compatibility: Requires Python 3.11+
---
Body
""")
    errors = validate_skill(skill_dir)
    assert errors == []


def test_compatibility_too_long(tmp_path):
    """Test skill with compatibility exceeding 500 characters."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    long_compat = "x" * 550
    (skill_dir / "SKILL.md").write_text(f"""---
name: my-skill
description: A test skill
compatibility: {long_compat}
---
Body
""")
    errors = validate_skill(skill_dir)
    assert any("exceeds" in e and "500" in e for e in errors)


def test_validate_prompt_valid(tmp_path):
    """Test validating a valid prompt file."""
    prompt_file = tmp_path / "test.prompt.md"
    prompt_file.write_text("""---
mode: agent
description: Test prompt
---
# Test Prompt
""")
    errors = validate_prompt(prompt_file)
    assert errors == []


def test_validate_prompt_invalid_mode(tmp_path):
    """Test prompt with invalid mode."""
    prompt_file = tmp_path / "test.prompt.md"
    prompt_file.write_text("""---
mode: invalid_mode
description: Test prompt
---
# Test Prompt
""")
    errors = validate_prompt(prompt_file)
    assert any("Invalid mode" in e for e in errors)


def test_markdown_structure_valid(tmp_path):
    """Test validating markdown with proper heading structure."""
    md_file = tmp_path / "test.md"
    md_file.write_text("""---
name: test
---
# Main Title

## Section 1

### Subsection 1.1

## Section 2

### Subsection 2.1
""")
    errors = validate_markdown_structure(md_file)
    assert errors == []


def test_markdown_no_h1(tmp_path):
    """Test markdown without H1 heading."""
    md_file = tmp_path / "test.md"
    md_file.write_text("""## Section 1

Content here.
""")
    errors = validate_markdown_structure(md_file)
    assert any("exactly one H1" in e for e in errors)


def test_markdown_multiple_h1(tmp_path):
    """Test markdown with multiple H1 headings."""
    md_file = tmp_path / "test.md"
    md_file.write_text("""# First Title

Content

# Second Title

More content
""")
    errors = validate_markdown_structure(md_file)
    assert any("H1 headings" in e for e in errors)


def test_markdown_level_skip(tmp_path):
    """Test markdown with heading level skip."""
    md_file = tmp_path / "test.md"
    md_file.write_text("""# Main Title

### Skipped H2

Content here.
""")
    errors = validate_markdown_structure(md_file)
    assert any("level skip" in e for e in errors)
