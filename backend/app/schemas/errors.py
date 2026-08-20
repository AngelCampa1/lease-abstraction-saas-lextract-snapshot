"""
Standard error response schemas.

All API errors should use these schemas for a consistent, predictable
error format that frontend applications can handle reliably.
"""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Field-level error detail for validation responses."""

    loc: list[str | int] = Field(
        description="Location of the error (e.g., ['body', 'email'])"
    )
    msg: str = Field(description="Human-readable error message")
    type: str = Field(description="Error type identifier")
    ctx: dict[str, Any] | None = Field(
        default=None,
        description="Additional context about the error",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "loc": ["body", "email"],
                "msg": "value is not a valid email address",
                "type": "value_error.email",
            }
        }
    }


class ErrorResponse(BaseModel):
    """Standard API error response."""

    status_code: int = Field(description="HTTP status code", ge=400, le=599)
    message: str = Field(
        description="Human-readable error summary", min_length=1, max_length=200
    )
    detail: str | None = Field(
        default=None,
        description="Additional error details or explanation",
        max_length=10000,
    )
    errors: list[ErrorDetail] | None = Field(
        default=None,
        description="Field-level validation errors (for 422 responses)",
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="When the error occurred (UTC)",
    )
    request_id: str | None = Field(
        default=None,
        description="Request ID for debugging and support tickets",
        max_length=100,
    )
    path: str | None = Field(
        default=None,
        description="Request path that caused the error",
        max_length=500,
    )
    tracking_id: str | None = Field(
        default=None,
        description=(
            "Support-safe ID for correlating the user-visible error with logs/Sentry"
        ),
        max_length=100,
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "status_code": 400,
                "message": "Invalid request",
                "detail": "The provided value is invalid",
                "timestamp": "2024-01-15T10:30:00Z",
                "path": "/api/v1/leases",
            }
        }
    }

    @classmethod
    def bad_request(
        cls,
        message: str = "Bad request",
        detail: str | None = None,
        request_id: str | None = None,
        path: str | None = None,
    ) -> "ErrorResponse":
        """Create a 400 Bad Request error response."""
        return cls(
            status_code=400,
            message=message,
            detail=detail,
            request_id=request_id,
            path=path,
        )

    @classmethod
    def unauthorized(
        cls,
        message: str = "Authentication required",
        detail: str | None = None,
        request_id: str | None = None,
        path: str | None = None,
    ) -> "ErrorResponse":
        """Create a 401 Unauthorized error response."""
        return cls(
            status_code=401,
            message=message,
            detail=detail,
            request_id=request_id,
            path=path,
        )

    @classmethod
    def forbidden(
        cls,
        message: str = "Access denied",
        detail: str | None = None,
        request_id: str | None = None,
        path: str | None = None,
    ) -> "ErrorResponse":
        """Create a 403 Forbidden error response."""
        return cls(
            status_code=403,
            message=message,
            detail=detail,
            request_id=request_id,
            path=path,
        )

    @classmethod
    def not_found(
        cls,
        message: str = "Resource not found",
        detail: str | None = None,
        request_id: str | None = None,
        path: str | None = None,
    ) -> "ErrorResponse":
        """Create a 404 Not Found error response."""
        return cls(
            status_code=404,
            message=message,
            detail=detail,
            request_id=request_id,
            path=path,
        )

    @classmethod
    def conflict(
        cls,
        message: str = "Resource conflict",
        detail: str | None = None,
        request_id: str | None = None,
        path: str | None = None,
    ) -> "ErrorResponse":
        """Create a 409 Conflict error response."""
        return cls(
            status_code=409,
            message=message,
            detail=detail,
            request_id=request_id,
            path=path,
        )

    @classmethod
    def internal_error(
        cls,
        message: str = "Internal server error",
        detail: str | None = None,
        request_id: str | None = None,
        path: str | None = None,
    ) -> "ErrorResponse":
        """Create a 500 Internal Server Error response."""
        return cls(
            status_code=500,
            message=message,
            detail=detail,
            request_id=request_id,
            path=path,
        )


class ValidationErrorResponse(ErrorResponse):
    """422 Unprocessable Entity response with field-level errors."""

    status_code: int = Field(default=422, description="HTTP status code")
    message: str = Field(default="Validation failed", description="Error summary")
    errors: list[ErrorDetail] = Field(
        description="Field-level validation errors",
        min_length=1,
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "status_code": 422,
                "message": "Validation failed",
                "errors": [
                    {
                        "loc": ["body", "email"],
                        "msg": "value is not a valid email address",
                        "type": "value_error.email",
                    }
                ],
                "timestamp": "2024-01-15T10:30:00Z",
                "path": "/api/v1/leases",
            }
        }
    }

    @classmethod
    def from_errors(
        cls,
        errors: list[ErrorDetail],
        request_id: str | None = None,
        path: str | None = None,
    ) -> "ValidationErrorResponse":
        """Create a validation error response from a list of error details."""
        return cls(errors=errors, request_id=request_id, path=path)


# Standard OpenAPI response dicts for use in FastAPI router decorators
HTTP_400_RESPONSE: dict[str, Any] = {
    "model": ErrorResponse,
    "description": "Bad Request — the request was invalid or malformed",
}

HTTP_401_RESPONSE: dict[str, Any] = {
    "model": ErrorResponse,
    "description": "Unauthorized — authentication is required",
}

HTTP_403_RESPONSE: dict[str, Any] = {
    "model": ErrorResponse,
    "description": "Forbidden — insufficient permissions",
}

HTTP_404_RESPONSE: dict[str, Any] = {
    "model": ErrorResponse,
    "description": "Not Found — the requested resource does not exist",
}

HTTP_409_RESPONSE: dict[str, Any] = {
    "model": ErrorResponse,
    "description": "Conflict — the request conflicts with current state",
}

HTTP_422_RESPONSE: dict[str, Any] = {
    "model": ValidationErrorResponse,
    "description": "Validation Error — the request body failed validation",
}

HTTP_500_RESPONSE: dict[str, Any] = {
    "model": ErrorResponse,
    "description": "Internal Server Error — an unexpected error occurred",
}
