"""Unit tests for CreditService transaction semantics.

The service now performs balance changes, ledger inserts, and extraction
updates inside a single database transaction. These tests verify the current
async API and ensure failures propagate without manual compensating writes.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.services.credit_service import CreditService, reset_credit_service


@pytest.fixture(autouse=True)
def reset_service() -> None:
    """Reset the singleton CreditService after each test."""
    yield
    reset_credit_service()


def _make_mock_db(
    *,
    balance: int = 5,
    extraction_status: str = "unpaid",
    extraction_owner: str = "user-123",
    balance_update_ok: bool = True,
    ledger_insert_ok: bool = True,
    extraction_update_ok: bool = True,
) -> tuple[MagicMock, dict[str, MagicMock]]:
    """Build a mock DB client that simulates the PostgREST fluent interface."""
    db = MagicMock()
    tx = MagicMock()
    db.transaction.return_value.__enter__.return_value = tx
    db.transaction.return_value.__exit__.return_value = False

    user_result = MagicMock()
    user_result.data = {"credits_balance": balance}

    extraction_result = MagicMock()
    extraction_result.data = {
        "id": "ext-123",
        "user_id": extraction_owner,
        "payment_status": extraction_status,
    }

    balance_update_result = MagicMock()
    balance_update_result.data = [{"id": "user-123"}] if balance_update_ok else []

    extraction_update_result = MagicMock()
    extraction_update_result.data = [{"id": "ext-123"}] if extraction_update_ok else []

    users_update_mock = MagicMock()

    def update_side(data: dict[str, Any]) -> MagicMock:
        query = MagicMock()
        query.eq.return_value = query
        query.execute.return_value = balance_update_result
        return query

    users_update_mock.side_effect = update_side

    users_table = MagicMock()
    users_select = MagicMock()
    users_select.eq.return_value = users_select
    users_select.for_update.return_value = users_select
    users_select.single.return_value = users_select
    users_select.execute.return_value = user_result
    users_table.select.return_value = users_select
    users_table.update = users_update_mock

    def table_side_effect(table_name: str) -> MagicMock:
        if table_name == "users":
            return users_table

        table = MagicMock()

        if table_name == "extractions":
            ext_select = MagicMock()
            ext_select.eq.return_value = ext_select
            ext_select.for_update.return_value = ext_select
            ext_select.maybe_single.return_value = ext_select
            ext_select.execute.return_value = extraction_result

            ext_update = MagicMock()
            ext_update.eq.return_value = ext_update
            if extraction_update_ok:
                ext_update.execute.return_value = extraction_update_result
            else:
                ext_update.execute.side_effect = RuntimeError("DB error marking paid")

            table.select.return_value = ext_select
            table.update.return_value = ext_update
            return table

        if table_name == "credit_transactions":
            insert_mock = MagicMock()
            if ledger_insert_ok:
                insert_mock.execute.return_value = MagicMock()
            else:
                insert_mock.execute.side_effect = RuntimeError(
                    "DB error writing ledger"
                )
            table.insert.return_value = insert_mock
            return table

        return table

    db.table.side_effect = table_side_effect
    tx.table.side_effect = table_side_effect
    return db, {
        "users_update": users_update_mock,
        "transaction": db.transaction.return_value,
    }


class TestUseCreditCompensatingTransaction:
    """Tests for use_credit transaction behavior."""

    @pytest.mark.asyncio
    async def test_use_credit_success(self) -> None:
        """Happy path: use_credit deducts balance and marks extraction paid."""
        db, mocks = _make_mock_db(balance=3)
        svc = CreditService()
        with patch.object(svc, "_get_db", return_value=db):
            result = await svc.use_credit(user_id="user-123", extraction_id="ext-123")
        assert result["new_balance"] == 2
        assert result["extraction_id"] == "ext-123"
        assert mocks["users_update"].call_count == 1
        assert mocks["transaction"].__enter__.called

    @pytest.mark.asyncio
    async def test_use_credit_raises_on_extraction_update_failure(self) -> None:
        """A failed extraction update aborts the transaction and surfaces the error."""
        db, mocks = _make_mock_db(balance=3, extraction_update_ok=False)
        svc = CreditService()
        with patch.object(svc, "_get_db", return_value=db):
            with pytest.raises(RuntimeError, match="DB error marking paid"):
                await svc.use_credit(user_id="user-123", extraction_id="ext-123")

        assert mocks["users_update"].call_count == 1
        assert mocks["transaction"].__enter__.called

    @pytest.mark.asyncio
    async def test_use_credit_raises_on_ledger_insert_failure(self) -> None:
        """A failed ledger insert aborts the transaction and surfaces the error."""
        db, mocks = _make_mock_db(balance=3, ledger_insert_ok=False)
        svc = CreditService()
        with patch.object(svc, "_get_db", return_value=db):
            with pytest.raises(RuntimeError, match="DB error writing ledger"):
                await svc.use_credit(user_id="user-123", extraction_id="ext-123")

        assert mocks["users_update"].call_count == 1
        assert mocks["transaction"].__enter__.called


class TestAddCreditsCompensatingTransaction:
    """Tests for add_credits transaction behavior."""

    @pytest.mark.asyncio
    async def test_add_credits_success(self) -> None:
        """Happy path: add_credits increments balance and writes ledger."""
        db, mocks = _make_mock_db(balance=2)
        svc = CreditService()
        with patch.object(svc, "_get_db", return_value=db):
            result = await svc.add_credits(
                user_id="user-123",
                amount=5,
                payment_id=None,
                description="Test purchase",
            )
        assert result["new_balance"] == 7
        assert result["amount"] == 5
        assert mocks["users_update"].call_count == 1

    @pytest.mark.asyncio
    async def test_add_credits_raises_on_ledger_insert_failure(self) -> None:
        """A failed ledger insert aborts the transaction and surfaces the error."""
        db, mocks = _make_mock_db(balance=2, ledger_insert_ok=False)
        svc = CreditService()
        with patch.object(svc, "_get_db", return_value=db):
            with pytest.raises(RuntimeError, match="DB error writing ledger"):
                await svc.add_credits(
                    user_id="user-123",
                    amount=5,
                    payment_id=None,
                    description="Test purchase",
                )

        assert mocks["users_update"].call_count == 1

    @pytest.mark.asyncio
    async def test_add_credits_success_only_one_users_update(self) -> None:
        """Happy path: users.update is called exactly once."""
        db, mocks = _make_mock_db(balance=2)
        svc = CreditService()
        with patch.object(svc, "_get_db", return_value=db):
            await svc.add_credits(
                user_id="user-123",
                amount=5,
                payment_id=None,
                description="Test purchase",
            )
        assert mocks["users_update"].call_count == 1

    @pytest.mark.asyncio
    async def test_add_credits_rejects_zero_amount(self) -> None:
        """Reject non-positive credit amounts."""
        svc = CreditService()
        with pytest.raises(ValueError, match="positive"):
            await svc.add_credits(
                user_id="user-123",
                amount=0,
                payment_id=None,
                description="test",
            )
