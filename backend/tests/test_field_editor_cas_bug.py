"""Test for Bug #3: Field editor red_flags update lacks CAS protection.

The extracted_data update uses CAS (compare-and-swap) on updated_at,
but the subsequent red_flags update does not, allowing a concurrent
edit to leave red_flags inconsistent with extracted_data.
"""

from unittest.mock import MagicMock, patch

from app.services.field_editor import FieldEditorService


class TestRedFlagsCASProtection:
    """Bug #3: red_flags update should use CAS or be combined with extracted_data update."""

    @patch("app.services.field_editor.detect_red_flags", return_value=[])
    @patch("app.services.field_editor.NeonClientManager.get_service_client")
    def test_red_flags_update_uses_updated_at_guard(
        self, mock_get_client: MagicMock, mock_detect: MagicMock
    ):
        """The red_flags update should include updated_at guard to prevent stale writes."""
        mock_db = MagicMock()

        # Simulate fetched record
        record = {
            "id": "ext-001",
            "extracted_data": {
                "landlord_legal_name": {
                    "value": "ABC Corp",
                    "confidence": 0.95,
                    "source_text": "test",
                },
            },
            "red_flags": [],
            "updated_at": "2026-01-01T00:00:00+00:00",
        }

        mock_execute = MagicMock()
        mock_execute.data = record
        (
            mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
        ) = mock_execute

        # CAS update succeeds (returns data)
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "ext-001"}]
        )
        # Red flags update
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
            MagicMock()
        )
        # Audit insert
        mock_db.table.return_value.insert.return_value.execute.return_value = (
            MagicMock()
        )
        # transaction(): yield the same mock so tx.table(...) delegates here.
        mock_db.transaction.return_value.__enter__.return_value = mock_db
        mock_db.transaction.return_value.__exit__.return_value = False

        mock_get_client.return_value = mock_db

        FieldEditorService.edit_field(
            extraction_id="ext-001",
            field_name="landlord_legal_name",
            new_value="New Corp",
            user_id="user-001",
        )

        # Get all update calls
        update_calls = mock_db.table.return_value.update.call_args_list

        # The second update (red_flags) should include red_flags in same
        # CAS-protected call, OR have its own updated_at guard.
        # Find the call that updates red_flags:
        red_flags_update_found = False
        for update_call in update_calls:
            args, kwargs = update_call
            update_data = args[0] if args else {}
            if "red_flags" in update_data:
                red_flags_update_found = True
                # The red_flags should be in the SAME update as extracted_data
                # (combined into one CAS-protected call)
                assert "extracted_data" in update_data, (
                    "Bug #3: red_flags update is separate from extracted_data update — "
                    "should be combined into one CAS-protected call to prevent "
                    "inconsistency from concurrent edits"
                )

        assert (
            red_flags_update_found
        ), "red_flags update was not found in any update call"
