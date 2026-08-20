"""Tests for logging configuration."""

import json
import logging

from app.core.logging import (
    CorrelationIdFilter,
    JSONFormatter,
    TextFormatter,
    configure_logging,
    correlation_id_var,
    get_correlation_id,
    get_uvicorn_log_config,
    set_correlation_id,
)


class TestCorrelationIdVar:
    def test_default_is_none(self) -> None:
        token = correlation_id_var.set(None)
        try:
            assert get_correlation_id() is None
        finally:
            correlation_id_var.reset(token)

    def test_set_and_get(self) -> None:
        set_correlation_id("abc-123")
        assert get_correlation_id() == "abc-123"
        correlation_id_var.set(None)


class TestCorrelationIdFilter:
    def test_adds_correlation_id_to_record(self) -> None:
        f = CorrelationIdFilter()
        record = logging.LogRecord(
            "test", logging.INFO, "test.py", 1, "msg", None, None
        )
        set_correlation_id("test-id-123")
        f.filter(record)
        assert record.correlation_id == "test-id-123"  # type: ignore[attr-defined]
        correlation_id_var.set(None)

    def test_dash_when_no_correlation_id(self) -> None:
        f = CorrelationIdFilter()
        record = logging.LogRecord(
            "test", logging.INFO, "test.py", 1, "msg", None, None
        )
        correlation_id_var.set(None)
        f.filter(record)
        assert record.correlation_id == "-"  # type: ignore[attr-defined]

    def test_returns_true(self) -> None:
        f = CorrelationIdFilter()
        record = logging.LogRecord(
            "test", logging.INFO, "test.py", 1, "msg", None, None
        )
        assert f.filter(record) is True


class TestJSONFormatter:
    def _make_record(self, level: int = logging.INFO) -> logging.LogRecord:
        record = logging.LogRecord(
            "test.logger", level, "test.py", 42, "test message", None, None
        )
        record.correlation_id = "json-test-id"  # type: ignore[attr-defined]
        return record

    def test_output_is_valid_json(self) -> None:
        fmt = JSONFormatter()
        record = self._make_record()
        output = fmt.format(record)
        data = json.loads(output)
        assert data["level"] == "INFO"
        assert data["message"] == "test message"
        assert data["correlation_id"] == "json-test-id"

    def test_error_includes_location(self) -> None:
        fmt = JSONFormatter()
        record = self._make_record(logging.ERROR)
        output = fmt.format(record)
        data = json.loads(output)
        assert "location" in data
        assert data["location"]["line"] == 42

    def test_extra_fields_included(self) -> None:
        fmt = JSONFormatter()
        record = self._make_record()
        record.user_id = "u-123"  # type: ignore[attr-defined]
        output = fmt.format(record)
        data = json.loads(output)
        assert data["extra"]["user_id"] == "u-123"

    def test_no_extra_when_empty(self) -> None:
        fmt = JSONFormatter()
        record = self._make_record()
        output = fmt.format(record)
        data = json.loads(output)
        assert "extra" not in data

    def test_exception_included(self) -> None:
        fmt = JSONFormatter()
        record = self._make_record(logging.ERROR)
        try:
            raise ValueError("test error")
        except ValueError:
            import sys

            record.exc_info = sys.exc_info()
        output = fmt.format(record)
        data = json.loads(output)
        assert "exception" in data
        assert "ValueError" in data["exception"]


class TestTextFormatter:
    def test_output_contains_expected_parts(self) -> None:
        fmt = TextFormatter(use_colors=False)
        record = logging.LogRecord(
            "test.logger", logging.INFO, "test.py", 1, "hello world", None, None
        )
        record.correlation_id = "text-test-id"  # type: ignore[attr-defined]
        output = fmt.format(record)
        assert "INFO" in output
        assert "hello world" in output
        assert "text-tes" in output  # correlation_short = first 8 chars

    def test_dash_when_no_correlation(self) -> None:
        fmt = TextFormatter(use_colors=False)
        record = logging.LogRecord(
            "test.logger", logging.INFO, "test.py", 1, "msg", None, None
        )
        record.correlation_id = "-"  # type: ignore[attr-defined]
        output = fmt.format(record)
        assert "[-]" in output

    def test_with_colors_enabled(self) -> None:
        fmt = TextFormatter(use_colors=False)
        # Force colors on for testing
        fmt.use_colors = True
        record = logging.LogRecord(
            "test.logger", logging.INFO, "test.py", 1, "colored msg", None, None
        )
        record.correlation_id = "color-test"  # type: ignore[attr-defined]
        output = fmt.format(record)
        assert "\033[32m" in output  # Green for INFO

    def test_with_exception(self) -> None:
        fmt = TextFormatter(use_colors=False)
        record = logging.LogRecord(
            "test.logger", logging.ERROR, "test.py", 1, "error msg", None, None
        )
        record.correlation_id = "-"  # type: ignore[attr-defined]
        try:
            raise RuntimeError("test exc")
        except RuntimeError:
            import sys

            record.exc_info = sys.exc_info()
        output = fmt.format(record)
        assert "RuntimeError" in output


class TestConfigureLogging:
    def test_configure_json_format(self) -> None:
        configure_logging(log_level="DEBUG", log_format="json")
        root = logging.getLogger()
        assert root.level == logging.DEBUG
        assert len(root.handlers) >= 1

    def test_configure_text_format(self) -> None:
        configure_logging(log_level="INFO", log_format="text")
        root = logging.getLogger()
        assert root.level == logging.INFO

    def test_third_party_loggers_suppressed(self) -> None:
        configure_logging(log_level="INFO", log_format="json")
        assert logging.getLogger("httpx").level == logging.WARNING
        assert logging.getLogger("botocore").level == logging.WARNING


class TestGetUvicornLogConfig:
    def test_json_config(self) -> None:
        config = get_uvicorn_log_config(log_level="INFO", log_format="json")
        assert config["version"] == 1
        assert "app.core.logging.JSONFormatter" in str(config["formatters"])

    def test_text_config(self) -> None:
        config = get_uvicorn_log_config(log_level="DEBUG", log_format="text")
        assert "app.core.logging.TextFormatter" in str(config["formatters"])

    def test_has_filters(self) -> None:
        config = get_uvicorn_log_config()
        assert "correlation_id" in config["filters"]
        assert "sensitive_data" in config["filters"]
