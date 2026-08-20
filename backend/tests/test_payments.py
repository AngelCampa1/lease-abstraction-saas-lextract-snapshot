"""Tests for payment API endpoints (POST /api/v1/payments/*).

Tests exercise real endpoint logic with mocks only at external boundaries
(Supabase, Stripe).
"""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.core.security import jwks_cache
from app.main import create_app
from app.services.credit_service import reset_credit_service
from app.services.stripe_service import reset_stripe_service

USER_ID = "00000000-0000-0000-0000-000000000001"
EXTRACTION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def _generate_rsa_keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def rsa_keys():
    private = _generate_rsa_keypair()
    return private, private.public_key()


def _make_token(private_key, sub=USER_ID, **overrides):
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "role": "authenticated",
    }
    payload.update(overrides)
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


@pytest.fixture
def app_client():
    app = create_app()
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_singletons():
    reset_credit_service()
    reset_stripe_service()
    yield
    reset_credit_service()
    reset_stripe_service()


def _auth_headers(rsa_keys):
    private_key, public_key = rsa_keys
    token = _make_token(private_key)
    return {"Authorization": f"Bearer {token}"}, token, public_key


def _mock_user_lookup(public_key):
    """Return patches needed for auth dependency to work."""
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


class TestCheckoutEndpoint:
    def test_creates_stripe_checkout_session(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        mock_stripe_session = MagicMock()
        mock_stripe_session.url = "https://checkout.stripe.com/c/pay_123"
        mock_stripe_session.id = "cs_test_123"

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.services.stripe_service.stripe.checkout.Session.create",
                return_value=mock_stripe_session,
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "credit_pack_5",
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["checkout_url"] == "https://checkout.stripe.com/c/pay_123"
        assert data["session_id"] == "cs_test_123"

    def test_unauthenticated_returns_401(self, app_client):
        resp = app_client.post(
            "/api/v1/payments/checkout",
            json={
                "product_type": "single",
                "success_url": "https://lextract.io/success",
                "cancel_url": "https://lextract.io/cancel",
            },
        )
        assert resp.status_code == 401

    def test_stripe_error_returns_502(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        from app.core.exceptions import StripeError

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.payments.NeonClientManager.get_service_client"
            ) as mock_get_db,
            patch(
                "app.services.stripe_service.stripe.checkout.Session.create",
                side_effect=StripeError("Network error"),
            ),
        ):
            mock_get_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                data={"id": EXTRACTION_ID}
            )
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "extraction_id": EXTRACTION_ID,
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
                headers=headers,
            )

        assert resp.status_code == 502


