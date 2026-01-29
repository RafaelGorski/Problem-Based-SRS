"""Tests for parser module."""

import pytest

from tests.parser import (
    ParseError,
    ValidationError,
    parse_frontmatter,
    read_skill_metadata,
    read_prompt_metadata,
    validate_traceability_id,
)


def test_valid_frontmatter():
    """Test parsing valid YAML frontmatter."""
    content = """---
name: my-skill
description: A test skill
---
# My Skill

Instructions here.
"""
    metadata, body = parse_frontmatter(content)
    assert metadata["name"] == "my-skill"
    assert metadata["description"] == "A test skill"
    assert "# My Skill" in body


def test_missing_frontmatter():
    """Test that files without frontmatter raise an error."""
    content = "# No frontmatter here"
    with pytest.raises(ParseError, match="must start with YAML frontmatter"):
        parse_frontmatter(content)


def test_unclosed_frontmatter():
    """Test that unclosed frontmatter raises an error."""
    content = """---
name: my-skill
description: A test skill
"""
    with pytest.raises(ParseError, match="not properly closed"):
        parse_frontmatter(content)


def test_invalid_yaml():
    """Test that invalid YAML raises an error."""
    content = """---
name: [invalid
description: broken
---
Body here
"""
    with pytest.raises(ParseError, match="Invalid YAML"):
        parse_frontmatter(content)


def test_non_dict_frontmatter():
    """Test that non-dict frontmatter raises an error."""
    content = """---
- just
- a
- list
---
Body
"""
    with pytest.raises(ParseError, match="must be a YAML mapping"):
        parse_frontmatter(content)


def test_read_valid_skill(tmp_path):
    """Test reading a valid SKILL.md file."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my-skill
description: A test skill
license: MIT
---
# My Skill
""")
    metadata = read_skill_metadata(skill_dir)
    assert metadata["name"] == "my-skill"
    assert metadata["description"] == "A test skill"
    assert metadata["license"] == "MIT"


def test_missing_skill_md(tmp_path):
    """Test that missing SKILL.md raises an error."""
    with pytest.raises(ParseError, match="SKILL.md not found"):
        read_skill_metadata(tmp_path)


def test_missing_name(tmp_path):
    """Test that missing name field raises an error."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
description: A test skill
---
Body
""")
    with pytest.raises(ValidationError, match="Missing required field.*name"):
        read_skill_metadata(skill_dir)


def test_missing_description(tmp_path):
    """Test that missing description field raises an error."""
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my-skill
---
Body
""")
    with pytest.raises(ValidationError, match="Missing required field.*description"):
        read_skill_metadata(skill_dir)


def test_read_prompt_valid(tmp_path):
    """Test reading a valid prompt file."""
    prompt_file = tmp_path / "test.prompt.md"
    prompt_file.write_text("""---
mode: agent
description: Test prompt
---
# Test Prompt

Content here.
""")
    metadata = read_prompt_metadata(prompt_file)
    assert metadata["mode"] == "agent"
    assert metadata["description"] == "Test prompt"


def test_validate_cp_id():
    """Test CP ID validation."""
    assert validate_traceability_id("CP.01", "CP") is True
    assert validate_traceability_id("CP.01.1", "CP") is True
    assert validate_traceability_id("CP.1", "CP") is False
    assert validate_traceability_id("CP01", "CP") is False
    assert validate_traceability_id("CP.01.1.1", "CP") is False


def test_validate_cn_id():
    """Test CN ID validation."""
    assert validate_traceability_id("CN.01.1", "CN") is True
    assert validate_traceability_id("CN.02.5", "CN") is True
    assert validate_traceability_id("CN.1.1", "CN") is False
    assert validate_traceability_id("CN.01", "CN") is False
    assert validate_traceability_id("CN.01.1.1", "CN") is False


def test_validate_fr_id():
    """Test FR ID validation."""
    assert validate_traceability_id("FR.01.1.1", "FR") is True
    assert validate_traceability_id("FR.02.3.5", "FR") is True
    assert validate_traceability_id("FR.1.1.1", "FR") is False
    assert validate_traceability_id("FR.01.1", "FR") is False
    assert validate_traceability_id("FR.01", "FR") is False
