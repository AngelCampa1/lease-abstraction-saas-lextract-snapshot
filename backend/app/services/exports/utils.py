"""Shared utility functions for export formatters.

Provides helpers for unwrapping extraction field data, determining
confidence tiers, and formatting values for display. Used by all
export format implementations (Word, PDF, Excel).
"""

from typing import Any

from app.services.field_text import humanize_enum_value, is_template_placeholder


def unwrap_field(field_data: Any) -> Any:
    """Unwrap a nested extraction field to its plain value.

    Extraction data is stored as {"value": ..., "confidence": ..., "source_text": ...}.
    This returns just the value, or the raw data if it's not nested.

    Args:
        field_data: Raw field data from extraction results.

    Returns:
        The unwrapped value, or the original data if not nested.
    """
    if isinstance(field_data, dict) and "value" in field_data:
        return field_data["value"]
    return field_data


def field_confidence_scores(
    confidence_scores: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return only the per-field confidence scores, dropping meta entries.

    ``confidence_scores`` carries a synthetic ``_overall`` aggregate (and any
    future underscore-prefixed meta key) alongside the real per-field scores.
    Summary counts must iterate over fields only, or the tier totals inflate
    past the field count shown to the buyer. No real schema field name starts
    with an underscore.

    Args:
        confidence_scores: Raw confidence map, or None.

    Returns:
        A new dict with underscore-prefixed meta keys removed (empty if None).
    """
    if not confidence_scores:
        return {}
    return {
        name: data
        for name, data in confidence_scores.items()
        if not name.startswith("_")
    }


def get_confidence_tier(conf_data: Any) -> str:
    """Extract the confidence tier string from a nested confidence score.

    Confidence scores are stored as {"score": 0.85, "tier": "high", ...}.
    Returns the tier in uppercase, or "N/A" for absent fields, or empty string
    if unavailable.

    Args:
        conf_data: Confidence data (dict with 'tier' key, string, or other).

    Returns:
        Uppercase tier string ("HIGH", "MEDIUM", "LOW"), "N/A" for not_found
        fields, or empty string if unavailable.
    """
    if isinstance(conf_data, dict) and "tier" in conf_data:
        tier = str(conf_data["tier"])
        return "N/A" if tier == "not_found" else tier.upper()
    if isinstance(conf_data, str):
        return "N/A" if conf_data == "not_found" else conf_data.upper()
    return ""


def format_value(value: Any) -> str:
    """Format an extraction field value for display.

    Handles None, booleans, lists, and other types gracefully.

    Args:
        value: The raw field value from extraction data.

    Returns:
        Human-readable string representation.
    """
    if value is None:
        return "Not found"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, list):
        # Drop leftover blank-template tokens so a paid export never shows
        # "{insert item}" beside real terms.
        items = [
            humanize_enum_value(text)
            for item in value
            if (text := str(item)).strip() and not is_template_placeholder(text)
        ]
        if not items:
            return "None specified"
        return "; ".join(items)
    text = str(value)
    if is_template_placeholder(text):
        return "Not found"
    return humanize_enum_value(text)
