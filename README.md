# Problem-Based SRS

A lightweight, prompt-first repository that provides **standalone prompts** and guidance for following a **Problem-Based Software Requirements Specification (SRS)** methodology. Designed for integration with AI agents like **GitHub Copilot** and **Claude Code**.

## 🎯 Purpose

Enable software engineers and requirements analysts to leverage AI agents for better requirements engineering by providing:

- **Structured prompts** for each phase of requirements gathering
- **Problem-first methodology** that ensures requirements solve real needs
- **AI agent integration** guides for GitHub Copilot and Claude Code
- **Lightweight approach** with no heavy tooling or frameworks
- **Examples and templates** for immediate use

## 📋 What's Included

### Core Prompts

Four standalone prompts covering the complete SRS lifecycle:

1. **[Problem Identification](prompts/01-problem-identification.md)** - Identify and analyze problems before proposing solutions
2. **[Requirements Elicitation](prompts/02-requirements-elicitation.md)** - Gather comprehensive functional and non-functional requirements
3. **[Requirements Specification](prompts/03-requirements-specification.md)** - Create formal, structured SRS documents
4. **[Requirements Validation](prompts/04-requirements-validation.md)** - Verify requirements are complete, correct, and feasible

### Documentation

- **[Methodology Guide](docs/METHODOLOGY.md)** - Complete explanation of Problem-Based SRS principles
- **[GitHub Copilot Integration](docs/GITHUB_COPILOT_INTEGRATION.md)** - How to use with GitHub Copilot and Copilot Chat
- **[Claude Code Integration](docs/CLAUDE_CODE_INTEGRATION.md)** - How to use with Claude AI for coding tasks

### Examples

- **[E-Commerce Checkout Example](examples/ecommerce-checkout-example.md)** - Complete walkthrough from problem to validated requirements

## 🚀 Quick Start

### Option 1: Use with GitHub Copilot

1. Copy prompts to your project:
   ```bash
   mkdir -p .ai-prompts
   cd .ai-prompts
   git clone https://github.com/RafaelGorski/Problem-Based-SRS.git
   ```

2. In GitHub Copilot Chat:
   ```
   @workspace Using #file:.ai-prompts/Problem-Based-SRS/prompts/01-problem-identification.md 
   help me identify problems with our user authentication system
   ```

3. See [GitHub Copilot Integration Guide](docs/GITHUB_COPILOT_INTEGRATION.md) for more details.

### Option 2: Use with Claude Code

1. Clone or download this repository
2. Upload prompt files to Claude (Desktop/Web) or use Claude Projects
3. Ask Claude to follow the methodology:
   ```
   Follow the problem identification methodology in the uploaded file 
   to help me analyze issues with our checkout process
   ```

4. See [Claude Code Integration Guide](docs/CLAUDE_CODE_INTEGRATION.md) for more details.

### Option 3: Use as Reference

Simply read the prompts and methodology documents to guide your own requirements work, with or without AI assistance.

## 💡 Why Problem-Based SRS?

Traditional requirements gathering often starts with solutions, leading to:
- ❌ Requirements that don't solve real problems
- ❌ Over-engineered features nobody needs
- ❌ Difficulty prioritizing what's important
- ❌ Poor traceability from business goals to implementation

Problem-Based SRS methodology ensures:
- ✅ Every requirement traces to a real problem
- ✅ Problems are understood before solutions proposed
- ✅ Stakeholder needs drive priorities
- ✅ Clear acceptance criteria and validation

## 📖 Methodology Overview

### Phase 1: Problem Identification
- Identify stakeholders and their pain points
- Document current state and challenges
- Analyze root causes (not just symptoms)
- Prioritize problems by impact and urgency

### Phase 2: Requirements Elicitation
- Gather functional and non-functional requirements
- Create user stories with acceptance criteria
- Document constraints and assumptions
- Link requirements to problems

### Phase 3: Requirements Specification
- Structure requirements in formal SRS format
- Assign unique IDs and priorities
- Create traceability matrix
- Document interfaces, data models, dependencies

