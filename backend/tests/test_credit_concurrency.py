"""Concurrency-oriented tests for credit operations.

The current implementation relies on database transactions plus
``SELECT ... FOR UPDATE`` row locks rather than a stale balance CAS check.
These tests verify the async API, the locking behavior, and the resulting
serialized outcomes.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import ConflictError, InsufficientCreditsError
from app.services.credit_service import CreditService, reset_credit_service

USER_ID = "00000000-0000-0000-0000-000000000001"
EXTRACTION_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
EXTRACTION_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


@pytest.fixture(autouse=True)
def _reset_singleton():
    reset_credit_service()
    yield
    reset_credit_service()


def _build_db(
    *,
    balance: int,
    extraction_id: str | None = None,
    extraction_status: str = "unpaid",
) -> tuple[MagicMock, dict[str, MagicMock]]:
    db = MagicMock()
    tx = MagicMock()
    db.transaction.return_value.__enter__.return_value = tx
    db.transaction.return_value.__exit__.return_value = False

    users_select = MagicMock()
    users_select.eq.return_value = users_select
    users_select.for_update.return_value = users_select
    users_select.single.return_value = users_select
    users_select.execute.return_value = MagicMock(data={"credits_balance": balance})

    users_update = MagicMock()
    users_update.eq.return_value = users_update
    users_update.execute.return_value = MagicMock(data=[{"id": USER_ID}])

    users_table = MagicMock()
    users_table.select.return_value = users_select
    users_table.update.return_value = users_update

    def table_side_effect(table_name: str) -> MagicMock:
        if table_name == "users":
            return users_table

        table = MagicMock()

        if table_name == "extractions":
            extraction_select = MagicMock()
            extraction_select.eq.return_value = extraction_select
            extraction_select.for_update.return_value = extraction_select
            extraction_select.maybe_single.return_value = extraction_select
            extraction_select.execute.return_value = MagicMock(
                data=(
                    {
                        "id": extraction_id,
                        "user_id": USER_ID,
                        "payment_status": extraction_status,
                    }
                    if extraction_id
                    else None
                )
            )

            extraction_update = MagicMock()
            extraction_update.eq.return_value = extraction_update
            extraction_update.execute.return_value = MagicMock(data=[{}])

            table.select.return_value = extraction_select
            table.update.return_value = extraction_update
            return table

        if table_name == "credit_transactions":
            insert_mock = MagicMock()
            insert_mock.execute.return_value = MagicMock(data=[{}])
            table.insert.return_value = insert_mock
            return table

        return table

    db.table.side_effect = table_side_effect
    tx.table.side_effect = table_side_effect
    return db, {
        "transaction": db.transaction.return_value,
        "users_select": users_select,
        "users_update": users_update,
    }


class TestConcurrentUseCredit:
    """Test serialized outcomes for concurrent-style credit usage."""

    @pytest.mark.asyncio
    async def test_use_credit_locks_rows_and_succeeds(self) -> None:
        svc = CreditService()
        mock_db, mocks = _build_db(balance=1, extraction_id=EXTRACTION_A)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.use_credit(USER_ID, EXTRACTION_A)

        assert result["new_balance"] == 0
        assert result["extraction_id"] == EXTRACTION_A
        assert mocks["users_select"].for_update.called
        assert mocks["transaction"].__enter__.called

    @pytest.mark.asyncio
    async def test_second_use_credit_fails_after_balance_is_consumed(self) -> None:
        """A second serialized call sees balance 0 and fails cleanly."""
        svc = CreditService()
        first_db, _ = _build_db(balance=1, extraction_id=EXTRACTION_A)
        second_db, _ = _build_db(balance=0, extraction_id=EXTRACTION_B)

        with patch.object(svc, "_get_db", return_value=first_db):
            first = await svc.use_credit(USER_ID, EXTRACTION_A)

        assert first["new_balance"] == 0

        with patch.object(svc, "_get_db", return_value=second_db):
            with pytest.raises(InsufficientCreditsError, match="need 1, have 0"):
                await svc.use_credit(USER_ID, EXTRACTION_B)

    @pytest.mark.asyncio
    async def test_use_credit_with_zero_balance_fails(self) -> None:
        svc = CreditService()
        mock_db, _ = _build_db(balance=0, extraction_id=EXTRACTION_A)

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(InsufficientCreditsError, match="need 1, have 0"):
                await svc.use_credit(USER_ID, EXTRACTION_A)

    @pytest.mark.asyncio
    async def test_use_credit_already_paid_conflict(self) -> None:
        svc = CreditService()
        mock_db, _ = _build_db(
            balance=3,
            extraction_id=EXTRACTION_A,
            extraction_status="paid",
        )

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(ConflictError, match="already paid"):
                await svc.use_credit(USER_ID, EXTRACTION_A)

    @pytest.mark.asyncio
    async def test_add_credits_locks_user_row(self) -> None:
        svc = CreditService()
        mock_db, mocks = _build_db(balance=0)

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.add_credits(USER_ID, 5, None, "Pack A")

        assert result["new_balance"] == 5
        assert mocks["users_select"].for_update.called
        assert mocks["users_update"].eq.called
