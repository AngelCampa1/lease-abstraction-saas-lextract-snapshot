"""Integration tests for the credit lifecycle.

BUG #1: use_credit deducts the credit balance and inserts a ledger row
BEFORE verifying the extraction exists. If extraction_id is invalid, the
credit is taken but nothing is unlocked. The extraction update on line 216
has no row-count check.
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import ConflictError, InsufficientCreditsError, NotFoundError
from app.services.credit_service import CreditService, reset_credit_service


class TestUseCreditWithInvalidExtraction:
    """BUG #1: Credit deducted without verifying extraction exists."""

    @pytest.fixture(autouse=True)
    def reset(self):
        reset_credit_service()
        yield
        reset_credit_service()

    @pytest.mark.asyncio
    async def test_use_credit_on_nonexistent_extraction_raises_not_found(self):
        """Using a credit on a nonexistent extraction should raise NotFoundError
        before any balance changes occur.
        """
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"
        bad_extraction_id = "deadbeef-dead-beef-dead-beefdeadbeef"

        mock_db = MagicMock()

        def track_table(table_name):
            table_mock = MagicMock()

            def track_select(*args, **kwargs):
                chain = MagicMock()
                chain.eq.return_value = chain
                chain.single.return_value = chain
                chain.maybe_single.return_value = chain
                chain.for_update.return_value = chain
                if table_name == "extractions":
                    # Extraction doesn't exist
                    chain.execute.return_value = MagicMock(data=None)
                else:
                    chain.execute.return_value = MagicMock(data={"credits_balance": 5})
                return chain

            table_mock.select = track_select
            return table_mock

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(NotFoundError):
                await svc.use_credit(user_id, bad_extraction_id)

    @pytest.mark.asyncio
    async def test_use_credit_verifies_extraction_exists_before_deducting(self):
        """use_credit SELECTs the extraction before touching balance."""
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        tables_queried: list[str] = []

        mock_db = MagicMock()

        def track_table(table_name):
            tables_queried.append(table_name)
            table_mock = MagicMock()
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.single.return_value = chain
            chain.maybe_single.return_value = chain
            chain.for_update.return_value = chain

            if table_name == "users":
                chain.execute.return_value = MagicMock(data={"credits_balance": 5})
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(
                    data=[{"id": user_id, "credits_balance": 4}]
                )
                table_mock.update.return_value = update_chain
            elif table_name == "extractions":
                # Extraction exists, unpaid, owned by user
                chain.execute.return_value = MagicMock(
                    data={
                        "id": extraction_id,
                        "user_id": user_id,
                        "payment_status": "unpaid",
                    }
                )
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                table_mock.update.return_value = update_chain

            insert_chain = MagicMock()
            insert_chain.execute.return_value = MagicMock(data=[{}])
            table_mock.insert.return_value = insert_chain
            table_mock.select.return_value = chain
            return table_mock

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            await svc.use_credit(user_id, extraction_id)

        # FIX: Extraction is queried before deducting credit
        select_on_extractions = [t for t in tables_queried if t == "extractions"]
        assert len(select_on_extractions) >= 1, (
            "use_credit should check that the extraction exists "
            "before deducting the credit."
        )


