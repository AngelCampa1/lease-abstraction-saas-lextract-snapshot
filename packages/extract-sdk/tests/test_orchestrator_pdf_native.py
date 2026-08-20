"""TDD tests for PDF-native MultiPassOrchestrator.

All three passes must call client.extract_pdf() instead of client.extract().
Tests are written FIRST to drive implementation.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from extract_sdk.exceptions import ExtractionError
from extract_sdk.extraction.orchestrator import MultiPassConfig, MultiPassOrchestrator
from extract_sdk.models import ExtractionResponse
from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.registry import FieldRegistry


# ---------------------------------------------------------------------------
# Fixtures and helpers
# ---------------------------------------------------------------------------


def _build_test_registry() -> FieldRegistry:
    """Minimal registry with one critical field (low confidence triggers Pass 3)."""
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


_SAMPLE_PDF_BYTES = b"%PDF-1.4 sample pdf content for testing"
_SAMPLE_FILENAME = "test_lease.pdf"


def _pass1_response_high_confidence() -> str:
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


def _pass1_response_low_confidence_critical() -> str:
    """Pass 1 with a critical field below escalation_threshold (0.80)."""
    return json.dumps(
        {
            "fields": {
                "base_rent_annual": {
                    "value": 120000,
                    "confidence": 0.60,  # below 0.80 escalation_threshold → triggers Pass 3
                    "source_text": "unclear amount",
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
                    "source_text": "4 per 1,000 RSF",
                },
            }
        }
    )


def _pass2_empty_response() -> str:
    return json.dumps({"field_corrections": {}})


def _pass2_correction_response() -> str:
    return json.dumps(
        {
            "field_corrections": {
                "pro_rata_share": {
                    "original_value": 0.0525,
                    "corrected_value": 0.0530,
                    "reasoning": "Calculated from 1,060 SF / 20,000 SF",
                    "confidence": 0.88,
                    "rule_relevance": [],
                }
            }
        }
    )


def _pass3_response() -> str:
    return json.dumps({"base_rent_annual": 125000})


def _make_pdf_client(response_text: str) -> MagicMock:
    """Create a mock client with extract_pdf returning the given text."""
    client = MagicMock()
    client.extract_pdf = AsyncMock(
        return_value=ExtractionResponse(
            text=response_text,
            input_tokens=1000,
            output_tokens=500,
        )
    )
    # extract() must NOT be called — if it is, the test will catch it via assertion
    client.extract = AsyncMock(side_effect=AssertionError("extract() called, expected extract_pdf()"))
    return client


# ---------------------------------------------------------------------------
# Test 1: Pass 1 calls extract_pdf, not extract
# ---------------------------------------------------------------------------


class TestPass1CallsExtractPdf:
    """Verify pass 1 uses extract_pdf(prompt, pdf_bytes, filename)."""

    @pytest.mark.asyncio
    async def test_pass1_calls_extract_pdf_with_bytes(self) -> None:
        """Pass 1 must call client.extract_pdf with the PDF bytes and filename."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        mock_client = _make_pdf_client(_pass1_response_high_confidence())

        def factory(model: str) -> MagicMock:
            return mock_client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "extract prompt")

        # extract_pdf must have been called exactly once
        mock_client.extract_pdf.assert_called_once()
        call_kwargs = mock_client.extract_pdf.call_args
        # Verify pdf_bytes and filename are passed
        assert call_kwargs.kwargs.get("pdf_bytes") == _SAMPLE_PDF_BYTES or (
            len(call_kwargs.args) > 1 and call_kwargs.args[1] == _SAMPLE_PDF_BYTES
        )

        # extract() must NOT have been called
        mock_client.extract.assert_not_called()

        # Result should be valid
        assert result.extraction.get_field_value("base_rent_annual") == 120000

    @pytest.mark.asyncio
    async def test_pass1_passes_correct_filename(self) -> None:
        """Pass 1 must forward the filename to extract_pdf."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        mock_client = _make_pdf_client(_pass1_response_high_confidence())

        def factory(model: str) -> MagicMock:
            return mock_client

        orch = MultiPassOrchestrator(config, factory, registry)
        await orch.run(_SAMPLE_PDF_BYTES, "my_lease.pdf", "prompt")

        call_kwargs = mock_client.extract_pdf.call_args
        # filename should appear as positional arg[2] or kwarg
        args = call_kwargs.args
        kwargs = call_kwargs.kwargs
        filename_passed = kwargs.get("filename") or (len(args) > 2 and args[2])
        assert filename_passed == "my_lease.pdf"


# ---------------------------------------------------------------------------
# Test 2: Pass 2 also uses extract_pdf with the same bytes
# ---------------------------------------------------------------------------


class TestPass2UsesExtractPdf:
    """Pass 2 adversarial validation must also call extract_pdf, not extract."""

    @pytest.mark.asyncio
    async def test_pass2_reads_same_pdf_adversarially(self) -> None:
        """Pass 2 must call extract_pdf with the same pdf_bytes as Pass 1."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=[],
            pass3_enabled=False,
        )

        clients: list[MagicMock] = []

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                client = _make_pdf_client(_pass1_response_high_confidence())
            else:
                client = _make_pdf_client(_pass2_empty_response())
            clients.append(client)
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert len(clients) == 2, "Expected two clients (pass1 + pass2)"

        # Both clients must use extract_pdf
        for i, client in enumerate(clients):
            assert client.extract_pdf.called, f"Client {i} did not call extract_pdf"
            client.extract.assert_not_called()

        # Pass 2 must have received the same pdf_bytes
        pass2_call = clients[1].extract_pdf.call_args
        args = pass2_call.args
        kwargs = pass2_call.kwargs
        pdf_bytes_passed = kwargs.get("pdf_bytes") or (len(args) > 1 and args[1])
        assert pdf_bytes_passed == _SAMPLE_PDF_BYTES


