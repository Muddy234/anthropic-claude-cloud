"""
orchestrator.py - Multi-agent orchestrator using Claude Agent SDK (v2).

Runs on your Claude Pro/Max subscription instead of API credits.
Requires: pip install claude-code
Auth:     claude login -> choose subscription account
          Make sure ANTHROPIC_API_KEY is NOT set in your env.

Architecture:
  - Lead agent (Warden) runs in a conversation loop with structured dispatch
  - Each round: lead plans -> dispatches workers -> receives results -> plans next
  - Workers are spawned as nested query() calls
  - Git commits after each round for rollback safety
  - Automated syntax validation on worker output
  - Resumable from checkpoint if session is interrupted
  - Structured session reports for post-mortem analysis
"""

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from claude_code_sdk import (
    ClaudeCodeOptions,
    query,
)

from config import (
    WORKSPACE_DIR,
    MAX_LEAD_ROUNDS,
    MAX_LEAD_TURN_DEPTH,
    MAX_WORKER_TURNS,
    MAX_WORKER_RETRIES,
    WORKER_OUTPUT_LIMIT,
    HUMAN_APPROVAL_GATE,
    GIT_COMMIT_ROUNDS,
    VALIDATE_WORKER_OUTPUT,
    MAX_RESULT_HISTORY_CHARS,
    MAX_GUIDE_IN_CONTINUATION,
    CHECKPOINT_FILE,
    SESSION_REPORT_DIR,
    LOG_FILE,
    get_agent_configs,
    create_sample_config,
    DEFAULT_AGENTS,
)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
def log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


# ---------------------------------------------------------------------------
# Workspace helpers
# ---------------------------------------------------------------------------
def ensure_workspace():
    os.makedirs(WORKSPACE_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Git integration
# ---------------------------------------------------------------------------
def git_available() -> bool:
    """Check if workspace is inside a git repo."""
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=10,
        )
        return r.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def git_head() -> Optional[str]:
    """Return current HEAD commit hash, or None."""
    try:
        r = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip() if r.returncode == 0 else None
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None


def git_has_changes() -> bool:
    """Check if there are any uncommitted changes (staged or unstaged)."""
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=10,
        )
        return bool(r.stdout.strip())
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def git_changed_files() -> list[str]:
    """Return list of files changed since last commit (unstaged + staged)."""
    try:
        r = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=10,
        )
        files = [f.strip() for f in r.stdout.strip().split("\n") if f.strip()]
        # Also get untracked files
        r2 = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard"],
            cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=10,
        )
        files += [f.strip() for f in r2.stdout.strip().split("\n") if f.strip()]
        return files
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []


def git_commit_round(round_num: int, agents: list[str]) -> Optional[str]:
    """
    Stage all changes and commit with round metadata.

    Returns:
        Commit hash if successful, None if nothing to commit or git unavailable.
    """
    if not git_has_changes():
        return None

    try:
        subprocess.run(
            ["git", "add", "-A"],
            cwd=WORKSPACE_DIR, capture_output=True, timeout=30,
        )

        agents_str = ", ".join(agents)
        msg = f"[orchestrator] Round {round_num}: {agents_str}"

        r = subprocess.run(
            ["git", "commit", "-m", msg, "--no-verify"],
            cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=30,
        )

        if r.returncode == 0:
            return git_head()
        return None
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None


def git_session_snapshot() -> Optional[str]:
    """Create a snapshot commit at session start if there are uncommitted changes."""
    if not git_has_changes():
        return git_head()

    try:
        subprocess.run(
            ["git", "add", "-A"],
            cwd=WORKSPACE_DIR, capture_output=True, timeout=30,
        )
        subprocess.run(
            ["git", "commit", "-m", "[orchestrator] Session start snapshot", "--no-verify"],
            cwd=WORKSPACE_DIR, capture_output=True, timeout=30,
        )
        return git_head()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None


# ---------------------------------------------------------------------------
# Automated validation
# ---------------------------------------------------------------------------
def validate_files(filepaths: list[str]) -> dict[str, dict]:
    """
    Run syntax checks on modified files.

    Returns:
        Dict mapping filepath -> {"status": "ok"|"error", "message": "..."}
    """
    results = {}
    for fpath in filepaths:
        full_path = os.path.join(WORKSPACE_DIR, fpath)
        if not os.path.isfile(full_path):
            continue

        if fpath.endswith(".js"):
            results[fpath] = _validate_js(full_path)
        elif fpath.endswith(".json"):
            results[fpath] = _validate_json(full_path)

    return results


def _validate_js(path: str) -> dict:
    """Syntax-check a JS file using node --check."""
    try:
        r = subprocess.run(
            ["node", "--check", path],
            capture_output=True, text=True, timeout=15,
        )
        if r.returncode == 0:
            return {"status": "ok", "message": "syntax valid"}
        return {"status": "error", "message": r.stderr.strip()[:500]}
    except FileNotFoundError:
        return {"status": "skipped", "message": "node not found"}
    except subprocess.TimeoutExpired:
        return {"status": "skipped", "message": "validation timed out"}


