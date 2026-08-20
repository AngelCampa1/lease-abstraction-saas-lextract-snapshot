"""FieldDefinition dataclass — the atomic unit of a schema registry."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FieldDefinition:
    """Definition of a single extractable field.

    Attributes:
        field_name: Snake_case identifier used in JSON output.
        category: Grouping label (e.g., "Parties & Property").
        display_label: Human-readable label for UI display.
        description: What this field represents — included in Claude prompt.
        data_type: Expected type ("string", "number", "currency", "date",
                   "percentage", "boolean", "array").
        required: Whether this field must be present in a valid extraction.
        aliases: Alternative names Claude might encounter in lease text.
        cam_relevant: Whether this field is relevant to CAM auditing.
        weight: Importance weight for confidence scoring (default 1.0).
        critical: Whether this field requires dual extraction verification.
    """

    field_name: str
    category: str
    display_label: str
    description: str
    data_type: str
    required: bool = False
    aliases: list[str] = field(default_factory=list)
    cam_relevant: bool = False
    weight: float = 1.0
    critical: bool = False

    def to_json_schema_property(self) -> dict[str, object]:
        """Generate a JSON Schema property definition for this field."""
        type_map: dict[str, str] = {
            "string": "string",
            "number": "number",
            "currency": "number",
            "date": "string",
            "percentage": "number",
            "boolean": "boolean",
            "array": "array",
        }
        json_type = type_map.get(self.data_type, "string")

        prop: dict[str, object] = {
            "type": ["null", json_type],
            "description": self.description,
        }
        if self.data_type == "date":
            prop["format"] = "date"
        if self.data_type == "array":
            prop["items"] = {"type": "string"}
        return prop

    def to_prompt_definition(self) -> str:
        """Generate a prompt-friendly field definition string."""
        parts = [f"- **{self.field_name}** ({self.data_type}): {self.description}"]
        if self.aliases:
            alias_str = ", ".join(f'"{a}"' for a in self.aliases)
            parts.append(f"  Aliases: {alias_str}")
        if self.required:
            parts.append("  [REQUIRED]")
        return "\n".join(parts)
