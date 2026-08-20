"""Targeted tests to close coverage gaps in three files:

- app/services/field_editor.py  (lines 104, 112, 119, 125, 146-156)
- app/api/v1/payments.py        (lines 102, 117, 106->122)
- app/services/credit_service.py (lines 116, 249, 361, 378, 472-473, 495, 500)
"""

from __future__ import annotations

import time
from contextlib import contextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.core.security import jwks_cache
from app.main import create_app
from app.models.user import AnonymousSession
from app.services.credit_service import CreditService, reset_credit_service
from app.services.field_editor import FieldTypeError, _coerce_field_value
from app.services.stripe_service import reset_stripe_service

# ---------------------------------------------------------------------------
# Shared test constants
# ---------------------------------------------------------------------------

USER_ID = "00000000-0000-0000-0000-000000000099"
EXTRACTION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
ANON_SESSION_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
ANON_SESSION_TOKEN = "anon-token-coverage"
PAYMENT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"


# ---------------------------------------------------------------------------
# Helpers — database mock
# ---------------------------------------------------------------------------


def _mock_db() -> MagicMock:
    """Create a mock database client with transaction() support."""
    mock_db = MagicMock()

    @contextmanager
    def _mock_transaction():
        yield mock_db

    mock_db.transaction = _mock_transaction
    return mock_db


# ---------------------------------------------------------------------------
# Helpers — auth / HTTP client
# ---------------------------------------------------------------------------


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


def _mock_user_lookup(
    public_key: rsa.RSAPublicKey,
) -> tuple[MagicMock, MagicMock]:
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


def _anonymous_session() -> AnonymousSession:
    return AnonymousSession(
        id=ANON_SESSION_ID,
        session_token=ANON_SESSION_TOKEN,
        linked_user_id=None,
        expires_at="2026-12-31T00:00:00Z",
        created_at="2026-01-01T00:00:00Z",
    )


@pytest.fixture
def app_client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture(autouse=True)
def _reset_singletons() -> None:
    reset_credit_service()
    reset_stripe_service()
    yield
    reset_credit_service()
    reset_stripe_service()


# ===========================================================================
# 1. field_editor._coerce_field_value — uncovered branches
# ===========================================================================


class TestCoerceFieldValueUncoveredBranches:
    """Cover the branches in _coerce_field_value not yet reached by existing tests."""

    # Line 104 — number field given a bool -> FieldTypeError
    def test_bool_for_number_field_raises_field_type_error(self) -> None:
        with pytest.raises(FieldTypeError, match="expects a number, got a boolean"):
            _coerce_field_value("rentable_square_footage", True)

    def test_false_bool_for_number_field_also_raises(self) -> None:
        with pytest.raises(FieldTypeError, match="expects a number, got a boolean"):
            _coerce_field_value("rentable_square_footage", False)

    # Line 112 — numeric string containing "." -> float()
    def test_float_string_for_number_field_returns_float(self) -> None:
        result = _coerce_field_value("rentable_square_footage", "1234.56")
        assert result == 1234.56
        assert isinstance(result, float)

    def test_float_string_for_currency_field_returns_float(self) -> None:
        from app.services.field_editor import _FIELD_DATA_TYPES

        currency_field = next(
            (k for k, v in _FIELD_DATA_TYPES.items() if v == "currency"), None
        )
        if currency_field is None:
            pytest.skip("no currency field in schema")
        result = _coerce_field_value(currency_field, "99.99")
        assert result == 99.99
        assert isinstance(result, float)

    # Line 119 — number field given a non-str/non-numeric type -> FieldTypeError
    def test_list_for_number_field_raises_field_type_error(self) -> None:
        with pytest.raises(FieldTypeError, match="expects a number, got list"):
            _coerce_field_value("rentable_square_footage", [1, 2, 3])

    def test_dict_for_number_field_raises_field_type_error(self) -> None:
        with pytest.raises(FieldTypeError, match="expects a number, got dict"):
            _coerce_field_value("rentable_square_footage", {"value": 5})

    # Line 125 — date field given a non-string -> FieldTypeError
    def test_int_for_date_field_raises_field_type_error(self) -> None:
        with pytest.raises(
            FieldTypeError, match="expects an ISO 8601 date string, got int"
        ):
            _coerce_field_value("commencement_date", 20260101)

    def test_list_for_date_field_raises_field_type_error(self) -> None:
        with pytest.raises(
            FieldTypeError, match="expects an ISO 8601 date string, got list"
        ):
            _coerce_field_value("commencement_date", ["2026-01-01"])

    # Lines 146-152 — array data_type: non-list -> FieldTypeError; list -> returned
    def test_string_for_array_field_raises_field_type_error(self) -> None:
        with pytest.raises(FieldTypeError, match="expects an array, got str"):
            _coerce_field_value("guarantor_name", "Alice")

    def test_int_for_array_field_raises_field_type_error(self) -> None:
        with pytest.raises(FieldTypeError, match="expects an array, got int"):
            _coerce_field_value("guarantor_name", 42)

    def test_list_for_array_field_is_returned_unchanged(self) -> None:
        value = ["Alice", "Bob"]
        result = _coerce_field_value("guarantor_name", value)
        assert result == value

    # Lines 154-156 — unknown data_type fallthrough -> value returned unchanged
    def test_unknown_data_type_returns_value_unchanged(self) -> None:
        """A field name whose data_type is not in the enum falls through to return."""
        import app.services.field_editor as fe_module

        original = dict(fe_module._FIELD_DATA_TYPES)
        fe_module._FIELD_DATA_TYPES["_test_unknown_field"] = "custom_type"
        try:
            result = _coerce_field_value("_test_unknown_field", {"anything": True})
            assert result == {"anything": True}
        finally:
            fe_module._FIELD_DATA_TYPES.clear()
            fe_module._FIELD_DATA_TYPES.update(original)


