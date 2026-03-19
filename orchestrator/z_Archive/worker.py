import json
from typing import Optional
from agent import AgentContext
from executor import execute_tool
from config import MAX_WORKER_TURNS, logger


def execute_worker(agent: AgentContext, instructions: str) -> str:
    """
    Run a worker agent to completion, handling its tool calls in a loop.

    The worker uses domain tools (write_file, run_shell, search_web) to do work,
    then calls `report_completion` with structured output when finished.

    If the worker calls report_completion, returns the structured JSON.
    If the worker ends with plain text (no report), returns the text.
    If the worker exceeds MAX_WORKER_TURNS, returns a timeout message.
    """
    response = agent.chat(instructions)
    turn = 0

    while response.stop_reason == "tool_use" and turn < MAX_WORKER_TURNS:
        turn += 1

        # Extract all tool_use blocks from the response
        tool_blocks = [b for b in response.content if b.type == "tool_use"]

        # CRITICAL: Append the assistant's response to history FIRST
        agent.append_assistant_response(response.content)

        # Check if any tool call is report_completion (terminal signal)
        completion_block = next(
            (b for b in tool_blocks if b.name == "report_completion"), None
        )

        if completion_block:
            # Worker is done — return structured completion data
            report = completion_block.input
            logger.info(
                f"[{agent.name}] Task complete: status={report.get('status')}, "
                f"files={report.get('files_modified', [])}"
            )

            # Acknowledge the tool call in history (keeps history valid)
            agent.append_tool_result(
                tool_use_id=completion_block.id,
                result="Completion report received."
            )

            # Return structured JSON to the Lead
            return json.dumps(report, indent=2)

        # Execute non-terminal tool calls normally
        tool_results = []
        for tool_block in tool_blocks:
            logger.info(
                f"[{agent.name}] Tool call #{turn}: "
                f"{tool_block.name}({_truncate(str(tool_block.input), 80)})"
            )

            result = execute_tool(tool_block.name, tool_block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_block.id,
                "content": result
            })

        # Append all tool results as a single user message
        agent.history.append({"role": "user", "content": tool_results})

        # Continue the conversation - pass None to skip adding another user message.
        # History is already primed with the tool_result above.
        response = agent.chat()  # None = don't append to history, just call API

    # --- Fallback exits (worker didn't use report_completion) ---

    if response.stop_reason == "end_turn":
        # Worker ended with plain text (acceptable but less structured)
        agent.append_assistant_response(response.content)
        logger.warning(
            f"[{agent.name}] Ended with plain text instead of report_completion"
        )

        text_blocks = [b for b in response.content if hasattr(b, "text")]
        if text_blocks:
            # Wrap in a basic structure for consistency
            return json.dumps({
                "status": "success",
                "summary": text_blocks[0].text,
                "key_data": {},
                "files_modified": [],
                "issues": ["Worker did not use report_completion tool"]
            }, indent=2)
        return json.dumps({"status": "unknown", "summary": "No text response"})

    elif turn >= MAX_WORKER_TURNS:
        logger.warning(f"[{agent.name}] Hit max turns ({MAX_WORKER_TURNS})")
        return json.dumps({
            "status": "failed",
            "summary": f"Exceeded {MAX_WORKER_TURNS} turn limit",
            "key_data": {},
            "files_modified": [],
            "issues": [f"Worker timeout after {MAX_WORKER_TURNS} turns. Partial work may exist in workspace."]
        }, indent=2)

    else:
        # Unexpected stop reason
        logger.warning(f"[{agent.name}] Unexpected stop: {response.stop_reason}")
        agent.append_assistant_response(response.content)
        return json.dumps({
            "status": "failed",
            "summary": f"Unexpected stop: {response.stop_reason}",
            "key_data": {},
            "files_modified": [],
            "issues": [f"Unexpected API stop_reason: {response.stop_reason}"]
        }, indent=2)


def _truncate(s: str, max_len: int) -> str:
    return s[:max_len] + "..." if len(s) > max_len else s
