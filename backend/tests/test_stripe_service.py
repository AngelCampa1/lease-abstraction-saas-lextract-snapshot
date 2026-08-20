"""Tests for StripeService — checkout session creation, webhook verification, session retrieval."""

from unittest.mock import MagicMock, patch

import pytest
import stripe as stripe_module

from app.schemas.payment import (
    PRODUCT_CREDITS,
    PRODUCT_NAMES,
    PRODUCT_PRICING,
    ProductType,
)
from app.services.stripe_service import (
    StripeService,
    get_stripe_service,
    reset_stripe_service,
)


class TestStripeServiceInit:
    """Test StripeService initialization sets Stripe API key."""

    def test_init_sets_api_key(self):
        svc = StripeService()
        assert stripe_module.api_key == "sk_test_placeholder"
        assert svc is not None


class TestCreateCheckoutSession:
    """Test create_checkout_session for all product types."""

    @patch("app.services.stripe_service.stripe.checkout.Session.create")
    def test_single_product_creates_session(self, mock_create: MagicMock):
        mock_session = MagicMock()
        mock_session.id = "cs_test_123"
        mock_session.url = "https://checkout.stripe.com/session/cs_test_123"
        mock_create.return_value = mock_session

        svc = StripeService()
        result = svc.create_checkout_session(
            user_id="user-abc",
            product_type=ProductType.SINGLE,
            success_url="https://lextract.io/results/ext-1?payment=success",
            cancel_url="https://lextract.io/results/ext-1?payment=cancelled",
            extraction_id="ext-1",
        )

        assert result.id == "cs_test_123"
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["mode"] == "payment"
        assert call_kwargs["line_items"][0]["price_data"]["unit_amount"] == 1500
        assert call_kwargs["line_items"][0]["price_data"]["currency"] == "usd"
        assert call_kwargs["metadata"]["user_id"] == "user-abc"
        assert call_kwargs["metadata"]["product_type"] == "single"
        assert call_kwargs["metadata"]["extraction_id"] == "ext-1"
        assert call_kwargs["metadata"]["credits"] == "1"

    @patch("app.services.stripe_service.stripe.checkout.Session.create")
    def test_credit_pack_5_creates_session(self, mock_create: MagicMock):
        mock_session = MagicMock()
        mock_session.id = "cs_test_456"
        mock_session.url = "https://checkout.stripe.com/session/cs_test_456"
        mock_create.return_value = mock_session

        svc = StripeService()
        result = svc.create_checkout_session(
            user_id="user-def",
            product_type=ProductType.CREDIT_PACK_5,
            success_url="https://lextract.io/dashboard?payment=success",
            cancel_url="https://lextract.io/dashboard?payment=cancelled",
        )

        assert result.id == "cs_test_456"
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["line_items"][0]["price_data"]["unit_amount"] == 6500
        product_name = call_kwargs["line_items"][0]["price_data"]["product_data"][
            "name"
        ]
        assert product_name == PRODUCT_NAMES[ProductType.CREDIT_PACK_5]
        assert call_kwargs["metadata"]["credits"] == "5"
        assert call_kwargs["metadata"]["product_type"] == "credit_pack_5"

    @patch("app.services.stripe_service.stripe.checkout.Session.create")
    def test_credit_pack_10_creates_session(self, mock_create: MagicMock):
        mock_session = MagicMock()
        mock_session.id = "cs_test_789"
        mock_session.url = "https://checkout.stripe.com/session/cs_test_789"
        mock_create.return_value = mock_session

        svc = StripeService()
        result = svc.create_checkout_session(
            user_id="user-ghi",
            product_type=ProductType.CREDIT_PACK_10,
            success_url="https://lextract.io/dashboard?payment=success",
            cancel_url="https://lextract.io/dashboard?payment=cancelled",
        )

        assert result.id == "cs_test_789"
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["line_items"][0]["price_data"]["unit_amount"] == 12000
        assert call_kwargs["metadata"]["credits"] == "10"

    @patch("app.services.stripe_service.stripe.checkout.Session.create")
    def test_single_without_extraction_id_sets_empty_string(
        self, mock_create: MagicMock
    ):
        mock_session = MagicMock()
        mock_session.id = "cs_test_no_ext"
        mock_create.return_value = mock_session

        svc = StripeService()
        svc.create_checkout_session(
            user_id="user-xyz",
            product_type=ProductType.SINGLE,
            success_url="https://lextract.io/dashboard?payment=success",
            cancel_url="https://lextract.io/dashboard?payment=cancelled",
        )

        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["metadata"]["extraction_id"] == ""

    @patch("app.services.stripe_service.stripe.checkout.Session.create")
    def test_stripe_error_raises_stripe_error(self, mock_create: MagicMock):
        mock_create.side_effect = stripe_module.StripeError("Connection failed")

        svc = StripeService()
        with pytest.raises(Exception) as exc_info:
            svc.create_checkout_session(
                user_id="user-err",
                product_type=ProductType.SINGLE,
                success_url="https://lextract.io/x?payment=success",
                cancel_url="https://lextract.io/x?payment=cancelled",
            )

        from app.core.exceptions import StripeError

        assert isinstance(exc_info.value, StripeError)
        assert "Connection failed" in str(exc_info.value)

    @patch("app.services.stripe_service.stripe.checkout.Session.create")
    def test_payment_intent_data_includes_metadata(self, mock_create: MagicMock):
        mock_session = MagicMock()
        mock_session.id = "cs_test_pi"
        mock_create.return_value = mock_session

        svc = StripeService()
        svc.create_checkout_session(
            user_id="user-pi",
            product_type=ProductType.SINGLE,
            success_url="https://lextract.io/results/ext-pi?payment=success",
            cancel_url="https://lextract.io/results/ext-pi?payment=cancelled",
            extraction_id="ext-pi",
        )

        call_kwargs = mock_create.call_args[1]
        pi_metadata = call_kwargs["payment_intent_data"]["metadata"]
        assert pi_metadata["user_id"] == "user-pi"
        assert pi_metadata["product_type"] == "single"

    @patch("app.services.stripe_service.stripe.checkout.Session.create")
    def test_statement_descriptor_is_lextract(self, mock_create: MagicMock):
        mock_session = MagicMock()
        mock_session.id = "cs_test_desc"
        mock_create.return_value = mock_session

        svc = StripeService()
        svc.create_checkout_session(
            user_id="user-desc",
            product_type=ProductType.SINGLE,
            success_url="https://lextract.io/x?payment=success",
            cancel_url="https://lextract.io/x?payment=cancelled",
        )

        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["payment_intent_data"]["statement_descriptor"] == "Lextract"


