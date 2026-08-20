"""Tests for app.core.dependencies -- get_current_user, get_optional_user."""

import time
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.dependencies import (
    SESSION_TOKEN_HEADER,
    get_current_user,
    get_db,
    get_optional_user,
)
from app.core.security import jwks_cache
from app.models.user import AnonymousSession, User


def _generate_rsa_keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def rsa_keys():
    private = _generate_rsa_keypair()
    return private, private.public_key()


def _make_token(private_key, sub="00000000-0000-0000-0000-000000000001"):
    payload = {
        "sub": sub,
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "iss": "https://auth.example.com",
    }
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


USER_ROW = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "user@example.com",
    "full_name": None,
    "company": None,
    "role": None,
    "credits_balance": 0,
    "stripe_customer_id": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}


def _mock_current_user_lookup(
    mock_rls: MagicMock,
    *,
    maybe_data: dict | None = None,
    single_data: dict | None = None,
    maybe_side_effect: Exception | None = None,
    single_side_effect: Exception | None = None,
) -> None:
    query = mock_rls.table.return_value.select.return_value.eq.return_value
    if maybe_side_effect is not None:
        query.maybe_single.return_value.execute.side_effect = maybe_side_effect
    else:
        query.maybe_single.return_value.execute.return_value = MagicMock(
            data=maybe_data
        )
    if single_side_effect is not None:
        query.single.return_value.execute.side_effect = single_side_effect
    else:
        query.single.return_value.execute.return_value = MagicMock(data=single_data)


class TestGetDb:
    def test_returns_neon_db_client(self):
        from app.database.client import NeonDB

        client = get_db()
        assert isinstance(client, NeonDB)


