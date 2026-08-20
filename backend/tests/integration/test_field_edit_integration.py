"""Integration tests for field editing with red flag re-evaluation.

BUG #2: FieldEditorService.edit_field does a read-modify-write on the
extracted_data JSONB with no CAS protection. Concurrent edits to different
fields silently overwrite each other.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.services.field_editor import FieldEditorService
from tests.integration.conftest import build_extraction

DB_PATCH = "app.services.field_editor.NeonClientManager.get_service_client"
RED_FLAG_PATCH = "app.services.field_editor.detect_red_flags"


def _make_field_editor_db(extraction, inserts=None, updates=None, cas_fail=False):
    """Build a mock DB that handles select/update/insert for field editing."""
    if inserts is None:
        inserts = []
    if updates is None:
        updates = []

    mock_db = MagicMock()

    def route_table(table_name):
        t = MagicMock()

        if table_name == "extractions":
            # SELECT
            select_chain = MagicMock()
            select_chain.eq.return_value = select_chain
            select_chain.is_.return_value = select_chain
            select_chain.single.return_value = select_chain
            select_chain.execute.return_value = MagicMock(data=extraction)
            t.select.return_value = select_chain

            # UPDATE (supports CAS via chained .eq calls)
            def capture_update(data):
                updates.append(data)
                chain = MagicMock()
                chain.eq.return_value = chain
                if cas_fail and "extracted_data" in data:
                    chain.execute.return_value = MagicMock(data=[])
                else:
                    chain.execute.return_value = MagicMock(data=[data])
                return chain

            t.update = capture_update

        elif table_name == "extraction_edits":

            def capture_insert(data):
                inserts.append(data)
                chain = MagicMock()
                chain.execute.return_value = MagicMock(data=[data])
                return chain

            t.insert = capture_insert

        return t

    mock_db.table = route_table
    # transaction(): yield the same mock so tx.table(...) routes through the
    # same extractions/extraction_edits dispatcher used outside the transaction.
    mock_db.transaction.return_value.__enter__.return_value = mock_db
    mock_db.transaction.return_value.__exit__.return_value = False
    return mock_db


class TestFieldEditAuditTrail:
    def test_edit_creates_audit_row_and_updates_data(self):
        """Edit a field -> verify extracted_data updated AND audit row inserted."""
        extraction = build_extraction()
        inserts: list[dict] = []
        updates: list[dict] = []
        mock_db = _make_field_editor_db(extraction, inserts, updates)

        with (
            patch(DB_PATCH, return_value=mock_db),
            patch(RED_FLAG_PATCH, return_value=[]),
        ):
            FieldEditorService.edit_field(
                extraction_id=extraction["id"],
                field_name="base_rent_annual",
                new_value=150000,
                user_id=extraction["user_id"],
            )

        # Verify extracted_data was updated
        assert len(updates) >= 1
        updated_data = updates[0].get("extracted_data", {})
        assert updated_data["base_rent_annual"]["value"] == 150000

        # Verify audit trail was created
        assert len(inserts) == 1
        audit = inserts[0]
        assert audit["field_name"] == "base_rent_annual"
        assert json.loads(audit["original_value"]) == 120000
        assert json.loads(audit["edited_value"]) == 150000

    def test_edit_field_not_in_extracted_data_creates_nested_structure(self):
        """Editing a field not in extracted_data initializes the nested format."""
        extraction = build_extraction()
        updates: list[dict] = []
        mock_db = _make_field_editor_db(extraction, updates=updates)

        with (
            patch(DB_PATCH, return_value=mock_db),
            patch(RED_FLAG_PATCH, return_value=[]),
        ):
            FieldEditorService.edit_field(
                extraction_id=extraction["id"],
                field_name="cam_cap_percentage",
                new_value=5.0,
                user_id=extraction["user_id"],
            )

        updated_data = updates[0]["extracted_data"]
        new_field = updated_data["cam_cap_percentage"]
        assert new_field["value"] == 5.0
        assert new_field["confidence"] is None
        assert new_field["source_text"] is None

    def test_edit_with_null_value_sets_null_not_removes(self):
        """Editing a field to None/null should set the value to null."""
        extraction = build_extraction()
        updates: list[dict] = []
        mock_db = _make_field_editor_db(extraction, updates=updates)

        with (
            patch(DB_PATCH, return_value=mock_db),
            patch(RED_FLAG_PATCH, return_value=[]),
        ):
            FieldEditorService.edit_field(
                extraction_id=extraction["id"],
                field_name="base_rent_annual",
                new_value=None,
                user_id=extraction["user_id"],
            )

        updated_data = updates[0]["extracted_data"]
        assert "base_rent_annual" in updated_data
        assert updated_data["base_rent_annual"]["value"] is None


class TestConcurrentFieldEdits:
    """BUG #2 FIXED: CAS on field editing detects concurrent edits."""

    def test_concurrent_edits_to_different_fields_raises_conflict(self):
        """Two edits to different fields: the second one fails with
        ConflictError because the CAS guard detects updated_at changed.
        """
        extraction_id = build_extraction()["id"]
        user_id = build_extraction()["user_id"]

        # Edit 1: Change landlord_legal_name — succeeds
        mock_db_1 = _make_field_editor_db(build_extraction())

        with (
            patch(DB_PATCH, return_value=mock_db_1),
            patch(RED_FLAG_PATCH, return_value=[]),
        ):
            FieldEditorService.edit_field(
                extraction_id=extraction_id,
                field_name="landlord_legal_name",
                new_value="New Landlord LLC",
                user_id=user_id,
            )

        # Edit 2: reads ORIGINAL data (stale updated_at) — CAS fails
        mock_db_2 = _make_field_editor_db(build_extraction(), cas_fail=True)

        with (
            patch(DB_PATCH, return_value=mock_db_2),
            patch(RED_FLAG_PATCH, return_value=[]),
        ):
            with pytest.raises(ConflictError, match="modified concurrently"):
                FieldEditorService.edit_field(
                    extraction_id=extraction_id,
                    field_name="tenant_legal_name",
                    new_value="New Tenant Corp",
                    user_id=user_id,
                )


class TestEditHistoryJsonRoundtrip:
    def test_all_value_types_roundtrip(self):
        """Verify json.dumps/loads works for string, number, null, bool values."""
        test_cases = [
            ("ACME Corp", "ACME Corp"),
            (120000, 120000),
            (None, None),
            (True, True),
            (12.5, 12.5),
        ]

        for original, expected in test_cases:
            serialized = json.dumps(original)
            deserialized = json.loads(serialized)
            assert deserialized == expected
