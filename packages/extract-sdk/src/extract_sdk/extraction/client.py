"""Extraction client protocol and shared helpers.

Defines the ExtractionClientProtocol used by OpenRouterClient,
validation_loop, and dual_extraction. Also provides the async
circuit breaker helper used by OpenRouterClient.
"""

from __future__ import annotations

from typing import Any, Protocol

import pybreaker

from extract_sdk.models import ExtractionResponse


class ExtractionClientProtocol(Protocol):
    """Minimal interface for the extraction client.

    Used by validation_loop and dual_extraction to decouple from the
    concrete client implementation for testing.
    """

    async def extract(
        self,
        prompt: str,
        document_text: str,
        max_tokens: int | None = None,
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> ExtractionResponse: ...  # pragma: no cover

    async def extract_pdf(
        self,
        prompt: str,
        pdf_bytes: bytes,
        filename: str,
        *,
        max_tokens: int = 16000,
        temperature: float = 0.0,
    ) -> ExtractionResponse: ...  # pragma: no cover


async def _async_breaker_call(
    cb: pybreaker.CircuitBreaker,
    fn: Any,
    **kwargs: Any,
) -> Any:
    """Call an async function through a pybreaker circuit breaker.

    pybreaker's ``call_async()`` requires Tornado and cannot be used in asyncio
    applications.  This helper bridges the gap by separating the gate check
    (synchronous) from the actual call (asynchronous) and recording the
    outcome directly on the breaker state.

    Behavior:
    * OPEN + timeout not elapsed  → ``CircuitBreakerError`` raised immediately
    * OPEN + timeout elapsed       → state transitions to HALF_OPEN (probe)
    * HALF_OPEN / CLOSED          → call proceeds; outcome recorded on breaker
    """
    if cb.current_state == "open":
        timeout = pybreaker.timedelta(seconds=cb.reset_timeout)  # type: ignore[attr-defined]
        opened_at = cb._state_storage.opened_at
        if opened_at and pybreaker.datetime.now(pybreaker.UTC) < opened_at + timeout:  # type: ignore[attr-defined]
            raise pybreaker.CircuitBreakerError(
                "Timeout not elapsed yet, circuit breaker still open"
            )
        cb.half_open()

    try:
        result = await fn(**kwargs)
    except Exception as exc:
        cb._state._handle_error(exc, reraise=False)
        raise
    else:
        cb._state._handle_success()
        return result
