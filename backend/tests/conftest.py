"""Shared test fixtures for the Lextract backend test suite."""

import os

import pytest
from fastapi.testclient import TestClient

# Override env vars before importing app to avoid real service connections
os.environ.setdefault("NEON_DATA_API_URL", "http://localhost:3000")
os.environ.setdefault("NEON_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("NEON_DATABASE_URL", "postgresql://localhost:5432/lextract")
os.environ.setdefault("NEON_AUTH_BASE_URL", "http://localhost:4000")
os.environ.setdefault("R2_ENDPOINT_URL", "")
os.environ.setdefault("R2_ACCESS_KEY_ID", "test-r2-key")
os.environ.setdefault("R2_SECRET_ACCESS_KEY", "test-r2-secret")
os.environ.setdefault("R2_BUCKET_NAME", "test-bucket")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_placeholder")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
os.environ.setdefault("RESEND_API_KEY", "test-resend-key")
os.environ.setdefault("SENTRY_DSN", "")

from app.core.celery_app import celery_app  # noqa: E402
from app.main import create_app  # noqa: E402

# Run celery tasks synchronously without Redis in tests
celery_app.conf.update(task_always_eager=True, task_eager_propagates=True)


@pytest.fixture(scope="session")
def client() -> TestClient:
    """TestClient wrapping a fresh app instance for the entire test session."""
    app = create_app()
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> None:
    """Reset in-memory rate limiter storage between tests."""
    from app.core.rate_limiting import storage

    storage.reset()


@pytest.fixture(autouse=True)
def reset_db_clients() -> None:
    """Reset cached Neon client instances between tests."""
    from app.database.client import NeonClientManager

    NeonClientManager.reset_clients()
