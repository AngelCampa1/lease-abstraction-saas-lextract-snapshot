"""Tests for orchestrator-owned extraction client lifecycle."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from extract_sdk.extraction.orchestrator import MultiPassConfig, MultiPassOrchestrator


class _ClosablePdfClient:
    def __init__(self) -> None:
        self.closed = False

    async def extract_pdf(self, **_: object) -> SimpleNamespace:
        return SimpleNamespace(text="{}", input_tokens=1, output_tokens=1)

    async def close(self) -> None:
        self.closed = True


@pytest.mark.asyncio
async def test_try_models_pdf_closes_created_client(sample_registry) -> None:
    client = _ClosablePdfClient()
    orchestrator = MultiPassOrchestrator(
        MultiPassConfig(
            pass1_models=["test/model"],
            pass2_models=[],
            pass3_models=[],
        ),
        client_factory=lambda _: client,
        registry=sample_registry,
    )

    await orchestrator._try_models_pdf(  # noqa: SLF001
        ["test/model"],
        "prompt",
        b"%PDF",
        "lease.pdf",
        None,
        1,
    )

    assert client.closed is True
