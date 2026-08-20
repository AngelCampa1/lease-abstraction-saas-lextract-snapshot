"""OpenRouter model pricing registry for cost accounting.

Used by the orchestrator to convert ``ExtractionResponse`` token counts into
cents-of-spend, so the per-extraction cost ceiling can gate Pass-2 / Pass-3
/ judge calls.

Pricing is verified live against ``https://openrouter.ai/api/v1/models``
(see ``architecture.input_modalities`` and ``pricing.{prompt,completion}``).
Values here are USD per 1M tokens. Slugs missing from this registry yield
``0`` cost (cost ceiling effectively disabled for that pass) — log a warning
and add the slug rather than silently miscount.

Last verified: 2026-04-25.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ModelPricing:
    """USD per 1M tokens for a single model."""

    input_per_m_usd: float
    output_per_m_usd: float


# Verified live against OpenRouter on 2026-04-25.
# Add new slugs here when adopted; do not remove existing entries (DB rows
# may reference legacy slugs).
_PRICING_REGISTRY: dict[str, ModelPricing] = {
    # PDF-capable models (used in Pass 1/2/3/Sibling).
    "google/gemini-3-flash-preview": ModelPricing(0.50, 3.00),
    "google/gemini-3.1-flash-lite-preview": ModelPricing(0.25, 1.50),
    "openai/gpt-5.4-mini": ModelPricing(0.75, 4.50),
    # Text-only models (used in Judge chain).
    "z-ai/glm-5.1": ModelPricing(1.05, 3.50),
    "minimax/minimax-m2.7": ModelPricing(0.30, 1.20),
    "moonshotai/kimi-k2.6": ModelPricing(0.7448, 4.655),
    # Legacy slugs (kept for historical pass_records that may reference them).
    "moonshotai/kimi-k2.5": ModelPricing(0.44, 2.00),
    "z-ai/glm-5": ModelPricing(0.60, 2.08),
}


def estimate_cost_cents(
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> int:
    """Compute integer-cents cost for a single LLM call.

    Returns ``0`` for unknown model slugs and logs a warning so the gap is
    visible in logs; the cost ceiling will under-count for that pass but
    extraction still completes.

    Rounding: half-up to the nearest cent. Tiny calls (< 0.5¢) round to 0
    cents — this is intentional, the ceiling is denominated in dollars.
    """
    pricing = _PRICING_REGISTRY.get(model)
    if pricing is None:
        logger.warning(
            "estimate_cost_cents: unknown model slug %r — counting as $0. "
            "Add it to extract_sdk/extraction/pricing._PRICING_REGISTRY.",
            model,
        )
        return 0

    usd = (
        input_tokens * pricing.input_per_m_usd
        + output_tokens * pricing.output_per_m_usd
    ) / 1_000_000
    # Round half-up to the nearest cent.
    return int(usd * 100 + 0.5)


def has_pricing(model: str) -> bool:
    """Return True when the registry knows ``model``."""
    return model in _PRICING_REGISTRY


__all__ = [
    "ModelPricing",
    "estimate_cost_cents",
    "has_pricing",
]
