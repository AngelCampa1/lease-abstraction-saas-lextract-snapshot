"""Central API error handlers with Sentry reporting policy."""

from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import correlation_id_var
from app.core.sentry import capture_reportable_exception
from app.schemas.errors import ErrorDetail, ErrorResponse, ValidationErrorResponse

SUPPORT_RETRY_DETAIL = (
    "Please try again. If this keeps happening, contact support with the tracking ID."
)
SAFE_5XX_DETAILS = frozenset(
    {
        "Service temporarily unavailable",
        "File upload failed — please try again",
        "Failed to create user profile",
        "Failed to create anonymous session",
        "Failed to save email",
        "Failed to load dashboard",
        "Failed to update profile",
    }
)


def _request_id(request: Request) -> str | None:
    state_value = getattr(request.state, "correlation_id", None)
    value = (
        state_value
        or correlation_id_var.get()
        or request.headers.get("X-Correlation-ID")
        or request.headers.get("X-Request-ID")
    )
    return value if value else None


def _json_error(error: ErrorResponse, status_code: int) -> JSONResponse:
    headers = {"X-Correlation-ID": error.request_id} if error.request_id else None
    return JSONResponse(
        status_code=status_code,
        content=error.model_dump(mode="json"),
        headers=headers,
    )


def _json_safe_ctx(ctx: Any) -> dict[str, Any] | None:
    if not isinstance(ctx, dict):
        return None
    safe: dict[str, Any] = {}
    for key, value in ctx.items():
        if value is None or isinstance(value, str | int | float | bool):
            safe[str(key)] = value
        else:
            safe[str(key)] = str(value)
    return safe


def _http_message(status_code: int, detail: Any) -> str:
    if status_code == status.HTTP_401_UNAUTHORIZED:
        return "Authentication required"
    if status_code == status.HTTP_403_FORBIDDEN:
        return "Access denied"
    if status_code == status.HTTP_404_NOT_FOUND:
        return str(detail) if isinstance(detail, str) else "Resource not found"
    if status_code == status.HTTP_409_CONFLICT:
        return str(detail) if isinstance(detail, str) else "Resource conflict"
    if status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return "Too many requests"
    if status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        return "Service temporarily unavailable"
    if status_code >= 500:
        return "Something went wrong"
    return str(detail) if isinstance(detail, str) and detail else "Invalid request"


def _safe_detail(status_code: int, detail: Any) -> str | None:
    if status_code < 500 and isinstance(detail, str) and detail:
        return detail
    if status_code >= 500:
        if isinstance(detail, str) and detail in SAFE_5XX_DETAILS:
            return detail
        return SUPPORT_RETRY_DETAIL
    return None


def _capture_http_exception(
    request: Request,
    exc: HTTPException,
    request_id: str | None,
) -> str | None:
    if exc.status_code < 500:
        return None
    return capture_reportable_exception(
        exc,
        surface="api",
        route=request.url.path,
        status_code=exc.status_code,
        request_id=request_id,
        handled=True,
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register consistent API error responses and Sentry capture policy."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        request_id = _request_id(request)
        tracking_id = _capture_http_exception(request, exc, request_id) or request_id
        error = ErrorResponse(
            status_code=exc.status_code,
            message=_http_message(exc.status_code, exc.detail),
            detail=_safe_detail(exc.status_code, exc.detail),
            request_id=request_id,
            path=request.url.path,
            tracking_id=tracking_id,
        )
        return _json_error(error, exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        request_id = _request_id(request)
        errors = [
            ErrorDetail(
                loc=list(error.get("loc", [])),
                msg=str(error.get("msg", "Invalid value")),
                type=str(error.get("type", "value_error")),
                ctx=_json_safe_ctx(error.get("ctx")),
            )
            for error in exc.errors()
        ]
        response = ValidationErrorResponse.from_errors(
            errors=errors,
            request_id=request_id,
            path=request.url.path,
        )
        response.tracking_id = request_id
        return _json_error(response, status.HTTP_422_UNPROCESSABLE_ENTITY)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        request_id = _request_id(request)
        tracking_id = capture_reportable_exception(
            exc,
            surface="api",
            route=request.url.path,
            status_code=500,
            request_id=request_id,
            handled=False,
        )
        error = ErrorResponse.internal_error(
            message="Something went wrong",
            detail=SUPPORT_RETRY_DETAIL,
            request_id=request_id,
            path=request.url.path,
        )
        error.tracking_id = tracking_id or request_id
        return _json_error(error, status.HTTP_500_INTERNAL_SERVER_ERROR)
