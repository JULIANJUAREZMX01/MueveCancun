"""Workspace-confined filesystem tools."""

from __future__ import annotations

from pathlib import Path


def resolve_in_workspace(workspace: Path, requested_path: str) -> Path:
    root = workspace.expanduser().resolve()
    candidate = (root / requested_path).resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("path escapes the configured workspace")
    return candidate


def read_text(*, workspace: Path, path: str) -> dict[str, object]:
    target = resolve_in_workspace(workspace, path)
    return {"path": str(target.relative_to(workspace.resolve())), "content": target.read_text(encoding="utf-8")}


def write_text(*, workspace: Path, path: str, content: str) -> dict[str, object]:
    target = resolve_in_workspace(workspace, path)
    target.parent.mkdir(parents=True, exist_ok=True)
    existed = target.exists()
    target.write_text(content, encoding="utf-8")
    return {"path": str(target.relative_to(workspace.resolve())), "created": not existed}
