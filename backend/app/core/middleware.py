"""
Core middleware for Lextract.

Contains three middleware classes:
- CorrelationIdMiddleware: Generates / propagates X-Correlation-ID per request.
- SecurityHeadersMiddleware: Adds security headers to every response.
- RateLimitMiddleware: Enforces per-user (auth) and per-IP (anon) rate limits.

Middleware registration order (Starlette reverses — last added runs first):
    app.add_middleware(SecurityHeadersMiddleware)  # added first → innermost
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(CORSMiddleware, ...)        # added last → outermost

Execution order: CORS → CorrelationId → RateLimit → SecurityHeaders → Endpoint

CORSMiddleware MUST be outermost so it intercepts OPTIONS preflights before any
BaseHTTPMiddleware subclass. If CORSMiddleware is wrapped inside BaseHTTPMiddleware,
OPTIONS preflights bypass CORS handling and return 405 without CORS headers.
"""

import re
import time
import uuid

import sentry_sdk
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import correlation_id_var
from app.core.rate_limiting import (
    UNAUTH_RATE_LIMIT,
    USER_RATE_LIMIT,
    extract_request_key,
    moving_window,
)
from app.schemas.errors import ErrorResponse

CORRELATION_ID_HEADER = "X-Correlation-ID"
REQUEST_ID_HEADER = "X-Request-ID"
_UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

EXEMPT_PATHS = frozenset(
    [
        "/health",
        "/health/ready",
        "/docs",
        "/redoc",
        "/openapi.json",
        # Stripe webhooks must not be rate-limited: bursts of webhook deliveries
        # for the same event are normal and we cannot afford to drop payment events.
        "/api/v1/webhooks/stripe",
    ]
)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Manages request correlation IDs for distributed tracing."""

    def _get_safe_correlation_id(self, request: Request) -> str:
        incoming_id = request.headers.get(CORRELATION_ID_HEADER) or request.headers.get(
            REQUEST_ID_HEADER
        )
        if incoming_id is not None and _UUID_PATTERN.fullmatch(incoming_id.strip()):
            return str(uuid.UUID(incoming_id.strip()))

        return str(uuid.uuid4())

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        correlation_id = self._get_safe_correlation_id(request)
        request.state.correlation_id = correlation_id

        token = correlation_id_var.set(correlation_id)
        sentry_sdk.set_tag("correlation_id", correlation_id)
        try:
            response = await call_next(request)
            response.headers[CORRELATION_ID_HEADER] = correlation_id
            return response
        finally:
            correlation_id_var.reset(token)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all responses."""

    # Paths that serve Swagger/ReDoc UI — exempt from strict CSP since they
    # load inline scripts and CDN resources.
    _DOCS_PATHS = frozenset(["/docs", "/redoc", "/openapi.json"])

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        if request.url.path not in self._DOCS_PATHS:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self' https://*.neon.tech https://api.stripe.com; "
                "frame-ancestors 'none'"
            )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(self)"
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enforces per-user and per-IP request rate limits."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        # Prefer X-Forwarded-For for client IP when behind a proxy, falling
        # back to request.client.host, then "unknown". Without this, all
        # requests without request.client share a single "ip:unknown" bucket.
        # Trust assumption: Railway's reverse proxy strips client-supplied
        # X-Forwarded-For and sets the real client IP as the leftmost entry.
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else "unknown")
        )
        key = extract_request_key(
            request.headers.get("Authorization"),
            client_ip,
        )
        # extract_request_key() returns "token:<hash>" for authenticated requests
        # and "ip:<address>" for unauthenticated ones.  The prefix was previously
        # checked as "user:" which never matched, so all auth'd users hit the
        # anonymous 20 req/min limit instead of the 100 req/min auth limit.
        limit = USER_RATE_LIMIT if key.startswith("token:") else UNAUTH_RATE_LIMIT

        if not moving_window.hit(limit, key):
            stats = moving_window.get_window_stats(limit, key)
            retry_after = max(1, int(stats.reset_time - time.time()))
            error = ErrorResponse(
                status_code=429,
                message="Too many requests",
                detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
                path=str(request.url.path),
            )
            return JSONResponse(
                status_code=429,
                content=error.model_dump(mode="json"),
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
