# Multi-Agent Orchestrator

A multi-agent orchestration system using the Claude SDK. Runs on your Claude Pro/Max subscription instead of API credits.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Login to Claude (choose subscription account)
claude login

# Create your project plan
echo "Step 1: ..." > guide.md

# Run the orchestrator
python orchestrator.py
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Lead Agent                           │
│  (Orchestrator - reads guide.md, dispatches workers)    │
└─────────────────────┬───────────────────────────────────┘
                      │ dispatches to
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │dev_agent│   │research │   │ custom  │
   │         │   │ _agent  │   │ _agent  │
   └─────────┘   └─────────┘   └─────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  ./workspace  │
              │ (shared files)│
              └───────────────┘
```

## CLI Usage

```bash
# Basic usage (uses default agents)
python orchestrator.py

# Specify a custom agents config
python orchestrator.py --agents-config ./my_agents.json

# Specify a different guide file
python orchestrator.py --guide ./project_plan.md

# List available agents
python orchestrator.py --list-agents

# Generate a sample agents config
python orchestrator.py --init-config

# Generate a config with inheritance template
python orchestrator.py --init-with-base

# Run without human approval (fully autonomous)
python orchestrator.py --no-approval

# Combine options
python orchestrator.py -a ./agents.json -g ./plan.md --no-approval
```

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--agents-config PATH` | `-a` | Path to agents configuration JSON file |
| `--guide PATH` | `-g` | Path to guide/plan file (default: guide.md) |
| `--list-agents` | | List available agents and exit |
| `--init-config` | | Create sample agents_config.json |
| `--init-with-base` | | Create sample config with inheritance |
| `--no-approval` | | Disable human approval gate |

## Agent Configuration

### Config Search Order

The orchestrator searches for agent configurations in this order:

1. **CLI argument**: `--agents-config ./path/to/agents.json`
2. **Environment variable**: `AGENTS_CONFIG=/path/to/agents.json`
3. **Current directory**: `./agents_config.json`
4. **Orchestrator directory**: `<script_dir>/agents_config.json`
5. **Built-in defaults**: `dev_agent` and `research_agent`

### Configuration File Format

Create `agents_config.json`:

```json
{
    "dev_agent": {
        "description": "Senior Developer. Writes code, creates files, executes commands.",
        "system_prompt": "You are a Senior Developer...",
        "allowed_tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
    },
    "research_agent": {
        "description": "Web Researcher. Finds information, verifies facts.",
        "system_prompt": "You are a Web Researcher...",
        "allowed_tools": ["Read", "Write", "WebSearch", "WebFetch", "Glob"]
    },
    "qa_agent": {
        "description": "QA Engineer. Tests code, validates functionality.",
        "system_prompt": "You are a QA Engineer...",
        "allowed_tools": ["Read", "Bash", "Glob", "Grep"]
    }
}
```

### Agent Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `description` | No | Short description shown to lead agent (auto-generated if missing) |
| `system_prompt` | **Yes** | Full instructions for the agent's behavior |
| `allowed_tools` | No | List of tools the agent can use (all tools if not specified) |

### Available Tools

| Tool | Description |
|------|-------------|
| `Read` | Read files |
| `Write` | Create/overwrite files |
| `Edit` | Edit existing files |
| `Bash` | Execute shell commands |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `WebSearch` | Search the web |
| `WebFetch` | Fetch web page content |

## Configuration Inheritance

For teams managing multiple projects, you can share common agents via inheritance.

### Base Configuration

Create a shared base config (e.g., `shared/base_agents.json`):

```json
{
    "dev_agent": {
        "description": "Senior Developer",
        "system_prompt": "You are a Senior Developer...",
        "allowed_tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
    },
    "research_agent": {
        "description": "Web Researcher",
        "system_prompt": "You are a Web Researcher...",
        "allowed_tools": ["Read", "Write", "WebSearch", "WebFetch", "Glob"]
    },
    "review_agent": {
        "description": "Code Reviewer",
        "system_prompt": "You are a Code Reviewer...",
        "allowed_tools": ["Read", "Glob", "Grep"]
    }
}
```

### Project Configuration with Inheritance

Create a project-specific config that inherits from base:

```json
{
    "_base": "../shared/base_agents.json",
    "_extends": ["dev_agent", "research_agent"],

    "project_agent": {
        "description": "Project-specific agent",
        "system_prompt": "You are specialized for this project...",
        "allowed_tools": ["Read", "Write", "Bash"]
    }
}
```

