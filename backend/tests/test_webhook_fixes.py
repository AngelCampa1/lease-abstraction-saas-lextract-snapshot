"""Unit tests for webhook handler fixes (H5, H6, M9).

H5: Missing user_id raises ValueError instead of silently returning.
H6: Unknown product_type raises ValueError instead of silently logging.
M9: ConflictError is treated as a permanent error (not retried by Stripe).
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.v1.webhooks import _handle_checkout_completed, _PERMANENT_ERRORS
from app.core.exceptions import ConflictError


class TestCheckoutCompletedFixes:
    """Tests for _handle_checkout_completed."""

    def _base_session(self, **overrides: Any) -> dict[str, Any]:
        session: dict[str, Any] = {
            "id": "cs_test_123",
            "amount_total": 2000,
            "payment_intent": "pi_test_123",
            "metadata": {
                "user_id": "user-abc",
                "product_type": "credit_pack_5",
                "extraction_id": "",
            },
        }
        session.update(overrides)
        return session

    @pytest.mark.asyncio
    async def test_h5_missing_user_id_raises(self) -> None:
        """H5: Empty user_id raises ValueError — Stripe won't retry."""
        session = self._base_session()
        session["metadata"]["user_id"] = ""

        with pytest.raises(ValueError, match="user_id"):
            await _handle_checkout_completed(session)

    @pytest.mark.asyncio
    async def test_h6_unknown_product_type_raises(self) -> None:
        """H6: Unknown product_type raises ValueError — prevents silent credit loss."""
        session = self._base_session()
        session["metadata"]["product_type"] = "invalid_product"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {"id": "pay-123"}

        with patch(
            "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
        ):
            with pytest.raises(ValueError, match="product_type"):
                await _handle_checkout_completed(session)

    def test_conflict_error_in_permanent_errors(self) -> None:
        """M9: ConflictError is in _PERMANENT_ERRORS so Stripe won't retry."""
        assert ConflictError in _PERMANENT_ERRORS

    def test_value_error_in_permanent_errors(self) -> None:
        """H5/H6 rely on ValueError being a permanent error."""
        assert ValueError in _PERMANENT_ERRORS

    def test_not_found_error_in_permanent_errors(self) -> None:
        """A missing user/extraction won't appear on retry (id is from immutable
        Stripe metadata), so NotFoundError must be permanent to avoid retry loops.
        """
        from app.core.exceptions import NotFoundError

        assert NotFoundError in _PERMANENT_ERRORS

    @pytest.mark.asyncio
    async def test_credit_pack_5_success(self) -> None:
        """Happy path: credit_pack_5 adds 5 credits."""
        session = self._base_session()
        session["metadata"]["product_type"] = "credit_pack_5"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {"id": "pay-123"}
        mock_credit_svc.add_credits = AsyncMock(return_value={"created": True})

        with patch(
            "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
        ):
            await _handle_checkout_completed(session)

        mock_credit_svc.add_credits.assert_called_once_with(
            user_id="user-abc",
            amount=5,
            payment_id="pay-123",
            description="5-credit pack purchase",
        )

    @pytest.mark.asyncio
    async def test_duplicate_checkout_session_does_not_grant_twice(self) -> None:
        """A duplicate delivery whose credits were already granted must no-op.

        add_credits is idempotent on payment_id; when it reports the grant
        already existed (created=False) the handler must not fire a second
        payment_succeeded analytics event.
        """
        session = self._base_session()
        session["metadata"]["product_type"] = "credit_pack_5"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {
            "id": "pay-123",
            "created": False,
        }
        mock_credit_svc.add_credits = AsyncMock(return_value={"created": False})

        with (
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            patch("app.api.v1.webhooks.capture_backend_event") as mock_capture,
        ):
            await _handle_checkout_completed(session)

        # The grant is still attempted (idempotent), but no double analytics.
        mock_credit_svc.add_credits.assert_called_once()
        mock_capture.assert_not_called()

    @pytest.mark.asyncio
    async def test_credit_pack_retry_after_failed_grant_still_grants(self) -> None:
        """Self-heal: payment recorded by a prior delivery, grant never landed.

        On retry record_payment returns created=False (payment already exists),
        but add_credits (idempotent) finds no prior grant and inserts it,
        reporting created=True — so the credits finally land and analytics fire.
        """
        session = self._base_session()
        session["metadata"]["product_type"] = "credit_pack_10"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {
            "id": "pay-789",
            "created": False,
        }
        mock_credit_svc.add_credits = AsyncMock(return_value={"created": True})

        with (
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            patch("app.api.v1.webhooks.capture_backend_event") as mock_capture,
        ):
            await _handle_checkout_completed(session)

        mock_credit_svc.add_credits.assert_called_once_with(
            user_id="user-abc",
            amount=10,
            payment_id="pay-789",
            description="10-credit pack purchase",
        )
        mock_capture.assert_called_once()

    @pytest.mark.asyncio
    async def test_single_purchase_requires_paid_update(self) -> None:
        """Single-purchase webhooks must fail if the extraction cannot be unlocked."""
        session = self._base_session()
        session["metadata"]["product_type"] = "single"
        session["metadata"]["extraction_id"] = "ext-123"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.side_effect = ValueError(
            "single purchase extraction could not be marked paid"
        )

        with (
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            pytest.raises(ValueError, match="could not be marked paid"),
        ):
            await _handle_checkout_completed(session)

    @pytest.mark.asyncio
    async def test_single_purchase_sets_payment_id_and_does_not_reassign_owner(
        self,
    ) -> None:
        """Webhook must unlock only an already-owned extraction and persist payment_id."""
        session = self._base_session()
        session["metadata"]["product_type"] = "single"
        session["metadata"]["extraction_id"] = "ext-123"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {
            "id": "pay-123",
            "created": True,
        }

        with patch(
            "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
        ):
            await _handle_checkout_completed(session)

        mock_credit_svc.record_single_payment_and_unlock.assert_called_once()
        kwargs = mock_credit_svc.record_single_payment_and_unlock.call_args.kwargs
        assert kwargs["user_id"] == "user-abc"
        assert kwargs["extraction_id"] == "ext-123"
        assert kwargs["guest_anonymous_session_id"] is None
        # Single purchases unlock via record_single_payment_and_unlock and must
        # NOT also call the credit-pack record_payment path (removed dead code).
        mock_credit_svc.record_payment.assert_not_called()

    @pytest.mark.asyncio
    async def test_single_purchase_created_fires_analytics_once(self) -> None:
        """A first delivery (created=True) fires payment_succeeded exactly once."""
        session = self._base_session()
        session["metadata"]["product_type"] = "single"
        session["metadata"]["extraction_id"] = "ext-123"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {
            "id": "pay-123",
            "created": True,
        }

        with (
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            patch("app.api.v1.webhooks.capture_backend_event") as mock_capture,
        ):
            await _handle_checkout_completed(session)

        # Unlock always runs; analytics fires once on first creation.
        mock_credit_svc.record_single_payment_and_unlock.assert_called_once()
        mock_capture.assert_called_once()
        assert mock_capture.call_args.args[0] == "payment_succeeded"

    @pytest.mark.asyncio
    async def test_single_purchase_duplicate_does_not_refire_analytics(self) -> None:
        """A duplicate Stripe delivery (created=False) unlocks but no analytics.

        record_single_payment_and_unlock is idempotent and re-runs the unlock on
        every delivery, but when it reports the payment already existed
        (created=False) the handler must not emit a second payment_succeeded event
        that would inflate revenue metrics.
        """
        session = self._base_session()
        session["metadata"]["product_type"] = "single"
        session["metadata"]["extraction_id"] = "ext-123"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_single_payment_and_unlock.return_value = {
            "id": "pay-123",
            "created": False,
        }

        with (
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            patch("app.api.v1.webhooks.capture_backend_event") as mock_capture,
        ):
            await _handle_checkout_completed(session)

        # Unlock still runs idempotently, but no duplicate analytics event.
        mock_credit_svc.record_single_payment_and_unlock.assert_called_once()
        mock_capture.assert_not_called()

    @pytest.mark.asyncio
    async def test_single_purchase_missing_extraction_id_raises(self) -> None:
        """Single purchase without an extraction_id must raise, not silently return.

        A silent return marks the Stripe event complete (no retry) and loses the
        payment with no audit trail. Raising ValueError routes through the
        permanent-error path so the failure is recorded for investigation.
        """
        session = self._base_session()
        session["metadata"]["product_type"] = "single"
        session["metadata"]["extraction_id"] = ""

        mock_credit_svc = MagicMock()

        with (
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            pytest.raises(ValueError, match="missing extraction_id"),
        ):
            await _handle_checkout_completed(session)

        mock_credit_svc.record_single_payment_and_unlock.assert_not_called()
        mock_credit_svc.record_payment.assert_not_called()

    @pytest.mark.asyncio
    async def test_credit_pack_10_success(self) -> None:
        """Happy path: credit_pack_10 records payment and adds 10 credits."""
        session = self._base_session()
        session["metadata"]["product_type"] = "credit_pack_10"

        mock_credit_svc = MagicMock()
        mock_credit_svc.record_payment.return_value = {"id": "pay-456"}
        mock_credit_svc.add_credits = AsyncMock(return_value={"created": True})

        with patch(
            "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
        ):
            await _handle_checkout_completed(session)

        mock_credit_svc.record_payment.assert_called_once()
        mock_credit_svc.add_credits.assert_called_once_with(
            user_id="user-abc",
            amount=10,
            payment_id="pay-456",
            description="10-credit pack purchase",
        )

    @pytest.mark.asyncio
    async def test_guest_auth_creation_failure_does_not_continue_with_fake_user(
        self,
    ) -> None:
        """Guest checkout must not record/unlock against a local-only fake user."""
        session = self._base_session()
        session["metadata"] = {
            "user_id": "",
            "product_type": "single",
            "extraction_id": "ext-123",
            "guest_email": "guest@example.com",
            "anonymous_session_id": "anon-123",
        }

        mock_credit_svc = MagicMock()

        with (
            patch("app.api.v1.webhooks._provision_guest_user", return_value=""),
            patch(
                "app.api.v1.webhooks.get_credit_service", return_value=mock_credit_svc
            ),
            pytest.raises(RuntimeError, match="Guest user provisioning failed"),
        ):
            await _handle_checkout_completed(session)

        mock_credit_svc.record_payment.assert_not_called()
        mock_credit_svc.record_single_payment_and_unlock.assert_not_called()
