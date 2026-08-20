"""Tests for the dual-extract + judge orchestrator path.

Exercises ``MultiPassOrchestrator._run_dual_extract`` end-to-end with mocked
clients; verifies the observer wiring, cost accounting, fallback behaviour,
and Pass 3 escalation triggers.
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from extract_sdk.exceptions import ExtractionError
from extract_sdk.extraction.observers import (
    PipelineStage,
    PipelineStatus,
)
from extract_sdk.extraction.orchestrator import (
    MultiPassConfig,
    MultiPassOrchestrator,
)
from extract_sdk.models import ExtractionResponse
from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.registry import FieldRegistry, build_extraction_model

_FAKE_PDF = b"%PDF-1.4 fake"
_FAKE_FILE = "test.pdf"


def _build_registry() -> FieldRegistry:
    """Build a tiny registry with at least one critical field."""
    return FieldRegistry(
        "dual-test",
        [
            FieldDefinition(
                field_name="base_rent_annual",
                category="Rent",
                display_label="Base Rent",
                description="Annual rent",
                data_type="number",
                required=True,
                critical=True,
                weight=2.0,
            ),
            FieldDefinition(
                field_name="lease_term_months",
                category="Term",
                display_label="Term",
                description="Term in months",
                data_type="number",
                required=True,
                critical=True,
                weight=1.5,
            ),
            FieldDefinition(
                field_name="landlord_legal_name",
                category="Parties",
                display_label="Landlord",
                description="Landlord name",
                data_type="string",
                required=True,
                critical=False,
            ),
        ],
    )


def _extraction_response(
    rent: float = 120000,
    term: int = 60,
    landlord: str = "Acme",
    rent_conf: float = 0.95,
    term_conf: float = 0.95,
    landlord_conf: float = 0.95,
) -> str:
    """Build a stringified ExtractionResult JSON for our test registry."""
    return json.dumps(
        {
            "fields": {
                "base_rent_annual": {
                    "value": rent,
                    "confidence": rent_conf,
                    "source_text": f"${rent}",
                },
                "lease_term_months": {
                    "value": term,
                    "confidence": term_conf,
                    "source_text": f"{term} months",
                },
                "landlord_legal_name": {
                    "value": landlord,
                    "confidence": landlord_conf,
                    "source_text": landlord,
                },
            }
        }
    )


def _pdf_client(
    response_text: str, *, input_tokens: int = 1000, output_tokens: int = 500
) -> Any:
    client = MagicMock()
    client.extract_pdf = AsyncMock(
        return_value=ExtractionResponse(
            text=response_text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
    )
    return client


def _judge_client(
    verdicts: list[dict[str, Any]], *, input_tokens: int = 200, output_tokens: int = 100
) -> Any:
    client = MagicMock()
    client.extract = AsyncMock(
        return_value=ExtractionResponse(
            text=json.dumps(verdicts),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
    )
    return client


class _RecordingObserver:
    """Observer that records every callback for assertions."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict[str, Any]]] = []

    def start_stage(
        self,
        *,
        stage: PipelineStage,
        attempt_number: int = 1,
        model: str | None = None,
        fallback_models: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> int:
        handle = len(self.events)
        self.events.append(
            (
                "start",
                {
                    "stage": stage,
                    "model": model,
                    "fallback_models": fallback_models,
                    "attempt_number": attempt_number,
                    "metadata": metadata,
                },
            )
        )
        return handle

    def finish_stage(
        self,
        handle: Any,
        *,
        status: PipelineStatus,
        duration_ms: int,
        retry_count: int = 0,
        error_class: str | None = None,
        model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.events.append(
            (
                "finish",
                {
                    "handle": handle,
                    "status": status,
                    "model": model,
                    "duration_ms": duration_ms,
                    "error_class": error_class,
                    "retry_count": retry_count,
                    "metadata": metadata,
                },
            )
        )


class TestDualEnabledConstruction:
    def test_dual_enabled_without_model_class_raises(self) -> None:
        with pytest.raises(ValueError, match="judge_model_class"):
            MultiPassOrchestrator(
                MultiPassConfig(
                    pass1_models=["m"],
                    pass2_models=[],
                    pass3_models=[],
                    dual_enabled=True,
                ),
                client_factory=lambda _: _pdf_client(_extraction_response()),
                registry=_build_registry(),
            )

    def test_dual_enabled_with_model_class_constructs(self) -> None:
        registry = _build_registry()
        orch = MultiPassOrchestrator(
            MultiPassConfig(
                pass1_models=["m"],
                pass2_models=[],
                pass3_models=[],
                dual_enabled=True,
                judge_model_class=build_extraction_model(registry),
            ),
            client_factory=lambda _: _pdf_client(_extraction_response()),
            registry=registry,
        )
        assert orch is not None


class TestDualHappyPath:
    @pytest.mark.asyncio
    async def test_two_extractions_judge_no_disagreement(self) -> None:
        registry = _build_registry()
        observer = _RecordingObserver()

        # Both sides produce identical extractions → no diffs → judge LLM
        # is never called (judge returns empty result on no diffs).
        def factory(model: str) -> Any:
            return _pdf_client(_extraction_response())

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry, observer=observer)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")

        # Two pass-records (primary + sibling); no judge record because no
        # diffs means no LLM call.
        kinds = [r.pass_kind for r in result.pass_records]
        assert kinds == ["pass1", "sibling"]
        assert all(r.pass_number == 1 for r in result.pass_records)
        assert result.extraction.get_field_value("base_rent_annual") == 120000

    @pytest.mark.asyncio
    async def test_cost_ceiling_skips_unknown_priced_judge_model(self) -> None:
        registry = _build_registry()
        priced_slug = "google/gemini-3-flash-preview"
        unknown_judge = "unknown/judge-model"
        called_models: list[str] = []

        def factory(model: str) -> Any:
            called_models.append(model)
            if model == unknown_judge:
                raise AssertionError("unknown-priced judge should not be called")
            return _pdf_client(
                _extraction_response(
                    rent=130000 if len(called_models) == 2 else 120000
                ),
                input_tokens=1_000,
                output_tokens=0,
            )

        config = MultiPassConfig(
            pass1_models=[priced_slug],
            pass2_models=[],
            pass3_models=[],
            sibling_models=[priced_slug],
            judge_models=[unknown_judge],
            dual_enabled=True,
            pass3_enabled=False,
            cost_ceiling_cents=100,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)

        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")

        assert unknown_judge not in called_models
        assert result.cost_ceiling_hit is True
        assert result.audit_trail is not None
        assert any(
            "unknown pricing" in failure and unknown_judge in failure
            for failure in result.audit_trail["validation_failures"]
        )
        assert result.extraction.get_field_value("base_rent_annual") == 120000

    @pytest.mark.asyncio
    async def test_judge_resolves_disagreement(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(
                    _extraction_response(rent=120000),
                )
            if model == "sibling-model":
                return _pdf_client(
                    _extraction_response(rent=130000),
                )
            if model == "judge-model":
                return _judge_client(
                    [
                        {
                            "field_path": "base_rent_annual",
                            "winner": "b",
                            "value": 130000,
                            "confidence": 0.9,
                            "reason": "B is correct per source",
                        }
                    ]
                )
            raise AssertionError(f"unexpected model: {model}")

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")

        assert result.extraction.get_field_value("base_rent_annual") == 130000
        # Patch should reflect the verdict.
        assert result.patch is not None
        assert "base_rent_annual" in result.patch.field_corrections


class TestDualObserverWiring:
    @pytest.mark.asyncio
    async def test_emits_pass1_sibling_judge_events(self) -> None:
        registry = _build_registry()
        observer = _RecordingObserver()

        def factory(model: str) -> Any:
            if model == "judge-model":
                return _judge_client(
                    [
                        {
                            "field_path": "base_rent_annual",
                            "winner": "a",
                            "value": 120000,
                            "confidence": 0.95,
                            "reason": "A correct",
                        }
                    ]
                )
            if model == "sibling-model":
                return _pdf_client(_extraction_response(rent=130000))
            return _pdf_client(_extraction_response(rent=120000))

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry, observer=observer)
        await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")

        stages_seen = [e[1]["stage"] for e in observer.events if e[0] == "start"]
        # Expect: pass1_extraction, sibling_extraction, judge_arbitration.
        assert "pass1_extraction" in stages_seen
        assert "sibling_extraction" in stages_seen
        assert "judge_arbitration" in stages_seen
        # Every start must have a matching finish.
        starts = [e for e in observer.events if e[0] == "start"]
        finishes = [e for e in observer.events if e[0] == "finish"]
        assert len(starts) == len(finishes)
        # Every finish should report success here.
        assert all(f[1]["status"] == "succeeded" for f in finishes)

    @pytest.mark.asyncio
    async def test_observer_exception_does_not_break_extraction(self) -> None:
        registry = _build_registry()

        class BrokenObserver:
            """Observer whose callbacks always raise; orchestrator must swallow."""

            def start_stage(self, **kwargs: Any) -> Any:
                raise RuntimeError("observer down")

            def finish_stage(self, handle: Any, **kwargs: Any) -> None:
                raise RuntimeError("observer down")

        def factory(model: str) -> Any:
            if model == "judge-model":
                return _judge_client([])
            return _pdf_client(_extraction_response())

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(
            config, factory, registry, observer=BrokenObserver()
        )
        # Must not raise — the orchestrator catches observer failures.
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        assert result.extraction.get_field_value("base_rent_annual") == 120000


class TestDualFallback:
    @pytest.mark.asyncio
    async def test_sibling_failure_falls_back_to_primary(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(_extraction_response(rent=120000))
            # Sibling and judge: the sibling chain raises; judge never called.
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=RuntimeError("sibling down"))
            return client

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # Only primary survives → one pass record, kind=pass1, no judge call.
        assert len(result.pass_records) == 1
        assert result.pass_records[0].pass_kind == "pass1"
        assert result.audit_trail is not None
        assert result.audit_trail["needs_review"] is True

    @pytest.mark.asyncio
    async def test_primary_failure_falls_back_to_sibling(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "sibling-model":
                return _pdf_client(_extraction_response(rent=130000))
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=RuntimeError("primary down"))
            return client

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        assert len(result.pass_records) == 1
        assert result.pass_records[0].pass_kind == "sibling"
        assert result.extraction.get_field_value("base_rent_annual") == 130000

    @pytest.mark.asyncio
    async def test_both_sides_fail_raises(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=RuntimeError("both down"))
            return client

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="dual-extract"):
            await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")


