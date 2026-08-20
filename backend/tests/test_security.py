"""Tests for app.core.security -- JWT validation via Neon Auth JWKS."""

import time
from typing import Any
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import httpx
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.security import (
    AuthenticationError,
    JWKSCache,
    _JWKS_CACHE_TTL_SECONDS,
    jwks_cache,
    verify_jwt,
    verify_neon_session,
)


# --- Fixtures: RSA key pair for testing ---


def _generate_rsa_keypair():
    """Generate an RSA private/public key pair for tests."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    return private_key


@pytest.fixture
def rsa_private_key():
    return _generate_rsa_keypair()


@pytest.fixture
def rsa_public_key(rsa_private_key):
    return rsa_private_key.public_key()


def _make_test_token(private_key, payload=None, headers=None):
    """Create a signed JWT for testing."""
    default_payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "iss": "https://auth.example.com",
    }
    if payload:
        default_payload.update(payload)

    return pyjwt.encode(
        default_payload,
        private_key,
        algorithm="RS256",
        headers=headers or {"kid": "test-kid"},
    )


class _FakeSessionResponse:
    def __init__(
        self, status_code: int = 200, body: dict[str, Any] | None = None
    ) -> None:
        self.status_code = status_code
        self._body = body or {
            "user": {"id": "user-123", "email": "user@example.com"},
            "session": {"userId": "user-123"},
        }

    def json(self) -> dict[str, Any]:
        return self._body


class _FakeAsyncClient:
    requested_url: str | None = None
    requested_urls: list[str] = []
    requested_headers: dict[str, str] | None = None
    response = _FakeSessionResponse()
    responses: list[_FakeSessionResponse] = []
    raises: Exception | None = None
    raises_by_url: dict[str, Exception] = {}

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def get(self, url: str, *, headers: dict[str, str]) -> _FakeSessionResponse:
        type(self).requested_url = url
        type(self).requested_urls.append(url)
        type(self).requested_headers = headers
        if url in type(self).raises_by_url:
            raise type(self).raises_by_url[url]
        if type(self).raises is not None:
            raise type(self).raises
        if type(self).responses:
            return type(self).responses.pop(0)
        return type(self).response


@pytest.fixture(autouse=True)
def reset_fake_async_client() -> None:
    _FakeAsyncClient.requested_url = None
    _FakeAsyncClient.requested_urls = []
    _FakeAsyncClient.requested_headers = None
    _FakeAsyncClient.response = _FakeSessionResponse()
    _FakeAsyncClient.responses = []
    _FakeAsyncClient.raises = None
    _FakeAsyncClient.raises_by_url = {}


# --- JWKSCache tests ---


class TestJWKSCache:
    def test_jwks_url_built_from_neon_auth_base_url(self):
        cache = JWKSCache()
        assert "/api/auth/.well-known/jwks.json" in cache.jwks_url

    def test_jwks_url_strips_trailing_slash(self):
        with patch("app.core.security.settings") as mock_settings:
            mock_settings.neon_jwks_url = None
            mock_settings.neon_auth_base_url = "http://localhost:4000/"
            cache = JWKSCache()
            assert (
                cache.jwks_url == "http://localhost:4000/api/auth/.well-known/jwks.json"
            )

    def test_jwks_url_uses_explicit_override_when_set(self):
        with patch("app.core.security.settings") as mock_settings:
            mock_settings.neon_jwks_url = "https://auth.example.com/custom-jwks.json"
            mock_settings.neon_auth_base_url = "http://localhost:4000/"
            cache = JWKSCache()
            assert cache.jwks_url == "https://auth.example.com/custom-jwks.json"

    def test_reset_clears_client(self):
        cache = JWKSCache()
        cache._jwk_client = MagicMock()
        cache._cached_at = 999.0
        cache.reset()
        assert cache._jwk_client is None
        assert cache._cached_at == 0.0

    def test_get_signing_key_creates_client_on_first_call(self, rsa_private_key):
        cache = JWKSCache()
        token = _make_test_token(rsa_private_key)

        mock_client = MagicMock()
        mock_jwk = MagicMock()
        mock_client.get_signing_key_from_jwt.return_value = mock_jwk

        with patch("app.core.security.PyJWKClient", return_value=mock_client):
            result = cache.get_signing_key(token)

        assert result is mock_jwk
        assert cache._jwk_client is mock_client

    def test_get_signing_key_reuses_cached_client(self, rsa_private_key):
        cache = JWKSCache()
        mock_client = MagicMock()
        cache._jwk_client = mock_client
        cache._cached_at = time.monotonic()

        token = _make_test_token(rsa_private_key)
        cache.get_signing_key(token)

        mock_client.get_signing_key_from_jwt.assert_called_once_with(token)

    def test_get_signing_key_refreshes_after_ttl(self, rsa_private_key):
        cache = JWKSCache()
        old_client = MagicMock()
        cache._jwk_client = old_client
        cache._cached_at = time.monotonic() - _JWKS_CACHE_TTL_SECONDS - 1

        new_client = MagicMock()
        token = _make_test_token(rsa_private_key)

        with patch("app.core.security.PyJWKClient", return_value=new_client):
            cache.get_signing_key(token)

        assert cache._jwk_client is new_client


# --- verify_jwt tests ---


class TestVerifyJwt:
    def test_valid_token_returns_payload(self, rsa_private_key, rsa_public_key):
        token = _make_test_token(rsa_private_key)
        mock_jwk = MagicMock()
        mock_jwk.key = rsa_public_key

        with patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk):
            payload = verify_jwt(token)

        assert payload["sub"] == "00000000-0000-0000-0000-000000000001"

    def test_expired_token_raises_authentication_error(
        self, rsa_private_key, rsa_public_key
    ):
        token = _make_test_token(rsa_private_key, {"exp": int(time.time()) - 10})
        mock_jwk = MagicMock()
        mock_jwk.key = rsa_public_key

        with patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk):
            with pytest.raises(AuthenticationError, match="expired"):
                verify_jwt(token)

    def test_malformed_token_raises_authentication_error(self, rsa_public_key):
        mock_jwk = MagicMock()
        mock_jwk.key = rsa_public_key

        with patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk):
            with pytest.raises(AuthenticationError):
                verify_jwt("not.a.valid.token")

    def test_wrong_key_raises_authentication_error(self, rsa_private_key):
        token = _make_test_token(rsa_private_key)
        other_key = _generate_rsa_keypair().public_key()
        mock_jwk = MagicMock()
        mock_jwk.key = other_key

        with patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk):
            with pytest.raises(AuthenticationError):
                verify_jwt(token)

    def test_jwks_fetch_failure_raises_authentication_error(self):
        with patch.object(
            jwks_cache,
            "get_signing_key",
            side_effect=Exception("Network error"),
        ):
            with pytest.raises(AuthenticationError, match="validation failed"):
                verify_jwt("some.token.here")

    def test_missing_sub_claim_token_rejected(self, rsa_private_key, rsa_public_key):
        """Token without 'sub' claim is rejected at validation."""
        payload = {
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }
        token = pyjwt.encode(
            payload,
            rsa_private_key,
            algorithm="RS256",
            headers={"kid": "test-kid"},
        )
        mock_jwk = MagicMock()
        mock_jwk.key = rsa_public_key

        with patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk):
            with pytest.raises(AuthenticationError):
                verify_jwt(token)

    def test_missing_iat_claim_rejected(self, rsa_private_key, rsa_public_key):
        """Token without 'iat' claim is rejected at validation."""
        payload = {
            "sub": "00000000-0000-0000-0000-000000000001",
            "exp": int(time.time()) + 3600,
        }
        token = pyjwt.encode(
            payload,
            rsa_private_key,
            algorithm="RS256",
            headers={"kid": "test-kid"},
        )
        mock_jwk = MagicMock()
        mock_jwk.key = rsa_public_key

        with patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk):
            with pytest.raises(AuthenticationError):
                verify_jwt(token)


# --- verify_neon_session tests ---


class TestVerifyNeonSession:
    @pytest.mark.asyncio
    async def test_uses_configured_auth_base_url(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Opaque session fallback must call Better Auth's configured session route."""
        auth_base_url = "https://auth.example.com/neondb/auth"
        monkeypatch.setattr(
            "app.core.security.settings.neon_auth_base_url", auth_base_url
        )
        monkeypatch.setattr("app.core.security.httpx.AsyncClient", _FakeAsyncClient)

        session = await verify_neon_session("opaque-session-token")

        assert session == {"user_id": "user-123", "email": "user@example.com"}
        assert _FakeAsyncClient.requested_url == f"{auth_base_url}/get-session"
        assert _FakeAsyncClient.requested_headers == {
            "Cookie": "__Secure-neon-auth.session_token=opaque-session-token"
        }

    @pytest.mark.asyncio
    async def test_non_200_response_raises_authentication_error(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr("app.core.security.httpx.AsyncClient", _FakeAsyncClient)
        _FakeAsyncClient.response = _FakeSessionResponse(status_code=401)

        with pytest.raises(AuthenticationError, match="Invalid session token"):
            await verify_neon_session("bad-token")

    @pytest.mark.asyncio
    async def test_falls_back_to_jwks_derived_session_url(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """A stale auth base URL should not break session validation when JWKS is set."""
        monkeypatch.setattr(
            "app.core.security.settings.neon_auth_base_url",
            "https://stale.example.com/neondb/auth",
        )
        monkeypatch.setattr(
            "app.core.security.settings.neon_jwks_url",
            "https://auth.example.com/neondb/auth/.well-known/jwks.json",
        )
        monkeypatch.setattr(
            "app.core.security.settings.frontend_url",
            "https://lextract.io",
        )
        monkeypatch.setattr("app.core.security.httpx.AsyncClient", _FakeAsyncClient)
        _FakeAsyncClient.responses = [
            _FakeSessionResponse(status_code=401),
            _FakeSessionResponse(),
        ]

        session = await verify_neon_session("opaque-session-token")

        assert session == {"user_id": "user-123", "email": "user@example.com"}
        assert _FakeAsyncClient.requested_urls == [
            "https://stale.example.com/neondb/auth/get-session",
            "https://auth.example.com/neondb/auth/get-session",
        ]

    @pytest.mark.asyncio
    async def test_falls_back_to_frontend_auth_proxy(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Frontend auth proxy fallback keeps prod auth working if backend auth env lags."""
        monkeypatch.setattr(
            "app.core.security.settings.neon_auth_base_url",
            "https://stale.example.com/neondb/auth",
        )
        monkeypatch.setattr("app.core.security.settings.neon_jwks_url", None)
        monkeypatch.setattr(
            "app.core.security.settings.frontend_url",
            "https://lextract.io",
        )
        monkeypatch.setattr("app.core.security.httpx.AsyncClient", _FakeAsyncClient)
        _FakeAsyncClient.responses = [
            _FakeSessionResponse(status_code=401),
            _FakeSessionResponse(),
        ]

        session = await verify_neon_session("opaque-session-token")

        assert session == {"user_id": "user-123", "email": "user@example.com"}
        assert _FakeAsyncClient.requested_urls == [
            "https://stale.example.com/neondb/auth/get-session",
            "https://lextract.io/api/auth/get-session",
        ]

    @pytest.mark.asyncio
    async def test_falls_back_after_primary_transport_error(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """A network-broken primary auth URL should not skip later candidates."""
        primary_url = "https://stale.example.com/neondb/auth/get-session"
        fallback_url = "https://lextract.io/api/auth/get-session"
        monkeypatch.setattr(
            "app.core.security.settings.neon_auth_base_url",
            "https://stale.example.com/neondb/auth",
        )
        monkeypatch.setattr("app.core.security.settings.neon_jwks_url", None)
        monkeypatch.setattr(
            "app.core.security.settings.frontend_url",
            "https://lextract.io",
        )
        monkeypatch.setattr("app.core.security.httpx.AsyncClient", _FakeAsyncClient)
        _FakeAsyncClient.raises_by_url = {primary_url: httpx.ConnectError("dns failed")}

        session = await verify_neon_session("opaque-session-token")

        assert session == {"user_id": "user-123", "email": "user@example.com"}
        assert _FakeAsyncClient.requested_urls == [primary_url, fallback_url]

    @pytest.mark.asyncio
    async def test_response_without_user_id_raises_authentication_error(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr("app.core.security.httpx.AsyncClient", _FakeAsyncClient)
        _FakeAsyncClient.response = _FakeSessionResponse(
            body={"user": {"email": "user@example.com"}, "session": {}}
        )

        with pytest.raises(
            AuthenticationError, match="Session response missing user ID"
        ):
            await verify_neon_session("bad-token")

    @pytest.mark.asyncio
    async def test_transport_error_raises_authentication_error(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr("app.core.security.httpx.AsyncClient", _FakeAsyncClient)
        _FakeAsyncClient.raises = RuntimeError("network down")

        with pytest.raises(AuthenticationError, match="Session validation failed"):
            await verify_neon_session("bad-token")


# --- AuthenticationError tests ---


class TestAuthenticationError:
    def test_default_message(self):
        err = AuthenticationError()
        assert err.detail == "Authentication required"
        assert str(err) == "Authentication required"

    def test_custom_message(self):
        err = AuthenticationError("Custom error")
        assert err.detail == "Custom error"