def _validate_json(path: str) -> dict:
    """Validate a JSON file by parsing it."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            json.load(f)
        return {"status": "ok", "message": "valid JSON"}
    except json.JSONDecodeError as e:
        return {"status": "error", "message": f"JSON parse error: {e}"}
    except Exception as e:
        return {"status": "error", "message": str(e)[:500]}


# ---------------------------------------------------------------------------
# File overlap detection
# ---------------------------------------------------------------------------
def detect_file_overlaps(dispatches: list[dict]) -> list[dict]:
    """
    Check if multiple dispatches in the same round target overlapping files.

    Returns:
        List of overlap warnings: [{"file": "...", "agents": ["a", "b"]}]
    """
    file_to_agents: dict[str, list[str]] = {}
    for d in dispatches:
        for f in d.get("files", []):
            f_norm = f.replace("\\", "/")
            if f_norm not in file_to_agents:
                file_to_agents[f_norm] = []
            file_to_agents[f_norm].append(d["agent"])

    return [
        {"file": f, "agents": agents}
        for f, agents in file_to_agents.items()
        if len(agents) > 1
    ]


# ---------------------------------------------------------------------------
# State tracking
# ---------------------------------------------------------------------------
class SessionState:
    """Tracks dispatches, checkpoints, and worker results across rounds."""

    def __init__(self):
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_start = time.time()
        self.round = 0
        self.dispatches: list[dict] = []
        self.worker_results: list[dict] = []
        self.round_history: list[dict] = []
        self.git_commits: list[dict] = []       # {round, hash}
        self.validation_results: list[dict] = []  # per-round validation
        self.session_start_hash: Optional[str] = None
        self.guide_text: str = ""
        self.agents_config_path: Optional[str] = None

    def save_checkpoint(self):
        checkpoint = {
            "version": 2,
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "session_start": self.session_start,
            "round": self.round,
            "guide_text": self.guide_text,
            "agents_config_path": self.agents_config_path,
            "dispatches": self.dispatches,
            "worker_results": [
                {k: v for k, v in r.items()}
                for r in self.worker_results
            ],
            "round_history": self.round_history,
            "git_commits": self.git_commits,
            "validation_results": self.validation_results,
            "session_start_hash": self.session_start_hash,
        }
        with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
            json.dump(checkpoint, f, indent=2, default=str)

    @classmethod
    def from_checkpoint(cls, path: str) -> "SessionState":
        """Restore state from a checkpoint file."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        state = cls()
        state.session_id = data.get("session_id", state.session_id)
        state.session_start = data.get("session_start", state.session_start)
        state.round = data.get("round", 0)
        state.guide_text = data.get("guide_text", "")
        state.agents_config_path = data.get("agents_config_path")
        state.dispatches = data.get("dispatches", [])
        state.worker_results = data.get("worker_results", [])
        state.round_history = data.get("round_history", [])
        state.git_commits = data.get("git_commits", [])
        state.validation_results = data.get("validation_results", [])
        state.session_start_hash = data.get("session_start_hash")
        return state


state = SessionState()


# ---------------------------------------------------------------------------
# Human approval gate
# ---------------------------------------------------------------------------
def human_approval_gate_check(target: str, payload: str) -> Optional[str]:
    if not HUMAN_APPROVAL_GATE:
        return None

    print(f"\n{'='*60}")
    print(f"  DISPATCH PENDING: [{target}]")
    print(f"  Instructions: {payload[:200]}")
    print(f"{'='*60}")

    try:
        user_input = input("ENTER to approve, or type override: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n[Interrupted]")
        return "__ABORT__"

    return user_input if user_input else None


# ---------------------------------------------------------------------------
# Dispatch parsing (structured JSON format)
# ---------------------------------------------------------------------------
def parse_dispatches(text: str, agent_configs: dict) -> list[dict]:
    """
    Parse structured dispatch blocks from the lead agent's output.

    Looks for:
      ```dispatch
      {"agent": "foundry", "task": "...", "files": [...]}
      ```
    Also accepts ```json blocks containing an "agent" key.
    """
    dispatches = []

    pattern = r'```(?:dispatch|json)\s*\n(.*?)```'
    blocks = re.findall(pattern, text, re.DOTALL)

    for block in blocks:
        block = block.strip()
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            json_match = re.search(r'\{.*\}', block, re.DOTALL)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    continue
            else:
                continue

        agent = data.get("agent") or data.get("dispatch")
        if not agent or agent not in agent_configs:
            log(f"Dispatch block has unknown agent: {agent}", "WARN")
            continue

        dispatches.append({
            "agent": agent,
            "task": data.get("task", data.get("instructions", "")),
            "files": data.get("files", []),
            "expected_output": data.get("expected_output", ""),
        })

    return dispatches


def parse_completion(text: str) -> Optional[str]:
    """
    Check if the lead agent signaled completion.

    Looks for ```complete blocks with {"status": "complete"}.
    """
    pattern = r'```complete\s*\n(.*?)```'
    blocks = re.findall(pattern, text, re.DOTALL)
    for block in blocks:
        try:
            data = json.loads(block.strip())
            if data.get("status") == "complete":
                return data.get("summary", "Session complete")
        except json.JSONDecodeError:
            pass

    # Fallback: JSON with status:complete anywhere
    if '"status"' in text and '"complete"' in text:
        try:
            m = re.search(r'\{[^{}]*"status"\s*:\s*"complete"[^{}]*\}', text)
            if m:
                data = json.loads(m.group())
                return data.get("summary", "Session complete")
        except (json.JSONDecodeError, AttributeError):
            pass

    return None


