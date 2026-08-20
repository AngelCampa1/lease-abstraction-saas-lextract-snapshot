"""Tests for guest checkout flow (Task 3b â€” Remove Signup Wall).

Tests cover:
1. Checkout with guest_email stores it on extraction and passes to Stripe
2. Checkout with guest_email as authenticated user ignores guest_email (no-op)
3. Checkout with invalid guest_email returns 422
4. Webhook with guest_email creates new user and links extraction
5. Webhook with guest_email for existing user just links extraction
6. Webhook guest account creation failure doesn't fail webhook
"""

from __future__ import annotations

import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.core.security import jwks_cache
from app.main import create_app
from app.models.user import AnonymousSession
from app.services.stripe_service import reset_stripe_service

USER_ID = "00000000-0000-0000-0000-000000000001"
EXTRACTION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
GUEST_EMAIL = "guest@example.com"
ANON_SESSION_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
ANON_SESSION_TOKEN = "anon-token"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def app_client() -> TestClient:
    app = create_app()
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_singletons() -> None:
    reset_stripe_service()
    yield
    reset_stripe_service()


def _generate_rsa_keypair() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _make_token(private_key: rsa.RSAPrivateKey, sub: str = USER_ID) -> str:
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


def _make_rsa_keys() -> tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    priv = _generate_rsa_keypair()
    return priv, priv.public_key()


def _mock_user_lookup(public_key: rsa.RSAPublicKey) -> tuple[MagicMock, MagicMock]:
    mock_jwk = MagicMock()
    mock_jwk.key = public_key

    mock_rls = MagicMock()
    user_row = {
        "id": USER_ID,
        "email": "user@example.com",
        "full_name": "Test User",
        "company": None,
        "role": None,
        "credits_balance": 5,
        "stripe_customer_id": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    query = mock_rls.table.return_value.select.return_value.eq.return_value
    query.maybe_single.return_value.execute.return_value = MagicMock(data=user_row)
    query.single.return_value.execute.return_value = MagicMock(data=user_row)
    return mock_jwk, mock_rls


def _make_mock_stripe_session(
    url: str = "https://checkout.stripe.com/session_test",
    session_id: str = "cs_test_guest",
) -> MagicMock:
    sess = MagicMock()
    sess.url = url
    sess.id = session_id
    return sess


def _anonymous_session() -> AnonymousSession:
    return AnonymousSession(
        id=ANON_SESSION_ID,
        session_token=ANON_SESSION_TOKEN,
        linked_user_id=None,
        expires_at="2026-12-31T00:00:00Z",
        created_at="2026-01-01T00:00:00Z",
    )


# ---------------------------------------------------------------------------
# Test: checkout with guest_email (unauthenticated)
# ---------------------------------------------------------------------------


class TestGuestCheckout:
    def test_guest_checkout_stores_email_and_calls_stripe(
        self, app_client: TestClient
    ) -> None:
        """Guest checkout stores guest_email on extraction and calls Stripe."""
        mock_stripe_session = _make_mock_stripe_session()
        mock_db = MagicMock()
        # Table chain for update (guest_email store)
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": EXTRACTION_ID}]
        )

        with (
            patch(
                "app.core.dependencies._lookup_anonymous_session",
                new=AsyncMock(return_value=_anonymous_session()),
            ),
            patch(
                "app.api.v1.payments.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.stripe_service.stripe.checkout.Session.create",
                return_value=mock_stripe_session,
            ) as mock_stripe_create,
        ):
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "extraction_id": EXTRACTION_ID,
                    "guest_email": GUEST_EMAIL,
                    "success_url": "https://lextract.io/results/abc?payment=success",
                    "cancel_url": "https://lextract.io/results/abc?payment=cancelled",
                },
                headers={"X-Session-Token": ANON_SESSION_TOKEN},
            )

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["checkout_url"] == "https://checkout.stripe.com/session_test"
        assert data["session_id"] == "cs_test_guest"

        # Stripe should be called with customer_email
        call_kwargs = mock_stripe_create.call_args[1]
        assert call_kwargs["customer_email"] == GUEST_EMAIL
        # guest_email should be in metadata
        assert call_kwargs["metadata"]["guest_email"] == GUEST_EMAIL
        assert call_kwargs["metadata"]["anonymous_session_id"] == ANON_SESSION_ID
        # user_id should be empty string for guests
        assert call_kwargs["metadata"]["user_id"] == ""

        # DB should have been called to store guest_email on extraction
        mock_db.table.assert_called_with("extractions")

    def test_guest_checkout_without_extraction_id_returns_422(
        self, app_client: TestClient
    ) -> None:
        """Single guest checkout requires an extraction_id to bind ownership."""
        mock_stripe_session = _make_mock_stripe_session()

        with (
            patch(
                "app.core.dependencies._lookup_anonymous_session",
                new=AsyncMock(return_value=_anonymous_session()),
            ),
            patch(
                "app.services.stripe_service.stripe.checkout.Session.create",
                return_value=mock_stripe_session,
            ),
            patch(
                "app.api.v1.payments.NeonClientManager.get_service_client"
            ) as mock_get_db,
        ):
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "guest_email": GUEST_EMAIL,
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
                headers={"X-Session-Token": ANON_SESSION_TOKEN},
            )

        assert resp.status_code == 422
        mock_get_db.assert_not_called()

    def test_unauthenticated_without_guest_email_returns_401(
        self, app_client: TestClient
    ) -> None:
        """Unauthenticated request with no guest_email must return 401."""
        resp = app_client.post(
            "/api/v1/payments/checkout",
            json={
                "product_type": "single",
                "success_url": "https://lextract.io/success",
                "cancel_url": "https://lextract.io/cancel",
            },
        )
        assert resp.status_code == 401

    def test_invalid_guest_email_returns_422(self, app_client: TestClient) -> None:
        """Invalid guest_email must return 422 Unprocessable Entity."""
        resp = app_client.post(
            "/api/v1/payments/checkout",
            json={
                "product_type": "single",
                "guest_email": "not-an-email",
                "success_url": "https://lextract.io/success",
                "cancel_url": "https://lextract.io/cancel",
            },
        )
        assert resp.status_code == 422

    def test_authenticated_user_ignores_guest_email(
        self, app_client: TestClient
    ) -> None:
        """When authenticated, guest_email is ignored â€” user_id used instead."""
        private_key, public_key = _make_rsa_keys()
        token = _make_token(private_key)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)
        mock_stripe_session = _make_mock_stripe_session()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.services.stripe_service.stripe.checkout.Session.create",
                return_value=mock_stripe_session,
            ) as mock_stripe_create,
            patch(
                "app.api.v1.payments.NeonClientManager.get_service_client"
            ) as mock_get_db,
        ):
            mock_get_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                data={"id": EXTRACTION_ID}
            )
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "extraction_id": EXTRACTION_ID,
                    "guest_email": GUEST_EMAIL,
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 200
        call_kwargs = mock_stripe_create.call_args[1]
        # Authenticated: user_id is set, customer_email is NOT set
        assert call_kwargs["metadata"]["user_id"] == USER_ID
        assert "customer_email" not in call_kwargs
        # guest_email not in metadata for authenticated users
        assert "guest_email" not in call_kwargs["metadata"]


