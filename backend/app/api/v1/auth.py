"""Auth API endpoints.

With Neon Auth (managed Better Auth), signup/login/refresh are handled
entirely on the frontend via the Neon Auth SDK. The backend provides:
- POST /auth/sync-user — upsert user row after frontend signup
- POST /auth/anonymous — create anonymous session for upload-first flow
- PATCH /auth/anonymous/email — save email on anonymous session (email gate)
- POST /auth/link — link anonymous session to authenticated user
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

import sentry_sdk
from fastapi import APIRouter, HTTPException, Request, status

from app.core.dependencies import SESSION_TOKEN_HEADER, CurrentUser
from app.database.client import NeonClientManager
from app.schemas.auth import (
    AnonymousEmailRequest,
    AnonymousEmailResponse,
    AnonymousSessionResponse,
    LinkSessionRequest,
    LinkSessionResponse,
    SyncUserRequest,
    SyncUserResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

ANONYMOUS_SESSION_TTL_HOURS = 72


@router.post("/sync-user", response_model=SyncUserResponse)
async def sync_user(
    body: SyncUserRequest,
    user: CurrentUser,
) -> SyncUserResponse:
    """Create or update the public.users row after frontend signup.

    Called by the frontend after Neon Auth signup/login to ensure the
    user row exists in the public.users table. The user_id comes from
    the JWT sub claim (validated by the CurrentUser dependency).
    """
    admin_client = NeonClientManager.get_service_client()
    user_id = str(user.id)

    # Bug #47: Use the email from the verified JWT claims, not body.email.
    # body.email is user-supplied and could spoof any email address.
    # user.email comes from the validated JWT sub/email claim.
    upsert_data: dict[str, Any] = {
        "id": user_id,
        "email": user.email,
    }
    if body.full_name is not None:
        upsert_data["full_name"] = body.full_name

    try:
        admin_client.table("users").upsert(
            upsert_data,
            on_conflict="id",
        ).execute()
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        logger.error("Failed to sync user row: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync user profile",
        )

    return SyncUserResponse(
        synced=True,
        user_id=user_id,
    )


@router.post(
    "/anonymous",
    response_model=AnonymousSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_anonymous_session() -> AnonymousSessionResponse:
    """Create an anonymous session for upload-first flow.

    Generates a UUID session token, stores it in the anonymous_sessions
    table with a 72-hour TTL, and returns the token.
    """
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(UTC) + timedelta(hours=ANONYMOUS_SESSION_TTL_HOURS)

    admin_client = NeonClientManager.get_service_client()
    try:
        admin_client.table("anonymous_sessions").insert(
            {
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
            }
        ).execute()
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        logger.error("Failed to create anonymous session: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session",
        )

    return AnonymousSessionResponse(
        session_token=session_token,
        expires_at=expires_at.isoformat(),
    )


@router.patch("/anonymous/email", response_model=AnonymousEmailResponse)
async def save_anonymous_email(
    body: AnonymousEmailRequest,
    request: Request,
) -> AnonymousEmailResponse:
    """Save an email address on an anonymous session for lead capture.

    Used by the email gate on the results page. Requires a valid
    X-Session-Token header to identify the anonymous session.
    """
    session_token = request.headers.get(SESSION_TOKEN_HEADER)
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Session-Token header required",
        )

    admin_client = NeonClientManager.get_service_client()
    now_iso = datetime.now(UTC).isoformat()

    try:
        result = (
            admin_client.table("anonymous_sessions")
            .update({"email": body.email})
            .eq("session_token", session_token)
            .is_("linked_user_id", "null")
            .gt("expires_at", now_iso)
            .execute()
        )
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        logger.error("Failed to save email on anonymous session: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save email",
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anonymous session not found or already linked",
        )

    return AnonymousEmailResponse(updated=True)


@router.post("/link", response_model=LinkSessionResponse)
async def link_session(
    body: LinkSessionRequest,
    user: CurrentUser,
) -> LinkSessionResponse:
    """Link an anonymous session to the authenticated user's account.

    Transfers any extractions from the anonymous session to the user
    and marks the session as linked.
    """
    logger.info("Session link requested for user %s", user.id)
    admin_client = NeonClientManager.get_service_client()

    # Find the anonymous session
    result = (
        admin_client.table("anonymous_sessions")
        .select("id, session_token, linked_user_id, expires_at")
        .eq("session_token", body.session_token)
        .is_("linked_user_id", "null")
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anonymous session not found or already linked",
        )

    session_row = cast(list[dict[str, Any]], result.data)[0]
    session_id = session_row["id"]
    logger.info("Found anonymous session %s for linking", session_id)

    # Check expiry — ensure both sides are timezone-aware before comparing.
    # datetime.fromisoformat() on a string without timezone info (e.g., from
    # older Neon rows) returns a naive datetime; comparing it to UTC-aware
    # datetime.now(UTC) raises TypeError.  Attach UTC if tzinfo is missing.
    expires_at_raw = datetime.fromisoformat(str(session_row["expires_at"]))
    expires_at = (
        expires_at_raw
        if expires_at_raw.tzinfo is not None
        else expires_at_raw.replace(tzinfo=UTC)
    )
    if datetime.now(UTC) >= expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Anonymous session has expired",
        )

    # Race-safe CAS (Compare-And-Swap) + idempotent fallback pattern:
    #
    # 1. UPDATE ... WHERE linked_user_id IS NULL acts as an atomic CAS.
    #    If another request links the session concurrently, this returns
    #    empty data (no rows matched the WHERE).
    #
    # 2. On CAS failure (empty data), we check who won the race:
    #    - If the current user already owns the link, treat as idempotent
    #      success (safe retry / duplicate request).
    #    - If a different user owns it, return 409 Conflict.
    #
    # This avoids a separate SELECT+UPDATE race and handles retries
    # without requiring distributed locks or serializable isolation.
    link_result = (
        admin_client.table("anonymous_sessions")
        .update({"linked_user_id": str(user.id)})
        .eq("id", str(session_id))
        .is_("linked_user_id", "null")
        .execute()
    )
    if not link_result.data:
        # CAS failed — check if this user already linked it (idempotent retry)
        existing = (
            admin_client.table("anonymous_sessions")
            .select("linked_user_id")
            .eq("id", str(session_id))
            .maybe_single()
            .execute()
        )
        existing_row = cast(dict[str, Any] | None, existing.data)
        if existing_row and existing_row.get("linked_user_id") == str(user.id):
            logger.warning(
                "Session %s already linked to user %s",
                session_id,
                existing_row.get("linked_user_id"),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Session was linked by another user — please try again",
            )

    # Transfer extractions from anonymous session to user.
    # Ownership invariant: an extraction has exactly one owner. Clear
    # anonymous_session_id at the same time so the row can never be reached via
    # both ownership paths — notably the ``extractions_select_own_anon`` RLS
    # policy keys off anonymous_session_id without checking linked_user_id, so a
    # stale value would be a latent over-grant. This mirrors the webhook
    # guest-provisioning path (_provision_guest_user).
    transfer_result = (
        admin_client.table("extractions")
        .update(
            {
                "user_id": str(user.id),
                "anonymous_session_id": None,
                "updated_at": datetime.now(UTC).isoformat(),
            }
        )
        .eq("anonymous_session_id", str(session_id))
        .is_("user_id", "null")
        .execute()
    )

    transferred = len(transfer_result.data) if transfer_result.data else 0

    logger.info(
        "Linked session %s to user %s, transferred %d extractions",
        session_id,
        user.id,
        transferred,
    )

    return LinkSessionResponse(
        linked=True,
        extractions_transferred=transferred,
    )