### Inheritance Options

| Field | Description |
|-------|-------------|
| `_base` | Path to base config (relative to current config or absolute) |
| `_extends` | List of agent names to inherit from base (omit to inherit all) |

### Override Base Agents

You can override inherited agents by redefining them:

```json
{
    "_base": "../shared/base_agents.json",

    "dev_agent": {
        "description": "Custom dev agent for this project",
        "system_prompt": "Project-specific instructions...",
        "allowed_tools": ["Read", "Write", "Edit", "Bash"]
    }
}
```

## Project Structure Examples

### Single Project

```
my_project/
├── orchestrator.py
├── config.py
├── guide.md              # Your project plan
├── agents_config.json    # Optional: custom agents
└── workspace/            # Agent working directory
```

### Multi-Project with Shared Agents

```
orchestrator/
├── orchestrator.py
├── config.py
└── shared/
    └── base_agents.json     # Shared agent definitions

projects/
├── project_a/
│   ├── agents_config.json   # { "_base": "../../orchestrator/shared/base_agents.json" }
│   └── guide.md
│
├── project_b/
│   ├── agents_config.json   # Different agents
│   └── guide.md
│
└── project_c/
    └── guide.md             # Uses default agents (no config file)
```

Run from each project:

```bash
cd projects/project_a
python ../../orchestrator/orchestrator.py
```

### Using Environment Variables

Set once in your shell profile:

```bash
# .bashrc or .zshrc
export AGENTS_CONFIG=/path/to/company/standard_agents.json
```

Then run from any project:

```bash
cd any_project
python /path/to/orchestrator.py
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTS_CONFIG` | Path to agents configuration file |
| `WORKSPACE_DIR` | Working directory for agents (default: ./workspace) |
| `HUMAN_APPROVAL_GATE` | Set to "false" for autonomous mode (default: true) |

## Adding a New Agent

1. **Edit your config file** (or create one with `--init-config`):

```json
{
    "my_new_agent": {
        "description": "Brief description for the lead agent",
        "system_prompt": "Detailed instructions for the agent...",
        "allowed_tools": ["Read", "Write", "Bash"]
    }
}
```

2. **Verify the agent is loaded**:

```bash
python orchestrator.py --list-agents
```

3. **Reference in guide.md**:

```markdown
## Step 3: Data Processing
Dispatch to my_new_agent to process the data files.
```

## Writing Effective System Prompts

A good system prompt should include:

```
You are a [Role]. You [primary responsibility].

WORKFLOW:
1. [Step 1]
2. [Step 2]
3. [Step 3]

RULES:
- [Important constraint 1]
- [Important constraint 2]

OUTPUT FORMAT:
When finished, provide:
- What was accomplished
- Files created/modified
- Any issues encountered
```

## Troubleshooting

### "Unknown agent" error

The lead agent tried to dispatch to an agent that doesn't exist.

**Fix**: Check that the agent name in `guide.md` matches exactly what's defined in your config.

```bash
# List available agents
python orchestrator.py --list-agents
```

### Config file not loading

Check the search order and verify your file path:

```bash
# See which config is being used
python orchestrator.py --list-agents
# Output shows: "Agent configuration source: ..."
```

### Agents not inheriting correctly

- Ensure `_base` path is correct (relative to config file location)
- Check that agent names in `_extends` match exactly
- Verify base config file is valid JSON

### Permission errors

Make sure the workspace directory is writable:

```bash
mkdir -p ./workspace
chmod 755 ./workspace
```

## Best Practices

1. **Version control your configs**: Keep `agents_config.json` in git
2. **Use inheritance for teams**: Share common agents, customize per-project
3. **Limit tool access**: Only give agents the tools they need
4. **Test with --list-agents**: Verify config loads correctly before running
5. **Start with human approval**: Use `--no-approval` only after testing

## File Reference

| File | Purpose |
|------|---------|
| `orchestrator.py` | Main entry point |
| `config.py` | Configuration and agent definitions |
| `guide.md` | Your project plan (required) |
| `agents_config.json` | Custom agent definitions (optional) |
| `workspace/` | Agent working directory |
| `checkpoint.json` | Session state for crash recovery |
| `orchestrator_*.log` | Execution logs |
