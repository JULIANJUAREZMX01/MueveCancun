"""FastAPI adapter for the local SuperAgent brain."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from superagent.planner.llm_router import LLMRouter
from superagent.planner.orchestrator import ApprovalRequired, Orchestrator

WORKSPACE = Path(os.environ.get("SUPERAGENT_WORKSPACE", "~/.openclaw/workspace"))
orchestrator = Orchestrator(WORKSPACE)
router = LLMRouter(remote_model=os.environ.get("SUPERAGENT_REMOTE_MODEL"))
app = FastAPI(title="KYNYKOS SuperAgent", version="0.1.0")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20_000)
    contains_sensitive_data: bool = False
    requested_tool: str | None = None
    arguments: dict[str, Any] = Field(default_factory=dict)
    approved_risk: int = Field(default=1, ge=0, le=3)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/tools")
def tools() -> dict[str, object]:
    return {"tools": orchestrator.descriptors()}


@app.post("/v1/chat")
def chat(request: ChatRequest) -> dict[str, object]:
    route = router.select(request.message, contains_sensitive_data=request.contains_sensitive_data)
    response: dict[str, object] = {
        "route": route.__dict__,
        "message": "Request accepted by planner prototype.",
    }
    if not request.requested_tool:
        return response
    try:
        response["tool_result"] = orchestrator.execute(
            request.requested_tool,
            request.arguments,
            approved_risk=request.approved_risk,
        )
    except ApprovalRequired as exc:
        detail = {
            "approval_required": True,
            "tool": exc.tool.name,
            "risk_level": int(exc.tool.risk),
        }
        raise HTTPException(status_code=409, detail=detail) from exc
    except (KeyError, TypeError, ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return response