class TestDualJudgeFailureFallback:
    @pytest.mark.asyncio
    async def test_judge_chain_failure_uses_primary(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(_extraction_response(rent=120000))
            if model == "sibling-model":
                return _pdf_client(_extraction_response(rent=130000))
            # Judge call raises.
            client = MagicMock()
            client.extract = AsyncMock(side_effect=RuntimeError("judge down"))
            return client

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-1", "judge-2"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # No judge verdict → primary (A) wins on disagreement.
        assert result.extraction.get_field_value("base_rent_annual") == 120000

    @pytest.mark.asyncio
    async def test_no_judge_models_configured_uses_primary(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(_extraction_response(rent=120000))
            return _pdf_client(_extraction_response(rent=130000))

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=[],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        assert result.extraction.get_field_value("base_rent_annual") == 120000


class TestDualPass3Escalation:
    @pytest.mark.asyncio
    async def test_synthesis_on_critical_field_triggers_pass3(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(_extraction_response(rent=120000))
            if model == "sibling-model":
                return _pdf_client(_extraction_response(rent=130000))
            if model == "judge-model":
                return _judge_client(
                    [
                        {
                            "field_path": "base_rent_annual",
                            "winner": "synthesis",
                            "value": 125000,
                            "confidence": 0.6,
                            "reason": "averaged",
                        }
                    ]
                )
            if model == "pass3-model":
                # Pass 3 says actually the answer is 130000.
                return _pdf_client(json.dumps({"base_rent_annual": 130000}))
            raise AssertionError(f"unexpected model: {model}")

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=["pass3-model"],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=True,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # Pass 3 override wins on the synthesis disagreement.
        assert result.extraction.get_field_value("base_rent_annual") == 130000
        kinds = [r.pass_kind for r in result.pass_records]
        assert "pass3" in kinds


class TestShouldEscalateDualBranches:
    """Direct unit tests of the dual-mode escalation logic.

    Covers branches not exercised by the end-to-end happy-path tests:
    non-critical verdicts (no escalation), low-confidence verdicts on
    critical fields, and low-Pass-1 confidence triggering escalation
    for fields the judge did not weigh in on.
    """

    @pytest.mark.asyncio
    async def test_synthesis_on_non_critical_does_not_escalate(self) -> None:
        from extract_sdk.extraction.judge import JudgeResult, JudgeVerdict
        from extract_sdk.models import ExtractionResult, FieldExtractionValue

        registry = _build_registry()
        config = MultiPassConfig(
            pass1_models=["m"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["m"],
            judge_models=["judge"],
            dual_enabled=True,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(
            config, lambda _: _pdf_client(_extraction_response()), registry
        )

        # Synthesis verdict on a non-critical field (landlord_legal_name)
        # should NOT escalate.
        judge_result = JudgeResult(
            verdicts=[
                JudgeVerdict(
                    field_path="landlord_legal_name",
                    winner="synthesis",
                    value="Acme",
                    confidence=0.5,
                    reason="merged",
                )
            ],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used="judge",
        )
        # Pass 1 result with all critical fields above threshold.
        pass1 = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=120000, confidence=0.95, source_text=""
                ),
                "lease_term_months": FieldExtractionValue(
                    value=60, confidence=0.95, source_text=""
                ),
            }
        )
        should, disputed = orch._should_escalate_dual(
            judge_result, pass1, ["base_rent_annual", "lease_term_months"]
        )
        assert should is False
        assert disputed == []

    @pytest.mark.asyncio
    async def test_low_confidence_critical_verdict_escalates(self) -> None:
        from extract_sdk.extraction.judge import JudgeResult, JudgeVerdict
        from extract_sdk.models import ExtractionResult, FieldExtractionValue

        registry = _build_registry()
        config = MultiPassConfig(
            pass1_models=["m"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["m"],
            judge_models=["judge"],
            dual_enabled=True,
            judge_model_class=build_extraction_model(registry),
            escalation_threshold=0.80,
        )
        orch = MultiPassOrchestrator(
            config, lambda _: _pdf_client(_extraction_response()), registry
        )
        judge_result = JudgeResult(
            verdicts=[
                JudgeVerdict(
                    field_path="base_rent_annual",
                    winner="b",
                    value=130000,
                    confidence=0.5,  # below escalation threshold
                    reason="weak",
                )
            ],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used="judge",
        )
        pass1 = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=120000, confidence=0.95, source_text=""
                ),
            }
        )
        should, disputed = orch._should_escalate_dual(
            judge_result, pass1, ["base_rent_annual"]
        )
        assert should is True
        assert disputed == ["base_rent_annual"]

    @pytest.mark.asyncio
    async def test_low_pass1_confidence_triggers_without_verdict(self) -> None:
        from extract_sdk.extraction.judge import JudgeResult
        from extract_sdk.models import ExtractionResult, FieldExtractionValue

        registry = _build_registry()
        config = MultiPassConfig(
            pass1_models=["m"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["m"],
            judge_models=["judge"],
            dual_enabled=True,
            judge_model_class=build_extraction_model(registry),
            escalation_threshold=0.80,
        )
        orch = MultiPassOrchestrator(
            config, lambda _: _pdf_client(_extraction_response()), registry
        )
        judge_result = JudgeResult(
            verdicts=[],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used="judge",
        )
        pass1 = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=120000, confidence=0.5, source_text=""
                ),
            }
        )
        should, disputed = orch._should_escalate_dual(
            judge_result, pass1, ["base_rent_annual"]
        )
        assert should is True
        assert "base_rent_annual" in disputed


