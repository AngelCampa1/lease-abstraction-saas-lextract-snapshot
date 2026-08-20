"""Tests for FieldDefinition, FieldRegistry, and lextract schema."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from extract_sdk.exceptions import SchemaError
from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.lextract_schema import (
    build_lextract_registry,
    get_lextract_registry,
    reset_lextract_registry,
)
from extract_sdk.schema.registry import FieldRegistry


class TestFieldDefinition:
    """Tests for FieldDefinition dataclass."""

    def test_basic_construction(self) -> None:
        fd = FieldDefinition(
            field_name="test_field",
            category="Test",
            display_label="Test Field",
            description="A test field.",
            data_type="string",
        )
        assert fd.field_name == "test_field"
        assert fd.category == "Test"
        assert fd.required is False
        assert fd.weight == 1.0
        assert fd.critical is False
        assert fd.aliases == []
        assert fd.cam_relevant is False

    def test_construction_with_all_params(self) -> None:
        fd = FieldDefinition(
            field_name="rent",
            category="Rent",
            display_label="Rent",
            description="Annual rent",
            data_type="currency",
            required=True,
            aliases=["Base Rent"],
            cam_relevant=True,
            weight=2.0,
            critical=True,
        )
        assert fd.required is True
        assert fd.weight == 2.0
        assert fd.critical is True
        assert fd.aliases == ["Base Rent"]
        assert fd.cam_relevant is True

    def test_frozen_immutability(self) -> None:
        fd = FieldDefinition(
            field_name="x", category="C", display_label="X",
            description="d", data_type="string",
        )
        with pytest.raises(AttributeError):
            fd.field_name = "y"  # type: ignore[misc]

    def test_to_json_schema_property_string(self) -> None:
        fd = FieldDefinition(
            field_name="name", category="C", display_label="N",
            description="A name", data_type="string",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "string"]
        assert prop["description"] == "A name"

    def test_to_json_schema_property_number(self) -> None:
        fd = FieldDefinition(
            field_name="amount", category="C", display_label="A",
            description="Amount", data_type="number",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "number"]

    def test_to_json_schema_property_currency(self) -> None:
        fd = FieldDefinition(
            field_name="rent", category="C", display_label="R",
            description="Rent", data_type="currency",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "number"]

    def test_to_json_schema_property_date(self) -> None:
        fd = FieldDefinition(
            field_name="start", category="C", display_label="S",
            description="Start date", data_type="date",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "string"]
        assert prop["format"] == "date"

    def test_to_json_schema_property_boolean(self) -> None:
        fd = FieldDefinition(
            field_name="flag", category="C", display_label="F",
            description="A flag", data_type="boolean",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "boolean"]

    def test_to_json_schema_property_percentage(self) -> None:
        fd = FieldDefinition(
            field_name="rate", category="C", display_label="R",
            description="Rate", data_type="percentage",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "number"]

    def test_to_json_schema_property_array(self) -> None:
        fd = FieldDefinition(
            field_name="items", category="C", display_label="I",
            description="Items", data_type="array",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "array"]
        assert prop["items"] == {"type": "string"}

    def test_to_json_schema_property_unknown_type(self) -> None:
        fd = FieldDefinition(
            field_name="x", category="C", display_label="X",
            description="Unknown type", data_type="custom_type",
        )
        prop = fd.to_json_schema_property()
        assert prop["type"] == ["null", "string"]

    def test_to_prompt_definition_basic(self) -> None:
        fd = FieldDefinition(
            field_name="test", category="C", display_label="T",
            description="A test", data_type="string",
        )
        prompt = fd.to_prompt_definition()
        assert "**test**" in prompt
        assert "(string)" in prompt
        assert "A test" in prompt

    def test_to_prompt_definition_with_aliases(self) -> None:
        fd = FieldDefinition(
            field_name="test", category="C", display_label="T",
            description="A test", data_type="string", aliases=["Alias1", "Alias2"],
        )
        prompt = fd.to_prompt_definition()
        assert "Aliases:" in prompt
        assert '"Alias1"' in prompt
        assert '"Alias2"' in prompt

    def test_to_prompt_definition_required(self) -> None:
        fd = FieldDefinition(
            field_name="test", category="C", display_label="T",
            description="A test", data_type="string", required=True,
        )
        prompt = fd.to_prompt_definition()
        assert "[REQUIRED]" in prompt


class TestFieldRegistry:
    """Tests for FieldRegistry."""

    def test_construction(self, sample_fields: list[FieldDefinition]) -> None:
        registry = FieldRegistry(name="Test", fields=sample_fields)
        assert registry.name == "Test"
        assert registry.field_count == 8
        assert len(registry) == 8

    def test_duplicate_field_names_raises(self) -> None:
        fields = [
            FieldDefinition(
                field_name="dup", category="C", display_label="D",
                description="D", data_type="string",
            ),
            FieldDefinition(
                field_name="dup", category="C", display_label="D",
                description="D", data_type="string",
            ),
        ]
        with pytest.raises(SchemaError, match="Duplicate field name"):
            FieldRegistry(name="Bad", fields=fields)

    def test_get_field(self, sample_registry: FieldRegistry) -> None:
        fd = sample_registry.get_field("base_rent_annual")
        assert fd.field_name == "base_rent_annual"
        assert fd.data_type == "currency"

    def test_get_field_not_found(self, sample_registry: FieldRegistry) -> None:
        with pytest.raises(SchemaError, match="Field not found"):
            sample_registry.get_field("nonexistent")

    def test_has_field(self, sample_registry: FieldRegistry) -> None:
        assert sample_registry.has_field("base_rent_annual") is True
        assert sample_registry.has_field("nonexistent") is False

    def test_contains(self, sample_registry: FieldRegistry) -> None:
        assert "base_rent_annual" in sample_registry
        assert "nonexistent" not in sample_registry

    def test_iter(self, sample_registry: FieldRegistry) -> None:
        field_names = [fd.field_name for fd in sample_registry]
        assert "base_rent_annual" in field_names
        assert len(field_names) == 8

    def test_categories(self, sample_registry: FieldRegistry) -> None:
        cats = sample_registry.categories
        assert "Rent & Escalations" in cats
        assert "CAM & Operating Expenses" in cats
        assert cats == sorted(cats)

    def test_field_names(self, sample_registry: FieldRegistry) -> None:
        names = sample_registry.field_names
        assert "base_rent_annual" in names
        assert len(names) == 8

    def test_get_fields_by_category(self, sample_registry: FieldRegistry) -> None:
        cam_fields = sample_registry.get_fields_by_category("CAM & Operating Expenses")
        assert len(cam_fields) == 2
        names = [f.field_name for f in cam_fields]
        assert "pro_rata_share" in names
        assert "cam_exclusions" in names

    def test_get_fields_by_category_empty(self, sample_registry: FieldRegistry) -> None:
        fields = sample_registry.get_fields_by_category("Nonexistent Category")
        assert fields == []

    def test_get_required_fields(self, sample_registry: FieldRegistry) -> None:
        required = sample_registry.get_required_fields()
        assert len(required) == 7
        assert all(f.required for f in required)

    def test_get_required_field_names(self, sample_registry: FieldRegistry) -> None:
        names = sample_registry.get_required_field_names()
        assert "base_rent_annual" in names
        assert "parking_ratio" not in names

    def test_get_critical_fields(self, sample_registry: FieldRegistry) -> None:
        critical = sample_registry.get_critical_fields()
        assert len(critical) == 3
        names = [f.field_name for f in critical]
        assert "base_rent_annual" in names
        assert "pro_rata_share" in names
        assert "lease_term_months" in names

    def test_get_critical_field_names(self, sample_registry: FieldRegistry) -> None:
        names = sample_registry.get_critical_field_names()
        assert len(names) == 3

    def test_get_field_weights(self, sample_registry: FieldRegistry) -> None:
        weights = sample_registry.get_field_weights()
        assert weights["base_rent_annual"] == 2.0
        assert weights["parking_ratio"] == 1.0

    def test_generate_json_schema(self, sample_registry: FieldRegistry) -> None:
        schema = sample_registry.generate_json_schema()
        assert schema["type"] == "object"
        assert "fields" in schema["properties"]
        fields_schema = schema["properties"]["fields"]
        assert "base_rent_annual" in fields_schema["properties"]
        # Required fields should be listed
        assert "base_rent_annual" in fields_schema["required"]
        assert "parking_ratio" not in fields_schema["required"]

    def test_generate_json_schema_block(self, sample_registry: FieldRegistry) -> None:
        block = sample_registry.generate_json_schema_block()
        parsed = json.loads(block)
        assert "fields" in parsed["properties"]

    def test_generate_field_definitions_block(self, sample_registry: FieldRegistry) -> None:
        block = sample_registry.generate_field_definitions_block()
        assert "### Rent & Escalations" in block
        assert "**base_rent_annual**" in block
        assert "[REQUIRED]" in block
        assert '"Proportionate Share"' in block


class TestLextractSchema:
    """Tests for the Lextract 126-field registry."""

    def test_build_lextract_registry(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        assert registry.name == "Lextract 126-field"
        assert registry.field_count == 126

    def test_lextract_critical_fields(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        critical = registry.get_critical_field_names()
        assert "base_rent_annual" in critical
        assert "pro_rata_share" in critical
        assert "lease_term_months" in critical

    def test_lextract_required_fields(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        required = registry.get_required_field_names()
        assert "landlord_legal_name" in required
        assert "base_rent_annual" in required

    def test_lextract_categories(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        categories = registry.categories
        assert "Parties & Property" in categories
        assert "Key Dates & Term" in categories
        assert "Rent & Escalations" in categories
        assert "CAM & Operating Expenses" in categories
        # New v1.5 categories
        assert "ASC 842 / IFRS 16 Compliance" in categories
        assert "Casualty, Condemnation & Force Majeure" in categories

    def test_lextract_new_asc842_fields(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        for field_name in [
            "lease_classification",
            "discount_rate",
            "has_purchase_option",
            "purchase_option_price",
            "variable_lease_payments",
            "residual_value_guarantee",
            "lease_incentives_received",
            "short_term_lease_election",
        ]:
            fd = registry.get_field(field_name)
            assert fd.category == "ASC 842 / IFRS 16 Compliance"

    def test_lextract_new_options_fields(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        for field_name in [
            "has_expansion_option",
            "expansion_option_terms",
            "has_contraction_option",
            "auto_renewal",
            "auto_renewal_terms",
        ]:
            fd = registry.get_field(field_name)
            assert fd.category == "Options"

    def test_lextract_new_casualty_fields(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        for field_name in [
            "casualty_termination_right",
            "casualty_rent_abatement",
            "condemnation_termination_right",
            "condemnation_award_allocation",
            "force_majeure_clause",
        ]:
            fd = registry.get_field(field_name)
            assert fd.category == "Casualty, Condemnation & Force Majeure"

    def test_lextract_new_financial_fields(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        for field_name in [
            "base_rent_per_rsf",
            "monthly_base_rent",
            "cpi_escalation_floor",
            "cpi_escalation_ceiling",
            "expense_stop_amount",
        ]:
            fd = registry.get_field(field_name)
            assert fd.category == "Rent & Escalations"

    def test_lextract_new_misc_fields(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        for field_name in [
            "landlord_notice_address",
            "tenant_notice_address",
            "hazardous_materials_clause",
            "relocation_right",
        ]:
            fd = registry.get_field(field_name)
            assert fd.category == "Miscellaneous"

    def test_lextract_field_weights(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        weights = registry.get_field_weights()
        assert weights["base_rent_annual"] == 2.0
        assert weights["pro_rata_share"] == 2.0
        assert weights["lease_term_months"] == 1.5

    def test_get_lextract_registry_singleton(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        reset_lextract_registry()
        r1 = get_lextract_registry()
        r2 = get_lextract_registry()
        assert r1 is r2
        reset_lextract_registry()

    def test_reset_lextract_registry(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        reset_lextract_registry()
        r1 = get_lextract_registry()
        reset_lextract_registry()
        r2 = get_lextract_registry()
        assert r1 is not r2
        reset_lextract_registry()

    def test_lextract_json_schema_generation(self, lextract_schema_path: Path) -> None:
        if not lextract_schema_path.exists():
            pytest.skip("lextract_field_schema.json not found")
        registry = build_lextract_registry(schema_path=lextract_schema_path)
        schema = registry.generate_json_schema()
        # Validate it's valid JSON by serializing
        json_str = json.dumps(schema)
        reparsed = json.loads(json_str)
        assert "fields" in reparsed["properties"]

    def test_build_lextract_registry_bad_path(self) -> None:
        with pytest.raises(FileNotFoundError):
            build_lextract_registry(schema_path=Path("/nonexistent/path.json"))

    def test_find_schema_json_not_found(self) -> None:
        """Test _find_schema_json when schema is not in the path hierarchy."""
        from unittest.mock import patch
        from extract_sdk.schema.lextract_schema import _find_schema_json

        # Mock Path(__file__) to start from a location where schema won't be found
        with patch(
            "extract_sdk.schema.lextract_schema.Path"
        ) as mock_path_cls:
            class FakePath:
                def __init__(self) -> None:
                    self.parent = self

                def __truediv__(self, other: str) -> FakePath:
                    return FakePath()

                def exists(self) -> bool:
                    return False

            fake = FakePath()
            mock_path_cls.return_value.resolve.return_value.parent = fake
            mock_path_cls.cwd.return_value = fake

            with pytest.raises(FileNotFoundError, match="Cannot locate"):
                _find_schema_json()
