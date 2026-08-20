"""Custom exception classes for Lextract."""


class ObjectStorageError(Exception):
    """Raised when an object-storage operation fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class ExtractionError(Exception):
    """Raised when the LLM extraction call fails or returns unparseable output."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class ServiceUnavailableError(Exception):
    """Raised when an external service is unreachable (circuit breaker open)."""

    def __init__(
        self,
        service_name: str,
        original_error: BaseException | None,
        retry_after: int | None = None,
    ) -> None:
        self.service_name = service_name
        self.original_error = original_error
        self.retry_after = retry_after
        super().__init__(f"{service_name} is currently unavailable")


class NotFoundError(Exception):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str, identifier: str) -> None:
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} not found: {identifier}")


class ConflictError(Exception):
    """Raised on duplicate or conflicting resource state."""

    def __init__(self, message: str, resource_type: str, resource_id: str) -> None:
        self.resource_type = resource_type
        self.resource_id = resource_id
        super().__init__(message)


class BadRequestError(Exception):
    """Raised for malformed or invalid client input."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


class StripeError(Exception):
    """Raised when a Stripe API operation fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class PaymentError(Exception):
    """Raised when a payment rule is violated (wrong status, wrong user, etc.)."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


class ResendError(Exception):
    """Raised when a Resend email API operation fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class InsufficientCreditsError(Exception):
    """Raised when a user has insufficient credits for an operation."""

    def __init__(self, required: int, available: int) -> None:
        self.required = required
        self.available = available
        super().__init__(f"Insufficient credits: need {required}, have {available}")


class ExportError(Exception):
    """Raised when an export generation or upload fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)
