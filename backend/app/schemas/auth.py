"""Request and response schemas for auth endpoints.

With Neon Auth, signup/login/refresh are handled by the frontend.
Backend schemas cover: sync-user, anonymous session, and session linking.
"""

from pydantic import BaseModel, EmailStr, Field


class SyncUserRequest(BaseModel):
    """Request body for POST /auth/sync-user."""

    # email is accepted but intentionally ignored by the endpoint handler —
    # the authoritative email comes from the verified JWT claims (user.email),
    # not the request body, so it cannot be spoofed by the caller.
    # Field is optional for API compatibility with existing frontend callers.
    email: EmailStr | None = Field(
        default=None,
        description="Ignored — email is sourced from verified JWT claims",
    )
    full_name: str | None = Field(
        default=None,
        max_length=200,
        description="User's full name",
    )


class SyncUserResponse(BaseModel):
    """Response body for POST /auth/sync-user."""

    synced: bool = Field(description="Whether the user row was synced successfully")
    user_id: str = Field(description="User UUID from JWT sub claim")


class AnonymousSessionRequest(BaseModel):
    """Request body for POST /auth/anonymous (empty body allowed)."""


class AnonymousSessionResponse(BaseModel):
    """Response body for anonymous session creation."""

    session_token: str = Field(description="Session token for X-Session-Token header")
    expires_at: str = Field(description="ISO 8601 expiration timestamp")


class AnonymousEmailRequest(BaseModel):
    """Request body for PATCH /auth/anonymous/email."""

    email: EmailStr = Field(description="Email address for lead capture")


class AnonymousEmailResponse(BaseModel):
    """Response body for PATCH /auth/anonymous/email."""

    updated: bool = Field(description="Whether the email was saved")


class LinkSessionRequest(BaseModel):
    """Request body for POST /auth/link."""

    session_token: str = Field(
        min_length=1,
        description="The anonymous session token to link",
    )


class LinkSessionResponse(BaseModel):
    """Response body for session linking."""

    linked: bool = Field(description="Whether the session was successfully linked")
    extractions_transferred: int = Field(
        default=0,
        description="Number of extractions transferred to the user account",
    )
