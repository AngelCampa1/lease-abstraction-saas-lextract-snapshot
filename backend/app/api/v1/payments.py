"""Payment and credit endpoints for Lextract.

Provides checkout session creation, credit usage, balance queries,
and payment history. Authenticated users always get the full flow;
anonymous guests can pay with just an email (guest checkout).
"""

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, OptionalUser
from app.core.exceptions import (
    ConflictError,
    InsufficientCreditsError,
    NotFoundError,
    StripeError,
)
from app.database.client import NeonClientManager
from app.models.user import AnonymousSession, User
from app.schemas.credit import (
    CreditBalanceResponse,
    CreditTransactionResponse,
    PaymentHistoryResponse,
    PaymentRecord,
    UseCreditRequest,
    UseCreditResponse,
)
from app.schemas.payment import CheckoutRequest, CheckoutResponse
from app.services.credit_service import get_credit_service
from app.services.stripe_service import get_stripe_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Create a Stripe Checkout Session",
)
async def create_checkout(
    body: CheckoutRequest,
    caller: OptionalUser,
) -> CheckoutResponse:
    """Create a Stripe Checkout Session for a one-time purchase.

    Accepts both authenticated users and anonymous guests.  For guests,
    ``guest_email`` must be provided; the email is stored on the extraction row
    and forwarded to Stripe so the receipt is delivered automatically.

    Returns the Stripe Checkout URL and session ID for client-side redirect.
    """
    # Determine who is checking out
    is_authenticated_user = isinstance(caller, User)
    is_anonymous_session = isinstance(caller, AnonymousSession)
    is_guest = is_anonymous_session and body.guest_email is not None

    if not is_authenticated_user and not is_guest:
        # Unauthenticated and no guest_email — require auth
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required or guest_email must be provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stripe_svc = get_stripe_service()

    # For authenticated users, use their user_id.
    # For guests, user_id is empty — the webhook will create the account.
    # Use isinstance narrowing so mypy can resolve .id safely.
    user_id = str(caller.id) if isinstance(caller, User) else ""
    guest_email = body.guest_email if is_guest else None
    anonymous_session_id = (
        str(caller.id) if isinstance(caller, AnonymousSession) and is_guest else None
    )

    if body.product_type == "single" and not body.extraction_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="extraction_id is required for single purchases",
        )

    # Validate extraction ownership before placing the ID in Stripe metadata.
    if body.product_type == "single" and body.extraction_id:
        db = NeonClientManager.get_service_client()
        now = datetime.now(UTC).isoformat()
        if is_authenticated_user:
            owned = (
                db.table("extractions")
                .select("id")
                .eq("id", body.extraction_id)
                .eq("user_id", user_id)
                .eq("payment_status", "unpaid")
                .maybe_single()
                .execute()
            )
            if not owned.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Extraction not found",
                )
        elif is_guest:
            update_result = (
                db.table("extractions")
                .update({"guest_email": guest_email, "updated_at": now})
                .eq("id", body.extraction_id)
                .eq("anonymous_session_id", anonymous_session_id)
                .is_("user_id", "null")
                .eq("payment_status", "unpaid")
                .execute()
            )
            if not update_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Extraction not found",
                )

    try:
        session = stripe_svc.create_checkout_session(
            user_id=user_id,
            product_type=body.product_type,
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            extraction_id=body.extraction_id,
            guest_email=guest_email,
            anonymous_session_id=anonymous_session_id,
        )
    except StripeError as exc:
        logger.error("Stripe checkout creation failed: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error — please try again",
        ) from exc

    return CheckoutResponse(
        checkout_url=str(session.url),
        session_id=str(session.id),
    )


@router.post(
    "/use-credit",
    response_model=UseCreditResponse,
    status_code=status.HTTP_200_OK,
    summary="Use one credit to unlock an extraction",
)
async def use_credit(
    body: UseCreditRequest,
    user: CurrentUser,
) -> UseCreditResponse:
    """Deduct one credit and mark the extraction as paid.

    Returns 402 if the user has insufficient credits.
    Returns 409 if a concurrent modification is detected.
    """
    credit_svc = get_credit_service()

    try:
        result = await credit_svc.use_credit(
            user_id=str(user.id),
            extraction_id=body.extraction_id,
        )
    except InsufficientCreditsError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=str(exc),
        ) from exc
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return UseCreditResponse(
        success=True,
        new_balance=result["new_balance"],
        extraction_id=result["extraction_id"],
    )


@router.get(
    "/credits",
    response_model=CreditBalanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current credit balance and recent transactions",
)
async def get_credits(
    user: CurrentUser,
) -> CreditBalanceResponse:
    """Return the user's credit balance and recent transactions."""
    credit_svc = get_credit_service()

    balance = credit_svc.get_balance(str(user.id))
    transactions = credit_svc.get_recent_transactions(str(user.id))

    return CreditBalanceResponse(
        balance=balance,
        recent_transactions=[
            CreditTransactionResponse(
                id=str(t["id"]),
                amount=t["amount"],
                balance_after=t["balance_after"],
                description=t["description"],
                created_at=t["created_at"],
            )
            for t in transactions
        ],
    )


@router.get(
    "/history",
    response_model=PaymentHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get paginated payment history",
    responses={
        200: {
            "description": "Paginated list of completed payments for the user.",
            "content": {
                "application/json": {
                    "example": {
                        "payments": [
                            {
                                "id": "11111111-1111-4111-a111-111111111111",
                                "payment_type": "single",
                                "amount_cents": 1500,
                                "currency": "usd",
                                "status": "completed",
                                "created_at": "2026-05-01T12:00:00Z",
                            },
                            {
                                "id": "22222222-2222-4222-a222-222222222222",
                                "payment_type": "credit_pack_5",
                                "amount_cents": 6000,
                                "currency": "usd",
                                "status": "completed",
                                "created_at": "2026-04-20T09:30:00Z",
                            },
                        ],
                        "total": 2,
                        "page": 1,
                        "page_size": 20,
                    }
                }
            },
        },
        401: {"description": "Authentication required."},
        422: {"description": "Invalid pagination parameters."},
    },
)
async def get_payment_history(
    user: CurrentUser,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> PaymentHistoryResponse:
    """Return paginated payment history for the authenticated user.

    Each row reflects an immutable Stripe-backed payment. Credit-pack
    purchases additionally appear as positive entries in the credit
    ledger (`GET /payments/credits`); single-extraction purchases do not
    grant credits and therefore do not produce ledger rows.
    """
    credit_svc = get_credit_service()

    payments, total = credit_svc.get_payment_history(
        user_id=str(user.id),
        page=page,
        page_size=page_size,
    )

    return PaymentHistoryResponse(
        payments=[
            PaymentRecord(
                id=str(p["id"]),
                payment_type=p["payment_type"],
                amount_cents=p["amount_cents"],
                currency=p.get("currency", "usd"),
                status=p["status"],
                created_at=p["created_at"],
            )
            for p in payments
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
