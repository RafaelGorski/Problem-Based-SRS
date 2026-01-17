# Claude Code Integration Guide

## Overview

This guide explains how to use Problem-Based SRS prompts with Claude Code (Claude for coding tasks) to enhance requirements engineering, analysis, and documentation.

## What is Claude Code?

Claude Code refers to using Claude AI (via Anthropic Console, API, or integrations) for software development tasks, including requirements engineering and documentation.

## Integration Methods

### Method 1: Using Claude Desktop or Web Interface

#### Step 1: Prepare Your Context

1. Have the Problem-Based SRS prompt files ready
2. Gather your project documentation
3. Prepare any existing requirements or problem statements

#### Step 2: Load Prompts as Context

**Option A: Upload Prompt Files** (Claude Desktop/Pro)
```
Upload files to Claude:
- 01-problem-identification.md
- 02-requirements-elicitation.md
- 03-requirements-specification.md
- 04-requirements-validation.md
- Your project documentation
```

**Option B: Copy-Paste Prompt Content**
```
I want you to act as a requirements analyst following this methodology:

[Paste content from relevant prompt file]

Now, let's work on [your specific task]...
```

#### Step 3: Work Through SRS Phases

**Phase 1: Problem Identification**
```
I've uploaded the problem-identification prompt. Please follow that methodology to help me analyze problems with our customer support ticketing system. Start by asking about stakeholders.
```

**Phase 2: Requirements Elicitation**
```
Based on the problem analysis document I've shared, follow the requirements-elicitation prompt to help me gather comprehensive requirements. Focus on functional requirements first.
```

**Phase 3: Requirements Specification**
```
Using the requirements-specification prompt as your guide, help me create a formal SRS document. I'll provide the raw requirements, and you structure them according to the methodology.
```

**Phase 4: Requirements Validation**
```
Please review this SRS document following the validation prompt. Identify any issues with completeness, consistency, clarity, or feasibility.
```

### Method 2: Using Claude API

Integrate Problem-Based SRS prompts programmatically:

#### Example: Python Integration

```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

# Load prompt content
with open("prompts/01-problem-identification.md", "r") as f:
    problem_prompt = f.read()

# Load project context
with open("docs/project-context.md", "r") as f:
    project_context = f.read()

# Create message with SRS methodology
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    system=f"{problem_prompt}\n\nProject Context:\n{project_context}",
    messages=[{
        "role": "user",
        "content": "Help me identify and analyze problems with our inventory management system. Start by asking about stakeholders."
    }]
)

print(message.content[0].text)
```

#### Example: Node.js Integration

```javascript
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load prompts
const problemPrompt = fs.readFileSync(
  "prompts/01-problem-identification.md",
  "utf8"
);

const projectContext = fs.readFileSync(
  "docs/project-context.md",
  "utf8"
);

// Create analysis
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 4096,
  system: `${problemPrompt}\n\nProject Context:\n${projectContext}`,
  messages: [{
    role: "user",
    content: "Analyze problems with our checkout process and create a problem analysis document."
  }]
});

console.log(message.content[0].text);
```

### Method 3: Using Claude with VS Code Extensions

Several extensions enable Claude integration in VS Code:

#### Option A: Cline (formerly Claude Dev)

1. Install Cline extension from VS Code marketplace
2. Configure with your Anthropic API key
3. Open Cline sidebar

**Usage:**
```
Load .ai-prompts/01-problem-identification.md

Follow this methodology to help me document problems with our authentication system.
```

#### Option B: Continue.dev

1. Install Continue extension
2. Add Claude as a provider in config
3. Add Problem-Based SRS prompts to context

**config.json:**
```json
{
  "models": [{
    "title": "Claude 3.5 Sonnet",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "your-api-key"
  }],
  "contextProviders": [{
    "name": "file",
    "params": {
      "include": [".ai-prompts/**/*.md", "docs/**/*.md"]
    }
  }]
}
```

**Usage:**
```
@file .ai-prompts/02-requirements-elicitation.md
Help me gather requirements for the problems we identified
```

