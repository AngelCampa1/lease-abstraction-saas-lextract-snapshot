"""Tests for cycle-1 backend hardening fixes.

Covers:
  1. Anonymous→user link extraction transfer concurrency safety.
  2. Auth service unavailability vs invalid session differentiation.
  3. Guest checkout ownership invariant (single owner per extraction).
  4. CamAudit Fernet key validation at construction time.
  5. DELETE /api/v1/user account deletion (owner-only, idempotent, cascade).
  6. /payments/history payload structure (OpenAPI example coverage gap).
"""

from __future__ import annotations

import time
from typing import Any
from unittest.mock import MagicMock, patch

import httpx
import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.security import (
    AuthenticationError,
    AuthServiceUnavailableError,
    jwks_cache,
    verify_neon_session,
)

USER_ID = "00000000-0000-0000-0000-0000000000aa"
EXTRACTION_ID = "00000000-0000-0000-0000-0000000000bb"
SESSION_ID = "00000000-0000-0000-0000-0000000000cc"


# ---------------------------------------------------------------------------
# Fix #2: Auth service unavailability differentiation
# ---------------------------------------------------------------------------


class _AllFailAsyncClient:
    """httpx.AsyncClient stub where every request raises a transport error."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> _AllFailAsyncClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def get(self, url: str, *, headers: dict[str, str]) -> Any:
        raise httpx.ConnectError("simulated network outage")


class _AllNon200AsyncClient:
    """httpx.AsyncClient stub that returns a non-200 response on every call."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> _AllNon200AsyncClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def get(self, url: str, *, headers: dict[str, str]) -> Any:
        return _StubResponse(status_code=401)


class _StubResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code

    def json(self) -> dict[str, Any]:
        return {}


@pytest.mark.asyncio
async def test_all_transport_errors_raise_auth_service_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If EVERY candidate URL fails with a transport error we MUST surface
    AuthServiceUnavailableError so the caller returns 503, not 401."""
    monkeypatch.setattr(
        "app.core.security.settings.neon_auth_base_url",
        "https://primary.example.com/auth",
    )
    monkeypatch.setattr(
        "app.core.security.settings.neon_jwks_url",
        "https://primary.example.com/auth/.well-known/jwks.json",
    )
    monkeypatch.setattr(
        "app.core.security.settings.frontend_url", "https://lextract.io"
    )
    monkeypatch.setattr("app.core.security.httpx.AsyncClient", _AllFailAsyncClient)

    with pytest.raises(AuthServiceUnavailableError, match="unreachable"):
        await verify_neon_session("any-opaque-token")


@pytest.mark.asyncio
async def test_all_non_200_responses_raise_authentication_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When the auth service POSITIVELY rejects every candidate we MUST
    surface AuthenticationError (mapped to 401), not 503."""
    monkeypatch.setattr(
        "app.core.security.settings.neon_auth_base_url",
        "https://primary.example.com/auth",
    )
    monkeypatch.setattr("app.core.security.settings.neon_jwks_url", None)
    monkeypatch.setattr(
        "app.core.security.settings.frontend_url", "https://lextract.io"
    )
    monkeypatch.setattr("app.core.security.httpx.AsyncClient", _AllNon200AsyncClient)

    with pytest.raises(AuthenticationError, match="Invalid session token"):
        await verify_neon_session("any-opaque-token")


def test_auth_service_unavailable_error_default_message() -> None:
    err = AuthServiceUnavailableError()
    assert err.detail == "Authentication service unavailable"
    assert str(err) == "Authentication service unavailable"


def test_auth_service_unavailable_error_custom_message() -> None:
    err = AuthServiceUnavailableError("auth out")
    assert err.detail == "auth out"


# ---------------------------------------------------------------------------
# Fix #2 (cont.): deps.py mapping — 503 vs 401 path
# ---------------------------------------------------------------------------


def _generate_rsa_keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def rsa_keys():
    private = _generate_rsa_keypair()
    return private, private.public_key()


def _make_token(private_key, sub=USER_ID):
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


def test_dependency_returns_503_when_auth_service_unavailable(rsa_keys) -> None:
    """get_current_user wraps AuthServiceUnavailableError -> HTTP 503."""
    from fastapi.testclient import TestClient

    from app.main import create_app

    client = TestClient(create_app())

    async def _fail_session(_token: str) -> dict[str, str]:
        raise AuthServiceUnavailableError("auth down")

    with patch("app.core.dependencies.verify_neon_session", side_effect=_fail_session):
        resp = client.get(
            "/api/v1/user/profile",
            headers={"Authorization": "Bearer not-a-valid-jwt"},
        )
    assert resp.status_code == 503
    # Global error handler may rewrite the detail to a user-friendly string;
    # what matters is the 503 status code carrying the outage semantic.
    assert "detail" in resp.json()