# ---------------------------------------------------------------------------
# Test: webhook guest account creation
# ---------------------------------------------------------------------------


def _make_webhook_event(
    product_type: str,
    extraction_id: str = EXTRACTION_ID,
    user_id: str = "",
    guest_email: str = "",
    anonymous_session_id: str = ANON_SESSION_ID,
) -> dict[str, Any]:
    return {
        "id": "evt_guest_test",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_guest_session",
                "amount_total": 2000,
                "payment_intent": "pi_test_guest",
                "metadata": {
                    "user_id": user_id,
                    "product_type": product_type,
                    "extraction_id": extraction_id,
                    "credits": "1",
                    "guest_email": guest_email,
                    "anonymous_session_id": anonymous_session_id,
                },
            }
        },
    }


def _build_webhook_db_mock(
    existing_user_id: str | None = None,
) -> MagicMock:
    """Build a mock DB that returns existing_user_id on users lookup if provided."""
    mock_db = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        t = MagicMock()
        t.insert.return_value = t
        t.update.return_value = t
        t.upsert.return_value = t
        t.select.return_value = t
        t.eq.return_value = t
        t.is_.return_value = t
        t.maybe_single.return_value = t

        if name == "users" and existing_user_id is not None:
            # Return existing user on select/maybe_single/eq chain
            t.execute.return_value = MagicMock(data={"id": existing_user_id})
        else:
            t.execute.return_value = MagicMock(data=[{"id": "row-1"}])
        return t

    mock_db.table.side_effect = table_side_effect
    return mock_db


