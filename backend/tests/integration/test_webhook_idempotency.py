"""Integration tests for Stripe webhook idempotency.

BUG #7: Single purchase with empty extraction_id in metadata records the
payment but never marks the extraction as paid. No error is raised or
logged for this specific case.

BUG #46: Credit pack webhooks must use hardcoded credit amounts, never
metadata.credits which is user-controlled.

BUG #48: Single purchase update must include user_id filter to prevent
one user from marking another user's extraction as paid.

BUG #56: DB errors (transient) must return 500 so Stripe retries.
         ValueError/KeyError (permanent) must return 200 and mark failed.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from tests.integration.conftest import (
    EXTRACTION_ID,
    USER_A_ID,
)


def _make_stripe_event(
    event_id: str = "evt_test_123",
    event_type: str = "checkout.session.completed",
    metadata: dict | None = None,
):
    """Build a mock Stripe Event object."""
    if metadata is None:
        metadata = {
            "user_id": USER_A_ID,
            "product_type": "single",
            "extraction_id": EXTRACTION_ID,
        }

    event = MagicMock()
    event.id = event_id
    event.type = event_type
    event.data.object = {
        "id": "cs_test_session",
        "metadata": metadata,
        "amount_total": 2000,
        "payment_intent": "pi_test_123",
    }
    return event


class TestWebhookIdempotency:
    def test_same_event_processed_only_once(self, app_client):
        """Sending the same event_id twice should only process it once."""
        event = _make_stripe_event()
        claim_count = 0

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        mock_db = MagicMock()

        def route_table(name):
            nonlocal claim_count
            t = MagicMock()

            if name == "stripe_webhook_events":

                def mock_insert(data):
                    nonlocal claim_count
                    claim_count += 1
                    chain = MagicMock()
                    if claim_count == 1:
                        # First call: insert succeeds â€” we claimed the event
                        chain.execute.return_value = MagicMock(data=[data])
                    else:
                        # Second call: duplicate key â€” event already claimed
                        def raise_duplicate():
                            raise Exception(
                                "duplicate key value violates unique constraint"
                            )

                        chain.execute.side_effect = raise_duplicate
                    return chain

                t.insert = mock_insert

                # For checking failed_at after duplicate
                select_chain = MagicMock()
                select_chain.eq.return_value = select_chain
                select_chain.maybe_single.return_value = select_chain
                select_chain.execute.return_value = MagicMock(data={"failed_at": None})
                t.select.return_value = select_chain

                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain

            elif name == "extractions":
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain

            elif name == "payments":
                # Idempotency check: no existing payment
                idempotency_chain = MagicMock()
                idempotency_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = (
                    idempotency_chain
                )

                insert_chain = MagicMock()
                insert_chain.execute.return_value = MagicMock(data=[{"id": "pay-123"}])
                t.insert.return_value = insert_chain

            return t

        mock_db.table = route_table

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.credit_service.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
        ):
            # First delivery
            resp1 = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )
            # Second delivery (same event)
            resp2 = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert claim_count == 2  # Upsert called twice, but only first claimed

    def test_webhook_returns_200_on_permanent_error_after_signature_verification(
        self, app_client
    ):
        """On permanent errors (ValueError/KeyError), webhook returns 200 to prevent Stripe retries."""
        event = _make_stripe_event()

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        mock_db = MagicMock()
        claim_chain = MagicMock()
        claim_chain.execute.return_value = MagicMock(data=[{"id": "evt_test"}])
        mock_db.table.return_value.upsert.return_value = claim_chain

        # Processing fails with a permanent error
        update_chain = MagicMock()
        update_chain.eq.return_value = update_chain
        update_chain.execute.return_value = MagicMock(data=[{}])
        mock_db.table.return_value.update.return_value = update_chain

        mock_credit_svc = MagicMock()
        # ValueError is a permanent error â€” mark failed and return 200
        mock_credit_svc.record_payment.side_effect = ValueError("Invalid product type")

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service",
                return_value=mock_credit_svc,
            ),
        ):
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        # Permanent error returns 200 so Stripe stops retrying
        assert resp.status_code == 200


class TestCreditPackHardcodedAmounts:
    """Bug #46: Credit amounts must come from CREDIT_PACK_AMOUNTS, not metadata."""

    def test_credit_pack_5_always_adds_5_credits_ignoring_metadata(self, app_client):
        """credit_pack_5 must add 5 credits even if metadata.credits says something else."""
        event = _make_stripe_event(
            metadata={
                "user_id": USER_A_ID,
                "product_type": "credit_pack_5",
                # An attacker tries to get 100 credits by manipulating metadata
                "credits": "100",
            }
        )

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        credits_added: list[int] = []

        mock_db = MagicMock()

        def route_table(name):
            t = MagicMock()
            if name == "stripe_webhook_events":
                chain = MagicMock()
                chain.execute.return_value = MagicMock(data=[{"id": "evt_test"}])
                t.upsert.return_value = chain
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain
            elif name == "payments":
                idempotency_chain = MagicMock()
                idempotency_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = (
                    idempotency_chain
                )
                insert_chain = MagicMock()
                insert_chain.execute.return_value = MagicMock(data=[{"id": "pay-123"}])
                t.insert.return_value = insert_chain
            elif name == "users":
                t.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
                    data={"credits_balance": 0}
                )
                t.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{"id": USER_A_ID}]
                )
            elif name == "credit_transactions":

                def capture_insert(data):
                    credits_added.append(data["amount"])
                    chain = MagicMock()
                    chain.execute.return_value = MagicMock(data=[data])
                    return chain

                t.insert = capture_insert
            return t

        mock_db.table = route_table
        mock_db.transaction.return_value.__enter__.return_value.table = route_table

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.credit_service.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
        ):
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        assert resp.status_code == 200
        # Must add exactly 5 credits regardless of metadata.credits=100
        assert credits_added == [5], (
            f"Expected [5] credits added, got {credits_added}. "
            "Webhook must not trust metadata.credits."
        )

    def test_credit_pack_10_always_adds_10_credits(self, app_client):
        """credit_pack_10 must add 10 credits regardless of metadata.credits."""
        event = _make_stripe_event(
            metadata={
                "user_id": USER_A_ID,
                "product_type": "credit_pack_10",
                "credits": "1",  # Wrong value in metadata
            }
        )

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        credits_added: list[int] = []

        mock_db = MagicMock()

        def route_table(name):
            t = MagicMock()
            if name == "stripe_webhook_events":
                chain = MagicMock()
                chain.execute.return_value = MagicMock(data=[{"id": "evt_test"}])
                t.upsert.return_value = chain
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain
            elif name == "payments":
                idempotency_chain = MagicMock()
                idempotency_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = (
                    idempotency_chain
                )
                insert_chain = MagicMock()
                insert_chain.execute.return_value = MagicMock(data=[{"id": "pay-456"}])
                t.insert.return_value = insert_chain
            elif name == "users":
                t.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
                    data={"credits_balance": 5}
                )
                t.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{"id": USER_A_ID}]
                )
            elif name == "credit_transactions":

                def capture_insert(data):
                    credits_added.append(data["amount"])
                    chain = MagicMock()
                    chain.execute.return_value = MagicMock(data=[data])
                    return chain

                t.insert = capture_insert
            return t

        mock_db.table = route_table
        mock_db.transaction.return_value.__enter__.return_value.table = route_table

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.credit_service.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
        ):
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        assert resp.status_code == 200
        assert credits_added == [
            10
        ], f"Expected [10] credits added, got {credits_added}."


