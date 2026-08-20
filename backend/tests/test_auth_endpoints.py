"""Tests for auth API endpoints (POST /api/v1/auth/*).

Neon Auth migration: signup/login/refresh removed; sync-user added.
"""

import time
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.core.security import jwks_cache
from app.main import create_app


def _generate_rsa_keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def rsa_keys():
    private = _generate_rsa_keypair()
    return private, private.public_key()


def _make_token(private_key, sub="00000000-0000-0000-0000-000000000001", **overrides):
    payload = {
        "sub": sub,
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "iss": "https://auth.example.com",
        "email": "user@example.com",
    }
    payload.update(overrides)
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


def _mock_current_user_lookup(mock_rls, user_row: dict) -> None:
    query = mock_rls.table.return_value.select.return_value.eq.return_value
    query.maybe_single.return_value.execute.return_value = MagicMock(data=user_row)
    query.single.return_value.execute.return_value = MagicMock(data=user_row)


@pytest.fixture
def app_client():
    app = create_app()
    return TestClient(app)


# --- Sync User ---


class TestSyncUserEndpoint:
    def _auth_headers(self, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)
        return {"Authorization": f"Bearer {token}"}, token, public_key

    def test_sync_user_creates_user_row(self, app_client, rsa_keys):
        headers, token, public_key = self._auth_headers(rsa_keys)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        mock_admin.table.return_value.upsert.return_value.execute.return_value = (
            MagicMock(data=[{"id": "00000000-0000-0000-0000-000000000001"}])
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/sync-user",
                json={
                    "email": "user@example.com",
                    "full_name": "Test User",
                },
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["synced"] is True
        assert data["user_id"] == "00000000-0000-0000-0000-000000000001"

    def test_sync_user_requires_auth(self, app_client):
        resp = app_client.post(
            "/api/v1/auth/sync-user",
            json={"email": "user@example.com"},
        )
        assert resp.status_code == 401

    def test_sync_user_without_full_name(self, app_client, rsa_keys):
        headers, token, public_key = self._auth_headers(rsa_keys)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        mock_admin.table.return_value.upsert.return_value.execute.return_value = (
            MagicMock(data=[{"id": "00000000-0000-0000-0000-000000000001"}])
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/sync-user",
                json={"email": "user@example.com"},
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["synced"] is True

    def test_sync_user_db_error_returns_500(self, app_client, rsa_keys):
        headers, token, public_key = self._auth_headers(rsa_keys)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        mock_admin.table.return_value.upsert.return_value.execute.side_effect = (
            Exception("DB error")
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/sync-user",
                json={"email": "user@example.com"},
                headers=headers,
            )

        assert resp.status_code == 500

    def test_sync_user_upserts_with_correct_data(self, app_client, rsa_keys):
        """Verify the upsert call receives user_id from JWT sub claim."""
        headers, token, public_key = self._auth_headers(rsa_keys)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        mock_upsert = MagicMock()
        mock_admin.table.return_value.upsert.return_value = mock_upsert
        mock_upsert.execute.return_value = MagicMock(
            data=[{"id": "00000000-0000-0000-0000-000000000001"}]
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": "Test User",
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/sync-user",
                json={"email": "user@example.com", "full_name": "Test User"},
                headers=headers,
            )

        assert resp.status_code == 200
        # Verify upsert was called with the right table
        mock_admin.table.assert_called_with("users")
        # Verify upsert data includes user ID from JWT
        upsert_call = mock_admin.table.return_value.upsert.call_args
        upsert_data = upsert_call[0][0]
        assert upsert_data["id"] == "00000000-0000-0000-0000-000000000001"
        assert upsert_data["email"] == "user@example.com"
        assert upsert_data["full_name"] == "Test User"

    def test_sync_user_uses_jwt_email_not_body_email(self, app_client, rsa_keys):
        """Bug #47: sync-user must use the JWT email claim, never body.email.

        An attacker could send body.email=victim@example.com with their own
        JWT to overwrite another user's email. The fix uses user.email from
        the validated JWT instead.
        """
        private_key, public_key = rsa_keys
        # JWT contains the real authenticated email
        jwt_email = "real@example.com"
        token = _make_token(private_key, email=jwt_email)
        headers = {"Authorization": f"Bearer {token}"}

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        upsert_calls: list[dict] = []

        mock_admin = MagicMock()

        def capture_upsert(data, **kwargs):
            upsert_calls.append(data)
            chain = MagicMock()
            chain.execute.return_value = MagicMock(
                data=[{"id": "00000000-0000-0000-0000-000000000001"}]
            )
            return chain

        mock_admin.table.return_value.upsert = capture_upsert

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": jwt_email,
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/sync-user",
                # Attacker-controlled body email differs from JWT email
                json={"email": "attacker@example.com"},
                headers=headers,
            )

        assert resp.status_code == 200
        assert len(upsert_calls) == 1
        # Must use JWT email, not body.email
        assert upsert_calls[0]["email"] == jwt_email, (
            f"Expected JWT email '{jwt_email}' but got '{upsert_calls[0]['email']}'. "
            "Bug #47: sync-user must not trust body.email."
        )
        assert upsert_calls[0]["email"] != "attacker@example.com"


# --- Signup/Login/Refresh removed ---


class TestRemovedEndpoints:
    def test_signup_endpoint_not_found(self, app_client):
        resp = app_client.post(
            "/api/v1/auth/signup",
            json={
                "email": "test@example.com",
                "password": "Password1",
            },
        )
        assert resp.status_code == 405 or resp.status_code == 404

    def test_login_endpoint_not_found(self, app_client):
        resp = app_client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "Password1",
            },
        )
        assert resp.status_code == 405 or resp.status_code == 404

    def test_refresh_endpoint_not_found(self, app_client):
        resp = app_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "some-token"},
        )
        assert resp.status_code == 405 or resp.status_code == 404


