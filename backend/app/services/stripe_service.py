"""Stripe SDK wrapper for Lextract payment processing.

Handles checkout session creation, webhook signature verification,
and session retrieval. Adapted from CamAudit-v2 with Lextract pricing.
"""

import logging
from typing import Any

import stripe

from app.core.config import settings
from app.core.exceptions import StripeError
from app.schemas.payment import (
    PRODUCT_CREDITS,
    PRODUCT_NAMES,
    PRODUCT_PRICING,
    ProductType,
)

logger = logging.getLogger(__name__)


class StripeService:
    """Stripe SDK wrapper for checkout sessions and webhook verification."""

    def __init__(self) -> None:
        stripe.api_key = settings.stripe_secret_key

    def create_checkout_session(
        self,
        user_id: str,
        product_type: ProductType,
        success_url: str,
        cancel_url: str,
        extraction_id: str | None = None,
        guest_email: str | None = None,
        anonymous_session_id: str | None = None,
    ) -> Any:
        """Create a Stripe Checkout Session for a one-time purchase.

        Args:
            user_id: The Neon Auth user UUID. Empty string for guest checkouts.
            product_type: One of single, credit_pack_5, credit_pack_10.
            success_url: Redirect URL after successful payment.
            cancel_url: Redirect URL if payment is cancelled.
            extraction_id: Extraction UUID for single purchases (optional).
            guest_email: Guest email address for anonymous checkout (optional).
                When provided, pre-fills the Stripe Checkout email field and
                is included in session metadata so the webhook can auto-create
                the guest's account after payment.

        Returns:
            Stripe Checkout Session object.

        Raises:
            StripeError: On any Stripe API failure.
        """
        amount_cents = PRODUCT_PRICING[product_type]
        product_name = PRODUCT_NAMES[product_type]
        credits = PRODUCT_CREDITS[product_type]

        metadata: dict[str, str] = {
            "user_id": user_id,
            "product_type": product_type.value,
            "extraction_id": extraction_id or "",
            "credits": str(credits),
        }
        if guest_email:
            metadata["guest_email"] = guest_email
        if anonymous_session_id:
            metadata["anonymous_session_id"] = anonymous_session_id

        session_kwargs: dict[str, Any] = {
            "mode": "payment",
            "locale": "en",
            "line_items": [
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": product_name},
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }
            ],
            "metadata": metadata,
            "payment_intent_data": {
                "metadata": metadata,
                "statement_descriptor": "Lextract",
            },
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        if guest_email:
            # Pre-fill the email on the Stripe Checkout page
            session_kwargs["customer_email"] = guest_email

        try:
            return stripe.checkout.Session.create(**session_kwargs)
        except stripe.StripeError as exc:
            raise StripeError(str(exc), original_error=exc) from exc

    def verify_webhook_signature(self, payload: bytes, sig_header: str) -> Any:
        """Verify a Stripe webhook signature and return the parsed event.

        Args:
            payload: Raw request body bytes.
            sig_header: Value of the stripe-signature header.

        Returns:
            Stripe Event object.

        Raises:
            stripe.SignatureVerificationError: On invalid signature.
            ValueError: On invalid payload.
        """
        return stripe.Webhook.construct_event(  # type: ignore[no-untyped-call]  # stripe SDK Webhook.construct_event lacks type stubs
            payload, sig_header, settings.stripe_webhook_secret
        )

    def get_session(self, session_id: str) -> Any:
        """Retrieve a Stripe Checkout Session by ID.

        Args:
            session_id: The Stripe Checkout Session ID.

        Returns:
            Stripe Checkout Session object.

        Raises:
            StripeError: On any Stripe API failure.
        """
        try:
            return stripe.checkout.Session.retrieve(session_id)
        except stripe.StripeError as exc:
            raise StripeError(str(exc), original_error=exc) from exc


_stripe_service: StripeService | None = None


def get_stripe_service() -> StripeService:
    """Return a singleton StripeService instance."""
    global _stripe_service  # noqa: PLW0603
    if _stripe_service is None:
        _stripe_service = StripeService()
    return _stripe_service


def reset_stripe_service() -> None:
    """Clear the cached StripeService instance. Used in tests."""
    global _stripe_service  # noqa: PLW0603
    _stripe_service = None
