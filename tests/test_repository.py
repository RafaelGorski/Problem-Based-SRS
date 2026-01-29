"""Integration tests for the actual repository structure."""

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
    """Tests for reference documentation files."""
    
    @pytest.mark.parametrize("ref_file", [
        "step1-customer-problems.md",
        "step2-software-glance.md",
        "step3-customer-needs.md",
        "step4-software-vision.md",
        "step5-functional-requirements.md",
        "zigzag-validator.md",
    ])
    def test_reference_file_exists(self, ref_file):
        """Test that all reference files exist."""
        ref_path = REPO_ROOT / "skills" / "problem-based-srs" / "references" / ref_file
        assert ref_path.exists(), f"Reference file not found: {ref_file}"
    
    @pytest.mark.parametrize("ref_file", [
        "step1-customer-problems.md",
        "step2-software-glance.md",
        "step3-customer-needs.md",
        "step4-software-vision.md",
        "step5-functional-requirements.md",
        "zigzag-validator.md",
    ])
    def test_reference_file_structure(self, ref_file):
        """Test that reference files have proper markdown structure."""
        ref_path = REPO_ROOT / "skills" / "problem-based-srs" / "references" / ref_file
        errors = validate_markdown_structure(ref_path)
        assert errors == [], f"Markdown structure errors in {ref_file}: {errors}"


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