# --- Anonymous Session ---


class TestAnonymousSessionEndpoint:
    def test_create_anonymous_session_success(self, app_client):
        mock_admin = MagicMock()
        mock_admin.table.return_value.insert.return_value.execute.return_value = (
            MagicMock(
                data=[
                    {
                        "id": "session-uuid",
                        "session_token": "abc",
                        "expires_at": "2026-03-19T00:00:00Z",
                    }
                ]
            )
        )

        with patch(
            "app.api.v1.auth.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.post("/api/v1/auth/anonymous")

        assert resp.status_code == 201
        data = resp.json()
        assert "session_token" in data
        assert "expires_at" in data

    def test_create_anonymous_session_db_error(self, app_client):
        mock_admin = MagicMock()
        mock_admin.table.return_value.insert.return_value.execute.side_effect = (
            Exception("DB error")
        )

        with patch(
            "app.api.v1.auth.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.post("/api/v1/auth/anonymous")

        assert resp.status_code == 500


# --- Save Anonymous Email ---


class TestAnonymousEmailEndpoint:
    def test_save_email_success(self, app_client):
        mock_admin = MagicMock()
        mock_admin.table.return_value.update.return_value.eq.return_value.is_.return_value.gt.return_value.execute.return_value = MagicMock(
            data=[{"id": "session-uuid", "email": "test@example.com"}]
        )

        with patch(
            "app.api.v1.auth.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.patch(
                "/api/v1/auth/anonymous/email",
                json={"email": "test@example.com"},
                headers={"X-Session-Token": "valid-token"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["updated"] is True

    def test_save_email_missing_session_token(self, app_client):
        resp = app_client.patch(
            "/api/v1/auth/anonymous/email",
            json={"email": "test@example.com"},
        )
        assert resp.status_code == 401

    def test_save_email_session_not_found(self, app_client):
        mock_admin = MagicMock()
        mock_admin.table.return_value.update.return_value.eq.return_value.is_.return_value.gt.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch(
            "app.api.v1.auth.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.patch(
                "/api/v1/auth/anonymous/email",
                json={"email": "test@example.com"},
                headers={"X-Session-Token": "invalid-token"},
            )

        assert resp.status_code == 404

    def test_save_email_invalid_email(self, app_client):
        resp = app_client.patch(
            "/api/v1/auth/anonymous/email",
            json={"email": "not-an-email"},
            headers={"X-Session-Token": "some-token"},
        )
        assert resp.status_code == 422

    def test_save_email_db_error(self, app_client):
        mock_admin = MagicMock()
        mock_admin.table.return_value.update.return_value.eq.return_value.is_.return_value.gt.return_value.execute.side_effect = Exception(
            "DB error"
        )

        with patch(
            "app.api.v1.auth.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.patch(
                "/api/v1/auth/anonymous/email",
                json={"email": "test@example.com"},
                headers={"X-Session-Token": "valid-token"},
            )

        assert resp.status_code == 500

    def test_save_email_expired_session_returns_404(self, app_client):
        mock_admin = MagicMock()
        chain = (
            mock_admin.table.return_value.update.return_value.eq.return_value.is_.return_value.gt.return_value
        )
        chain.execute.return_value = MagicMock(data=[])

        with patch(
            "app.api.v1.auth.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.patch(
                "/api/v1/auth/anonymous/email",
                json={"email": "test@example.com"},
                headers={"X-Session-Token": "expired-token"},
            )

        assert resp.status_code == 404


# --- Link Session ---


class TestLinkSessionEndpoint:
    def _auth_headers(self, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)
        return {"Authorization": f"Bearer {token}"}, token, public_key

    def test_link_session_success(self, app_client, rsa_keys):
        headers, token, public_key = self._auth_headers(rsa_keys)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        # Session lookup
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "session-uuid",
                    "session_token": "tok",
                    "linked_user_id": None,
                    "expires_at": "2099-01-01T00:00:00+00:00",
                }
            ]
        )
        # Session update
        mock_admin.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )
        # Extraction transfer
        mock_admin.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[{"id": "ext-1"}, {"id": "ext-2"}]
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/link",
                json={"session_token": "tok"},
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["linked"] is True
        assert data["extractions_transferred"] == 2

    def test_link_session_clears_anonymous_session_id(self, app_client, rsa_keys):
        """Transferring extractions must clear anonymous_session_id.

        Ownership invariant: an extraction has exactly one owner. When the
        session-link path attaches extractions to a user it must null out
        anonymous_session_id (matching the webhook guest-provisioning path),
        otherwise a row is reachable via both ownership paths — including the
        ``extractions_select_own_anon`` RLS policy, which keys off
        anonymous_session_id without checking linked_user_id.
        """
        headers, token, public_key = self._auth_headers(rsa_keys)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "session-uuid",
                    "session_token": "tok",
                    "linked_user_id": None,
                    "expires_at": "2099-01-01T00:00:00+00:00",
                }
            ]
        )
        mock_admin.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )
        mock_admin.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[{"id": "ext-1"}]
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/link",
                json={"session_token": "tok"},
                headers=headers,
            )

        assert resp.status_code == 200
        # The extraction-transfer UPDATE payload must set the new owner AND
        # clear anonymous_session_id so the row has exactly one owner.
        update_payloads = [
            call.args[0]
            for call in mock_admin.table.return_value.update.call_args_list
            if call.args
            and isinstance(call.args[0], dict)
            and "anonymous_session_id" in call.args[0]
        ]
        assert (
            update_payloads
        ), "extraction-transfer UPDATE never cleared anonymous_session_id"
        transfer_payload = update_payloads[0]
        assert transfer_payload["user_id"] == "00000000-0000-0000-0000-000000000001"
        assert transfer_payload["anonymous_session_id"] is None

    def test_link_session_not_found(self, app_client, rsa_keys):
        headers, token, public_key = self._auth_headers(rsa_keys)
        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/link",
                json={"session_token": "invalid"},
                headers=headers,
            )

        assert resp.status_code == 404

    def test_link_session_requires_auth(self, app_client):
        resp = app_client.post(
            "/api/v1/auth/link",
            json={"session_token": "tok"},
        )
        assert resp.status_code == 401

    def test_link_expired_session(self, app_client, rsa_keys):
        headers, token, public_key = self._auth_headers(rsa_keys)
        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "session-uuid",
                    "session_token": "tok",
                    "linked_user_id": None,
                    "expires_at": "2020-01-01T00:00:00+00:00",
                }
            ]
        )

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "user@example.com",
                "full_name": None,
                "company": None,
                "role": None,
                "credits_balance": 0,
                "stripe_customer_id": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                "/api/v1/auth/link",
                json={"session_token": "tok"},
                headers=headers,
            )

        assert resp.status_code == 410
