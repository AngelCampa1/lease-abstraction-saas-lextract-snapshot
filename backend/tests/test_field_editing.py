"""Tests for field editing endpoints and FieldEditorService.

Covers validation, happy-path edits, red flag re-evaluation,
auth guards, edit history retrieval, multiple edits, and revert scenarios.
"""

import json
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from app.api.v1.extractions import router
from app.models.user import AnonymousSession, User

USER_UUID = "00000000-0000-4000-a000-000000000001"
OTHER_UUID = "00000000-0000-4000-a000-000000000099"


# -- Fixtures --


@pytest.fixture
def test_app():
    """Create a FastAPI test client with the extractions router."""
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def client(test_app):
    return TestClient(test_app)


@pytest.fixture
def mock_auth_user():
    """Mock authenticated user."""
    return User(
        id=USER_UUID,
        email="test@example.com",
        full_name="Test User",
        company=None,
        role="user",
        credits_balance=10,
        stripe_customer_id=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
def mock_anon_session():
    """Mock anonymous session."""
    return AnonymousSession(
        id="00000000-0000-4000-a000-000000000002",
        session_token="anon-token-abc",
        linked_user_id=None,
        expires_at=datetime(2099, 1, 1, tzinfo=UTC),
        created_at=datetime.now(UTC),
    )


@pytest.fixture
def paid_extraction_record():
    """A fully paid extraction DB record with structured extracted_data."""
    return {
        "id": "00000000-0000-4000-a000-000000000010",
        "user_id": USER_UUID,
        "anonymous_session_id": None,
        "payment_status": "paid",
        "status": "completed",
        "deleted_at": None,
        "extracted_data": {
            "landlord_legal_name": {
                "value": "ABC Corp",
                "confidence": 0.95,
                "source_text": "Landlord: ABC Corp",
            },
            "tenant_legal_name": {
                "value": "Acme Inc",
                "confidence": 0.92,
                "source_text": "Tenant: Acme Inc",
            },
            "base_rent_annual": {
                "value": 120000,
                "confidence": 0.88,
                "source_text": "Annual rent: $120,000",
            },
        },
        "confidence_scores": {},
        "red_flags": [
            {"field": "cam_cap_percentage", "severity": "HIGH", "message": "No CAM cap"}
        ],
        "document_filename": "lease.pdf",
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }


def _auth_override(user):
    """Return a dependency override for get_optional_user."""

    async def override():
        return user

    return override


def _build_endpoint_mock_db(record):
    """Build a mock Supabase client for endpoint tests.

    Mocks the chain: table().select().eq().is_().single().execute().data
    Used by _fetch_extraction helper.
    Also mocks update chain: table().update().eq().execute()
    And insert chain: table().insert().execute()
    And select chain for edit history: table().select().eq().order().execute()
    """
    mock_db = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = record

    # _fetch_extraction chain: table().select("*").eq().is_().single().execute()
    (
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
    ) = mock_execute

    # update chain: table().update().eq().execute()
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
        MagicMock()
    )

    # insert chain: table().insert().execute()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()

    # transaction(): yield the same mock so tx.table(...) delegates to the
    # table builder above and existing insert/update assertions still hold.
    mock_db.transaction.return_value.__enter__.return_value = mock_db
    mock_db.transaction.return_value.__exit__.return_value = False

    # CAS update under transaction uses .eq("id").eq("updated_at") (double eq);
    # return a truthy row so the conflict guard does not trip in happy paths.
    mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"id": "updated"}]
    )

    # select().eq().order().limit().offset().execute() for edit history
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = MagicMock(
        data=[]
    )
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        count=0
    )

    return mock_db


class TestFieldEditValidation:
    """PATCH /{extraction_id}/fields — validation tests."""

    def test_invalid_field_name_returns_400(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(paid_extraction_record)

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            response = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "nonexistent_field", "value": "test"},
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid field name" in response.json()["detail"]
        test_app.dependency_overrides.clear()


