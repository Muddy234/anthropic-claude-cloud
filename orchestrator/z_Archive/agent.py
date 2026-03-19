import json
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from config import API_KEY, WORKER_MODEL, LEAD_MODEL, logger

client = Anthropic(api_key=API_KEY)


class AgentContext:
    """Encapsulates a single agent's state, history, and API interaction."""

    def __init__(self, name: str, system_prompt: str, tools: List[Dict],
                 model: str = WORKER_MODEL):
        self.name = name
        self.system_prompt = system_prompt
        self.tools = tools
        self.model = model
        self.history: List[Dict] = []
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def chat(self, user_input: Optional[str] = None) -> Any:
        """
        Send a message and return the raw API response.

        If user_input is None, assumes history is already primed
        (e.g., after manually appending a tool_result). This avoids
        injecting a redundant empty user message after tool results.
        """
        if user_input is not None:
            self.history.append({"role": "user", "content": user_input})

        response = client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=self.history,
            tools=self.tools
        )

        # Track token usage
        self.total_input_tokens += response.usage.input_tokens
        self.total_output_tokens += response.usage.output_tokens

        logger.info(
            f"[{self.name}] Tokens this call: "
            f"in={response.usage.input_tokens}, out={response.usage.output_tokens} | "
            f"Cumulative: in={self.total_input_tokens}, out={self.total_output_tokens}"
        )

        return response

    def append_assistant_response(self, content: List) -> None:
        """
        Append the assistant's response to history.

        CRITICAL: This MUST be called before appending a tool_result message.
        The Anthropic API requires: user -> assistant (with tool_use) -> user (with tool_result).
        Skipping the assistant message will cause API errors.
        """
        self.history.append({"role": "assistant", "content": content})

    def append_tool_result(self, tool_use_id: str, result: str) -> None:
        """Append a tool result to history (must follow an assistant tool_use)."""
        self.history.append({
            "role": "user",
            "content": [{
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": result
            }]
        })

    def get_token_total(self) -> int:
        """Return total tokens consumed by this agent."""
        return self.total_input_tokens + self.total_output_tokens

    def reset_for_new_task(self, preserve_learnings: bool = True) -> None:
        """
        Reset worker history between dispatches to prevent cross-task contamination.

        Problem: If the Lead dispatches dev_agent for Task A (e.g., "parse a budget PDF"),
        that full conversation stays in history. When dispatched again for Task B
        (e.g., "calculate IRR"), the agent sees Task A's files, errors, and context —
        wasting tokens and risking confusion (e.g., referencing Task A files in Task B).

        Strategy:
        - preserve_learnings=True (default): Summarize prior work into a single
          "briefing" message so the agent retains useful knowledge (file locations,
          patterns discovered) without the full token cost.
        - preserve_learnings=False: Hard reset — completely clear history.
          Use when tasks are fully independent.
        """
        if not self.history:
            return  # Nothing to reset

        if not preserve_learnings or len(self.history) < 4:
            # Hard reset — wipe everything
            logger.info(f"[{self.name}] Hard reset: cleared {len(self.history)} messages")
            self.history = []
            return

        # Soft reset — compress prior work into a briefing
        try:
            summary_response = client.messages.create(
                model=WORKER_MODEL,  # Use cheaper model for summarization
                max_tokens=1024,
                system=(
                    "Summarize this agent's prior work session in 3-5 bullet points. "
                    "Focus on: files created/modified, key findings, tools/patterns used, "
                    "and any errors encountered. Be concise — this is a briefing for "
                    "the agent's next task, not a full report."
                ),
                messages=[{
                    "role": "user",
                    "content": f"Summarize this work session:\n{json.dumps(self.history[-6:], default=str)}"
                }]
            )

            briefing = summary_response.content[0].text
            self.total_input_tokens += summary_response.usage.input_tokens
            self.total_output_tokens += summary_response.usage.output_tokens

            # Replace history with a single briefing message
            old_len = len(self.history)
            self.history = [
                {"role": "user", "content": f"[PRIOR SESSION BRIEFING]\n{briefing}"},
                {"role": "assistant", "content": "Understood. Ready for new task."}
            ]
            logger.info(
                f"[{self.name}] Soft reset: compressed {old_len} messages "
                f"into briefing ({len(briefing)} chars)"
            )

        except Exception as e:
            # If summarization fails, fall back to hard reset
            logger.warning(f"[{self.name}] Soft reset failed ({e}), falling back to hard reset")
            self.history = []

    def summarize_history(self) -> None:
        """
        Compress conversation history to free context window space.

        Uses "Context Cooling" strategy:
        - PINNED: First message (contains the Master Plan / original goal) is NEVER summarized
        - COOLED: Middle messages are compressed into a summary
        - HOT: Last 4 messages are kept verbatim (recent working context)

        This prevents the Lead from "forgetting" the original objective when
        working through a long multi-step plan (e.g., losing Step 1 context
        while executing Step 10).
        """
        if self.total_input_tokens < 80_000:
            return  # Not worth summarizing yet

        logger.info(f"[{self.name}] Summarizing history ({len(self.history)} messages)")

        # PIN: Always keep the first message (Master Plan / original goal)
        pinned = self.history[0] if self.history else None

        # HOT: Keep the last 4 messages (recent working context)
        recent = self.history[-4:]

        # COOL: Everything in between gets summarized
        middle = self.history[1:-4]

        if not middle:
            return  # Nothing to summarize (history too short)

        # Ask the model to summarize the middle chunk
        summary_response = client.messages.create(
            model=WORKER_MODEL,  # Use cheaper model for summarization
            max_tokens=2048,
            system=(
                "Summarize the following conversation concisely. "
                "Preserve ALL: key decisions, numerical findings (IRR, costs, rates), "
                "file paths, action items, and any unresolved issues. "
                "Use bullet points for clarity."
            ),
            messages=[{
                "role": "user",
                "content": f"Summarize this conversation:\n{json.dumps(middle, default=str)}"
            }]
        )

        summary_text = summary_response.content[0].text

        # Rebuild history: pinned + summary + recent
        self.history = [
            pinned,  # Original goal / Master Plan (never lost)
            {"role": "assistant", "content": "Understood. Ready to begin."},
            {"role": "user", "content": f"[CONVERSATION SUMMARY - Steps completed so far]\n{summary_text}"},
            {"role": "assistant", "content": "Context loaded from summary. Continuing execution."},
            *recent  # Last 4 messages (hot context)
        ]

        logger.info(
            f"[{self.name}] History compressed: pinned=1, summary=1, recent={len(recent)}, "
            f"total={len(self.history)} messages"
        )