# ---------------------------------------------------------------------------
# Worker execution
# ---------------------------------------------------------------------------
async def run_worker(agent_name: str, instructions: str, agent_configs: dict) -> dict:
    """
    Execute a worker agent. Returns dict with status, agent, summary, duration.
    """
    config = agent_configs.get(agent_name)
    if not config:
        return {
            "status": "error",
            "agent": agent_name,
            "summary": f"Unknown agent: {agent_name}. Available: {list(agent_configs.keys())}",
            "duration": 0,
        }

    log(f"Dispatching to [{agent_name}]")
    print(f"\n--> DISPATCHING to [{agent_name}]...")

    full_prompt = f"{config['system_prompt']}\n\n---\n\nTASK:\n{instructions}"
    agent_max_turns = config.get("max_turns", MAX_WORKER_TURNS)

    options = ClaudeCodeOptions(
        max_turns=agent_max_turns,
        cwd=WORKSPACE_DIR,
        permission_mode="bypassPermissions",
    )
    if "allowed_tools" in config:
        options.allowed_tools = config["allowed_tools"]

    result_text = ""
    t0 = time.time()
    try:
        async for message in query(prompt=full_prompt, options=options):
            if hasattr(message, "content"):
                for block in message.content:
                    if hasattr(block, "text") and block.text:
                        result_text = block.text
            elif hasattr(message, "result") and message.result:
                result_text = message.result

    except Exception as e:
        log(f"Worker {agent_name} failed: {e}", "ERROR")
        return {
            "status": "failed",
            "agent": agent_name,
            "summary": f"Worker error: {type(e).__name__}: {str(e)}",
            "duration": round(time.time() - t0, 1),
        }

    duration = round(time.time() - t0, 1)
    result = {
        "status": "completed",
        "agent": agent_name,
        "summary": result_text[:WORKER_OUTPUT_LIMIT] if result_text else "No output captured",
        "duration": duration,
    }

    output_len = len(result_text) if result_text else 0
    truncated = " (truncated)" if output_len > WORKER_OUTPUT_LIMIT else ""
    print(f"<-- [{agent_name}] done in {duration}s ({output_len} chars{truncated})")
    return result


async def run_worker_with_retry(
    agent_name: str, instructions: str, agent_configs: dict,
) -> dict:
    """Execute a worker with retry on failure."""
    current_instructions = instructions

    for attempt in range(MAX_WORKER_RETRIES + 1):
        if attempt > 0:
            log(f"Retrying [{agent_name}] (attempt {attempt + 1}/{MAX_WORKER_RETRIES + 1})")
            print(f"    Retry {attempt + 1} for [{agent_name}]...")

        result = await run_worker(agent_name, current_instructions, agent_configs)
        if result["status"] != "failed":
            return result

        current_instructions = (
            f"{instructions}\n\n"
            f"--- PREVIOUS ATTEMPT FAILED ---\n"
            f"Error: {result['summary']}\n"
            f"Please try a different approach to avoid this error."
        )

    log(f"Worker [{agent_name}] failed after {MAX_WORKER_RETRIES + 1} attempts", "ERROR")
    result["summary"] = f"FAILED after {MAX_WORKER_RETRIES + 1} attempts. Last error: {result['summary']}"
    return result


# ---------------------------------------------------------------------------
# Lead Agent - single round execution
# ---------------------------------------------------------------------------
async def run_lead_turn(prompt: str) -> str:
    """
    Run the lead agent for a single planning/analysis round.
    The lead can use Read/Write/Edit/Glob/Grep within this round.
    """
    options = ClaudeCodeOptions(
        max_turns=MAX_LEAD_TURN_DEPTH,
        cwd=WORKSPACE_DIR,
        permission_mode="bypassPermissions",
        disallowed_tools=["Task"],
        allowed_tools=["Read", "Write", "Edit", "Glob", "Grep"],
    )

    result_parts = []
    try:
        async for message in query(prompt=prompt, options=options):
            if hasattr(message, "content"):
                for block in message.content:
                    if hasattr(block, "text") and block.text:
                        text = block.text.strip()
                        if text:
                            result_parts.append(text)
                            preview = text[:300] + ("..." if len(text) > 300 else "")
                            print(f"\n[LEAD]: {preview}")
            elif hasattr(message, "result") and message.result:
                result_parts.append(message.result)
                print(f"\n[LEAD RESULT]: {message.result[:300]}")
    except Exception as e:
        log(f"Lead turn failed: {e}", "ERROR")
        result_parts.append(f"[LEAD ERROR: {type(e).__name__}: {str(e)}]")

    return "\n\n".join(result_parts)


# ---------------------------------------------------------------------------
# Project context loader
# ---------------------------------------------------------------------------
DEFAULT_PROJECT_CONTEXT = """FILE-BASED ROUTING:
When a task involves files, route to the agent who OWNS those files:

| Directory/File | Owner |
|----------------|-------|
| `js/core/*` | **foundry** |
| `js/data/*` | **lorekeeper** (except audio-definitions.js, music-tracks.js → cantor) |
| `js/entities/*` | **warbringer** |
| `js/systems/*` | **warbringer** (default) |
| `js/systems/player-animation.js`, `input-handler.js`, `light-source-system.js` | **glasswright** |
| `js/systems/village-system.js`, `banking-system.js`, `loadout-system.js`, `shortcut-system.js` | **foundry** |
| `js/systems/quest-system.js`, `quest-item-system.js`, `crafting-system.js`, `world-state-system.js` | **lorekeeper** |
| `js/systems/dynamic-tile-system.js`, `spawn-point-system.js` | **cartographer** |
| `js/generation/*` | **cartographer** |
| `js/audio/*` | **cantor** |
| `js/effects/*`, `js/ui/*`, `css/*` | **glasswright** |
| `js/utils/*` | **warbringer** (except stat-system.js, message-log.js → foundry) |
| `js/testing/*`, `tools/*`, `game_env.py`, `train.py` | **sentinel** |
| `tools/BALANCE_REFERENCE.md` | **lorekeeper** |
| `assets/audio/*` | **cantor** |
| `assets/*` (other) | **glasswright** |
| `server/*` | **vaultkeeper** |
| `index.html` | **forgemaster** |
| `debug-commands.js` | **foundry** |

CROSS-AGENT PROTOCOLS:
- **renderer.js changes** → glasswright implements, foundry reviews pipeline architecture
- **Animation changes** → warbringer (timing/triggers), glasswright (sprites/frames)
- **Combat effects** → warbringer (triggers), glasswright (rendering)
- **Balance simulations** → lorekeeper requests, sentinel runs, lorekeeper interprets
- **Map analysis** → cartographer requests, sentinel runs analyzer"""


