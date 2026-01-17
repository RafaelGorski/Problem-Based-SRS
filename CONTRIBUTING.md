# Contributing to Problem-Based SRS

Thank you for your interest in contributing to Problem-Based SRS! This project aims to provide high-quality, practical prompts and guidance for requirements engineering.

## 🎯 Project Goals

- Keep it **lightweight**: Focus on prompts and methodology, not heavy tooling
- Keep it **practical**: Real-world applicability over theoretical perfection
- Keep it **AI-friendly**: Designed for use with AI agents like GitHub Copilot and Claude
- Keep it **accessible**: Clear language that both technical and non-technical stakeholders can understand

## 🤝 How to Contribute

### Types of Contributions Welcome

1. **Prompt Improvements**
   - Clarify existing prompts
   - Add missing guidance
   - Fix errors or ambiguities
   - Improve structure or formatting

2. **New Examples**
   - Real-world case studies
   - Domain-specific examples (healthcare, fintech, etc.)
   - Small to large project examples
   - Success stories and lessons learned

3. **Integration Guides**
   - New AI tool integrations
   - IDE-specific workflows
   - API integration examples
   - Automation scripts

4. **Documentation**
   - Fix typos and grammar
   - Improve clarity
   - Add missing information
   - Translate to other languages

5. **Templates**
   - Reusable requirement templates
   - Document templates
   - Workshop facilitator guides
   - Checklists

## 📝 Contribution Guidelines

### For Prompt Changes

When modifying prompts in `/prompts/`:

1. **Maintain structure**: Keep the existing sections (Your Role, Process, Output Format, Guidelines)
2. **Be specific**: Use concrete examples rather than abstract concepts
3. **Stay practical**: Focus on what works in real projects
4. **Include examples**: Show good vs. bad requirement writing
5. **Test with AI**: Verify the prompt works well with GitHub Copilot and Claude

### For Examples

When adding examples to `/examples/`:

1. **Use realistic scenarios**: Base on real projects (anonymized if needed)
2. **Show complete workflow**: Cover all four phases
3. **Include metrics**: Quantify problems and success criteria
4. **Document lessons learned**: What worked, what didn't
5. **Provide context**: Industry, team size, timeline, constraints

### For Documentation

When updating docs in `/docs/`:

1. **Keep it concise**: Developers are busy; respect their time
2. **Use formatting**: Headers, lists, tables, code blocks
3. **Link to resources**: Reference relevant prompts, examples, external docs
4. **Update related docs**: If you change one guide, check if others need updates

### General Guidelines

- **Test your changes**: Ensure examples work, links aren't broken
- **Follow existing style**: Match the tone and formatting of existing content
- **One change per PR**: Keep pull requests focused
- **Update README if needed**: Major additions should be mentioned in README

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR-USERNAME/Problem-Based-SRS.git
cd Problem-Based-SRS
```

### 2. Create a Branch

```bash
git checkout -b your-feature-name
```

Use descriptive branch names:
- `improve-problem-prompt`
- `add-healthcare-example`
- `fix-typos-in-methodology`

### 3. Make Your Changes

Edit files using your preferred editor. Test prompts with AI tools if applicable.

### 4. Commit Your Changes

Write clear commit messages:

```bash
git add .
git commit -m "Add healthcare requirements example"
```

Good commit messages:
- "Clarify acceptance criteria section in elicitation prompt"
- "Add example for mobile app requirements"
- "Fix broken links in integration guides"

### 5. Push and Create PR

```bash
git push origin your-feature-name
```

Then create a Pull Request on GitHub with:
- **Clear title**: What does this PR do?
- **Description**: Why is this change needed?
- **Testing**: How did you verify it works?
- **Related issues**: Reference any issues this addresses

## 📋 Pull Request Checklist

Before submitting your PR:

- [ ] Changes follow the project's style and guidelines
- [ ] No typos or grammatical errors
- [ ] Links work and point to correct locations
- [ ] Examples are realistic and complete
- [ ] Prompts tested with at least one AI tool (if applicable)
- [ ] Documentation updated if needed
- [ ] Commit messages are clear
- [ ] PR description explains what and why

## 🎨 Style Guide

### Markdown Formatting

- Use `#` for headers (not underlines)
- Use `-` for unordered lists (not `*`)
- Use `` ` `` for inline code
- Use ` ``` ` for code blocks with language identifier
- Use `**bold**` for emphasis (not `__`)
- Use `*italic*` for lesser emphasis

### Writing Style

- **Active voice**: "System shall validate" (not "shall be validated")
- **Present tense**: "User clicks button" (not "will click")
- **Specific language**: "within 2 seconds" (not "quickly")
- **Avoid jargon**: Explain technical terms when necessary
- **Short paragraphs**: 2-4 sentences max
- **Use examples**: Show, don't just tell

### Requirement Writing

When showing example requirements:

- Use "shall" for mandatory requirements
- Use "should" for recommended features  
- Use "may" for optional features
- Always include acceptance criteria
- Always assign a priority
- Always link to a problem or objective

## 🐛 Reporting Issues

Found a problem? Please open an issue with:

1. **Clear title**: Summarize the issue
2. **Description**: What's wrong? What did you expect?
3. **Location**: Which file(s) are affected?
4. **Reproduction**: Steps to reproduce (if applicable)
5. **Suggestions**: Ideas for fixing it (optional)

### Issue Labels

We use these labels:
- `bug`: Something isn't working correctly
- `documentation`: Improvements to docs
- `enhancement`: New features or improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `question`: Further information requested
- `example`: New example needed

## 🌟 Recognition

Contributors will be:
- Listed in release notes
- Mentioned in commit history
- Appreciated greatly! 🙏

## ❓ Questions?

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Email**: Contact the maintainer for private inquiries

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behavior includes:**
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Trolling, insulting comments, or personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

### Enforcement

Violations may result in temporary or permanent ban from the project.

## 🎓 Learning Resources

New to requirements engineering? Check these out:

- [IEEE 830 Standard](https://standards.ieee.org/standard/830-1998.html) - Traditional SRS standard
- [User Story Mapping](https://www.jpattonassociates.com/user-story-mapping/) - Collaborative requirements technique
- [INVEST Criteria](https://en.wikipedia.org/wiki/INVEST_(mnemonic)) - Good user story principles
- Our [Methodology Guide](docs/METHODOLOGY.md) - Problem-Based SRS explained

## 🚦 What We're NOT Looking For

To keep this project focused:

- ❌ **Heavy frameworks**: No complex tooling or dependencies
- ❌ **Code implementations**: This is about prompts/methodology, not code
- ❌ **Off-topic examples**: Stick to requirements engineering
- ❌ **Proprietary content**: Only open-source friendly contributions
- ❌ **Over-complexity**: Keep it simple and practical

## 📅 Release Process

We follow semantic versioning:
- **Major**: Breaking changes to methodology or prompts
- **Minor**: New prompts, examples, or integration guides
- **Patch**: Bug fixes, typos, clarifications

Releases happen when significant changes accumulate.

## 🙏 Thank You!

Every contribution, no matter how small, makes this project better. Whether you're fixing a typo or adding a comprehensive example, your effort helps software engineers worldwide create better requirements.

**Happy contributing!** 🎉
