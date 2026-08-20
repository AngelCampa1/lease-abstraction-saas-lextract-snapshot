"""Request and response schemas for payment endpoints."""

import re
from enum import StrEnum
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


class ProductType(StrEnum):
    """Supported Stripe product types with pricing."""

    SINGLE = "single"
    CREDIT_PACK_5 = "credit_pack_5"
    CREDIT_PACK_10 = "credit_pack_10"


# Pricing in cents for each product type
PRODUCT_PRICING: dict[ProductType, int] = {
    ProductType.SINGLE: 1500,  # $15.00
    ProductType.CREDIT_PACK_5: 6500,  # $65.00
    ProductType.CREDIT_PACK_10: 12000,  # $120.00
}

# Display names for Stripe line items
PRODUCT_NAMES: dict[ProductType, str] = {
    ProductType.SINGLE: "Lextract Single Lease Extraction",
    ProductType.CREDIT_PACK_5: "Lextract 5-Credit Pack",
    ProductType.CREDIT_PACK_10: "Lextract 10-Credit Pack",
}

# Credits granted per product type
PRODUCT_CREDITS: dict[ProductType, int] = {
    ProductType.SINGLE: 1,
    ProductType.CREDIT_PACK_5: 5,
    ProductType.CREDIT_PACK_10: 10,
}


class CheckoutRequest(BaseModel):
    """Request body for POST /payments/checkout."""

    product_type: ProductType = Field(
        description="Product type: single, credit_pack_5, or credit_pack_10"
    )
    success_url: str = Field(
        min_length=1,
        max_length=2048,
        description="URL to redirect to after successful payment",
    )
    cancel_url: str = Field(
        min_length=1,
        max_length=2048,
        description="URL to redirect to if payment is cancelled",
    )
    extraction_id: str | None = Field(
        default=None,
        description="Extraction ID for single purchases (optional)",
    )
    guest_email: str | None = Field(
        default=None,
        description="Guest email for anonymous checkout (no account required)",
    )

    @field_validator("guest_email")
    @classmethod
    def validate_guest_email(cls, v: str | None) -> str | None:
        """Validate guest_email is a syntactically valid email address."""
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        # RFC 5322-like pattern — catches obvious typos without over-validating
        pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        if not re.match(pattern, v):
            raise ValueError("guest_email must be a valid email address")
        return v

    @field_validator("success_url", "cancel_url")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        """Ensure URLs use https (or http://localhost / 127.0.0.1 for dev).

        Rejects http://localhost.evil.com-style subdomain hijacks by parsing
        the URL and checking the hostname directly rather than using startswith.
        Strips whitespace to reject whitespace-only strings that pass min_length.
        """
        v = v.strip()
        if not v:
            raise ValueError("URL must not be empty or whitespace-only")
        parsed = urlparse(v)
        if parsed.scheme == "https":
            return v
        if parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1"):
            return v
        raise ValueError(
            "URL must use https:// (or http://localhost / 127.0.0.1 for dev)"
        )


class CheckoutResponse(BaseModel):
    """Response body for checkout session creation."""

    checkout_url: str = Field(description="Stripe Checkout URL to redirect the user to")
    session_id: str = Field(description="Stripe Checkout Session ID")


class WebhookResponse(BaseModel):
    """Response body for webhook endpoint."""

    received: bool = Field(default=True, description="Whether the event was received")
