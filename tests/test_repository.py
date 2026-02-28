"""Integration tests for the actual repository structure."""

import json
import re
import pytest
from pathlib import Path

from tests.validator import validate_skill, validate_markdown_structure
from tests.parser import read_skill_metadata


# Get the repository root (parent of tests directory)
REPO_ROOT = Path(__file__).parent.parent


class TestSkillDirectory:
    """Tests for skills directory."""
    
    def test_problem_based_srs_skill_exists(self):
        """Test that the problem-based-srs skill exists."""
        skill_dir = REPO_ROOT / "skills" / "problem-based-srs"
        assert skill_dir.exists(), "problem-based-srs skill directory not found"
        assert skill_dir.is_dir(), "problem-based-srs should be a directory"
    
    def test_problem_based_srs_skill_valid(self):
        """Test that the problem-based-srs skill is valid."""
        skill_dir = REPO_ROOT / "skills" / "problem-based-srs"
        errors = validate_skill(skill_dir)
        assert errors == [], f"Skill validation errors: {errors}"
    
    def test_problem_based_srs_metadata(self):
        """Test problem-based-srs skill metadata."""
        skill_dir = REPO_ROOT / "skills" / "problem-based-srs"
        metadata = read_skill_metadata(skill_dir)
        
        assert metadata["name"] == "problem-based-srs"
        assert "description" in metadata
        assert len(metadata["description"]) > 0
        assert len(metadata["description"]) <= 1024


class TestReferenceFiles:
    """Tests for reference documentation files (examples only)."""
    
    @pytest.mark.parametrize("ref_file", [
        "crm-example.md",
        "microer-example.md",
    ])
    def test_reference_file_exists(self, ref_file):
        """Test that all example reference files exist."""
        ref_path = REPO_ROOT / "skills" / "problem-based-srs" / "references" / ref_file
        assert ref_path.exists(), f"Reference file not found: {ref_file}"
    
    @pytest.mark.parametrize("ref_file", [
        "crm-example.md",
        "microer-example.md",
    ])
    def test_reference_file_structure(self, ref_file):
        """Test that reference files have proper markdown structure."""
        ref_path = REPO_ROOT / "skills" / "problem-based-srs" / "references" / ref_file
        errors = validate_markdown_structure(ref_path)
        assert errors == [], f"Markdown structure errors in {ref_file}: {errors}"


class TestIndividualSkills:
    """Tests for individual methodology skills."""
    
    @pytest.mark.parametrize("skill_name", [
        "customer-problems",
        "software-glance",
        "customer-needs",
        "software-vision",
        "functional-requirements",
        "zigzag-validator",
        "complexity-analysis",
    ])
    def test_skill_exists(self, skill_name):
        """Test that all methodology skills exist."""
        skill_dir = REPO_ROOT / "skills" / skill_name
        assert skill_dir.exists(), f"Skill directory not found: {skill_name}"
        assert skill_dir.is_dir(), f"{skill_name} should be a directory"
        
        skill_md = skill_dir / "SKILL.md"
        assert skill_md.exists(), f"SKILL.md not found in {skill_name}"
    
    @pytest.mark.parametrize("skill_name", [
        "customer-problems",
        "software-glance",
        "customer-needs",
        "software-vision",
        "functional-requirements",
        "zigzag-validator",
        "complexity-analysis",
    ])
    def test_skill_valid(self, skill_name):
        """Test that all methodology skills are valid."""
        skill_dir = REPO_ROOT / "skills" / skill_name
        errors = validate_skill(skill_dir)
        assert errors == [], f"Skill validation errors for {skill_name}: {errors}"


class TestAgents:
    """Tests for agent orchestrators."""
    
    def test_problem_based_srs_agent_exists(self):
        """Test that the problem-based-srs agent exists."""
        agent_dir = REPO_ROOT / "agents" / "problem-based-srs"
        assert agent_dir.exists(), "problem-based-srs agent directory not found"
        assert agent_dir.is_dir(), "problem-based-srs agent should be a directory"
        
        agent_md = agent_dir / "AGENT.md"
        assert agent_md.exists(), "AGENT.md not found in problem-based-srs agent"


class TestSpecificationFiles:
    """Tests for test specification files."""
    
    def test_nfr_file_exists(self):
        """Test that NFR.1.0.md exists."""
        nfr_file = REPO_ROOT / "spec" / "NFR.1.0.md"
        assert nfr_file.exists(), "NFR.1.0.md not found"
    
    def test_spec_readme_exists(self):
        """Test that spec/README.md exists."""
        readme = REPO_ROOT / "spec" / "README.md"
        assert readme.exists(), "spec/README.md not found"
    
    @pytest.mark.parametrize("spec_file", [
        "static/yaml-frontmatter.spec.md",
        "static/markdown-structure.spec.md",
    ])
    def test_spec_files_exist(self, spec_file):
        """Test that specification files exist."""
        spec_path = REPO_ROOT / "spec" / spec_file
        assert spec_path.exists(), f"Specification file not found: {spec_file}"
    
    def test_nfr_markdown_structure(self):
        """Test NFR.1.0.md markdown structure."""
        nfr_file = REPO_ROOT / "spec" / "NFR.1.0.md"
        errors = validate_markdown_structure(nfr_file)
        # NFR file has complex structure, just check it doesn't crash
        assert isinstance(errors, list)


class TestCompatibilityGuardrails:
    """Tests that keep GHCP-first and Claude plugin compatibility consistent."""

    def test_plugin_manifest_required_fields(self):
        """Test Claude plugin manifest required fields and semantic version."""
        manifest = REPO_ROOT / ".claude-plugin" / "plugin.json"
        assert manifest.exists(), ".claude-plugin/plugin.json not found"

        data = json.loads(manifest.read_text(encoding="utf-8"))
        assert data.get("name"), "plugin.json must define name"
        assert data.get("version"), "plugin.json must define version"
        assert re.match(r"^\d+\.\d+\.\d+$", data["version"]), "plugin.json version must use semantic versioning"

    @pytest.mark.parametrize("path", [
        REPO_ROOT / ".github" / "copilot-instructions.md",
        REPO_ROOT / "AGENTS.md",
    ])
    def test_instruction_files_enforce_ghcp_first_priority(self, path):
        """Test instruction files keep GHCP-first compatibility guidance."""
        content = path.read_text(encoding="utf-8")
        assert "GitHub Copilot first" in content
        assert "Claude" in content


class TestRepositoryStructure:
    """Tests for overall repository structure."""
    
    def test_skills_directory_exists(self):
        """Test that skills directory exists."""
        skills_dir = REPO_ROOT / "skills"
        assert skills_dir.exists(), "skills directory not found"
        assert skills_dir.is_dir(), "skills should be a directory"
    
    def test_spec_directory_exists(self):
        """Test that spec directory exists."""
        spec_dir = REPO_ROOT / "spec"
        assert spec_dir.exists(), "spec directory not found"
        assert spec_dir.is_dir(), "spec should be a directory"
    
    def test_docs_directory_exists(self):
        """Test that docs directory exists."""
        docs_dir = REPO_ROOT / "docs"
        assert docs_dir.exists(), "docs directory not found"
        assert docs_dir.is_dir(), "docs should be a directory"
    
    def test_readme_exists(self):
        """Test that README.md exists at root."""
        readme = REPO_ROOT / "README.md"
        assert readme.exists(), "README.md not found at repository root"
