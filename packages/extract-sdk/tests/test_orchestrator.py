"""Tests for MultiPassOrchestrator."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from extract_sdk.exceptions import ExtractionError
from extract_sdk.extraction.orchestrator import MultiPassConfig, MultiPassOrchestrator
from extract_sdk.models import ExtractionResponse
from extract_sdk.schema.registry import FieldRegistry
from extract_sdk.schema.base import FieldDefinition


def _build_test_registry() -> FieldRegistry:
    """Build a minimal registry for testing."""
    fields = [
        FieldDefinition(
            field_name="base_rent_annual",
            category="Rent & Escalations",
            display_label="Annual Base Rent",
            description="Annual rent",
            data_type="currency",
            required=True,
            critical=True,
            weight=2.0,
        ),
        FieldDefinition(
            field_name="pro_rata_share",
            category="CAM & Operating Expenses",
            display_label="Pro Rata Share",
            description="Tenant share",
            data_type="percentage",
            required=True,
            critical=True,
            weight=2.0,
        ),
        FieldDefinition(
            field_name="lease_term_months",
            category="Key Dates & Term",
            display_label="Lease Term",
            description="Term in months",
            data_type="number",
            required=True,
            critical=True,
            weight=1.5,
        ),
        FieldDefinition(
            field_name="parking_ratio",
            category="Parking & Common Areas",
            display_label="Parking Ratio",
            description="Spaces per 1000 RSF",
            data_type="number",
            required=False,
            weight=1.0,
        ),
    ]
    return FieldRegistry("test-registry", fields)


def _pass1_response() -> str:
    """Standard Pass 1 extraction JSON."""
    return json.dumps(
        {
            "fields": {
                "base_rent_annual": {
                    "value": 120000,
                    "confidence": 0.95,
                    "source_text": "$120,000 per annum",
                },
                "pro_rata_share": {
                    "value": 0.0525,
                    "confidence": 0.90,
                    "source_text": "5.25%",
                },
                "lease_term_months": {
                    "value": 60,
                    "confidence": 0.92,
                    "source_text": "five (5) years",
                },
                "parking_ratio": {
                    "value": 4.0,
                    "confidence": 0.85,
                    "source_text": "4 spaces per 1,000 RSF",
                },
            }
        }
    )


def _pass2_response_with_correction() -> str:
    """Pass 2 response correcting pro_rata_share."""
    return json.dumps(
        {
            "field_corrections": {
                "pro_rata_share": {
                    "original_value": 0.0525,
                    "corrected_value": 0.0530,
                    "reasoning": "Calculated from 1,060 SF / 20,000 SF = 5.30%",
                    "confidence": 0.88,
                    "rule_relevance": [],
                }
            }
        }
    )


def _pass2_empty_response() -> str:
    return json.dumps({"field_corrections": {}})


def _pass3_response() -> str:
    return json.dumps({"pro_rata_share": 0.0530})


_FAKE_PDF_BYTES = b"%PDF-1.4 fake"
_FAKE_FILENAME = "test.pdf"


def _make_client(response_text: str):
    """Create a mock client satisfying ExtractionClientProtocol (PDF-native)."""
    client = MagicMock()
    client.extract_pdf = AsyncMock(
        return_value=ExtractionResponse(
            text=response_text,
            input_tokens=1000,
            output_tokens=500,
        )
    )
    return client


class TestMultiPassConfigDefaults:
    """Regression guards for MultiPassConfig default values."""

    def test_pass1_max_tokens_default(self) -> None:
        # None → OpenRouter omits the parameter, using the model's full capacity.
        assert (
            MultiPassConfig(
                pass1_models=[], pass2_models=[], pass3_models=[]
            ).pass1_max_tokens
            is None
        )

    def test_pass2_max_tokens_default(self) -> None:
        # None → OpenRouter omits the parameter, using the model's full capacity.
        assert (
            MultiPassConfig(
                pass1_models=[], pass2_models=[], pass3_models=[]
            ).pass2_max_tokens
            is None
        )

    def test_pass3_max_tokens_default(self) -> None:
        # None → OpenRouter omits the parameter, using the model's full capacity.
        assert (
            MultiPassConfig(
                pass1_models=[], pass2_models=[], pass3_models=[]
            ).pass3_max_tokens
            is None
        )


class TestMultiPassOrchestrator:
    """Tests for the full 3-pass pipeline."""

    @pytest.mark.asyncio
    async def test_full_3_pass_flow(self):
        """Pass 1 → Pass 2 correction on critical field → Pass 3 escalation."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            elif call_count["n"] == 2:
                return _make_client(_pass2_response_with_correction())
            else:
                return _make_client(_pass3_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "extract prompt")

        assert len(result.pass_records) == 3
        assert result.pass_records[0].pass_number == 1
        assert result.pass_records[1].pass_number == 2
        assert result.pass_records[2].pass_number == 3
        # Pass 3 override wins
        assert result.extraction.get_field_value("pro_rata_share") == 0.0530
        assert result.pass3_overrides == {"pro_rata_share": 0.0530}

    @pytest.mark.asyncio
    async def test_pass1_only_when_pass2_disabled(self):
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        def factory(model: str):
            return _make_client(_pass1_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert len(result.pass_records) == 1
        assert result.extraction.get_field_value("base_rent_annual") == 120000
        assert result.patch is None
        assert result.pass3_overrides is None

    @pytest.mark.asyncio
    async def test_pass2_no_corrections_skips_pass3(self):
        """When Pass 2 finds nothing wrong, Pass 3 should not run."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            else:
                return _make_client(_pass2_empty_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        # Only Pass 1 and Pass 2 should have records
        assert len(result.pass_records) == 2
        assert result.patch is None  # Empty patch stored as None
        assert result.pass3_overrides is None

    @pytest.mark.asyncio
    async def test_pass1_all_models_fail_raises(self):
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["bad-1", "bad-2"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
        )

        def factory(model: str):
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=Exception("model down"))
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="All Pass 1 models failed"):
            await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

    @pytest.mark.asyncio
    async def test_pass2_all_models_fail_graceful(self):
        """If all Pass 2 models fail, use Pass 1 result as-is."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["bad-1"],
            pass3_models=["model-c"],
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=Exception("model down"))
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert len(result.pass_records) == 1  # Only Pass 1
        assert result.extraction.get_field_value("base_rent_annual") == 120000

    @pytest.mark.asyncio
    async def test_pass2_all_models_fail_marks_validation_unavailable(self):
        """If all Pass 2 models fail, mark review and record a validation signal."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["google/gemini-3-flash-preview"],
            pass2_models=["google/gemini-3.1-flash-lite-preview"],
            pass3_models=[],
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=Exception("model down"))
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert result.needs_review is True
        assert result.audit_trail["needs_review"] is True
        assert any(
            "Pass 2 validation unavailable" in failure
            for failure in result.audit_trail["validation_failures"]
        )

    @pytest.mark.asyncio
    async def test_cost_ceiling_unknown_pricing_skips_later_pass_safely(self):
        """With a cost ceiling enabled, unknown-priced models are not called."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["google/gemini-3-flash-preview"],
            pass2_models=["unknown/model"],
            pass3_models=[],
            pass3_enabled=False,
            cost_ceiling_cents=100,
        )

        called_models: list[str] = []

        def factory(model: str):
            called_models.append(model)
            if model == "google/gemini-3-flash-preview":
                return _make_client(_pass1_response())
            client = MagicMock()
            client.extract_pdf = AsyncMock(return_value=ExtractionResponse(text="{}", input_tokens=1, output_tokens=1))
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert called_models == ["google/gemini-3-flash-preview"]
        assert result.cost_ceiling_hit is True
        assert result.needs_review is True
        assert any(
            "unknown pricing" in failure
            for failure in result.audit_trail["validation_failures"]
        )

    @pytest.mark.asyncio
    async def test_pass3_all_models_fail_graceful(self):
        """If Pass 3 fails, use Pass 1 + Pass 2 merge."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["bad-1"],
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            elif call_count["n"] == 2:
                return _make_client(_pass2_response_with_correction())
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=Exception("model down"))
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert len(result.pass_records) == 2  # Pass 1 + Pass 2
        # Pass 2 correction should be applied (no Pass 3 override)
        assert result.extraction.get_field_value("pro_rata_share") == 0.0530

    @pytest.mark.asyncio
    async def test_fallback_chain(self):
        """First model fails, second succeeds."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["bad-model", "good-model"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
        )

        def factory(model: str):
            if model == "bad-model":
                client = MagicMock()
                client.extract_pdf = AsyncMock(side_effect=Exception("rate limit"))
                return client
            return _make_client(_pass1_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert result.pass_records[0].model == "good-model"

    @pytest.mark.asyncio
    async def test_pass2_invalid_json_graceful(self):
        """Pass 2 returning unparseable JSON is treated as empty patch (graceful)."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["m1"],
            pass2_models=["m2"],
            pass3_models=[],
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            return _make_client("not json {{{")

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        # Pass 1 result should be preserved; bad Pass 2 JSON is ignored
        assert result.extraction.get_field_value("base_rent_annual") == 120000
        assert result.patch is None  # Empty patch stored as None

    @pytest.mark.asyncio
    async def test_pass3_invalid_json_graceful(self):
        """Pass 3 returning unparseable JSON is treated as empty overrides (graceful)."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["m1"],
            pass2_models=["m2"],
            pass3_models=["m3"],
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            elif call_count["n"] == 2:
                return _make_client(_pass2_response_with_correction())
            return _make_client("not json {{{")

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        # Pass 2 correction should be applied; bad Pass 3 JSON yields empty overrides dict
        assert result.extraction.get_field_value("pro_rata_share") == 0.0530
        assert result.pass3_overrides == {}

    @pytest.mark.asyncio
    async def test_pass1_parse_error_retry_models_all_fail(self):
        """If Pass 1 JSON is unparseable and retry's _try_models returns None, raise ExtractionError."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                # First call: model responds but with bad JSON (triggers retry)
                return _make_client("not valid json {{{")
            # All retry models raise network errors → _try_models returns None
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=Exception("network error on retry"))
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="All Pass 1 models failed on retry"):
            await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

    @pytest.mark.asyncio
    async def test_needs_review_flagged_when_critical_field_low_confidence(self):
        """needs_review=True when a critical field has confidence < 0.60."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["m1"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        low_conf_response = json.dumps(
            {
                "fields": {
                    "base_rent_annual": {
                        "value": 120000,
                        "confidence": 0.45,  # below 0.60 threshold
                        "source_text": "unclear amount",
                    },
                }
            }
        )

        def factory(model: str):
            return _make_client(low_conf_response)

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert result.needs_review is True

    @pytest.mark.asyncio
    async def test_pass1_parse_error_triggers_retry(self):
        """If Pass 1 returns unparseable JSON, retry once; second call succeeds."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client("not valid json {{{")
            return _make_client(_pass1_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        # Two pass_number=1 entries: initial attempt + retry
        assert len(result.pass_records) == 2
        assert result.pass_records[0].pass_number == 1
        assert result.pass_records[1].pass_number == 1
        assert result.extraction.get_field_value("base_rent_annual") == 120000

    @pytest.mark.asyncio
    async def test_pass1_parse_error_both_attempts_fail_raises(self):
        """If both the initial and retry Pass 1 calls return unparseable JSON, raise ExtractionError."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        def factory(model: str):
            return _make_client("not valid json {{{")

        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="All Pass 1 models failed on retry"):
            await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

    @pytest.mark.asyncio
    async def test_total_tokens_tracked(self):
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["m1"],
            pass2_models=["m2"],
            pass3_models=[],
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_client(_pass1_response())
            return _make_client(_pass2_empty_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF_BYTES, _FAKE_FILENAME, "prompt")

        assert result.total_tokens == 3000  # 1500 per pass × 2
