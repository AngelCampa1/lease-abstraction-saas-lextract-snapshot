"""Tests for custom exception classes."""

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    ExtractionError,
    InsufficientCreditsError,
    NotFoundError,
    ObjectStorageError,
    PaymentError,
    ResendError,
    ServiceUnavailableError,
    StripeError,
)


class TestObjectStorageError:
    def test_message(self) -> None:
        err = ObjectStorageError("upload failed")
        assert str(err) == "upload failed"
        assert err.message == "upload failed"

    def test_original_error(self) -> None:
        cause = OSError("disk full")
        err = ObjectStorageError("upload failed", original_error=cause)
        assert err.original_error is cause

    def test_original_error_default_none(self) -> None:
        assert ObjectStorageError("x").original_error is None


class TestExtractionError:
    def test_message(self) -> None:
        err = ExtractionError("parse failed")
        assert str(err) == "parse failed"
        assert err.message == "parse failed"

    def test_original_error(self) -> None:
        cause = ValueError("bad json")
        err = ExtractionError("parse failed", original_error=cause)
        assert err.original_error is cause

    def test_original_error_default_none(self) -> None:
        assert ExtractionError("x").original_error is None


class TestServiceUnavailableError:
    def test_message_includes_service_name(self) -> None:
        err = ServiceUnavailableError("Stripe", None)
        assert "Stripe" in str(err)
        assert err.service_name == "Stripe"

    def test_original_error(self) -> None:
        cause = ConnectionError("refused")
        err = ServiceUnavailableError("Redis", cause)
        assert err.original_error is cause

    def test_retry_after(self) -> None:
        err = ServiceUnavailableError("Object storage", None, retry_after=30)
        assert err.retry_after == 30

    def test_retry_after_default_none(self) -> None:
        err = ServiceUnavailableError("Object storage", None)
        assert err.retry_after is None


class TestNotFoundError:
    def test_message(self) -> None:
        err = NotFoundError("Lease", "abc-123")
        assert "Lease" in str(err)
        assert "abc-123" in str(err)

    def test_attributes(self) -> None:
        err = NotFoundError("Lease", "abc-123")
        assert err.resource == "Lease"
        assert err.identifier == "abc-123"


class TestConflictError:
    def test_message(self) -> None:
        err = ConflictError("already exists", "Lease", "abc-123")
        assert str(err) == "already exists"

    def test_attributes(self) -> None:
        err = ConflictError("dup", "Lease", "abc-123")
        assert err.resource_type == "Lease"
        assert err.resource_id == "abc-123"


class TestBadRequestError:
    def test_message(self) -> None:
        err = BadRequestError("invalid input")
        assert str(err) == "invalid input"


class TestStripeError:
    def test_message(self) -> None:
        err = StripeError("charge failed")
        assert str(err) == "charge failed"
        assert err.message == "charge failed"

    def test_original_error(self) -> None:
        cause = RuntimeError("api error")
        err = StripeError("charge failed", original_error=cause)
        assert err.original_error is cause

    def test_original_error_default_none(self) -> None:
        assert StripeError("x").original_error is None


class TestPaymentError:
    def test_message(self) -> None:
        err = PaymentError("wrong status")
        assert str(err) == "wrong status"


class TestResendError:
    def test_message(self) -> None:
        err = ResendError("send failed")
        assert str(err) == "send failed"
        assert err.message == "send failed"

    def test_original_error(self) -> None:
        cause = ConnectionError("timeout")
        err = ResendError("send failed", original_error=cause)
        assert err.original_error is cause

    def test_original_error_default_none(self) -> None:
        assert ResendError("x").original_error is None


class TestInsufficientCreditsError:
    def test_message(self) -> None:
        err = InsufficientCreditsError(required=5, available=2)
        assert "5" in str(err)
        assert "2" in str(err)

    def test_attributes(self) -> None:
        err = InsufficientCreditsError(required=5, available=2)
        assert err.required == 5
        assert err.available == 2


class TestAllExceptionsAreExceptions:
    def test_all_are_exception_subclasses(self) -> None:
        classes = [
            ObjectStorageError,
            ExtractionError,
            ServiceUnavailableError,
            NotFoundError,
            ConflictError,
            BadRequestError,
            StripeError,
            PaymentError,
            ResendError,
            InsufficientCreditsError,
        ]
        for cls in classes:
            assert issubclass(cls, Exception)
