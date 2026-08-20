"""Stripe webhook event Pydantic model."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StripeWebhookEvent(BaseModel):
    """Idempotency guard for Stripe webhook events.

    Note: id is a TEXT field (Stripe event ID like evt_xxx), not a UUID.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    event_type: str
    processed_at: datetime
