"""
Rate limiting core — storage, limiter, and request key extraction.

Uses the `limits` library with Redis-backed storage so rate limit
counters are shared across all uvicorn workers and Railway replicas.
Falls back to in-memory storage when Redis is unavailable (dev/test).

Keys are derived from a SHA-256 hash of the full Bearer token (so the key
is stable per-token without decoding) or fall back to IP address.

Bug #52 fix: The previous implementation decoded the JWT payload without
signature verification and keyed on the `sub` claim. An attacker could craft
a fake JWT with a victim's sub to share the victim's rate-limit bucket.
Now we hash the raw token string — only someone with the actual signed token
can produce the same key.
"""

import hashlib
import logging

from limits import parse
from limits.storage import MemoryStorage, RedisStorage
from limits.strategies import MovingWindowRateLimiter

from app.core.config import settings

logger = logging.getLogger(__name__)

# Use Redis for rate limiting so counters are shared across workers/replicas.
# Fall back to MemoryStorage in dev/test or if Redis is unreachable at startup.
storage: MemoryStorage | RedisStorage
try:
    if settings.environment in ("development", "test"):
        storage = MemoryStorage()
    else:
        storage = RedisStorage(settings.redis_url)
except Exception:
    logger.error(
        "Redis unavailable for rate limiting — falling back "
        "to in-memory storage. Limits NOT shared across workers!"
    )
    try:
        import sentry_sdk

        sentry_sdk.capture_message(
            "Redis unavailable for rate limiting — falling back to MemoryStorage",
            level="error",
        )
    except ImportError:
        pass
    storage = MemoryStorage()

moving_window = MovingWindowRateLimiter(storage)

_is_test_env = settings.environment in ("development", "test")
USER_RATE_LIMIT = parse(
    "1000 per 1 minute" if _is_test_env else f"{settings.rate_limit_auth} per 1 minute"
)
UNAUTH_RATE_LIMIT = parse(
    "100 per 1 minute" if _is_test_env else f"{settings.rate_limit_anon} per 1 minute"
)


def extract_request_key(authorization: str | None, client_host: str) -> str:
    """Extract a rate-limiting key from the request.

    Hashes the full Bearer token string so the key is stable per-token
    without requiring signature verification. Falls back to IP address
    if no valid Bearer token is present.

    Bug #52: Do NOT decode the JWT payload — an attacker could craft a token
    with any sub value to target another user's rate-limit bucket.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        return f"token:{token_hash}"
    return f"ip:{client_host}"
