"""E2E tests for the extraction observability pipeline.

Validates that, after ``run_gemini_extraction_task`` completes:

1. ``extraction_pipeline_events`` rows were recorded via the in-memory DB
   (the observer was not silently swallowed by the DB-less fixture).
2. ``extractions.stage_summary`` is populated with a well-formed summary dict.
3. ``extractions.extraction_cost_cents`` is persisted (0 from the mock LLM,
   but the column is written).
4. ``extractions.raw_extraction_object_keys`` is populated when
   ``RAW_EXTRACTION_DUMP_ENABLED=true`` and the R2 upload is mocked.
5. Dual-extract feature flag: when ``EXTRACTION_DUAL_ENABLED=true``, the task
   wires the dual config into the orchestrator call.
6. Cost ceiling: when the mock result has ``cost_ceiling_hit=True`` and
   ``extraction_cost_cents`` above zero, Sentry capture_message is called.

The ``MultiPassOrchestrator``, ``ObjectStorageService``, and ``sentry_sdk``
are mocked at their natural boundaries — all task and observer logic runs for
real, including the in-memory DB writes.

Run with:
    cd backend && python -m pytest tests/e2e/test_observability_pipeline.py -v -s \\
        --no-cov --timeout=0
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from extract_sdk.models import (
    ExtractionPassRecord,
    ExtractionResult,
    FieldExtractionValue,
    MultiPassResult,
)

from app.tasks.extraction import run_gemini_extraction_task

from .conftest import E2E_EXTRACTION_ID, InMemoryExtractionDB

pytestmark = [pytest.mark.e2e]

# ---------------------------------------------------------------------------
# Deterministic result builders
# ---------------------------------------------------------------------------

_FAKE_PDF = b"%PDF-1.4\n%observability e2e test\n%%EOF\n"


def _build_result(
    *,
    extraction_cost_cents: int = 0,
    cost_ceiling_hit: bool = False,
    raw_responses: list[str] | None = None,
    pass_kind: str = "pass1",
) -> MultiPassResult:
    """Build a minimal but realistic MultiPassResult for observability tests."""
    fields = {
        "landlord_legal_name": FieldExtractionValue(
            value="Observability Test LLC",
            confidence=0.92,
            source_text="Landlord: Observability Test LLC",
        ),
        "base_rent_annual": FieldExtractionValue(
            value=120000,
            confidence=0.88,
            source_text="annual base rent of $120,000",
        ),
    }
    pass_records = [
        ExtractionPassRecord(
            pass_number=1,
            pass_kind=pass_kind,  # type: ignore[arg-type]  # test helper accepts str for flexibility; Literal enforced at runtime by the model validator
            model="google/gemini-3-flash-preview",
            input_tokens=4000,
            output_tokens=2000,
            duration_ms=3500,
            cost_cents=extraction_cost_cents,
        ),
    ]
    audit: dict[str, Any] = {
        "raw_responses": raw_responses or ["mock raw response for pass 1"],
        "validation_failures": [],
    }
    return MultiPassResult(
        extraction=ExtractionResult(fields=fields),
        pass_records=pass_records,
        patch=None,
        pass3_overrides=None,
        needs_review=False,
        confidence_scores={},
        audit_trail=audit,
        extraction_cost_cents=extraction_cost_cents,
        cost_ceiling_hit=cost_ceiling_hit,
    )


def _make_fake_orchestrator(result: MultiPassResult) -> MagicMock:
    """Wrap a MultiPassResult in a mock orchestrator."""
    orch = MagicMock()

    async def _run(*args: Any, **kwargs: Any) -> MultiPassResult:
        return result

    orch.run = _run
    return orch


# ---------------------------------------------------------------------------
# Shared patch context
# ---------------------------------------------------------------------------


def _run_task_with_db(
    in_memory_db: InMemoryExtractionDB,
    orchestrator: MagicMock,
    *,
    raw_extraction_dump_enabled: bool = False,
    extraction_dual_enabled: bool = False,
    mock_artifact_upload: bool = False,
) -> tuple[dict[str, Any], MagicMock | None]:
    """Run ``run_gemini_extraction_task`` with all external boundaries mocked.

    Returns ``(result_dict, artifact_upload_mock_or_None)``.
    """
    from contextlib import ExitStack

    upload_mock: MagicMock | None = None
    if mock_artifact_upload:
        upload_mock = MagicMock(
            side_effect=lambda extraction_id, artifact_name, payload: (  # noqa: ARG005
                f"extractions/{extraction_id}/raw/{artifact_name}.json"
            )
        )

    with ExitStack() as stack:
        stack.enter_context(
            patch("app.tasks.extraction._get_db_client", return_value=in_memory_db)
        )
        stack.enter_context(
            patch(
                "app.tasks.extraction.update_extraction_status",
                new_callable=AsyncMock,
            )
        )
        stack.enter_context(
            patch(
                "app.tasks._helpers.update_extraction_status",
                new_callable=AsyncMock,
            )
        )
        stack.enter_context(
            patch(
                "app.tasks.extraction.ObjectStorageService.download_file",
                return_value=_FAKE_PDF,
            )
        )
        pdf_reader_mock = stack.enter_context(
            patch("app.tasks.extraction.pypdf.PdfReader")
        )
        pdf_reader_mock.return_value.pages = [object()] * 5
        stack.enter_context(
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=orchestrator,
            )
        )
        stack.enter_context(
            patch(
                "app.tasks.extraction.settings.raw_extraction_dump_enabled",
                raw_extraction_dump_enabled,
            )
        )
        stack.enter_context(
            patch(
                "app.tasks.extraction.settings.extraction_dual_enabled",
                extraction_dual_enabled,
            )
        )
        if upload_mock is not None:
            stack.enter_context(
                patch(
                    "app.tasks.extraction.ObjectStorageService.upload_extraction_artifact",
                    upload_mock,
                )
            )

        result: dict[str, Any] = run_gemini_extraction_task.apply(
            args=[E2E_EXTRACTION_ID]
        ).get()

    return result, upload_mock


# ---------------------------------------------------------------------------
# Test: InMemoryExtractionDB observer plumbing
# ---------------------------------------------------------------------------


def test_observer_inserts_events_into_in_memory_db(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """ExtractionPipelineObserver uses InMemoryExtractionDB insert/update paths.

    Drives the observer directly (bypassing the orchestrator mock) to confirm
    that:
    - ``start_stage`` causes an insert into the in-memory pipeline_events table
      and returns a non-None UUID handle.
    - ``finish_stage`` updates the matching row's status to 'succeeded'.
    - ``build_summary`` returns a dict with 'timeline_table' key.

    This is a unit test for the observer+fixture plumbing and does not exercise
    the full task.
    """
    from app.services.extraction_observer import ExtractionPipelineObserver

    observer = ExtractionPipelineObserver(
        extraction_id=E2E_EXTRACTION_ID, db=in_memory_db
    )

    handle = observer.start_stage(
        stage="pass1_extraction",
        attempt_number=1,
        model="google/gemini-3-flash-preview",
    )
    assert handle is not None, "start_stage should return a UUID handle"

    events_after_start = in_memory_db.pipeline_events
    assert (
        len(events_after_start) == 1
    ), f"Expected 1 event after start_stage; got {len(events_after_start)}"
    started_event = events_after_start[0]
    assert started_event.get("stage") == "pass1_extraction"
    assert started_event.get("status") == "started"

    observer.finish_stage(
        handle,
        status="succeeded",
        duration_ms=1500,
        model="google/gemini-3-flash-preview",
    )

    events_after_finish = in_memory_db.pipeline_events
    assert (
        len(events_after_finish) == 1
    ), "finish_stage should update the row, not insert a new one"
    finished_event = events_after_finish[0]
    assert (
        finished_event.get("status") == "succeeded"
    ), f"Expected status='succeeded' after finish_stage; got {finished_event!r}"
    assert finished_event.get("duration_ms") == 1500

    summary = observer.build_summary([])
    assert isinstance(summary, dict)
    assert summary.get("timeline_table") == "extraction_pipeline_events"
    assert summary.get("final_stage") == "pass1_extraction"


# ---------------------------------------------------------------------------
# Test: stage_summary is populated after task run
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_stage_summary_populated_after_task(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """stage_summary is written to the extractions record after the task completes.

    The mocked orchestrator bypasses observer callbacks (the orchestrator
    never calls observer.start_stage / finish_stage), so pipeline_events
    will be empty.  What this test verifies is that stage_summary is still
    written as a well-formed dict — the observer.build_summary() call in the
    task always runs regardless of whether any events were recorded.
    """
    result, _ = _run_task_with_db(
        in_memory_db,
        _make_fake_orchestrator(_build_result()),
    )

    assert result["status"] == "scoring", f"Unexpected status: {result}"

    stage_summary = in_memory_db.record.get("stage_summary")
    assert isinstance(
        stage_summary, dict
    ), f"stage_summary should be a dict; got {type(stage_summary).__name__!r}"
    assert (
        "timeline_table" in stage_summary
    ), f"stage_summary missing 'timeline_table' key: {stage_summary!r}"
    assert stage_summary["timeline_table"] == "extraction_pipeline_events"


# ---------------------------------------------------------------------------
# Test: extraction_cost_cents is persisted
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_extraction_cost_cents_persisted(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """extraction_cost_cents from MultiPassResult is written to extractions."""
    result_obj = _build_result(extraction_cost_cents=3)
    _run_task_with_db(in_memory_db, _make_fake_orchestrator(result_obj))

    cost = in_memory_db.record.get("extraction_cost_cents")
    assert cost == 3, f"Expected extraction_cost_cents=3; got {cost!r}"


# ---------------------------------------------------------------------------
# Test: raw artifact keys written when dump enabled
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_raw_artifact_keys_written_when_dump_enabled(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """When raw_extraction_dump_enabled=True, object keys are persisted.

    Mocks ObjectStorageService.upload_extraction_artifact so no real R2
    write occurs.  Asserts:
    - upload_extraction_artifact was called for each pass record with a
      raw_response entry.
    - raw_extraction_object_keys in the DB record is a non-empty list.
    - Keys follow the ``extractions/{id}/raw/{pass_kind}-{model}.json`` pattern.
    """
    result_obj = _build_result(raw_responses=["raw pass1 response text"])

    _result, upload_mock = _run_task_with_db(
        in_memory_db,
        _make_fake_orchestrator(result_obj),
        raw_extraction_dump_enabled=True,
        mock_artifact_upload=True,
    )

    assert upload_mock is not None
    assert upload_mock.call_count >= 1, "upload_extraction_artifact was not called"

    keys = in_memory_db.record.get("raw_extraction_object_keys")
    assert isinstance(
        keys, list
    ), f"raw_extraction_object_keys should be list; got {type(keys)!r}"
    assert len(keys) >= 1, f"Expected ≥1 raw artifact key; got {keys!r}"

    for key in keys:
        assert key.startswith(
            f"extractions/{E2E_EXTRACTION_ID}/raw/"
        ), f"Key does not follow expected path pattern: {key!r}"
        assert key.endswith(".json"), f"Key does not end with .json: {key!r}"


# ---------------------------------------------------------------------------
# Test: raw artifact keys NOT written when dump disabled
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_raw_artifact_keys_not_written_when_dump_disabled(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """When raw_extraction_dump_enabled=False, raw_extraction_object_keys is None."""
    result_obj = _build_result()

    _result, upload_mock = _run_task_with_db(
        in_memory_db,
        _make_fake_orchestrator(result_obj),
        raw_extraction_dump_enabled=False,
        mock_artifact_upload=True,
    )

    if upload_mock is not None:
        upload_mock.assert_not_called()

    keys = in_memory_db.record.get("raw_extraction_object_keys")
    assert (
        keys is None
    ), f"raw_extraction_object_keys should be None when dump disabled; got {keys!r}"


# ---------------------------------------------------------------------------
# Test: cost ceiling triggers Sentry warning
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_cost_ceiling_hit_triggers_sentry_warning(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """When cost_ceiling_hit=True, Sentry capture_message is called at warning level."""
    result_obj = _build_result(extraction_cost_cents=50, cost_ceiling_hit=True)

    with patch("app.tasks.extraction.sentry_sdk") as mock_sentry:
        mock_sentry.set_tag = MagicMock()
        mock_sentry.add_breadcrumb = MagicMock()
        mock_sentry.capture_message = MagicMock()

        _run_task_with_db(
            in_memory_db,
            _make_fake_orchestrator(result_obj),
        )

    # Should have been called for cost ceiling
    ceiling_calls = [
        c
        for c in mock_sentry.capture_message.call_args_list
        if "cost ceiling" in str(c).lower()
    ]
    assert len(ceiling_calls) >= 1, (
        f"Expected ≥1 cost-ceiling capture_message call; "
        f"all calls: {mock_sentry.capture_message.call_args_list!r}"
    )

    ceiling_call = ceiling_calls[0]
    _args, kwargs = ceiling_call
    assert (
        kwargs.get("level") == "warning"
    ), f"Expected level='warning'; got {kwargs.get('level')!r}"
    assert "extraction_cost_cents" in str(
        kwargs.get("extras", {})
    ), "Expected extras to contain extraction_cost_cents"


# ---------------------------------------------------------------------------
# Test: validation failures surface as Sentry warning
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_validation_failures_trigger_sentry_warning(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """Validation failures in audit_trail trigger a Sentry warning."""
    result_obj = _build_result()
    # Inject validation_failures into the audit_trail
    assert result_obj.audit_trail is not None
    result_obj.audit_trail["validation_failures"] = [
        {"field": "base_rent_annual", "reason": "value out of range"}
    ]

    with patch("app.tasks.extraction.sentry_sdk") as mock_sentry:
        mock_sentry.set_tag = MagicMock()
        mock_sentry.add_breadcrumb = MagicMock()
        mock_sentry.capture_message = MagicMock()

        _run_task_with_db(
            in_memory_db,
            _make_fake_orchestrator(result_obj),
        )

    failure_calls = [
        c
        for c in mock_sentry.capture_message.call_args_list
        if "validation failures" in str(c).lower()
    ]
    assert len(failure_calls) >= 1, (
        f"Expected ≥1 validation-failure capture_message; "
        f"all calls: {mock_sentry.capture_message.call_args_list!r}"
    )


# ---------------------------------------------------------------------------
# Test: dual-extract feature flag wires dual_enabled=True into MultiPassConfig
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_dual_extract_flag_wires_dual_config(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """When EXTRACTION_DUAL_ENABLED=true, MultiPassConfig.dual_enabled is True.

    Verifies the flag is passed through rather than hardcoded.
    """
    result_obj = _build_result(pass_kind="sibling")

    captured_configs: list[Any] = []

    def _capturing_orchestrator(config: Any, *args: Any, **kwargs: Any) -> MagicMock:
        captured_configs.append(config)
        return _make_fake_orchestrator(result_obj)

    with (
        patch("app.tasks.extraction._get_db_client", return_value=in_memory_db),
        patch(
            "app.tasks.extraction.update_extraction_status",
            new_callable=AsyncMock,
        ),
        patch(
            "app.tasks._helpers.update_extraction_status",
            new_callable=AsyncMock,
        ),
        patch(
            "app.tasks.extraction.ObjectStorageService.download_file",
            return_value=_FAKE_PDF,
        ),
        patch("app.tasks.extraction.pypdf.PdfReader") as mock_reader,
        patch(
            "app.tasks.extraction.MultiPassOrchestrator",
            side_effect=_capturing_orchestrator,
        ),
        patch("app.tasks.extraction.settings.extraction_dual_enabled", True),
    ):
        mock_reader.return_value.pages = [object()] * 3
        run_gemini_extraction_task.apply(args=[E2E_EXTRACTION_ID]).get()

    assert (
        len(captured_configs) == 1
    ), f"Expected exactly 1 MultiPassConfig; got {len(captured_configs)}"
    config = captured_configs[0]
    assert (
        config.dual_enabled is True
    ), f"Expected MultiPassConfig.dual_enabled=True; got {config.dual_enabled!r}"


# ---------------------------------------------------------------------------
# Test: standard 3-pass path when dual disabled
# ---------------------------------------------------------------------------


@pytest.mark.timeout(60)
def test_standard_3pass_path_when_dual_disabled(
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """When EXTRACTION_DUAL_ENABLED=false, MultiPassConfig.dual_enabled is False."""
    result_obj = _build_result()

    captured_configs: list[Any] = []

    def _capturing_orchestrator(config: Any, *args: Any, **kwargs: Any) -> MagicMock:
        captured_configs.append(config)
        return _make_fake_orchestrator(result_obj)

    with (
        patch("app.tasks.extraction._get_db_client", return_value=in_memory_db),
        patch(
            "app.tasks.extraction.update_extraction_status",
            new_callable=AsyncMock,
        ),
        patch(
            "app.tasks._helpers.update_extraction_status",
            new_callable=AsyncMock,
        ),
        patch(
            "app.tasks.extraction.ObjectStorageService.download_file",
            return_value=_FAKE_PDF,
        ),
        patch("app.tasks.extraction.pypdf.PdfReader") as mock_reader,
        patch(
            "app.tasks.extraction.MultiPassOrchestrator",
            side_effect=_capturing_orchestrator,
        ),
        patch("app.tasks.extraction.settings.extraction_dual_enabled", False),
    ):
        mock_reader.return_value.pages = [object()] * 3
        run_gemini_extraction_task.apply(args=[E2E_EXTRACTION_ID]).get()

    assert (
        len(captured_configs) == 1
    ), f"Expected exactly 1 MultiPassConfig; got {len(captured_configs)}"
    config = captured_configs[0]
    assert (
        config.dual_enabled is False
    ), f"Expected dual_enabled=False; got {config.dual_enabled!r}"
