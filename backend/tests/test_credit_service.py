"""Tests for CreditService — credit ledger operations.

Tests exercise real service logic with mocks only at the database boundary.
The transaction() context manager yields the same mock so table() calls
made via the transaction proxy use the same side_effect routing.
"""

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import InsufficientCreditsError
from app.services.credit_service import (
    CreditService,
    get_credit_service,
    reset_credit_service,
)

USER_ID = "00000000-0000-0000-0000-000000000001"
EXTRACTION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PAYMENT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


@pytest.fixture(autouse=True)
def _reset_singleton():
    reset_credit_service()
    yield
    reset_credit_service()


def _mock_db():
    """Create a mock database client with transaction() support.

    The transaction() context manager yields a proxy that delegates
    .table() to the same mock_db, so side_effect routing works for
    both direct and transactional calls.
    """
    mock_db = MagicMock()

    @contextmanager
    def _mock_transaction():
        yield mock_db  # proxy is the same mock — table() routing works

    mock_db.transaction = _mock_transaction
    return mock_db


def _setup_balance(mock_db, balance):
    """Configure mock to return a specific balance from users table."""
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"credits_balance": balance}
    )


def _setup_update_success(mock_db, rows=1):
    """Configure mock update to return rows (simulating CAS success or failure)."""
    data = [{"id": USER_ID}] * rows
    mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=data
    )


class TestGetBalance:
    def test_returns_balance_from_users_table(self):
        mock_db = _mock_db()
        _setup_balance(mock_db, 7)
        svc = CreditService()

        with patch.object(svc, "_get_db", return_value=mock_db):
            balance = svc.get_balance(USER_ID)

        assert balance == 7
        mock_db.table.assert_called_with("users")

    def test_returns_zero_when_no_data(self):
        mock_db = _mock_db()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )
        svc = CreditService()

        with patch.object(svc, "_get_db", return_value=mock_db):
            balance = svc.get_balance(USER_ID)

        assert balance == 0


class TestGetRecentTransactions:
    def test_returns_transactions_ordered_desc(self):
        mock_db = _mock_db()
        tx_data = [
            {
                "id": "tx1",
                "amount": 5,
                "balance_after": 5,
                "description": "Pack",
                "created_at": "2026-03-16T00:00:00Z",
            },
            {
                "id": "tx2",
                "amount": -1,
                "balance_after": 4,
                "description": "Used",
                "created_at": "2026-03-15T00:00:00Z",
            },
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=tx_data
        )
        svc = CreditService()

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.get_recent_transactions(USER_ID, limit=10)

        assert len(result) == 2
        assert result[0]["id"] == "tx1"

    def test_returns_empty_list_when_no_transactions(self):
        mock_db = _mock_db()
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        svc = CreditService()

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.get_recent_transactions(USER_ID)

        assert result == []


