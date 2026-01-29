"""Validator for Problem-Based SRS artifacts."""

from pathlib import Path
from typing import List

from .parser import (
    ParseError,
    ValidationError,
    read_skill_metadata,
    read_prompt_metadata,
)


def validate_skill(skill_dir: Path) -> List[str]:
    """Validate a skill directory.
    
    Args:
        skill_dir: Path to skill directory
        
    Returns:
        List of error messages (empty if valid)
    """
    errors = []
    
    # Check if directory exists
    if not skill_dir.exists():
        return [f"Skill directory does not exist: {skill_dir}"]
    
    if not skill_dir.is_dir():
        return [f"Not a directory: {skill_dir}"]
    
    # Check for SKILL.md
    skill_file = skill_dir / "SKILL.md"
    skill_file_lower = skill_dir / "skill.md"
    
    if not skill_file.exists() and not skill_file_lower.exists():
        return [f"Missing required file: SKILL.md in {skill_dir}"]
    
    # Try to parse and validate
    try:
        metadata = read_skill_metadata(skill_dir)
        
        # Validate name
        name = metadata.get("name", "")
        if not name:
            errors.append("Skill name is empty")
        else:
            # Check if name matches directory
            if name != skill_dir.name:
                errors.append(f"Skill name '{name}' must match skill directory name '{skill_dir.name}'")
            
            # Check name format (lowercase, hyphens, no special chars)
            if not all(c.islower() or c == '-' or c.isdigit() for c in name):
                errors.append(f"Skill name '{name}' must be lowercase with hyphens")
            
            # Check for leading/trailing hyphens
            if name.startswith('-') or name.endswith('-'):
                errors.append(f"Skill name '{name}' cannot start or end with a hyphen")
            
            # Check for consecutive hyphens
            if '--' in name:
                errors.append(f"Skill name '{name}' cannot contain consecutive hyphens")
            
            # Check for invalid characters
            valid_chars = set('abcdefghijklmnopqrstuvwxyz0123456789-')
            if not all(c in valid_chars for c in name):
                errors.append(f"Skill name '{name}' contains invalid characters")
            
            # Check length
            if len(name) > 64:
                errors.append(f"Skill name '{name}' exceeds 64 character limit")
        
        # Validate description
        description = metadata.get("description", "")
        if not description:
            errors.append("Skill description is empty")
        elif len(description) > 1024:
            errors.append(f"Skill description exceeds 1024 character limit (has {len(description)})")
        
        # Check for unexpected fields
        allowed_fields = {"name", "description", "license", "metadata", "allowed-tools", "compatibility"}
        unexpected = set(metadata.keys()) - allowed_fields
        if unexpected:
            errors.append(f"Unexpected fields in SKILL.md: {', '.join(sorted(unexpected))}")
        
        # Validate compatibility field if present
        if "compatibility" in metadata:
            compat = metadata["compatibility"]
            if isinstance(compat, str) and len(compat) > 500:
                errors.append(f"Compatibility field exceeds 500 character limit (has {len(compat)})")
        
    except (ParseError, ValidationError) as e:
        errors.append(str(e))
    
    return errors


def validate_prompt(prompt_file: Path) -> List[str]:
    """Validate a prompt file.
    
    Args:
        prompt_file: Path to .prompt.md file
        
    Returns:
        List of error messages (empty if valid)
    """
    errors = []
    
    if not prompt_file.exists():
        return [f"Prompt file does not exist: {prompt_file}"]
    
    if not prompt_file.is_file():
        return [f"Not a file: {prompt_file}"]
    
    try:
        metadata = read_prompt_metadata(prompt_file)
        
        # Validate mode if present
        if "mode" in metadata:
            valid_modes = ["agent", "edit", "insert"]
            if metadata["mode"] not in valid_modes:
                errors.append(f"Invalid mode '{metadata['mode']}', must be one of: {', '.join(valid_modes)}")
        
    except (ParseError, ValidationError) as e:
        errors.append(str(e))
    
    return errors


def validate_markdown_structure(file_path: Path) -> List[str]:
    """Validate markdown heading structure.
    
    Args:
        file_path: Path to markdown file
        
    Returns:
        List of error messages (empty if valid)
    """
    errors = []
    
    if not file_path.exists():
        return [f"File does not exist: {file_path}"]
    
    try:
        content = file_path.read_text(encoding="utf-8")
        
        # Skip frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                content = parts[2]
        
        # Extract headings
        lines = content.split("\n")
        headings = []
        for line in lines:
            if line.startswith("#"):
                level = len(line) - len(line.lstrip("#"))
                if level > 0 and line[level:level+1] == " ":
                    headings.append((level, line.strip()))
        
        # Check for exactly one H1
        h1_count = sum(1 for level, _ in headings if level == 1)
        if h1_count == 0:
            errors.append("File must have exactly one H1 heading")
        elif h1_count > 1:
            errors.append(f"File has {h1_count} H1 headings, should have exactly one")
        
        # Check heading hierarchy (no level skips)
        prev_level = 0
        for level, heading in headings:
            if level > prev_level + 1:
                errors.append(f"Heading level skip detected: H{prev_level} → H{level} ('{heading}')")
            prev_level = level
        
    except Exception as e:
        errors.append(f"Error reading file: {e}")
    
    return errors
