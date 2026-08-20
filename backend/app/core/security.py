"""JWT validation via Neon Auth (Better Auth) RS256 public key.

Fetches the JWKS from Neon Auth's well-known endpoint, caches the public
key, and provides verify_jwt() for token validation.
"""

import logging
import time
from typing import Any

import httpx
import jwt
from jwt import PyJWK, PyJWKClient

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache JWKS for 1 hour to avoid hammering the auth service on every request
_JWKS_CACHE_TTL_SECONDS = 3600


class JWKSCache:
    """Thread-safe JWKS cache with TTL-based refresh."""

    def __init__(self) -> None:
        self._jwk_client: PyJWKClient | None = None
        self._cached_at: float = 0.0

    @property
    def jwks_url(self) -> str:
        """Return the JWKS URL for Neon Auth.

        Uses NEON_JWKS_URL directly when set (preferred in production).
        Falls back to constructing the URL from neon_auth_base_url.
        """
        if settings.neon_jwks_url:
            return settings.neon_jwks_url
        base = settings.neon_auth_base_url.rstrip("/")
        return f"{base}/api/auth/.well-known/jwks.json"

    def get_signing_key(self, token: str) -> PyJWK:
        """Get the signing key for the given token, refreshing cache if stale."""
        now = time.monotonic()
        if (
            self._jwk_client is None
            or (now - self._cached_at) > _JWKS_CACHE_TTL_SECONDS
        ):
            self._jwk_client = PyJWKClient(
                self.jwks_url,
                cache_keys=True,
                lifespan=_JWKS_CACHE_TTL_SECONDS,
            )
            self._cached_at = now

        return self._jwk_client.get_signing_key_from_jwt(token)

    def reset(self) -> None:
        """Clear the cached JWKS client. Used in tests."""
        self._jwk_client = None
        self._cached_at = 0.0


# Module-level singleton
jwks_cache = JWKSCache()


class AuthenticationError(Exception):
    """Raised when JWT validation fails."""

    def __init__(self, detail: str = "Authentication required") -> None:
        self.detail = detail
        super().__init__(detail)


class AuthServiceUnavailableError(Exception):
    """Raised when the auth service cannot be reached to validate a session.

    Distinguishes a transport-level failure (network down, all candidate
    auth endpoints unreachable) from a positive "invalid session" response.
    Callers map this to HTTP 503 so clients can retry, instead of forcing
    a 401 sign-out flow on what is really a backend outage.
    """

    def __init__(self, detail: str = "Authentication service unavailable") -> None:
        self.detail = detail
        super().__init__(detail)


def verify_jwt(token: str) -> dict[str, Any]:
    """Validate a Neon Auth (Better Auth) RS256 JWT and return its payload.

    Better Auth JWTs do not include an audience claim, so audience validation
    is disabled. We still require sub, exp, and iat claims.

    Args:
        token: The raw JWT string (without "Bearer " prefix).

    Returns:
        The decoded JWT payload as a dict.

    Raises:
        AuthenticationError: On any validation failure (expired, invalid
            signature, malformed, etc.).
    """
    try:
        signing_key = jwks_cache.get_signing_key(token)
        payload: dict[str, Any] = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "EdDSA"],
            options={
                "require": ["sub", "exp", "iat"],
                "verify_exp": True,
                "verify_aud": False,
            },
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.InvalidAudienceError:
        raise AuthenticationError("Invalid token audience")
    except jwt.DecodeError:
        raise AuthenticationError("Invalid token format")
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError(f"Invalid token: {exc}")
    except Exception as exc:
        logger.warning("JWT validation error: %s: %s", type(exc).__name__, exc)
        raise AuthenticationError("Token validation failed")


def _session_validation_urls() -> list[str]:
    """Return candidate session validation endpoints in preferred order."""
    urls = [f"{settings.neon_auth_base_url.rstrip('/')}/get-session"]

    if settings.neon_jwks_url:
        jwks_suffix = "/.well-known/jwks.json"
        jwks_url = settings.neon_jwks_url.rstrip("/")
        if jwks_url.endswith(jwks_suffix):
            urls.append(f"{jwks_url.removesuffix(jwks_suffix)}/get-session")

    frontend_url = settings.frontend_url.rstrip("/")
    if frontend_url:
        urls.append(f"{frontend_url}/api/auth/get-session")

    deduped: list[str] = []
    for url in urls:
        if url not in deduped:
            deduped.append(url)
    return deduped


async def verify_neon_session(token: str) -> dict[str, str]:
    """Validate an opaque Neon Auth (Better Auth) session token via the auth server API.

    Called as a fallback when the token fails JWT decode — Neon Auth issues
    opaque session tokens by default; JWTs are only issued for anonymous access.

    Args:
        token: The raw session token string (without "Bearer " prefix).

    Returns:
        A dict with "user_id" and "email" keys.

    Raises:
        AuthenticationError: If the token is invalid or the auth server is unreachable.
    """
    try:
        transport_error: httpx.HTTPError | None = None
        any_positive_response = False
        async with httpx.AsyncClient(timeout=5.0) as client:
            for url in _session_validation_urls():
                try:
                    resp = await client.get(
                        url,
                        headers={"Cookie": f"__Secure-neon-auth.session_token={token}"},
                    )
                except httpx.HTTPError as exc:
                    transport_error = exc
                    logger.info(
                        "Neon session endpoint unavailable: %s", type(exc).__name__
                    )
                    continue
                # We received an HTTP response — auth service is reachable.
                any_positive_response = True
                if resp.status_code == 200:
                    break
            else:
                # All candidates exhausted without a 200 response.
                # If we never got ANY HTTP response, this is a transport-level
                # outage — surface a distinct exception so callers can return
                # 503 instead of 401. Only treat as "Invalid session" when the
                # auth service positively replied non-200.
                if not any_positive_response and transport_error is not None:
                    raise AuthServiceUnavailableError(
                        "Auth service unreachable"
                    ) from transport_error
                raise AuthenticationError("Invalid session token")

        data: dict[str, Any] = resp.json()
        user: dict[str, Any] = data.get("user") or {}
        session: dict[str, Any] = data.get("session") or {}
        user_id: str | None = user.get("id") or session.get("userId")
        if not user_id:
            raise AuthenticationError("Session response missing user ID")
        return {"user_id": str(user_id), "email": str(user.get("email", ""))}
    except (AuthenticationError, AuthServiceUnavailableError):
        raise
    except Exception as exc:
        logger.warning("Neon session validation error: %s: %s", type(exc).__name__, exc)
        raise AuthenticationError("Session validation failed")