def load_project_context(explicit_path: Optional[str] = None) -> str:
    """
    Load project-specific context (routing table, protocols, project description).

    Search order:
    1. Explicit path from CLI --project-context
    2. project_context.md in current working directory
    3. project_context.md in workspace directory
    4. DEFAULT_PROJECT_CONTEXT (hardcoded fallback)
    """
    search_paths = []
    if explicit_path:
        search_paths.append(explicit_path)
    search_paths.append(os.path.join(os.getcwd(), "project_context.md"))
    search_paths.append(os.path.join(WORKSPACE_DIR, "project_context.md"))

    for path in search_paths:
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
            if content:
                log(f"Loaded project context from {path}")
                return content

    log("Using default project context (no project_context.md found)")
    return DEFAULT_PROJECT_CONTEXT


def generate_project_context_template(output_path: str = "project_context.md"):
    """Generate a starter project_context.md file."""
    template = f"""# Project Context
<!-- This file is loaded by the orchestrator and injected into the lead agent's prompt. -->
<!-- Customize it for your project. Delete sections you don't need. -->

## Project Description
*The Shifting Chasm* — a web-based dungeon crawler / extraction game built with vanilla JavaScript and Canvas 2D.

## File Routing Table
<!-- Maps file paths to owning agents. The lead agent uses this to decide who handles each file. -->

{DEFAULT_PROJECT_CONTEXT}

## High-Impact Files
<!-- Flag files that require extra caution when modifying. -->
- `js/core/game-state.js` — Global state, touches all systems
- `js/core/constants.js` — Global values used everywhere
- `js/systems/combat-master.js` — Core combat loop
- `index.html` — Script load order, can break everything

## Project-Specific Rules
<!-- Add any rules specific to your project. -->
- All game data lives in `js/data/` files
- No external dependencies — vanilla JS only
- Canvas 2D rendering, no WebGL
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(template)
    return output_path


# ---------------------------------------------------------------------------
# Lead prompt builders
# ---------------------------------------------------------------------------
def build_lead_prompt(guide: str, agent_configs: dict, project_context: str) -> str:
    """Build the lead agent's initial prompt."""
    agent_list = "\n".join([
        f"- **{name}**: {config.get('description', 'No description')}"
        for name, config in agent_configs.items()
    ])

    return f"""You are **Warden**, the Orchestrator. You decompose requests into tasks, assign them to the right specialist agent, sequence dependencies, and synthesize results. You CAN write reports, summaries, and documentation files directly.

YOUR TEAM:
{agent_list}

{project_context}

---

## DISPATCH FORMAT (CRITICAL)

To dispatch work to an agent, output a fenced code block tagged `dispatch` containing JSON:

```dispatch
{{"agent": "foundry", "task": "Fix the SaveManager Set restoration issue. Call _restoreTypes() after JSON.parse in the load() method.", "files": ["js/core/save-manager.js"], "expected_output": "Sets like game.exploredTiles properly restored after save/load"}}
```

RULES:
- You MUST use ```dispatch code blocks — this is how the orchestrator detects dispatches
- The JSON must have "agent" and "task" keys at minimum
- "files" and "expected_output" are optional but strongly recommended
- You may include MULTIPLE dispatch blocks in a single response — they execute sequentially
- After dispatches execute, you will receive the worker results and can dispatch more

## COMPLETION SIGNAL

When ALL work is finished, signal completion:

```complete
{{"status": "complete", "summary": "Brief description of everything accomplished"}}
```

## YOUR WORKFLOW

1. **Analyze** the task — identify files/systems affected
2. **Lookup** file ownership — select the correct agent(s)
3. **Dispatch** one or more agents with clear, detailed instructions
4. **Review** worker results when they come back
5. **Verify** output by reading modified files if needed
6. **Iterate** — dispatch more agents if work remains
7. **Synthesize** — write final reports/summaries directly (you have Write access)
8. **Complete** — signal completion when all work is done

CRITICAL RULES:
- NEVER write game code yourself — always dispatch to specialist agents
- NEVER guess file ownership — consult the routing table
- You CAN and SHOULD write synthesis reports, summaries, and documentation directly
- Flag high-blast-radius changes (game-state.js, constants.js, combat-master.js)
- After receiving worker results, VERIFY by reading the modified files before moving on

---

TASK:
{guide}

---

Begin. Analyze the task, identify affected files and their owners, then dispatch to the correct agent(s)."""