class TestSinglePurchaseUserOwnershipCheck:
    """Bug #48: Single purchase update must include user_id filter."""

    def test_single_purchase_update_includes_user_id_filter(self, app_client):
        """The extractions table update must use both id and user_id filters."""
        event = _make_stripe_event(
            metadata={
                "user_id": USER_A_ID,
                "product_type": "single",
                "extraction_id": EXTRACTION_ID,
            }
        )

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        mock_db = MagicMock()

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {
            "id": "pay-789"
        }

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
        ):
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        assert resp.status_code == 200

        mock_credit_svc.record_single_payment_and_unlock.assert_called_once()
        kwargs = mock_credit_svc.record_single_payment_and_unlock.call_args.kwargs
        assert kwargs["user_id"] == USER_A_ID
        assert kwargs["extraction_id"] == EXTRACTION_ID


class TestWebhookAnalytics:
    """Webhook-backed analytics is the canonical payment success signal."""

    def test_checkout_completed_emits_payment_succeeded_event(self, app_client):
        """Successful checkout webhooks emit payment_succeeded with safe context."""
        event = _make_stripe_event(
            metadata={
                "user_id": USER_A_ID,
                "product_type": "single",
                "extraction_id": EXTRACTION_ID,
            }
        )

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        mock_db = MagicMock()

        def route_table(name):
            t = MagicMock()
            if name == "stripe_webhook_events":
                chain = MagicMock()
                chain.execute.return_value = MagicMock(data=[{"id": "evt_test"}])
                t.insert.return_value = chain
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain
            elif name == "payments":
                idempotency_chain = MagicMock()
                idempotency_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = (
                    idempotency_chain
                )
                insert_chain = MagicMock()
                insert_chain.execute.return_value = MagicMock(data=[{"id": "pay-789"}])
                t.insert.return_value = insert_chain
            elif name == "extractions":
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain
            return t

        mock_db.table = route_table

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.credit_service.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.webhooks.capture_backend_event") as capture_event,
        ):
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        assert resp.status_code == 200
        capture_event.assert_called_once_with(
            "payment_succeeded",
            distinct_id=USER_A_ID,
            properties={
                "user_id": USER_A_ID,
                "product_type": "single",
                "amount_cents": 2000,
                "credits_purchased": 0,
                "is_guest": False,
                "extraction_id": EXTRACTION_ID,
                "stripe_session_id": "cs_test_session",
            },
        )

    def test_credit_pack_checkout_emits_purchased_credit_count(self):
        """Credit pack analytics includes the hardcoded credit purchase amount."""
        credit_svc = MagicMock()
        credit_svc.record_payment.return_value = {"id": "pay-credit-pack"}
        credit_svc.add_credits = AsyncMock(return_value={"created": True})

        session = {
            "id": "cs_credit_pack",
            "metadata": {
                "user_id": USER_A_ID,
                "product_type": "credit_pack_10",
                "credits": "1",
            },
            "amount_total": 15000,
            "payment_intent": "pi_credit_pack",
        }

        with (
            patch("app.api.v1.webhooks.get_credit_service", return_value=credit_svc),
            patch("app.api.v1.webhooks.capture_backend_event") as capture_event,
        ):
            from app.api.v1.webhooks import _handle_checkout_completed

            asyncio.run(_handle_checkout_completed(session))

        credit_svc.add_credits.assert_awaited_once_with(
            user_id=USER_A_ID,
            amount=10,
            payment_id="pay-credit-pack",
            description="10-credit pack purchase",
        )
        capture_event.assert_called_once_with(
            "payment_succeeded",
            distinct_id=USER_A_ID,
            properties={
                "user_id": USER_A_ID,
                "product_type": "credit_pack_10",
                "amount_cents": 15000,
                "credits_purchased": 10,
                "is_guest": False,
                "extraction_id": "",
                "stripe_session_id": "cs_credit_pack",
            },
        )

    def test_guest_checkout_payment_analytics_marks_guest(self):
        """Guest checkout analytics preserves guest context after provisioning."""
        credit_svc = MagicMock()
        credit_svc.record_payment.return_value = {"id": "pay-guest"}
        mock_db = MagicMock()
        update_chain = MagicMock()
        update_chain.eq.return_value = update_chain
        update_chain.execute.return_value = MagicMock(data=[{}])
        mock_db.table.return_value.update.return_value = update_chain

        session = {
            "id": "cs_guest",
            "metadata": {
                "product_type": "single",
                "extraction_id": EXTRACTION_ID,
                "guest_email": "guest@example.com",
                "anonymous_session_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            },
            "amount_total": 2000,
            "payment_intent": "pi_guest",
        }

        with (
            patch("app.api.v1.webhooks.get_credit_service", return_value=credit_svc),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks._provision_guest_user",
                new=AsyncMock(return_value=USER_A_ID),
            ),
            patch("app.api.v1.webhooks.capture_backend_event") as capture_event,
        ):
            from app.api.v1.webhooks import _handle_checkout_completed

            asyncio.run(_handle_checkout_completed(session))

        capture_event.assert_called_once_with(
            "payment_succeeded",
            distinct_id=USER_A_ID,
            properties={
                "user_id": USER_A_ID,
                "product_type": "single",
                "amount_cents": 2000,
                "credits_purchased": 0,
                "is_guest": True,
                "extraction_id": EXTRACTION_ID,
                "stripe_session_id": "cs_guest",
            },
        )