class TestFieldEditHappyPath:
    """PATCH /{extraction_id}/fields — successful edits."""

    def test_edit_updates_jsonb_and_creates_audit_row(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(paid_extraction_record)

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            response = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "New Landlord LLC"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["extraction_id"] == "00000000-0000-4000-a000-000000000010"
        assert data["field_name"] == "landlord_legal_name"
        assert data["original_value"] == "ABC Corp"
        assert data["edited_value"] == "New Landlord LLC"
        assert isinstance(data["red_flags"], list)

        # Verify update was called on extractions table
        mock_db.table.return_value.update.assert_called()
        # Verify insert was called for audit trail
        mock_db.table.return_value.insert.assert_called()
        test_app.dependency_overrides.clear()

    def test_red_flag_re_evaluation_after_edit(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(paid_extraction_record)
        new_flags = [
            {
                "field": "base_rent_annual",
                "severity": "MEDIUM",
                "message": "Unusually high rent",
            }
        ]

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=new_flags),
        ):
            response = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "base_rent_annual", "value": 999999},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["red_flags"]) == 1
        assert data["red_flags"][0]["field"] == "base_rent_annual"
        test_app.dependency_overrides.clear()


class TestFieldEditAuthGuards:
    """PATCH /{extraction_id}/fields — auth and access control."""

    def test_unauthenticated_returns_401(self, client):
        response = client.patch(
            "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
            json={"field_name": "landlord_legal_name", "value": "test"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_non_owner_returns_404(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        record = {**paid_extraction_record, "user_id": OTHER_UUID}
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "test"},
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()

    def test_anonymous_session_returns_403(
        self, test_app, client, mock_anon_session, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_anon_session
        )

        record = {
            **paid_extraction_record,
            "user_id": None,
            "anonymous_session_id": str(mock_anon_session.id),
        }
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "test"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "registered account" in response.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_unpaid_returns_403(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        record = {**paid_extraction_record, "payment_status": "unpaid"}
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "test"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "paid" in response.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_deleted_extraction_returns_404(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        record = {**paid_extraction_record, "deleted_at": "2026-01-15T00:00:00+00:00"}
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "test"},
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()


class TestEditHistory:
    """GET /{extraction_id}/edits — history retrieval."""

    def test_get_edits_returns_ordered_history(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        edit_rows = [
            {
                "id": "edit-002",
                "field_name": "landlord_legal_name",
                "original_value": json.dumps("New Landlord LLC"),
                "edited_value": json.dumps("Final Landlord Inc"),
                "edited_by": USER_UUID,
                "edited_at": "2026-01-03T00:00:00+00:00",
            },
            {
                "id": "edit-001",
                "field_name": "landlord_legal_name",
                "original_value": json.dumps("ABC Corp"),
                "edited_value": json.dumps("New Landlord LLC"),
                "edited_by": USER_UUID,
                "edited_at": "2026-01-02T00:00:00+00:00",
            },
        ]

        mock_db = _build_endpoint_mock_db(paid_extraction_record)
        # Override the select().eq().order().limit().offset().execute() for edit history
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = MagicMock(
            data=edit_rows
        )
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            count=2
        )

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
        ):
            response = client.get(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/edits"
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["extraction_id"] == "00000000-0000-4000-a000-000000000010"
        assert len(data["edits"]) == 2
        assert data["edits"][0]["id"] == "edit-002"
        assert data["edits"][1]["id"] == "edit-001"
        test_app.dependency_overrides.clear()

    def test_get_edits_empty_history(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(paid_extraction_record)
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            count=0
        )

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
        ):
            response = client.get(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/edits"
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["edits"] == []
        test_app.dependency_overrides.clear()

    def test_get_edits_unauthenticated_returns_401(self, client):
        response = client.get(
            "/api/v1/extractions/00000000-0000-4000-a000-000000000010/edits"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_edits_non_owner_returns_404(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        record = {**paid_extraction_record, "user_id": OTHER_UUID}
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.get(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/edits"
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()


class TestMultipleEditsAndRevert:
    """Tests for multiple edits to the same field and reverting."""

    def test_multiple_edits_create_multiple_history_rows(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(paid_extraction_record)

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            # First edit
            resp1 = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "Edit One"},
            )
            assert resp1.status_code == status.HTTP_200_OK

            # Second edit — update the record to reflect the first edit's result
            paid_extraction_record["extracted_data"]["landlord_legal_name"][
                "value"
            ] = "Edit One"
            resp2 = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "Edit Two"},
            )
            assert resp2.status_code == status.HTTP_200_OK

        # Both inserts should have been called
        assert mock_db.table.return_value.insert.call_count >= 2
        test_app.dependency_overrides.clear()

    def test_revert_to_original_value_creates_edit_record(
        self, test_app, client, mock_auth_user, paid_extraction_record
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(paid_extraction_record)

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            # Edit to new value
            resp1 = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "Changed Name"},
            )
            assert resp1.status_code == status.HTTP_200_OK
            assert resp1.json()["original_value"] == "ABC Corp"

            # Revert to original
            paid_extraction_record["extracted_data"]["landlord_legal_name"][
                "value"
            ] = "Changed Name"
            resp2 = client.patch(
                "/api/v1/extractions/00000000-0000-4000-a000-000000000010/fields",
                json={"field_name": "landlord_legal_name", "value": "ABC Corp"},
            )
            assert resp2.status_code == status.HTTP_200_OK
            assert resp2.json()["original_value"] == "Changed Name"
            assert resp2.json()["edited_value"] == "ABC Corp"

        assert mock_db.table.return_value.insert.call_count >= 2
        test_app.dependency_overrides.clear()


class TestFieldEditorService:
    """Direct tests for FieldEditorService methods."""

    def test_validate_field_name_valid(self):
        from app.services.field_editor import FieldEditorService

        # Should not raise
        FieldEditorService.validate_field_name("landlord_legal_name")

    def test_validate_field_name_invalid(self):
        from app.services.field_editor import FieldEditorService

        with pytest.raises(ValueError, match="Invalid field name"):
            FieldEditorService.validate_field_name("nonexistent_field_xyz")

    def test_validate_field_name_error_uses_dynamic_field_count(self):
        """Error message reports the actual loaded field count, never a stale literal."""
        from app.services.field_editor import (
            VALID_FIELD_NAMES,
            FieldEditorService,
        )

        with pytest.raises(ValueError) as exc_info:
            FieldEditorService.validate_field_name("nonexistent_field_xyz")

        message = str(exc_info.value)
        assert f"Must be one of the {len(VALID_FIELD_NAMES)} " in message

    def test_validate_all_schema_fields(self):
        from app.services.field_editor import VALID_FIELD_NAMES

        # Spot-check a few known fields
        assert "landlord_legal_name" in VALID_FIELD_NAMES
        assert "tenant_legal_name" in VALID_FIELD_NAMES
        assert "base_rent_annual" in VALID_FIELD_NAMES
        assert "cam_estimate_method" in VALID_FIELD_NAMES
        assert len(VALID_FIELD_NAMES) >= 90  # Schema has ~99 fields

    def test_edit_field_with_missing_field_in_extracted_data(self):
        """Edit a field that exists in schema but not yet in extracted_data."""
        from app.services.field_editor import FieldEditorService

        mock_db = MagicMock()
        # Simulate extracted_data without the target field
        record = {
            "id": "00000000-0000-4000-a000-000000000010",
            "extracted_data": {
                "landlord_legal_name": {
                    "value": "ABC Corp",
                    "confidence": 0.95,
                    "source_text": "test",
                },
            },
            "red_flags": [],
        }

        mock_execute = MagicMock()
        mock_execute.data = record
        (
            mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
        ) = mock_execute
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
            MagicMock()
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = (
            MagicMock()
        )

        with (
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            result = FieldEditorService.edit_field(
                extraction_id="00000000-0000-4000-a000-000000000010",
                field_name="tenant_legal_name",
                new_value="New Tenant",
                user_id=USER_UUID,
            )

        assert result["original_value"] is None
        assert result["edited_value"] == "New Tenant"

    def test_edit_field_normalizes_primitive_existing_value(self):
        """Primitive extracted_data values are normalized before editing."""
        from app.services.field_editor import FieldEditorService

        mock_db = MagicMock()
        record = {
            "extracted_data": {"tenant_legal_name": "Original Tenant"},
            "updated_at": "2026-01-02T00:00:00+00:00",
        }
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=record
        )
        update_execute = (
            mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute
        )
        update_execute.return_value = MagicMock(data=[{"id": "updated"}])
        mock_db.table.return_value.insert.return_value.execute.return_value = (
            MagicMock()
        )
        mock_db.transaction.return_value.__enter__.return_value = mock_db
        mock_db.transaction.return_value.__exit__.return_value = False

        with (
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
        ):
            result = FieldEditorService.edit_field(
                extraction_id="00000000-0000-4000-a000-000000000010",
                field_name="tenant_legal_name",
                new_value="Edited Tenant",
                user_id=USER_UUID,
            )

        update_payload = mock_db.table.return_value.update.call_args[0][0]
        assert result["original_value"] == "Original Tenant"
        assert update_payload["extracted_data"]["tenant_legal_name"] == {
            "value": "Edited Tenant",
            "confidence": None,
            "source_text": None,
        }

    def test_edit_field_flattens_extracted_data_for_real_red_flag_detection(self):
        """Red flag refresh sees edited field values, not nested field metadata."""
        from app.services.field_editor import FieldEditorService

        safe_values = {
            "management_fee_cap": 10.0,
            "audit_rights": True,
            "cam_cap_percentage": 5.0,
            "cap_cumulative_vs_annual": "annual",
            "lease_structure_type": "Full Service Gross",
            "gross_up_percentage": 95.0,
            "cam_exclusions": ["capital improvements", "leasing commissions"],
            "monetary_cure_period": 30,
            "holdover_rate": 150.0,
            "has_termination_option": True,
            "lease_term_months": 60,
            "restoration_requirement": False,
            "tenant_work_description": "Standard office buildout",
            "has_renewal_option": True,
            "recapture_right": False,
            "base_year_gross_up": True,
            "base_year": "2024",
            "reconciliation_frequency": "annual",
            "cam_audit_deadline_days": 120,
            "force_majeure_clause": True,
            "auto_renewal": False,
            "auto_renewal_terms": None,
            "casualty_termination_right": (
                "Either party may terminate after substantial damage"
            ),
            "relocation_right": False,
            "has_purchase_option": False,
        }
        extracted_data = {
            field_name: {
                "value": value,
                "confidence": 0.9,
                "source_text": field_name,
            }
            for field_name, value in safe_values.items()
        }
        record = {
            "extracted_data": extracted_data,
            "updated_at": "2026-01-02T00:00:00+00:00",
        }
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=record
        )
        update_execute = (
            mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute
        )
        update_execute.return_value = MagicMock(data=[{"id": "updated"}])
        mock_db.table.return_value.insert.return_value.execute.return_value = (
            MagicMock()
        )
        mock_db.transaction.return_value.__enter__.return_value = mock_db
        mock_db.transaction.return_value.__exit__.return_value = False

        with patch(
            "app.services.field_editor.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result = FieldEditorService.edit_field(
                extraction_id="00000000-0000-4000-a000-000000000010",
                field_name="management_fee_cap",
                new_value=18.0,
                user_id=USER_UUID,
            )

        update_payload = mock_db.table.return_value.update.call_args[0][0]
        red_flags = update_payload["red_flags"]
        assert result["red_flags"] == red_flags
        assert [flag["rule_id"] for flag in red_flags] == ["RF-001"]
        assert red_flags[0]["triggered_value"] == "18.0%"

    def test_edit_field_raises_conflict_when_cas_update_returns_no_rows(self):
        """A stale updated_at CAS update returns a conflict."""
        from app.core.exceptions import ConflictError
        from app.services.field_editor import FieldEditorService

        mock_db = MagicMock()
        record = {
            "extracted_data": {
                "tenant_legal_name": {
                    "value": "Original Tenant",
                    "confidence": 0.9,
                    "source_text": "Tenant",
                }
            },
            "updated_at": "2026-01-02T00:00:00+00:00",
        }
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=record
        )
        update_execute = (
            mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute
        )
        update_execute.return_value = MagicMock(data=[])
        mock_db.transaction.return_value.__enter__.return_value = mock_db
        mock_db.transaction.return_value.__exit__.return_value = False

        with (
            patch(
                "app.services.field_editor.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.services.field_editor.detect_red_flags", return_value=[]),
            pytest.raises(ConflictError, match="modified concurrently"),
        ):
            FieldEditorService.edit_field(
                extraction_id="00000000-0000-4000-a000-000000000010",
                field_name="tenant_legal_name",
                new_value="Edited Tenant",
                user_id=USER_UUID,
            )

    def test_find_field_schema_returns_nonexistent_when_not_under_repo(self):
        """Schema search returns the fallback path when no docs directory exists."""
        import app.services.field_editor as field_editor

        with patch.object(field_editor, "__file__", "C:/field_editor.py"):
            assert str(field_editor._find_field_schema()).endswith("nonexistent")

    def test_get_edit_history_handles_invalid_json(self):
        """Bug #43: Invalid JSON in edit history doesn't crash."""
        from app.services.field_editor import FieldEditorService

        mock_db = MagicMock()
        edit_rows = [
            {
                "id": "edit-001",
                "field_name": "landlord_legal_name",
                "original_value": "not valid json {{{",
                "edited_value": json.dumps("New Value"),
                "edited_by": USER_UUID,
                "edited_at": "2026-01-02T00:00:00+00:00",
            },
            {
                "id": "edit-002",
                "field_name": "tenant_legal_name",
                "original_value": json.dumps("Old Tenant"),
                "edited_value": "also invalid >>>",
                "edited_by": USER_UUID,
                "edited_at": "2026-01-03T00:00:00+00:00",
            },
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = MagicMock(
            data=edit_rows
        )
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            count=2
        )

        with patch(
            "app.services.field_editor.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result, total = FieldEditorService.get_edit_history(
                "00000000-0000-4000-a000-000000000010"
            )

        assert len(result) == 2
        assert total == 2
        # Invalid JSON should fall back to raw string
        assert result[0]["original_value"] == "not valid json {{{"
        assert result[0]["edited_value"] == "New Value"
        assert result[1]["original_value"] == "Old Tenant"
        assert result[1]["edited_value"] == "also invalid >>>"

    def test_get_edit_history_returns_native_jsonb_values(self):
        """Direct Postgres JSONB values are returned unchanged."""
        from app.services.field_editor import FieldEditorService

        mock_db = MagicMock()
        edit_rows = [
            {
                "id": "edit-001",
                "field_name": "audit_rights",
                "original_value": False,
                "edited_value": {"value": "False [E2E edit]"},
                "edited_by": USER_UUID,
                "edited_at": "2026-01-02T00:00:00+00:00",
            },
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = MagicMock(
            data=edit_rows
        )
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            count=1
        )

        with patch(
            "app.services.field_editor.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result, total = FieldEditorService.get_edit_history(
                "00000000-0000-4000-a000-000000000010"
            )

        assert total == 1
        assert result[0]["original_value"] is False
        assert result[0]["edited_value"] == {"value": "False [E2E edit]"}

    def test_get_edit_history_returns_response_model_safe_scalar_types(self):
        """Direct Postgres UUID/timestamp scalars are returned as strings."""
        from app.models.results import EditHistoryItem
        from app.services.field_editor import FieldEditorService

        edit_id = UUID("11111111-1111-4111-8111-111111111111")
        editor_id = UUID("00000000-0000-4000-a000-000000000001")
        edited_at = datetime(2026, 1, 2, tzinfo=UTC)
        mock_db = MagicMock()
        edit_rows = [
            {
                "id": edit_id,
                "field_name": "audit_rights",
                "original_value": False,
                "edited_value": "False [E2E edit]",
                "edited_by": editor_id,
                "edited_at": edited_at,
            },
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = MagicMock(
            data=edit_rows
        )
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            count=1
        )

        with patch(
            "app.services.field_editor.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result, _ = FieldEditorService.get_edit_history(
                "00000000-0000-4000-a000-000000000010"
            )

        assert result[0]["id"] == str(edit_id)
        assert result[0]["edited_by"] == str(editor_id)
        assert result[0]["edited_at"] == edited_at.isoformat()
        EditHistoryItem(**result[0])

    def test_safe_json_loads_returns_native_jsonb_values(self):
        """Direct Postgres JSONB values are already decoded."""
        from app.services.field_editor import _safe_json_loads

        assert _safe_json_loads(False) is False
        assert _safe_json_loads({"nested": "value"}) == {"nested": "value"}
        assert _safe_json_loads(["a", "b"]) == ["a", "b"]

    def test_get_edit_history_returns_parsed_values(self):
        """Edit history items have JSON-parsed original/edited values."""
        from app.services.field_editor import FieldEditorService

        mock_db = MagicMock()
        edit_rows = [
            {
                "id": "edit-001",
                "field_name": "landlord_legal_name",
                "original_value": json.dumps("Old Value"),
                "edited_value": json.dumps("New Value"),
                "edited_by": USER_UUID,
                "edited_at": "2026-01-02T00:00:00+00:00",
            },
        ]
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = MagicMock(
            data=edit_rows
        )
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            count=1
        )

        with patch(
            "app.services.field_editor.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            result, total = FieldEditorService.get_edit_history(
                "00000000-0000-4000-a000-000000000010"
            )

        assert len(result) == 1
        assert total == 1
        assert result[0]["original_value"] == "Old Value"
        assert result[0]["edited_value"] == "New Value"
