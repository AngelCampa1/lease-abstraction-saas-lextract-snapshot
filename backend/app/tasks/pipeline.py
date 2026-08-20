"""Celery pipeline orchestration for the extraction workflow.

Defines the task chain that drives a lease PDF through extraction,
confidence scoring, red flag detection, and completion.

Chain: run_gemini_extraction -> score -> red_flags -> mark_complete
"""

from __future__ import annotations

import html
import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import resend
import sentry_sdk
from celery import chain

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.exceptions import ConflictError
from app.core.status import update_extraction_status
from app.models.enums import ExtractionStatus
from app.services.public_knowledge import (
    get_email_sender,
    render_public_body_template,
    render_public_subject,
)
from app.tasks._helpers import (
    PipelineStoppedError,
    _get_db_client,
    on_pipeline_failure,
)
from app.tasks.extraction import run_gemini_extraction_task
from app.tasks.scoring import run_red_flags_task, score_confidence_task


def _get_from_address() -> str:
    """Return the configured from address, falling back to public knowledge."""
    configured = settings.resend_from_address.strip()
    if configured:
        return configured
    return get_email_sender("founder")


logger = logging.getLogger(__name__)

# Extractions that linger in extracting/scoring past this many minutes are
# considered stalled — the worker likely crashed mid-task or the Celery time
# limit fired without bubbling a failure to the DB. The recovery task flips
# them to failed so users see a clear error instead of a forever-spinning
# processing page.
STUCK_EXTRACTION_THRESHOLD_MINUTES = 60


def _send_anonymous_notify_email(
    *,
    db: Any,
    extraction_id: str,
    notify_email: str,
    anonymous_session_id: str | None,
    document_filename: str,
) -> None:
    """Send a results-ready email to the address captured on the processing page.

    Looks up the session token so the recipient can access their results
    without re-authenticating. Silently skips on any error so it never
    blocks pipeline completion.

    Args:
        db: Neon service client.
        extraction_id: UUID of the completed extraction.
        notify_email: Email address to notify.
        anonymous_session_id: UUID of the anonymous session, if any.
        document_filename: Original filename shown in the email body.
    """
    try:
        # Build the results link, appending session_token if available
        results_url = f"{settings.frontend_url}/results/{extraction_id}"
        if anonymous_session_id:
            session_result = (
                db.table("anonymous_sessions")
                .select("session_token")
                .eq("id", anonymous_session_id)
                .maybe_single()
                .execute()
            )
            if session_result.data:
                token = session_result.data.get("session_token")
                if token:
                    results_url = (
                        f"{settings.frontend_url}/results/{extraction_id}"
                        f"?{urlencode({'session_token': token})}"
                    )

        safe_name = html.escape(document_filename)
        html_body = (
            "<p>"
            + render_public_body_template(
                "anonymous-notification",
                "htmlTemplate",
                document_name=safe_name,
            )
            + "</p>"
            f'<p><a href="{results_url}">View your results</a></p>'
        )
        plain_text = (
            render_public_body_template(
                "anonymous-notification",
                "textTemplate",
                document_name=document_filename,
            )
            + f"\n\nView your results: {results_url}\n"
        )

        # resend uses a module-level api_key; setting it here is safe because
        # settings.resend_api_key is constant for the lifetime of the process.
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": _get_from_address(),
                "to": [notify_email],
                "subject": render_public_subject("anonymous-notification"),
                "html": html_body,
                "text": plain_text,
            }
        )
        logger.info(
            "Notify email sent for extraction %s to %s",
            extraction_id,
            notify_email,
        )
    except Exception:
        logger.exception(
            "Failed to send notify email for extraction %s (non-fatal)",
            extraction_id,
        )


def run_extraction_pipeline(extraction_id: str) -> None:
    """Launch the full extraction pipeline as a Celery chain.

    Chain: gemini_extraction -> score -> red_flags -> mark_complete

    All tasks use .si() (immutable signatures) because each task reads
    its own state from the DB rather than relying on return values from
    the previous task.

    Args:
        extraction_id: UUID of the extraction record to process.
    """
    pipeline = chain(
        run_gemini_extraction_task.si(extraction_id),
        score_confidence_task.si(extraction_id),
        run_red_flags_task.si(extraction_id),
        mark_extraction_complete.si(extraction_id),
    )
    pipeline.apply_async()
    logger.info("Pipeline dispatched for extraction %s", extraction_id)


