"""Tests for Stripe webhook endpoint — signature verification, idempotency, event processing."""

from unittest.mock import MagicMock, patch

import pytest
import stripe as stripe_module
from fastapi.testclient import TestClient


class TestWebhookSignatureVerification:
    """Test that webhook endpoint requires valid Stripe signature."""

    def test_missing_signature_returns_400(self, client: TestClient):
        response = client.post(
            "/api/v1/webhooks/stripe",
            content=b'{"type": "checkout.session.completed"}',
            headers={"content-type": "application/json"},
        )
        assert response.status_code == 400
        assert "stripe-signature" in response.json()["detail"].lower()

    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_invalid_signature_returns_400(
        self, mock_construct: MagicMock, client: TestClient
    ):
        mock_construct.side_effect = stripe_module.SignatureVerificationError(
            "Invalid signature", "sig_header"
        )
        response = client.post(
            "/api/v1/webhooks/stripe",
            content=b'{"type": "checkout.session.completed"}',
            headers={
                "content-type": "application/json",
                "stripe-signature": "t=123,v1=bad",
            },
        )
        assert response.status_code == 400
        assert "signature" in response.json()["detail"].lower()

    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_invalid_payload_returns_400(
        self, mock_construct: MagicMock, client: TestClient
    ):
        mock_construct.side_effect = ValueError("Invalid payload")
        response = client.post(
            "/api/v1/webhooks/stripe",
            content=b"bad-payload",
            headers={
                "content-type": "application/json",
                "stripe-signature": "t=123,v1=something",
            },
        )
        assert response.status_code == 400
        assert "payload" in response.json()["detail"].lower()