class TestWebhookGuestCheckout:
    def _fire_webhook(
        self,
        app_client: TestClient,
        event_data: dict[str, Any],
        mock_db: MagicMock,
        mock_credit_svc: MagicMock,
        extra_patches: dict[str, Any] | None = None,
    ) -> Any:
        mock_stripe_event = MagicMock()
        mock_stripe_event.id = event_data["id"]
        mock_stripe_event.type = event_data["type"]
        mock_stripe_event.data.object = event_data["data"]["object"]

        patches = {
            "app.api.v1.webhooks.get_stripe_service": None,
            "app.api.v1.webhooks.NeonClientManager.get_service_client": mock_db,
            "app.api.v1.webhooks.get_credit_service": mock_credit_svc,
        }
        if extra_patches:
            patches.update(extra_patches)

        with (
            patch("app.api.v1.webhooks.get_stripe_service") as mock_get_stripe,
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            mock_get_stripe.return_value.verify_webhook_signature.return_value = (
                mock_stripe_event
            )
            if extra_patches:
                # Apply extra patches (e.g. for _provision_guest_user)
                with patch.multiple("app.api.v1.webhooks", **extra_patches):
                    resp = app_client.post(
                        "/api/v1/webhooks/stripe",
                        content=b'{"test": true}',
                        headers={"stripe-signature": "t=123,v1=abc"},
                    )
            else:
                resp = app_client.post(
                    "/api/v1/webhooks/stripe",
                    content=b'{"test": true}',
                    headers={"stripe-signature": "t=123,v1=abc"},
                )
        return resp

    def test_webhook_with_guest_email_creates_user_and_links_extraction(
        self, app_client: TestClient
    ) -> None:
        """Webhook provisions new user and links extraction when guest_email set."""
        event = _make_webhook_event("single", EXTRACTION_ID, guest_email=GUEST_EMAIL)
        new_user_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

        mock_db = _build_webhook_db_mock(existing_user_id=None)
        # users lookup returns no user
        mock_db.table("users").execute.return_value = MagicMock(data=None)

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {
            "id": "pay-guest"
        }

        with (
            patch("app.api.v1.webhooks.get_stripe_service") as mock_get_stripe,
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            patch(
                "app.api.v1.webhooks._provision_guest_user",
                new=AsyncMock(return_value=new_user_id),
            ),
        ):
            mock_stripe_event = MagicMock()
            mock_stripe_event.id = event["id"]
            mock_stripe_event.type = event["type"]
            mock_stripe_event.data.object = event["data"]["object"]
            mock_get_stripe.return_value.verify_webhook_signature.return_value = (
                mock_stripe_event
            )

            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 200
        mock_credit_svc.record_single_payment_and_unlock.assert_called_once()
        call_kwargs = mock_credit_svc.record_single_payment_and_unlock.call_args.kwargs
        assert call_kwargs["user_id"] == new_user_id

    def test_webhook_with_guest_email_existing_user_links_extraction(
        self, app_client: TestClient
    ) -> None:
        """When user already exists for guest_email, just links extraction."""
        event = _make_webhook_event("single", EXTRACTION_ID, guest_email=GUEST_EMAIL)
        existing_user_id = "cccccccc-cccc-cccc-cccc-cccccccccccc"

        mock_db = _build_webhook_db_mock(existing_user_id=existing_user_id)
        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {
            "id": "pay-existing-guest"
        }

        with (
            patch("app.api.v1.webhooks.get_stripe_service") as mock_get_stripe,
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            patch(
                "app.api.v1.webhooks._provision_guest_user",
                new=AsyncMock(return_value=existing_user_id),
            ),
        ):
            mock_stripe_event = MagicMock()
            mock_stripe_event.id = event["id"]
            mock_stripe_event.type = event["type"]
            mock_stripe_event.data.object = event["data"]["object"]
            mock_get_stripe.return_value.verify_webhook_signature.return_value = (
                mock_stripe_event
            )

            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 200
        mock_credit_svc.record_single_payment_and_unlock.assert_called_once()

    def test_webhook_guest_account_creation_failure_raises_for_retry(
        self, app_client: TestClient
    ) -> None:
        """If _provision_guest_user fails, webhook raises so Stripe can retry."""
        event = _make_webhook_event("single", EXTRACTION_ID, guest_email=GUEST_EMAIL)

        mock_db = _build_webhook_db_mock()
        mock_credit_svc = MagicMock()

        with (
            patch("app.api.v1.webhooks.get_stripe_service") as mock_get_stripe,
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            patch(
                "app.api.v1.webhooks._provision_guest_user",
                # Returns empty string â€” simulates failure without raising
                new=AsyncMock(return_value=""),
            ),
        ):
            mock_stripe_event = MagicMock()
            mock_stripe_event.id = event["id"]
            mock_stripe_event.type = event["type"]
            mock_stripe_event.data.object = event["data"]["object"]
            mock_get_stripe.return_value.verify_webhook_signature.return_value = (
                mock_stripe_event
            )

            with pytest.raises(RuntimeError, match="Guest user provisioning failed"):
                app_client.post(
                    "/api/v1/webhooks/stripe",
                    content=b'{"test": true}',
                    headers={"stripe-signature": "t=123,v1=abc"},
                )


# ---------------------------------------------------------------------------
# Unit tests: _provision_guest_user
# ---------------------------------------------------------------------------


class TestProvisionGuestUser:
    """Unit tests for the _provision_guest_user helper."""

    @pytest.mark.asyncio
    async def test_provision_returns_existing_user_id(self) -> None:
        """If user already exists in public.users, returns their id."""
        from app.api.v1.webhooks import _provision_guest_user

        existing_id = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
        mock_db = MagicMock()
        chain = mock_db.table.return_value.select.return_value.eq.return_value
        chain.maybe_single.return_value.execute.return_value = MagicMock(
            data={"id": existing_id}
        )

        with patch(
            "app.api.v1.webhooks.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result = await _provision_guest_user(GUEST_EMAIL, EXTRACTION_ID)

        assert result == existing_id

    @pytest.mark.asyncio
    async def test_provision_does_not_prelink_anonymous_extraction(self) -> None:
        """Guest webhook unlocks anonymous extraction atomically after provisioning."""
        from app.api.v1.webhooks import _provision_guest_user

        existing_id = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
        mock_db = MagicMock()
        chain = mock_db.table.return_value.select.return_value.eq.return_value
        chain.maybe_single.return_value.execute.return_value = MagicMock(
            data={"id": existing_id}
        )

        with patch(
            "app.api.v1.webhooks.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result = await _provision_guest_user(
                GUEST_EMAIL,
                EXTRACTION_ID,
                anonymous_session_id=ANON_SESSION_ID,
            )

        assert result == existing_id
        mock_db.table.return_value.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_provision_creates_user_when_not_exists(self) -> None:
        """When user not in public.users, calls _create_auth_user and inserts row."""
        from app.api.v1.webhooks import _provision_guest_user

        new_id = "ffffffff-ffff-ffff-ffff-ffffffffffff"
        mock_db = MagicMock()
        # No existing user
        chain = mock_db.table.return_value.select.return_value.eq.return_value
        chain.maybe_single.return_value.execute.return_value = MagicMock(data=None)
        # Upsert / update return success
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": new_id}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": EXTRACTION_ID}]
        )

        with (
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks._create_auth_user",
                new=AsyncMock(return_value=new_id),
            ),
            patch(
                "app.api.v1.webhooks._send_guest_welcome_email",
                new=AsyncMock(),
            ),
        ):
            result = await _provision_guest_user(GUEST_EMAIL, EXTRACTION_ID)

        assert result == new_id

    @pytest.mark.asyncio
    async def test_provision_returns_empty_string_on_exception(self) -> None:
        """If anything raises, returns empty string (payment already processed)."""
        from app.api.v1.webhooks import _provision_guest_user

        with patch(
            "app.api.v1.webhooks.NeonClientManager.get_service_client",
            side_effect=RuntimeError("DB is down"),
        ):
            result = await _provision_guest_user(GUEST_EMAIL, EXTRACTION_ID)

        assert result == ""