class TestUseCreditEndpoint:
    def test_preflight_allows_lextract_origin(self, app_client):
        resp = app_client.options(
            "/api/v1/payments/use-credit",
            headers={
                "Origin": "https://lextract.io",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization, Content-Type, X-Session-Token",
            },
        )

        assert resp.status_code == 200
        assert resp.headers["access-control-allow-origin"] == "https://lextract.io"
        assert resp.headers["access-control-allow-credentials"] == "true"
        assert "POST" in resp.headers["access-control-allow-methods"]
        assert "Authorization" in resp.headers["access-control-allow-headers"]
        assert "Content-Type" in resp.headers["access-control-allow-headers"]
        assert "X-Session-Token" in resp.headers["access-control-allow-headers"]

    def test_success_deducts_credit(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        mock_credit_svc = MagicMock()
        mock_credit_svc.use_credit = AsyncMock(
            return_value={
                "new_balance": 4,
                "extraction_id": EXTRACTION_ID,
            }
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.payments.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/use-credit",
                json={"extraction_id": EXTRACTION_ID},
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["new_balance"] == 4
        assert data["extraction_id"] == EXTRACTION_ID

    def test_insufficient_credits_returns_402(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        from app.core.exceptions import InsufficientCreditsError

        mock_credit_svc = MagicMock()
        mock_credit_svc.use_credit = AsyncMock(
            side_effect=InsufficientCreditsError(required=1, available=0)
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.payments.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/use-credit",
                json={"extraction_id": EXTRACTION_ID},
                headers=headers,
            )

        assert resp.status_code == 402

    def test_conflict_returns_409(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        from app.core.exceptions import ConflictError

        mock_credit_svc = MagicMock()
        mock_credit_svc.use_credit = AsyncMock(
            side_effect=ConflictError(
                "Concurrent modification", resource_type="user", resource_id=USER_ID
            )
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.payments.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/use-credit",
                json={"extraction_id": EXTRACTION_ID},
                headers=headers,
            )

        assert resp.status_code == 409

    def test_not_found_returns_404(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        from app.core.exceptions import NotFoundError

        mock_credit_svc = MagicMock()
        mock_credit_svc.use_credit = AsyncMock(
            side_effect=NotFoundError("extraction", EXTRACTION_ID)
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.payments.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/use-credit",
                json={"extraction_id": EXTRACTION_ID},
                headers=headers,
            )

        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, app_client):
        resp = app_client.post(
            "/api/v1/payments/use-credit",
            json={"extraction_id": EXTRACTION_ID},
        )
        assert resp.status_code == 401


class TestCreditsEndpoint:
    def test_returns_balance_and_transactions(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        mock_credit_svc = MagicMock()
        mock_credit_svc.get_balance.return_value = 7
        mock_credit_svc.get_recent_transactions.return_value = [
            {
                "id": "tx-1",
                "amount": 5,
                "balance_after": 7,
                "description": "5-credit pack",
                "created_at": "2026-03-16T00:00:00Z",
            },
        ]

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.payments.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            resp = app_client.get(
                "/api/v1/payments/credits",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["balance"] == 7
        assert len(data["recent_transactions"]) == 1
        assert data["recent_transactions"][0]["amount"] == 5

    def test_unauthenticated_returns_401(self, app_client):
        resp = app_client.get("/api/v1/payments/credits")
        assert resp.status_code == 401


class TestPaymentHistoryEndpoint:
    def test_returns_paginated_history(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        mock_credit_svc = MagicMock()
        mock_credit_svc.get_payment_history.return_value = (
            [
                {
                    "id": "pay-1",
                    "payment_type": "single",
                    "amount_cents": 1000,
                    "status": "completed",
                    "created_at": "2026-03-16T00:00:00Z",
                },
            ],
            5,
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
            patch(
                "app.api.v1.payments.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            resp = app_client.get(
                "/api/v1/payments/history?page=1&page_size=10",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert len(data["payments"]) == 1

    def test_unauthenticated_returns_401(self, app_client):
        resp = app_client.get("/api/v1/payments/history")
        assert resp.status_code == 401

    def test_invalid_page_returns_422(self, app_client, rsa_keys):
        headers, token, public_key = _auth_headers(rsa_keys)
        mock_jwk, mock_rls = _mock_user_lookup(public_key)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client", return_value=mock_rls
            ),
        ):
            resp = app_client.get(
                "/api/v1/payments/history?page=0",
                headers=headers,
            )

        assert resp.status_code == 422


class TestCreditSchemas:
    """Test credit schema construction."""

    def test_credit_transaction_response_construction(self):
        from app.schemas.credit import CreditTransactionResponse

        tx = CreditTransactionResponse(
            id="abc-123",
            amount=5,
            balance_after=10,
            description="Test",
            created_at="2026-03-16T00:00:00Z",
        )
        assert tx.amount == 5
        assert tx.balance_after == 10

    def test_credit_balance_response_construction(self):
        from app.schemas.credit import CreditBalanceResponse

        resp = CreditBalanceResponse(balance=7, recent_transactions=[])
        assert resp.balance == 7

    def test_use_credit_request_validation(self):
        from app.schemas.credit import UseCreditRequest

        req = UseCreditRequest(extraction_id="abc-123")
        assert req.extraction_id == "abc-123"

    def test_use_credit_request_empty_extraction_id_fails(self):
        from app.schemas.credit import UseCreditRequest

        with pytest.raises(Exception):
            UseCreditRequest(extraction_id="")

    def test_use_credit_response_construction(self):
        from app.schemas.credit import UseCreditResponse

        resp = UseCreditResponse(success=True, new_balance=4, extraction_id="x")
        assert resp.success is True

    def test_payment_record_construction(self):
        from app.schemas.credit import PaymentRecord

        rec = PaymentRecord(
            id="p-1",
            payment_type="single",
            amount_cents=1000,
            currency="usd",
            status="completed",
            created_at="2026-03-16T00:00:00Z",
        )
        assert rec.amount_cents == 1000
        assert rec.currency == "usd"

    def test_payment_history_response_construction(self):
        from app.schemas.credit import PaymentHistoryResponse

        resp = PaymentHistoryResponse(payments=[], total=0, page=1, page_size=20)
        assert resp.total == 0


class TestWebhookCheckoutCompleted:
    """Test webhook handler for checkout.session.completed events."""

    def _make_webhook_event(self, product_type, credits_count, extraction_id=""):
        return {
            "id": "evt_test_123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session",
                    "amount_total": 9000,
                    "payment_intent": "pi_test_123",
                    "metadata": {
                        "user_id": USER_ID,
                        "product_type": product_type,
                        "extraction_id": extraction_id,
                        "credits": str(credits_count),
                    },
                }
            },
        }

    def test_single_purchase_records_payment_and_unlocks(self, app_client):
        event = self._make_webhook_event("single", 1, EXTRACTION_ID)

        mock_stripe_event = MagicMock()
        mock_stripe_event.id = event["id"]
        mock_stripe_event.type = event["type"]
        mock_stripe_event.data.object = event["data"]["object"]

        mock_db = MagicMock()
        # claim webhook
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": event["id"]}]
        )
        # complete webhook
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {"id": "pay-1"}
        mock_credit_svc.add_credits.return_value = {
            "transaction_id": "tx-1",
            "new_balance": 0,
            "amount": 0,
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
        ):
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
        # Single purchases don't create credit transactions — payment record suffices
        mock_credit_svc.add_credits.assert_not_called()

    def test_credit_pack_5_adds_5_credits(self, app_client):
        event = self._make_webhook_event("credit_pack_5", 5)

        mock_stripe_event = MagicMock()
        mock_stripe_event.id = event["id"]
        mock_stripe_event.type = event["type"]
        mock_stripe_event.data.object = event["data"]["object"]

        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": event["id"]}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {"id": "pay-2"}
        mock_credit_svc.add_credits = AsyncMock(
            return_value={"transaction_id": "tx-2", "new_balance": 5, "amount": 5}
        )

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
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 200
        mock_credit_svc.add_credits.assert_called_once_with(
            user_id=USER_ID,
            amount=5,
            payment_id="pay-2",
            description="5-credit pack purchase",
        )

    def test_credit_pack_10_adds_10_credits(self, app_client):
        event = self._make_webhook_event("credit_pack_10", 10)

        mock_stripe_event = MagicMock()
        mock_stripe_event.id = event["id"]
        mock_stripe_event.type = event["type"]
        mock_stripe_event.data.object = event["data"]["object"]

        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": event["id"]}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {"id": "pay-3"}
        mock_credit_svc.add_credits = AsyncMock(
            return_value={"transaction_id": "tx-3", "new_balance": 10, "amount": 10}
        )

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
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 200
        mock_credit_svc.add_credits.assert_called_once_with(
            user_id=USER_ID,
            amount=10,
            payment_id="pay-3",
            description="10-credit pack purchase",
        )

    def test_missing_user_id_skips_processing(self, app_client):
        """Webhook with no user_id in metadata should log error and return."""
        event_data = {
            "id": "cs_test_no_user",
            "amount_total": 1000,
            "payment_intent": "pi_test",
            "metadata": {
                "user_id": "",
                "product_type": "single",
                "extraction_id": "",
                "credits": "1",
            },
        }

        mock_stripe_event = MagicMock()
        mock_stripe_event.id = "evt_no_user"
        mock_stripe_event.type = "checkout.session.completed"
        mock_stripe_event.data.object = event_data

        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": "evt_no_user"}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )

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
        ):
            mock_get_stripe.return_value.verify_webhook_signature.return_value = (
                mock_stripe_event
            )
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 200
        mock_credit_svc.record_payment.assert_not_called()

    def test_unknown_product_type_logs_warning(self, app_client):
        """Webhook with unknown product_type should log warning, not crash."""
        event_data = {
            "id": "cs_test_unknown",
            "amount_total": 9999,
            "payment_intent": "pi_test",
            "metadata": {
                "user_id": USER_ID,
                "product_type": "unknown_pack",
                "extraction_id": "",
                "credits": "0",
            },
        }

        mock_stripe_event = MagicMock()
        mock_stripe_event.id = "evt_unknown"
        mock_stripe_event.type = "checkout.session.completed"
        mock_stripe_event.data.object = event_data

        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": "evt_unknown"}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {"id": "pay-x"}

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
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 200
        mock_credit_svc.record_payment.assert_called_once()
        mock_credit_svc.add_credits.assert_not_called()

    def test_single_purchase_without_extraction_id(self, app_client):
        """Single purchase with no extraction_id should skip extraction update."""
        event_data = {
            "id": "cs_test_no_ext",
            "amount_total": 1000,
            "payment_intent": "pi_test",
            "metadata": {
                "user_id": USER_ID,
                "product_type": "single",
                "extraction_id": "",
                "credits": "1",
            },
        }

        mock_stripe_event = MagicMock()
        mock_stripe_event.id = "evt_no_ext"
        mock_stripe_event.type = "checkout.session.completed"
        mock_stripe_event.data.object = event_data

        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[{"id": "evt_no_ext"}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{}]
        )

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {"id": "pay-4"}
        mock_credit_svc.add_credits = AsyncMock(
            return_value={"transaction_id": "tx-4", "new_balance": 0, "amount": 0}
        )

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
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"test": true}',
                headers={"stripe-signature": "t=123,v1=abc"},
            )

        assert resp.status_code == 200
        # Single purchases don't create credit transactions
        mock_credit_svc.add_credits.assert_not_called()