# ---------------------------------------------------------------------------
# Test 3: Pass 3 fires on low-confidence critical fields and uses extract_pdf
# ---------------------------------------------------------------------------


class TestPass3EscalatesOnLowConfidence:
    """Pass 3 fires when critical fields have confidence below escalation_threshold."""

    @pytest.mark.asyncio
    async def test_pass3_escalates_only_critical_fields_below_threshold(self) -> None:
        """Pass 3 runs when a critical field is below escalation_threshold (0.80)."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
            escalation_threshold=0.80,
        )

        clients: list[MagicMock] = []

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                # Pass 1: base_rent_annual has confidence 0.60 < 0.80
                client = _make_pdf_client(_pass1_response_low_confidence_critical())
            elif model == "model-b":
                # Pass 2: no corrections
                client = _make_pdf_client(_pass2_empty_response())
            else:
                # Pass 3: escalation resolution
                client = _make_pdf_client(_pass3_response())
            clients.append(client)
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # All three passes should have run
        assert len(result.pass_records) == 3, (
            f"Expected 3 pass records, got {len(result.pass_records)}"
        )
        assert result.pass_records[2].pass_number == 3

        # Pass 3 must have called extract_pdf
        assert len(clients) == 3
        clients[2].extract_pdf.assert_called_once()
        clients[2].extract.assert_not_called()

        # Pass 3 override should have been applied
        assert result.pass3_overrides == {"base_rent_annual": 125000}


# ---------------------------------------------------------------------------
# Test 4: Audit trail is attached to MultiPassResult
# ---------------------------------------------------------------------------


class TestAuditTrailCapturesAllPasses:
    """ExtractionAuditTrail must be attached as result.audit_trail."""

    @pytest.mark.asyncio
    async def test_audit_trail_captures_all_three_passes(self) -> None:
        """result.audit_trail must be present with correct structure."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
        )

        call_count = {"n": 0}

        def factory(model: str) -> MagicMock:
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_pdf_client(_pass1_response_low_confidence_critical())
            elif call_count["n"] == 2:
                return _make_pdf_client(_pass2_empty_response())
            else:
                return _make_pdf_client(_pass3_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # The audit trail must be attached as a dedicated field
        assert hasattr(result, "audit_trail"), (
            "MultiPassResult must have an audit_trail attribute"
        )
        assert result.audit_trail is not None, (
            "audit_trail must not be None"
        )
        # confidence_scores must NOT contain _audit_trail (would corrupt confidence distribution)
        assert "_audit_trail" not in result.confidence_scores, (
            "confidence_scores must not contain '_audit_trail'"
        )

        audit = result.audit_trail

        # Must have the required keys
        assert "raw_responses" in audit, "audit_trail must have raw_responses"
        assert "retry_counts" in audit, "audit_trail must have retry_counts"
        assert "validation_failures" in audit, "audit_trail must have validation_failures"
        assert "needs_review" in audit, "audit_trail must have needs_review"

        # raw_responses should have entries for each pass
        assert isinstance(audit["raw_responses"], list)
        assert len(audit["raw_responses"]) >= 1

        # retry_counts should be a list of ints
        assert isinstance(audit["retry_counts"], list)
        for count in audit["retry_counts"]:
            assert isinstance(count, int)

        # validation_failures should be a list of strings
        assert isinstance(audit["validation_failures"], list)

        # needs_review should be bool
        assert isinstance(audit["needs_review"], bool)

    @pytest.mark.asyncio
    async def test_audit_trail_present_with_single_pass(self) -> None:
        """Audit trail must be present even with Pass 2 and 3 disabled."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            return _make_pdf_client(_pass1_response_high_confidence())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert hasattr(result, "audit_trail")
        assert result.audit_trail is not None
        assert "_audit_trail" not in result.confidence_scores
        audit = result.audit_trail
        assert isinstance(audit["raw_responses"], list)
        assert len(audit["raw_responses"]) == 1


# ---------------------------------------------------------------------------
# Test 5: ExtractionError propagates when Pass 1 parse fails after retry
# ---------------------------------------------------------------------------


class TestPass1ParseFailurePropagates:
    """ExtractionError must be raised if Pass 1 JSON parse fails on both attempts."""

    @pytest.mark.asyncio
    async def test_raises_when_pass1_parse_fails_after_repair_retry(self) -> None:
        """Both initial and retry Pass 1 responses are unparseable → ExtractionError."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            return _make_pdf_client("not valid json {{{")

        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="All Pass 1 models failed on retry"):
            await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "extract prompt")

    @pytest.mark.asyncio
    async def test_raises_when_all_pass1_models_fail_to_respond(self) -> None:
        """All Pass 1 models raise → ExtractionError 'All Pass 1 models failed'."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["bad-1", "bad-2"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=Exception("model down"))
            client.extract = AsyncMock(side_effect=AssertionError("extract() called"))
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="All Pass 1 models failed"):
            await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "extract prompt")

    @pytest.mark.asyncio
    async def test_pass1_retry_succeeds_on_second_attempt(self) -> None:
        """If initial Pass 1 response is bad JSON, retry should succeed."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str) -> MagicMock:
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_pdf_client("not valid json {{{")
            return _make_pdf_client(_pass1_response_high_confidence())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # Two pass_number=1 entries: initial + retry
        assert len(result.pass_records) == 2
        assert result.pass_records[0].pass_number == 1
        assert result.pass_records[1].pass_number == 1
        assert result.extraction.get_field_value("base_rent_annual") == 120000


# ---------------------------------------------------------------------------
# Test: run() signature has changed to (pdf_bytes, filename, prompt)
# ---------------------------------------------------------------------------


class TestRunSignatureIsPdfNative:
    """run() must accept (pdf_bytes, filename, prompt), not (document_text, prompt)."""

    @pytest.mark.asyncio
    async def test_run_accepts_bytes_as_first_argument(self) -> None:
        """run() first argument must be bytes, not str."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            return _make_pdf_client(_pass1_response_high_confidence())

        orch = MultiPassOrchestrator(config, factory, registry)
        # This should succeed with bytes as first arg
        result = await orch.run(b"pdf bytes here", "lease.pdf", "prompt")
        assert result is not None

    @pytest.mark.asyncio
    async def test_run_forwards_pdf_bytes_to_all_active_passes(self) -> None:
        """Every active pass must receive the same pdf_bytes."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=[],
            pass3_enabled=False,
        )

        all_clients: list[MagicMock] = []
        pdf_bytes = b"unique pdf content 12345"

        def factory(model: str) -> MagicMock:
            client = _make_pdf_client(_pass2_empty_response() if model == "model-b" else _pass1_response_high_confidence())
            all_clients.append(client)
            return client

        orch = MultiPassOrchestrator(config, factory, registry)
        await orch.run(pdf_bytes, "lease.pdf", "prompt")

        for client in all_clients:
            call_args = client.extract_pdf.call_args
            args = call_args.args
            kwargs = call_args.kwargs
            actual_bytes = kwargs.get("pdf_bytes") or (len(args) > 1 and args[1])
            assert actual_bytes == pdf_bytes, "All passes must receive the same pdf_bytes"


# ---------------------------------------------------------------------------
# Test: audit trail retry_counts and raw_responses are index-parallel
# ---------------------------------------------------------------------------


class TestAuditTrailRetrySemantics:
    """retry_counts and raw_responses must be index-parallel (one slot per pass)."""

    @pytest.mark.asyncio
    async def test_audit_retry_count_incremented_and_raw_response_replaced(self) -> None:
        """After a Pass 1 retry, retry_counts[0]==1 and raw_responses has 1 entry."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str) -> MagicMock:
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_pdf_client("not valid json {{{")
            return _make_pdf_client(_pass1_response_high_confidence())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert result.audit_trail is not None
        audit = result.audit_trail

        # One slot per pass (pass 1 only)
        assert len(audit["raw_responses"]) == 1, (
            "raw_responses must have exactly one entry per pass executed"
        )
        assert len(audit["retry_counts"]) == 1, (
            "retry_counts must have exactly one entry per pass executed"
        )

        # Pass 1 had one retry
        assert audit["retry_counts"][0] == 1, "Pass 1 required 1 retry"

        # raw_responses[0] should be the SUCCESSFUL (final) response
        import json as _json
        final_response = _json.loads(audit["raw_responses"][0])
        assert "fields" in final_response, "raw_responses[0] should be the successful response"

        # needs_review must be True since a retry occurred
        assert audit["needs_review"] is True

    @pytest.mark.asyncio
    async def test_audit_no_retry_has_zero_retry_count(self) -> None:
        """When no retries occur, retry_counts are all 0."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=[],
            pass3_enabled=False,
        )

        call_count = {"n": 0}

        def factory(model: str) -> MagicMock:
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _make_pdf_client(_pass1_response_high_confidence())
            return _make_pdf_client(_pass2_empty_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert result.audit_trail is not None
        audit = result.audit_trail

        assert len(audit["raw_responses"]) == 2  # pass 1 + pass 2
        assert len(audit["retry_counts"]) == 2   # parallel
        assert audit["retry_counts"] == [0, 0]


# ---------------------------------------------------------------------------
# Test: Pass 3 is skipped when no disputed fields and no pass2_failure
# ---------------------------------------------------------------------------


class TestPass3SkippedWhenNoDisputedFields:
    """Pass 3 must be skipped when there are no disputed fields and pass2 did not fail."""

    @pytest.mark.asyncio
    async def test_pass3_skipped_when_no_disputed_fields_and_no_pass2_failure(
        self,
    ) -> None:
        """Pass 3 must NOT run when all critical fields have high confidence and
        pass 2 parsed cleanly (no disputes, no parse failure).
        """
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
            escalation_threshold=0.80,
        )

        pass3_called = {"called": False}

        def factory(model: str) -> MagicMock:
            if model == "model-c":
                pass3_called["called"] = True
            if model == "model-a":
                # All critical fields above threshold → no disputed fields
                return _make_pdf_client(_pass1_response_high_confidence())
            elif model == "model-b":
                # Pass 2 produces no corrections, JSON parses cleanly
                return _make_pdf_client(_pass2_empty_response())
            else:
                return _make_pdf_client(_pass3_response())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # Pass 3 must not have run
        assert not pass3_called["called"], "Pass 3 must not run when no fields to dispute"
        # Only 2 pass records (pass 1 + pass 2)
        assert len(result.pass_records) == 2
        assert result.pass3_overrides is None


