"""Lead unsubscribe endpoint.

Public endpoint (no auth) for unsubscribing marketing leads.
Compatibility proxy to the Cloudflare D1-backed marketing Worker.
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.services.marketing_worker import MarketingWorkerClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get(
    "/unsubscribe",
    status_code=status.HTTP_200_OK,
)
async def unsubscribe_lead(lead_id: str) -> dict[str, bool]:
    """Forward a lead unsubscribe request to the marketing Worker."""
    try:
        uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="lead_id must be a valid UUID.",
        )

    marketing_worker = MarketingWorkerClient(
        base_url=settings.marketing_worker_url,
        secret=settings.marketing_worker_secret,
    )
    try:
        unsubscribed = await marketing_worker.unsubscribe(lead_id)
    except Exception as exc:
        logger.exception("Marketing Worker unsubscribe failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Marketing data service unavailable.",
        ) from exc

    if not unsubscribed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    return {"success": True}