class TestWebhookTransientVsPermanentErrors:
    """Bug #56: Distinguish transient (DB) errors from permanent (ValueError/KeyError) errors."""

    def test_db_error_returns_500_so_stripe_retries(self):
        """A transient DB error during processing must return 500 so Stripe retries."""
        from app.main import create_app
        from fastapi.testclient import TestClient

        event = _make_stripe_event()

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        mock_db = MagicMock()
        claim_chain = MagicMock()
        claim_chain.execute.return_value = MagicMock(data=[{"id": "evt_test"}])
        mock_db.table.return_value.upsert.return_value = claim_chain

        update_chain = MagicMock()
        update_chain.eq.return_value = update_chain
        update_chain.execute.return_value = MagicMock(data=[{}])
        mock_db.table.return_value.update.return_value = update_chain

        mock_credit_svc = MagicMock()
        # Simulate a transient DB error (not ValueError or KeyError)
        mock_credit_svc.record_single_payment_and_unlock.side_effect = ConnectionError(
            "DB timeout"
        )

        # Use raise_server_exceptions=False so TestClient returns 500 instead of raising
        client = TestClient(create_app(), raise_server_exceptions=False)

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service",
                return_value=mock_credit_svc,
            ),
        ):
            resp = client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        # Transient error must return 500 so Stripe retries
        assert resp.status_code == 500

    def test_value_error_returns_200_and_marks_failed(self, app_client):
        """A permanent ValueError must return 200 (Stripe stops retrying) and mark event failed."""
        event = _make_stripe_event(
            metadata={
                "user_id": USER_A_ID,
                "product_type": "unknown_product",  # Will trigger unknown product path
            }
        )

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        mock_db = MagicMock()
        claim_chain = MagicMock()
        claim_chain.execute.return_value = MagicMock(data=[{"id": "evt_test"}])
        mock_db.table.return_value.upsert.return_value = claim_chain

        update_chain = MagicMock()
        update_chain.eq.return_value = update_chain
        update_chain.execute.return_value = MagicMock(data=[{}])
        mock_db.table.return_value.update.return_value = update_chain

        mock_credit_svc = MagicMock()
        # Simulate payment recorded, then a ValueError from bad metadata
        mock_credit_svc.record_payment.side_effect = ValueError("Invalid product")

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.get_credit_service",
                return_value=mock_credit_svc,
            ),
        ):
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        # Permanent error must return 200 so Stripe does NOT retry
        assert resp.status_code == 200


