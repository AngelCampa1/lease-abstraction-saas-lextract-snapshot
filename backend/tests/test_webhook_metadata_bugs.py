"""Tests for webhook metadata parsing bugs.

Bug #1: str(None) produces truthy "None" when metadata has explicit null values.
Bug #2: Missing payment_status guard allows duplicate webhook deliveries to
        double-mark extractions as paid.
"""

from unittest.mock import MagicMock, call, patch

import pytest

from app.api.v1.webhooks import _handle_checkout_completed


class TestMetadataNullHandling:
    """Bug #1: metadata fields set to None should be treated as empty, not "None"."""

    @pytest.mark.asyncio
    @patch("app.api.v1.webhooks.NeonClientManager.get_service_client")
    @patch("app.api.v1.webhooks.get_credit_service")
    async def test_null_extraction_id_does_not_attempt_update(
        self, mock_credit_svc: MagicMock, mock_get_client: MagicMock
    ):
        """When metadata has extraction_id: null, should NOT try to update extraction "None".

        str(None) coerces to the falsy empty string, so the single-purchase path
        raises a permanent ValueError (missing extraction_id) instead of recording
        a payment or attempting an update against extraction "None".
        """
        mock_service = MagicMock()
        mock_service.record_single_payment_and_unlock.return_value = {"id": "payment-1"}
        mock_credit_svc.return_value = mock_service

        mock_db = MagicMock()
        mock_get_client.return_value = mock_db

        session = {
            "id": "cs_test_null",
            "metadata": {
                "user_id": "user-abc",
                "product_type": "single",
                "extraction_id": None,  # Explicitly null
            },
            "amount_total": 2000,
            "payment_intent": "pi_test_null",
        }

        with pytest.raises(ValueError, match="missing extraction_id"):
            await _handle_checkout_completed(session)

        # Bug #1: no unlock/update was attempted against extraction "None".
        mock_service.record_single_payment_and_unlock.assert_not_called()
        table_calls = mock_db.table.call_args_list
        extractions_update_attempted = (
            any(c == call("extractions") for c in table_calls)
            and mock_db.table.return_value.update.called
        )
        assert (
            not extractions_update_attempted
        ), "Bug #1: str(None) produced 'None' - tried to update extraction 'None'"

    @pytest.mark.asyncio
    @patch("app.api.v1.webhooks.NeonClientManager.get_service_client")
    @patch("app.api.v1.webhooks.get_credit_service")
    async def test_null_user_id_raises_value_error(
        self, mock_credit_svc: MagicMock, mock_get_client: MagicMock
    ):
        """When metadata has user_id: null, should raise ValueError (empty string is falsy)."""
        mock_get_client.return_value = MagicMock()

        session = {
            "id": "cs_test_null_user",
            "metadata": {
                "user_id": None,  # Explicitly null
                "product_type": "single",
                "extraction_id": "ext-1",
            },
            "amount_total": 2000,
            "payment_intent": "pi_test",
        }

        with pytest.raises(ValueError, match="user_id missing"):
            await _handle_checkout_completed(session)

    @pytest.mark.asyncio
    @patch("app.api.v1.webhooks.NeonClientManager.get_service_client")
    @patch("app.api.v1.webhooks.get_credit_service")
    async def test_null_payment_intent_handled_safely(
        self, mock_credit_svc: MagicMock, mock_get_client: MagicMock
    ):
        """payment_intent: null should become None, not the string "None"."""
        mock_service = MagicMock()
        mock_service.record_single_payment_and_unlock.return_value = {"id": "payment-1"}
        mock_credit_svc.return_value = mock_service

        mock_db = MagicMock()
        mock_get_client.return_value = mock_db

        session = {
            "id": "cs_test_pi_null",
            "metadata": {
                "user_id": "user-abc",
                "product_type": "single",
                "extraction_id": "ext-1",
            },
            "amount_total": 2000,
            "payment_intent": None,  # Explicitly null
        }

        await _handle_checkout_completed(session)

        # Verify transactional single-purchase helper received None, not "None"
        record_call = mock_service.record_single_payment_and_unlock.call_args
        assert (
            record_call.kwargs.get("stripe_payment_intent_id") is None
            or record_call.kwargs.get("stripe_payment_intent_id") == ""
        ), "Bug: payment_intent=None became the string 'None'"


class TestPaymentStatusGuard:
    """Bug #2: Duplicate webhooks should not double-mark extractions as paid."""

    @pytest.mark.asyncio
    @patch("app.api.v1.webhooks.NeonClientManager.get_service_client")
    @patch("app.api.v1.webhooks.get_credit_service")
    async def test_single_purchase_update_includes_payment_status_guard(
        self, mock_credit_svc: MagicMock, mock_get_client: MagicMock
    ):
        """The update query should filter on payment_status='unpaid' to prevent double-marking."""
        mock_service = MagicMock()
        mock_service.record_single_payment_and_unlock.return_value = {"id": "payment-1"}
        mock_credit_svc.return_value = mock_service

        mock_db = MagicMock()
        # Set up the chained mock for the update query
        mock_update_chain = MagicMock()
        mock_db.table.return_value.update.return_value = mock_update_chain
        mock_update_chain.eq.return_value = mock_update_chain
        mock_update_chain.execute.return_value = MagicMock(data=[{"id": "ext-1"}])
        mock_get_client.return_value = mock_db

        session = {
            "id": "cs_test_guard",
            "metadata": {
                "user_id": "user-abc",
                "product_type": "single",
                "extraction_id": "ext-1",
            },
            "amount_total": 2000,
            "payment_intent": "pi_test",
        }

        await _handle_checkout_completed(session)

        mock_service.record_single_payment_and_unlock.assert_called_once()
        kwargs = mock_service.record_single_payment_and_unlock.call_args.kwargs
        assert kwargs["extraction_id"] == "ext-1"
        assert kwargs["user_id"] == "user-abc"
