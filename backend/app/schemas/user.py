"""User profile request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

VALID_ROLES = frozenset(
    {"tenant_rep", "broker", "attorney", "landlord", "investor", "other"}
)


class UserProfileResponse(BaseModel):
    """Response body for GET /user/profile."""

    id: str = Field(description="User UUID")
    email: str = Field(description="User's email address")
    full_name: str | None = Field(default=None, description="User's full name")
    company: str | None = Field(default=None, description="Company name")
    role: str | None = Field(
        default=None,
        description="User role: tenant_rep, broker, attorney,"
        " landlord, investor, other",
    )
    credits_balance: int = Field(default=0, description="Current credit balance")
    created_at: datetime = Field(description="Account creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")


class UpdateProfileRequest(BaseModel):
    """Request body for PATCH /user/profile."""

    full_name: str | None = Field(
        default=None,
        max_length=200,
        description="User's full name",
    )
    company: str | None = Field(
        default=None,
        max_length=200,
        description="Company name",
    )
    role: str | None = Field(
        default=None,
        description="User role: tenant_rep, broker, attorney,"
        " landlord, investor, other",
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        """Validate the role is one of the allowed values."""
        if v is not None and v not in VALID_ROLES:
            raise ValueError(
                f"Invalid role '{v}'. Must be one of: {', '.join(sorted(VALID_ROLES))}"
            )
        return v


class UpdateProfileResponse(BaseModel):
    """Response body for PATCH /user/profile."""

    id: str = Field(description="User UUID")
    email: str = Field(description="User's email address")
    full_name: str | None = Field(default=None, description="User's full name")
    company: str | None = Field(default=None, description="Company name")
    role: str | None = Field(default=None, description="User role")
    credits_balance: int = Field(default=0, description="Current credit balance")
    updated_at: datetime = Field(description="Last update timestamp")
