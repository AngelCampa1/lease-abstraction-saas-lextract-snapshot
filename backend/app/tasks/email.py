"""Celery tasks for sending email notifications.

Dispatched by the pipeline after extraction completion. Each task reads
from the database, checks preconditions, and delegates to EmailService.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.email import EmailService
from app.tasks._helpers import _get_db_client

logger = logging.getLogger(__name__)

_CAMAUDIT_URL = "https://partner.camaudit.io"


def _build_email_service() -> EmailService:
    """Create an EmailService configured from app settings.

    Returns:
        Configured EmailService instance.
    """
    return EmailService(api_key=settings.resend_api_key)


@celery_app.task(
    name="app.tasks.email.send_extraction_complete_email",
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_extraction_complete_email(extraction_id: str) -> dict[str, Any]:
    """Send extraction complete notification email.

    Reads the extraction record and user email from the database, then
    sends a completion notification via Resend. Skips silently for
    anonymous sessions or users without email addresses.

    Args:
        extraction_id: UUID of the completed extraction.

    Returns:
        Dict with sent status and reason or message id.
    """
    db = _get_db_client()

    extraction_result = (
        db.table("extractions")
        .select("user_id, document_filename, overall_confidence, extracted_data")
        .eq("id", extraction_id)
        .maybe_single()
        .execute()
    )
    extraction = extraction_result.data

    if not extraction:
        logger.warning(
            "Extraction %s not found — skipping completion email", extraction_id
        )
        return {"sent": False, "reason": "extraction not found"}

    user_id = extraction.get("user_id")
    if not user_id:
        logger.debug("Skipping email for anonymous extraction %s", extraction_id)
        return {"sent": False, "reason": "anonymous extraction"}

    user = (db.table("users").select("email").eq("id", user_id).single().execute()).data
    email = user.get("email") if user else None
    if not email:
        logger.debug("Skipping email for user %s — no email address", user_id)
        return {"sent": False, "reason": "no email address"}

    document_name = extraction.get("document_filename", "document")
    overall = extraction.get("overall_confidence")
    if overall is not None:
        confidence = f"{float(overall) * 100:.0f}% overall confidence"
    else:
        confidence = "N/A"
    extracted_data = extraction.get("extracted_data") or {}
    field_count = len(extracted_data)
    results_url = f"{settings.frontend_url}/results/{extraction_id}"
    unsubscribe_url = f"{settings.frontend_url}/settings/notifications"

    svc = _build_email_service()
    result = svc.send_extraction_complete(
        to=email,
        document_name=document_name,
        field_count=field_count,
        confidence_summary=confidence,
        results_url=results_url,
        unsubscribe_url=unsubscribe_url,
    )

    logger.info(
        "Extraction complete email sent for %s to %s",
        extraction_id,
        email,
    )
    return {"sent": True, "message_id": result.get("id", "")}


@celery_app.task(
    name="app.tasks.email.send_cam_flags_email",
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def send_cam_flags_email(extraction_id: str) -> dict[str, Any]:
    """Send CAM flags notification email (typically delayed 30 min).

    Reads the extraction record to check for red flags and the
    show_camaudit flag. Sends a CamAudit upsell email if applicable.

    Args:
        extraction_id: UUID of the completed extraction.

    Returns:
        Dict with sent status and reason or message id.
    """
    db = _get_db_client()

    extraction_result = (
        db.table("extractions")
        .select("user_id, document_filename, show_camaudit, red_flags")
        .eq("id", extraction_id)
        .maybe_single()
        .execute()
    )
    extraction = extraction_result.data

    if not extraction:
        logger.warning(
            "Extraction %s not found — skipping CAM flags email", extraction_id
        )
        return {"sent": False, "reason": "extraction not found"}

    user_id = extraction.get("user_id")
    if not user_id:
        logger.debug(
            "Skipping CAM flags email for anonymous extraction %s",
            extraction_id,
        )
        return {"sent": False, "reason": "anonymous extraction"}

    show_camaudit = extraction.get("show_camaudit")
    if not show_camaudit:
        logger.debug(
            "Skipping CAM flags email for %s — show_camaudit is disabled",
            extraction_id,
        )
        return {"sent": False, "reason": "show_camaudit disabled"}

    red_flags: list[dict[str, Any]] = extraction.get("red_flags") or []
    if not red_flags:
        logger.debug("Skipping CAM flags email for %s — no flags found", extraction_id)
        return {"sent": False, "reason": "no flags found"}

    user = (db.table("users").select("email").eq("id", user_id).single().execute()).data
    email = user.get("email") if user else None
    if not email:
        logger.debug("Skipping CAM flags email for user %s — no email", user_id)
        return {"sent": False, "reason": "no email address"}

    document_name = extraction.get("document_filename", "document")
    flag_names = [f.get("name", "Unknown flag") for f in red_flags]
    unsubscribe_url = f"{settings.frontend_url}/settings/notifications"

    svc = _build_email_service()
    result = svc.send_cam_flags_found(
        to=email,
        document_name=document_name,
        flag_count=len(red_flags),
        flag_names=flag_names,
        camaudit_url=_CAMAUDIT_URL,
        unsubscribe_url=unsubscribe_url,
    )

    logger.info(
        "CAM flags email sent for %s to %s (%d flags)",
        extraction_id,
        email,
        len(red_flags),
    )
    return {"sent": True, "message_id": result.get("id", "")}
