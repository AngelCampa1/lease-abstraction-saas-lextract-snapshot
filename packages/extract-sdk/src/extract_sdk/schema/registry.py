"""FieldRegistry — schema-agnostic field lookup, weights, and JSON schema generation."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, create_model

from extract_sdk.exceptions import SchemaError
from extract_sdk.schema.base import FieldDefinition

# Mapping from FieldDefinition.data_type strings to Python annotations used
# to build a Pydantic model for judge verdict coercion.
_DATA_TYPE_TO_PY: dict[str, Any] = {
    "string": str,
    "number": float,
    "currency": Decimal,
    "date": date,
    "percentage": float,
    "boolean": bool,
    "array": list,
}


class FieldRegistry:
    """Registry of field definitions for a specific extraction schema.

    Supports any number of fields organized by category. Used by
    ExtractionPromptBuilder to auto-generate prompts from any schema.
    """

    def __init__(self, name: str, fields: list[FieldDefinition]) -> None:
        """Initialize registry with a list of field definitions.

        Args:
            name: Human-readable name for this schema (e.g., "Lextract 126-field").
            fields: List of FieldDefinition objects.

        Raises:
            SchemaError: If duplicate field names are found.
        """
        self.name = name
        self._fields: dict[str, FieldDefinition] = {}
        self._categories: dict[str, list[FieldDefinition]] = defaultdict(list)

        seen: set[str] = set()
        for fd in fields:
            if fd.field_name in seen:
                raise SchemaError(f"Duplicate field name in registry: {fd.field_name}")
            seen.add(fd.field_name)
            self._fields[fd.field_name] = fd
            self._categories[fd.category].append(fd)

    @property
    def field_count(self) -> int:
        """Total number of fields in the registry."""
        return len(self._fields)

    @property
    def categories(self) -> list[str]:
        """Sorted list of category names."""
        return sorted(self._categories.keys())

    @property
    def field_names(self) -> list[str]:
        """All field names in insertion order."""
        return list(self._fields.keys())

    def get_field(self, field_name: str) -> FieldDefinition:
        """Look up a field by name.

        Raises:
            SchemaError: If the field is not found.
        """
        fd = self._fields.get(field_name)
        if fd is None:
            raise SchemaError(f"Field not found in registry: {field_name}")
        return fd

    def get_fields_by_category(self, category: str) -> list[FieldDefinition]:
        """Get all fields in a given category."""
        return list(self._categories.get(category, []))

    def get_required_fields(self) -> list[FieldDefinition]:
        """Get all required fields."""
        return [fd for fd in self._fields.values() if fd.required]

    def get_required_field_names(self) -> list[str]:
        """Get names of all required fields."""
        return [fd.field_name for fd in self._fields.values() if fd.required]

    def get_critical_fields(self) -> list[FieldDefinition]:
        """Get all critical fields (for dual extraction)."""
        return [fd for fd in self._fields.values() if fd.critical]

    def get_critical_field_names(self) -> list[str]:
        """Get names of all critical fields."""
        return [fd.field_name for fd in self._fields.values() if fd.critical]

    def get_field_weights(self) -> dict[str, float]:
        """Get a mapping of field name to weight for confidence scoring."""
        return {fd.field_name: fd.weight for fd in self._fields.values()}

    def generate_json_schema(self) -> dict[str, object]:
        """Generate a JSON Schema object for the extraction output.

        The schema defines the structure Claude must return:
        { "fields": { "<name>": { "value": ..., "confidence": ...,
        "source_text": "..." } } }
        """
        field_value_schema: dict[str, object] = {
            "type": "object",
            "properties": {
                "value": {"description": "Extracted value, or null if not found"},
                "confidence": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0,
                    "description": "Confidence score from 0.0 to 1.0",
                },
                "source_text": {
                    "type": "string",
                    "description": (
                        "Exact text from the lease " "supporting this extraction"
                    ),
                },
            },
            "required": ["value", "confidence", "source_text"],
        }

        field_properties: dict[str, object] = {}
        for fd in self._fields.values():
            field_properties[fd.field_name] = field_value_schema

        return {
            "type": "object",
            "properties": {
                "fields": {
                    "type": "object",
                    "properties": field_properties,
                    "required": [
                        fd.field_name for fd in self._fields.values() if fd.required
                    ],
                }
            },
            "required": ["fields"],
        }

    def generate_json_schema_block(self) -> str:
        """Generate a formatted JSON schema string for prompt inclusion."""
        schema = self.generate_json_schema()
        return json.dumps(schema, indent=2)

    def generate_field_definitions_block(self) -> str:
        """Generate a formatted field definitions block for prompt inclusion.

        Groups fields by category with descriptions, types, and aliases.
        """
        lines: list[str] = []
        for category in self.categories:
            lines.append(f"\n### {category}\n")
            for fd in self._categories[category]:
                lines.append(fd.to_prompt_definition())
        return "\n".join(lines)

    def has_field(self, field_name: str) -> bool:
        """Check if a field exists in the registry."""
        return field_name in self._fields

    def __len__(self) -> int:
        return len(self._fields)

    def __contains__(self, field_name: str) -> bool:
        return field_name in self._fields

    def __iter__(self):  # type: ignore[no-untyped-def]
        return iter(self._fields.values())


def build_extraction_model(registry: FieldRegistry) -> type[BaseModel]:
    """Build a Pydantic model with one field per registry entry.

    The generated model is used by the judge for verdict coercion
    (``judge_extractions(model_class=...)``) — the judge inspects each field's
    annotation to coerce LLM-supplied verdict values into compatible Python
    types before they reach the merger.

    All fields are optional (``T | None``) because real extractions can have
    null values for fields the document does not mention. Field types are
    derived from ``FieldDefinition.data_type`` via ``_DATA_TYPE_TO_PY`` —
    unknown ``data_type`` strings fall back to ``Any``.

    Args:
        registry: Source registry whose fields drive the model.

    Returns:
        A dynamically-generated Pydantic model class. The class name
        (``"RegistryExtractionModel"``) is intentionally fixed so that
        repeated calls produce structurally-identical models — the judge
        only inspects ``model_fields``, never the class identity.
    """
    fields: dict[str, Any] = {}
    for name in registry.field_names:
        defn = registry.get_field(name)
        py_type = _DATA_TYPE_TO_PY.get(defn.data_type, Any)
        # Make every field optional with a default of None — extractions can
        # legitimately omit fields, and the judge must accept null verdicts.
        fields[name] = (py_type | None, None)
    return create_model("RegistryExtractionModel", **fields)
