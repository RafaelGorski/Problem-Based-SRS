# Problem-Based SRS

[![Version](https://img.shields.io/badge/version-1.0-green.svg)](https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.0)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-Open%20Standard-blue)](https://github.com/agentskills/agentskills)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An [Agent Skill](https://github.com/agentskills/agentskills) to use **Problem-Based Software Requirements Specification (SRS)** method in your software project. Designed for integration with AI agents like GitHub Copilot, Claude, and others.

## 📄 Background

This repository continues the work from the research paper **"Problem-Based SRS: A Novel Approach for Software Requirements Specification"** by Gorski and Stadzisz.

The methodology helps create better software requirements by starting with customer problems instead of jumping to solutions. It uses a structured 5-step process to analyze business needs and ensure requirements actually solve real customer problems.

**Why this matters:** Research shows that accurately capturing what stakeholders need is a major challenge in software development and a leading cause of project failures. This methodology addresses that by systematically connecting every requirement back to a specific business problem, ensuring teams build what customers actually need.

> This repository uses the [AgentSkills](https://agentskills.io) format, making it compatible with GitHub Copilot, Claude, and other AI agents.

## 🚀 Quick Start

Ask your AI agent to install and use this skill:

**GitHub Copilot:**
```
Install the Problem-Based SRS skill from RafaelGorski/Problem-Based-SRS
```

**Claude:**
```
Install the AgentSkill from https://github.com/RafaelGorski/Problem-Based-SRS
```

Then start with:
```
/problem-based-srs
```

The AI will guide you through the 5-step process automatically.

## 💡 Available Commands

| Command | Description |
|---------|-------------|
| `/problem-based-srs` | Start the full guided methodology |
| `/cp` | Step 1: Identify Customer Problems (the WHY) |
| `/glance` | Step 2: Create Software Glance (high-level view) |
| `/cn` | Step 3: Define Customer Needs (the WHAT) |
| `/vision` | Step 4: Document Software Vision (architecture) |
| `/fr` | Step 5: Specify Functional Requirements (the HOW) |
| `/zigzag` | Validate traceability between artifacts |
| `/complexity` | **Optional:** Axiomatic Design quality analysis |

### Optional: Complexity Analysis (`/complexity`)

For deeper quality analysis on critical systems, you can explicitly call `/complexity` to:
- Analyze specification independence (coupled vs. uncoupled)
- Use C/P (Complete/Partial) completeness markers
- Apply Axiomatic Design principles

This is **not** part of the standard flow—use it when you need formal quality gates.

### Understanding Customer Problems (`/cp`)

Customer Problems are classified by severity to help prioritize requirements:

```mermaid
graph TD
    CP[Customer Problem] --> O{Classification}
    O -->|Must, Required| OB[Obligation<br/>High Priority<br/>Legal/Contractual]
    O -->|Expects, Should| EX[Expectation<br/>Medium Priority<br/>Business Goal]
    O -->|Hopes, Wishes| HO[Hope<br/>Low Priority<br/>Improvement]
    
    OB --> I1[Severe consequences<br/>if unsolved]
    EX --> I2[Moderate impact<br/>if unsolved]
    HO --> I3[Minimal penalty<br/>if unsolved]
    
    style OB fill:#ff6b6b
    style EX fill:#ffa502
    style HO fill:#ffeaa7
```

This classification helps teams understand which problems are critical and must be solved versus nice-to-have improvements.

## 📊 Methodology Overview

### The 5-Step Process

```mermaid
graph LR
    A[Business Context] --> B[Step 1: Customer Problems - WHY]
    B --> C[Step 2: Software Glance]
    C --> D[Step 3: Customer Needs - WHAT]
    D --> E[Step 4: Software Vision]
    E --> F[Step 5: Functional Requirements - HOW]
    F --> G[Ready to Code]

    style B fill:#ff6b6b
    style C fill:#4ecdc4
    style D fill:#45b7d1
    style E fill:#96ceb4
    style F fill:#ffeaa7
```

Each step builds on the previous one, ensuring all requirements trace back to real business problems.

## 🛠️ Installation

### Option 1: Let Your AI Agent Install It (Easiest)

Just ask your AI agent:
```
Install the Problem-Based SRS skill from RafaelGorski/Problem-Based-SRS
```

### Option 2: Manual Installation

Clone the repository and copy to your skills directory:

```bash
# Clone
git clone https://github.com/RafaelGorski/Problem-Based-SRS.git

# Copy to your AI agent's skills directory
# For Claude Code
cp -r Problem-Based-SRS/skills/problem-based-srs ~/.claude/skills/

# For GitHub Copilot
cp -r Problem-Based-SRS/skills/problem-based-srs ~/.copilot/skills/
```

**User-level skills directories by agent:**

| Agent | macOS/Linux | Windows |
|-------|-------------|---------|
| Claude Code | `~/.claude/skills/` | `%USERPROFILE%\.claude\skills\` |
| GitHub Copilot | `~/.copilot/skills/` | `%USERPROFILE%\.copilot\skills\` |
| Gemini CLI | `~/.gemini/skills/` | `%USERPROFILE%\.gemini\skills\` |
| Cline | `~/.cline/skills/` | `%USERPROFILE%\.cline\skills\` |
| Goose | `~/.config/goose/skills/` | `%USERPROFILE%\.config\goose\skills\` |

### Option 3: Project-Level Installation (Recommended for Teams)

Install the skill directly into your project repository so every team member and CI agent gets it automatically via version control.

**Using the skills CLI:**
```bash
npx skills add RafaelGorski/Problem-Based-SRS
```

The CLI will prompt you to select which agent directories to install into (e.g., `.github/skills/`, `.claude/skills/`).

**Manual project-level install:**
```bash
# Clone
git clone https://github.com/RafaelGorski/Problem-Based-SRS.git

# For GitHub Copilot (project-level)
cp -r Problem-Based-SRS/skills/problem-based-srs your-project/.github/skills/

# For Claude Code (project-level)
cp -r Problem-Based-SRS/skills/problem-based-srs your-project/.claude/skills/
```

**Project-level skills directories by agent:**

| Agent | Project Directory |
|-------|-------------------|
| GitHub Copilot | `.github/skills/` |
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/skills/` |

> **Tip:** Project-level skills are version-controlled with your repo, ensuring the whole team shares the same methodology. Commit the installed skill directory to your repository.


## 💡 Usage Examples

### Basic Workflow

1. **Start a conversation:**
```
I need requirements for an inventory management system. Our warehouse
tracks everything in spreadsheets and loses $50k/month due to errors.
```

2. **The AI will guide you through:**
   - Identifying Customer Problems (the WHY)
   - Creating Software Glance (high-level view)
   - Defining Customer Needs (the WHAT)
   - Building Software Vision (architecture)
   - Specifying Functional Requirements (the HOW)
   - Validating traceability with `/zigzag`

### Common Use Cases

**New Project:** Use `/problem-based-srs` to go through all 5 steps sequentially.

**Refining Existing Requirements:** Use `/fr` to review and validate your current requirements.

**Finding Root Problems:** Use `/cp` when stakeholders describe solutions instead of problems.

**Quality Check:** Use `/zigzag` to verify all requirements trace back to real business problems.

## 🧪 Testing

This repository includes comprehensive tests to ensure quality.

**Test Coverage:** 57 of 58 tests passing (98.3%)

```bash
# Install dependencies
pip install pytest strictyaml

# Run all tests
pytest tests/ -v
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

## 📚 Additional Resources

- **[TESTING.md](TESTING.md)** - Testing documentation
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **docs/** - Research paper and methodology details
- **skills/problem-based-srs/** - AgentSkills format for AI agents
  - `references/crm-example.md` - Complete CRM case study walkthrough
  - `references/microer-example.md` - Renewable energy system walkthrough
  - `references/complexity-analysis.md` - Optional Axiomatic Design analysis
- **spec/** - Test specifications and requirements

## 📋 Version 1.1 (February 2026)

Latest release featuring:

- **NEW:** `/complexity` command for optional Axiomatic Design quality analysis
- **NEW:** Condensed case study examples (CRM and MicroER)
- **NEW:** C/P (Complete/Partial) completeness markers in traceability
- **NEW:** Problem decomposition guidance with heuristics
- **NEW:** Expanded CN outcome class examples (Control, Construction, Entertainment)
- **NEW:** Agile/sprint integration patterns
- AgentSkills format compatible with GitHub Copilot, Claude, and other AI agents
- Complete 5-step methodology with traceability validation
- 57+ tests for quality assurance
