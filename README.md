### Installation

#### Method 1: Clone the Repository (Recommended)

You can install the skill manually by cloning the repository:

```bash
git clone https://github.com/RafaelGorski/Problem-Based-SRS.git
```

And then copying the skill to the appropriate location for your agent:

| Agent | Skills directory (macOS/Linux) | Skills directory (Windows) |
|-------|-------------------------------|---------------------------|
| Claude Code | `~/.claude/skills/` | `%USERPROFILE%\.claude\skills\` |
| VS Code and GitHub Copilot | `~/.copilot/skills/` | `%USERPROFILE%\.copilot\skills\` |
| Gemini CLI | `~/.gemini/skills/` | `%USERPROFILE%\.gemini\skills\` |
| Cline | `~/.cline/skills/` | `%USERPROFILE%\.cline\skills\` |
| Goose | `~/.config/goose/skills/` | `%USERPROFILE%\.config\goose\skills\` |
| Codex | `~/.codex/skills/` | `%USERPROFILE%\.codex\skills\` |

**Example (macOS/Linux):**
```bash
# Clone the repository
git clone https://github.com/RafaelGorski/Problem-Based-SRS.git

# Copy skill to Claude Code
cp -r Problem-Based-SRS/skills/problem-based-srs ~/.claude/skills/

# Or copy skill to GitHub Copilot
cp -r Problem-Based-SRS/skills/problem-based-srs ~/.copilot/skills/
```

**Example (Windows PowerShell):**
```powershell
# Clone the repository
git clone https://github.com/RafaelGorski/Problem-Based-SRS.git

# Copy skill to Claude Code
Copy-Item -Recurse Problem-Based-SRS\skills\problem-based-srs $env:USERPROFILE\.claude\skills\

# Or copy skill to GitHub Copilot
Copy-Item -Recurse Problem-Based-SRS\skills\problem-based-srs $env:USERPROFILE\.copilot\skills\
```

#### Method 2: Add as Submodule

Add the repository as a submodule to your existing project:

```bash
git submodule add https://github.com/RafaelGorski/Problem-Based-SRS.git .srs-methodology
```

#### Method 3: Copy Specific Files

Copy only the files you need directly to your project:

**For GitHub Copilot:**
```
Copy .github/prompts/ → your-project/.github/prompts/
```

**For Claude Code:**
```
Copy skills/problem-based-srs/ → your-project/skills/problem-based-srs/
```
