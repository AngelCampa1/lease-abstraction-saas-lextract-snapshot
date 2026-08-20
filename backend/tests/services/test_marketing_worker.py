"""Tests for the Cloudflare marketing Worker client."""

from __future__ import annotations

import httpx
import pytest

from app.services.marketing_worker import (
    MarketingWorkerClient,
    MarketingWorkerNotConfiguredError,
)


def _transport(response: httpx.Response) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer secret-token"
        return response

    return httpx.MockTransport(handler)


class TestMarketingWorkerClient:
    @pytest.mark.asyncio
    async def test_capture_posts_payload_and_normalizes_response(self) -> None:
        client = MarketingWorkerClient(
            base_url="https://worker.example.com/",
            secret="secret-token",
            transport=_transport(
                httpx.Response(
                    200,
                    json={
                        "success": True,
                        "leadId": "lead-1",
                        "messageId": "msg-1",
                    },
                )
            ),
        )

        result = await client.capture({"event_type": "lead_magnet"})

        assert result.success is True
        assert result.lead_id == "lead-1"
        assert result.message_id == "msg-1"

    @pytest.mark.asyncio
    async def test_unsubscribe_returns_success_bool(self) -> None:
        client = MarketingWorkerClient(
            base_url="https://worker.example.com",
            secret="secret-token",
            transport=_transport(httpx.Response(200, json={"success": True})),
        )

        result = await client.unsubscribe("lead-1")

        assert result is True

    @pytest.mark.asyncio
    async def test_missing_config_raises_before_network(self) -> None:
        client = MarketingWorkerClient(base_url="", secret="")

        with pytest.raises(MarketingWorkerNotConfiguredError, match="not configured"):
            await client.capture({"event_type": "lead_magnet"})

    @pytest.mark.asyncio
    async def test_http_error_is_raised(self) -> None:
        client = MarketingWorkerClient(
            base_url="https://worker.example.com",
            secret="secret-token",
            transport=_transport(httpx.Response(503, json={"success": False})),
        )

        with pytest.raises(httpx.HTTPStatusError):
            await client.unsubscribe("lead-1")

    @pytest.mark.asyncio
    async def test_non_object_response_raises(self) -> None:
        client = MarketingWorkerClient(
            base_url="https://worker.example.com",
            secret="secret-token",
            transport=_transport(httpx.Response(200, json=["not", "an", "object"])),
        )

        with pytest.raises(RuntimeError, match="non-object"):
            await client.capture({"event_type": "lead_magnet"})
