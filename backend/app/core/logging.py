"""
Centralized logging configuration for Lextract.

Provides:
- JSON structured logging for production (machine-parseable)
- Human-readable text logging for development
- Request correlation ID support via contextvars
- Uvicorn integration for consistent log formatting
"""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

from app.core.log_scrubber import SensitiveDataFilter

correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str | None:
    """Return the current request's correlation ID."""
    return correlation_id_var.get()


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID for the current request context."""
    correlation_id_var.set(correlation_id)


class CorrelationIdFilter(logging.Filter):
    """Logging filter that injects correlation_id into all log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = get_correlation_id() or "-"
        return True


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging in production."""

    STANDARD_ATTRS = frozenset(
        {
            "name",
            "msg",
            "args",
            "created",
            "filename",
            "funcName",
            "levelname",
            "levelno",
            "lineno",
            "module",
            "msecs",
            "pathname",
            "process",
            "processName",
            "relativeCreated",
            "stack_info",
            "exc_info",
            "exc_text",
            "thread",
            "threadName",
            "correlation_id",
            "message",
            "asctime",
            "taskName",
        }
    )

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", "-"),
        }

        if record.levelno >= logging.ERROR:
            log_data["location"] = {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        extra = {
            k: v
            for k, v in record.__dict__.items()
            if k not in self.STANDARD_ATTRS and not k.startswith("_")
        }
        if extra:
            log_data["extra"] = extra

        return json.dumps(log_data, default=str)


class TextFormatter(logging.Formatter):
    """Human-readable formatter for development."""

    LEVEL_COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
    }
    RESET = "\033[0m"

    def __init__(self, use_colors: bool = True) -> None:
        super().__init__()
        self.use_colors = use_colors and sys.stderr.isatty()

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        level = record.levelname.ljust(8)
        correlation_id = getattr(record, "correlation_id", "-")
        correlation_short = correlation_id[:8] if correlation_id != "-" else "-"
        message = record.getMessage()

        if self.use_colors:
            color = self.LEVEL_COLORS.get(record.levelname, "")
            level = f"{color}{level}{self.RESET}"

        formatted = (
            f"{timestamp} | {level} | [{correlation_short}] {record.name} | {message}"
        )

        if record.exc_info:
            formatted += "\n" + self.formatException(record.exc_info)

        return formatted


def configure_logging(
    log_level: str = "INFO",
    log_format: str = "json",
) -> None:
    """Configure the root logger and all application loggers."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    if log_format.lower() == "json":
        formatter: logging.Formatter = JSONFormatter()
    else:
        formatter = TextFormatter()

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    root_logger.handlers.clear()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(SensitiveDataFilter())
    console_handler.addFilter(CorrelationIdFilter())
    root_logger.addHandler(console_handler)

    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(numeric_level)
    logging.getLogger("uvicorn.error").setLevel(numeric_level)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_uvicorn_log_config(
    log_level: str = "INFO",
    log_format: str = "json",
) -> dict[str, Any]:
    """Return a uvicorn logging configuration dict matching application logging."""
    formatter_class = (
        "app.core.logging.JSONFormatter"
        if log_format.lower() == "json"
        else "app.core.logging.TextFormatter"
    )

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "correlation_id": {
                "()": "app.core.logging.CorrelationIdFilter",
            },
            "sensitive_data": {
                "()": "app.core.log_scrubber.SensitiveDataFilter",
            },
        },
        "formatters": {
            "default": {"()": formatter_class},
            "access": {"()": formatter_class},
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "filters": ["sensitive_data", "correlation_id"],
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "filters": ["sensitive_data", "correlation_id"],
            },
        },
        "loggers": {
            "uvicorn": {
                "handlers": ["default"],
                "level": log_level.upper(),
                "propagate": False,
            },
            "uvicorn.error": {
                "handlers": ["default"],
                "level": log_level.upper(),
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["access"],
                "level": log_level.upper(),
                "propagate": False,
            },
        },
    }
