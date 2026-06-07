"""Safe browser hand-off stub."""

from urllib.parse import urlparse


def open_url(*, url: str) -> dict[str, object]:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("only absolute HTTP(S) URLs are allowed")
    return {"url": url, "status": "queued", "note": "Connect a browser node to execute this request."}
