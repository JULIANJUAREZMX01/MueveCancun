"""Deterministic first-pass model router."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelRoute:
    provider: str
    model: str
    reason: str


class LLMRouter:
    """Route private/simple work locally and complex work to an optional remote model."""

    def __init__(self, local_model: str = "ollama/local", remote_model: str | None = None) -> None:
        self.local_model = local_model
        self.remote_model = remote_model

    def select(self, message: str, *, contains_sensitive_data: bool = False) -> ModelRoute:
        if contains_sensitive_data or not self.remote_model:
            reason = "sensitive input" if contains_sensitive_data else "no remote model configured"
            return ModelRoute("local", self.local_model, reason)

        complex_markers = ("analiza", "architect", "planifica", "refactor", "investiga")
        if len(message) > 800 or any(marker in message.lower() for marker in complex_markers):
            return ModelRoute("remote", self.remote_model, "complex request")
        return ModelRoute("local", self.local_model, "simple request")