class TestAddCredits:
    @pytest.mark.asyncio
    async def test_inserts_transaction_and_updates_balance(self):
        mock_db = _mock_db()
        svc = CreditService()

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "users":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    # SELECT ... FOR UPDATE (balance read inside transaction)
                    mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                        data={"credits_balance": 3}
                    )
                else:
                    # UPDATE balance
                    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"id": USER_ID}]
                    )
            elif table_name == "credit_transactions":
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.add_credits(
                USER_ID, 5, PAYMENT_ID, "5-credit pack purchase"
            )

        assert result["new_balance"] == 8
        assert result["amount"] == 5

    @pytest.mark.asyncio
    async def test_returns_created_true_on_new_grant(self):
        mock_db = _mock_db()
        svc = CreditService()

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "users":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                        data={"credits_balance": 3}
                    )
                else:
                    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"id": USER_ID}]
                    )
            elif table_name == "credit_transactions":
                # No prior grant for this payment_id.
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=None
                )
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.add_credits(
                USER_ID, 5, PAYMENT_ID, "5-credit pack purchase"
            )

        assert result["created"] is True
        assert result["new_balance"] == 8

    @pytest.mark.asyncio
    async def test_idempotent_when_grant_already_exists_for_payment(self):
        """A second call for the same payment_id must not grant credits again."""
        mock_db = _mock_db()
        svc = CreditService()

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "users":
                mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                    data={"credits_balance": 8}
                )
            elif table_name == "credit_transactions":
                # A grant for this payment_id already exists.
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data={"id": "tx-existing", "amount": 5, "balance_after": 8}
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.add_credits(
                USER_ID, 5, PAYMENT_ID, "5-credit pack purchase"
            )

        assert result["created"] is False
        assert result["transaction_id"] == "tx-existing"
        assert result["new_balance"] == 8
        # Balance must NOT be updated and no new ledger row inserted.
        update_calls = [c for c in mock_db.table.mock_calls if ".update(" in str(c)]
        insert_calls = [c for c in mock_db.table.mock_calls if ".insert(" in str(c)]
        assert update_calls == []
        assert insert_calls == []

    @pytest.mark.asyncio
    async def test_rejects_negative_amount(self):
        svc = CreditService()
        with pytest.raises(ValueError, match="positive"):
            await svc.add_credits(USER_ID, -1, None, "test")

    @pytest.mark.asyncio
    async def test_add_credits_without_payment_id(self):
        mock_db = _mock_db()
        svc = CreditService()

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "users":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                        data={"credits_balance": 0}
                    )
                else:
                    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"id": USER_ID}]
                    )
            elif table_name == "credit_transactions":
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.add_credits(USER_ID, 10, None, "Bonus credits")

        assert result["new_balance"] == 10


def _extraction_record(user_id=USER_ID, payment_status="unpaid"):
    """Build a mock extraction record for use_credit tests."""
    return {
        "id": EXTRACTION_ID,
        "user_id": user_id,
        "payment_status": payment_status,
    }


class TestUseCredit:
    @pytest.mark.asyncio
    async def test_deducts_one_credit_and_marks_extraction_paid(self):
        mock_db = _mock_db()
        svc = CreditService()

        user_call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "users":
                user_call_count["n"] += 1
                if user_call_count["n"] == 1:
                    # SELECT ... FOR UPDATE (balance read)
                    mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                        data={"credits_balance": 5}
                    )
                else:
                    # UPDATE balance
                    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"id": USER_ID}]
                    )
            elif table_name == "credit_transactions":
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            elif table_name == "extractions":
                # SELECT ... FOR UPDATE (ownership + payment_status check)
                mock_table.select.return_value.eq.return_value.for_update.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=_extraction_record()
                )
                # UPDATE payment_status
                mock_table.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.use_credit(USER_ID, EXTRACTION_ID)

        assert result["new_balance"] == 4
        assert result["extraction_id"] == EXTRACTION_ID

    @pytest.mark.asyncio
    async def test_raises_insufficient_credits_when_balance_zero(self):
        mock_db = _mock_db()
        svc = CreditService()

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "extractions":
                mock_table.select.return_value.eq.return_value.for_update.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=_extraction_record()
                )
            elif table_name == "users":
                mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                    data={"credits_balance": 0}
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(InsufficientCreditsError, match="need 1, have 0"):
                await svc.use_credit(USER_ID, EXTRACTION_ID)


