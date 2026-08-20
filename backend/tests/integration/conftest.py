"""Shared fixtures and constants for integration tests."""

import copy
import time
from contextlib import AbstractContextManager
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models.user import User

# Stable UUIDs for use across integration test modules
USER_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
USER_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
EXTRACTION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
EXTRACTION_B_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
SESSION_A_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"


def build_user(user_id: str = USER_A_ID, email: str = "user@example.com") -> User:
    """Build a minimal User instance for testing."""
    now = datetime.now(UTC)
    return User(
        id=user_id,  # type: ignore[arg-type]  # pydantic coerces str→UUID
        email=email,
        credits_balance=0,
        created_at=now,
        updated_at=now,
    )


def build_anonymous_session(
    session_id: str = SESSION_A_ID,
    session_token: str = "anon-token-abc",
) -> dict[str, Any]:
    """Build an anonymous session dict suitable for mocking DB responses."""
    now = datetime.now(UTC)
    return {
        "id": session_id,
        "session_token": session_token,
        "linked_user_id": None,
        "expires_at": (now + timedelta(hours=72)).isoformat(),
        "created_at": now.isoformat(),
    }


_DEFAULT_EXTRACTED_DATA: dict[str, Any] = {
    "base_rent_annual": {"value": 120000, "confidence": 0.85, "source_text": "120000"},
}


def build_extraction(
    extraction_id: str = EXTRACTION_ID,
    user_id: str = USER_A_ID,
    status: str = "complete",
    payment_status: str = "unpaid",
    extracted_data: dict[str, Any] | None = None,
    confidence_scores: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build an extraction dict suitable for mocking DB responses."""
    now = datetime.now(UTC)
    return {
        "id": extraction_id,
        "user_id": user_id,
        "anonymous_session_id": None,
        "status": status,
        "payment_status": payment_status,
        "document_filename": "test_lease.pdf",
        "document_object_key": "uploads/test_lease.pdf",
        "document_page_count": 10,
        "property_type": "Office",
        "extracted_data": (
            extracted_data
            if extracted_data is not None
            else copy.deepcopy(_DEFAULT_EXTRACTED_DATA)
        ),
        "confidence_scores": confidence_scores if confidence_scores is not None else {},
        "red_flags": [],
        "overall_confidence": 0.95,
        "error_message": None,
        "deleted_at": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


@pytest.fixture
def rsa_keys() -> dict[str, Any]:
    """Generate a fresh RSA-2048 key pair for JWT signing in tests."""
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.asymmetric import rsa

    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    return {"private": private_key, "public": private_key.public_key()}


def auth_headers_for(
    rsa_keys: dict[str, Any], user_id: str = USER_A_ID
) -> dict[str, str]:
    """Build Authorization headers containing a JWT signed with the test RSA key."""
    import jwt as pyjwt

    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": f"user-{user_id[:8]}@example.com",
        "iat": now,
        "exp": now + 3600,
    }
    token = pyjwt.encode(payload, rsa_keys["private"], algorithm="RS256")
    return {"Authorization": f"Bearer {token}"}


class AuthContext(AbstractContextManager["AuthContext"]):
    """Context manager that patches JWT verification and the RLS DB client.

    Enables integration tests to run authenticated requests without a live
    auth backend.  Two patches are applied:

    1. ``app.core.dependencies.verify_jwt`` → returns a pre-built payload
       directly so no JWKS fetch or RSA verification occurs.

    2. ``app.core.dependencies.get_authenticated_client`` → returns a mock
       Neon client whose ``table("users")…maybe_single()…execute()``
       returns the supplied *user* dict so ``get_current_user`` can build
       the ``User`` model without a live database.
    """

    def __init__(self, rsa_keys: dict[str, Any], user: User) -> None:
        self._rsa_keys = rsa_keys
        self._user = user
        self._patches: list[Any] = []

    def __enter__(self) -> "AuthContext":
        # --- Patch 1: skip JWKS validation; return JWT payload directly ---
        now = int(time.time())
        jwt_payload: dict[str, Any] = {
            "sub": str(self._user.id),
            "email": self._user.email,
            "iat": now,
            "exp": now + 3600,
        }
        p1 = patch("app.core.dependencies.verify_jwt", return_value=jwt_payload)
        self._patches.append(p1)
        p1.start()

        # --- Patch 2: RLS client returns the test user row ---
        user_dict: dict[str, Any] = {
            "id": str(self._user.id),
            "email": self._user.email,
            "full_name": None,
            "company": None,
            "role": None,
            "credits_balance": self._user.credits_balance,
            "stripe_customer_id": None,
            "created_at": self._user.created_at.isoformat(),
            "updated_at": self._user.updated_at.isoformat(),
        }

        # Use a plain namespace so .data is a real dict, not a MagicMock attr.
        class _Result:
            data = user_dict

        mock_rls = MagicMock()
        mock_rls.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = (
            _Result()
        )

        p2 = patch(
            "app.core.dependencies.get_authenticated_client",
            return_value=mock_rls,
        )
        self._patches.append(p2)
        p2.start()

        return self

    def __exit__(self, *args: object) -> None:
        for p in reversed(self._patches):
            p.stop()
        self._patches.clear()


@pytest.fixture
def app_client() -> TestClient:
    """TestClient wrapping a fresh app instance per test function."""
    return TestClient(create_app())