def test_dependency_returns_401_when_session_positively_invalid() -> None:
    """get_current_user wraps AuthenticationError -> HTTP 401."""
    from fastapi.testclient import TestClient

    from app.main import create_app

    client = TestClient(create_app())

    async def _bad_session(_token: str) -> dict[str, str]:
        raise AuthenticationError("Invalid session token")

    with patch("app.core.dependencies.verify_neon_session", side_effect=_bad_session):
        resp = client.get(
            "/api/v1/user/profile",
            headers={"Authorization": "Bearer not-a-valid-jwt"},
        )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Fix #4: CamAudit Fernet key validation
# ---------------------------------------------------------------------------


class TestCamAuditKeyValidation:
    def test_empty_key_raises_value_error(self) -> None:
        from app.services.camaudit import CamAuditHandoffService

        with pytest.raises(ValueError, match="required"):
            CamAuditHandoffService(shared_key="", base_url="https://camaudit.io")

    def test_malformed_key_raises_value_error(self) -> None:
        from app.services.camaudit import CamAuditHandoffService

        with pytest.raises(ValueError, match="not a valid Fernet key"):
            CamAuditHandoffService(
                shared_key="not-a-fernet-key", base_url="https://camaudit.io"
            )

    def test_short_base64_key_raises_value_error(self) -> None:
        from app.services.camaudit import CamAuditHandoffService

        # 16 bytes of base64 is too short for a Fernet key (needs 32 bytes).
        with pytest.raises(ValueError, match="not a valid Fernet key"):
            CamAuditHandoffService(
                shared_key="dGVzdC1zaG9ydC1rZXk=",  # "test-short-key"
                base_url="https://camaudit.io",
            )

    def test_valid_key_constructs_successfully(self) -> None:
        from cryptography.fernet import Fernet

        from app.services.camaudit import CamAuditHandoffService

        key = Fernet.generate_key().decode()
        svc = CamAuditHandoffService(shared_key=key, base_url="https://camaudit.io")
        assert svc.fernet is not None
        # Round-trip proves construction is wired correctly.
        roundtrip = svc.fernet.decrypt(svc.fernet.encrypt(b"hello"))
        assert roundtrip == b"hello"


# ---------------------------------------------------------------------------
# Fix #3: Guest checkout ownership invariant
# ---------------------------------------------------------------------------


class _GuestUserMockDB:
    """Captures the update payload used to attach an extraction to a user."""

    def __init__(self, existing_user_id: str | None) -> None:
        self.existing_user_id = existing_user_id
        self.extraction_update_payload: dict[str, Any] | None = None
        self.users_upsert_payload: dict[str, Any] | None = None

    def table(self, name: str) -> _GuestUserMockTable:
        return _GuestUserMockTable(self, name)


class _GuestUserMockTable:
    def __init__(self, db: _GuestUserMockDB, name: str) -> None:
        self.db = db
        self.name = name
        self._is_update = False
        self._is_upsert = False
        self._payload: dict[str, Any] | None = None

    def select(self, *args: Any, **kwargs: Any) -> _GuestUserMockTable:
        return self

    def eq(self, *args: Any, **kwargs: Any) -> _GuestUserMockTable:
        return self

    def maybe_single(self) -> _GuestUserMockTable:
        return self

    def update(self, payload: dict[str, Any]) -> _GuestUserMockTable:
        self._is_update = True
        self._payload = payload
        return self

    def upsert(self, payload: dict[str, Any], **kwargs: Any) -> _GuestUserMockTable:
        self._is_upsert = True
        self._payload = payload
        return self

    def execute(self) -> Any:
        if self.name == "users":
            if self._is_upsert:
                self.db.users_upsert_payload = self._payload
                return MagicMock(data=[self._payload])
            if self._is_update:
                return MagicMock(data=[self._payload])
            # select on users
            if self.db.existing_user_id:
                return MagicMock(
                    data={"id": self.db.existing_user_id, "email": "guest@example.com"}
                )
            return MagicMock(data=None)
        if self.name == "extractions" and self._is_update:
            self.db.extraction_update_payload = self._payload
            return MagicMock(data=[self._payload])
        return MagicMock(data=None)


