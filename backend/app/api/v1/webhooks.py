"""Stripe webhook handler for Lextract payment events.

Handles checkout.session.completed events with idempotency protection
via the stripe_webhook_events table. Adapted from CamAudit-v2 with the
critical bug fix: on processing failure, sets failed_at timestamp
instead of deleting the event row.
"""

import logging
import secrets
import string
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import stripe
from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError
from app.database.client import NeonClientManager
from app.services.analytics import capture_backend_event
from app.services.credit_service import get_credit_service
from app.services.stripe_service import get_stripe_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# Bug #46: Hardcode credit amounts — never trust metadata.credits from Stripe.
# Metadata is user-controlled and could be manipulated to award arbitrary credits.
CREDIT_PACK_AMOUNTS: dict[str, int] = {
    "credit_pack_5": 5,
    "credit_pack_10": 10,
}

# Bug #56 / M9: Exceptions that indicate bad/permanent input — do NOT re-raise
# so Stripe retries are suppressed for events that will never succeed.
# Transient errors (DB timeouts, network errors) propagate and return 500
# so Stripe retries the delivery.
# ConflictError (M9): concurrent update conflicts are permanent for a given event.
# NotFoundError: a referenced user/extraction that doesn't exist won't materialize
# on retry (the id comes from immutable Stripe metadata), so retrying is futile —
# fail permanently and record an audit trail instead of looping until Stripe gives up.
_PERMANENT_ERRORS = (ValueError, KeyError, ConflictError, NotFoundError)

_ALPHANUMERIC = string.ascii_letters + string.digits


def _generate_random_password(length: int = 32) -> str:
    """Generate a cryptographically random alphanumeric password."""
    return "".join(secrets.choice(_ALPHANUMERIC) for _ in range(length))


