# Contributing to Problem-Based SRS

Thank you for your interest in contributing! We aim to make the **Problem-Based SRS** methodology accessible to every software engineer, regardless of which AI agent or tool they use.

We welcome contributions that improve existing prompts, add new skills, or verify compatibility with different AI models.

## 🤝 Ways to Contribute

### 1. Agent Compatibility & Testing
Since AI models behave differently, we need help verifying our prompts across the ecosystem.
- **Test existing prompts** with models like DeepSeek, Llama 3, GPT-4, Gemini, etc.
- Report issues or improvements needed for specific models.
- Add "Tested with [Model Name]" metadata to prompts if you've verified them.

### 2. Improving Prompts
- Refine instructions for better clarity.
- Add more real-world examples to the prompt files.
- Optimize prompts to use fewer tokens while maintaining quality.

### 3. Adding New Skills
- Implement new [AgentSkills](https://agentskills.io) for specific requirements engineering tasks.
- Create skills for specific domains (e.g., `srs-healthcare`, `srs-fintech`).

## 📋 Guidelines

### Universal Prompts (`prompts/` directory)
These files should remain **model-agnostic**.
- Avoid syntax specific to a single tool unless wrapped in a specific section.
- Focus on clear, natural language instructions.
- Use standard Markdown.

### AgentSkills (`skills/` directory)
Follow the [AgentSkills Specification](https://agentskills.io/specification).
- Ensure `SKILL.md` has correct YAML frontmatter.
- Keep the skill description accurate for semantic routing.
- Place helper files in a `references/` subdirectory.

## 🧪 Reporting Agent Compatibility

When submitting a PR that improves compatibility with a specific agent, please include:
1. **Agent/Model Name**: (e.g., "DeepSeek V3", "Claude 3.5 Sonnet", "GPT-4o")
2. **Context Window**: If the prompt relies on a large context.
3. **Success Evidence**: A brief snippet or screenshot showing the agent successfully following the methodology.

## 🚀 Pull Request Process

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-prompt`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

## 🛠️ Helper Scripts

The repository includes PowerShell helper scripts in `docs/helper/` to assist with documentation maintenance.

### Rendering Mermaid Diagrams

When updating diagrams in the README or documentation:

**Prerequisites:**
```powershell
npm install -g @mermaid-js/mermaid-cli
```

**Steps:**

1. **Create Mermaid files** - Extract mermaid code blocks from README.md and save as `.mmd` files in `docs/img/`:
   ```powershell
   # Example: Create a file named "diagram-name.mmd" with mermaid syntax
   ```

2. **Render to PNG** - Run the rendering script:
   ```powershell
   .\docs\helper\render-diagrams.ps1
   ```
   This converts all `.mmd` files in `docs/img/` to PNG format with transparent backgrounds.

3. **Clean up** - Remove temporary `.mmd` source files:
   ```powershell
   .\docs\helper\cleanup-mmd.ps1
   ```

4. **Verify** - Check that PNG files are properly generated and displayed in `docs/index.html`

**Manual Rendering:**
```powershell
mmdc -i docs/img/diagram-name.mmd -o docs/img/diagram-name.png -b transparent
```

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License used by this project.