### Method 4: Claude Projects Feature

Use Claude Projects to maintain context across conversations:

#### Step 1: Create an SRS Project

1. In Claude interface, create a new Project: "SRS - [Your Project Name]"
2. Add Project Knowledge:
   - Upload all four SRS prompt files
   - Add project documentation
   - Add any existing requirements or problem statements

#### Step 2: Set Project Instructions

```markdown
You are a software requirements engineer specializing in Problem-Based SRS methodology. 

Follow the methodology documents in this project:
- For problem identification, follow 01-problem-identification.md
- For requirements gathering, follow 02-requirements-elicitation.md
- For formal specification, follow 03-requirements-specification.md
- For validation, follow 04-requirements-validation.md

Always:
- Ask clarifying questions
- Be specific and avoid ambiguity
- Link requirements to problems
- Provide structured output
- Use examples to clarify

Project Context: [Brief description of your project]
```

#### Step 3: Use Across Conversations

All conversations in this project will have access to SRS prompts and your project context:

```
Let's start Phase 1: Problem Identification for our reporting feature.
```

## Best Practices

### 1. Provide Rich Context

Give Claude comprehensive context upfront:

```
I'm working on a SaaS project for healthcare scheduling. Stack: React, Node.js, PostgreSQL. Users: clinic administrators, doctors, patients. We need to improve the appointment booking flow.

Following the problem identification methodology, help me analyze current problems.
```

### 2. Use Artifacts Feature

When Claude generates documents, use the Artifacts feature (automatically activated for longer outputs):

- Problem analysis documents
- Requirements lists
- SRS documents
- Validation reports

Benefits:
- Easy to copy and save
- Can be iterated on
- Remains visible while chatting

### 3. Iterate Systematically

Work through phases methodically:

```
# Start
Help me identify problems following the methodology [Phase 1]

# After problems documented
Now let's gather requirements for these problems [Phase 2]

# After requirements gathered
Create a formal SRS document from these requirements [Phase 3]

# After SRS created
Validate this SRS document [Phase 4]
```

### 4. Request Specific Formats

Be explicit about output format:

```
Create a requirements validation report following the format in the validation prompt. Use markdown tables for the issues list and include all sections: completeness check, consistency check, correctness verification, etc.
```

### 5. Chain Prompts for Complex Tasks

For large projects, break down into sessions:

**Session 1: Problem Identification**
```
Following problem-identification prompt, help me analyze problems with user authentication. Save our discussion as a problem analysis document.
```

**Session 2: Requirements (New Chat)**
```
Attached is the problem analysis from our previous session. Using the requirements-elicitation prompt, help me gather requirements to address these problems.
```

## Example Workflows

### Complete SRS Workflow with Claude

#### Workflow 1: New Feature

```
Session 1: Problem Analysis
----------------------------
I've uploaded the four SRS methodology prompts. Let's create a complete SRS for a new feature: real-time notifications.

Start with Phase 1 (Problem Identification):
- Help me identify stakeholders
- Document current state
- Identify and prioritize problems

[Work through with Claude, save output to problem-analysis.md]

Session 2: Requirements Gathering
----------------------------------
[Upload problem-analysis.md]

Now Phase 2 (Requirements Elicitation):
- Create user stories
- Define functional requirements
- Specify non-functional requirements
- Document acceptance criteria

[Save output to requirements.md]

Session 3: Formal Specification
--------------------------------
[Upload problem-analysis.md and requirements.md]

Phase 3 (Requirements Specification):
Create a complete SRS document with:
- All sections from the specification prompt
- Requirements traceability matrix
- Proper formatting and IDs

[Save output to SRS.md]

Session 4: Validation
----------------------
[Upload SRS.md]

Phase 4 (Requirements Validation):
Review the SRS and create a validation report identifying:
- Completeness issues
- Consistency problems
- Ambiguities
- Testability concerns
- Feasibility risks

[Save output to validation-report.md]
```

#### Workflow 2: Existing System Documentation