# ===========================================================================
# 2. payments.create_checkout — uncovered 404 paths
# ===========================================================================


class TestCheckoutEndpoint404Paths:
    """Cover the two 404 branches in create_checkout (lines 102 and 117)."""

    # Line 102 — authenticated user, extraction lookup returns no data -> 404
    def test_authenticated_user_extraction_not_found_returns_404(
        self, app_client: TestClient
    ) -> None:
        private_key = _generate_rsa_keypair()
        public_key = private_key.public_key()
        mock_jwk, mock_rls = _mock_user_lookup(public_key)
        token = _make_token(private_key)

        mock_service_db = MagicMock()
        # owned.data is None — extraction not found
        mock_service_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data=None
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.payments.NeonClientManager.get_service_client",
                return_value=mock_service_db,
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "extraction_id": EXTRACTION_ID,
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 404
        assert resp.json()["detail"] == "Extraction not found"

    # Line 117 — guest path, update returns no rows -> 404
    def test_guest_extraction_not_found_returns_404(
        self, app_client: TestClient
    ) -> None:
        mock_service_db = MagicMock()
        # Guest update chain: .update().eq().eq().is_().eq().execute() -> data=[]
        update_chain = (
            mock_service_db.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value.eq.return_value
        )
        update_chain.execute.return_value = MagicMock(data=[])

        with (
            patch(
                "app.core.dependencies._lookup_anonymous_session",
                new=AsyncMock(return_value=_anonymous_session()),
            ),
            patch(
                "app.api.v1.payments.NeonClientManager.get_service_client",
                return_value=mock_service_db,
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "extraction_id": EXTRACTION_ID,
                    "guest_email": "guest@example.com",
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
                headers={"X-Session-Token": ANON_SESSION_TOKEN},
            )

        assert resp.status_code == 404
        assert resp.json()["detail"] == "Extraction not found"

    # Branch 106->122 — guest path, update DOES return data -> reaches line 122 (Stripe call)
    def test_guest_extraction_found_proceeds_to_stripe(
        self, app_client: TestClient
    ) -> None:
        mock_service_db = MagicMock()
        # Guest update chain returns data -> extraction found
        update_chain = (
            mock_service_db.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value.eq.return_value
        )
        update_chain.execute.return_value = MagicMock(data=[{"id": EXTRACTION_ID}])

        mock_stripe_session = MagicMock()
        mock_stripe_session.url = "https://checkout.stripe.com/guest_session"
        mock_stripe_session.id = "cs_guest_ok"

        with (
            patch(
                "app.core.dependencies._lookup_anonymous_session",
                new=AsyncMock(return_value=_anonymous_session()),
            ),
            patch(
                "app.api.v1.payments.NeonClientManager.get_service_client",
                return_value=mock_service_db,
            ),
            patch(
                "app.services.stripe_service.stripe.checkout.Session.create",
                return_value=mock_stripe_session,
            ),
        ):
            resp = app_client.post(
                "/api/v1/payments/checkout",
                json={
                    "product_type": "single",
                    "extraction_id": EXTRACTION_ID,
                    "guest_email": "guest@example.com",
                    "success_url": "https://lextract.io/success",
                    "cancel_url": "https://lextract.io/cancel",
                },
                headers={"X-Session-Token": ANON_SESSION_TOKEN},
            )

        assert resp.status_code == 200
        assert resp.json()["session_id"] == "cs_guest_ok"


# ===========================================================================
# 3. credit_service — uncovered branches
# ===========================================================================


class TestAddCreditsBalanceNone:
    """Line 116 — balance_result.data is None inside add_credits -> NotFoundError."""

    @pytest.mark.asyncio
    async def test_raises_not_found_when_user_row_missing(self) -> None:
        from app.core.exceptions import NotFoundError

        mock_db = _mock_db()
        svc = CreditService()

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "users":
                mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                    data=None
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(NotFoundError):
                await svc.add_credits(USER_ID, 5, None, "test")


class TestUseCreditBalanceNone:
    """Line 249 — balance_result.data is None inside use_credit -> NotFoundError."""

    @pytest.mark.asyncio
    async def test_raises_not_found_when_user_row_missing_after_extraction_check(
        self,
    ) -> None:
        from app.core.exceptions import NotFoundError

        mock_db = _mock_db()
        svc = CreditService()

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "extractions":
                # Extraction found, owned by user, unpaid
                mock_table.select.return_value.eq.return_value.for_update.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data={
                        "id": EXTRACTION_ID,
                        "user_id": USER_ID,
                        "payment_status": "unpaid",
                    }
                )
            elif table_name == "users":
                # Balance row missing
                mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                    data=None
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(NotFoundError):
                await svc.use_credit(USER_ID, EXTRACTION_ID)


