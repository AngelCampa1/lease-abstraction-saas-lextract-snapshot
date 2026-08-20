"""Field editing service with immutable audit trail and red flag re-evaluation.

Validates field names against the loaded Lextract extraction schema, applies edits
to the extracted_data JSONB column, records every change in the
extraction_edits table, and re-runs red flag detection on the updated data.
"""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast
from uuid import uuid4

from app.core.exceptions import ConflictError
from app.database.client import NeonClientManager

try:
    from extract_sdk.red_flags import detect_red_flags
except ImportError:  # pragma: no cover

    def detect_red_flags(extracted_data: dict[str, Any]) -> list[dict[str, Any]]:
        """Fallback when extract-sdk is not installed."""
        return []


logger = logging.getLogger(__name__)


# Load valid field names from the schema JSON at module level.
# Try repo-relative path first, then fall back to a hardcoded set.
def _find_field_schema() -> Path:
    """Locate lextract_field_schema.json by walking upward from this file."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        candidate = current / "docs" / "lextract_field_schema.json"
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent
    return Path("/nonexistent")  # will trigger FileNotFoundError fallback


_SCHEMA_PATH = _find_field_schema()
_FIELD_DATA_TYPES: dict[str, str] = {}
try:
    with open(_SCHEMA_PATH, encoding="utf-8") as _f:
        _SCHEMA_FIELDS: list[dict[str, Any]] = json.load(_f)
    VALID_FIELD_NAMES: frozenset[str] = frozenset(
        entry["field_name"] for entry in _SCHEMA_FIELDS
    )
    _FIELD_DATA_TYPES = {
        entry["field_name"]: str(entry.get("data_type") or "string")
        for entry in _SCHEMA_FIELDS
    }
except FileNotFoundError:  # pragma: no cover
    logger.warning(
        "Schema file not found at %s — using extract-sdk registry fallback",
        _SCHEMA_PATH,
    )
    try:
        from extract_sdk.schema.lextract_schema import build_lextract_registry

        _registry = build_lextract_registry()
        VALID_FIELD_NAMES = frozenset(_registry.field_names)
    except ImportError:
        logger.error(
            "Neither schema file nor extract-sdk available for field validation"
        )
        VALID_FIELD_NAMES = frozenset()


class FieldTypeError(ValueError):
    """Raised when an edit value doesn't match the field's declared data_type."""


def _coerce_field_value(field_name: str, value: Any) -> Any:
    """Validate and coerce ``value`` against the schema-declared data_type.

    Returns the (possibly coerced) value. Raises :class:`FieldTypeError` with
    a human-readable message when the value cannot be reconciled with the
    declared type. ``None`` is always accepted — it represents clearing the
    field, not a type mismatch.
    """
    if value is None:
        return None

    data_type = _FIELD_DATA_TYPES.get(field_name, "string")

    if data_type == "string":
        if not isinstance(value, str):
            raise FieldTypeError(
                f"Field {field_name!r} expects a string value, "
                f"got {type(value).__name__}."
            )
        return value

    if data_type in {"number", "currency", "percentage"}:
        # Bools are a subclass of int — disallow them so True doesn't sneak
        # through as 1 for a numeric field.
        if isinstance(value, bool):
            raise FieldTypeError(
                f"Field {field_name!r} expects a number, got a boolean."
            )
        if isinstance(value, (int, float)):
            return value
        if isinstance(value, str):
            try:
                if "." in value:
                    return float(value)
                return int(value)
            except ValueError as exc:
                raise FieldTypeError(
                    f"Field {field_name!r} expects a number, "
                    f"got non-numeric string {value!r}."
                ) from exc
        raise FieldTypeError(
            f"Field {field_name!r} expects a number, got {type(value).__name__}."
        )

    if data_type == "date":
        if not isinstance(value, str):
            raise FieldTypeError(
                f"Field {field_name!r} expects an ISO 8601 date string, "
                f"got {type(value).__name__}."
            )
        try:
            # fromisoformat accepts YYYY-MM-DD and full ISO datetimes
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise FieldTypeError(
                f"Field {field_name!r} expects an ISO 8601 date, " f"got {value!r}."
            ) from exc
        return value

    if data_type == "boolean":
        if not isinstance(value, bool):
            raise FieldTypeError(
                f"Field {field_name!r} expects a boolean value, "
                f"got {type(value).__name__}."
            )
        return value

    if data_type == "array":
        if not isinstance(value, list):
            raise FieldTypeError(
                f"Field {field_name!r} expects an array, "
                f"got {type(value).__name__}."
            )
        return value

    # Unknown data_type — accept the value unchanged so newly added schema
    # entries don't break editing while we update this validator.
    return value


def _safe_json_loads(raw: Any) -> Any:
    """Parse legacy JSON strings, returning native JSONB values unchanged."""
    if not isinstance(raw, (str, bytes, bytearray)):
        return raw

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Invalid JSON in edit history value: %s", raw[:100])
        return raw


class FieldEditorService:
    """Handles field edits, validation, audit logging, and red flag refresh."""

    @staticmethod
    def validate_field_name(field_name: str) -> None:
        """Raise ValueError if field_name is not in the schema."""
        if field_name not in VALID_FIELD_NAMES:
            raise ValueError(
                f"Invalid field name: {field_name}. "
                f"Must be one of the {len(VALID_FIELD_NAMES)} "
                "Lextract extraction fields."
            )

    @staticmethod
    def field_data_types() -> dict[str, str]:
        """Return a copy of the {field_name: data_type} schema map."""
        return dict(_FIELD_DATA_TYPES)

    @staticmethod
    def validate_field_value(field_name: str, value: Any) -> Any:
        """Validate and coerce ``value`` against the field's declared type.

        Raises :class:`FieldTypeError` (a ``ValueError`` subclass) on mismatch.
        Returns the (possibly coerced) value otherwise.
        """
        return _coerce_field_value(field_name, value)

    @staticmethod
    def edit_field(
        extraction_id: str,
        field_name: str,
        new_value: Any,
        user_id: str,
    ) -> dict[str, Any]:
        """Edit a single field value and return the edit result.

        Steps:
        1. Validate field_name against schema.
        2. Fetch current extracted_data from DB.
        3. Record original value and update with new value.
        4. Write updated extracted_data back to DB.
        5. Insert audit row into extraction_edits.
        6. Re-run red flag detection and update red_flags column.
        7. Return edit result with updated red flags.
        """
        FieldEditorService.validate_field_name(field_name)
        new_value = FieldEditorService.validate_field_value(field_name, new_value)

        db = NeonClientManager.get_service_client()

        # Fetch current record — only columns needed for the CAS update
        result = (
            db.table("extractions")
            .select("extracted_data, updated_at")
            .eq("id", extraction_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        record = cast(dict[str, Any], result.data)

        extracted_data: dict[str, Any] = record.get("extracted_data") or {}

        # Get original value — normalize raw primitives to the expected
        # {value, confidence, source_text} dict format before editing.
        original_value: Any = None
        field_entry = extracted_data.get(field_name)
        if isinstance(field_entry, dict):
            original_value = field_entry.get("value")
        elif field_entry is not None:
            # Raw string/primitive stored instead of the expected dict —
            # normalize it so downstream code always sees the dict format.
            original_value = field_entry
            extracted_data[field_name] = {
                "value": field_entry,
                "confidence": None,
                "source_text": None,
            }

        # Update the value in extracted_data
        if field_name not in extracted_data or not isinstance(
            extracted_data[field_name], dict
        ):
            # Normalize to standard nested format
            extracted_data[field_name] = {
                "value": new_value,
                "confidence": None,
                "source_text": None,
            }
        else:
            extracted_data[field_name]["value"] = new_value

        # Re-run red flag detection before writing so both extracted_data
        # and red_flags are updated atomically in a single CAS-protected call.
        red_flag_data = {
            name: (
                entry.get("value")
                if isinstance(entry, dict) and "value" in entry
                else entry
            )
            for name, entry in extracted_data.items()
        }
        raw_flags = detect_red_flags(red_flag_data)
        # detect_red_flags returns RedFlag dataclasses when extract-sdk is
        # installed; serialise to plain dicts for JSONB storage.
        new_flags: list[dict[str, Any]] = [
            f.to_dict() if hasattr(f, "to_dict") else f for f in raw_flags
        ]

        current_updated_at = record.get("updated_at")
        now_iso = datetime.now(UTC).isoformat()

        # Insert the audit row and apply the extracted_data/red_flags update in
        # a single DB transaction. The audit insert lands first so history is
        # never out of sync with the mutation, and because both statements run
        # on one connection a failed/conflicted CAS update rolls the audit row
        # back automatically — no "ghost" edit can survive a lost update, and no
        # best-effort compensating delete is required.
        audit_id = str(uuid4())
        with db.transaction() as tx:
            tx.table("extraction_edits").insert(
                {
                    "id": audit_id,
                    "extraction_id": extraction_id,
                    "field_name": field_name,
                    "original_value": json.dumps(original_value),
                    "edited_value": json.dumps(new_value),
                    "edited_by": user_id,
                    "edited_at": now_iso,
                }
            ).execute()

            update_result = (
                tx.table("extractions")
                .update(
                    {
                        "extracted_data": extracted_data,
                        "red_flags": new_flags,
                        "updated_at": now_iso,
                    }
                )
                .eq("id", extraction_id)
                .eq("updated_at", current_updated_at)
                .execute()
            )

            if not update_result.data:
                # CAS lost — somebody else changed the row between fetch and
                # update. Raising inside the transaction rolls back the audit
                # insert so history never contains an edit that never applied.
                raise ConflictError(
                    "Extraction was modified concurrently — retry the edit",
                    resource_type="extraction",
                    resource_id=extraction_id,
                )

        return {
            "extraction_id": extraction_id,
            "field_name": field_name,
            "original_value": original_value,
            "edited_value": new_value,
            "red_flags": new_flags,
        }

    @staticmethod
    def get_edit_history(
        extraction_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[dict[str, Any]], int]:
        """Retrieve edit history for an extraction, ordered by edited_at DESC.

        Returns a tuple of (edits, total_count) so callers can paginate correctly.
        The total_count is the count of all edits, independent of limit/offset.
        """
        db = NeonClientManager.get_service_client()

        # Fetch total count for pagination
        count_result = (
            db.table("extraction_edits")
            .select("id", count="exact")
            .eq("extraction_id", extraction_id)
            .execute()
        )
        total: int = count_result.count if count_result.count is not None else 0

        result = (
            db.table("extraction_edits")
            .select(
                "id, field_name, original_value," " edited_value, edited_by, edited_at"
            )
            .eq("extraction_id", extraction_id)
            .order("edited_at", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        )

        rows = cast(list[dict[str, Any]], result.data or [])

        edits: list[dict[str, Any]] = []
        for row in rows:
            edits.append(
                {
                    "id": str(row["id"]),
                    "field_name": row["field_name"],
                    "original_value": _safe_json_loads(row["original_value"]),
                    "edited_value": _safe_json_loads(row["edited_value"]),
                    "edited_by": str(row["edited_by"]),
                    "edited_at": (
                        row["edited_at"].isoformat()
                        if hasattr(row["edited_at"], "isoformat")
                        else str(row["edited_at"])
                    ),
                }
            )

        return edits, total