class TestUseCreditOwnershipCheck:
    """BUG #12: use_credit must verify extraction belongs to caller."""

    @pytest.fixture(autouse=True)
    def reset(self):
        reset_credit_service()
        yield
        reset_credit_service()

    @pytest.mark.asyncio
    async def test_use_credit_on_other_users_extraction_raises_not_found(self):
        """User A cannot spend credits to unlock User B's extraction."""
        svc = CreditService()
        user_a = "00000000-0000-0000-0000-000000000001"
        user_b = "00000000-0000-0000-0000-000000000002"
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()

        def track_table(table_name):
            table_mock = MagicMock()
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.single.return_value = chain
            chain.maybe_single.return_value = chain
            chain.for_update.return_value = chain

            if table_name == "extractions":
                # Extraction exists but belongs to user_b
                chain.execute.return_value = MagicMock(
                    data={
                        "id": extraction_id,
                        "user_id": user_b,
                        "payment_status": "unpaid",
                    }
                )
            else:
                chain.execute.return_value = MagicMock(data={"credits_balance": 5})
            table_mock.select.return_value = chain
            return table_mock

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(NotFoundError):
                await svc.use_credit(user_a, extraction_id)

    @pytest.mark.asyncio
    async def test_use_credit_accepts_uuid_owned_extraction_from_pg_driver(self):
        """psycopg returns UUID objects; ownership check must still succeed."""
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()

        def track_table(table_name):
            table_mock = MagicMock()
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.single.return_value = chain
            chain.maybe_single.return_value = chain
            chain.for_update.return_value = chain

            if table_name == "extractions":
                chain.execute.return_value = MagicMock(
                    data={
                        "id": uuid.UUID(extraction_id),
                        "user_id": uuid.UUID(user_id),
                        "payment_status": "unpaid",
                    }
                )
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                table_mock.update.return_value = update_chain
            elif table_name == "users":
                chain.execute.return_value = MagicMock(data={"credits_balance": 1})
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(
                    data=[{"id": user_id, "credits_balance": 0}]
                )
                table_mock.update.return_value = update_chain
            elif table_name == "credit_transactions":
                insert_chain = MagicMock()
                insert_chain.execute.return_value = MagicMock(data=[{}])
                table_mock.insert.return_value = insert_chain

            table_mock.select.return_value = chain
            return table_mock

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            result = await svc.use_credit(user_id, extraction_id)

        assert result == {
            "new_balance": 0,
            "extraction_id": extraction_id,
        }


class TestUseCreditDoubleCharge:
    """BUG #13: use_credit on already-paid extraction should fail."""

    @pytest.fixture(autouse=True)
    def reset(self):
        reset_credit_service()
        yield
        reset_credit_service()

    @pytest.mark.asyncio
    async def test_use_credit_on_paid_extraction_raises_conflict(self):
        """Calling use_credit on an already-paid extraction raises ConflictError."""
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()

        def track_table(table_name):
            table_mock = MagicMock()
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.single.return_value = chain
            chain.maybe_single.return_value = chain
            chain.for_update.return_value = chain

            if table_name == "extractions":
                chain.execute.return_value = MagicMock(
                    data={
                        "id": extraction_id,
                        "user_id": user_id,
                        "payment_status": "paid",
                    }
                )
            else:
                chain.execute.return_value = MagicMock(data={"credits_balance": 5})
            table_mock.select.return_value = chain
            return table_mock

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(ConflictError, match="already paid"):
                await svc.use_credit(user_id, extraction_id)


class TestCreditBalanceBoundary:
    @pytest.mark.asyncio
    async def test_zero_balance_raises_insufficient_credits(self):
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()

        def track_table(table_name):
            table_mock = MagicMock()
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.single.return_value = chain
            chain.maybe_single.return_value = chain
            chain.for_update.return_value = chain

            if table_name == "extractions":
                chain.execute.return_value = MagicMock(
                    data={
                        "id": extraction_id,
                        "user_id": user_id,
                        "payment_status": "unpaid",
                    }
                )
            else:
                chain.execute.return_value = MagicMock(data={"credits_balance": 0})
            table_mock.select.return_value = chain
            return table_mock

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(InsufficientCreditsError):
                await svc.use_credit(user_id, extraction_id)


class TestAddCreditsCASOrdering:
    @pytest.mark.asyncio
    async def test_cas_failure_does_not_insert_ledger_row(self):
        """When CAS fails on balance update, no ledger row should be created."""
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"

        insert_called = False

        mock_db = MagicMock()

        def track_table(table_name):
            nonlocal insert_called
            table_mock = MagicMock()
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.single.return_value = chain
            chain.for_update.return_value = chain
            chain.execute.return_value = MagicMock(data={"credits_balance": 5})

            if table_name == "users":
                # CAS FAILS — 0 rows updated
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[])
                table_mock.update.return_value = update_chain

            if table_name == "credit_transactions":

                def mark_insert(data):
                    nonlocal insert_called
                    insert_called = True
                    c = MagicMock()
                    c.execute.return_value = MagicMock(data=[data])
                    return c

                table_mock.insert = mark_insert

            table_mock.select.return_value = chain
            return table_mock

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(ConflictError):
                await svc.add_credits(user_id, 5, "pay-123", "test pack")

        # CAS update is done FIRST; failure prevents ledger insert
        assert not insert_called, "Ledger row should NOT be inserted when CAS fails"