@router.post(
    "/stripe",
    status_code=status.HTTP_200_OK,
    summary="Handle Stripe webhook events",
)
async def handle_stripe_webhook(
    request: Request,
) -> dict[str, bool]:
    """Receive and process Stripe webhook events.

    1. Verify the webhook signature.
    2. Check idempotency via stripe_webhook_events table.
    3. Dispatch to the appropriate handler.
    4. Mark the event as processed (or failed on error).
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header",
        )

    stripe_svc = get_stripe_service()

    try:
        event = stripe_svc.verify_webhook_signature(payload, sig_header)
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload",
        ) from exc

    event_id: str = str(event.id)
    event_type: str = str(event.type)

    claimed = _claim_webhook_event(event_id, event_type)
    if not claimed:
        return {"received": True}

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(dict(event.data.object))
        # Mark event as complete only AFTER all side effects succeed.
        # Previously this ran before side effects, so a failure after
        # marking complete meant Stripe wouldn't retry the event.
        _complete_webhook_event(event_id)
    except _PERMANENT_ERRORS as exc:
        # Bug #56: Permanent errors (bad data/config) — mark failed, return 200
        # so Stripe stops retrying an event that will never succeed.
        logger.exception(
            "Webhook handler failed with permanent error, marking event as failed",
            extra={"event_id": event_id, "event_type": event_type},
        )
        _fail_webhook_event(event_id, exc)
    except Exception:
        # Bug #56: Transient errors (DB timeouts, network) — re-raise so
        # FastAPI returns 500 and Stripe retries the delivery.
        logger.exception(
            "Webhook handler failed with transient error",
            extra={"event_id": event_id, "event_type": event_type},
        )
        raise

    return {"received": True}


async def _handle_checkout_completed(session: dict[str, Any]) -> None:
    """Process a checkout.session.completed event.

    Parses metadata, records the payment, then:
    - single: marks extraction as paid and inserts a zero-credit ledger entry
    - credit_pack_5: adds 5 credits to the user's balance
    - credit_pack_10: adds 10 credits to the user's balance

    Guest checkout (guest_email in metadata):
    - No user_id in metadata; the webhook creates the account from guest_email.
    - After account creation, the extraction is linked to the new user.
    - A "complete your account" email is sent with a password-reset link.
    """
    metadata: dict[str, Any] = session.get("metadata") or {}
    stripe_session_id: str = str(session.get("id") or "")
    amount_total: int = int(session.get("amount_total") or 0)
    payment_intent_id: str = str(session.get("payment_intent") or "")
    user_id: str = str(metadata.get("user_id") or "")
    product_type: str = str(metadata.get("product_type") or "")
    extraction_id: str = str(metadata.get("extraction_id") or "")
    guest_email: str = str(metadata.get("guest_email") or "")
    anonymous_session_id: str = str(metadata.get("anonymous_session_id") or "")

    logger.info(
        "Checkout session completed",
        extra={
            "stripe_session_id": stripe_session_id,
            "user_id": user_id,
            "product_type": product_type,
            "amount_total": amount_total,
            "payment_intent_id": payment_intent_id,
            "is_guest": bool(guest_email),
        },
    )

    # Guest checkout: create or find user, then proceed with that user_id
    if guest_email and not user_id:
        if product_type == "single" and (not extraction_id or not anonymous_session_id):
            raise ValueError("guest checkout metadata missing extraction ownership")
        user_id = await _provision_guest_user(
            guest_email,
            extraction_id,
            anonymous_session_id=anonymous_session_id or None,
        )
        if not user_id:
            raise RuntimeError("Guest user provisioning failed")

    if not user_id:
        # H5: raise ValueError so Stripe stops retrying this event (it can never
        # succeed without a user_id); treated as permanent by _PERMANENT_ERRORS.
        raise ValueError("user_id missing in Stripe checkout metadata")

    credit_svc = get_credit_service()

    if product_type == "single":
        if not extraction_id:
            # Raise (permanent error) rather than silently returning: a silent
            # return marks the event complete, so Stripe never retries and the
            # payment is lost with no audit trail. Raising routes through
            # _fail_webhook_event, recording the failure for investigation —
            # matching how this handler treats every other missing-required-
            # metadata case (e.g. missing user_id below).
            raise ValueError(
                "single purchase metadata missing extraction_id - "
                "cannot mark any extraction paid"
            )

        # The unlock is idempotent and re-runs on every (possibly re-delivered)
        # Stripe event. The returned row carries created=True only when this
        # delivery actually recorded the payment, so we gate the analytics event
        # on it to avoid inflating revenue metrics on duplicate deliveries.
        single_result = credit_svc.record_single_payment_and_unlock(
            user_id=user_id,
            extraction_id=extraction_id,
            amount_cents=amount_total,
            stripe_session_id=stripe_session_id,
            stripe_payment_intent_id=payment_intent_id or None,
            guest_anonymous_session_id=anonymous_session_id if guest_email else None,
        )

        if not single_result.get("created", True):
            logger.info(
                "Single purchase already recorded for Stripe session %s — "
                "skipping duplicate analytics event",
                stripe_session_id,
            )
            return

        capture_backend_event(
            "payment_succeeded",
            distinct_id=user_id,
            properties={
                "user_id": user_id,
                "product_type": product_type,
                "amount_cents": amount_total,
                "credits_purchased": 0,
                "is_guest": bool(guest_email),
                "extraction_id": extraction_id,
                "stripe_session_id": stripe_session_id,
            },
        )
        return

    payment_row = credit_svc.record_payment(
        user_id=user_id,
        payment_type=product_type,
        amount_cents=amount_total,
        stripe_session_id=stripe_session_id,
        stripe_payment_intent_id=payment_intent_id or None,
    )
    payment_id: str = str(payment_row.get("id", ""))

    if product_type in ("credit_pack_5", "credit_pack_10"):
        pack_names = {
            "credit_pack_5": "5-credit pack purchase",
            "credit_pack_10": "10-credit pack purchase",
        }
        # Bug #46: Use hardcoded amounts — never trust metadata.credits.
        # add_credits is idempotent on payment_id, so we always call it rather
        # than gating on whether the payment row was just created. This
        # self-heals the case where a prior delivery recorded the payment but
        # failed before granting credits: the retry re-enters and the grant
        # finally lands. Duplicate deliveries return created=False below.
        credits_to_add = CREDIT_PACK_AMOUNTS[product_type]
        grant = await credit_svc.add_credits(
            user_id=user_id,
            amount=credits_to_add,
            payment_id=payment_id,
            description=pack_names[product_type],
        )
        if not grant.get("created", True):
            logger.info(
                "Credits already granted for Stripe session %s — "
                "skipping duplicate analytics event",
                stripe_session_id,
            )
            return
    else:
        # H6: raise ValueError so Stripe stops retrying (permanent error — no
        # product type change at retry time).
        raise ValueError(f"Unknown product_type in checkout metadata: {product_type!r}")

    capture_backend_event(
        "payment_succeeded",
        distinct_id=user_id,
        properties={
            "user_id": user_id,
            "product_type": product_type,
            "amount_cents": amount_total,
            "credits_purchased": CREDIT_PACK_AMOUNTS.get(product_type, 0),
            "is_guest": bool(guest_email),
            "extraction_id": extraction_id,
            "stripe_session_id": stripe_session_id,
        },
    )


async def _provision_guest_user(
    guest_email: str,
    extraction_id: str,
    anonymous_session_id: str | None = None,
) -> str:
    """Create or find the user account for a guest checkout.

    Looks up the guest_email in the users table:
    - If found: returns the existing user_id and links the extraction.
    - If not found: creates a new user via Better Auth admin API, inserts a
      row in public.users, and sends a "complete your account" email.

    Failure is logged but does NOT raise — the payment is already processed
    and we must return 200 to Stripe.  The guest keeps access via extraction_id.

    Returns the user_id string, or empty string on failure.
    """
    try:
        db = NeonClientManager.get_service_client()
        now = datetime.now(UTC).isoformat()

        # Check if a user row already exists for this email
        existing = (
            db.table("users")
            .select("id")
            .eq("email", guest_email)
            .maybe_single()
            .execute()
        )
        if existing and existing.data:
            row = dict(existing.data) if isinstance(existing.data, dict) else {}
            existing_user_id = str(row.get("id", ""))
            if existing_user_id and extraction_id and not anonymous_session_id:
                # Ownership invariant: an extraction has exactly one owner.
                # When attaching to a user, also clear anonymous_session_id
                # so a row can never be reached via both ownership paths.
                db.table("extractions").update(
                    {
                        "user_id": existing_user_id,
                        "anonymous_session_id": None,
                        "updated_at": now,
                    }
                ).eq("id", extraction_id).execute()
            logger.info(
                "Guest checkout: linked extraction to existing user %s",
                existing_user_id,
            )
            return existing_user_id

        # No existing user — create one via Better Auth admin API
        new_user_id = await _create_auth_user(guest_email)
        if not new_user_id:
            logger.error(
                "Guest checkout: failed to create auth user for %s", guest_email
            )
            return ""

        # Ensure the public.users row exists
        db.table("users").upsert(
            {"id": new_user_id, "email": guest_email},
            on_conflict="id",
        ).execute()

        # Link the extraction. Ownership invariant: clear anonymous_session_id
        # at the same time so the row has exactly one owner.
        if extraction_id and not anonymous_session_id:
            db.table("extractions").update(
                {
                    "user_id": new_user_id,
                    "anonymous_session_id": None,
                    "updated_at": now,
                }
            ).eq("id", extraction_id).execute()

        # Generate a password reset link and send the "complete your account" email
        await _send_guest_welcome_email(
            guest_email=guest_email,
            user_id=new_user_id,
            extraction_id=extraction_id,
        )

        logger.info(
            "Guest checkout: created account %s for %s", new_user_id, guest_email
        )
        return new_user_id

    except Exception:
        logger.exception(
            "Guest checkout: _provision_guest_user failed for %s", guest_email
        )
        return ""


async def _create_auth_user(email: str) -> str:
    """Create a new user in Better Auth via the admin API.

    Better Auth exposes a server-side user creation endpoint at
    ``/api/auth/admin/create-user``.  We call it with a random password
    since the guest will set their own via the password-reset link.

    Returns the new user's ID string, or empty string on failure.
    """
    base_url = settings.neon_auth_base_url.rstrip("/")
    url = f"{base_url}/api/auth/admin/create-user"
    random_password = _generate_random_password()
    new_user_id = str(uuid.uuid4())

    payload: dict[str, Any] = {
        "email": email,
        "password": random_password,
        "name": email.split("@")[0],
        "id": new_user_id,
        "emailVerified": True,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code in (200, 201):
            data: dict[str, Any] = resp.json()
            created_user: dict[str, Any] = data.get("user") or data
            auth_user_id = str(created_user.get("id", new_user_id))
            return auth_user_id
        logger.warning(
            "Better Auth create-user returned %d for %s: %s",
            resp.status_code,
            email,
            resp.text[:500],
        )
        return ""
    except Exception:
        logger.exception("Better Auth create-user request failed for %s", email)
        return ""


async def _generate_password_reset_url(email: str) -> str:
    """Request a password reset link from Better Auth.

    Returns the reset URL string, or an empty string on failure (in which
    case the caller omits the link and we still send the email without it).
    """
    base_url = settings.neon_auth_base_url.rstrip("/")
    url = f"{base_url}/api/auth/admin/generate-link"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url, json={"type": "reset-password", "email": email}
            )
        if resp.status_code in (200, 201):
            data: dict[str, Any] = resp.json()
            link = str(data.get("url") or data.get("link") or "")
            return link
        logger.warning(
            "Better Auth generate-link returned %d for %s",
            resp.status_code,
            email,
        )
    except Exception:
        logger.exception("Better Auth generate-link request failed for %s", email)

    # Fall back to the frontend password-reset page so the email is still useful
    frontend_url = settings.frontend_url.rstrip("/")
    return f"{frontend_url}/reset-password"


async def _send_guest_welcome_email(
    guest_email: str, user_id: str, extraction_id: str
) -> None:
    """Send the "complete your account" email after guest account creation.

    Wrapped in try/except — email failure must never fail the webhook.
    """
    try:
        from app.services.email import EmailService

        frontend_url = settings.frontend_url.rstrip("/")
        results_url = (
            f"{frontend_url}/results/{extraction_id}" if extraction_id else frontend_url
        )
        password_reset_url = await _generate_password_reset_url(guest_email)

        email_svc = EmailService(settings.resend_api_key)
        email_svc.send_complete_your_account(
            to=guest_email,
            results_url=results_url,
            password_reset_url=password_reset_url,
        )
    except Exception:
        logger.exception(
            "Failed to send complete-your-account email to %s", guest_email
        )


def _claim_webhook_event(event_id: str, event_type: str) -> bool:
    """Atomically claim a webhook event for processing.

    Uses INSERT and catches duplicate key errors to achieve idempotency.
    Returns True if this call successfully inserted the event (i.e., we
    claimed it), False if it was already claimed (in-progress, processed,
    or previously failed).

    Previously-failed events (failed_at IS NOT NULL) are skipped to
    prevent retry loops on poison-pill events.
    """
    db = NeonClientManager.get_service_client()

    try:
        db.table("stripe_webhook_events").insert(
            {
                "id": event_id,
                "event_type": event_type,
                "processed_at": None,
                "failed_at": None,
                "failure_reason": None,
                "claimed_at": datetime.now(UTC).isoformat(),
            },
        ).execute()
        # Insert succeeded — we claimed this event.
        return True
    except Exception as exc:
        # Check if this is a duplicate key violation (row already exists).
        exc_str = str(exc)
        if "duplicate" in exc_str.lower() or "23505" in exc_str:
            # Row already existed — check if it previously failed.
            existing = (
                db.table("stripe_webhook_events")
                .select("processed_at, failed_at, claimed_at")
                .eq("id", event_id)
                .maybe_single()
                .execute()
            )
            if existing and existing.data:
                row: dict[str, Any] = (
                    dict(existing.data) if isinstance(existing.data, dict) else {}
                )
                if row.get("failed_at") is not None:
                    logger.info(
                        "Skipping previously-failed webhook event %s",
                        event_id,
                    )
                    return False
                now = datetime.now(UTC)
                cutoff = now - timedelta(minutes=15)
                claimed_at = _parse_datetime(row.get("claimed_at"))
                claim_expired = claimed_at is None or claimed_at < cutoff
                if (
                    "processed_at" in row
                    and row.get("processed_at") is None
                    and claim_expired
                ):
                    claim_update = (
                        db.table("stripe_webhook_events")
                        .update({"claimed_at": now.isoformat()})
                        .eq("id", event_id)
                        .is_("processed_at", "null")
                        .is_("failed_at", "null")
                    )
                    if claimed_at is None:
                        claim_update = claim_update.is_("claimed_at", "null")
                    else:
                        claim_update = claim_update.lt("claimed_at", cutoff.isoformat())
                    claim_response = claim_update.execute()
                    if not claim_response.data:
                        return False
                    logger.info(
                        "Reprocessing expired webhook event claim %s",
                        event_id,
                    )
                    return True
            return False
        # Not a duplicate key error — re-raise as a transient failure.
        raise


def _complete_webhook_event(event_id: str) -> None:
    """Mark a webhook event as successfully processed."""
    db = NeonClientManager.get_service_client()
    db.table("stripe_webhook_events").update(
        {"processed_at": datetime.now(UTC).isoformat()}
    ).eq("id", event_id).execute()


def _parse_datetime(value: Any) -> datetime | None:
    """Parse an ISO datetime from Supabase JSON data."""
    if not isinstance(value, str) or not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _fail_webhook_event(event_id: str, exc: Exception) -> None:
    """Mark a webhook event as permanently failed.

    Preserves an audit trail and prevents Stripe retry loops for
    poison-pill events. The failed_at timestamp and failure_reason
    allow investigation without re-processing.

    This is the CamAudit-v2 bug fix: the original implementation
    deleted the event row on failure, losing the audit trail and
    allowing infinite retries.
    """
    db = NeonClientManager.get_service_client()
    db.table("stripe_webhook_events").update(
        {
            "failed_at": datetime.now(UTC).isoformat(),
            "failure_reason": str(exc)[:1000],
        }
    ).eq("id", event_id).execute()