@pytest.mark.asyncio
async def test_provision_guest_user_clears_anonymous_session_id_on_existing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When linking to an EXISTING user, the extraction MUST have its
    anonymous_session_id cleared — ownership is exactly one of (user_id,
    anonymous_session_id)."""
    from app.api.v1 import webhooks

    fake_db = _GuestUserMockDB(existing_user_id=USER_ID)
    monkeypatch.setattr(
        webhooks.NeonClientManager, "get_service_client", lambda: fake_db
    )

    user_id = await webhooks._provision_guest_user(
        guest_email="guest@example.com",
        extraction_id=EXTRACTION_ID,
        anonymous_session_id=None,
    )
    assert user_id == USER_ID
    payload = fake_db.extraction_update_payload
    assert payload is not None
    assert payload["user_id"] == USER_ID
    assert payload["anonymous_session_id"] is None, (
        "extraction must have anonymous_session_id cleared so it has "
        "exactly one owner"
    )


@pytest.mark.asyncio
async def test_provision_guest_user_clears_anonymous_session_id_on_new(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When creating a NEW user, the extraction MUST also have its
    anonymous_session_id cleared."""
    from app.api.v1 import webhooks

    fake_db = _GuestUserMockDB(existing_user_id=None)
    new_user_id = "11111111-1111-1111-1111-111111111111"
    monkeypatch.setattr(
        webhooks.NeonClientManager, "get_service_client", lambda: fake_db
    )

    async def _fake_create_auth(_email: str) -> str:
        return new_user_id

    async def _fake_send_email(*_args: Any, **_kwargs: Any) -> None:
        return None

    monkeypatch.setattr(webhooks, "_create_auth_user", _fake_create_auth)
    monkeypatch.setattr(webhooks, "_send_guest_welcome_email", _fake_send_email)

    user_id = await webhooks._provision_guest_user(
        guest_email="guest@example.com",
        extraction_id=EXTRACTION_ID,
        anonymous_session_id=None,
    )
    assert user_id == new_user_id
    payload = fake_db.extraction_update_payload
    assert payload is not None
    assert payload["user_id"] == new_user_id
    assert payload["anonymous_session_id"] is None


# ---------------------------------------------------------------------------
# Fix #1: link_session concurrency
# ---------------------------------------------------------------------------


class _LinkSessionMockDB:
    """Tracks the filters applied to the extractions UPDATE call."""

    def __init__(self) -> None:
        self.session_select_data: list[dict[str, Any]] | None = [
            {
                "id": SESSION_ID,
                "session_token": "tok",
                "linked_user_id": None,
                "expires_at": "9999-01-01T00:00:00+00:00",
            }
        ]
        self.captured_filters: list[tuple[str, str, Any]] = []

    def table(self, name: str) -> _LinkSessionMockTable:
        return _LinkSessionMockTable(self, name)


class _LinkSessionMockTable:
    def __init__(self, db: _LinkSessionMockDB, name: str) -> None:
        self.db = db
        self.name = name
        self._mode: str | None = None

    def select(self, *args: Any, **kwargs: Any) -> _LinkSessionMockTable:
        self._mode = "select"
        return self

    def update(self, _payload: dict[str, Any]) -> _LinkSessionMockTable:
        self._mode = "update"
        return self

    def eq(self, col: str, val: Any) -> _LinkSessionMockTable:
        if self.name == "extractions" and self._mode == "update":
            self.db.captured_filters.append(("eq", col, val))
        return self

    def is_(self, col: str, val: Any) -> _LinkSessionMockTable:
        if self.name == "extractions" and self._mode == "update":
            self.db.captured_filters.append(("is_", col, val))
        return self

    def limit(self, _n: int) -> _LinkSessionMockTable:
        return self

    def maybe_single(self) -> _LinkSessionMockTable:
        return self

    def execute(self) -> Any:
        if self.name == "anonymous_sessions" and self._mode == "select":
            return MagicMock(data=self.db.session_select_data)
        if self.name == "anonymous_sessions" and self._mode == "update":
            return MagicMock(data=[{"id": SESSION_ID}])
        if self.name == "extractions" and self._mode == "update":
            return MagicMock(data=[{"id": "x"}])
        return MagicMock(data=None)