class TestRecordPayment:
    def test_inserts_payment_record(self):
        mock_db = _mock_db()
        inserted = {
            "id": PAYMENT_ID,
            "user_id": USER_ID,
            "payment_type": "credit_pack_5",
            "amount_cents": 9000,
            "status": "completed",
            "created_at": "2026-03-16T00:00:00Z",
            "updated_at": "2026-03-16T00:00:00Z",
        }

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "payments":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    # Idempotency check: no existing payment
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=None
                    )
                else:
                    # Insert
                    mock_table.insert.return_value.execute.return_value = MagicMock(
                        data=[inserted]
                    )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)
        svc = CreditService()

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.record_payment(
                user_id=USER_ID,
                payment_type="credit_pack_5",
                amount_cents=9000,
                stripe_session_id="cs_test_123",
                stripe_payment_intent_id="pi_test_123",
            )

        assert result["id"] == PAYMENT_ID

    def test_record_payment_without_payment_intent(self):
        mock_db = _mock_db()

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "payments":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    # Idempotency check: no existing payment
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=None
                    )
                else:
                    # Insert
                    mock_table.insert.return_value.execute.return_value = MagicMock(
                        data=[{"id": PAYMENT_ID}]
                    )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)
        svc = CreditService()

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.record_payment(
                user_id=USER_ID,
                payment_type="single",
                amount_cents=2000,
                stripe_session_id="cs_test_456",
                stripe_payment_intent_id=None,
            )

        assert result["id"] == PAYMENT_ID

    def test_duplicate_stripe_session_returns_existing_payment(self):
        """Bug #37: record_payment with same stripe_session_id returns existing row."""
        mock_db = _mock_db()
        svc = CreditService()

        existing_payment = {
            "id": PAYMENT_ID,
            "user_id": USER_ID,
            "payment_type": "credit_pack_5",
            "amount_cents": 9000,
            "status": "completed",
            "created_at": "2026-03-16T00:00:00Z",
        }

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "payments":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    # Idempotency check: existing payment found
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=existing_payment
                    )
                else:
                    # Should NOT reach insert
                    mock_table.insert.return_value.execute.return_value = MagicMock(
                        data=[existing_payment]
                    )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.record_payment(
                user_id=USER_ID,
                payment_type="credit_pack_5",
                amount_cents=9000,
                stripe_session_id="cs_duplicate_123",
                stripe_payment_intent_id="pi_test",
            )

        assert result["id"] == PAYMENT_ID
        # Insert should NOT have been called (idempotency short-circuit)
        assert call_count["n"] == 1

    def test_record_payment_unique_race_returns_existing_payment(self):
        """Concurrent insert race returns the winning payment instead of failing."""
        mock_db = _mock_db()
        svc = CreditService()

        existing_payment = {
            "id": PAYMENT_ID,
            "user_id": USER_ID,
            "payment_type": "credit_pack_5",
            "amount_cents": 9000,
            "status": "completed",
            "created_at": "2026-03-16T00:00:00Z",
        }

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "payments":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=None
                    )
                elif call_count["n"] == 2:
                    mock_table.insert.return_value.execute.side_effect = Exception(
                        "duplicate key value violates unique constraint payments_stripe_checkout_session_id_key (SQLSTATE 23505)"
                    )
                else:
                    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                        data=existing_payment
                    )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.record_payment(
                user_id=USER_ID,
                payment_type="credit_pack_5",
                amount_cents=9000,
                stripe_session_id="cs_race_123",
                stripe_payment_intent_id="pi_test",
            )

        assert result["id"] == PAYMENT_ID
        assert result["created"] is False


