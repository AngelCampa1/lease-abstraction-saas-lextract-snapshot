"""Extraction Pydantic model."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import ExtractionStatus, PaymentStatus


class Extraction(BaseModel):
    """Core extraction record — tracks a single lease abstraction job."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None = None
    anonymous_session_id: uuid.UUID | None = None
    status: ExtractionStatus
    document_filename: str
    document_object_key: str
    document_page_count: int | None = None
    property_type: str | None = None
    extracted_data: dict[str, Any] | None = None
    confidence_scores: dict[str, Any] | None = None
    red_flags: list[dict[str, Any]] | None = None
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    payment_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
