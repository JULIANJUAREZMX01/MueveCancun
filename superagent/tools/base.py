"""Shared contracts for discoverable SuperAgent tools."""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import Any, Callable


class RiskLevel(IntEnum):
    """Risk levels used by the approval gate."""

    READ_ONLY = 0
    CREATE = 1
    MODIFY_OR_SEND = 2
    DESTRUCTIVE = 3


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    risk: RiskLevel
    input_schema: dict[str, Any]
    handler: Callable[..., dict[str, Any]]

    def mcp_descriptor(self) -> dict[str, Any]:
        """Return an MCP-compatible tool descriptor."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
            "annotations": {"riskLevel": int(self.risk)},
        }
