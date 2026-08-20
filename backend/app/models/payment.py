"""Payment Pydantic model."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import PaymentType


class Payment(BaseModel):
    """Stripe payment record linked to an extraction or credit pack."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    stripe_checkout_session_id: str
    stripe_payment_intent_id: str | None = None
    payment_type: PaymentType
    amount_cents: int
    status: str
    created_at: datetime
    updated_at: datetime