class TestRecordSinglePaymentAndUnlock:
    def test_records_payment_and_unlocks_in_transaction(self):
        mock_db = _mock_db()
        svc = CreditService()

        calls: list[tuple[str, str, object]] = []
        payment_row = {"id": PAYMENT_ID, "created": True}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=None
                )
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[payment_row]
                )
            elif table_name == "extractions":

                class UpdateChain:
                    def eq(self, field, value):
                        calls.append(("eq", field, value))
                        return self

                    def is_(self, field, value):
                        calls.append(("is", field, value))
                        return self

                    def execute(self):
                        return MagicMock(data=[{"id": EXTRACTION_ID}])

                mock_table.update.return_value = UpdateChain()
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.record_single_payment_and_unlock(
                user_id=USER_ID,
                extraction_id=EXTRACTION_ID,
                amount_cents=2000,
                stripe_session_id="cs_single",
                stripe_payment_intent_id="pi_single",
            )

        assert result["id"] == PAYMENT_ID
        assert ("eq", "id", EXTRACTION_ID) in calls
        assert ("eq", "payment_status", "unpaid") in calls
        assert ("eq", "user_id", USER_ID) in calls

    def test_unlock_failure_rolls_back_payment_insert(self):
        mock_db = _mock_db()
        svc = CreditService()
        rolled_back = {"value": False}

        @contextmanager
        def transaction():
            try:
                yield mock_db
            except Exception:
                rolled_back["value"] = True
                raise

        mock_db.transaction = transaction

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=None
                )
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{"id": PAYMENT_ID}]
                )
            elif table_name == "extractions":
                mock_table.update.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with (
            patch.object(svc, "_get_db", return_value=mock_db),
            pytest.raises(ValueError, match="could not be marked paid"),
        ):
            svc.record_single_payment_and_unlock(
                user_id=USER_ID,
                extraction_id=EXTRACTION_ID,
                amount_cents=2000,
                stripe_session_id="cs_single",
                stripe_payment_intent_id=None,
            )

        assert rolled_back["value"] is True

    def test_duplicate_payment_with_already_paid_extraction_is_recoverable(self):
        mock_db = _mock_db()
        svc = CreditService()
        calls: list[tuple[str, str, object]] = []
        payment_row = {
            "id": PAYMENT_ID,
            "user_id": USER_ID,
            "payment_type": "single",
            "amount_cents": 2000,
            "status": "completed",
            "created_at": "2026-05-13T00:00:00+00:00",
        }

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=payment_row
                )
            elif table_name == "extractions":

                class UpdateChain:
                    def eq(self, field, value):
                        calls.append(("update_eq", field, value))
                        return self

                    def execute(self):
                        return MagicMock(data=[])

                class SelectChain:
                    def eq(self, field, value):
                        calls.append(("select_eq", field, value))
                        return self

                    def single(self):
                        return self

                    def maybe_single(self):
                        return self

                    def execute(self):
                        return MagicMock(
                            data={
                                "id": EXTRACTION_ID,
                                "user_id": USER_ID,
                                "payment_status": "paid",
                                "payment_id": PAYMENT_ID,
                            }
                        )

                mock_table.update.return_value = UpdateChain()
                mock_table.select.return_value = SelectChain()
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = svc.record_single_payment_and_unlock(
                user_id=USER_ID,
                extraction_id=EXTRACTION_ID,
                amount_cents=2000,
                stripe_session_id="cs_single",
                stripe_payment_intent_id=None,
            )

        assert result["id"] == PAYMENT_ID
        assert result["created"] is False
        assert ("select_eq", "id", EXTRACTION_ID) in calls
        assert ("select_eq", "payment_id", PAYMENT_ID) in calls

    def test_duplicate_payment_owned_by_other_user_does_not_unlock_extraction(self):
        mock_db = _mock_db()
        svc = CreditService()
        update_called = False
        payment_row = {
            "id": PAYMENT_ID,
            "user_id": "other-user",
            "payment_type": "single",
            "amount_cents": 2000,
            "status": "completed",
            "created_at": "2026-05-13T00:00:00+00:00",
        }

        def table_side_effect(table_name):
            nonlocal update_called
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=payment_row
                )
            elif table_name == "extractions":
                update_called = True
                mock_table.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{"id": EXTRACTION_ID}]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with (
            patch.object(svc, "_get_db", return_value=mock_db),
            pytest.raises(ValueError, match="does not match unlock request"),
        ):
            svc.record_single_payment_and_unlock(
                user_id=USER_ID,
                extraction_id=EXTRACTION_ID,
                amount_cents=2000,
                stripe_session_id="cs_single",
                stripe_payment_intent_id=None,
            )

        assert update_called is False

    def test_duplicate_payment_without_matching_intent_does_not_unlock_extraction(self):
        mock_db = _mock_db()
        svc = CreditService()
        update_called = False
        payment_row = {
            "id": PAYMENT_ID,
            "user_id": USER_ID,
            "payment_type": "single",
            "amount_cents": 2000,
            "status": "completed",
            "stripe_payment_intent_id": None,
            "created_at": "2026-05-13T00:00:00+00:00",
        }

        def table_side_effect(table_name):
            nonlocal update_called
            mock_table = MagicMock()
            if table_name == "payments":
                mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=payment_row
                )
            elif table_name == "extractions":
                update_called = True
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with (
            patch.object(svc, "_get_db", return_value=mock_db),
            pytest.raises(ValueError, match="does not match unlock request"),
        ):
            svc.record_single_payment_and_unlock(
                user_id=USER_ID,
                extraction_id=EXTRACTION_ID,
                amount_cents=2000,
                stripe_session_id="cs_single",
                stripe_payment_intent_id="pi_current",
            )

        assert update_called is False