@pytest.mark.asyncio
async def test_link_session_extraction_transfer_filters_on_null_user_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The extraction transfer MUST filter on (anonymous_session_id, user_id IS NULL)
    so a concurrent winner cannot steal extractions already claimed by another link."""
    from app.api.v1 import auth as auth_module

    fake_db = _LinkSessionMockDB()
    monkeypatch.setattr(
        auth_module.NeonClientManager, "get_service_client", lambda: fake_db
    )

    user = MagicMock()
    user.id = USER_ID

    body = MagicMock()
    body.session_token = "tok"

    result = await auth_module.link_session(body=body, user=user)
    assert result.linked is True

    filters = fake_db.captured_filters
    # We expect exactly:
    #   eq("anonymous_session_id", SESSION_ID)
    #   is_("user_id", "null")
    eq_calls = [(c, v) for (kind, c, v) in filters if kind == "eq"]
    is_calls = [(c, v) for (kind, c, v) in filters if kind == "is_"]
    assert ("anonymous_session_id", SESSION_ID) in eq_calls
    assert ("user_id", "null") in is_calls


# ---------------------------------------------------------------------------
# Fix #5: DELETE /api/v1/user
# ---------------------------------------------------------------------------


def _make_user_token(rsa_keys):
    private_key, public_key = rsa_keys
    return _make_token(private_key), public_key


@pytest.fixture
def app_client():
    from fastapi.testclient import TestClient

    from app.main import create_app

    return TestClient(create_app())


def _mock_authed(public_key) -> tuple[MagicMock, MagicMock]:
    mock_jwk = MagicMock()
    mock_jwk.key = public_key
    mock_rls = MagicMock()
    user_row = {
        "id": USER_ID,
        "email": "u@example.com",
        "full_name": None,
        "company": None,
        "role": None,
        "credits_balance": 0,
        "stripe_customer_id": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    query = mock_rls.table.return_value.select.return_value.eq.return_value
    query.maybe_single.return_value.execute.return_value = MagicMock(data=user_row)
    query.single.return_value.execute.return_value = MagicMock(data=user_row)
    return mock_jwk, mock_rls


class _DeleteAccountMockDB:
    """Captures user/extractions update calls during account deletion."""

    def __init__(self) -> None:
        self.user_updates: list[dict[str, Any]] = []
        self.extractions_updates: list[dict[str, Any]] = []
        self.user_update_filters: list[tuple[str, str, Any]] = []
        self.ext_update_filters: list[tuple[str, str, Any]] = []

    def table(self, name: str) -> _DeleteAccountMockTable:
        return _DeleteAccountMockTable(self, name)


class _DeleteAccountMockTable:
    def __init__(self, db: _DeleteAccountMockDB, name: str) -> None:
        self.db = db
        self.name = name
        self._payload: dict[str, Any] | None = None
        self._mode: str | None = None

    def update(self, payload: dict[str, Any]) -> _DeleteAccountMockTable:
        self._mode = "update"
        self._payload = payload
        return self

    def eq(self, col: str, val: Any) -> _DeleteAccountMockTable:
        if self.name == "users":
            self.db.user_update_filters.append(("eq", col, val))
        elif self.name == "extractions":
            self.db.ext_update_filters.append(("eq", col, val))
        return self

    def is_(self, col: str, val: Any) -> _DeleteAccountMockTable:
        if self.name == "users":
            self.db.user_update_filters.append(("is_", col, val))
        elif self.name == "extractions":
            self.db.ext_update_filters.append(("is_", col, val))
        return self

    def execute(self) -> Any:
        if self._mode == "update" and self._payload is not None:
            if self.name == "users":
                self.db.user_updates.append(self._payload)
            elif self.name == "extractions":
                self.db.extractions_updates.append(self._payload)
        return MagicMock(data=[self._payload] if self._payload else [])


class TestDeleteAccount:
    def test_returns_204_and_soft_deletes_user_and_extractions(
        self, app_client, rsa_keys, monkeypatch
    ):
        token, public_key = _make_user_token(rsa_keys)
        mock_jwk, mock_rls = _mock_authed(public_key)
        fake_db = _DeleteAccountMockDB()

        cleanup_calls: list[str] = []

        class _FakeTask:
            def apply_async(self, *, args):
                cleanup_calls.append(args[0])

            def __call__(self, *args, **kwargs):
                cleanup_calls.append(args[0])

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=fake_db,
            ),
            patch("app.tasks.cleanup.cleanup_user_objects", _FakeTask()),
        ):
            resp = app_client.delete(
                "/api/v1/user", headers={"Authorization": f"Bearer {token}"}
            )

        assert resp.status_code == 204
        assert resp.content == b""
        # User row soft-deleted exactly once.
        assert len(fake_db.user_updates) == 1
        assert "deleted_at" in fake_db.user_updates[0]
        # Extraction cascade.
        assert len(fake_db.extractions_updates) == 1
        assert "deleted_at" in fake_db.extractions_updates[0]
        # Owner-only filter present.
        assert ("eq", "id", USER_ID) in fake_db.user_update_filters
        assert ("eq", "user_id", USER_ID) in fake_db.ext_update_filters
        # Idempotency guard present on both updates.
        assert ("is_", "deleted_at", "null") in fake_db.user_update_filters
        assert ("is_", "deleted_at", "null") in fake_db.ext_update_filters
        # R2 cleanup task queued for this user.
        assert cleanup_calls == [USER_ID]

    def test_unauthenticated_returns_401(self, app_client):
        resp = app_client.delete("/api/v1/user")
        assert resp.status_code == 401

    def test_db_failure_returns_500(self, app_client, rsa_keys):
        token, public_key = _make_user_token(rsa_keys)
        mock_jwk, mock_rls = _mock_authed(public_key)
        broken_db = MagicMock()
        broken_db.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.side_effect = Exception(
            "DB down"
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=broken_db,
            ),
        ):
            resp = app_client.delete(
                "/api/v1/user", headers={"Authorization": f"Bearer {token}"}
            )
        assert resp.status_code == 500

    def test_idempotent_second_call_still_returns_204(
        self, app_client, rsa_keys, monkeypatch
    ):
        """A second DELETE for an already-deleted account is a no-op 204."""
        token, public_key = _make_user_token(rsa_keys)
        mock_jwk, mock_rls = _mock_authed(public_key)
        fake_db = _DeleteAccountMockDB()

        class _FakeTask:
            def apply_async(self, *, args):
                return None

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=fake_db,
            ),
            patch("app.tasks.cleanup.cleanup_user_objects", _FakeTask()),
        ):
            first = app_client.delete(
                "/api/v1/user", headers={"Authorization": f"Bearer {token}"}
            )
            second = app_client.delete(
                "/api/v1/user", headers={"Authorization": f"Bearer {token}"}
            )
        assert first.status_code == 204
        assert second.status_code == 204


# ---------------------------------------------------------------------------
# Fix #5: cleanup_user_objects task
# ---------------------------------------------------------------------------


class TestCleanupUserObjectsTask:
    def test_deletes_every_soft_deleted_extraction_key(self) -> None:
        from app.tasks import cleanup

        mock_db = MagicMock()
        # iterator returns two soft-deleted rows
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "e1", "document_object_key": "users/u/e1.pdf"},
                {"id": "e2", "document_object_key": "users/u/e2.pdf"},
            ]
        )

        storage = MagicMock()

        with (
            patch.object(cleanup, "_get_db_client", return_value=mock_db),
            patch.object(cleanup, "get_object_storage_service", return_value=storage),
        ):
            result = cleanup.cleanup_user_objects(USER_ID)

        assert result == {"user_id": USER_ID, "deleted": 2, "failed": 0}
        storage.delete_file.assert_any_call("users/u/e1.pdf")
        storage.delete_file.assert_any_call("users/u/e2.pdf")

    def test_skips_rows_without_object_key(self) -> None:
        from app.tasks import cleanup

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "e1", "document_object_key": None},
                {"id": "e2", "document_object_key": ""},
            ]
        )
        storage = MagicMock()
        with (
            patch.object(cleanup, "_get_db_client", return_value=mock_db),
            patch.object(cleanup, "get_object_storage_service", return_value=storage),
        ):
            result = cleanup.cleanup_user_objects(USER_ID)
        assert result["deleted"] == 0
        storage.delete_file.assert_not_called()

    def test_deletes_legacy_raw_keys_and_export_prefix(self) -> None:
        """A soft-deleted extraction's legacy original, every raw artifact, and
        the entire export namespace must all be purged — matching what
        single-extraction deletion removes."""
        from app.tasks import cleanup

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "e1",
                    "document_object_key": "users/u/e1.pdf",
                    "document_s3_key": "legacy/u/e1.pdf",
                    "raw_extraction_object_keys": [
                        "users/u/e1/raw/pass1.json",
                        "users/u/e1/raw/pass2.json",
                    ],
                }
            ]
        )

        storage = MagicMock()

        with (
            patch.object(cleanup, "_get_db_client", return_value=mock_db),
            patch.object(cleanup, "get_object_storage_service", return_value=storage),
        ):
            result = cleanup.cleanup_user_objects(USER_ID)

        # 4 explicit keys: current document, legacy original, 2 raw artifacts.
        assert result == {"user_id": USER_ID, "deleted": 4, "failed": 0}
        storage.delete_file.assert_any_call("users/u/e1.pdf")
        storage.delete_file.assert_any_call("legacy/u/e1.pdf")
        storage.delete_file.assert_any_call("users/u/e1/raw/pass1.json")
        storage.delete_file.assert_any_call("users/u/e1/raw/pass2.json")
        # Export namespace removed via prefix delete.
        storage.delete_prefix.assert_called_once_with(f"{USER_ID}/e1/exports/")

    def test_export_prefix_failure_counts_but_does_not_abort(self) -> None:
        from app.core.exceptions import ObjectStorageError
        from app.tasks import cleanup

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "e1", "document_object_key": "users/u/e1.pdf"},
                {"id": "e2", "document_object_key": "users/u/e2.pdf"},
            ]
        )
        storage = MagicMock()
        storage.delete_prefix.side_effect = [ObjectStorageError("boom"), None]
        with (
            patch.object(cleanup, "_get_db_client", return_value=mock_db),
            patch.object(cleanup, "get_object_storage_service", return_value=storage),
        ):
            result = cleanup.cleanup_user_objects(USER_ID)
        # Both explicit keys deleted; one prefix delete failed (counted).
        assert result == {"user_id": USER_ID, "deleted": 2, "failed": 1}

    def test_continues_on_individual_failures(self) -> None:
        from app.core.exceptions import ObjectStorageError
        from app.tasks import cleanup

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "e1", "document_object_key": "k1"},
                {"id": "e2", "document_object_key": "k2"},
            ]
        )
        storage = MagicMock()
        storage.delete_file.side_effect = [
            ObjectStorageError("transient"),
            None,
        ]
        with (
            patch.object(cleanup, "_get_db_client", return_value=mock_db),
            patch.object(cleanup, "get_object_storage_service", return_value=storage),
        ):
            result = cleanup.cleanup_user_objects(USER_ID)
        assert result == {"user_id": USER_ID, "deleted": 1, "failed": 1}


# ---------------------------------------------------------------------------
# Fix #6: /payments/history payload coverage
# ---------------------------------------------------------------------------


class TestPaymentsHistoryEndpointShape:
    def test_response_includes_all_documented_fields(
        self, app_client, rsa_keys
    ) -> None:
        token, public_key = _make_user_token(rsa_keys)
        mock_jwk, mock_rls = _mock_authed(public_key)

        from app.services.credit_service import reset_credit_service

        reset_credit_service()
        mock_svc = MagicMock()
        mock_svc.get_payment_history.return_value = (
            [
                {
                    "id": "11111111-1111-4111-a111-111111111111",
                    "payment_type": "single",
                    "amount_cents": 1500,
                    "currency": "usd",
                    "status": "completed",
                    "created_at": "2026-05-01T12:00:00Z",
                }
            ],
            1,
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch("app.api.v1.payments.get_credit_service", return_value=mock_svc),
        ):
            resp = app_client.get(
                "/api/v1/payments/history?page=1&page_size=20",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["page"] == 1
        assert body["page_size"] == 20
        assert len(body["payments"]) == 1
        payment = body["payments"][0]
        assert set(payment.keys()) == {
            "id",
            "payment_type",
            "amount_cents",
            "currency",
            "status",
            "created_at",
        }
        reset_credit_service()

    def test_page_size_over_max_is_rejected(self, app_client, rsa_keys) -> None:
        token, public_key = _make_user_token(rsa_keys)
        mock_jwk, mock_rls = _mock_authed(public_key)
        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
        ):
            resp = app_client.get(
                "/api/v1/payments/history?page=1&page_size=999",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 422

    def test_openapi_history_route_has_documented_response_example(
        self, app_client
    ) -> None:
        """OpenAPI schema MUST expose a 200 example so client codegen and the
        docs surface payload structure."""
        # `openapi_url` is gated behind debug+non-prod in main.create_app, so
        # we read the schema straight off the app object instead of going
        # through the (possibly disabled) HTTP route.
        schema = app_client.app.openapi()
        path = schema["paths"]["/api/v1/payments/history"]["get"]
        responses = path["responses"]
        assert "200" in responses
        content = responses["200"]["content"]["application/json"]
        # The example we added in fix #6 must show up either inline or via
        # the schema's example slot.
        assert "example" in content or "examples" in content
