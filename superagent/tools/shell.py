"""Constrained command execution for the local node."""

from __future__ import annotations

import subprocess
from pathlib import Path

DEFAULT_ALLOWED_COMMANDS = frozenset({"git", "node", "pnpm", "python3", "pytest"})


def run_command(
    *,
    workspace: Path,
    argv: list[str],
    allowed_commands: frozenset[str] = DEFAULT_ALLOWED_COMMANDS,
    timeout_seconds: int = 30,
) -> dict[str, object]:
    if not argv:
        raise ValueError("argv must not be empty")
    if argv[0] not in allowed_commands:
        raise ValueError(f"command is not allowlisted: {argv[0]}")
    if not 1 <= timeout_seconds <= 300:
        raise ValueError("timeout_seconds must be between 1 and 300")

    completed = subprocess.run(
        argv,
        cwd=workspace.resolve(),
        capture_output=True,
        check=False,
        shell=False,
        text=True,
        timeout=timeout_seconds,
    )
    return {
        "exit_code": completed.returncode,
        "stdout": completed.stdout[-20_000:],
        "stderr": completed.stderr[-20_000:],
    }
