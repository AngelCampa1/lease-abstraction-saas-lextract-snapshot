"""Backend analytics capture for server-confirmed product events."""

import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Retain references to in-flight capture tasks. Without this, ``create_task``
# returns a task that the event loop only holds a weak reference to, so it can
# be garbage-collected mid-flight and silently dropped before sending.
_PENDING_TASKS: set["asyncio.Task[None]"] = set()

POSTHOG_API_KEY_ENV = "POSTHOG_API_KEY"
POSTHOG_HOST_ENV = "POSTHOG_HOST"
DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com"


def capture_backend_event(
    event: str,
    *,
    distinct_id: str,
    properties: dict[str, Any] | None = None,
) -> None:
    """Schedule a PostHog event without blocking product flows."""
    api_key = os.getenv(POSTHOG_API_KEY_ENV, "").strip()
    if not api_key or not distinct_id:
        return

    host = os.getenv(POSTHOG_HOST_ENV, DEFAULT_POSTHOG_HOST).strip().rstrip("/")
    payload: dict[str, Any] = {
        "api_key": api_key,
        "event": event,
        "distinct_id": distinct_id,
        "properties": properties or {},
    }

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(_capture_payload(payload, host, event, distinct_id))
        return

    task = loop.create_task(_capture_payload(payload, host, event, distinct_id))
    _PENDING_TASKS.add(task)
    task.add_done_callback(_PENDING_TASKS.discard)


async def _capture_payload(
    payload: dict[str, Any],
    host: str,
    event: str,
    distinct_id: str,
) -> None:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.post(f"{host}/capture/", json=payload)
        response.raise_for_status()
    except Exception:
        logger.exception(
            "Failed to capture backend analytics event",
            extra={"event": event, "distinct_id": distinct_id},
        )
