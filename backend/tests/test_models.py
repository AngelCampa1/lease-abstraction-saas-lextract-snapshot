"""Tests for Pydantic v2 models and enums."""

import uuid
from datetime import UTC, datetime

import pytest

from app.models import (
    AnonymousSession,
    CreditTransaction,
    Extraction,
    ExtractionEdit,
    ExtractionStatus,
    Payment,
    PaymentStatus,
    PaymentType,
    StripeWebhookEvent,
    User,
)


# ---------------------------------------------------------------------------
# Enum tests
# ---------------------------------------------------------------------------


class TestExtractionStatus:
    def test_all_values_exist(self) -> None:
        assert ExtractionStatus.UPLOADING == "uploading"
        assert ExtractionStatus.EXTRACTING == "extracting"
        assert ExtractionStatus.SCORING == "scoring"
        assert ExtractionStatus.COMPLETE == "complete"
        assert ExtractionStatus.FAILED == "failed"

    def test_ocr_processing_removed(self) -> None:
        assert not hasattr(ExtractionStatus, "OCR_PROCESSING")

    def test_invalid_value_raises(self) -> None:
        with pytest.raises(ValueError):
            ExtractionStatus("invalid_status")

    def test_is_string(self) -> None:
        assert isinstance(ExtractionStatus.COMPLETE, str)


class TestPaymentStatus:
    def test_all_values_exist(self) -> None:
        assert PaymentStatus.UNPAID == "unpaid"
        assert PaymentStatus.PAID == "paid"
        assert PaymentStatus.REFUNDED == "refunded"

    def test_invalid_value_raises(self) -> None:
        with pytest.raises(ValueError):
            PaymentStatus("invalid")


class TestPaymentType:
    def test_all_values_exist(self) -> None:
        assert PaymentType.SINGLE == "single"
        assert PaymentType.CREDIT_PACK_5 == "credit_pack_5"
        assert PaymentType.CREDIT_PACK_10 == "credit_pack_10"

    def test_invalid_value_raises(self) -> None:
        with pytest.raises(ValueError):
            PaymentType("pack_99")


# ---------------------------------------------------------------------------
# User model
# ---------------------------------------------------------------------------


