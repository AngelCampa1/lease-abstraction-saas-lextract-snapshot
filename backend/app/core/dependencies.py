"""FastAPI dependency injection providers.

Implements the 3-state auth model:
  1. Authenticated User - Bearer JWT validated via JWKS
  2. Anonymous Session - X-Session-Token header (72h TTL)
  3. Unauthenticated - no credentials
"""

import logging
from datetime import UTC, datetime
from typing import Annotated, Any, cast

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import (
    AuthenticationError,
    AuthServiceUnavailableError,
    verify_jwt,
    verify_neon_session,
)
from app.core.sentry import set_user_context
from app.database.client import (
    NeonClientManager,
    NeonDB,
    get_authenticated_client,
    get_db_admin,
)
from app.models.user import AnonymousSession, User

logger = logging.getLogger(__name__)

# Security scheme for OpenAPI docs (auto_error=False so we handle missing token)
security = HTTPBearer(auto_error=False)

SESSION_TOKEN_HEADER = "x-session-token"


def get_db() -> NeonDB:
    """Return the service role Neon client (delegates to NeonClientManager).

    WARNING: This client uses the service role key and bypasses database-level
    RLS. All user-scoped queries MUST manually add ``.eq("user_id", user_id)``
    (or the equivalent ownership filter) to enforce row-level access control
    at the application layer. Failing to do so will expose data across users.
    """
    return NeonClientManager.get_service_client()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> User:
    """Validate Bearer JWT and return the current authenticated user.

    Steps:
    1. Extract token from Authorization header.
    2. Validate JWT via JWKS (RS256 signature + expiry + audience).
    3. Fetch the user's row from the users table using a per-request
       authenticated client (so RLS sees auth.uid()).
    4. Return a User model.

    Raises:
        HTTPException: 401 on any failure.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    user_id: str | None = None
    jwt_email: str | None = None
    jwt_name: str | None = None
    try:
        payload = verify_jwt(token)
        sub = payload.get("sub")
        user_id = str(sub) if sub is not None else None
        jwt_email = str(payload["email"]) if payload.get("email") else None
        jwt_name = str(payload["name"]) if payload.get("name") else None
    except AuthenticationError as jwt_exc:
        # Opaque session token (Neon Auth default) — validate via session API
        try:
            session_data = await verify_neon_session(token)
            user_id = session_data["user_id"]
            jwt_email = session_data.get("email")
        except AuthServiceUnavailableError as svc_exc:
            # All session-validation endpoints failed with transport errors.
            # This is an upstream outage — fail closed with 503 so clients
            # know to retry, instead of forcing a sign-out on a valid token.
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=svc_exc.detail,
            ) from svc_exc
        except AuthenticationError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=jwt_exc.detail,
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    set_user_context(user_id=user_id)

    try:
        rls_client = get_authenticated_client(token)
        columns = (
            "id, email, full_name, company, role,"
            " credits_balance, stripe_customer_id, created_at, updated_at, deleted_at"
        )
        result = (
            rls_client.table("users")
            .select(columns)
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )

        if result.data is None:
            # First-time login: auto-provision the users row from JWT claims.
            # This handles users who signed up when the backend was unavailable
            # or when sync-user was never called.
            upsert_data: dict[str, Any] = {"id": user_id}
            if jwt_email:
                upsert_data["email"] = jwt_email
            if jwt_name:
                upsert_data["full_name"] = jwt_name
            rls_client.table("users").upsert(upsert_data, on_conflict="id").execute()
            result = (
                rls_client.table("users")
                .select(columns)
                .eq("id", user_id)
                .single()
                .execute()
            )
            logger.info("Auto-provisioned users row for %s", user_id)

        user_data = dict(cast(dict[str, Any], result.data))

        # A soft-deleted account must not be able to authenticate. The DELETE
        # /user endpoint only tombstones the row (sets deleted_at); the upstream
        # auth provider may still hold a valid session, so we enforce the
        # lockout here. Returning 401 stops a deleted user from reaching any
        # protected resource and prevents the auto-provision path above from
        # silently resurrecting a tombstoned account.
        if user_data.get("deleted_at") is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account has been deleted",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # deleted_at is an auth-layer concern, not part of the public User model.
        user_data.pop("deleted_at", None)
        return User(**user_data)

    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("User lookup failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    request: Request,
) -> User | AnonymousSession | None:
    """Return the caller's identity, or None if unauthenticated.

    Priority:
    1. Bearer JWT -> authenticated User
    2. X-Session-Token header -> AnonymousSession
    3. None (unauthenticated)

    Does NOT raise on missing credentials - returns None instead.
    When a Bearer token IS provided, it must be valid (raises 401 if not).
    """
    # 1. JWT path - if provided, must be valid
    if credentials is not None:
        return await get_current_user(credentials)

    # 2. Session token path
    session_token = request.headers.get(SESSION_TOKEN_HEADER)
    if session_token:
        session = await _lookup_anonymous_session(session_token)
        if session is not None:
            return session

    # 3. Unauthenticated
    return None


async def _lookup_anonymous_session(
    session_token: str,
) -> AnonymousSession | None:
    """Look up an active anonymous session by its token.

    Returns None if not found, expired, or already linked.
    """
    admin_client = NeonClientManager.get_service_client()
    try:
        now_iso = datetime.now(UTC).isoformat()
        result = (
            admin_client.table("anonymous_sessions")
            .select("id, session_token, linked_user_id, expires_at, created_at")
            .eq("session_token", session_token)
            .is_("linked_user_id", "null")
            .gt("expires_at", now_iso)
            .limit(1)
            .execute()
        )
        if result.data:
            rows = cast(list[dict[str, Any]], result.data)
            return AnonymousSession(**rows[0])
    except Exception as exc:
        logger.warning(
            "Anonymous session lookup failed: %s: %s", type(exc).__name__, exc
        )

    return None


# Type aliases for clean dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | AnonymousSession | None, Depends(get_optional_user)]

__all__ = [
    "CurrentUser",
    "OptionalUser",
    "SESSION_TOKEN_HEADER",
    "get_authenticated_client",
    "get_current_user",
    "get_db",
    "get_db_admin",
    "get_optional_user",
]
