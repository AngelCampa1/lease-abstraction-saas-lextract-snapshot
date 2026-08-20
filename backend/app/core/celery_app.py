"""Celery application configuration for background extraction jobs."""

from collections.abc import Callable
from types import SimpleNamespace
from typing import Any

try:
    from celery import Celery

except ModuleNotFoundError as exc:  # pragma: no cover
    if exc.name != "celery":
        raise

    class _FallbackConf:
        """Minimal conf object supporting attribute access and keyword update."""

        def update(self, **kwargs: Any) -> None:
            for key, value in kwargs.items():
                setattr(self, key, value)

    class _MissingCeleryTask:
        """Fallback task wrapper when Celery is not installed."""

        def __init__(self, func: Callable[..., Any], *, max_retries: int = 0) -> None:
            self._func = func
            self.max_retries = max_retries
            self.request = SimpleNamespace(retries=0)

        def __call__(self, *args: Any, **kwargs: Any) -> Any:
            return self._func(*args, **kwargs)

        def run(self, *args: Any, **kwargs: Any) -> Any:
            return self._func(*args, **kwargs)

        def retry(self, *args: Any, **kwargs: Any) -> None:
            raise ModuleNotFoundError(
                "Celery is not installed; retries are unavailable."
            )

        def apply_async(self, *args: Any, **kwargs: Any) -> None:
            raise ModuleNotFoundError(
                "Celery is not installed; background queue is unavailable."
            )

    class Celery:  # type: ignore[no-redef]
        """Minimal fallback API for application startup without Celery."""

        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.conf: _FallbackConf = _FallbackConf()

        def task(
            self, *args: Any, **kwargs: Any
        ) -> Callable[[Callable[..., Any]], Any]:
            max_retries = int(kwargs.get("max_retries", 0))

            def decorator(func: Callable[..., Any]) -> _MissingCeleryTask:
                return _MissingCeleryTask(func, max_retries=max_retries)

            return decorator

        def autodiscover_tasks(self, *args: Any, **kwargs: Any) -> None:
            return None


import os  # noqa: E402

from app.core.config import settings  # noqa: E402

celery_app = Celery(
    "lextract",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_concurrency=int(os.environ.get("CELERY_CONCURRENCY", "2")),
    task_track_started=True,
    task_time_limit=600,
    task_soft_time_limit=540,
    beat_schedule={},
)

celery_app.autodiscover_tasks(["app.tasks"])