class TestWebhookIdempotency:
    """Test that duplicate events are handled as no-ops."""

    @patch("app.api.v1.webhooks._complete_webhook_event")
    @patch("app.api.v1.webhooks._claim_webhook_event")
    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_duplicate_event_returns_200_noop(
        self,
        mock_construct: MagicMock,
        mock_claim: MagicMock,
        mock_complete: MagicMock,
        client: TestClient,
    ):
        mock_event = MagicMock()
        mock_event.id = "evt_duplicate"
        mock_event.type = "checkout.session.completed"
        mock_construct.return_value = mock_event

        # Simulate event already claimed (duplicate)
        mock_claim.return_value = False

        response = client.post(
            "/api/v1/webhooks/stripe",
            content=b'{"type": "checkout.session.completed"}',
            headers={
                "content-type": "application/json",
                "stripe-signature": "t=123,v1=valid",
            },
        )
        assert response.status_code == 200
        assert response.json()["received"] is True
        # Should NOT have tried to complete the event since it was a duplicate
        mock_complete.assert_not_called()

    @patch("app.api.v1.webhooks._complete_webhook_event")
    @patch("app.api.v1.webhooks._claim_webhook_event")
    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_new_event_is_processed_and_completed(
        self,
        mock_construct: MagicMock,
        mock_claim: MagicMock,
        mock_complete: MagicMock,
        client: TestClient,
    ):
        mock_event = MagicMock()
        mock_event.id = "evt_new_123"
        mock_event.type = "checkout.session.completed"
        mock_event.data.object = {
            "id": "cs_test_123",
            "metadata": {
                "user_id": "user-abc",
                "product_type": "single",
                "extraction_id": "ext-1",
                "credits": "1",
            },
            "amount_total": 2000,
            "payment_intent": "pi_test_123",
        }
        mock_construct.return_value = mock_event
        mock_claim.return_value = True

        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "payment-1"}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "ext-1"}]
        )

        with (
            patch(
                "app.services.credit_service.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
        ):
            response = client.post(
                "/api/v1/webhooks/stripe",
                content=b'{"type": "checkout.session.completed"}',
                headers={
                    "content-type": "application/json",
                    "stripe-signature": "t=123,v1=valid",
                },
            )
        assert response.status_code == 200
        assert response.json()["received"] is True
        mock_complete.assert_called_once_with("evt_new_123")


class TestCheckoutSessionCompletedHandler:
    """Test handling of checkout.session.completed events."""

    @patch("app.api.v1.webhooks._complete_webhook_event")
    @patch("app.api.v1.webhooks._claim_webhook_event")
    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_unhandled_event_type_still_completes(
        self,
        mock_construct: MagicMock,
        mock_claim: MagicMock,
        mock_complete: MagicMock,
        client: TestClient,
    ):
        mock_event = MagicMock()
        mock_event.id = "evt_unhandled"
        mock_event.type = "payment_intent.created"
        mock_event.data.object = {}
        mock_construct.return_value = mock_event
        mock_claim.return_value = True

        response = client.post(
            "/api/v1/webhooks/stripe",
            content=b'{"type": "payment_intent.created"}',
            headers={
                "content-type": "application/json",
                "stripe-signature": "t=123,v1=valid",
            },
        )
        assert response.status_code == 200
        mock_complete.assert_called_once_with("evt_unhandled")


class TestWebhookFailureHandling:
    """Test that processing failures set failed_at instead of deleting events."""

    @patch("app.api.v1.webhooks._fail_webhook_event")
    @patch("app.api.v1.webhooks._complete_webhook_event")
    @patch("app.api.v1.webhooks._handle_checkout_completed")
    @patch("app.api.v1.webhooks._claim_webhook_event")
    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_permanent_error_marks_event_failed_and_returns_200(
        self,
        mock_construct: MagicMock,
        mock_claim: MagicMock,
        mock_handle: MagicMock,
        mock_complete: MagicMock,
        mock_fail: MagicMock,
        client: TestClient,
    ):
        """Bug #56: Permanent errors (ValueError/KeyError) return 200 and mark failed.

        Transient errors (DB timeouts, etc.) return 500 so Stripe retries.
        Only permanent errors that will never succeed should return 200.
        """
        mock_event = MagicMock()
        mock_event.id = "evt_fail_test"
        mock_event.type = "checkout.session.completed"
        mock_event.data.object = {
            "id": "cs_test_fail",
            "metadata": {
                "user_id": "user-fail",
                "product_type": "single",
                "extraction_id": "ext-fail",
            },
            "amount_total": 2000,
            "payment_intent": "pi_test_fail",
        }
        mock_construct.return_value = mock_event
        mock_claim.return_value = True

        # Simulate: handler succeeds, then _complete raises a permanent ValueError
        mock_handle.return_value = None
        mock_complete.side_effect = ValueError("Invalid metadata — permanent error")

        response = client.post(
            "/api/v1/webhooks/stripe",
            content=b'{"type": "checkout.session.completed"}',
            headers={
                "content-type": "application/json",
                "stripe-signature": "t=123,v1=valid",
            },
        )

        # Permanent error returns 200 so Stripe stops retrying
        assert response.status_code == 200
        # Should have called _fail_webhook_event with the event ID and exception
        mock_fail.assert_called_once()
        args = mock_fail.call_args[0]
        assert args[0] == "evt_fail_test"
        assert isinstance(args[1], ValueError)


class TestClaimWebhookEvent:
    """Test the _claim_webhook_event helper directly."""

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_claim_new_event_returns_true(self, mock_get_client: MagicMock):
        from app.api.v1.webhooks import _claim_webhook_event

        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "evt_new", "event_type": "checkout.session.completed"}]
        )
        mock_get_client.return_value = mock_db

        result = _claim_webhook_event("evt_new", "checkout.session.completed")
        assert result is True

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_claim_existing_event_returns_false(self, mock_get_client: MagicMock):
        from app.api.v1.webhooks import _claim_webhook_event

        mock_db = MagicMock()
        duplicate_error = Exception(
            "duplicate key value violates unique constraint stripe_webhook_events_pkey (SQLSTATE 23505)"
        )
        mock_db.table.return_value.insert.return_value.execute.side_effect = (
            duplicate_error
        )

        # Select to check if it was previously failed
        mock_select_result = MagicMock()
        mock_select_result.data = {"failed_at": None}
        (
            mock_db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value
        ) = mock_select_result
        mock_get_client.return_value = mock_db

        result = _claim_webhook_event("evt_existing", "checkout.session.completed")
        assert result is False

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_claim_active_unprocessed_duplicate_event_returns_false(
        self, mock_get_client: MagicMock
    ):
        """A fresh unprocessed row means another request is still active."""
        from app.api.v1.webhooks import _claim_webhook_event

        mock_db = MagicMock()
        duplicate_error = Exception(
            "duplicate key value violates unique constraint stripe_webhook_events_pkey (SQLSTATE 23505)"
        )
        mock_db.table.return_value.insert.return_value.execute.side_effect = (
            duplicate_error
        )

        mock_select_result = MagicMock()
        mock_select_result.data = {
            "processed_at": None,
            "failed_at": None,
            "claimed_at": "2999-04-30T19:00:00+00:00",
        }
        (
            mock_db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value
        ) = mock_select_result
        mock_get_client.return_value = mock_db

        result = _claim_webhook_event("evt_retry", "checkout.session.completed")
        assert result is False

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_claim_expired_unprocessed_duplicate_event_returns_true(
        self, mock_get_client: MagicMock
    ):
        """An abandoned NULL processed_at claim may be retried after its lease expires."""
        from app.api.v1.webhooks import _claim_webhook_event

        mock_db = MagicMock()
        duplicate_error = Exception(
            "duplicate key value violates unique constraint stripe_webhook_events_pkey (SQLSTATE 23505)"
        )
        mock_db.table.return_value.insert.return_value.execute.side_effect = (
            duplicate_error
        )

        mock_select_result = MagicMock()
        mock_select_result.data = {
            "processed_at": None,
            "failed_at": None,
            "claimed_at": "2000-04-30T00:00:00+00:00",
        }
        (
            mock_db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value
        ) = mock_select_result
        mock_db.table.return_value.update.return_value.eq.return_value.is_.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[{"id": "evt_retry"}]
        )
        mock_get_client.return_value = mock_db

        result = _claim_webhook_event("evt_retry", "checkout.session.completed")
        assert result is True

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_claim_previously_failed_event_returns_false(
        self, mock_get_client: MagicMock
    ):
        from app.api.v1.webhooks import _claim_webhook_event

        mock_db = MagicMock()
        duplicate_error = Exception(
            "duplicate key value violates unique constraint stripe_webhook_events_pkey (SQLSTATE 23505)"
        )
        mock_db.table.return_value.insert.return_value.execute.side_effect = (
            duplicate_error
        )

        mock_select_result = MagicMock()
        mock_select_result.data = {"failed_at": "2026-03-16T00:00:00+00:00"}
        (
            mock_db.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value
        ) = mock_select_result
        mock_get_client.return_value = mock_db

        result = _claim_webhook_event("evt_failed_before", "checkout.session.completed")
        assert result is False


