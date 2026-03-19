#!/usr/bin/env python3
"""
generate_agents_config.py - Generate agents_config.json from CLAUDE.md files.

This script reads the CLAUDE.md files from the agents/ directory and generates
an agents_config.json file for use with the orchestrator.

Usage:
    python scripts/generate_agents_config.py
    python scripts/generate_agents_config.py --output custom_config.json
    python scripts/generate_agents_config.py --agents-dir /path/to/agents
"""

import os
import json
import argparse
import re
from pathlib import Path


# Agent folder to config key mapping
AGENT_FOLDER_MAP = {
    "02-foundry": "foundry",
    "03-lorekeeper": "lorekeeper",
    "04-glasswright": "glasswright",
    "05-vaultkeeper": "vaultkeeper",
    "06-cantor": "cantor",
    "07-cartographer": "cartographer",
    "08-warbringer": "warbringer",
    "09-sentinel": "sentinel",
    "10-forgemaster": "forgemaster",
}

# Note: 01-warden is the lead agent and not included in worker configs

# Tool mappings per agent (based on CLAUDE.md Tool Loadout sections)
AGENT_TOOLS = {
    "foundry": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    "lorekeeper": ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "WebSearch", "WebFetch"],
    "glasswright": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    "vaultkeeper": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    "cantor": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    "cartographer": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    "warbringer": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    "sentinel": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    "forgemaster": ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
}


def extract_description(content: str, agent_name: str) -> str:
    """Extract a short description from the CLAUDE.md content."""
    # Try to find the first line after the title that describes the agent
    lines = content.split("\n")

    for i, line in enumerate(lines):
        # Look for "You are **Name**, the X for *The Shifting Chasm*"
        if line.startswith("You are **"):
            # Extract the role description
            match = re.search(r"You are \*\*\w+\*\*, the (.+?) for", line)
            if match:
                return match.group(1).strip()
            # Fallback: take the part after the name
            match = re.search(r"You are \*\*\w+\*\*, (.+?)[\.\n]", line)
            if match:
                return match.group(1).strip()[:100]

    # Fallback descriptions based on agent name
    fallback_descriptions = {
        "foundry": "Game Architect. Core engine, game loop, state management, persistence.",
        "lorekeeper": "Game Systems Designer. Data files, balance, content, quests, crafting.",
        "glasswright": "Frontend/Client. UI, rendering, sprites, input, animations, effects.",
        "vaultkeeper": "Backend/Server. Server infrastructure, networking, multiplayer.",
        "cantor": "Audio & Sound. Music, SFX, ambient soundscapes, spatial audio.",
        "cartographer": "Procedural Generation. Dungeon gen, room layout, spawning, terrain.",
        "warbringer": "Combat & AI. Combat logic, enemy AI, movement, status effects.",
        "sentinel": "QA & Testing. Automated tests, balance simulations, regression detection.",
        "forgemaster": "DevOps/Infrastructure. Build tooling, deployment, CI/CD.",
    }
    return fallback_descriptions.get(agent_name, f"{agent_name} agent")


def truncate_prompt(content: str, max_length: int = 4000) -> str:
    """
    Truncate the system prompt to fit within reasonable limits.

    Preserves the most important sections:
    - Identity/Persona
    - File Ownership
    - Working Principles
    """
    if len(content) <= max_length:
        return content

    # Find key sections
    sections = []
    current_section = []
    current_header = ""

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_section:
                sections.append((current_header, "\n".join(current_section)))
            current_header = line
            current_section = [line]
        else:
            current_section.append(line)

    if current_section:
        sections.append((current_header, "\n".join(current_section)))

    # Prioritize sections
    priority_keywords = [
        "Identity", "Persona", "File Ownership", "Ownership",
        "Working Principles", "Principles", "Boundaries"
    ]

    # Build truncated content
    truncated = []
    total_len = 0

    # Always include title and first paragraph
    title_end = content.find("\n---")
    if title_end > 0:
        intro = content[:title_end]
        truncated.append(intro)
        total_len += len(intro)

    # Add priority sections
    for keyword in priority_keywords:
        for header, section_content in sections:
            if keyword.lower() in header.lower():
                if total_len + len(section_content) < max_length:
                    truncated.append("\n---\n")
                    truncated.append(section_content)
                    total_len += len(section_content) + 5

    return "".join(truncated)


def generate_config(agents_dir: str, output_path: str, full_prompts: bool = False):
    """
    Generate agents_config.json from CLAUDE.md files.

    Args:
        agents_dir: Path to the agents/ directory
        output_path: Where to save the generated config
        full_prompts: If True, include full CLAUDE.md content (large file)
    """
    agents_path = Path(agents_dir)
    config = {}

    for folder_name, agent_key in AGENT_FOLDER_MAP.items():
        claude_md_path = agents_path / folder_name / "CLAUDE.md"

        if not claude_md_path.exists():
            print(f"  Warning: {claude_md_path} not found, skipping {agent_key}")
            continue

        with open(claude_md_path, "r", encoding="utf-8") as f:
            content = f.read()

        description = extract_description(content, agent_key)

        # Either use full content or truncated version
        if full_prompts:
            system_prompt = content
        else:
            system_prompt = truncate_prompt(content)

        config[agent_key] = {
            "description": description,
            "system_prompt": system_prompt,
            "allowed_tools": AGENT_TOOLS.get(agent_key, ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]),
        }

        print(f"  Added {agent_key}: {description[:60]}...")

    # Write output
    output_dir = Path(output_path).parent
    if output_dir and not output_dir.exists():
        output_dir.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"\nGenerated {output_path} with {len(config)} agents")
    return config


def main():
    parser = argparse.ArgumentParser(
        description="Generate agents_config.json from CLAUDE.md files"
    )
    parser.add_argument(
        "--agents-dir",
        default="../agents",
        help="Path to agents/ directory (default: ../agents)"
    )
    parser.add_argument(
        "--output", "-o",
        default="agents_config.json",
        help="Output path (default: agents_config.json)"
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Include full CLAUDE.md content (creates larger file)"
    )

    args = parser.parse_args()

    # Resolve paths relative to script location
    script_dir = Path(__file__).parent
    agents_dir = Path(args.agents_dir)
    if not agents_dir.is_absolute():
        agents_dir = script_dir / agents_dir

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = script_dir.parent / output_path

    print(f"Generating agent config from: {agents_dir}")
    print(f"Output: {output_path}")
    print(f"Full prompts: {args.full}")
    print()

    generate_config(str(agents_dir), str(output_path), args.full)


if __name__ == "__main__":
    main()