class TestUser:
    def _make(self, **overrides: object) -> User:
        defaults: dict[str, object] = {
            "id": uuid.uuid4(),
            "email": "test@example.com",
            "full_name": "Test User",
            "company": "ACME Corp",
            "role": "tenant_rep",
            "credits_balance": 0,
            "stripe_customer_id": None,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
        defaults.update(overrides)
        return User(**defaults)

    def test_valid_construction(self) -> None:
        user = self._make()
        assert user.email == "test@example.com"
        assert user.credits_balance == 0

    def test_optional_fields_accept_none(self) -> None:
        user = self._make(full_name=None, company=None, stripe_customer_id=None)
        assert user.full_name is None
        assert user.company is None
        assert user.stripe_customer_id is None

    def test_id_is_uuid(self) -> None:
        uid = uuid.uuid4()
        user = self._make(id=uid)
        assert user.id == uid

    def test_from_attributes(self) -> None:
        # Verify ConfigDict(from_attributes=True) is set
        assert User.model_config.get("from_attributes") is True


# ---------------------------------------------------------------------------
# AnonymousSession model
# ---------------------------------------------------------------------------


class TestAnonymousSession:
    def test_valid_construction(self) -> None:
        session = AnonymousSession(
            id=uuid.uuid4(),
            session_token="tok_abc123",
            linked_user_id=None,
            expires_at=datetime.now(UTC),
            created_at=datetime.now(UTC),
        )
        assert session.session_token == "tok_abc123"
        assert session.linked_user_id is None

    def test_linked_user_id_optional(self) -> None:
        session = AnonymousSession(
            id=uuid.uuid4(),
            session_token="tok_xyz",
            linked_user_id=None,
            expires_at=datetime.now(UTC),
            created_at=datetime.now(UTC),
        )
        assert session.linked_user_id is None


# ---------------------------------------------------------------------------
# Extraction model
# ---------------------------------------------------------------------------


class TestExtraction:
    def _make(self, **overrides: object) -> Extraction:
        defaults: dict[str, object] = {
            "id": uuid.uuid4(),
            "user_id": None,
            "anonymous_session_id": None,
            "status": ExtractionStatus.UPLOADING,
            "document_filename": "lease.pdf",
            "document_object_key": "lextract-documents/user1/extr1/original.pdf",
            "document_page_count": None,
            "property_type": None,
            "extracted_data": None,
            "confidence_scores": None,
            "red_flags": None,
            "payment_status": PaymentStatus.UNPAID,
            "payment_id": None,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
        defaults.update(overrides)
        return Extraction(**defaults)

    def test_valid_construction(self) -> None:
        extraction = self._make()
        assert extraction.status == ExtractionStatus.UPLOADING
        assert extraction.payment_status == PaymentStatus.UNPAID

    def test_status_accepts_enum_string(self) -> None:
        extraction = self._make(status="complete")
        assert extraction.status == ExtractionStatus.COMPLETE

    def test_optional_fields_accept_none(self) -> None:
        extraction = self._make(
            user_id=None,
            anonymous_session_id=None,
            document_page_count=None,
            property_type=None,
            extracted_data=None,
            confidence_scores=None,
            red_flags=None,
            payment_id=None,
        )
        assert extraction.user_id is None

    def test_invalid_status_raises(self) -> None:
        with pytest.raises(ValueError):
            self._make(status="invalid_status")


# ---------------------------------------------------------------------------
# Payment model
# ---------------------------------------------------------------------------


class TestPayment:
    def test_valid_construction(self) -> None:
        payment = Payment(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            stripe_checkout_session_id="cs_test_abc",
            stripe_payment_intent_id=None,
            payment_type=PaymentType.SINGLE,
            amount_cents=2000,
            status="pending",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        assert payment.amount_cents == 2000
        assert payment.payment_type == PaymentType.SINGLE

    def test_payment_type_accepts_string(self) -> None:
        payment = Payment(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            stripe_checkout_session_id="cs_test_abc",
            stripe_payment_intent_id=None,
            payment_type="credit_pack_5",
            amount_cents=9000,
            status="pending",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        assert payment.payment_type == PaymentType.CREDIT_PACK_5

    def test_invalid_payment_type_raises(self) -> None:
        with pytest.raises(ValueError):
            Payment(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                stripe_checkout_session_id="cs_test_abc",
                stripe_payment_intent_id=None,
                payment_type="invalid_type",
                amount_cents=2000,
                status="pending",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )


# ---------------------------------------------------------------------------
# CreditTransaction model
# ---------------------------------------------------------------------------


class TestCreditTransaction:
    def test_valid_construction(self) -> None:
        txn = CreditTransaction(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            extraction_id=None,
            payment_id=None,
            amount=-1,
            balance_after=4,
            description="Used 1 credit for extraction",
            created_at=datetime.now(UTC),
        )
        assert txn.amount == -1
        assert txn.balance_after == 4

    def test_optional_extraction_and_payment_ids(self) -> None:
        txn = CreditTransaction(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            extraction_id=None,
            payment_id=uuid.uuid4(),
            amount=5,
            balance_after=5,
            description="Purchased 5-credit pack",
            created_at=datetime.now(UTC),
        )
        assert txn.extraction_id is None
        assert txn.payment_id is not None

    def test_immutability_docstring_present(self) -> None:
        """CreditTransaction must document its immutability constraint."""
        assert CreditTransaction.__doc__ is not None
        doc_lower = CreditTransaction.__doc__.lower()
        assert (
            "immut" in doc_lower or "never update" in doc_lower or "insert" in doc_lower
        )


# ---------------------------------------------------------------------------
# StripeWebhookEvent model
# ---------------------------------------------------------------------------


class TestStripeWebhookEvent:
    def test_id_is_string_not_uuid(self) -> None:
        """Stripe event IDs are TEXT, not UUIDs."""
        event = StripeWebhookEvent(
            id="evt_1ABC123",
            event_type="checkout.session.completed",
            processed_at=datetime.now(UTC),
        )
        # id must be a plain string, not a UUID object
        assert isinstance(event.id, str)
        assert event.id == "evt_1ABC123"

    def test_valid_construction(self) -> None:
        event = StripeWebhookEvent(
            id="evt_test_xyz",
            event_type="payment_intent.succeeded",
            processed_at=datetime.now(UTC),
        )
        assert event.event_type == "payment_intent.succeeded"


# ---------------------------------------------------------------------------
# ExtractionEdit model
# ---------------------------------------------------------------------------


class TestExtractionEdit:
    def test_valid_construction(self) -> None:
        edit = ExtractionEdit(
            id=uuid.uuid4(),
            extraction_id=uuid.uuid4(),
            field_name="lease_commencement_date",
            original_value="2024-01-01",
            edited_value="2024-02-01",
            edited_by=uuid.uuid4(),
            created_at=datetime.now(UTC),
        )
        assert edit.field_name == "lease_commencement_date"
        assert edit.original_value == "2024-01-01"

    def test_original_value_accepts_none(self) -> None:
        edit = ExtractionEdit(
            id=uuid.uuid4(),
            extraction_id=uuid.uuid4(),
            field_name="tenant_name",
            original_value=None,
            edited_value="New Tenant LLC",
            edited_by=uuid.uuid4(),
            created_at=datetime.now(UTC),
        )
        assert edit.original_value is None