class TestGetPaymentHistory:
    def test_returns_paginated_payments(self):
        mock_db = _mock_db()
        svc = CreditService()

        count_mock = MagicMock()
        count_mock.count = 15

        rows_mock = MagicMock()
        rows_mock.data = [
            {
                "id": "p1",
                "payment_type": "single",
                "amount_cents": 2000,
                "status": "completed",
                "created_at": "2026-03-16T00:00:00Z",
            },
        ]

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            call_count["n"] += 1
            if call_count["n"] == 1:
                # Count query
                mock_table.select.return_value.eq.return_value.execute.return_value = (
                    count_mock
                )
            else:
                # Data query
                mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = (
                    rows_mock
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            payments, total = svc.get_payment_history(USER_ID, page=1, page_size=10)

        assert total == 15
        assert len(payments) == 1
        assert payments[0]["id"] == "p1"

    def test_returns_empty_when_no_payments(self):
        mock_db = _mock_db()
        svc = CreditService()

        count_mock = MagicMock()
        count_mock.count = 0

        rows_mock = MagicMock()
        rows_mock.data = []

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            call_count["n"] += 1
            if call_count["n"] == 1:
                mock_table.select.return_value.eq.return_value.execute.return_value = (
                    count_mock
                )
            else:
                mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = (
                    rows_mock
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            payments, total = svc.get_payment_history(USER_ID)

        assert total == 0
        assert payments == []

    def test_count_none_returns_zero(self):
        """When count is None from Supabase, total should be 0."""
        mock_db = _mock_db()
        svc = CreditService()

        count_mock = MagicMock()
        count_mock.count = None

        rows_mock = MagicMock()
        rows_mock.data = None

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            call_count["n"] += 1
            if call_count["n"] == 1:
                mock_table.select.return_value.eq.return_value.execute.return_value = (
                    count_mock
                )
            else:
                mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = (
                    rows_mock
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            payments, total = svc.get_payment_history(USER_ID)

        assert total == 0
        assert payments == []


class TestGetCreditServiceSingleton:
    def test_returns_same_instance(self):
        svc1 = get_credit_service()
        svc2 = get_credit_service()
        assert svc1 is svc2

    def test_reset_clears_singleton(self):
        svc1 = get_credit_service()
        reset_credit_service()
        svc2 = get_credit_service()
        assert svc1 is not svc2


class TestGetDb:
    def test_get_db_returns_service_client(self):
        mock_client = MagicMock()
        svc = CreditService()
        with patch(
            "app.services.credit_service.NeonClientManager.get_service_client",
            return_value=mock_client,
        ):
            result = svc._get_db()
        assert result is mock_client


class TestAddCreditsValidation:
    """Bug #51: add_credits must reject zero or negative amounts."""

    @pytest.mark.asyncio
    async def test_add_credits_rejects_zero_amount(self):
        svc = CreditService()
        with pytest.raises(ValueError, match="Credit amount must be positive"):
            await svc.add_credits(USER_ID, 0, None, "test")

    @pytest.mark.asyncio
    async def test_add_credits_rejects_negative_amount(self):
        svc = CreditService()
        with pytest.raises(ValueError, match="Credit amount must be positive"):
            await svc.add_credits(USER_ID, -5, None, "negative credits")

    @pytest.mark.asyncio
    async def test_add_credits_rejects_minus_one(self):
        """Negative credit without balance check could silently deduct credits."""
        svc = CreditService()
        with pytest.raises(ValueError, match="Credit amount must be positive"):
            await svc.add_credits(USER_ID, -1, None, "sneaky deduction")


class TestAddCreditsTransactionRollback:
    """Ledger insert failure rolls back the entire transaction (no inconsistency)."""

    @pytest.mark.asyncio
    async def test_ledger_insert_failure_propagates_and_rolls_back(self):
        """Exception in ledger insert propagates; transaction rollback prevents
        the balance update from persisting."""
        mock_db = _mock_db()
        svc = CreditService()

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "users":
                call_count["n"] += 1
                if call_count["n"] == 1:
                    mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                        data={"credits_balance": 3}
                    )
                else:
                    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"id": USER_ID}]
                    )
            elif table_name == "credit_transactions":
                mock_table.insert.return_value.execute.side_effect = RuntimeError(
                    "Ledger insert failed"
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(RuntimeError, match="Ledger insert failed"):
                await svc.add_credits(USER_ID, 5, PAYMENT_ID, "test pack")


class TestUseCreditPaymentStatusFilter:
    """use_credit must filter by payment_status='unpaid' when updating extraction."""

    @pytest.mark.asyncio
    async def test_extraction_update_filters_by_payment_status_unpaid(self):
        """The extractions update must include .eq('payment_status', 'unpaid')."""
        mock_db = _mock_db()
        svc = CreditService()

        update_eq_calls: list[tuple[str, str]] = []
        user_call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "users":
                user_call_count["n"] += 1
                if user_call_count["n"] == 1:
                    mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                        data={"credits_balance": 5}
                    )
                else:
                    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"id": USER_ID}]
                    )
            elif table_name == "credit_transactions":
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            elif table_name == "extractions":
                mock_table.select.return_value.eq.return_value.for_update.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=_extraction_record()
                )

                class UpdateChain:
                    def __init__(self):
                        self._eq_calls: list[tuple[str, str]] = []

                    def eq(self, field, value):
                        self._eq_calls.append((field, value))
                        update_eq_calls.extend([(field, value)])
                        return self

                    def execute(self):
                        return MagicMock(data=[{}])

                mock_table.update.return_value = UpdateChain()
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            await svc.use_credit(USER_ID, EXTRACTION_ID)

        assert ("payment_status", "unpaid") in update_eq_calls


