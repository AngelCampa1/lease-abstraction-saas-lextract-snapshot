"""Celery task for PDF-native extraction pipeline.

Downloads the PDF from object storage and runs the multi-pass (or dual-extract
+ judge) adversarial extraction via ``MultiPassOrchestrator``.  Wires:

- ``ExtractionPipelineObserver`` — persists per-stage events to Neon and sets
  Sentry context tags at each stage boundary.
- Raw-extraction R2 dump — uploads each pass's raw model response as
  ``extractions/{id}/raw/{pass_kind}-{model-slug}.json`` (gated by
  ``settings.raw_extraction_dump_enabled``).
- Cost persistence — writes ``extraction_cost_cents`` back to ``extractions``.
- Stage summary — writes a compact ``stage_summary`` jsonb column.
- Sentry fail-open warnings — emits warnings for cost ceiling hits and
  validation failures so silent degradation surfaces in monitoring.
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import re
from typing import Any

import pypdf
import sentry_sdk
from extract_sdk.extraction.domain_knowledge import get_all_domain_knowledge
from extract_sdk.extraction.openrouter_client import OpenRouterClient
from extract_sdk.extraction.orchestrator import MultiPassConfig, MultiPassOrchestrator
from extract_sdk.extraction.prompt_builder import ExtractionPromptBuilder
from extract_sdk.schema.lextract_schema import build_lextract_registry
from extract_sdk.schema.registry import build_extraction_model

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.exceptions import ConflictError
from app.core.status import update_extraction_status
from app.models.enums import ExtractionStatus
from app.services.extraction_observer import ExtractionPipelineObserver
from app.services.object_storage import ObjectStorageService
from app.tasks._helpers import (
    PipelineStoppedError,
    _get_db_client,
    on_pipeline_failure,
    raise_if_pipeline_stopped,
    update_extraction_if_status_matches,
)

logger = logging.getLogger(__name__)

# Characters that are unsafe in object-storage keys or filenames.
_SLUG_RE = re.compile(r"[^a-zA-Z0-9._-]")


def _safe_slug(text: str) -> str:
    """Replace unsafe characters in a model slug with hyphens."""
    return _SLUG_RE.sub("-", text)


def _is_missing_column_error(exc: Exception, column_name: str) -> bool:
    """Return True when a DB error is caused by a missing selected column."""
    exc_str = str(exc).lower()
    return column_name.lower() in exc_str and "column" in exc_str


def _should_retry_task(self: Any) -> bool:
    """Return True when Celery should retry instead of marking failed."""
    current_retries = int(getattr(self.request, "retries", 0) or 0)
    max_retries = int(getattr(self, "max_retries", 0) or 0)
    called_directly = bool(getattr(self.request, "called_directly", False))
    return not called_directly and current_retries < max_retries


def _fetch_document_reference(db: Any, extraction_id: str) -> tuple[str, str]:
    """Fetch the stored document key with a legacy-column fallback.

    During rollout, some environments may still expose ``document_s3_key`` or
    may have rows where only the legacy column is populated. Prefer the new
    column, then retry with the legacy name when needed.
    """
    try:
        response = (
            db.table("extractions")
            .select("document_object_key, document_filename, deleted_at")
            .eq("id", extraction_id)
            .single()
            .execute()
        )
        record = response.data
        if record.get("deleted_at") is not None:
            raise PipelineStoppedError(f"Extraction {extraction_id} was deleted")
        object_key = record.get("document_object_key")
        if object_key:
            filename = record.get("document_filename") or object_key.split("/")[-1]
            return object_key, filename
    except Exception as exc:
        if not _is_missing_column_error(exc, "document_object_key"):
            raise

    legacy_response = (
        db.table("extractions")
        .select("document_s3_key, document_filename, deleted_at")
        .eq("id", extraction_id)
        .single()
        .execute()
    )
    legacy_record = legacy_response.data
    if legacy_record.get("deleted_at") is not None:
        raise PipelineStoppedError(f"Extraction {extraction_id} was deleted")
    object_key = legacy_record.get("document_s3_key")
    if not object_key:
        raise KeyError("document_object_key")
    filename = legacy_record.get("document_filename") or object_key.split("/")[-1]
    return object_key, filename


def _dump_raw_artifacts(
    extraction_id: str,
    pass_records: list[Any],
    raw_responses: list[str],
    object_storage: ObjectStorageService,
) -> list[str]:
    """Upload raw pass responses to R2. Returns list of stored object keys.

    Iterates pass_records and raw_responses in tandem (index-parallel).
    Errors on individual uploads are logged and skipped — a partial dump is
    better than losing the whole extraction result.
    """
    keys: list[str] = []
    for i, (record, raw_text) in enumerate(zip(pass_records, raw_responses)):
        model_slug = getattr(record, "model", None) or f"pass{i + 1}"
        pass_kind = getattr(record, "pass_kind", "pass1")
        artifact_name = f"{pass_kind}-{_safe_slug(model_slug)}"
        payload_dict: dict[str, Any] = {
            "pass_kind": pass_kind,
            "model": model_slug,
            "raw_response": raw_text,
            "pass_number": getattr(record, "pass_number", i + 1),
            "input_tokens": getattr(record, "input_tokens", 0),
            "output_tokens": getattr(record, "output_tokens", 0),
        }
        try:
            key = object_storage.upload_extraction_artifact(
                extraction_id=extraction_id,
                artifact_name=artifact_name,
                payload=json.dumps(payload_dict, ensure_ascii=False).encode(),
            )
            keys.append(key)
        except Exception:
            logger.warning(
                "Failed to upload raw artifact %s for extraction %s",
                artifact_name,
                extraction_id,
                exc_info=True,
            )
    return keys


def _delete_raw_artifacts(
    object_storage: ObjectStorageService,
    object_keys: list[str],
) -> None:
    """Best-effort cleanup for raw artifacts that were not persisted."""
    for object_key in object_keys:
        try:
            object_storage.delete_file(object_key)
        except Exception:
            logger.warning(
                "Failed to delete unpersisted raw artifact %s",
                object_key,
                exc_info=True,
            )


@celery_app.task(
    bind=True,
    name="app.tasks.extraction.run_gemini_extraction_task",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def run_gemini_extraction_task(
    self: Any,
    extraction_id: str,
) -> dict[str, Any]:
    """Download PDF and run the multi-pass extraction pipeline, then persist results.

    1. Reads ``document_object_key`` and ``document_filename`` from DB.
    2. Downloads raw PDF bytes from object storage.
    3. Counts pages with pypdf (persisted for billing/display).
    4. Transitions status UPLOADING -> EXTRACTING.
    5. Builds prompt, ``MultiPassConfig``, and ``ExtractionPipelineObserver``.
    6. Calls orchestrator (3-pass legacy or dual-extract + judge, per config).
    7. Persists extracted_data, extraction_tokens, pass_records,
       pass2_patch, pass3_overrides, document_page_count,
       extraction_cost_cents, stage_summary, and raw_extraction_object_keys.
    8. Emits Sentry warnings for cost ceiling and validation failures.
    9. Transitions status to SCORING.

    Args:
        self: Celery task instance (bound).
        extraction_id: UUID of the extraction record.

    Returns:
        Dict with extraction_id, status, and field_count.
    """
    db = _get_db_client()

    try:
        sentry_sdk.set_tag("extraction_id", extraction_id)
        sentry_sdk.add_breadcrumb(
            category="pipeline",
            message=f"Running extraction for {extraction_id}",
            level="info",
        )

        raise_if_pipeline_stopped(db, extraction_id)

        # 1. Read document reference from DB
        object_key, filename = _fetch_document_reference(db, extraction_id)

        # 2. Download PDF bytes from object storage
        object_storage = ObjectStorageService()
        pdf_bytes = object_storage.download_file(object_key)

        # 3. Count pages
        page_count = len(pypdf.PdfReader(io.BytesIO(pdf_bytes)).pages)

        raise_if_pipeline_stopped(db, extraction_id)

        # 4. Transition UPLOADING -> EXTRACTING
        update_extraction_status(extraction_id, ExtractionStatus.EXTRACTING)

        # 5. Build registry, prompt, observer, and config
        registry = build_lextract_registry()

        prompt_builder = ExtractionPromptBuilder(
            registry,
            domain_knowledge=get_all_domain_knowledge(),
        )
        prompt = prompt_builder.build_prompt()

        observer = ExtractionPipelineObserver(extraction_id=extraction_id, db=db)

        cost_ceiling_cents = int(settings.max_extraction_llm_cost_usd * 100)

        config = MultiPassConfig(
            pass1_models=[
                settings.pass1_model,
                settings.pass1_fallback_model,
                settings.pass1_fallback_model_2,
            ],
            pass2_models=[
                settings.pass2_model,
                settings.pass2_fallback_model,
                settings.pass2_fallback_model_2,
            ],
            pass3_models=[
                settings.pass3_model,
                settings.pass3_fallback_model,
                settings.pass3_fallback_model_2,
            ],
            sibling_models=[
                settings.extraction_sibling_model,
                settings.extraction_sibling_fallback_model,
                settings.extraction_sibling_fallback_model_2,
            ],
            judge_models=[
                settings.extraction_judge_model,
                settings.extraction_judge_fallback_model,
                settings.extraction_judge_fallback_model_2,
            ],
            judge_model_class=(
                build_extraction_model(registry)
                if settings.extraction_dual_enabled
                else None
            ),
            dual_enabled=settings.extraction_dual_enabled,
            min_confidence=settings.validation_min_confidence,
            escalation_threshold=settings.escalation_confidence_threshold,
            cost_ceiling_cents=cost_ceiling_cents,
        )

        def client_factory(model: str) -> OpenRouterClient:
            return OpenRouterClient(
                api_key=settings.openrouter_api_key,
                model=model,
                base_url=settings.openrouter_base_url,
            )

        # 6. Run orchestrator
        orchestrator = MultiPassOrchestrator(
            config, client_factory, registry, observer=observer
        )
        mp_result = asyncio.run(orchestrator.run(pdf_bytes, filename, prompt))
        result = mp_result.extraction

        raise_if_pipeline_stopped(db, extraction_id)

        # 8. Sentry fail-open: warn on cost ceiling and validation failures
        if mp_result.cost_ceiling_hit:
            sentry_sdk.set_tag("extraction.cost_ceiling_hit", "true")
            sentry_sdk.capture_message(
                f"Extraction cost ceiling hit for {extraction_id}",
                level="warning",
                extras={
                    "extraction_id": extraction_id,
                    "extraction_cost_cents": mp_result.extraction_cost_cents,
                    "cost_ceiling_cents": cost_ceiling_cents,
                },
            )

        audit_trail = mp_result.audit_trail or {}
        validation_failures = audit_trail.get("validation_failures", [])
        if validation_failures:
            sentry_sdk.capture_message(
                f"Extraction validation failures for {extraction_id}",
                level="warning",
                extras={
                    "extraction_id": extraction_id,
                    "failures": validation_failures,
                },
            )

        extracted_data = {
            name: {
                "value": fv.value,
                "confidence": fv.confidence,
                "source_text": fv.source_text,
            }
            for name, fv in result.fields.items()
        }

        pass_records_serialized = [r.model_dump() for r in mp_result.pass_records]

        # Build stage summary from observer's in-memory events
        stage_summary = observer.build_summary(pass_records_serialized)

        # 7a. Raw R2 dump (gated by feature flag)
        raw_artifact_keys: list[str] = []
        if settings.raw_extraction_dump_enabled:
            raw_responses: list[str] = audit_trail.get("raw_responses", [])
            raw_artifact_keys = _dump_raw_artifacts(
                extraction_id=extraction_id,
                pass_records=mp_result.pass_records,
                raw_responses=raw_responses,
                object_storage=object_storage,
            )

        update_data: dict[str, Any] = {
            "extracted_data": extracted_data,
            "extraction_tokens": {
                "input_tokens": sum(r.input_tokens for r in mp_result.pass_records),
                "output_tokens": sum(r.output_tokens for r in mp_result.pass_records),
                "total_tokens": mp_result.total_tokens,
            },
            "pass_records": pass_records_serialized,
            "document_page_count": page_count,
            "extraction_cost_cents": mp_result.extraction_cost_cents,
            "stage_summary": stage_summary,
            "raw_extraction_object_keys": (
                raw_artifact_keys if raw_artifact_keys else None
            ),
        }

        if mp_result.patch is not None:
            update_data["pass2_patch"] = mp_result.patch.model_dump()
        if mp_result.pass3_overrides is not None:
            update_data["pass3_overrides"] = mp_result.pass3_overrides

        # 7b. Persist results only if cancellation has not won the race.
        try:
            update_extraction_if_status_matches(
                db,
                extraction_id,
                update_data,
                ExtractionStatus.EXTRACTING,
            )
        except PipelineStoppedError:
            _delete_raw_artifacts(object_storage, raw_artifact_keys)
            raise

        # 9. Transition to SCORING
        update_extraction_status(extraction_id, ExtractionStatus.SCORING)

        logger.info(
            "Extraction complete for %s: %d fields, %d pages, %d cents",
            extraction_id,
            len(extracted_data),
            page_count,
            mp_result.extraction_cost_cents,
        )

        return {
            "extraction_id": extraction_id,
            "status": "scoring",
            "field_count": len(extracted_data),
        }

    except (PipelineStoppedError, ConflictError):
        logger.info("Extraction pipeline stopped for %s", extraction_id)
        raise
    except Exception as exc:
        logger.exception("Extraction failed for %s", extraction_id)
        if _should_retry_task(self):
            raise self.retry(exc=exc)
        on_pipeline_failure(
            extraction_id,
            (
                str(exc)
                if isinstance(exc, ValueError)
                else (
                    "We were unable to extract data from your document."
                    " Please try uploading again."
                )
            ),
        )
        raise