# ---------------------------------------------------------------------------
# Unit tests: _create_auth_user
# ---------------------------------------------------------------------------


class TestCreateAuthUser:
    """Unit tests for the Better Auth admin API call."""

    @pytest.mark.asyncio
    async def test_returns_user_id_on_success(self) -> None:
        from app.api.v1.webhooks import _create_auth_user

        returned_id = "aabbccdd-0000-0000-0000-000000000001"
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {"user": {"id": returned_id}}

        with patch("app.api.v1.webhooks.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await _create_auth_user(GUEST_EMAIL)

        assert result == returned_id

    @pytest.mark.asyncio
    async def test_returns_empty_when_auth_returns_error(self) -> None:
        """When Better Auth returns non-200, returns empty string."""
        from app.api.v1.webhooks import _create_auth_user

        mock_resp = MagicMock()
        mock_resp.status_code = 409  # conflict (user already exists in auth)
        mock_resp.text = "conflict"

        with patch("app.api.v1.webhooks.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch("app.api.v1.webhooks.uuid.uuid4") as mock_uuid:
                import uuid as uuid_mod

                fixed_uuid = uuid_mod.UUID("11111111-1111-1111-1111-111111111111")
                mock_uuid.return_value = fixed_uuid
                result = await _create_auth_user(GUEST_EMAIL)

        assert result == ""

    @pytest.mark.asyncio
    async def test_returns_empty_on_network_error(self) -> None:
        """Network errors return empty string."""
        from app.api.v1.webhooks import _create_auth_user

        with patch("app.api.v1.webhooks.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=ConnectionError("timeout"))
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch("app.api.v1.webhooks.uuid.uuid4") as mock_uuid:
                import uuid as uuid_mod

                fixed_uuid = uuid_mod.UUID("22222222-2222-2222-2222-222222222222")
                mock_uuid.return_value = fixed_uuid
                result = await _create_auth_user(GUEST_EMAIL)

        assert result == ""


# ---------------------------------------------------------------------------
# Unit tests: CheckoutRequest schema validation
# ---------------------------------------------------------------------------


class TestCheckoutRequestGuestEmail:
    def test_valid_guest_email_is_accepted(self) -> None:
        from app.schemas.payment import CheckoutRequest

        req = CheckoutRequest(
            product_type="single",
            guest_email="guest@company.com",
            success_url="https://lextract.io/success",
            cancel_url="https://lextract.io/cancel",
        )
        assert req.guest_email == "guest@company.com"

    def test_invalid_guest_email_raises_validation_error(self) -> None:
        from pydantic import ValidationError

        from app.schemas.payment import CheckoutRequest

        with pytest.raises(ValidationError):
            CheckoutRequest(
                product_type="single",
                guest_email="not-an-email",
                success_url="https://lextract.io/success",
                cancel_url="https://lextract.io/cancel",
            )

    def test_none_guest_email_is_accepted(self) -> None:
        """Explicit None passed to the validator must be accepted (null guard)."""
        from app.schemas.payment import CheckoutRequest

        req = CheckoutRequest(
            product_type="single",
            guest_email=None,  # explicit None exercises the null guard in the validator
            success_url="https://lextract.io/success",
            cancel_url="https://lextract.io/cancel",
        )
        assert req.guest_email is None

    def test_null_guest_email_in_json_body_returns_200(
        self, app_client: TestClient
    ) -> None:
        """Sending guest_email: null in JSON must not crash the validator (not 500)."""
        mock_stripe_session = _make_mock_stripe_session()

        with patch(
            "app.services.stripe_service.stripe.checkout.Session.create",
            return_value=mock_stripe_session,
        ):
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "guest_email": None,
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
            )

        # guest_email=null with no auth â†’ 401 (not 422 or 500)
        # The null guard in validate_guest_email must not raise before auth check
        assert resp.status_code in (
            200,
            401,
        ), f"Expected 200 or 401, got {resp.status_code}: {resp.text}"

    def test_whitespace_only_guest_email_becomes_none(self) -> None:
        from app.schemas.payment import CheckoutRequest

        req = CheckoutRequest(
            product_type="single",
            guest_email="   ",
            success_url="https://lextract.io/success",
            cancel_url="https://lextract.io/cancel",
        )
        assert req.guest_email is None

    def test_guest_email_is_stripped(self) -> None:
        from app.schemas.payment import CheckoutRequest

        req = CheckoutRequest(
            product_type="single",
            guest_email="  user@example.com  ",
            success_url="https://lextract.io/success",
            cancel_url="https://lextract.io/cancel",
        )
        assert req.guest_email == "user@example.com"

    def test_whitespace_only_success_url_raises_validation_error(self) -> None:
        """Whitespace-only URL must be rejected by validate_url_scheme."""
        from pydantic import ValidationError

        from app.schemas.payment import CheckoutRequest

        with pytest.raises(ValidationError):
            CheckoutRequest(
                product_type="single",
                success_url="   ",  # whitespace-only after strip â†’ rejected
                cancel_url="https://lextract.io/cancel",
            )

    def test_http_localhost_url_is_accepted(self) -> None:
        """http://localhost URLs must be accepted for local dev."""
        from app.schemas.payment import CheckoutRequest

        req = CheckoutRequest(
            product_type="single",
            success_url="http://localhost:3000/results/abc?payment=success",
            cancel_url="http://127.0.0.1:3000/cancel",
        )
        assert req.success_url == "http://localhost:3000/results/abc?payment=success"

    def test_plain_http_url_raises_validation_error(self) -> None:
        """Non-localhost http:// URLs must be rejected."""
        from pydantic import ValidationError

        from app.schemas.payment import CheckoutRequest

        with pytest.raises(ValidationError):
            CheckoutRequest(
                product_type="single",
                success_url="http://evil.com/steal",
                cancel_url="https://lextract.io/cancel",
            )


# ---------------------------------------------------------------------------
# Unit tests: _generate_password_reset_url
# ---------------------------------------------------------------------------


class TestGeneratePasswordResetUrl:
    """Unit tests for the password reset URL helper."""

    @pytest.mark.asyncio
    async def test_returns_reset_url_on_success(self) -> None:
        """Returns the URL from the Better Auth response on success."""
        from app.api.v1.webhooks import _generate_password_reset_url

        reset_url = "https://app.lextract.io/reset?token=abc123"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"url": reset_url}

        with (
            patch("app.api.v1.webhooks.httpx.AsyncClient") as mock_client_cls,
            patch("app.core.config.settings") as mock_settings,
        ):
            mock_settings.neon_auth_base_url = "https://auth.example.com"
            mock_settings.frontend_url = "https://lextract.io"
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await _generate_password_reset_url(GUEST_EMAIL)

        assert result == reset_url

    @pytest.mark.asyncio
    async def test_returns_link_field_when_url_missing(self) -> None:
        """Falls back to 'link' key if 'url' is absent in response."""
        from app.api.v1.webhooks import _generate_password_reset_url

        link_url = "https://app.lextract.io/reset?token=xyz"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"link": link_url}

        with patch("app.api.v1.webhooks.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch("app.api.v1.webhooks.settings") as mock_settings:
                mock_settings.neon_auth_base_url = "https://auth.example.com"
                mock_settings.frontend_url = "https://lextract.io"
                result = await _generate_password_reset_url(GUEST_EMAIL)

        assert result == link_url

    @pytest.mark.asyncio
    async def test_falls_back_to_frontend_url_on_non_200(self) -> None:
        """On non-200 response, returns the frontend /reset-password fallback."""
        from app.api.v1.webhooks import _generate_password_reset_url

        mock_resp = MagicMock()
        mock_resp.status_code = 500

        with patch("app.api.v1.webhooks.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch("app.api.v1.webhooks.settings") as mock_settings:
                mock_settings.neon_auth_base_url = "https://auth.example.com"
                mock_settings.frontend_url = "https://lextract.io"
                result = await _generate_password_reset_url(GUEST_EMAIL)

        assert result == "https://lextract.io/reset-password"

    @pytest.mark.asyncio
    async def test_falls_back_to_frontend_url_on_network_error(self) -> None:
        """Network errors fall back to frontend /reset-password URL."""
        from app.api.v1.webhooks import _generate_password_reset_url

        with patch("app.api.v1.webhooks.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=ConnectionError("timeout"))
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch("app.api.v1.webhooks.settings") as mock_settings:
                mock_settings.neon_auth_base_url = "https://auth.example.com"
                mock_settings.frontend_url = "https://lextract.io"
                result = await _generate_password_reset_url(GUEST_EMAIL)

        assert result == "https://lextract.io/reset-password"


# ---------------------------------------------------------------------------
# Unit tests: _send_guest_welcome_email
# ---------------------------------------------------------------------------


class TestSendGuestWelcomeEmail:
    """Unit tests for the guest welcome email helper."""

    @pytest.mark.asyncio
    async def test_sends_email_successfully(self) -> None:
        """Calls EmailService.send_complete_your_account with correct args."""
        from app.api.v1.webhooks import _send_guest_welcome_email

        mock_email_svc = MagicMock()

        with (
            patch("app.api.v1.webhooks.settings") as mock_settings,
            patch(
                "app.api.v1.webhooks._generate_password_reset_url",
                new=AsyncMock(return_value="https://lextract.io/reset-password"),
            ),
            # EmailService is imported inside the function body, so patch via its module
            patch("app.services.email.EmailService", return_value=mock_email_svc),
        ):
            mock_settings.frontend_url = "https://lextract.io"
            mock_settings.resend_api_key = "re_test_key"

            await _send_guest_welcome_email(
                guest_email=GUEST_EMAIL,
                user_id="user-123",
                extraction_id=EXTRACTION_ID,
            )

        mock_email_svc.send_complete_your_account.assert_called_once_with(
            to=GUEST_EMAIL,
            results_url=f"https://lextract.io/results/{EXTRACTION_ID}",
            password_reset_url="https://lextract.io/reset-password",
        )

    @pytest.mark.asyncio
    async def test_uses_frontend_url_when_no_extraction_id(self) -> None:
        """When extraction_id is empty, results_url falls back to frontend root."""
        from app.api.v1.webhooks import _send_guest_welcome_email

        mock_email_svc = MagicMock()

        with (
            patch("app.api.v1.webhooks.settings") as mock_settings,
            patch(
                "app.api.v1.webhooks._generate_password_reset_url",
                new=AsyncMock(return_value="https://lextract.io/reset-password"),
            ),
            patch("app.services.email.EmailService", return_value=mock_email_svc),
        ):
            mock_settings.frontend_url = "https://lextract.io"
            mock_settings.resend_api_key = "re_test_key"

            await _send_guest_welcome_email(
                guest_email=GUEST_EMAIL,
                user_id="user-123",
                extraction_id="",
            )

        call_kwargs = mock_email_svc.send_complete_your_account.call_args[1]
        assert call_kwargs["results_url"] == "https://lextract.io"

    @pytest.mark.asyncio
    async def test_email_failure_is_silently_swallowed(self) -> None:
        """Email send failure must NOT raise â€” webhook 200 must be preserved."""
        from app.api.v1.webhooks import _send_guest_welcome_email

        mock_email_svc = MagicMock()
        mock_email_svc.send_complete_your_account.side_effect = RuntimeError(
            "SMTP down"
        )

        with (
            patch("app.api.v1.webhooks.settings") as mock_settings,
            patch(
                "app.api.v1.webhooks._generate_password_reset_url",
                new=AsyncMock(return_value="https://lextract.io/reset-password"),
            ),
            patch("app.services.email.EmailService", return_value=mock_email_svc),
        ):
            mock_settings.frontend_url = "https://lextract.io"
            mock_settings.resend_api_key = "re_test_key"

            # Must not raise
            await _send_guest_welcome_email(
                guest_email=GUEST_EMAIL,
                user_id="user-123",
                extraction_id=EXTRACTION_ID,
            )


# ---------------------------------------------------------------------------
# Additional edge cases for _provision_guest_user
# ---------------------------------------------------------------------------


class TestProvisionGuestUserEdgeCases:
    """Cover remaining branches in _provision_guest_user."""

    @pytest.mark.asyncio
    async def test_existing_user_with_no_extraction_id_skips_link(self) -> None:
        """Existing user but no extraction_id â€” no extractions.update call."""
        from app.api.v1.webhooks import _provision_guest_user

        existing_id = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2"
        mock_db = MagicMock()
        chain = mock_db.table.return_value.select.return_value.eq.return_value
        chain.maybe_single.return_value.execute.return_value = MagicMock(
            data={"id": existing_id}
        )

        with patch(
            "app.api.v1.webhooks.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result = await _provision_guest_user(GUEST_EMAIL, "")  # empty extraction_id

        assert result == existing_id
        # No extractions.update call should have been made (link step skipped)
        update_calls = [
            c
            for c in mock_db.table.call_args_list
            if c.args and c.args[0] == "extractions"
        ]
        assert len(update_calls) == 0

    @pytest.mark.asyncio
    async def test_create_auth_user_returning_empty_string_causes_early_return(
        self,
    ) -> None:
        """When _create_auth_user returns '', _provision_guest_user returns ''."""
        from app.api.v1.webhooks import _provision_guest_user

        mock_db = MagicMock()
        chain = mock_db.table.return_value.select.return_value.eq.return_value
        chain.maybe_single.return_value.execute.return_value = MagicMock(data=None)

        with (
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks._create_auth_user",
                new=AsyncMock(return_value=""),
            ),
        ):
            result = await _provision_guest_user(GUEST_EMAIL, EXTRACTION_ID)

        assert result == ""

    @pytest.mark.asyncio
    async def test_new_user_with_no_extraction_id_skips_link(self) -> None:
        """New user created but no extraction_id â€” skip extractions link step."""
        from app.api.v1.webhooks import _provision_guest_user

        new_id = "ffffffff-ffff-ffff-ffff-fffffffffffe"
        mock_db = MagicMock()
        chain = mock_db.table.return_value.select.return_value.eq.return_value
        chain.maybe_single.return_value.execute.return_value = MagicMock(data=None)
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": new_id}]
        )

        with (
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks._create_auth_user",
                new=AsyncMock(return_value=new_id),
            ),
            patch(
                "app.api.v1.webhooks._send_guest_welcome_email",
                new=AsyncMock(),
            ),
        ):
            result = await _provision_guest_user(GUEST_EMAIL, "")  # empty extraction_id

        assert result == new_id


# ---------------------------------------------------------------------------
# Transient error in webhook handler triggers 500
# ---------------------------------------------------------------------------


class TestWebhookTransientError:
    """Verify transient errors propagate as 500 so Stripe retries."""

    def test_transient_error_returns_500(self) -> None:
        """Non-permanent exceptions from handler re-raise, causing 500 response.

        Uses raise_server_exceptions=False so TestClient converts unhandled
        exceptions to 500 responses rather than re-raising them.
        """
        from app.api.v1.webhooks import _PERMANENT_ERRORS

        # Confirm RuntimeError is NOT in the permanent errors tuple
        assert RuntimeError not in _PERMANENT_ERRORS

        event_data: dict[str, Any] = {
            "id": "evt_transient_test",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_transient",
                    "amount_total": 2000,
                    "payment_intent": "pi_test_transient",
                    "metadata": {
                        "user_id": USER_ID,
                        "product_type": "single",
                        "extraction_id": EXTRACTION_ID,
                        "credits": "1",
                        "guest_email": "",
                    },
                }
            },
        }
        mock_stripe_event = MagicMock()
        mock_stripe_event.id = event_data["id"]
        mock_stripe_event.type = event_data["type"]
        mock_stripe_event.data.object = event_data["data"]["object"]

        # raise_server_exceptions=False: unhandled exceptions become HTTP 500 responses
        app = create_app()
        client = TestClient(app, raise_server_exceptions=False)

        with (
            patch("app.api.v1.webhooks.get_stripe_service") as mock_get_stripe,
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client"
            ) as mock_db_cls,
            patch("app.api.v1.webhooks.get_credit_service") as mock_credit_cls,
            patch(
                "app.api.v1.webhooks._handle_checkout_completed",
                new=AsyncMock(side_effect=RuntimeError("DB connection pool exhausted")),
            ),
        ):
            mock_get_stripe.return_value.verify_webhook_signature.return_value = (
                mock_stripe_event
            )
            mock_db = MagicMock()
            mock_db.table.return_value.insert.return_value.execute.return_value = (
                MagicMock(data=[{"id": "evt_transient_test"}])
            )
            mock_db_cls.return_value = mock_db
            mock_credit_cls.return_value = MagicMock()

            resp = client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# _claim_webhook_event: remaining branch coverage