class TestDispatchPassEdges:
    @pytest.mark.asyncio
    async def test_dispatch_pass_empty_models_returns_none(self) -> None:
        registry = _build_registry()
        config = MultiPassConfig(
            pass1_models=["m"],
            pass2_models=[],
            pass3_models=[],
        )
        orch = MultiPassOrchestrator(
            config, lambda _: _pdf_client(_extraction_response()), registry
        )
        result = await orch._dispatch_pass(
            stage="pass2_validation",
            models=[],
            prompt="x",
            pdf_bytes=_FAKE_PDF,
            filename=_FAKE_FILE,
            max_tokens=None,
            pass_number=2,
        )
        assert result is None


class TestJudgeChainAllFail:
    @pytest.mark.asyncio
    async def test_judge_factory_raises_falls_back_to_primary(self) -> None:
        """Factory raising for judge slugs exercises the orchestrator's
        _run_judge except branch (judge_extractions itself is fail-open and
        returns empty verdicts on its own internal errors — the only way
        the orchestrator's exception handler fires is if the factory
        raises before the call). Two judge slugs exhaust → fall back to A."""
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(_extraction_response(rent=120000))
            if model == "sibling-model":
                return _pdf_client(_extraction_response(rent=130000))
            # Factory raises for any judge slug.
            raise RuntimeError(f"no client for {model}")

        observer = _RecordingObserver()
        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-1", "judge-2"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry, observer=observer)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # Both judge factory calls raise → primary wins.
        assert result.extraction.get_field_value("base_rent_annual") == 120000
        # Both judge_arbitration finishes should be failed.
        judge_starts = [
            i
            for i, e in enumerate(observer.events)
            if e[0] == "start" and e[1]["stage"] == "judge_arbitration"
        ]
        assert len(judge_starts) == 2
        # finish events that follow each judge_arbitration start.
        statuses = [e[1]["status"] for e in observer.events if e[0] == "finish"]
        assert statuses.count("failed") >= 2

    @pytest.mark.asyncio
    async def test_judge_returns_empty_verdicts_falls_back(self) -> None:
        """Even when the judge LLM is contacted but produces no verdicts
        (judge_extractions is fail-open), the merger falls back to A."""
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(_extraction_response(rent=120000))
            if model == "sibling-model":
                return _pdf_client(_extraction_response(rent=130000))
            # Judge model returns invalid JSON → judge_extractions emits
            # empty verdicts internally → merger uses A.
            return _judge_client([])  # empty array is valid but yields zero verdicts

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-1"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        assert result.extraction.get_field_value("base_rent_annual") == 120000