```
I need to create SRS documentation for an existing system. Here's the system architecture and current functionality...

[Provide system details]

Follow Problem-Based SRS methodology to help me:
1. Reverse-engineer the problems this system solves
2. Document requirements based on current functionality
3. Create formal SRS
4. Identify gaps or undocumented requirements
```

#### Workflow 3: Requirements Review

```
I have an existing requirements document [upload file]. 

Using the Problem-Based SRS validation methodology:
1. Check if requirements trace back to clear problems
2. Identify ambiguous or unclear requirements
3. Verify completeness and consistency
4. Suggest improvements
5. Create a validation report
```

### Multi-document Generation

```
Create a complete set of SRS documents for [project]:

1. Problem Analysis Document (following Phase 1 prompt)
2. Requirements Document (following Phase 2 prompt)
3. Formal SRS (following Phase 3 prompt)
4. Validation Report (following Phase 4 prompt)

Include all recommended sections, tables, and traceability matrices.

Project context: [describe project]
Stakeholders: [list stakeholders]
Current challenges: [describe problems]
```

## Advanced Techniques

### 1. Template Generation

```
Create reusable templates based on the SRS prompts for:
- Problem analysis meetings
- Requirements elicitation workshops
- SRS document structure
- Validation checklists

Customize for: [your domain/industry]
```

### 2. Comparative Analysis

```
I have two sets of requirements [upload both].

Compare them using Problem-Based SRS principles:
- Which better traces to actual problems?
- Which has clearer acceptance criteria?
- Which is more complete and testable?
- Recommend improvements for both
```

### 3. Stakeholder Communication

```
I need to present requirements to [stakeholder type].

Transform this technical SRS into a [format]:
- Executive summary for C-level
- User-friendly overview for end users
- Technical deep-dive for developers
- Test plan outline for QA

Maintain traceability to original requirements.
```

## Tips for Effective Use

1. **Upload Multiple Files**: Claude can handle multiple files at once—upload all relevant context

2. **Use Follow-ups**: Build on previous responses:
   ```
   That's good. Now add risk analysis for each requirement.
   ```

3. **Request Revisions**: Don't hesitate to ask for changes:
   ```
   This requirement is too vague. Make it more specific with measurable criteria.
   ```

4. **Save Progress**: Keep generated artifacts and use them in subsequent conversations

5. **Leverage Long Context**: Claude has a large context window—include all relevant documentation

## Troubleshooting

**Issue**: Claude's responses are too generic
- **Solution**: Provide more specific project context and domain details
- **Solution**: Reference specific sections of the prompt you want emphasized

**Issue**: Output doesn't match prompt format
- **Solution**: Explicitly request the format: "Use the exact table structure from the prompt"
- **Solution**: Provide an example of the desired output format

**Issue**: Claude loses context in long conversations
- **Solution**: Use Claude Projects to maintain persistent context
- **Solution**: Summarize previous discussion at the start of new messages

**Issue**: Generated requirements lack specificity
- **Solution**: Ask follow-up questions: "Make NFR-001 more specific with exact numbers"
- **Solution**: Provide examples of good requirements from your domain

## Integration with Development Tools

### Export to Jira/Azure DevOps

```
Convert these requirements into Jira story format:
- Epic: [Problem category]
- Stories: [User stories with acceptance criteria]
- Tasks: [Implementation tasks]
- Include story points estimates
```

### Generate Test Cases

```
Based on this SRS, generate test cases for each requirement:
- Unit test scenarios
- Integration test scenarios
- Acceptance test scenarios
Include Given-When-Then format
```

### Create Technical Designs

```
From these requirements, suggest high-level technical design:
- System architecture
- Component breakdown
- API contracts
- Data models
Maintain traceability to requirements
```

## Resources

- [Claude Documentation](https://docs.anthropic.com/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Anthropic Console](https://console.anthropic.com/)
- Problem-Based SRS Repository: https://github.com/RafaelGorski/Problem-Based-SRS

## Feedback

Have suggestions for better Claude integration? Please contribute to the repository or open an issue.
