"""Celery tasks for confidence scoring and red flag detection.

score_confidence_task: Scores per-field and overall confidence.
run_red_flags_task: Detects red flags and CamAudit upsell triggers.

Red flag detection is non-fatal: exceptions are caught and logged
but never propagate, ensuring the pipeline can always complete.
"""

from __future__ import annotations

import logging
from typing import Any

import sentry_sdk
from extract_sdk.confidence import score_confidence, score_overall_confidence
from extract_sdk.models import ExtractionResult, FieldExtractionValue
from extract_sdk.red_flags import detect_red_flags, should_show_camaudit
from extract_sdk.schema.lextract_schema import build_lextract_registry

from app.core.celery_app import celery_app
from app.models.enums import ExtractionStatus
from app.tasks._helpers import (
    PipelineStoppedError,
    _get_db_client,
    on_pipeline_failure,
    raise_if_pipeline_stopped,
    update_extraction_if_status_matches,
)

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.scoring.score_confidence_task",
    max_retries=2,
    default_retry_delay=30,
)
def score_confidence_task(
    self: Any,
    extraction_id: str,
) -> dict[str, Any]:
    """Score per-field and overall confidence for an extraction.

    Reads extracted_data from the database, reconstructs an ExtractionResult,
    scores each field's confidence using the LLM-reported confidence values,
    then persists the scores. OCR metadata is no longer used — confidence
    comes entirely from the Gemini extraction pass.

    Args:
        self: Celery task instance (bound).
        extraction_id: UUID of the extraction record.

    Returns:
        Dict with extraction_id, status, and field_count.
    """
    db = _get_db_client()

    try:
        sentry_sdk.set_tag("extraction_id", extraction_id)
        raise_if_pipeline_stopped(db, extraction_id)

        response = (
            db.table("extractions")
            .select("extracted_data")
            .eq("id", extraction_id)
            .single()
            .execute()
        )
        record = response.data

        extracted_data: dict[str, Any] = record.get("extracted_data") or {}

        # Reconstruct ExtractionResult from stored data
        fields: dict[str, FieldExtractionValue] = {}
        for name, field_data in extracted_data.items():
            if not isinstance(field_data, dict):
                logger.warning(
                    "Skipping non-dict field %r in extraction %s",
                    name,
                    extraction_id,
                )
                continue
            fields[name] = FieldExtractionValue(
                value=field_data.get("value"),
                confidence=field_data.get("confidence", 0.0),
                source_text=field_data.get("source_text", ""),
            )
        result = ExtractionResult(fields=fields)

        registry = build_lextract_registry()

        # Score per-field confidence (LLM-only, no OCR blending)
        field_scores = score_confidence(result, registry)

        # Score overall confidence
        overall = score_overall_confidence(field_scores, registry)

        # Serialize scores
        confidence_data: dict[str, Any] = {
            name: cs.to_dict() for name, cs in field_scores.items()
        }
        confidence_data["_overall"] = overall

        overall_score = overall.get("overall_score", 0.0)

        update_extraction_if_status_matches(
            db,
            extraction_id,
            {
                "confidence_scores": confidence_data,
                "overall_confidence": overall_score,
            },
            ExtractionStatus.SCORING,
        )

        return {
            "extraction_id": extraction_id,
            "status": "scoring",
            "field_count": len(field_scores),
        }

    except PipelineStoppedError:
        logger.info("Confidence scoring stopped for %s", extraction_id)
        raise
    except Exception:
        logger.exception("Confidence scoring failed for %s", extraction_id)
        on_pipeline_failure(
            extraction_id,
            "An error occurred while analyzing your document."
            " Please try uploading again.",
        )
        raise


@celery_app.task(
    bind=True,
    name="app.tasks.scoring.run_red_flags_task",
    max_retries=0,
)
def run_red_flags_task(
    self: Any,
    extraction_id: str,
) -> dict[str, Any]:
    """Detect red flags in extracted data. NON-FATAL task.

    Reads extracted_data and confidence_scores from DB, runs the
    red flag detection rules, checks CamAudit upsell eligibility,
    and writes results back. Exceptions are caught and logged but
    never propagate, ensuring the pipeline always continues.

    Args:
        self: Celery task instance (bound).
        extraction_id: UUID of the extraction record.

    Returns:
        Dict with extraction_id, flag_count, and show_camaudit.
        On failure, includes an 'error' key instead.
    """
    try:
        sentry_sdk.set_tag("extraction_id", extraction_id)

        db = _get_db_client()
        raise_if_pipeline_stopped(db, extraction_id)

        response = (
            db.table("extractions")
            .select("extracted_data, confidence_scores")
            .eq("id", extraction_id)
            .single()
            .execute()
        )
        record = response.data

        extracted_data: dict[str, Any] = record.get("extracted_data") or {}
        confidence_scores: dict[str, Any] = record.get("confidence_scores") or {}

        # Flatten extracted_data to {field_name: value} for red flag detection
        non_dict_fields = [
            n for n, fd in extracted_data.items() if not isinstance(fd, dict)
        ]
        if non_dict_fields:
            logger.warning(
                "Skipping %d non-dict fields in red flag detection for "
                "extraction %s: %s",
                len(non_dict_fields),
                extraction_id,
                non_dict_fields[:5],
            )
        flat_data: dict[str, Any] = {
            name: fd.get("value")
            for name, fd in extracted_data.items()
            if isinstance(fd, dict)
        }

        flags = detect_red_flags(flat_data)

        # Build flat confidence scores for CamAudit check
        flat_scores: dict[str, float] = {
            name: cs.get("score", 0.0)
            for name, cs in confidence_scores.items()
            if name != "_overall" and isinstance(cs, dict)
        }
        show_camaudit = should_show_camaudit(flags, flat_data, flat_scores)

        # Serialize and write
        red_flags_data = [f.to_dict() for f in flags]

        update_extraction_if_status_matches(
            db,
            extraction_id,
            {
                "red_flags": red_flags_data,
                "show_camaudit": show_camaudit,
            },
            ExtractionStatus.SCORING,
        )

        return {
            "extraction_id": extraction_id,
            "flag_count": len(flags),
            "show_camaudit": show_camaudit,
        }

    except PipelineStoppedError:
        logger.info("Red flag detection stopped for %s", extraction_id)
        raise
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        # NON-FATAL: log and continue, never fail the pipeline
        logger.exception("Red flag detection failed for %s (non-fatal)", extraction_id)
        return {
            "extraction_id": extraction_id,
            "flag_count": 0,
            "error": "Red flag detection failed",
        }