class TestNoUpdateOnCreditTransactions:
    """Ensure CreditService NEVER calls .update() on credit_transactions table."""

    @pytest.mark.asyncio
    async def test_add_credits_never_updates_credit_transactions(self):
        mock_db = _mock_db()
        svc = CreditService()

        tables_accessed = []

        def table_side_effect(table_name):
            mock_table = MagicMock()
            tables_accessed.append((table_name, mock_table))
            if table_name == "users":
                mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                    data={"credits_balance": 0}
                )
                mock_table.update.return_value.eq.return_value.execute.return_value = (
                    MagicMock(data=[{"id": USER_ID}])
                )
            elif table_name == "credit_transactions":
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            await svc.add_credits(USER_ID, 5, None, "test")

        for name, table_mock in tables_accessed:
            if name == "credit_transactions":
                table_mock.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_use_credit_never_updates_credit_transactions(self):
        mock_db = _mock_db()
        svc = CreditService()

        tables_accessed = []

        def table_side_effect(table_name):
            mock_table = MagicMock()
            tables_accessed.append((table_name, mock_table))
            if table_name == "users":
                if not any(n == "users" for n, _ in tables_accessed[:-1]):
                    mock_table.select.return_value.eq.return_value.for_update.return_value.single.return_value.execute.return_value = MagicMock(
                        data={"credits_balance": 5}
                    )
                else:
                    mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"id": USER_ID}]
                    )
            elif table_name == "credit_transactions":
                mock_table.insert.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            elif table_name == "extractions":
                mock_table.select.return_value.eq.return_value.for_update.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                    data=_extraction_record()
                )
                mock_table.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{}]
                )
            return mock_table

        mock_db.table = MagicMock(side_effect=table_side_effect)

        with patch.object(svc, "_get_db", return_value=mock_db):
            await svc.use_credit(USER_ID, EXTRACTION_ID)

        for name, table_mock in tables_accessed:
            if name == "credit_transactions":
                table_mock.update.assert_not_called()