class TestCompleteWebhookEvent:
    """Test the _complete_webhook_event helper."""

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_complete_sets_processed_at(self, mock_get_client: MagicMock):
        from app.api.v1.webhooks import _complete_webhook_event

        mock_db = MagicMock()
        mock_get_client.return_value = mock_db

        _complete_webhook_event("evt_complete_test")

        mock_db.table.assert_called_with("stripe_webhook_events")
        update_call = mock_db.table.return_value.update
        update_call.assert_called_once()
        update_data = update_call.call_args[0][0]
        assert "processed_at" in update_data


class TestFailWebhookEvent:
    """Test the _fail_webhook_event helper (CamAudit-v2 bug fix)."""

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_fail_sets_failed_at_and_reason(self, mock_get_client: MagicMock):
        from app.api.v1.webhooks import _fail_webhook_event

        mock_db = MagicMock()
        mock_get_client.return_value = mock_db

        exc = RuntimeError("Something broke")
        _fail_webhook_event("evt_fail_test", exc)

        mock_db.table.assert_called_with("stripe_webhook_events")
        update_call = mock_db.table.return_value.update
        update_call.assert_called_once()
        update_data = update_call.call_args[0][0]
        assert "failed_at" in update_data
        assert "failure_reason" in update_data
        assert "Something broke" in update_data["failure_reason"]

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_fail_truncates_long_reason(self, mock_get_client: MagicMock):
        from app.api.v1.webhooks import _fail_webhook_event

        mock_db = MagicMock()
        mock_get_client.return_value = mock_db

        exc = RuntimeError("x" * 2000)
        _fail_webhook_event("evt_long_err", exc)

        update_data = mock_db.table.return_value.update.call_args[0][0]
        assert len(update_data["failure_reason"]) <= 1000


class TestPaymentSchemas:
    """Test payment request/response schema validation."""

    def test_checkout_request_valid(self):
        from app.schemas.payment import CheckoutRequest

        req = CheckoutRequest(
            product_type="single",
            success_url="https://lextract.io/results/abc?payment=success",
            cancel_url="https://lextract.io/results/abc?payment=cancelled",
            extraction_id="ext-abc",
        )
        assert req.product_type == "single"

    def test_checkout_request_invalid_product_type(self):
        from pydantic import ValidationError

        from app.schemas.payment import CheckoutRequest

        with pytest.raises(ValidationError):
            CheckoutRequest(
                product_type="invalid_type",
                success_url="https://lextract.io/x",
                cancel_url="https://lextract.io/x",
            )

    def test_checkout_request_invalid_url_scheme(self):
        from pydantic import ValidationError

        from app.schemas.payment import CheckoutRequest

        with pytest.raises(ValidationError):
            CheckoutRequest(
                product_type="single",
                success_url="ftp://evil.com",
                cancel_url="https://lextract.io/x",
            )

    def test_checkout_request_allows_localhost(self):
        from app.schemas.payment import CheckoutRequest

        req = CheckoutRequest(
            product_type="single",
            success_url="http://localhost:3000/results/abc?payment=success",
            cancel_url="http://localhost:3000/results/abc?payment=cancelled",
        )
        assert "localhost" in req.success_url

    def test_checkout_request_rejects_localhost_subdomain_bypass(self):
        """http://localhost.evil.com must be rejected (open redirect via startsWith bypass)."""
        from pydantic import ValidationError

        from app.schemas.payment import CheckoutRequest

        with pytest.raises(ValidationError):
            CheckoutRequest(
                product_type="single",
                success_url="http://localhost.evil.com/phish",
                cancel_url="https://lextract.io/x",
            )

    def test_checkout_response_schema(self):
        from app.schemas.payment import CheckoutResponse

        resp = CheckoutResponse(
            checkout_url="https://checkout.stripe.com/session/cs_test_123",
            session_id="cs_test_123",
        )
        assert resp.session_id == "cs_test_123"

    def test_webhook_response_schema(self):
        from app.schemas.payment import WebhookResponse

        resp = WebhookResponse()
        assert resp.received is True
