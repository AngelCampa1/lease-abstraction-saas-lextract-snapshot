"""Lextract.io FastAPI application entry point."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.error_handlers import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import (
    CorrelationIdMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.sentry import init_sentry

# Initialize Sentry early (before app creation) so it captures all errors
init_sentry(dsn=settings.sentry_dsn, environment=settings.environment)

configure_logging(log_level=settings.log_level, log_format=settings.log_format)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup and shutdown events."""
    logger.info(
        "Lextract API starting",
        extra={"environment": settings.environment},
    )
    yield
    logger.info("Lextract API shutting down")


def create_app() -> FastAPI:
    """Application factory — returns a configured FastAPI instance."""
    expose_openapi = settings.debug and settings.environment != "production"
    app = FastAPI(
        title=settings.app_name,
        description="AI-powered commercial lease abstraction.",
        version="1.0.0",
        openapi_url="/openapi.json" if expose_openapi else None,
        docs_url="/docs" if expose_openapi else None,
        redoc_url="/redoc" if expose_openapi else None,
        lifespan=lifespan,
    )
    register_error_handlers(app)

    # Middleware registration order (Starlette reverses — last added runs first):
    # SecurityHeaders added first → innermost → runs last on request
    # RateLimit added second
    # CorrelationId added third
    # CORS added last → outermost → runs first on request
    #
    # IMPORTANT: CORSMiddleware must be outermost (added last) so it can
    # intercept OPTIONS preflights before any BaseHTTPMiddleware subclass runs.
    # When CORSMiddleware is wrapped inside BaseHTTPMiddleware, it cannot
    # intercept OPTIONS requests and preflights return 405 without CORS headers.
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(CorrelationIdMiddleware)

    # allow_origin_regex is only applied in dev/test environments.
    # Including it unconditionally allows any localhost origin to make
    # credentialed requests in production, bypassing the whitelist.
    #
    # allow_headers must be an explicit list (not ["*"]) when allow_credentials=True.
    # Per the CORS spec, browsers reject responses with Access-Control-Allow-Headers: *
    # when the request is credentialed. Starlette 0.41+ handles this by reflecting the
    # request headers, but using an explicit list is safer and avoids edge cases.
    cors_kwargs: dict[str, Any] = {
        "allow_origins": settings.cors_origins,
        "allow_credentials": True,
        "allow_methods": ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
        "allow_headers": [
            "Authorization",
            "Content-Type",
            "X-Session-Token",
            "X-Correlation-ID",
            "X-Request-ID",
        ],
        "expose_headers": ["X-Correlation-ID"],
    }
    if settings.environment in ("development", "test"):
        cors_kwargs["allow_origin_regex"] = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

    app.add_middleware(CORSMiddleware, **cors_kwargs)

    app.include_router(v1_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["System"])
    async def health_check() -> dict[str, Any]:
        """Shallow health check for load balancers."""
        return {"status": "ok"}

    @app.get("/health/ready", tags=["System"])
    async def health_ready() -> dict[str, Any]:
        """Shallow readiness probe — returns ok if the service process is up."""
        return {"status": "ok"}

    return app


# Module-level application instance (used by uvicorn)
app = create_app()
