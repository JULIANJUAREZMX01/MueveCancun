"""Tool discovery and approval enforcement."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from superagent.tools import browser, fs, screenshot, shell
from superagent.tools.base import RiskLevel, ToolSpec


class ApprovalRequired(PermissionError):
    def __init__(self, tool: ToolSpec) -> None:
        self.tool = tool
        super().__init__(f"explicit approval required for risk level {int(tool.risk)}")


class Orchestrator:
    def __init__(self, workspace: Path) -> None:
        self.workspace = workspace.expanduser().resolve()
        self.workspace.mkdir(parents=True, exist_ok=True)
        self.tools = self._build_registry()

    def _build_registry(self) -> dict[str, ToolSpec]:
        object_schema = {"type": "object", "additionalProperties": False}
        return {
            "fs.read_text": ToolSpec(
                "fs.read_text",
                "Read a UTF-8 file inside the workspace.",
                RiskLevel.READ_ONLY,
                {
                    **object_schema,
                    "properties": {"path": {"type": "string"}},
                    "required": ["path"],
                },
                lambda **args: fs.read_text(workspace=self.workspace, **args),
            ),
            "fs.write_text": ToolSpec(
                "fs.write_text",
                "Create or replace a UTF-8 file inside the workspace.",
                RiskLevel.MODIFY_OR_SEND,
                {
                    **object_schema,
                    "properties": {
                        "path": {"type": "string"},
                        "content": {"type": "string"},
                    },
                    "required": ["path", "content"],
                },
                lambda **args: fs.write_text(workspace=self.workspace, **args),
            ),
            "shell.run": ToolSpec(
                "shell.run",
                "Run an allowlisted command without a shell.",
                RiskLevel.DESTRUCTIVE,
                {
                    **object_schema,
                    "properties": {
                        "argv": {"type": "array", "items": {"type": "string"}},
                        "timeout_seconds": {"type": "integer"},
                    },
                    "required": ["argv"],
                },
                lambda **args: shell.run_command(workspace=self.workspace, **args),
            ),
            "browser.open_url": ToolSpec(
                "browser.open_url",
                "Queue an absolute HTTP(S) URL for a browser node.",
                RiskLevel.READ_ONLY,
                {
                    **object_schema,
                    "properties": {"url": {"type": "string"}},
                    "required": ["url"],
                },
                browser.open_url,
            ),
            "screenshot.capture": ToolSpec(
                "screenshot.capture",
                "Queue a screenshot request for a node.",
                RiskLevel.CREATE,
                {
                    **object_schema,
                    "properties": {
                        "display": {"type": "string", "enum": ["primary", "all"]}
                    },
                },
                screenshot.capture_screen,
            ),
        }

    def descriptors(self) -> list[dict[str, Any]]:
        return [tool.mcp_descriptor() for tool in self.tools.values()]

    def execute(
        self, name: str, arguments: dict[str, Any], *, approved_risk: int = 1
    ) -> dict[str, Any]:
        try:
            tool = self.tools[name]
        except KeyError as exc:
            raise KeyError(f"unknown tool: {name}") from exc
        if tool.risk >= RiskLevel.MODIFY_OR_SEND and approved_risk < int(tool.risk):
            raise ApprovalRequired(tool)
        return tool.handler(**arguments)
