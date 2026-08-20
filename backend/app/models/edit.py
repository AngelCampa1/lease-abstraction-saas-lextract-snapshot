"""Extraction edit audit trail Pydantic model."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ExtractionEdit(BaseModel):
    """Audit trail entry for a user override of an AI-extracted field."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    extraction_id: uuid.UUID
    field_name: str
    original_value: Any | None = None
    edited_value: Any
    edited_by: uuid.UUID
    created_at: datetime
