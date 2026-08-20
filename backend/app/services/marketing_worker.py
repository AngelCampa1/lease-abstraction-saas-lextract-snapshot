"""Client for the Cloudflare D1-backed marketing data Worker."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


class MarketingWorkerNotConfiguredError(RuntimeError):
    """Raised when the marketing Worker client is missing required settings."""


@dataclass(frozen=True)
class MarketingWorkerResult:
    """Normalized response from the marketing Worker."""

    success: bool
    lead_id: str | None = None
    message_id: str | None = None


class MarketingWorkerClient:
    """Small HTTP client for internal marketing data persistence."""

    def __init__(
        self,
        *,
        base_url: str,
        secret: str,
        timeout: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._secret = secret
        self._timeout = timeout
        self._transport = transport

    @property
    def configured(self) -> bool:
        return bool(self._base_url and self._secret)

    async def capture(self, payload: dict[str, Any]) -> MarketingWorkerResult:
        """Persist a marketing capture through the Worker."""
        data = await self._post("/capture", payload)
        message_id = data.get("messageId")
        return MarketingWorkerResult(
            success=bool(data.get("success")),
            lead_id=data.get("leadId") if isinstance(data.get("leadId"), str) else None,
            message_id=message_id if isinstance(message_id, str) else None,
        )

    async def unsubscribe(self, lead_id: str) -> bool:
        """Mark a lead unsubscribed through the Worker."""
        data = await self._post("/unsubscribe", {"lead_id": lead_id})
        return bool(data.get("success"))

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.configured:
            raise MarketingWorkerNotConfiguredError(
                "Marketing Worker is not configured."
            )

        async with httpx.AsyncClient(
            timeout=self._timeout,
            transport=self._transport,
        ) as client:
            response = await client.post(
                f"{self._base_url}{path}",
                headers={
                    "Authorization": f"Bearer {self._secret}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise RuntimeError("Marketing Worker returned a non-object response.")
        return data