class TestRecordPaymentNonUniqueExceptionReraises:
    """Line 361 — exception that is NOT a unique violation -> re-raised."""

    def test_non_unique_exception_is_reraised(self) -> None:
        mock_db = _mock_db()
        svc = CreditService()

        call_count = {"n": 0}

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "payments":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    # Idempotency check: no existing payment
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=None
                    )
                else:
                    # Insert raises a non-unique-violation error
                    mock_table.insert.return_value.execute.side_effect = RuntimeError(
                        "connection timeout"
                    )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(RuntimeError, match="connection timeout"):
                svc.record_payment(
                    user_id=USER_ID,
                    payment_type="single",
                    amount_cents=2000,
                    stripe_session_id="cs_error",
                    stripe_payment_intent_id=None,
                )


class TestRecordPaymentUniqueRaceNoExistingRow:
    """Line 378 — unique violation BUT post-race lookup finds nothing -> re-raise."""

    def test_unique_violation_with_no_existing_row_reraises(self) -> None:
        mock_db = _mock_db()
        svc = CreditService()

        call_count = {"n": 0}

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "payments":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    # Idempotency check: no existing payment
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=None
                    )
                elif call_count["n"] == 2:
                    # Insert raises a unique violation
                    mock_table.insert.return_value.execute.side_effect = Exception(
                        "duplicate key violates unique constraint (23505)"
                    )
                else:
                    # Post-race lookup also finds nothing
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=None
                    )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            # The unique violation should be re-raised since no existing row was found
            with pytest.raises(Exception, match="duplicate"):
                svc.record_payment(
                    user_id=USER_ID,
                    payment_type="single",
                    amount_cents=2000,
                    stripe_session_id="cs_race_no_row",
                    stripe_payment_intent_id=None,
                )


class TestRecordSinglePaymentAndUnlockGuestPath:
    """Lines 472-473 — guest path sets update_data['user_id'] and adds anon session eq."""

    def test_guest_path_sets_user_id_in_update_data(self) -> None:
        mock_db = _mock_db()
        svc = CreditService()
        update_calls: list[dict] = []

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=None
                )
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{"id": PAYMENT_ID}]
                )
            elif table_name == "extractions":

                class UpdateChain:
                    def __init__(self, data: dict) -> None:
                        self._data = data
                        update_calls.append(data)

                    def eq(self, field: str, value: object) -> UpdateChain:
                        return self

                    def is_(self, field: str, value: object) -> UpdateChain:
                        return self

                    def execute(self) -> MagicMock:
                        return MagicMock(data=[{"id": EXTRACTION_ID}])

                mock_table.update = lambda data: UpdateChain(data)
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.record_single_payment_and_unlock(
                user_id=USER_ID,
                extraction_id=EXTRACTION_ID,
                amount_cents=2000,
                stripe_session_id="cs_guest_unlock",
                stripe_payment_intent_id=None,
                guest_anonymous_session_id=ANON_SESSION_ID,
            )

        assert result["id"] == PAYMENT_ID
        # user_id must be set in the update payload for the guest path (line 472)
        assert any(
            "user_id" in d for d in update_calls
        ), "guest path must add user_id to update_data"
        user_id_in_data = next(d for d in update_calls if "user_id" in d)
        assert user_id_in_data["user_id"] == USER_ID

    def test_non_guest_path_does_not_set_user_id_in_update_data(self) -> None:
        """Non-guest path takes the else branch (.eq('user_id', user_id)) instead."""
        mock_db = _mock_db()
        svc = CreditService()
        update_calls: list[dict] = []

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=None
                )
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{"id": PAYMENT_ID}]
                )
            elif table_name == "extractions":

                class UpdateChain:
                    def __init__(self, data: dict) -> None:
                        self._data = data
                        update_calls.append(data)

                    def eq(self, field: str, value: object) -> UpdateChain:
                        return self

                    def execute(self) -> MagicMock:
                        return MagicMock(data=[{"id": EXTRACTION_ID}])

                mock_table.update = lambda data: UpdateChain(data)
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            svc.record_single_payment_and_unlock(
                user_id=USER_ID,
                extraction_id=EXTRACTION_ID,
                amount_cents=2000,
                stripe_session_id="cs_non_guest",
                stripe_payment_intent_id=None,
                guest_anonymous_session_id=None,
            )

        # No user_id injected into update_data for non-guest path
        assert all("user_id" not in d for d in update_calls)