### Phase 4: Requirements Validation
- Verify completeness and consistency
- Check clarity and testability
- Assess technical feasibility
- Obtain stakeholder approval

See the [Methodology Guide](docs/METHODOLOGY.md) for complete details.

## 🤖 AI Agent Integration

This repository is specifically designed to work with AI coding assistants:

### GitHub Copilot
- Use prompts as context files in Copilot Chat
- Reference with `@workspace` and `#file:` syntax
- Integrate into `.github/copilot-instructions.md`
- Create project-specific SRS workflows

### Claude Code
- Upload prompts to Claude Projects for persistent context
- Use with VS Code extensions (Cline, Continue.dev)
- Integrate via Anthropic API for automation
- Maintain conversation history across SRS phases

Both integrations enable AI to:
- Guide you through structured requirements processes
- Generate initial requirements documents
- Validate and review existing requirements
- Maintain traceability throughout the project

## 📁 Repository Structure

```
Problem-Based-SRS/
├── prompts/                          # Core SRS prompts
│   ├── 01-problem-identification.md
│   ├── 02-requirements-elicitation.md
│   ├── 03-requirements-specification.md
│   └── 04-requirements-validation.md
├── docs/                             # Documentation
│   ├── METHODOLOGY.md
│   ├── GITHUB_COPILOT_INTEGRATION.md
│   └── CLAUDE_CODE_INTEGRATION.md
├── examples/                         # Real-world examples
│   └── ecommerce-checkout-example.md
├── LICENSE
└── README.md
```

## 🎓 Example Usage

### Complete Requirements Flow

1. **Identify the problem**:
   ```
   AI: Help me identify problems with our reporting system using the 
   problem identification methodology
   ```

2. **Gather requirements**:
   ```
   AI: Based on these problems, help me elicit requirements using the 
   requirements elicitation prompt
   ```

3. **Create formal SRS**:
   ```
   AI: Structure these requirements into a formal SRS document following 
   the specification prompt
   ```

4. **Validate requirements**:
   ```
   AI: Review this SRS using the validation methodology and identify any 
   issues or gaps
   ```

### Quick Validation

Already have requirements? Use Phase 4 prompt to validate:

```
AI: Review my existing requirements document using the validation prompt.
Check for completeness, consistency, clarity, and testability.
```

## 🛠️ Use Cases

- **New Feature Development** - Start with problem analysis before coding
- **Legacy System Documentation** - Reverse-engineer requirements from existing systems
- **Requirements Review** - Validate existing requirements against best practices
- **Stakeholder Communication** - Structure requirements discussions
- **Technical Specifications** - Transform business needs into technical requirements
- **Training** - Teach requirements engineering with structured framework

## 🔮 Roadmap

### Phase 1: Default Standalone Prompts ✅ (Current)
- ✅ Problem identification prompt
- ✅ Requirements elicitation prompt
- ✅ Requirements specification prompt
- ✅ Requirements validation prompt
- ✅ Integration guides for GitHub Copilot and Claude
- ✅ Methodology documentation
- ✅ Example walkthrough

### Phase 2: MCP Server (Planned)
- MCP Server for functional requirement decomposition
- Automated requirements traceability
- Integration with development workflow
- Requirements versioning and change tracking

## 🤝 Contributing

Contributions are welcome! This repository aims to stay lightweight and focused on prompts and methodology.

Ways to contribute:
- Submit additional examples
- Improve existing prompts
- Add integration guides for other AI tools
- Share feedback on methodology effectiveness
- Report issues or suggest improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/RafaelGorski/Problem-Based-SRS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RafaelGorski/Problem-Based-SRS/discussions)
- **Examples**: See [examples/](examples/) directory

## 🌟 Why Use This?

> "A problem well stated is a problem half solved." - Charles Kettering

This repository helps you state problems well, ensuring your requirements—and ultimately your software—solve real needs. By integrating with AI agents, you get structured guidance through the entire requirements process while maintaining control and professional standards.

Start with problems. End with great software.

---

**Made for engineers who want better requirements, faster.**