def build_continuation_prompt(
    round_num: int,
    original_guide: str,
    round_history: list[dict],
    latest_results: list[dict],
    agent_configs: dict,
    validation_info: Optional[dict] = None,
    overlap_warnings: Optional[list] = None,
) -> str:
    """
    Build a continuation prompt with context management.

    - Original guide is capped at MAX_GUIDE_IN_CONTINUATION chars
    - Older rounds are compressed to one-line summaries
    - Only the latest round gets full worker results
    """
    agent_list = "\n".join([
        f"- **{name}**: {config.get('description', 'No description')}"
        for name, config in agent_configs.items()
    ])

    # Compact history for older rounds
    history_lines = []
    for entry in round_history[:-1] if round_history else []:
        dispatches_summary = ", ".join([
            f"{d['agent']}({'ok' if d['status'] == 'completed' else 'FAILED'})"
            for d in entry.get("dispatches", [])
        ])
        one_liner = entry.get("summary", "")
        if one_liner:
            history_lines.append(f"  Round {entry['round']}: {dispatches_summary} — {one_liner}")
        else:
            history_lines.append(f"  Round {entry['round']}: {dispatches_summary}")
    history_text = "\n".join(history_lines) if history_lines else "  (first round)"

    # Full results from latest round
    results_parts = []
    for r in latest_results:
        status_icon = "OK" if r["status"] == "completed" else "FAILED"
        duration = f" ({r.get('duration', '?')}s)" if r.get("duration") else ""
        results_parts.append(
            f"### [{r['agent']}] — {status_icon}{duration}\n{r['summary']}"
        )
    results_text = "\n\n".join(results_parts) if results_parts else "(no dispatches)"

    # Validation results
    validation_text = ""
    if validation_info:
        val_lines = []
        for fpath, info in validation_info.items():
            icon = "PASS" if info["status"] == "ok" else "FAIL" if info["status"] == "error" else "SKIP"
            val_lines.append(f"  {icon}: {fpath} — {info['message']}")
        if val_lines:
            validation_text = "\n\nVALIDATION RESULTS:\n" + "\n".join(val_lines)

    # Overlap warnings
    overlap_text = ""
    if overlap_warnings:
        overlap_lines = [
            f"  WARNING: {w['file']} modified by multiple agents: {', '.join(w['agents'])}"
            for w in overlap_warnings
        ]
        overlap_text = "\n\nFILE OVERLAP WARNINGS:\n" + "\n".join(overlap_lines)

    # Cap the guide in continuation prompts
    guide_excerpt = original_guide[:MAX_GUIDE_IN_CONTINUATION]
    if len(original_guide) > MAX_GUIDE_IN_CONTINUATION:
        guide_excerpt += "\n... (guide truncated, see original for full text)"

    return f"""You are **Warden**, continuing orchestration — Round {round_num + 1}.

YOUR TEAM:
{agent_list}

ORIGINAL TASK:
{guide_excerpt}

PREVIOUS ROUNDS:
{history_text}

---

## WORKER RESULTS FROM ROUND {round_num}:

{results_text}{validation_text}{overlap_text}

---

Review the results above. You can:
1. **Read files** to verify worker output (use Read/Glob/Grep tools)
2. **Dispatch more agents** if work remains (use ```dispatch blocks)
3. **Write files** directly for synthesis, reports, or summaries
4. **Signal completion** when ALL work is done (use ```complete block)

Use the same dispatch format:
```dispatch
{{"agent": "agent_name", "task": "detailed instructions", "files": ["path/to/file.js"]}}
```

And signal completion with:
```complete
{{"status": "complete", "summary": "What was accomplished"}}
```"""


# ---------------------------------------------------------------------------
# Session report
# ---------------------------------------------------------------------------
def generate_session_report(state_obj: "SessionState") -> str:
    """Generate a structured markdown session report."""
    elapsed = round(time.time() - state_obj.session_start, 1)

    completed = [r for r in state_obj.worker_results if r["status"] == "completed"]
    failed = [r for r in state_obj.worker_results if r["status"] == "failed"]
    total_worker_time = sum(r.get("duration", 0) for r in state_obj.worker_results)

    lines = [
        f"# Orchestrator Session Report",
        f"",
        f"**Session ID:** {state_obj.session_id}",
        f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Elapsed:** {elapsed}s",
        f"**Total Worker Time:** {round(total_worker_time, 1)}s",
        f"",
        f"## Summary",
        f"",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Rounds | {state_obj.round} |",
        f"| Total Dispatches | {len(state_obj.dispatches)} |",
        f"| Workers Completed | {len(completed)} |",
        f"| Workers Failed | {len(failed)} |",
        f"| Git Commits | {len(state_obj.git_commits)} |",
        f"",
    ]

    # Per-round breakdown
    lines.append("## Round-by-Round Breakdown")
    lines.append("")

    for entry in state_obj.round_history:
        rnum = entry["round"]
        lines.append(f"### Round {rnum}")
        lines.append("")

        for d in entry.get("dispatches", []):
            status = d.get("status", "unknown")
            duration = d.get("duration", "?")
            lines.append(f"- **[{d['agent']}]** — {status} ({duration}s)")
            if d.get("task_summary"):
                lines.append(f"  - Task: {d['task_summary']}")

        if entry.get("git_commit"):
            lines.append(f"- Git commit: `{entry['git_commit'][:8]}`")

        if entry.get("validation"):
            errors = [
                f for f, v in entry["validation"].items() if v["status"] == "error"
            ]
            if errors:
                lines.append(f"- Validation errors: {', '.join(errors)}")
            else:
                lines.append(f"- Validation: all files passed")

        if entry.get("completion"):
            lines.append(f"- **Completion:** {entry['completion']}")

        lines.append("")

    # Git history
    if state_obj.git_commits:
        lines.append("## Git Commits")
        lines.append("")
        for gc in state_obj.git_commits:
            lines.append(f"- Round {gc['round']}: `{gc['hash'][:8]}`")
        lines.append("")
        lines.append(f"Session start: `{state_obj.session_start_hash[:8] if state_obj.session_start_hash else 'N/A'}`")
        lines.append(f"To rollback entire session: `git reset --hard {state_obj.session_start_hash[:8] if state_obj.session_start_hash else 'N/A'}`")
        lines.append("")

    return "\n".join(lines)


