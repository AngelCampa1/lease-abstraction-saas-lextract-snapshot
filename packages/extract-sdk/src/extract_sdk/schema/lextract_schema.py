"""126-field Lextract registry loaded from lextract_field_schema.json."""

from __future__ import annotations

import json
from pathlib import Path

from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.registry import FieldRegistry

# Critical fields for dual extraction verification
_CRITICAL_FIELDS = {"base_rent_annual", "pro_rata_share", "lease_term_months"}

# Higher weights for financially significant fields
_HIGH_WEIGHT_FIELDS = {
    "base_rent_annual": 2.0,
    "pro_rata_share": 2.0,
    "lease_term_months": 1.5,
    "cam_cap_percentage": 1.5,
    "lease_structure_type": 1.5,
    "escalation_type": 1.5,
    "security_deposit_amount": 1.5,
}


def _find_schema_json() -> Path:
    """Locate lextract_field_schema.json relative to the repo root.

    Searches upward from this file's location, then from CWD (for Docker
    deployments where the SDK is installed in /opt/venv but the schema
    lives under the app directory).
    """
    search_roots = [Path(__file__).resolve().parent, Path.cwd()]
    for start in search_roots:
        current = start
        for _ in range(10):
            candidate = current / "docs" / "lextract_field_schema.json"
            if candidate.exists():
                return candidate
            parent = current.parent
            if parent == current:
                break
            current = parent
    raise FileNotFoundError(
        "Cannot locate docs/lextract_field_schema.json. "
        "Ensure the extract-sdk is within the lextract monorepo."
    )


def _load_field_definitions(schema_path: Path | None = None) -> list[FieldDefinition]:
    """Load field definitions from the JSON schema file.

    Args:
        schema_path: Optional explicit path to the schema JSON file.
                     If None, auto-discovers from repo structure.
    """
    if schema_path is None:
        schema_path = _find_schema_json()

    with open(schema_path, encoding="utf-8") as f:
        raw_fields: list[dict[str, object]] = json.load(f)

    definitions: list[FieldDefinition] = []
    for raw in raw_fields:
        field_name = str(raw["field_name"])
        definitions.append(
            FieldDefinition(
                field_name=field_name,
                category=str(raw["category"]),
                display_label=str(raw["display_label"]),
                description=str(raw["description"]),
                data_type=str(raw["data_type"]),
                required=bool(raw.get("required", False)),
                aliases=list(raw.get("aliases", [])),  # type: ignore[call-overload]
                cam_relevant=bool(raw.get("cam_relevant", False)),
                weight=_HIGH_WEIGHT_FIELDS.get(field_name, 1.0),
                critical=field_name in _CRITICAL_FIELDS,
            )
        )
    return definitions


def build_lextract_registry(
    schema_path: Path | None = None,
) -> FieldRegistry:
    """Build the Lextract 126-field registry.

    Args:
        schema_path: Optional explicit path to lextract_field_schema.json.
    """
    definitions = _load_field_definitions(schema_path)
    return FieldRegistry(name="Lextract 126-field", fields=definitions)


def get_lextract_registry() -> FieldRegistry:
    """Return the module-level Lextract registry singleton.

    Lazily loaded on first access.
    """
    global _registry
    if _registry is None:
        _registry = build_lextract_registry()
    return _registry


def reset_lextract_registry() -> None:
    """Reset the singleton for testing."""
    global _registry
    _registry = None


_registry: FieldRegistry | None = None
