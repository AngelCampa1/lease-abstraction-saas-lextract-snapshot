import asyncio
from unittest.mock import AsyncMock, Mock

import httpx

from app.services.analytics import _PENDING_TASKS, capture_backend_event


def test_capture_backend_event_skips_without_api_key(monkeypatch):
    async_client = Mock()
    monkeypatch.delenv("POSTHOG_API_KEY", raising=False)
    monkeypatch.setattr("app.services.analytics.httpx.AsyncClient", async_client)

    capture_backend_event(
        "payment_succeeded",
        distinct_id="user-1",
        properties={"amount_cents": 2000},
    )

    async_client.assert_not_called()


def test_capture_backend_event_posts_payload(monkeypatch):
    response = Mock()
    post = AsyncMock(return_value=response)
    async_client = Mock()
    async_client.return_value.__aenter__ = AsyncMock(return_value=Mock(post=post))
    async_client.return_value.__aexit__ = AsyncMock(return_value=None)
    monkeypatch.setenv("POSTHOG_API_KEY", "ph_test")
    monkeypatch.setenv("POSTHOG_HOST", "https://posthog.example.com/")
    monkeypatch.setattr("app.services.analytics.httpx.AsyncClient", async_client)

    capture_backend_event(
        "payment_succeeded",
        distinct_id="user-1",
        properties={"amount_cents": 2000},
    )

    async_client.assert_called_once_with(timeout=2.0)
    post.assert_awaited_once_with(
        "https://posthog.example.com/capture/",
        json={
            "api_key": "ph_test",
            "event": "payment_succeeded",
            "distinct_id": "user-1",
            "properties": {"amount_cents": 2000},
        },
    )
    response.raise_for_status.assert_called_once_with()


def test_capture_backend_event_swallows_posthog_errors(monkeypatch, caplog):
    post = AsyncMock(side_effect=httpx.HTTPError("boom"))
    async_client = Mock()
    async_client.return_value.__aenter__ = AsyncMock(return_value=Mock(post=post))
    async_client.return_value.__aexit__ = AsyncMock(return_value=None)
    monkeypatch.setenv("POSTHOG_API_KEY", "ph_test")
    monkeypatch.setattr("app.services.analytics.httpx.AsyncClient", async_client)

    capture_backend_event("payment_succeeded", distinct_id="user-1")

    assert "Failed to capture backend analytics event" in caplog.text


def test_capture_backend_event_schedules_without_awaiting_inside_running_loop(
    monkeypatch,
):
    capture_payload = AsyncMock()
    monkeypatch.setenv("POSTHOG_API_KEY", "ph_test")
    monkeypatch.setattr("app.services.analytics._capture_payload", capture_payload)

    async def run_capture() -> None:
        capture_backend_event("payment_succeeded", distinct_id="user-1")
        capture_payload.assert_not_awaited()
        await asyncio.sleep(0)
        capture_payload.assert_awaited_once()

    asyncio.run(run_capture())


def test_capture_backend_event_retains_task_reference_until_done(monkeypatch):
    """The scheduled task must be tracked so it is not GC'd before sending."""
    capture_payload = AsyncMock()
    monkeypatch.setenv("POSTHOG_API_KEY", "ph_test")
    monkeypatch.setattr("app.services.analytics._capture_payload", capture_payload)

    async def run_capture() -> None:
        _PENDING_TASKS.clear()
        capture_backend_event("payment_succeeded", distinct_id="user-1")
        # Reference retained while the task is in flight.
        assert len(_PENDING_TASKS) == 1
        tracked = next(iter(_PENDING_TASKS))
        # Drain the loop: one turn to run the coroutine, another for the
        # done-callback that discards the finished task.
        while tracked in _PENDING_TASKS:
            await asyncio.sleep(0)
        assert tracked.done()
        assert _PENDING_TASKS == set()

    asyncio.run(run_capture())
