# --- TOOL SCHEMAS ---

# ============================================================
# 1. LEAD AGENT TOOLS
# ============================================================

# 1a. Workflow Control (deterministic state machine)
manage_workflow_tool = {
    "name": "manage_workflow",
    "description": (
        "Control the project workflow. You MUST use this tool for every action. "
        "Use action='dispatch' to delegate work to a specialist agent. "
        "Use action='comment' to log observations, ask questions, or note progress. "
        "Use action='finish' when all plan steps are complete."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["dispatch", "comment", "finish"],
                "description": (
                    "'dispatch': Send task to a worker agent. "
                    "'comment': Log an observation or intermediate thought. "
                    "'finish': Declare the project complete with a summary."
                )
            },
            "target_agent": {
                "type": "string",
                "enum": ["dev_agent", "research_agent"],
                "description": "Required when action='dispatch'. Which worker to send the task to."
            },
            "payload": {
                "type": "string",
                "description": (
                    "For dispatch: precise instructions for the worker. "
                    "For comment: your observation or question. "
                    "For finish: final project summary."
                )
            }
        },
        "required": ["action", "payload"]
    }
}

# 1b. Workspace Inspector (read-only verification for Lead)
# Solves the "Lead Blindness" problem: the Lead can verify worker output
# by listing files or reading their contents, rather than trusting
# the worker's text summary at face value.
inspect_workspace_tool = {
    "name": "inspect_workspace",
    "description": (
        "Inspect the workspace to verify worker output. Use action='list' to see "
        "all files, or action='read' with a path to check file contents. "
        "This is READ-ONLY — you cannot modify files through this tool."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["list", "read"],
                "description": "'list': Show all workspace files. 'read': Read a specific file."
            },
            "path": {
                "type": "string",
                "description": "File path to read (required when action='read')."
            }
        },
        "required": ["action"]
    }
}

# Combined Lead toolset
lead_tools = [manage_workflow_tool, inspect_workspace_tool]

# ============================================================
# 2. WORKER TOOLS
# ============================================================

# 2a. Completion Report (required for all workers)
# Forces workers to structure their output as data, not prose.
# The Lead receives parseable JSON instead of a paragraph.
report_completion_tool = {
    "name": "report_completion",
    "description": (
        "REQUIRED: Call this tool when your task is complete. Structure your "
        "findings as data. Include status, a brief summary, any key data points "
        "as structured fields, and a list of files you created or modified."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "enum": ["success", "partial", "failed"],
                "description": "Outcome of the task."
            },
            "summary": {
                "type": "string",
                "description": "Brief description of what was accomplished."
            },
            "key_data": {
                "type": "object",
                "description": (
                    "Structured key findings as field:value pairs. "
                    "E.g., {\"irr\": \"15.2%\", \"cap_rate\": \"5.5%\", \"total_cost\": \"$12.5M\"}"
                )
            },
            "files_modified": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of file paths created or modified during this task."
            },
            "issues": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Any problems encountered or items needing follow-up."
            }
        },
        "required": ["status", "summary"]
    }
}

# 2b. Document Reader (handles PDFs, images, scanned docs)
# Solves the "Dirty Data" problem: real estate documents arrive as
# scanned PDFs (rent rolls, zoning maps) and images (site photos, plat maps).
# Plain read_file sees binary garbage. This tool extracts usable text.
read_document_tool = {
    "name": "read_document",
    "description": (
        "Read content from PDFs, images, or scanned documents. Use this instead "
        "of read_file when the file is a PDF, PNG, JPG, or other non-text format. "
        "For text-based PDFs, extracts text and tables. For scanned PDFs/images, "
        "uses vision to describe content. Returns extracted text or structured description."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "File path relative to workspace."
            },
            "mode": {
                "type": "string",
                "enum": ["auto", "text", "vision"],
                "description": (
                    "'auto': Try text extraction first, fall back to vision if empty. "
                    "'text': Force text extraction (pdfplumber). "
                    "'vision': Force vision API (for scanned docs, images, plat maps)."
                )
            },
            "pages": {
                "type": "string",
                "description": "Page range for PDFs (e.g., '1-5', '3', '10-20'). Default: all pages."
            }
        },
        "required": ["path"]
    }
}

# 2c. Dev Agent tools (file I/O + shell + document reader + completion report)
file_tools = [
    {
        "name": "write_file",
        "description": "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to working directory."},
                "content": {"type": "string", "description": "The full content to write."}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "read_file",
        "description": "Read the contents of a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path to read."}
            },
            "required": ["path"]
        }
    },
    {
        "name": "run_shell",
        "description": "Execute a shell command. Only whitelisted commands are allowed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cmd": {"type": "string", "description": "The shell command to execute."}
            },
            "required": ["cmd"]
        }
    },
    read_document_tool,
    report_completion_tool
]

# 2d. Research Agent tools (web search + document reader + completion report)
search_tools = [
    {
        "name": "search_web",
        "description": "Search the web for information and return results.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query."}
            },
            "required": ["query"]
        }
    },
    read_document_tool,
    report_completion_tool
]