class TestGetCurrentUser:
    def test_missing_credentials_returns_401(self):
        """Calling with no credentials raises 401."""
        app = FastAPI()

        @app.get("/test")
        async def test_route(
            user=pytest.importorskip("fastapi").Depends(get_current_user),
        ):
            return {"user": str(user.id)}

        client = TestClient(app)
        resp = client.get("/test")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self):
        app = FastAPI()

        @app.get("/test")
        async def test_route(
            user=pytest.importorskip("fastapi").Depends(get_current_user),
        ):
            return {"user": str(user.id)}

        client = TestClient(app)

        with patch.object(
            jwks_cache, "get_signing_key", side_effect=Exception("JWKS error")
        ):
            resp = client.get("/test", headers={"Authorization": "Bearer bad-token"})

        # JWT decode fails, then opaque-session validation is attempted. With no
        # auth endpoint reachable in the test env, this fails closed with 503
        # (retry); a reachable auth service that positively rejects yields 401.
        assert resp.status_code in (401, 503)

    def test_valid_token_returns_user(self, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            maybe_data=USER_ROW.copy(),
            single_data=USER_ROW.copy(),
        )

        app = FastAPI()

        @app.get("/test")
        async def test_route(
            user=pytest.importorskip("fastapi").Depends(get_current_user),
        ):
            return {"user_id": str(user.id), "email": user.email}

        client = TestClient(app)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
        ):
            resp = client.get("/test", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 200
        assert resp.json()["email"] == "user@example.com"

    def test_valid_token_sets_sentry_user_context(self, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            maybe_data=USER_ROW.copy(),
            single_data=USER_ROW.copy(),
        )

        app = FastAPI()

        @app.get("/test")
        async def test_route(
            user=pytest.importorskip("fastapi").Depends(get_current_user),
        ):
            return {"user_id": str(user.id)}

        client = TestClient(app)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch("app.core.dependencies.set_user_context") as mock_set_user_context,
        ):
            resp = client.get("/test", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 200
        mock_set_user_context.assert_called_once_with(user_id=USER_ROW["id"])

    def test_user_not_found_returns_401(self, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_rls = MagicMock()
        _mock_current_user_lookup(mock_rls, maybe_data=None, single_data=None)

        app = FastAPI()

        @app.get("/test")
        async def test_route(
            user=pytest.importorskip("fastapi").Depends(get_current_user),
        ):
            return {"user_id": str(user.id)}

        client = TestClient(app)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
        ):
            resp = client.get("/test", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 401

    def test_soft_deleted_user_returns_401(self, rsa_keys):
        """A tombstoned (deleted_at set) account must not authenticate."""
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        deleted_row = USER_ROW.copy()
        deleted_row["deleted_at"] = "2026-05-01T00:00:00Z"

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            maybe_data=deleted_row,
            single_data=deleted_row,
        )

        app = FastAPI()

        @app.get("/test")
        async def test_route(
            user=pytest.importorskip("fastapi").Depends(get_current_user),
        ):
            return {"user_id": str(user.id)}

        client = TestClient(app)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
        ):
            resp = client.get("/test", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 401

    def test_db_error_returns_401(self, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            maybe_side_effect=Exception("DB down"),
        )

        app = FastAPI()

        @app.get("/test")
        async def test_route(
            user=pytest.importorskip("fastapi").Depends(get_current_user),
        ):
            return {}

        client = TestClient(app)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
        ):
            resp = client.get("/test", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 401


class TestGetOptionalUser:
    def test_no_credentials_returns_none(self):
        app = FastAPI()

        @app.get("/test")
        async def test_route(
            identity=pytest.importorskip("fastapi").Depends(get_optional_user),
        ):
            return {"identity": identity}

        client = TestClient(app)
        resp = client.get("/test")
        assert resp.status_code == 200
        assert resp.json()["identity"] is None

    def test_valid_bearer_returns_user(self, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_rls = MagicMock()
        _mock_current_user_lookup(
            mock_rls,
            maybe_data=USER_ROW.copy(),
            single_data=USER_ROW.copy(),
        )

        app = FastAPI()

        @app.get("/test")
        async def test_route(
            identity=pytest.importorskip("fastapi").Depends(get_optional_user),
        ):
            if isinstance(identity, User):
                return {"type": "user", "email": identity.email}
            return {"type": "none"}

        client = TestClient(app)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
        ):
            resp = client.get("/test", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 200
        assert resp.json()["type"] == "user"

    def test_invalid_bearer_returns_401(self):
        app = FastAPI()

        @app.get("/test")
        async def test_route(
            identity=pytest.importorskip("fastapi").Depends(get_optional_user),
        ):
            return {"identity": str(identity)}

        client = TestClient(app)

        with patch.object(jwks_cache, "get_signing_key", side_effect=Exception("Bad")):
            resp = client.get("/test", headers={"Authorization": "Bearer bad-token"})

        # A provided-but-invalid bearer is still rejected (not silently treated
        # as anonymous). With the auth service unreachable in the test env the
        # rejection surfaces as 503 (retry); a reachable auth service yields 401.
        assert resp.status_code in (401, 503)

    def test_session_token_returns_anonymous_session(self):
        app = FastAPI()

        @app.get("/test")
        async def test_route(
            identity=pytest.importorskip("fastapi").Depends(get_optional_user),
        ):
            if isinstance(identity, AnonymousSession):
                return {"type": "anonymous", "token": identity.session_token}
            return {"type": "none"}

        client = TestClient(app)

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": "00000000-0000-0000-0000-000000000002",
                    "session_token": "test-session-token",
                    "linked_user_id": None,
                    "expires_at": "2099-01-01T00:00:00Z",
                    "created_at": "2026-01-01T00:00:00Z",
                }
            ]
        )

        with patch(
            "app.core.dependencies.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = client.get(
                "/test",
                headers={SESSION_TOKEN_HEADER: "test-session-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["type"] == "anonymous"

    def test_invalid_session_token_returns_none(self):
        app = FastAPI()

        @app.get("/test")
        async def test_route(
            identity=pytest.importorskip("fastapi").Depends(get_optional_user),
        ):
            return {"identity": identity}

        client = TestClient(app)

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch(
            "app.core.dependencies.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = client.get(
                "/test",
                headers={SESSION_TOKEN_HEADER: "invalid-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["identity"] is None

    def test_session_lookup_db_error_returns_none(self):
        app = FastAPI()

        @app.get("/test")
        async def test_route(
            identity=pytest.importorskip("fastapi").Depends(get_optional_user),
        ):
            return {"identity": identity}

        client = TestClient(app)

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.side_effect = Exception(
            "DB error"
        )

        with patch(
            "app.core.dependencies.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = client.get(
                "/test",
                headers={SESSION_TOKEN_HEADER: "some-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["identity"] is None


class TestSessionTokenHeader:
    def test_header_constant(self):
        assert SESSION_TOKEN_HEADER == "x-session-token"
