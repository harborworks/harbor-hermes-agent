"""Tavily web search + content extraction — plugin form.

Subclasses :class:`agent.web_search_provider.WebSearchProvider`. Two
capabilities advertised:

- ``supports_search()``  -> True (Tavily ``/search``)
- ``supports_extract()`` -> True (Tavily ``/extract``)

Both are sync — the underlying call is ``httpx.post(...)``.

Config keys this provider responds to::

    web:
      search_backend: "tavily"     # explicit per-capability
      extract_backend: "tavily"    # explicit per-capability
      backend: "tavily"            # shared fallback for both

Env vars::

    TAVILY_API_KEY=...           # https://app.tavily.com/home (required)
    TAVILY_BASE_URL=...          # optional override of https://api.tavily.com
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List
from urllib.parse import urlparse

from agent.web_search_provider import WebSearchProvider

logger = logging.getLogger(__name__)

DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com"
DEFAULT_HARBOR_ENGINE_BASE_URL = "https://engine.harborworks.ai"


def _normalize_harbor_tool_base_url(base_url: str) -> str:
    """Return the Harbor Engine root URL used by Tavily-compatible tool shims."""
    normalized = (base_url or DEFAULT_HARBOR_ENGINE_BASE_URL).strip().rstrip("/")
    if normalized.endswith("/anthropic"):
        normalized = normalized[: -len("/anthropic")]
    return normalized


def _resolve_tavily_base_url() -> str:
    """Resolve the Tavily-compatible base URL.

    Harbor installs set HARBOR_ENGINE_BASE_URL instead of TAVILY_BASE_URL so
    Hermes can keep using its existing Tavily web backend without storing a
    duplicate Harbor token in ~/.hermes/.env.
    """
    explicit_tavily_base = os.getenv("TAVILY_BASE_URL", "").strip()
    if explicit_tavily_base:
        return explicit_tavily_base.rstrip("/")

    harbor_base = os.getenv("HARBOR_ENGINE_BASE_URL", "").strip()
    if harbor_base:
        return _normalize_harbor_tool_base_url(harbor_base)

    return DEFAULT_TAVILY_BASE_URL


def _is_harbor_tool_base_url(base_url: str) -> bool:
    """Return True when a Tavily-compatible URL points at Harbor Engine."""
    normalized = base_url.rstrip("/")
    harbor_env = os.getenv("HARBOR_ENGINE_BASE_URL", "").strip()
    if harbor_env and normalized == _normalize_harbor_tool_base_url(harbor_env):
        return True

    try:
        host = urlparse(normalized).hostname or ""
    except Exception:
        return False
    return host in {"engine.harborworks.ai", "stage-engine.harborworks.ai"}


def _resolve_harbor_engine_token() -> str:
    """Resolve the Harbor bearer token from env or ~/.hw without persisting it."""
    env_token = os.getenv("HARBOR_ENGINE_TOKEN", "").strip()
    if env_token:
        return env_token

    try:
        from hermes_cli.auth import _resolve_harbor_hw_token

        token, _source = _resolve_harbor_hw_token()
        return token
    except Exception as exc:
        logger.debug("Could not resolve Harbor Engine token for web tools: %s", exc)
        return ""


def _resolve_tavily_api_key(base_url: str) -> str:
    """Resolve the secret used for Tavily-compatible requests."""
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if api_key:
        return api_key

    if _is_harbor_tool_base_url(base_url):
        return _resolve_harbor_engine_token()

    return ""


def _tavily_request(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """POST to the Tavily API and return the parsed JSON response.

    Mirrors :func:`tools.web_tools._tavily_request`. Raises ``ValueError``
    when ``TAVILY_API_KEY`` is unset; the caller catches and surfaces as
    a typed error response.
    """
    import httpx

    base_url = _resolve_tavily_base_url()
    api_key = _resolve_tavily_api_key(base_url)
    if not api_key:
        raise ValueError(
            "TAVILY_API_KEY environment variable not set. "
            "Get your API key at https://app.tavily.com/home, or configure "
            "HARBOR_ENGINE_BASE_URL with ~/.hw credentials for Harbor Engine."
        )

    payload = dict(payload)  # don't mutate caller's dict
    payload["api_key"] = api_key
    url = f"{base_url}/{endpoint.lstrip('/')}"
    logger.info("Tavily %s request to %s", endpoint, url)

    response = httpx.post(url, json=payload, timeout=60)
    response.raise_for_status()
    return response.json()


def _normalize_tavily_search_results(response: Dict[str, Any]) -> Dict[str, Any]:
    """Map Tavily ``/search`` response to ``{success, data: {web: [...]}}``."""
    web_results = []
    for i, result in enumerate(response.get("results", [])):
        web_results.append(
            {
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "description": result.get("content", ""),
                "position": i + 1,
            }
        )
    return {"success": True, "data": {"web": web_results}}


def _normalize_tavily_documents(
    response: Dict[str, Any], fallback_url: str = ""
) -> List[Dict[str, Any]]:
    """Map Tavily ``/extract`` response to standard documents.

    Documents follow the legacy LLM post-processing shape::

        {"url", "title", "content", "raw_content", "metadata"}

    Failures (``failed_results``, ``failed_urls``) become result entries
    with an ``error`` field rather than raising.
    """
    documents: List[Dict[str, Any]] = []
    for result in response.get("results", []):
        url = result.get("url", fallback_url)
        raw = result.get("raw_content", "") or result.get("content", "")
        documents.append(
            {
                "url": url,
                "title": result.get("title", ""),
                "content": raw,
                "raw_content": raw,
                "metadata": {"sourceURL": url, "title": result.get("title", "")},
            }
        )
    for fail in response.get("failed_results", []):
        documents.append(
            {
                "url": fail.get("url", fallback_url),
                "title": "",
                "content": "",
                "raw_content": "",
                "error": fail.get("error", "extraction failed"),
                "metadata": {"sourceURL": fail.get("url", fallback_url)},
            }
        )
    for fail_url in response.get("failed_urls", []):
        url_str = fail_url if isinstance(fail_url, str) else str(fail_url)
        documents.append(
            {
                "url": url_str,
                "title": "",
                "content": "",
                "raw_content": "",
                "error": "extraction failed",
                "metadata": {"sourceURL": url_str},
            }
        )
    return documents


class TavilyWebSearchProvider(WebSearchProvider):
    """Tavily search + extract provider."""

    @property
    def name(self) -> str:
        return "tavily"

    @property
    def display_name(self) -> str:
        return "Tavily"

    def is_available(self) -> bool:
        """Return True when Tavily or Harbor Engine credentials are available."""
        base_url = _resolve_tavily_base_url()
        return bool(_resolve_tavily_api_key(base_url))

    def supports_search(self) -> bool:
        return True

    def supports_extract(self) -> bool:
        return True

    def search(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """Execute a Tavily search."""
        try:
            from tools.interrupt import is_interrupted

            if is_interrupted():
                return {"success": False, "error": "Interrupted"}

            logger.info("Tavily search: '%s' (limit=%d)", query, limit)
            raw = _tavily_request(
                "search",
                {
                    "query": query,
                    "max_results": min(limit, 20),
                    "include_raw_content": False,
                    "include_images": False,
                },
            )
            return _normalize_tavily_search_results(raw)
        except ValueError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:  # noqa: BLE001 — including httpx errors
            logger.warning("Tavily search error: %s", exc)
            return {"success": False, "error": f"Tavily search failed: {exc}"}

    def extract(self, urls: List[str], **kwargs: Any) -> List[Dict[str, Any]]:
        """Extract content from one or more URLs via Tavily.

        Sync — the underlying call is httpx.post(...). Returns the legacy
        list-of-results shape; per-URL failures become items with ``error``.
        """
        try:
            from tools.interrupt import is_interrupted

            if is_interrupted():
                return [
                    {"url": u, "error": "Interrupted", "title": ""} for u in urls
                ]

            logger.info("Tavily extract: %d URL(s)", len(urls))
            raw = _tavily_request(
                "extract",
                {
                    "urls": urls,
                    "include_images": False,
                },
            )
            return _normalize_tavily_documents(
                raw, fallback_url=urls[0] if urls else ""
            )
        except ValueError as exc:
            return [{"url": u, "title": "", "content": "", "error": str(exc)} for u in urls]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Tavily extract error: %s", exc)
            return [
                {"url": u, "title": "", "content": "", "error": f"Tavily extract failed: {exc}"}
                for u in urls
            ]

    def get_setup_schema(self) -> Dict[str, Any]:
        return {
            "name": "Tavily",
            "badge": "paid",
            "tag": "Search + extract in one provider.",
            "env_vars": [
                {
                    "key": "TAVILY_API_KEY",
                    "prompt": "Tavily API key",
                    "url": "https://app.tavily.com/home",
                },
            ],
        }
