"""Tests for the OpenRouter pricing registry."""

from __future__ import annotations

import logging

from extract_sdk.extraction.pricing import (
    ModelPricing,
    estimate_cost_cents,
    has_pricing,
)


class TestModelPricing:
    def test_dataclass_is_frozen(self) -> None:
        pricing = ModelPricing(0.5, 3.0)
        assert pricing.input_per_m_usd == 0.5
        assert pricing.output_per_m_usd == 3.0


class TestHasPricing:
    def test_known_pdf_model(self) -> None:
        assert has_pricing("google/gemini-3-flash-preview") is True

    def test_known_text_model(self) -> None:
        assert has_pricing("z-ai/glm-5.1") is True

    def test_legacy_slug(self) -> None:
        assert has_pricing("moonshotai/kimi-k2.5") is True

    def test_unknown_model(self) -> None:
        assert has_pricing("totally/made-up-model") is False


class TestEstimateCostCents:
    def test_known_model_basic_math(self) -> None:
        # gemini-3-flash-preview: $0.50 / 1M input, $3.00 / 1M output.
        # 1_000_000 input = $0.50 = 50¢; 1_000_000 output = $3.00 = 300¢.
        cost = estimate_cost_cents(
            "google/gemini-3-flash-preview",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost == 350

    def test_zero_tokens_zero_cost(self) -> None:
        cost = estimate_cost_cents(
            "google/gemini-3-flash-preview",
            input_tokens=0,
            output_tokens=0,
        )
        assert cost == 0

    def test_round_half_up_to_cent(self) -> None:
        # 1_000 input @ $0.50/M = $0.0005 = 0.05¢ → rounds to 0¢
        cost_low = estimate_cost_cents(
            "google/gemini-3-flash-preview",
            input_tokens=1_000,
            output_tokens=0,
        )
        assert cost_low == 0

        # 12_000 input @ $0.50/M = $0.006 = 0.6¢ → rounds to 1¢ (half-up)
        cost_round = estimate_cost_cents(
            "google/gemini-3-flash-preview",
            input_tokens=12_000,
            output_tokens=0,
        )
        assert cost_round == 1

    def test_unknown_model_returns_zero_and_warns(
        self, caplog: logging.LogRecord
    ) -> None:
        with caplog.at_level(logging.WARNING):  # type: ignore[attr-defined]
            cost = estimate_cost_cents(
                "totally/made-up-model",
                input_tokens=10_000,
                output_tokens=10_000,
            )
        assert cost == 0
        # Confirm the warning was actually emitted (so a missing slug is
        # visible in production logs rather than silently miscounting).
        assert any(
            "unknown model slug" in rec.getMessage()
            for rec in caplog.records  # type: ignore[attr-defined]
        )

    def test_judge_model_pricing(self) -> None:
        # glm-5.1: $1.05 / 1M input, $3.50 / 1M output.
        cost = estimate_cost_cents(
            "z-ai/glm-5.1",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost == 455

    def test_fractional_tokens_smaller_models(self) -> None:
        # minimax-m2.7 input = $0.30/M.
        # 5_000_000 input = $1.50 = 150¢
        cost = estimate_cost_cents(
            "minimax/minimax-m2.7",
            input_tokens=5_000_000,
            output_tokens=0,
        )
        assert cost == 150