# ---------------------------------------------------------------------------


class TestClaimWebhookEventBranches:
    """Cover the two uncovered branches in _claim_webhook_event."""

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_duplicate_key_with_no_existing_data_returns_false(
        self, mock_get_client: MagicMock
    ) -> None:
        """Duplicate key error but DB query returns no row (data is None) â†’ False."""
        from app.api.v1.webhooks import _claim_webhook_event

        mock_db = MagicMock()
        duplicate_error = Exception("duplicate key value violates unique constraint")
        mock_db.table.return_value.insert.return_value.execute.side_effect = (
            duplicate_error
        )
        # .maybe_single().execute() returns no data
        mock_db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data=None
        )
        mock_get_client.return_value = mock_db

        result = _claim_webhook_event("evt_no_data", "checkout.session.completed")
        assert result is False

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_non_duplicate_exception_reraises(self, mock_get_client: MagicMock) -> None:
        """Non-duplicate DB error (e.g. connection failure) propagates as transient."""
        from app.api.v1.webhooks import _claim_webhook_event

        mock_db = MagicMock()
        # Raise an error that is NOT a duplicate key violation
        mock_db.table.return_value.insert.return_value.execute.side_effect = (
            RuntimeError("connection refused")
        )
        mock_get_client.return_value = mock_db

        with pytest.raises(RuntimeError, match="connection refused"):
            _claim_webhook_event("evt_conn_error", "checkout.session.completed")