@celery_app.task(
    bind=True,
    name="app.tasks.pipeline.mark_extraction_complete",
    max_retries=2,
    default_retry_delay=5,
)
def mark_extraction_complete(
    self: Any,
    extraction_id: str,
) -> dict[str, Any]:
    """Mark an extraction as complete."""
    sentry_sdk.set_tag("extraction_id", extraction_id)
    sentry_sdk.add_breadcrumb(
        category="pipeline",
        message=f"Marking extraction {extraction_id} complete",
        level="info",
    )

    try:
        # Apply the authoritative, CAS-guarded transition FIRST. If the row was
        # deleted, cancelled, or modified concurrently this raises (Conflict /
        # InvalidStatusTransition) and we never touch the DB for email dispatch.
        # The return value tells us whether THIS call performed the transition:
        # the task is max_retries=2, and on a retry the row is already complete,
        # update_extraction_status is a silent no-op (returns False), and the
        # email-dispatch block below must NOT re-fire.
        transitioned = update_extraction_status(
            extraction_id, ExtractionStatus.COMPLETE
        )

        logger.info("Extraction %s marked complete", extraction_id)

        if not transitioned:
            logger.info(
                "Extraction %s was already complete; skipping duplicate email"
                " dispatch (task retry)",
                extraction_id,
            )
            return {
                "extraction_id": extraction_id,
                "status": "complete",
            }

        # Dispatch email notifications (fire-and-forget, non-blocking). Read the
        # row only now that we know this call owns the complete transition. The
        # whole block — including the DB lookup — is non-fatal: a failure here
        # must not undo the completed status or fail the task.
        try:
            db = _get_db_client()
            record = (
                db.table("extractions")
                .select(
                    "user_id, notify_email, anonymous_session_id," " document_filename"
                )
                .eq("id", extraction_id)
                .single()
                .execute()
            )
            if record.data:
                extraction_data = record.data
                if extraction_data.get("user_id"):
                    from app.tasks.email import (
                        send_cam_flags_email,
                        send_extraction_complete_email,
                    )

                    send_extraction_complete_email.delay(extraction_id)
                    send_cam_flags_email.apply_async(
                        args=[extraction_id], countdown=1800
                    )
                    logger.info(
                        "Email tasks dispatched for extraction %s",
                        extraction_id,
                    )

                notify_email = extraction_data.get("notify_email")
                if notify_email and not extraction_data.get("user_id"):
                    _send_anonymous_notify_email(
                        db=db,
                        extraction_id=extraction_id,
                        notify_email=notify_email,
                        anonymous_session_id=extraction_data.get(
                            "anonymous_session_id"
                        ),
                        document_filename=extraction_data.get(
                            "document_filename", "your lease"
                        ),
                    )
        except Exception:
            logger.exception(
                "Failed to dispatch email tasks for %s (non-fatal)",
                extraction_id,
            )

        return {
            "extraction_id": extraction_id,
            "status": "complete",
        }

    except (PipelineStoppedError, ConflictError):
        logger.info("Completion stopped for %s", extraction_id)
        raise
    except Exception:
        logger.exception("Failed to mark extraction %s complete", extraction_id)
        on_pipeline_failure(
            extraction_id,
            "An unexpected error occurred while finalizing your results."
            " Please contact support if this persists.",
        )
        raise


@celery_app.task(
    name="app.tasks.pipeline.cleanup_stuck_extractions",
)
def cleanup_stuck_extractions() -> dict[str, Any]:
    """Mark extractions stalled in uploading/extracting/scoring as failed.

    This task is available for manual operator recovery, but is not scheduled.
    Any extraction in the
    ``uploading``, ``extracting``, or ``scoring`` status whose ``updated_at``
    is older than :data:`STUCK_EXTRACTION_THRESHOLD_MINUTES` is flipped to
    ``failed`` with a clear timeout message so the frontend can stop polling.

    ``uploading`` is included because a row is inserted in that state and only
    flips to ``extracting`` once the Gemini task starts executing. If the
    worker is down/backed up or the broker drops the message after the API
    returns 201, the row would otherwise strand in ``uploading`` forever. The
    ``updated_at`` threshold plus the per-row CAS-on-original-status guard
    below protect a job that legitimately just started.
    """
    db = _get_db_client()
    threshold = datetime.now(UTC) - timedelta(
        minutes=STUCK_EXTRACTION_THRESHOLD_MINUTES
    )
    threshold_iso = threshold.isoformat()

    in_progress_statuses = [
        ExtractionStatus.UPLOADING.value,
        ExtractionStatus.EXTRACTING.value,
        ExtractionStatus.SCORING.value,
    ]

    response = (
        db.table("extractions")
        .select("id, status")
        .in_("status", in_progress_statuses)
        .lt("updated_at", threshold_iso)
        .is_("deleted_at", "null")
        .execute()
    )
    stuck_rows: list[dict[str, Any]] = list(getattr(response, "data", None) or [])

    error_message = "Pipeline timed out"
    now_iso = datetime.now(UTC).isoformat()
    failed_count = 0
    for row in stuck_rows:
        extraction_id = row.get("id")
        original_status = row.get("status")
        if not extraction_id or not original_status:
            continue
        update_result = (
            db.table("extractions")
            .update(
                {
                    "status": ExtractionStatus.FAILED.value,
                    "error_message": error_message,
                    "processing_completed_at": now_iso,
                    "updated_at": now_iso,
                }
            )
            .eq("id", extraction_id)
            .eq("status", original_status)
            .is_("deleted_at", "null")
            .execute()
        )
        if getattr(update_result, "data", None):
            failed_count += 1
            logger.warning(
                "Marked stuck extraction %s (was %s) as failed",
                extraction_id,
                original_status,
            )

    return {"failed_count": failed_count, "checked": len(stuck_rows)}