def write_session_report(state_obj: "SessionState"):
    """Write session report to file."""
    os.makedirs(SESSION_REPORT_DIR, exist_ok=True)
    report = generate_session_report(state_obj)
    filename = f"session_{state_obj.session_id}.md"
    path = os.path.join(SESSION_REPORT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(report)
    log(f"Session report written to {path}")
    print(f"[REPORT] {path}")
    return path


# ---------------------------------------------------------------------------
# Main orchestrator loop
# ---------------------------------------------------------------------------
async def run_orchestrator(
    agents_config_path: str = None,
    guide_path: str = "guide.md",
    project_context_path: str = None,
    dry_run: bool = False,
    resume_path: str = None,
):
    """
    Main orchestrator loop with conversation-style worker feedback.

    Each round:
    1. Lead agent analyzes/plans
    2. Orchestrator parses dispatch blocks
    3. File overlap detection
    4. Workers execute (with retry)
    5. Automated validation of modified files
    6. Git commit of round changes
    7. Results fed back to lead in next round
    8. Repeat until completion or max rounds
    """
    global state

    # --- 0. Resume or fresh start ---
    if resume_path:
        state = SessionState.from_checkpoint(resume_path)
        log(f"Resumed from checkpoint: round {state.round}, "
            f"{len(state.dispatches)} prior dispatches")
        print(f"[RESUME] Continuing from round {state.round}")
    else:
        state = SessionState()

    ensure_workspace()
    files = os.listdir(WORKSPACE_DIR) if os.path.exists(WORKSPACE_DIR) else []
    print(f"[PROJECT] Working directory: {WORKSPACE_DIR} ({len(files)} items)")

    # --- 1. Load Agent Configurations ---
    agent_configs, config_source = get_agent_configs(
        explicit_path=agents_config_path or state.agents_config_path,
        cwd=os.getcwd()
    )
    state.agents_config_path = agents_config_path
    log(f"Loaded {len(agent_configs)} agent(s) from {config_source}")
    print(f"[AGENTS] Source: {config_source}")
    print(f"[AGENTS] Available: {', '.join(agent_configs.keys())}")

    # --- 2. Load the Guide ---
    if resume_path and state.guide_text:
        guide = state.guide_text
        log("Using guide text from checkpoint")
    else:
        if not os.path.exists(guide_path):
            print(f"ERROR: Create '{guide_path}' with your project plan before running.")
            return
        with open(guide_path, "r", encoding="utf-8") as f:
            guide = f.read()
    state.guide_text = guide

    # --- 3. Load project context ---
    project_context = load_project_context(project_context_path)

    # --- 4. Git setup ---
    use_git = GIT_COMMIT_ROUNDS and git_available()
    if use_git:
        state.session_start_hash = git_session_snapshot()
        print(f"[GIT] Active. Session start: {state.session_start_hash[:8] if state.session_start_hash else 'N/A'}")
    else:
        if GIT_COMMIT_ROUNDS:
            print("[GIT] Not a git repo or git unavailable. Skipping round commits.")
        else:
            print("[GIT] Disabled via config.")

    # --- 5. Start the conversation loop ---
    print(f"\n{'='*60}")
    print("  ORCHESTRATOR v2 — CONVERSATION LOOP")
    print(f"{'='*60}")
    mode = "Human approval required" if HUMAN_APPROVAL_GATE else "Fully autonomous"
    print(f"[MODE] {mode}")
    print(f"[LIMITS] Rounds: {MAX_LEAD_ROUNDS}, "
          f"Lead depth: {MAX_LEAD_TURN_DEPTH}/round, "
          f"Worker turns: {MAX_WORKER_TURNS} (default), "
          f"Retries: {MAX_WORKER_RETRIES}")
    if VALIDATE_WORKER_OUTPUT:
        print("[VALIDATION] Syntax checks enabled")
    if dry_run:
        print("[DRY RUN] Will parse dispatches but NOT execute workers")
    log("Orchestrator v2 started")

    # Build initial or continuation prompt
    start_round = state.round
    if resume_path and state.round_history:
        # Resuming: build continuation from last round's results
        last_round = state.round_history[-1]
        last_results = [
            r for r in state.worker_results
            if any(
                d["agent"] == r["agent"]
                for d in last_round.get("dispatches", [])
            )
        ]
        current_prompt = build_continuation_prompt(
            state.round, guide, state.round_history, last_results, agent_configs,
        )
    else:
        current_prompt = build_lead_prompt(guide, agent_configs, project_context)

    for round_num in range(start_round, MAX_LEAD_ROUNDS):
        state.round = round_num + 1
        print(f"\n{'─'*60}")
        print(f"  ROUND {round_num + 1}/{MAX_LEAD_ROUNDS}")
        print(f"{'─'*60}")
        log(f"=== Round {round_num + 1} ===")

        # --- 5a. Run lead agent ---
        lead_response = await run_lead_turn(current_prompt)

        if not lead_response.strip():
            log("Lead returned empty response, ending session", "WARN")
            break

        # --- 5b. Check for completion ---
        completion = parse_completion(lead_response)
        if completion:
            print(f"\n[COMPLETE] {completion}")
            log(f"Lead signaled completion: {completion}")
            state.round_history.append({
                "round": round_num + 1,
                "dispatches": [],
                "completion": completion,
            })
            state.save_checkpoint()
            break

        # --- 5c. Parse dispatches ---
        dispatches = parse_dispatches(lead_response, agent_configs)

        if not dispatches:
            lower = lead_response.lower()
            if any(p in lower for p in [
                "all tasks complete", "all work is done",
                "orchestration complete", "session complete",
                "nothing more to dispatch",
            ]):
                log("Lead appears done (natural language signal)")
                print("\n[COMPLETE] Lead signaled completion (natural language)")
                state.save_checkpoint()
                break

            log("No dispatches found in lead response", "WARN")
            print("\n[WARN] No dispatch blocks or completion signal found.")
            current_prompt = (
                f"Your previous response did not contain any ```dispatch blocks "
                f"or a ```complete block. The orchestrator needs one of these to proceed.\n\n"
                f"If work remains, dispatch agents using ```dispatch blocks.\n"
                f"If all work is complete, signal with a ```complete block.\n\n"
                f"Your previous response was:\n{lead_response[:2000]}"
            )
            continue

        # --- 5d. Dry run: show dispatches and stop ---
        if dry_run:
            print(f"\n[DRY RUN] {len(dispatches)} dispatch(es) parsed:")
            for i, d in enumerate(dispatches, 1):
                print(f"  {i}. [{d['agent']}] {d['task'][:120]}")
                if d["files"]:
                    print(f"     Files: {', '.join(d['files'])}")
            print("\n[DRY RUN] Stopping here. Use without --dry-run to execute.")
            break

        # --- 5e. File overlap detection ---
        overlaps = detect_file_overlaps(dispatches)
        if overlaps:
            for w in overlaps:
                print(f"  [OVERLAP] {w['file']} targeted by: {', '.join(w['agents'])}")
                log(f"File overlap: {w['file']} -> {w['agents']}", "WARN")

        # --- 5f. Execute dispatches ---
        print(f"\n[DISPATCHES] {len(dispatches)} agent(s) this round:")
        for i, d in enumerate(dispatches, 1):
            files_str = ", ".join(d["files"]) if d["files"] else "(no files specified)"
            print(f"  {i}. [{d['agent']}] {d['task'][:80]}")
            print(f"     Files: {files_str}")

        round_results = []
        aborted = False

        for dispatch in dispatches:
            agent_name = dispatch["agent"]
            task = dispatch["task"]

            full_task = task
            if dispatch["files"]:
                full_task += f"\n\nFILES TO MODIFY: {', '.join(dispatch['files'])}"
            if dispatch["expected_output"]:
                full_task += f"\n\nEXPECTED OUTPUT: {dispatch['expected_output']}"

            override = human_approval_gate_check(agent_name, full_task[:200])
            if override == "__ABORT__":
                print("\n--- SESSION ABORTED BY USER ---")
                aborted = True
                break
            if override:
                log(f"Human override for [{agent_name}]: {override[:100]}")
                full_task = override

            state.dispatches.append({
                "round": round_num + 1,
                "agent": agent_name,
                "task": full_task[:200],
                "timestamp": datetime.now().isoformat(),
            })

            result = await run_worker_with_retry(agent_name, full_task, agent_configs)
            round_results.append(result)
            state.worker_results.append(result)

            print(f"\n[RESULT] [{agent_name}]: {result['status']} "
                  f"({len(result['summary'])} chars, {result.get('duration', '?')}s)")

        if aborted:
            break

        # --- 5g. Automated validation ---
        validation_info = {}
        if VALIDATE_WORKER_OUTPUT:
            changed = git_changed_files() if use_git else []
            if changed:
                validation_info = validate_files(changed)
                errors = {f: v for f, v in validation_info.items() if v["status"] == "error"}
                if errors:
                    print(f"\n[VALIDATION] {len(errors)} file(s) failed syntax check:")
                    for f, v in errors.items():
                        print(f"  FAIL: {f} — {v['message'][:100]}")
                else:
                    ok_count = sum(1 for v in validation_info.values() if v["status"] == "ok")
                    print(f"\n[VALIDATION] {ok_count} file(s) passed syntax check")

        # --- 5h. Git commit ---
        git_hash = None
        if use_git:
            agents_in_round = [d["agent"] for d in dispatches]
            git_hash = git_commit_round(round_num + 1, agents_in_round)
            if git_hash:
                state.git_commits.append({"round": round_num + 1, "hash": git_hash})
                print(f"[GIT] Committed round {round_num + 1}: {git_hash[:8]}")
            else:
                print(f"[GIT] No changes to commit for round {round_num + 1}")

        # --- 5i. Record round history ---
        # Build compact summary for older-round compression
        agents_summary = ", ".join([
            f"{r['agent']}({'ok' if r['status'] == 'completed' else 'FAIL'})"
            for r in round_results
        ])
        round_summary_text = agents_summary

        round_entry = {
            "round": round_num + 1,
            "summary": round_summary_text,
            "dispatches": [
                {
                    "agent": r["agent"],
                    "status": r["status"],
                    "duration": r.get("duration", 0),
                    "task_summary": r["summary"][:MAX_RESULT_HISTORY_CHARS],
                }
                for r in round_results
            ],
            "git_commit": git_hash,
            "validation": validation_info if validation_info else None,
        }
        state.round_history.append(round_entry)
        state.save_checkpoint()

        # --- 5j. Build continuation prompt ---
        current_prompt = build_continuation_prompt(
            round_num + 1, guide, state.round_history, round_results,
            agent_configs, validation_info, overlaps if overlaps else None,
        )

    else:
        log(f"Max rounds ({MAX_LEAD_ROUNDS}) reached without completion signal", "WARN")
        print(f"\n[WARN] Reached max rounds ({MAX_LEAD_ROUNDS}) without completion.")

    # --- 6. Session report & final summary ---
    state.save_checkpoint()
    report_path = write_session_report(state)

    print(f"\n{'='*60}")
    print("  SESSION SUMMARY")
    print(f"{'='*60}")
    elapsed = round(time.time() - state.session_start, 1)
    print(f"Session ID: {state.session_id}")
    print(f"Elapsed: {elapsed}s")
    print(f"Total rounds: {state.round}")
    print(f"Total dispatches: {len(state.dispatches)}")
    completed_count = len([r for r in state.worker_results if r["status"] == "completed"])
    failed_count = len([r for r in state.worker_results if r["status"] == "failed"])
    print(f"Workers completed: {completed_count}")
    print(f"Workers failed: {failed_count}")
    if state.git_commits:
        print(f"Git commits: {len(state.git_commits)}")
        print(f"Rollback command: git reset --hard {state.session_start_hash[:8] if state.session_start_hash else 'N/A'}")
    print(f"Report: {report_path}")
    print()
    for d in state.dispatches:
        print(f"  Round {d['round']}: [{d['agent']}] {d['task'][:80]}")
    log("Session complete")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(
        description="Multi-agent orchestrator using Claude SDK (v2 — conversation loop)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Agent Configuration:
  Search order for agent configs:
  1. --agents-config CLI argument
  2. AGENTS_CONFIG environment variable
  3. agents_config.json in current working directory
  4. agents_config.json in orchestrator directory
  5. Built-in default agents

Examples:
  python orchestrator.py                              # Default agents + guide.md
  python orchestrator.py --guide plan.md              # Custom guide file
  python orchestrator.py --no-approval                # Fully autonomous
  python orchestrator.py --dry-run                    # Parse dispatches without executing
  python orchestrator.py --resume checkpoint.json     # Resume interrupted session
  python orchestrator.py --no-git                     # Disable round commits
  python orchestrator.py --init-project-context       # Generate project_context.md template
        """
    )

    parser.add_argument("-a", "--agents-config", metavar="PATH",
                        help="Path to agents configuration JSON file")
    parser.add_argument("-g", "--guide", metavar="PATH", default="guide.md",
                        help="Path to the guide/plan file (default: guide.md)")
    parser.add_argument("--project-context", metavar="PATH",
                        help="Path to project_context.md (routing table, protocols)")
    parser.add_argument("--init-config", action="store_true",
                        help="Create a sample agents_config.json and exit")
    parser.add_argument("--init-with-base", action="store_true",
                        help="Create a sample config with inheritance template and exit")
    parser.add_argument("--init-project-context", action="store_true",
                        help="Create a project_context.md template and exit")
    parser.add_argument("--list-agents", action="store_true",
                        help="List available agents and exit")
    parser.add_argument("--no-approval", action="store_true",
                        help="Disable human approval gate")
    parser.add_argument("--no-git", action="store_true",
                        help="Disable git commits between rounds")
    parser.add_argument("--no-validation", action="store_true",
                        help="Disable automated syntax validation")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run lead once, show parsed dispatches, don't execute workers")
    parser.add_argument("--resume", metavar="PATH", nargs="?", const=CHECKPOINT_FILE,
                        help=f"Resume from checkpoint file (default: {CHECKPOINT_FILE})")
    parser.add_argument("--max-rounds", type=int, metavar="N",
                        help=f"Override max lead rounds (default: {MAX_LEAD_ROUNDS})")
    parser.add_argument("--max-retries", type=int, metavar="N",
                        help=f"Override max worker retries (default: {MAX_WORKER_RETRIES})")

    return parser.parse_args()


def main():
    args = parse_args()

    # --- Init commands (generate files and exit) ---
    if args.init_config:
        output_path = "agents_config.json"
        if os.path.exists(output_path):
            print(f"ERROR: {output_path} already exists.")
            sys.exit(1)
        create_sample_config(output_path, include_base=False)
        print(f"Created: {output_path}")
        sys.exit(0)

    if args.init_with_base:
        output_path = "agents_config.json"
        if os.path.exists(output_path):
            print(f"ERROR: {output_path} already exists.")
            sys.exit(1)
        create_sample_config(output_path, include_base=True)
        print(f"Created: {output_path}")
        sys.exit(0)

    if args.init_project_context:
        output_path = "project_context.md"
        if os.path.exists(output_path):
            print(f"ERROR: {output_path} already exists.")
            sys.exit(1)
        generate_project_context_template(output_path)
        print(f"Created: {output_path}")
        print("Edit this file to customize routing and protocols for your project.")
        sys.exit(0)

    # --- List agents ---
    if args.list_agents:
        agent_configs, source = get_agent_configs(
            explicit_path=args.agents_config, cwd=os.getcwd()
        )
        print(f"Source: {source}\n")
        print(f"Available agents ({len(agent_configs)}):")
        print("-" * 60)
        for name, config in agent_configs.items():
            desc = config.get("description", "No description")
            tools = config.get("allowed_tools", [])
            max_t = config.get("max_turns", MAX_WORKER_TURNS)
            print(f"\n  {name}:")
            print(f"    {desc}")
            print(f"    Tools: {', '.join(tools) if tools else 'All tools'}")
            print(f"    Max turns: {max_t}")
        sys.exit(0)

    # --- Runtime overrides ---
    if args.no_approval:
        os.environ["HUMAN_APPROVAL_GATE"] = "false"
        global HUMAN_APPROVAL_GATE
        from config import HUMAN_APPROVAL_GATE

    if args.no_git:
        global GIT_COMMIT_ROUNDS
        GIT_COMMIT_ROUNDS = False

    if args.no_validation:
        global VALIDATE_WORKER_OUTPUT
        VALIDATE_WORKER_OUTPUT = False

    if args.max_rounds:
        global MAX_LEAD_ROUNDS
        MAX_LEAD_ROUNDS = args.max_rounds

    if args.max_retries:
        global MAX_WORKER_RETRIES
        MAX_WORKER_RETRIES = args.max_retries

    # --- Safety check ---
    if os.environ.get("ANTHROPIC_API_KEY"):
        print("WARNING: ANTHROPIC_API_KEY is set. This may use API credits instead of your subscription.")
        print("   To use subscription: unset ANTHROPIC_API_KEY && claude login")
        resp = input("Continue anyway? (y/N): ").strip().lower()
        if resp != "y":
            sys.exit(0)

    # --- Run ---
    asyncio.run(run_orchestrator(
        agents_config_path=args.agents_config,
        guide_path=args.guide,
        project_context_path=args.project_context,
        dry_run=args.dry_run,
        resume_path=args.resume,
    ))


if __name__ == "__main__":
    main()
