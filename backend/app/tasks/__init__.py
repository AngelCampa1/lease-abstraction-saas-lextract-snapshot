"""Celery task modules — import all so autodiscover registers them."""

from app.tasks import (  # noqa: F401
    cleanup,
    email,
    export,
    extraction,
    pipeline,
    scoring,
)