# ---------------------------------------------------------------------------
# Coverage gap tests — orchestrator edge branches
# ---------------------------------------------------------------------------


class TestOrchestratorEdgeBranches:
    """Cover remaining branches in orchestrator.py for ≥95% coverage."""

    @pytest.mark.asyncio
    async def test_max_tokens_forwarded_to_extract_pdf(self) -> None:
        """When pass1_max_tokens is set, it must be forwarded to extract_pdf."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
            pass1_max_tokens=4096,
        )

        mock_client = _make_pdf_client(_pass1_response_high_confidence())

        def factory(model: str) -> MagicMock:
            return mock_client

        orch = MultiPassOrchestrator(config, factory, registry)
        await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        call_kwargs = mock_client.extract_pdf.call_args.kwargs
        assert call_kwargs.get("max_tokens") == 4096

    @pytest.mark.asyncio
    async def test_pass2_json_parse_failure_escalates_to_pass3(self) -> None:
        """When Pass 2 returns unparseable JSON, Pass 3 runs with all critical fields."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
            # All critical fields are well above threshold so _should_escalate
            # would return False by itself — only pass2_failed triggers Pass 3.
            escalation_threshold=0.50,
        )

        clients: dict[str, MagicMock] = {}

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                clients["p1"] = _make_pdf_client(_pass1_response_high_confidence())
                return clients["p1"]
            elif model == "model-b":
                # Deliberately unparseable JSON
                clients["p2"] = _make_pdf_client("not valid json {{{")
                return clients["p2"]
            else:
                clients["p3"] = _make_pdf_client(_pass3_response())
                return clients["p3"]

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # Pass 3 must have run because pass2 JSON was invalid
        assert "p3" in clients, "Pass 3 must have run when pass2 JSON is unparseable"
        assert len(result.pass_records) == 3

    @pytest.mark.asyncio
    async def test_pass2_json_parse_failure_no_critical_fields_skips_pass3(
        self,
    ) -> None:
        """When Pass 2 fails and registry has no critical fields, Pass 3 is skipped."""
        # Build a registry with NO critical fields
        fields = [
            FieldDefinition(
                field_name="notes",
                category="Misc",
                display_label="Notes",
                description="Miscellaneous notes",
                data_type="string",
                required=False,
                critical=False,
                weight=1.0,
            )
        ]
        registry = FieldRegistry("no-critical", fields)

        pass1_resp = json.dumps(
            {
                "fields": {
                    "notes": {"value": "some notes", "confidence": 0.9, "source_text": "..."},
                }
            }
        )

        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
        )

        pass3_called = {"called": False}

        def factory(model: str) -> MagicMock:
            if model == "model-c":
                pass3_called["called"] = True
            if model == "model-a":
                return _make_pdf_client(pass1_resp)
            else:
                return _make_pdf_client("not valid json {{{")

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert not pass3_called["called"], "Pass 3 must not run when no critical fields"
        assert len(result.pass_records) == 2

    @pytest.mark.asyncio
    async def test_all_pass3_models_fail_uses_pass1_pass2_merge(self) -> None:
        """When all Pass 3 models fail, result falls back to Pass 1+2 merge."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["bad-model"],
            escalation_threshold=0.80,
        )

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                return _make_pdf_client(_pass1_response_low_confidence_critical())
            elif model == "model-b":
                return _make_pdf_client(_pass2_empty_response())
            else:
                # Pass 3 model always fails
                client = MagicMock()
                client.extract_pdf = AsyncMock(side_effect=Exception("model down"))
                client.extract = AsyncMock(
                    side_effect=AssertionError("extract() called")
                )
                return client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # pass3_overrides is None because Pass 3 never responded
        assert result.pass3_overrides is None
        # Only 2 pass records (pass 3 never returned a result)
        assert len(result.pass_records) == 2

    @pytest.mark.asyncio
    async def test_needs_review_set_when_critical_field_below_min_confidence(
        self,
    ) -> None:
        """needs_review must be True when a merged critical field is below min_confidence."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
            min_confidence=0.80,
        )

        # Pass 1 returns a critical field below min_confidence (0.60 < 0.80)
        def factory(model: str) -> MagicMock:
            return _make_pdf_client(_pass1_response_low_confidence_critical())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert result.needs_review is True
        assert result.audit_trail is not None
        assert result.audit_trail["needs_review"] is True

    @pytest.mark.asyncio
    async def test_parse_overrides_returns_empty_dict_on_invalid_json(self) -> None:
        """_parse_overrides returns {} when Pass 3 response is invalid JSON."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
            escalation_threshold=0.80,
        )

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                return _make_pdf_client(_pass1_response_low_confidence_critical())
            elif model == "model-b":
                return _make_pdf_client(_pass2_empty_response())
            else:
                # Pass 3 returns invalid JSON
                return _make_pdf_client("not valid json {{{")

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # Pass 3 ran but returned nothing parseable — overrides should be empty
        assert result.pass3_overrides == {}

    @pytest.mark.asyncio
    async def test_parse_patch_non_dict_corrections_returns_empty_patch(
        self,
    ) -> None:
        """When field_corrections is not a dict, _parse_patch returns an empty ExtractionPatch."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=[],
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                return _make_pdf_client(_pass1_response_high_confidence())
            else:
                # field_corrections is a list, not a dict
                return _make_pdf_client(
                    json.dumps({"field_corrections": ["not", "a", "dict"]})
                )

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # patch should be None (empty patch) since field_corrections was invalid
        assert result.patch is None

    @pytest.mark.asyncio
    async def test_pass2_disabled_skips_pass2_and_pass3(self) -> None:
        """With pass2_enabled=False and pass3_enabled=False, only pass 1 runs."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        clients_called: list[str] = []

        def factory(model: str) -> MagicMock:
            clients_called.append(model)
            return _make_pdf_client(_pass1_response_high_confidence())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert "model-b" not in clients_called
        assert "model-c" not in clients_called
        assert len(result.pass_records) == 1

    @pytest.mark.asyncio
    async def test_all_pass2_models_fail_falls_back_to_pass1(self) -> None:
        """When all Pass 2 models fail (outcome2=None), result is Pass 1 extraction."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["bad-model"],
            pass3_models=[],
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                return _make_pdf_client(_pass1_response_high_confidence())
            else:
                client = MagicMock()
                client.extract_pdf = AsyncMock(side_effect=Exception("model down"))
                client.extract = AsyncMock(
                    side_effect=AssertionError("extract() called")
                )
                return client

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # Only Pass 1 record
        assert len(result.pass_records) == 1
        assert result.extraction.get_field_value("base_rent_annual") == 120000

    @pytest.mark.asyncio
    async def test_parse_patch_non_dict_corr_data_entry_skipped(self) -> None:
        """When a corr_data entry is not a dict, it is skipped in _parse_patch."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=[],
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            if model == "model-a":
                return _make_pdf_client(_pass1_response_high_confidence())
            else:
                # corr_data is a string (non-dict) — should be skipped
                resp = json.dumps(
                    {
                        "field_corrections": {
                            "base_rent_annual": "not-a-dict",
                            "pro_rata_share": {
                                "original_value": 0.0525,
                                "corrected_value": 0.0530,
                                "reasoning": "recalculated",
                                "confidence": 0.88,
                                "rule_relevance": [],
                            },
                        }
                    }
                )
                return _make_pdf_client(resp)

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # Only pro_rata_share correction is applied; base_rent_annual entry skipped
        assert result.patch is not None
        assert "pro_rata_share" in result.patch.field_corrections
        assert "base_rent_annual" not in result.patch.field_corrections

    @pytest.mark.asyncio
    async def test_schema_error_in_field_categories_skipped_gracefully(
        self,
    ) -> None:
        """SchemaError during field_categories build (unknown disputed field) is skipped.

        Uses a registry mock where get_critical_field_names() returns only
        "unknown_field_xyz" and get_field("unknown_field_xyz") raises SchemaError.
        This guarantees disputed_fields == ["unknown_field_xyz"] so the loop hits
        the SchemaError + continue branch without any other field succeeding first.
        """
        from extract_sdk.exceptions import SchemaError as SDKSchemaError

        # Build a registry that reports "unknown_field_xyz" as critical but
        # cannot resolve it — simulating a schema inconsistency that exercises
        # the SchemaError→continue branch in the field_categories build loop.
        real_registry = _build_test_registry()
        mock_registry = MagicMock(spec=real_registry)
        mock_registry.get_critical_field_names.return_value = ["unknown_field_xyz"]
        mock_registry.get_field.side_effect = SDKSchemaError(
            "Field not found in registry: unknown_field_xyz"
        )
        # has_field returns False so parse_extraction_response skips type coercion
        mock_registry.has_field.return_value = False
        # Pass-through other registry methods used by the orchestrator
        mock_registry.get_field_weights.return_value = (
            real_registry.get_field_weights()
        )

        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=["model-b"],
            pass3_models=["model-c"],
            escalation_threshold=0.80,
        )

        # Pass 1: no fields for unknown_field_xyz → confidence defaults to 0.0 < 0.80
        # so _should_escalate returns (True, ["unknown_field_xyz"])
        def factory(model: str) -> MagicMock:
            if model == "model-a":
                return _make_pdf_client(_pass1_response_high_confidence())
            elif model == "model-b":
                return _make_pdf_client(_pass2_empty_response())
            else:
                return _make_pdf_client(_pass3_response())

        orch = MultiPassOrchestrator(config, factory, mock_registry)
        # Should not raise — SchemaError for the only disputed field is silently
        # skipped via continue; field_categories ends up empty but pass 3 still runs.
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        assert result is not None
        assert len(result.pass_records) >= 2

    @pytest.mark.asyncio
    async def test_confidence_scores_contains_per_field_floats(self) -> None:
        """confidence_scores must be a dict of field_name → float, not containing _audit_trail."""
        registry = _build_test_registry()
        config = MultiPassConfig(
            pass1_models=["model-a"],
            pass2_models=[],
            pass3_models=[],
            pass2_enabled=False,
            pass3_enabled=False,
        )

        def factory(model: str) -> MagicMock:
            return _make_pdf_client(_pass1_response_high_confidence())

        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_SAMPLE_PDF_BYTES, _SAMPLE_FILENAME, "prompt")

        # All values must be floats (per-field confidence scores)
        assert "_audit_trail" not in result.confidence_scores
        for field_name, score in result.confidence_scores.items():
            assert isinstance(score, float), (
                f"confidence_scores['{field_name}'] = {score!r} must be a float"
            )
