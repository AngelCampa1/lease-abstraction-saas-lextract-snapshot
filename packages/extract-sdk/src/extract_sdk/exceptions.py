"""SDK-specific exceptions for extract-sdk."""

from __future__ import annotations


class ExtractionError(Exception):
    """Base exception for all extraction errors."""

    def __init__(self, message: str, *, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


class ExtractionParseError(ExtractionError):
    """Raised when Claude's response cannot be parsed into structured data."""

    def __init__(
        self, message: str, *, raw_response: str = "", cause: Exception | None = None
    ) -> None:
        super().__init__(message, cause=cause)
        self.raw_response = raw_response


class ExtractionValidationError(ExtractionError):
    """Raised when extracted data fails schema or business rule validation."""


class ExtractionTimeoutError(ExtractionError):
    """Raised when Claude API calls exhaust all retries."""


class SchemaError(ExtractionError):
    """Raised for schema registry errors (missing fields, invalid definitions)."""


class CircuitOpenError(ExtractionError):
    """Raised when the circuit breaker is open and rejecting calls."""

    def __init__(
        self,
        service_name: str,
        *,
        retry_after: int = 300,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(
            f"{service_name} circuit breaker is open. Retry after {retry_after}s.",
            cause=cause,
        )
        self.service_name = service_name
        self.retry_after = retry_after
