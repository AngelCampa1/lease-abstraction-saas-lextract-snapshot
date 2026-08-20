"""User and anonymous session Pydantic models."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    """Registered user extending Supabase Auth."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None = None
    company: str | None = None
    role: str | None = None
    credits_balance: int = 0
    stripe_customer_id: str | None = None
    created_at: datetime
    updated_at: datetime


class AnonymousSession(BaseModel):
    """Upload-first, signup-later anonymous session."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_token: str
    linked_user_id: uuid.UUID | None = None
    expires_at: datetime
    created_at: datetime
