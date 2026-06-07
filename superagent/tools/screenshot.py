"""Screenshot node stub."""


def capture_screen(*, display: str = "primary") -> dict[str, object]:
    if display not in {"primary", "all"}:
        raise ValueError("display must be 'primary' or 'all'")
    return {"display": display, "status": "queued", "note": "Connect a screenshot-capable node to execute this request."}
