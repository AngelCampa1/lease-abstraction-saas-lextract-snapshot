"""Tests for ExtractionPromptBuilder."""

from __future__ import annotations

from extract_sdk.extraction.prompt_builder import ExtractionPromptBuilder
from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.registry import FieldRegistry


class TestExtractionPromptBuilder:
    """Tests for prompt generation from registry."""

    def test_build_prompt_prefix_contains_schema(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prefix = builder.prompt_prefix
        assert "JSON Schema" in prefix
        assert "base_rent_annual" in prefix
        assert "pro_rata_share" in prefix

    def test_build_prompt_prefix_contains_field_definitions(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prefix = builder.prompt_prefix
        assert "Field Definitions" in prefix
        assert "### Rent & Escalations" in prefix
        assert "[REQUIRED]" in prefix

    def test_build_prompt_prefix_contains_guidelines(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prefix = builder.prompt_prefix
        assert "Extraction Guidelines" in prefix
        assert "Confidence Scoring" in prefix
        assert "Missing Fields" in prefix

    def test_build_prompt_prefix_contains_output_format(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prefix = builder.prompt_prefix
        assert "Output Format" in prefix
        assert "Lease Document Text" in prefix

    def test_prompt_prefix_is_cached(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prefix1 = builder.prompt_prefix
        prefix2 = builder.prompt_prefix
        assert prefix1 is prefix2

    def test_build_prompt_without_document(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prompt = builder.build_prompt()
        assert prompt == builder.prompt_prefix

    def test_build_prompt_with_document(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prompt = builder.build_prompt("This is the lease text.")
        assert prompt.endswith("This is the lease text.")
        assert "JSON Schema" in prompt

    def test_build_verification_prompt(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        critical = ["base_rent_annual", "pro_rata_share", "lease_term_months"]
        prompt = builder.build_verification_prompt(critical)
        assert "base_rent_annual" in prompt
        assert "pro_rata_share" in prompt
        assert "lease_term_months" in prompt
        assert "ONLY" in prompt
        assert "financial analyst" in prompt

    def test_build_verification_prompt_includes_aliases(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prompt = builder.build_verification_prompt(["pro_rata_share"])
        assert "Proportionate Share" in prompt
        assert "Tenant Share" in prompt

    def test_build_verification_prompt_includes_descriptions(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prompt = builder.build_verification_prompt(["base_rent_annual"])
        assert "base rent payable" in prompt.lower() or "currency" in prompt.lower()

    def test_prompt_prefix_includes_all_categories(
        self, sample_registry: FieldRegistry
    ) -> None:
        builder = ExtractionPromptBuilder(sample_registry)
        prefix = builder.prompt_prefix
        for category in sample_registry.categories:
            assert f"### {category}" in prefix

    def test_prompt_with_single_field_registry(self) -> None:
        """Test prompt generation with a minimal registry."""
        fields = [
            FieldDefinition(
                field_name="test_field",
                category="Test Category",
                display_label="Test Field",
                description="A single test field",
                data_type="string",
                required=True,
            )
        ]
        registry = FieldRegistry(name="Minimal", fields=fields)
        builder = ExtractionPromptBuilder(registry)
        prompt = builder.build_prompt()
        assert "test_field" in prompt
        assert "Test Category" in prompt
        assert "[REQUIRED]" in prompt

    def test_domain_knowledge_injected_into_prompt(
        self, sample_registry: FieldRegistry
    ) -> None:
        """When domain_knowledge is supplied, it must appear in the prompt prefix."""
        expert_text = "CAM charges are typically reconciled annually."
        builder = ExtractionPromptBuilder(
            sample_registry, domain_knowledge=expert_text
        )
        prefix = builder.prompt_prefix
        assert expert_text in prefix
        assert "Expert Domain Knowledge" in prefix

    def test_no_domain_knowledge_omits_section(
        self, sample_registry: FieldRegistry
    ) -> None:
        """When domain_knowledge is None, the Expert Domain Knowledge section is absent."""
        builder = ExtractionPromptBuilder(sample_registry, domain_knowledge=None)
        prefix = builder.prompt_prefix
        assert "Expert Domain Knowledge" not in prefix

    def test_build_prompt_with_document_and_domain_knowledge(
        self, sample_registry: FieldRegistry
    ) -> None:
        """domain_knowledge + document_text both appear in built prompt."""
        builder = ExtractionPromptBuilder(
            sample_registry, domain_knowledge="CRE expertise."
        )
        prompt = builder.build_prompt("LEASE DOCUMENT CONTENT")
        assert "CRE expertise." in prompt
        assert "LEASE DOCUMENT CONTENT" in prompt

    def test_build_verification_prompt_empty_critical_fields(
        self, sample_registry: FieldRegistry
    ) -> None:
        """build_verification_prompt with empty list returns valid prompt string."""
        builder = ExtractionPromptBuilder(sample_registry)
        prompt = builder.build_verification_prompt([])
        assert "financial analyst" in prompt
        assert isinstance(prompt, str)