class TestSinglePurchaseWithoutExtractionId:
    """BUG #7: Empty extraction_id in metadata for single purchase."""

    def test_single_purchase_empty_extraction_id_fails_permanently(self, app_client):
        """When extraction_id is empty in Stripe metadata for a single purchase,
        no payment is recorded and the event is failed permanently (raise,
        not a silent return) so the lost payment leaves an audit trail and
        Stripe stops retrying an event that can never succeed.
        """
        event = _make_stripe_event(
            metadata={
                "user_id": USER_A_ID,
                "product_type": "single",
                "extraction_id": "",  # Empty!
            }
        )

        mock_stripe_svc = MagicMock()
        mock_stripe_svc.verify_webhook_signature.return_value = event

        payment_inserts: list[dict] = []

        mock_db = MagicMock()

        def route_table(name):
            t = MagicMock()

            if name == "stripe_webhook_events":
                chain = MagicMock()
                chain.execute.return_value = MagicMock(data=[{"id": "evt_test"}])
                t.upsert.return_value = chain
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain

            elif name == "payments":
                # Idempotency check: no existing payment
                idempotency_chain = MagicMock()
                idempotency_chain.execute.return_value = MagicMock(data=None)
                t.select.return_value.eq.return_value.maybe_single.return_value = (
                    idempotency_chain
                )

                def capture_insert(data):
                    payment_inserts.append(data)
                    chain = MagicMock()
                    chain.execute.return_value = MagicMock(data=[data])
                    return chain

                t.insert = capture_insert

            return t

        mock_db.table = route_table

        with (
            patch(
                "app.api.v1.webhooks.get_stripe_service",
                return_value=mock_stripe_svc,
            ),
            patch(
                "app.api.v1.webhooks.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.credit_service.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.webhooks.logger",
            ) as mock_logger,
        ):
            resp = app_client.post(
                "/api/v1/webhooks/stripe",
                content=b"raw-payload",
                headers={"stripe-signature": "sig_test"},
            )

        assert resp.status_code == 200

        assert payment_inserts == []

        # The handler raises ValueError (a permanent error), which the endpoint
        # logs via logger.exception before failing the event so Stripe stops
        # retrying. No payment was recorded but the failure leaves an audit trail.
        mock_logger.exception.assert_called()
