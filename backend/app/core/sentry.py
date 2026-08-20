"""Sentry error tracking integration for FastAPI.

Initializes Sentry SDK with FastAPI integration, PII scrubbing,
and user context attachment for authenticated requests.
"""

import logging
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration

logger = logging.getLogger(__name__)

# Headers that contain sensitive information and should be scrubbed
_SENSITIVE_HEADERS = frozenset(
    {
        "authorization",
        "cookie",
        "referer",
        "referrer",
        "set-cookie",
        "x-api-key",
        "x-forwarded-for",
        "x-forwarded-uri",
        "x-original-url",
        "x-rewrite-url",
    }
)

_SENSITIVE_REQUEST_FIELDS = frozenset(
    {
        "query_string",
        "data",
        "cookies",
        "url",
    }
)

_SENSITIVE_ENV_FIELDS = frozenset(
    {
        "REMOTE_ADDR",
        "REMOTE_HOST",
    }
)


def scrub_sensitive_data(
    event: dict[str, Any], hint: dict[str, Any]
) -> dict[str, Any] | None:
    """Remove PII and sensitive values from Sentry events before sending.

    Scrubs Authorization, Cookie, Set-Cookie, and other sensitive headers.
    """
    request = event.get("request")
    if request is not None:
        for field_name in _SENSITIVE_REQUEST_FIELDS:
            if field_name in request:
                request[field_name] = "[Filtered]"

        headers = request.get("headers")
        if headers is not None:
            for header_name in list(headers.keys()):
                if header_name.lower() in _SENSITIVE_HEADERS:
                    headers[header_name] = "[Filtered]"

        env = request.get("env")
        if env is not None:
            for field_name in list(env.keys()):
                if field_name in _SENSITIVE_ENV_FIELDS:
                    env[field_name] = "[Filtered]"

    user = event.get("user")
    if user is not None:
        user_id = user.get("id")
        event["user"] = {"id": user_id} if user_id is not None else {}

    return event


def init_sentry(
    dsn: str | None,
    environment: str = "production",
    traces_sample_rate: float = 0.2,
) -> bool:
    """Initialize Sentry SDK for FastAPI error tracking.

    Args:
        dsn: Sentry Data Source Name. If empty or None, Sentry is not initialized.
        environment: Deployment environment name (e.g., "production", "staging").
        traces_sample_rate: Fraction of transactions to send for performance monitoring.

    Returns:
        True if Sentry was initialized, False if skipped (no DSN).
    """
    if not dsn:
        logger.info("Sentry DSN not configured — error tracking disabled")
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        traces_sample_rate=traces_sample_rate,
        integrations=[
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes=set(range(500, 600)),
            ),
            CeleryIntegration(monitor_beat_tasks=False),
        ],
        before_send=scrub_sensitive_data,  # type: ignore[arg-type]  # Sentry SDK typing expects Event protocol, dict[str, Any] is compatible at runtime
        send_default_pii=False,
    )
    logger.info(
        "Sentry initialized",
        extra={"environment": environment, "traces_sample_rate": traces_sample_rate},
    )
    return True


def set_user_context(
    user_id: str | None,
    email: str | None = None,
) -> None:
    """Attach or clear user context on the current Sentry scope.

    Args:
        user_id: The authenticated user's ID. Pass None to clear context.
        email: Optional user email for richer error reports.
    """
    if user_id is None:
        sentry_sdk.set_user(None)
        return

    sentry_sdk.set_user({"id": user_id})


def capture_reportable_exception(
    exc: BaseException,
    *,
    surface: str,
    route: str,
    status_code: int,
    request_id: str | None,
    handled: bool,
    area: str | None = None,
    operation: str | None = None,
    external_service: str | None = None,
) -> str | None:
    """Capture an unexpected app failure with consistent, scrubbed tags."""
    with sentry_sdk.push_scope() as scope:
        tags = {
            "surface": surface,
            "area": area,
            "route": route,
            "status_code": str(status_code),
            "request_id": request_id,
            "handled": str(handled).lower(),
            "operation": operation,
            "external_service": external_service,
        }
        for key, value in tags.items():
            if value is not None:
                scope.set_tag(key, value)
        return sentry_sdk.capture_exception(exc)