class TestRecordSinglePaymentGuestRecoverQuery:
    """Line 495 — guest recover_query adds anonymous_session_id eq filter."""

    def test_guest_recover_query_uses_anon_session_id_and_raises_when_nothing_found(
        self,
    ) -> None:
        """When duplicate payment AND update returns no rows AND recovery also finds
        nothing, a ValueError is raised (line 500). For guest path, the recover
        query adds the anonymous_session_id eq (line 495)."""
        mock_db = _mock_db()
        svc = CreditService()
        select_eq_calls: list[tuple[str, object]] = []

        payment_row = {
            "id": PAYMENT_ID,
            "user_id": USER_ID,
            "payment_type": "single",
            "amount_cents": 2000,
            "status": "completed",
            "created_at": "2026-05-01T00:00:00+00:00",
            "stripe_payment_intent_id": None,
        }

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=payment_row
                )
            elif table_name == "extractions":

                class UpdateChain:
                    def eq(self, field: str, value: object) -> UpdateChain:
                        return self

                    def is_(self, field: str, value: object) -> UpdateChain:
                        return self

                    def execute(self) -> MagicMock:
                        # Returns no rows — update did NOT mark paid
                        return MagicMock(data=[])

                class SelectChain:
                    def eq(self, field: str, value: object) -> SelectChain:
                        select_eq_calls.append((field, value))
                        return self

                    def maybe_single(self) -> SelectChain:
                        return self

                    def execute(self) -> MagicMock:
                        # Recovery also finds nothing
                        return MagicMock(data=None)

                mock_table.update.return_value = UpdateChain()
                mock_table.select.return_value = SelectChain()
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(ValueError, match="could not be marked paid"):
                svc.record_single_payment_and_unlock(
                    user_id=USER_ID,
                    extraction_id=EXTRACTION_ID,
                    amount_cents=2000,
                    stripe_session_id="cs_guest_recover_fail",
                    stripe_payment_intent_id=None,
                    guest_anonymous_session_id=ANON_SESSION_ID,
                )

        # Line 495: anonymous_session_id should be in the recovery select eq calls
        assert (
            "anonymous_session_id",
            ANON_SESSION_ID,
        ) in select_eq_calls, (
            f"expected anonymous_session_id in select eq calls, got {select_eq_calls}"
        )


class TestRecordSinglePaymentRecoverFailureNoGuest:
    """Line 500 — non-guest recover_query finds nothing -> ValueError."""

    def test_non_guest_recovery_failure_raises_value_error(self) -> None:
        """When existing payment's update returns no rows and recovery also returns
        nothing (non-guest path), ValueError is raised at line 500."""
        mock_db = _mock_db()
        svc = CreditService()

        payment_row = {
            "id": PAYMENT_ID,
            "user_id": USER_ID,
            "payment_type": "single",
            "amount_cents": 2000,
            "status": "completed",
            "created_at": "2026-05-01T00:00:00+00:00",
            "stripe_payment_intent_id": None,
        }

        def table_side_effect(table_name: str) -> MagicMock:
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=payment_row
                )
            elif table_name == "extractions":

                class UpdateChain:
                    def eq(self, field: str, value: object) -> UpdateChain:
                        return self

                    def execute(self) -> MagicMock:
                        return MagicMock(data=[])

                class SelectChain:
                    def eq(self, field: str, value: object) -> SelectChain:
                        return self

                    def maybe_single(self) -> SelectChain:
                        return self

                    def execute(self) -> MagicMock:
                        return MagicMock(data=None)

                mock_table.update.return_value = UpdateChain()
                mock_table.select.return_value = SelectChain()
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(ValueError, match="could not be marked paid"):
                svc.record_single_payment_and_unlock(
                    user_id=USER_ID,
                    extraction_id=EXTRACTION_ID,
                    amount_cents=2000,
                    stripe_session_id="cs_recover_none",
                    stripe_payment_intent_id=None,
                    guest_anonymous_session_id=None,
                )