class TestVerifyWebhookSignature:
    """Test webhook signature verification."""

    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_valid_signature_returns_event(self, mock_construct: MagicMock):
        mock_event = MagicMock()
        mock_event.id = "evt_test_123"
        mock_event.type = "checkout.session.completed"
        mock_construct.return_value = mock_event

        svc = StripeService()
        result = svc.verify_webhook_signature(b"payload", "sig_header_value")

        assert result.id == "evt_test_123"
        mock_construct.assert_called_once_with(
            b"payload", "sig_header_value", "whsec_placeholder"
        )

    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_invalid_signature_raises(self, mock_construct: MagicMock):
        mock_construct.side_effect = stripe_module.SignatureVerificationError(
            "Invalid signature", "sig_header"
        )

        svc = StripeService()
        with pytest.raises(stripe_module.SignatureVerificationError):
            svc.verify_webhook_signature(b"payload", "bad_sig")

    @patch("app.services.stripe_service.stripe.Webhook.construct_event")
    def test_invalid_payload_raises_value_error(self, mock_construct: MagicMock):
        mock_construct.side_effect = ValueError("Invalid payload")

        svc = StripeService()
        with pytest.raises(ValueError, match="Invalid payload"):
            svc.verify_webhook_signature(b"bad_payload", "sig")


class TestGetSession:
    """Test retrieving an existing checkout session."""

    @patch("app.services.stripe_service.stripe.checkout.Session.retrieve")
    def test_get_session_returns_session(self, mock_retrieve: MagicMock):
        mock_session = MagicMock()
        mock_session.id = "cs_test_retrieve"
        mock_session.status = "complete"
        mock_retrieve.return_value = mock_session

        svc = StripeService()
        result = svc.get_session("cs_test_retrieve")

        assert result.id == "cs_test_retrieve"
        mock_retrieve.assert_called_once_with("cs_test_retrieve")

    @patch("app.services.stripe_service.stripe.checkout.Session.retrieve")
    def test_get_session_stripe_error(self, mock_retrieve: MagicMock):
        mock_retrieve.side_effect = stripe_module.StripeError("Not found")

        svc = StripeService()
        with pytest.raises(Exception) as exc_info:
            svc.get_session("cs_nonexistent")

        from app.core.exceptions import StripeError

        assert isinstance(exc_info.value, StripeError)


class TestSingleton:
    """Test get_stripe_service singleton and reset."""

    def test_get_stripe_service_returns_same_instance(self):
        reset_stripe_service()
        svc1 = get_stripe_service()
        svc2 = get_stripe_service()
        assert svc1 is svc2

    def test_reset_stripe_service_clears_instance(self):
        reset_stripe_service()
        svc1 = get_stripe_service()
        reset_stripe_service()
        svc2 = get_stripe_service()
        assert svc1 is not svc2


class TestProductPricingConstants:
    """Test that product pricing constants are correctly defined."""

    def test_single_pricing(self):
        assert PRODUCT_PRICING[ProductType.SINGLE] == 1500

    def test_credit_pack_5_pricing(self):
        assert PRODUCT_PRICING[ProductType.CREDIT_PACK_5] == 6500

    def test_credit_pack_10_pricing(self):
        assert PRODUCT_PRICING[ProductType.CREDIT_PACK_10] == 12000

    def test_single_credits(self):
        assert PRODUCT_CREDITS[ProductType.SINGLE] == 1

    def test_credit_pack_5_credits(self):
        assert PRODUCT_CREDITS[ProductType.CREDIT_PACK_5] == 5

    def test_credit_pack_10_credits(self):
        assert PRODUCT_CREDITS[ProductType.CREDIT_PACK_10] == 10

    def test_all_product_types_have_pricing(self):
        for pt in ProductType:
            assert pt in PRODUCT_PRICING
            assert pt in PRODUCT_NAMES
            assert pt in PRODUCT_CREDITS
