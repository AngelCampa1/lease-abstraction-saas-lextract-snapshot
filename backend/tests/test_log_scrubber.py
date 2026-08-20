"""Tests for log scrubber."""

import logging

from app.core.log_scrubber import SensitiveDataFilter, scrub


class TestScrub:
    def test_jwt_token_redacted(self) -> None:
        text = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def456"
        result = scrub(text)
        assert "[token]" in result
        assert "eyJ" not in result

    def test_stripe_customer_id_redacted(self) -> None:
        assert "[stripe_id]" in scrub("Customer cus_1234567890abcdef created")

    def test_stripe_payment_intent_redacted(self) -> None:
        assert "[stripe_id]" in scrub("Processing pi_1234567890abcdef")

    def test_email_redacted(self) -> None:
        assert "[email]" in scrub("User user@example.com logged in")
        assert "user@example.com" not in scrub("User user@example.com logged in")

    def test_dollar_amount_redacted(self) -> None:
        assert "[amount]" in scrub("Charged $1,234.56")
        assert "$1,234.56" not in scrub("Charged $1,234.56")

    def test_decimal_repr_redacted(self) -> None:
        assert "[amount]" in scrub("Balance is Decimal('45000.00')")

    def test_plain_text_unchanged(self) -> None:
        text = "Health check passed successfully"
        assert scrub(text) == text

    def test_multiple_patterns_in_one_string(self) -> None:
        text = "user@test.com paid $100.00 with pi_1234567890abcdef"
        result = scrub(text)
        assert "[email]" in result
        assert "[amount]" in result
        assert "[stripe_id]" in result


class TestSensitiveDataFilter:
    def _make_record(self, msg: str, **kwargs: object) -> logging.LogRecord:
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg=msg,
            args=None,
            exc_info=None,
        )
        for k, v in kwargs.items():
            setattr(record, k, v)
        return record

    def test_filter_redacts_message(self) -> None:
        f = SensitiveDataFilter()
        record = self._make_record("Login by user@example.com")
        f.filter(record)
        assert "[email]" in record.msg
        assert "user@example.com" not in record.msg

    def test_filter_redacts_sensitive_fields(self) -> None:
        f = SensitiveDataFilter()
        record = self._make_record("test", email="user@example.com", token="secret123")
        f.filter(record)
        assert record.email == "[redacted]"  # type: ignore[attr-defined]
        assert record.token == "[redacted]"  # type: ignore[attr-defined]

    def test_filter_returns_true(self) -> None:
        f = SensitiveDataFilter()
        record = self._make_record("hello")
        assert f.filter(record) is True

    def test_filter_handles_exc_info(self) -> None:
        f = SensitiveDataFilter()
        try:
            raise ValueError("error for user@test.com")
        except ValueError:
            import sys

            record = self._make_record("oops")
            record.exc_info = sys.exc_info()

        f.filter(record)
        assert record.exc_text is not None
        assert "[email]" in record.exc_text
        assert record.exc_info is None

    def test_filter_with_args_interpolation(self) -> None:
        f = SensitiveDataFilter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="User %s logged in",
            args=("user@example.com",),
            exc_info=None,
        )
        f.filter(record)
        assert "[email]" in record.msg
        assert record.args is None
