"""Schema-driven prompt generation for Claude extraction.

Generates extraction prompts automatically from any FieldRegistry,
making the same extraction code work with Lextract's 126 fields
or CamAudit's 33 fields.
"""

from __future__ import annotations

from extract_sdk.schema.registry import FieldRegistry

_PREAMBLE_TEMPLATE = (
    "You are an expert commercial real estate analyst extracting "
    "structured lease data from commercial lease documents.\n\n"
    "Your task is to extract the following fields from the lease "
    "text and return them as valid JSON matching the exact schema "
    "below.\n\n"
    "**JSON Schema:**\n\n"
    "```json\n"
    "{json_schema}\n"
    "```\n\n"
    "**Field Definitions:**\n"
    "{field_definitions}\n"
)

_GUIDELINES = (
    "\n**Extraction Guidelines:**\n\n"
    "1. **Percentage Conversion**: Always convert percentages "
    "to decimals:\n"
    '   - "5.25%" -> 0.0525\n'
    '   - "Ten percent" -> 0.10\n'
    '   - "Twelve and one-half percent" -> 0.125\n\n'
    "2. **Fraction Conversion**: Convert fractions to decimals:\n"
    '   - "1/20" -> 0.05\n'
    '   - "3/4" -> 0.75\n\n'
    "3. **Missing Fields**: If a field is not found or cannot be "
    "confidently determined, set value to null and confidence "
    "to 0.0.\n\n"
    "4. **Source Text**: Include the exact phrase or sentence from "
    "the lease that supports each extraction. This is critical "
    "for human verification.\n\n"
    "5. **Confidence Scoring** (0.0 to 1.0 scale):\n"
    "   - **0.9-1.0**: Field is explicitly stated with clear "
    "language\n"
    "   - **0.7-0.89**: Field can be inferred from context or "
    "calculations\n"
    "   - **0.5-0.69**: Field is ambiguous or requires "
    "assumptions\n"
    "   - **0.0-0.49**: Very uncertain, multiple interpretations "
    "possible\n\n"
    "6. **Required Fields**: Fields marked [REQUIRED] must be "
    "extracted. If not found, return null value with confidence "
    "0.0.\n\n"
    "7. **Output Format**: Return ONLY valid JSON matching the "
    "schema. Do not include markdown code blocks, explanations, "
    "or any text outside the JSON structure.\n\n"
    "8. **Date Format**: All dates should be in ISO 8601 format "
    "(YYYY-MM-DD).\n\n"
    "9. **Currency Values**: Return as numbers without currency "
    'symbols or commas (e.g., 150000.00, not "$150,000").\n\n'
    "10. **Boolean Fields**: Return true or false (not "
    '"yes"/"no" strings).\n\n'
    "11. **PDF-Native Confidence**: For each field, emit a confidence "
    "float between 0.0 and 1.0 reflecting how certain you are based "
    "on what you can see in the PDF.\n\n"
)

_OUTPUT_FORMAT = (
    "**Output Format:**\n\n"
    "Return ONLY a valid JSON object with this structure:\n"
    "```\n"
    "{\n"
    '  "fields": {\n'
    '    "<field_name>": {\n'
    '      "value": <extracted_value_or_null>,\n'
    '      "confidence": <0.0_to_1.0>,\n'
    '      "source_text": "<exact quote from lease>"\n'
    "    }\n"
    "  }\n"
    "}\n"
    "```\n\n"
    "Do not include markdown code blocks, explanations, "
    "or any text outside the JSON structure.\n\n"
    "**Lease Document Text:**\n\n"
)


class ExtractionPromptBuilder:
    """Builds extraction prompts from a FieldRegistry.

    The prompt includes:
    1. System preamble with JSON schema
    2. Field definitions grouped by category
    3. Extraction guidelines
    4. Output format instructions
    """

    def __init__(
        self,
        registry: FieldRegistry,
        *,
        domain_knowledge: str | None = None,
    ) -> None:
        """Initialize with a field registry and optional domain knowledge.

        Args:
            registry: The FieldRegistry to generate prompts from.
            domain_knowledge: Optional expert domain knowledge string to inject
                between field definitions and extraction guidelines.  When
                provided, this dramatically improves extraction accuracy for
                cheaper models (DeepSeek, Qwen) by compensating for less
                built-in CRE expertise.
        """
        self.registry = registry
        self._domain_knowledge = domain_knowledge
        self._prompt_prefix: str | None = None

    @property
    def prompt_prefix(self) -> str:
        """Prompt text before document text (cached)."""
        if self._prompt_prefix is None:
            self._prompt_prefix = self._build_prompt_prefix()
        return self._prompt_prefix

    def _build_prompt_prefix(self) -> str:
        """Assemble the full extraction prompt prefix."""
        json_schema = self.registry.generate_json_schema_block()
        field_defs = self.registry.generate_field_definitions_block()

        preamble = _PREAMBLE_TEMPLATE.format(
            json_schema=json_schema,
            field_definitions=field_defs,
        )

        # Inject domain knowledge between definitions and guidelines
        knowledge_block = ""
        if self._domain_knowledge:
            knowledge_block = (
                "\n**Expert Domain Knowledge:**\n\n" + self._domain_knowledge + "\n"
            )

        return preamble + knowledge_block + _GUIDELINES + _OUTPUT_FORMAT

    def build_prompt(self, document_text: str | None = None) -> str:
        """Build extraction prompt, optionally with document text.

        Args:
            document_text: Optional document text to append.
                          If None, returns just the prompt prefix.
        """
        if document_text is None:
            return self.prompt_prefix
        return self.prompt_prefix + document_text

    def build_verification_prompt(self, critical_fields: list[str]) -> str:
        """Build a focused prompt for critical fields only.

        Args:
            critical_fields: List of field names to verify.

        Returns:
            A simpler prompt asking for only the critical fields.
        """
        field_descriptions: list[str] = []
        for i, field_name in enumerate(critical_fields, 1):
            fd = self.registry.get_field(field_name)
            aliases_hint = ""
            if fd.aliases:
                alias_str = ", ".join(f'"{a}"' for a in fd.aliases)
                aliases_hint = f" Look for {alias_str}."
            field_descriptions.append(
                f'{i}. "{fd.field_name}" ({fd.data_type}): '
                f"{fd.description}{aliases_hint}"
            )

        fields_block = "\n".join(field_descriptions)

        return (
            "You are a commercial real estate financial analyst. "
            "Extract ONLY the following fields from this lease "
            "document. Return a JSON object with exactly these "
            "keys, each containing "
            '"value", "confidence" (0.0-1.0), and '
            '"source_text":\n\n'
            f"{fields_block}\n\n"
            "Return ONLY valid JSON. No markdown, no "
            "explanation.\n\n"
            '{"fields": { ... }}'
        )
