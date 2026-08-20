"""Tests for user profile API endpoints (GET/PATCH /api/v1/user/profile)."""

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


def _make_token(private_key, sub="00000000-0000-0000-0000-000000000001"):
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "role": "authenticated",
    }
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


@pytest.fixture
def app_client():
    app = create_app()
    return TestClient(app)


USER_ROW = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "user@example.com",
    "full_name": "Test User",
    "company": "ACME Corp",
    "role": "broker",
    "credits_balance": 5,
    "stripe_customer_id": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}


def _setup_auth_mocks(rsa_keys):
    private_key, public_key = rsa_keys
    token = _make_token(private_key)
    headers = {"Authorization": f"Bearer {token}"}

    mock_jwk = MagicMock()
    mock_jwk.key = public_key

    mock_rls = MagicMock()
    user_query = mock_rls.table.return_value.select.return_value.eq.return_value
    user_row = USER_ROW.copy()
    user_query.maybe_single.return_value.execute.return_value = MagicMock(data=user_row)
    user_query.single.return_value.execute.return_value = MagicMock(data=user_row)

    return headers, mock_jwk, mock_rls


class TestGetProfile:
    def test_get_profile_success(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
        ):
            resp = app_client.get("/api/v1/user/profile", headers=headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "user@example.com"
        assert data["full_name"] == "Test User"
        assert data["company"] == "ACME Corp"
        assert data["role"] == "broker"
        assert data["credits_balance"] == 5

    def test_get_profile_without_auth(self, app_client):
        resp = app_client.get("/api/v1/user/profile")
        assert resp.status_code == 401

    def test_get_profile_with_invalid_token(self, app_client):
        # A bad JWT falls back to opaque-session validation. The outcome
        # depends on whether any auth endpoint was reachable: a positive
        # non-200 reply means "invalid session" -> 401, while a pure
        # transport outage (no endpoint answered) fails closed with 503 so
        # the client retries instead of treating an outage as a sign-out.
        # Both are correct "not authenticated" outcomes for this endpoint.
        resp = app_client.get(
            "/api/v1/user/profile",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert resp.status_code in (401, 503)


class TestUpdateProfile:
    def test_update_profile_success(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        updated_row = USER_ROW.copy()
        updated_row["full_name"] = "Updated Name"
        updated_row["updated_at"] = "2026-03-16T12:00:00Z"

        mock_admin = MagicMock()
        mock_admin.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated_row]
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.patch(
                "/api/v1/user/profile",
                json={"full_name": "Updated Name"},
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_update_profile_multiple_fields(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        updated_row = USER_ROW.copy()
        updated_row["full_name"] = "New Name"
        updated_row["company"] = "New Corp"
        updated_row["role"] = "attorney"

        mock_admin = MagicMock()
        mock_admin.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated_row]
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.patch(
                "/api/v1/user/profile",
                json={
                    "full_name": "New Name",
                    "company": "New Corp",
                    "role": "attorney",
                },
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["company"] == "New Corp"
        assert data["role"] == "attorney"

    def test_update_profile_empty_body_rejected(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
        ):
            resp = app_client.patch(
                "/api/v1/user/profile",
                json={},
                headers=headers,
            )

        assert resp.status_code == 400

    def test_update_profile_invalid_role(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
        ):
            resp = app_client.patch(
                "/api/v1/user/profile",
                json={"role": "admin"},
                headers=headers,
            )

        assert resp.status_code == 422

    def test_update_profile_without_auth(self, app_client):
        resp = app_client.patch(
            "/api/v1/user/profile",
            json={"full_name": "Test"},
        )
        assert resp.status_code == 401

    def test_update_profile_db_error(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        mock_admin = MagicMock()
        mock_admin.table.return_value.update.return_value.eq.return_value.execute.side_effect = Exception(
            "DB error"
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.patch(
                "/api/v1/user/profile",
                json={"full_name": "Test"},
                headers=headers,
            )

        assert resp.status_code == 500

    def test_update_profile_user_not_found(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        mock_admin = MagicMock()
        mock_admin.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.patch(
                "/api/v1/user/profile",
                json={"full_name": "Test"},
                headers=headers,
            )

        assert resp.status_code == 404
