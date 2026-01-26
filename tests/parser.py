"""Parser for YAML frontmatter in markdown files."""

import re
from pathlib import Path
from typing import Any

import strictyaml as yaml


class ParseError(Exception):
    """Error parsing a markdown file."""
    pass


class ValidationError(Exception):
    """Error validating file content."""
    pass


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content.
    
    Args:
        content: Markdown file content
        
    Returns:
        Tuple of (metadata dict, body content)
        
    Raises:
        ParseError: If frontmatter is missing or invalid
    """
    if not content.startswith("---"):
        raise ParseError("File must start with YAML frontmatter (---)")
    
    # Find closing delimiter
    match = re.match(r"^---\n(.*?)\n---\n(.*)", content, re.DOTALL)
    if not match:
        raise ParseError("YAML frontmatter not properly closed with ---")
    
    yaml_content, body = match.groups()
    
    try:
        metadata = yaml.load(yaml_content).data
    except yaml.YAMLError as e:
        raise ParseError(f"Invalid YAML in frontmatter: {e}")
    
    if not isinstance(metadata, dict):
        raise ParseError("YAML frontmatter must be a YAML mapping (dict)")
    
    return metadata, body


def read_skill_metadata(skill_dir: Path) -> dict[str, Any]:
    """Read metadata from a SKILL.md file.
    
    Args:
        skill_dir: Path to skill directory containing SKILL.md
        
    Returns:
        Dictionary of skill metadata
        
    Raises:
        ParseError: If SKILL.md is missing or invalid
        ValidationError: If required fields are missing
    """
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        # Try lowercase
        skill_file = skill_dir / "skill.md"
        if not skill_file.exists():
            raise ParseError(f"SKILL.md not found in {skill_dir}")
    
    content = skill_file.read_text(encoding="utf-8")
    metadata, _ = parse_frontmatter(content)
    
    # Validate required fields
    required = ["name", "description"]
    missing = [f for f in required if f not in metadata]
    if missing:
        raise ValidationError(f"Missing required field(s) in SKILL.md: {', '.join(missing)}")
    
    return metadata


def read_prompt_metadata(prompt_file: Path) -> dict[str, Any]:
    """Read metadata from a .prompt.md file.
    
    Args:
        prompt_file: Path to prompt file
        
    Returns:
        Dictionary of prompt metadata
        
    Raises:
        ParseError: If prompt file is invalid
    """
    if not prompt_file.exists():
        raise ParseError(f"Prompt file not found: {prompt_file}")
    
    content = prompt_file.read_text(encoding="utf-8")
    metadata, _ = parse_frontmatter(content)
    
    return metadata


def validate_traceability_id(artifact_id: str, artifact_type: str) -> bool:
    """Validate traceability ID format.
    
    Args:
        artifact_id: The ID to validate (e.g., "CP.01", "CN.01.1", "FR.01.1.1")
        artifact_type: Type of artifact ("CP", "CN", "FR")
        
    Returns:
        True if valid, False otherwise
    """
    patterns = {
        "CP": r"^CP\.\d{2}(\.\d+)?$",  # CP.01 or CP.01.1
        "CN": r"^CN\.\d{2}\.\d+$",     # CN.01.1
        "FR": r"^FR\.\d{2}\.\d+\.\d+$" # FR.01.1.1
    }
    
    if artifact_type not in patterns:
        return False
    
    pattern = patterns[artifact_type]
    return bool(re.match(pattern, artifact_id))
