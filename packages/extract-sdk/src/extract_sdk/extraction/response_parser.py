"""Parse Claude JSON response into structured ExtractionResult."""

from __future__ import annotations

import json
import logging
import re

from extract_sdk.exceptions import ExtractionParseError
from extract_sdk.models import ExtractionResult, FieldExtractionValue
from extract_sdk.schema.registry import FieldRegistry

try:
    import json_repair as _json_repair

    _HAS_JSON_REPAIR = True
except ImportError:
    _HAS_JSON_REPAIR = False

logger = logging.getLogger(__name__)


def _strip_markdown_code_blocks(text: str) -> str:
    """Remove markdown code block wrappers if present."""
    stripped = text.strip()
    match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", stripped, re.DOTALL)
    if match:
        return match.group(1).strip()
    return stripped


def _coerce_field_value(raw_value: object, data_type: str) -> object:
    """Coerce a raw extracted value to the expected type.

    Handles common Claude output quirks like returning percentages
    as strings or booleans as "yes"/"no".
    """
    if raw_value is None:
        return None

    if data_type == "boolean":
        if isinstance(raw_value, bool):
            return raw_value
        if isinstance(raw_value, str):
            return raw_value.lower() in ("true", "yes", "1")
        return bool(raw_value)

    if data_type in ("number", "currency", "percentage"):
        if isinstance(raw_value, int | float):
            val = float(raw_value)
            if data_type == "percentage":
                # Only divide by 100 when the value is clearly in percent form
                # (> 1.0 and <= 100.0). Values in (0, 1] are already in decimal
                # form — dividing would silently corrupt them (e.g., 0.05 → 0.0005).
                # 1.0 is preserved as the decimal contract value for 100%.
                # Values > 100 are unusual but left as-is; they likely represent
                # something other than a simple percentage (e.g., 150% escalation).
                if 1.0 < val <= 100.0:
                    return val / 100.0
            return val
        if isinstance(raw_value, str):
            cleaned = (
                raw_value.replace("$", "").replace(",", "").replace("%", "").strip()
            )
            if not cleaned:
                return None
            try:
                val = float(cleaned)
                if data_type == "percentage":
                    # String "5%" → explicit % sign: always divide
                    if raw_value.strip().endswith("%"):
                        return val / 100.0
                    # No % sign: apply the same heuristic as the numeric path.
                    # "5.25" with val > 1.0 is in percent form → divide.
                    # "0.05" with val <= 1.0 is already decimal → keep.
                    if 1.0 < val <= 100.0:
                        return val / 100.0
                return val
            except ValueError:
                return raw_value
        return raw_value

    if data_type == "array":
        if isinstance(raw_value, list):
            return raw_value
        if isinstance(raw_value, str):
            if raw_value.strip():
                return [item.strip() for item in raw_value.split(",")]
            return []
        return [raw_value]

    # string, date — return as-is (or stringified)
    if isinstance(raw_value, str):
        return raw_value
    return str(raw_value)


def parse_extraction_response(
    raw_response: str,
    registry: FieldRegistry | None = None,
) -> ExtractionResult:
    """Parse Claude's raw JSON response into a validated ExtractionResult.

    Args:
        raw_response: Raw text from Claude, optionally wrapped in markdown code blocks.
        registry: Optional FieldRegistry for type coercion. If provided, field values
                  are coerced to their expected types.

    Returns:
        ExtractionResult with all extracted fields.

    Raises:
        ExtractionParseError: If the response is not valid JSON
            or has unexpected structure.
    """
    cleaned = _strip_markdown_code_blocks(raw_response)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        if _HAS_JSON_REPAIR:
            try:
                repaired = _json_repair.repair_json(cleaned, return_objects=True)
                if isinstance(repaired, dict):
                    logger.warning(
                        "Pass 1 JSON was malformed; recovered with json-repair: %s", exc
                    )
                    data = repaired
                else:
                    raise ExtractionParseError(
                        f"Invalid JSON in Claude response: {exc}",
                        raw_response=raw_response,
                        cause=exc,
                    ) from exc
            except Exception:
                raise ExtractionParseError(
                    f"Invalid JSON in Claude response: {exc}",
                    raw_response=raw_response,
                    cause=exc,
                ) from exc
        else:
            raise ExtractionParseError(
                f"Invalid JSON in Claude response: {exc}",
                raw_response=raw_response,
                cause=exc,
            ) from exc

    if not isinstance(data, dict):
        raise ExtractionParseError(
            "Claude response is not a JSON object",
            raw_response=raw_response,
        )

    # Support both { "fields": { ... } } and flat { "field_name": { ... } } formats
    fields_data = data.get("fields", data)
    if not isinstance(fields_data, dict):
        raise ExtractionParseError(
            'Claude response missing "fields" key or invalid structure',
            raw_response=raw_response,
        )

    result_fields: dict[str, FieldExtractionValue] = {}
    for field_name, field_data in fields_data.items():
        if not isinstance(field_data, dict):
            # Skip non-dict entries (like metadata keys)
            continue

        raw_value = field_data.get("value")
        confidence = field_data.get("confidence", 0.0)
        source_text = field_data.get("source_text", "")

        # Coerce to expected type if registry is available
        if registry is not None and registry.has_field(field_name):
            fd = registry.get_field(field_name)
            raw_value = _coerce_field_value(raw_value, fd.data_type)

        # Ensure source_text is a string
        if not isinstance(source_text, str) or not source_text.strip():
            source_text = ""

        result_fields[field_name] = FieldExtractionValue(
            value=raw_value,
            confidence=confidence,
            source_text=source_text,
        )

    return ExtractionResult(fields=result_fields)
