"""Tests for transactional audit-trail behavior in FieldEditorService.edit_field.

The service inserts the audit row and applies the extracted_data/red_flags CAS
update inside a single DB transaction. Because both statements run on one
connection, a lost CAS update (concurrent edit) rolls the audit row back
automatically — history never contains a "ghost" edit that never landed, and no
best-effort compensating delete is issued.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.services.field_editor import FieldEditorService

EXTRACTION_ID = "00000000-0000-4000-a000-000000000010"
USER_ID = "00000000-0000-4000-a000-000000000001"


def _record() -> dict[str, Any]:
    return {
        "extracted_data": {
            "landlord_legal_name": {
                "value": "ABC Corp",
                "confidence": 0.95,
                "source_text": "Landlord: ABC Corp",
            },
        },
        "updated_at": "2026-01-01T00:00:00+00:00",
    }


def _build_mock_db(*, update_data: list[dict[str, Any]] | None) -> MagicMock:
    """Build a Neon client mock whose transaction() pins insert + CAS update.

    The fetch (``select(...).single()``) runs on the bare client, outside the
    transaction; the audit insert and the CAS update run on the transaction
    proxy yielded by ``db.transaction()``.
    """
    mock_db = MagicMock()

    # _fetch — runs on the bare client, before the transaction opens.
    fetch_chain = MagicMock()
    fetch_chain.execute.return_value = MagicMock(data=_record())
    mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value = (
        fetch_chain
    )

    # Transaction proxy yielded by `with db.transaction() as tx:`.
    tx = MagicMock()
    insert_chain = tx.table.return_value.insert.return_value
    insert_chain.execute.return_value = MagicMock(data=[{"id": "audit-1"}])
    update_chain = (
        tx.table.return_value.update.return_value.eq.return_value.eq.return_value
    )
    update_chain.execute.return_value = MagicMock(
        data=update_data if update_data is not None else [{"id": EXTRACTION_ID}]
    )

    cm = MagicMock()
    cm.__enter__.return_value = tx
    cm.__exit__.return_value = False
    mock_db.transaction.return_value = cm

    # Expose the proxy/context-manager for assertions.
    mock_db.tx = tx  # type: ignore[attr-defined]
    mock_db.cm = cm  # type: ignore[attr-defined]
    return mock_db


class TestSingleTransaction:
    def test_audit_insert_and_update_run_inside_one_transaction(self) -> None:
        mock_db = _build_mock_db(update_data=[{"id": EXTRACTION_ID}])

        call_order: list[str] = []

        def insert_side_effect(payload: dict[str, Any]) -> MagicMock:
            call_order.append(f"insert:{payload.get('field_name')}")
            inner = MagicMock()
            inner.execute.return_value = MagicMock(data=[{"id": "audit-1"}])
            return inner

        def update_side_effect(payload: dict[str, Any]) -> MagicMock:
            call_order.append("update")
            inner = MagicMock()
            inner.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": EXTRACTION_ID}]
            )
            return inner

        mock_db.tx.table.return_value.insert.side_effect = insert_side_effect
        mock_db.tx.table.return_value.update.side_effect = update_side_effect

        with (
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            FieldEditorService.edit_field(
                extraction_id=EXTRACTION_ID,
                field_name="landlord_legal_name",
                new_value="New LLC",
                user_id=USER_ID,
            )

        # Exactly one transaction opened, audit insert before the CAS update.
        mock_db.transaction.assert_called_once_with()
        mock_db.cm.__enter__.assert_called_once()
        mock_db.cm.__exit__.assert_called_once()
        assert call_order == ["insert:landlord_legal_name", "update"]


class TestCasFailureRollsBackViaTransaction:
    def test_lost_cas_raises_conflict_and_issues_no_compensating_delete(self) -> None:
        mock_db = _build_mock_db(update_data=[])  # CAS lost — empty result

        with (
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            with pytest.raises(ConflictError):
                FieldEditorService.edit_field(
                    extraction_id=EXTRACTION_ID,
                    field_name="landlord_legal_name",
                    new_value="New LLC",
                    user_id=USER_ID,
                )

        # Rollback is the transaction's job: __exit__ runs with the exception
        # and NO manual compensating delete is issued on the audit table.
        mock_db.cm.__exit__.assert_called_once()
        exit_args = mock_db.cm.__exit__.call_args[0]
        assert exit_args[0] is ConflictError
        mock_db.tx.table.return_value.delete.assert_not_called()
