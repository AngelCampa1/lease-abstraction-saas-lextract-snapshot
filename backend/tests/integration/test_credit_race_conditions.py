"""Integration tests for credit service concurrency (CAS pattern).

Verifies that check-and-set (CAS) prevents double-spending and that
the ordering (CAS update BEFORE ledger insert) is correct.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.services.credit_service import CreditService, reset_credit_service


@pytest.fixture(autouse=True)
def _reset():
    reset_credit_service()
    yield
    reset_credit_service()


class TestConcurrentUseCredit:
    @pytest.mark.asyncio
    async def test_two_concurrent_uses_from_balance_1_one_fails(self):
        """Two concurrent use_credit calls with balance=1. The first succeeds
        (CAS matches), the second fails (CAS mismatch because balance changed).
        """
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"

        call_num = 0

        mock_db = MagicMock()

        def track_table(table_name):
            nonlocal call_num
            t = MagicMock()

            if table_name == "users":
                # SELECT always returns balance=1 (both reads happen "at the same time")
                select_chain = MagicMock()
                select_chain.eq.return_value = select_chain
                select_chain.single.return_value = select_chain
                select_chain.for_update.return_value = select_chain
                select_chain.execute.return_value = MagicMock(
                    data={"credits_balance": 1}
                )
                t.select.return_value = select_chain

                # UPDATE: first CAS succeeds, second fails
                def cas_update(data):
                    nonlocal call_num
                    call_num += 1
                    chain = MagicMock()
                    chain.eq.return_value = chain
                    if call_num == 1:
                        chain.execute.return_value = MagicMock(
                            data=[{"credits_balance": 0}]
                        )
                    else:
                        chain.execute.return_value = MagicMock(data=[])
                    return chain

                t.update = cas_update

            elif table_name == "credit_transactions":
                chain = MagicMock()
                chain.execute.return_value = MagicMock(data=[{}])
                t.insert.return_value = chain

            elif table_name == "extractions":
                # SELECT for ownership check
                select_chain = MagicMock()
                select_chain.eq.return_value = select_chain
                select_chain.maybe_single.return_value = select_chain
                select_chain.for_update.return_value = select_chain
                select_chain.execute.return_value = MagicMock(
                    data={"id": "ext-1", "user_id": user_id, "payment_status": "unpaid"}
                )
                t.select.return_value = select_chain
                # UPDATE for marking paid
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain

            return t

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            # First: succeeds
            result = await svc.use_credit(user_id, "ext-1")
            assert result["new_balance"] == 0

            # Second: CAS fails
            with pytest.raises(ConflictError):
                await svc.use_credit(user_id, "ext-2")

    @pytest.mark.asyncio
    async def test_three_concurrent_uses_from_balance_2_at_most_two_succeed(self):
        """Three concurrent use_credit calls with balance=2. At most 2 succeed."""
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"

        cas_results = [True, True, False]  # First two succeed, third fails
        cas_idx = 0

        mock_db = MagicMock()

        def track_table(table_name):
            nonlocal cas_idx
            t = MagicMock()

            if table_name == "users":
                select_chain = MagicMock()
                select_chain.eq.return_value = select_chain
                select_chain.single.return_value = select_chain
                select_chain.for_update.return_value = select_chain
                select_chain.execute.return_value = MagicMock(
                    data={"credits_balance": 2}
                )
                t.select.return_value = select_chain

                def cas_update(data):
                    nonlocal cas_idx
                    chain = MagicMock()
                    chain.eq.return_value = chain
                    if cas_idx < len(cas_results) and cas_results[cas_idx]:
                        chain.execute.return_value = MagicMock(
                            data=[{"credits_balance": 1}]
                        )
                    else:
                        chain.execute.return_value = MagicMock(data=[])
                    cas_idx += 1
                    return chain

                t.update = cas_update

            elif table_name == "credit_transactions":
                chain = MagicMock()
                chain.execute.return_value = MagicMock(data=[{}])
                t.insert.return_value = chain

            elif table_name == "extractions":
                # SELECT for ownership check
                select_chain = MagicMock()
                select_chain.eq.return_value = select_chain
                select_chain.maybe_single.return_value = select_chain
                select_chain.for_update.return_value = select_chain
                select_chain.execute.return_value = MagicMock(
                    data={"id": "ext-0", "user_id": user_id, "payment_status": "unpaid"}
                )
                t.select.return_value = select_chain
                # UPDATE for marking paid
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=[{}])
                t.update.return_value = update_chain

            return t

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        successes = 0
        failures = 0

        with patch.object(svc, "_get_db", return_value=mock_db):
            for i in range(3):
                try:
                    await svc.use_credit(user_id, f"ext-{i}")
                    successes += 1
                except ConflictError:
                    failures += 1

        assert successes == 2
        assert failures == 1


class TestUseCreditCASOrdering:
    @pytest.mark.asyncio
    async def test_cas_failure_does_not_insert_ledger_row(self):
        """When CAS fails on use_credit, no ledger row should be created."""
        svc = CreditService()
        user_id = "00000000-0000-0000-0000-000000000001"

        ledger_inserts = 0

        mock_db = MagicMock()

        def track_table(table_name):
            nonlocal ledger_inserts
            t = MagicMock()

            if table_name == "users":
                select_chain = MagicMock()
                select_chain.eq.return_value = select_chain
                select_chain.single.return_value = select_chain
                select_chain.for_update.return_value = select_chain
                select_chain.execute.return_value = MagicMock(
                    data={"credits_balance": 3}
                )
                t.select.return_value = select_chain

                # CAS fails
                cas_chain = MagicMock()
                cas_chain.eq.return_value = cas_chain
                cas_chain.execute.return_value = MagicMock(data=[])
                t.update.return_value = cas_chain

            elif table_name == "extractions":
                # SELECT for ownership check
                select_chain = MagicMock()
                select_chain.eq.return_value = select_chain
                select_chain.maybe_single.return_value = select_chain
                select_chain.for_update.return_value = select_chain
                select_chain.execute.return_value = MagicMock(
                    data={"id": "ext-1", "user_id": user_id, "payment_status": "unpaid"}
                )
                t.select.return_value = select_chain

            elif table_name == "credit_transactions":

                def count_insert(data):
                    nonlocal ledger_inserts
                    ledger_inserts += 1
                    chain = MagicMock()
                    chain.execute.return_value = MagicMock(data=[{}])
                    return chain

                t.insert = count_insert

            return t

        mock_db.table = track_table
        mock_db.transaction.return_value.__enter__.return_value.table = track_table

        with patch.object(svc, "_get_db", return_value=mock_db):
            with pytest.raises(ConflictError):
                await svc.use_credit(user_id, "ext-1")

        assert ledger_inserts == 0, (
            "Ledger row must NOT be inserted when CAS fails — "
            "CAS update is done BEFORE ledger insert"
        )