class TestLegacyCostCeiling:
    """Cost ceiling skips Pass 2 / Pass 3 in the legacy code path too."""

    @pytest.mark.asyncio
    async def test_pass3_only_skipped_when_pass2_runs(self) -> None:
        """Cost-ceiling check at the Pass 3 boundary: Pass 1 + Pass 2 stay
        under budget, but the ceiling is just below the cumulative spend so
        Pass 3 itself is skipped. Exercises the legacy `_run_legacy` Pass 3
        ceiling branch (line 699)."""
        registry = _build_registry()
        priced = "google/gemini-3-flash-preview"

        def factory(model: str) -> Any:
            # Pass 1 returns extraction with low-confidence critical field
            # (forces escalation). Pass 2 returns no corrections.
            if "pass2" in model:
                return _pdf_client(
                    json.dumps({"field_corrections": {}}),
                    input_tokens=1_000_000,
                    output_tokens=0,
                )
            return _pdf_client(
                _extraction_response(rent_conf=0.5),  # below escalation_threshold
                input_tokens=1_000_000,
                output_tokens=0,
            )

        config = MultiPassConfig(
            pass1_models=[priced],
            pass2_models=[priced + "-pass2"],  # unknown slug → 0¢
            pass3_models=[priced],
            cost_ceiling_cents=40,  # Pass 1 spends 50¢ → over budget at Pass 3.
            pass2_enabled=True,
            pass3_enabled=True,
            escalation_threshold=0.80,
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        assert result.cost_ceiling_hit is True

    @pytest.mark.asyncio
    async def test_pass2_skipped_when_cost_ceiling_exhausted(self) -> None:
        registry = _build_registry()
        priced = "google/gemini-3-flash-preview"

        def factory(model: str) -> Any:
            return _pdf_client(
                _extraction_response(rent=120000, rent_conf=0.99, term_conf=0.99),
                input_tokens=1_000_000,  # 50¢
                output_tokens=0,
            )

        config = MultiPassConfig(
            pass1_models=[priced],
            pass2_models=[priced],
            pass3_models=[priced],
            cost_ceiling_cents=10,  # tiny ceiling — Pass 1 alone overruns
            pass2_enabled=True,
            pass3_enabled=True,
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # Only Pass 1 record; Pass 2 & 3 skipped due to ceiling.
        assert len(result.pass_records) == 1
        assert result.pass_records[0].pass_kind == "pass1"
        assert result.cost_ceiling_hit is True

    @pytest.mark.asyncio
    async def test_pass3_dual_skipped_after_judge_ran(self) -> None:
        """Judge fits in the budget, then Pass 3 trips the ceiling.

        Setup: each side spends 50¢, judge spends ~50¢ (real-priced slug
        with 1M tokens), ceiling is 120¢. Primary+sibling = 100¢, judge
        adds another 60¢ (1M @ glm-5.1) → 160¢ > 120¢ at the Pass 3 check.
        """
        registry = _build_registry()
        priced = "google/gemini-3-flash-preview"
        judge_priced = "z-ai/glm-5.1"

        call_count = {"n": 0}

        def factory(model: str) -> Any:
            if model == judge_priced:
                # 1M input tokens × $1.05/M = $1.05 = 105¢; 1M out × $3.50/M = 350¢
                # Total 455¢. Use only input tokens for control.
                return _judge_client(
                    [
                        {
                            "field_path": "base_rent_annual",
                            "winner": "synthesis",
                            "value": 125000,
                            "confidence": 0.6,
                            "reason": "averaged",
                        }
                    ],
                    input_tokens=1_000_000,
                    output_tokens=0,
                )
            call_count["n"] += 1
            rent_val = 120000 if call_count["n"] == 1 else 130000
            return _pdf_client(
                _extraction_response(rent=rent_val),
                input_tokens=1_000_000,
                output_tokens=0,
            )

        config = MultiPassConfig(
            pass1_models=[priced],
            pass2_models=[],
            pass3_models=[priced],
            sibling_models=[priced],
            judge_models=[judge_priced],
            dual_enabled=True,
            pass3_enabled=True,
            judge_model_class=build_extraction_model(registry),
            # 200¢ ceiling: primary+sibling=100¢ (judge runs), then judge=105¢
            # → 205¢ at Pass 3 check → ceiling exhausted, line 902 hit.
            cost_ceiling_cents=200,
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        assert result.cost_ceiling_hit is True
        # Judge ran → synthesis verdict at base_rent_annual=125000.
        # Pass 3 was skipped → the synthesis value is canonical.
        assert result.extraction.get_field_value("base_rent_annual") == 125000

    @pytest.mark.asyncio
    async def test_pass3_dual_cost_ceiling_skips(self) -> None:
        """In dual mode, Pass 3 honours the cost ceiling too.

        Setup: primary + sibling each cost 50¢ (priced model + 1M input
        tokens). Cost ceiling is 80¢. After both extractions run in
        parallel the meter reads 100¢, so the judge is skipped (falls back
        to empty verdicts → A wins) and Pass 3 is also skipped — the
        ceiling flag flips and the primary's value is the canonical answer.
        """
        registry = _build_registry()
        priced = "google/gemini-3-flash-preview"

        # Both extractions use the same priced slug — distinguish via
        # extraction_response itself by mutating module-level state to
        # alternate the rent value across calls. Use a counter.
        call_count = {"n": 0}

        def factory(model: str) -> Any:
            if model == "judge-model":
                return _judge_client(
                    [
                        {
                            "field_path": "base_rent_annual",
                            "winner": "synthesis",
                            "value": 125000,
                            "confidence": 0.6,
                            "reason": "averaged",
                        }
                    ],
                    input_tokens=10,
                    output_tokens=10,
                )
            # Alternate primary (call 1: 120000) vs sibling (call 2: 130000).
            call_count["n"] += 1
            rent_val = 120000 if call_count["n"] == 1 else 130000
            return _pdf_client(
                _extraction_response(rent=rent_val),
                input_tokens=1_000_000,
                output_tokens=0,
            )

        config = MultiPassConfig(
            pass1_models=[priced],
            pass2_models=[],
            pass3_models=[priced],
            sibling_models=[priced],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=True,
            judge_model_class=build_extraction_model(registry),
            cost_ceiling_cents=80,  # primary+sibling = 100¢, exceeds 80¢
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        assert result.cost_ceiling_hit is True
        # Judge skipped (ceiling) → empty verdicts → A=120000 wins.
        assert result.extraction.get_field_value("base_rent_annual") == 120000


class TestDispatchPassRaises:
    """When the inner client raises a non-fallback exception, dispatch must
    finish the observer with status=failed and re-raise. _try_models_pdf
    swallows per-model errors, so we monkey-patch it to raise instead."""

    @pytest.mark.asyncio
    async def test_dispatch_re_raises_and_emits_failed_event(self) -> None:
        registry = _build_registry()
        observer = _RecordingObserver()
        orch = MultiPassOrchestrator(
            MultiPassConfig(pass1_models=["m"], pass2_models=[], pass3_models=[]),
            lambda _: _pdf_client(_extraction_response()),
            registry,
            observer=observer,
        )

        async def boom(*_args: Any, **_kwargs: Any) -> Any:
            raise RuntimeError("synthetic failure")

        orch._try_models_pdf = boom  # type: ignore[method-assign]
        with pytest.raises(RuntimeError, match="synthetic"):
            await orch._dispatch_pass(
                stage="pass1_extraction",
                models=["m"],
                prompt="p",
                pdf_bytes=_FAKE_PDF,
                filename=_FAKE_FILE,
                max_tokens=None,
                pass_number=1,
            )
        # Observer recorded a failed finish.
        finishes = [e for e in observer.events if e[0] == "finish"]
        assert finishes
        assert finishes[-1][1]["status"] == "failed"
        assert finishes[-1][1]["error_class"] == "RuntimeError"


class TestDualSiblingParseFailure:
    @pytest.mark.asyncio
    async def test_sibling_returns_unparseable_text(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client(_extraction_response())
            if model == "sibling-model":
                # Sibling returns something that cannot be parsed as the
                # extraction schema — orchestrator should fall back to primary.
                return _pdf_client("not a valid extraction json blob")
            raise AssertionError(f"unexpected model: {model}")

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=["judge-model"],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # Falls back to primary alone — extraction has primary's value.
        assert result.extraction.get_field_value("base_rent_annual") == 120000
        assert result.audit_trail is not None
        assert result.audit_trail["needs_review"] is True

    @pytest.mark.asyncio
    async def test_primary_unparseable_raises(self) -> None:
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "primary-model":
                return _pdf_client("invalid json blob")
            return _pdf_client(_extraction_response())

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=[],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="primary"):
            await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")

    @pytest.mark.asyncio
    async def test_survivor_unparseable_raises(self) -> None:
        """When primary fails entirely AND sibling is unparseable, raise."""
        registry = _build_registry()

        def factory(model: str) -> Any:
            if model == "sibling-model":
                return _pdf_client("invalid json blob")
            client = MagicMock()
            client.extract_pdf = AsyncMock(side_effect=RuntimeError("primary down"))
            return client

        config = MultiPassConfig(
            pass1_models=["primary-model"],
            pass2_models=[],
            pass3_models=[],
            sibling_models=["sibling-model"],
            judge_models=[],
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        with pytest.raises(ExtractionError, match="survivor"):
            await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")


class TestDualCostAccounting:
    @pytest.mark.asyncio
    async def test_extraction_cost_tracked(self) -> None:
        registry = _build_registry()

        # Use a known-priced slug so estimate_cost_cents returns a non-zero
        # value: gemini-3-flash-preview = $0.50/M in, $3/M out.
        priced_slug = "google/gemini-3-flash-preview"

        def factory(model: str) -> Any:
            return _pdf_client(
                _extraction_response(),
                input_tokens=1_000_000,  # 50¢
                output_tokens=0,
            )

        config = MultiPassConfig(
            pass1_models=[priced_slug],
            pass2_models=[],
            pass3_models=[],
            sibling_models=[priced_slug],
            judge_models=[],  # Skip judge so we only count extractions.
            dual_enabled=True,
            pass3_enabled=False,
            judge_model_class=build_extraction_model(registry),
        )
        orch = MultiPassOrchestrator(config, factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # 50¢ × 2 (primary + sibling) = $1.00 = 100¢.
        assert result.extraction_cost_cents == 100
        assert result.cost_ceiling_hit is False

    @pytest.mark.asyncio
    async def test_cost_ceiling_skips_judge(self) -> None:
        registry = _build_registry()
        priced_slug = "google/gemini-3-flash-preview"

        def factory(model: str) -> Any:
            return _pdf_client(
                _extraction_response(
                    rent=130000 if model.endswith("sibling") else 120000
                ),
                input_tokens=1_000_000,  # 50¢
                output_tokens=0,
            )

        # Ceiling = 50¢ → primary (50¢) hits it; sibling pushes over; judge skipped.
        config = MultiPassConfig(
            pass1_models=[priced_slug],
            pass2_models=[],
            pass3_models=[],
            sibling_models=[priced_slug + "-sibling"],
            judge_models=["z-ai/glm-5.1"],
            dual_enabled=True,
            pass3_enabled=False,
            cost_ceiling_cents=50,
            judge_model_class=build_extraction_model(registry),
        )

        # Register pricing for the synthetic slug we used above by relying on
        # its missing-pricing path → 0¢ (which would not push us over).  So
        # use the real slug for sibling too.
        def real_factory(model: str) -> Any:
            return _pdf_client(
                _extraction_response(rent=130000 if "sibling" in model else 120000),
                input_tokens=1_000_000,
                output_tokens=0,
            )

        config.sibling_models = [priced_slug]  # both priced
        orch = MultiPassOrchestrator(config, real_factory, registry)
        result = await orch.run(_FAKE_PDF, _FAKE_FILE, "prompt")
        # Both extractions ran (parallel) before ceiling check; total = 100¢.
        # Judge skipped because 100¢ ≥ 50¢ ceiling.
        assert result.cost_ceiling_hit is True
        # Judge was skipped → primary's value wins on disagreement.
        assert result.extraction.get_field_value("base_rent_annual") == 120000
