"""Tests for per-field type validation on PATCH /api/v1/extractions/{id}/fields.

The schema's ``data_type`` for each field is enforced before any DB write so
malformed payloads (e.g. a number sent for a string field, an unparseable
date string, a non-bool for a checkbox field) are rejected with 422 instead
of silently corrupting the extracted_data JSONB column.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.extractions import router
from app.models.user import User
from app.services.field_editor import FieldEditorService

USER_UUID = "00000000-0000-4000-a000-000000000001"
EXTRACTION_ID = "00000000-0000-4000-a000-000000000010"


@pytest.fixture
def test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def client(test_app: FastAPI) -> TestClient:
    return TestClient(test_app)


@pytest.fixture
def auth_user() -> User:
    return User(
        id=USER_UUID,
        email="u@e.com",
        full_name="U",
        company=None,
        role="user",
        credits_balance=5,
        stripe_customer_id=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _auth_override(user: User):
    async def override():
        return user

    return override


def _paid_record() -> dict[str, Any]:
    return {
        "id": EXTRACTION_ID,
        "user_id": USER_UUID,
        "anonymous_session_id": None,
        "payment_status": "paid",
        "status": "complete",
        "deleted_at": None,
        "extracted_data": {},
        "confidence_scores": {},
        "red_flags": [],
        "document_filename": "lease.pdf",
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }


def _build_mock_db(record: dict[str, Any]) -> MagicMock:
    mock_db = MagicMock()
    mock_exec = MagicMock(data=record)
    (
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
    ) = mock_exec
    update_chain = (
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value
    )
    update_chain.execute.return_value = MagicMock(data=[{"id": EXTRACTION_ID}])
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "audit-1"}]
    )
    return mock_db


def _patch(test_app: FastAPI, client: TestClient, user: User, field: str, value: Any):
    """Send a PATCH /fields call with a single field/value."""
    from app.core.dependencies import get_optional_user

    test_app.dependency_overrides[get_optional_user] = _auth_override(user)
    mock_db = _build_mock_db(_paid_record())
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
        resp = client.patch(
            f"/api/v1/extractions/{EXTRACTION_ID}/fields",
            json={"field_name": field, "value": value},
        )
    test_app.dependency_overrides.clear()
    return resp


class TestStringField:
    def test_string_value_accepted(self, test_app, client, auth_user):
        resp = _patch(test_app, client, auth_user, "landlord_legal_name", "ABC Corp")
        assert resp.status_code == 200, resp.text

    def test_number_for_string_rejected(self, test_app, client, auth_user):
        resp = _patch(test_app, client, auth_user, "landlord_legal_name", 123)
        assert resp.status_code == 422
        assert "string" in resp.json()["detail"].lower()


class TestNumberField:
    def test_number_accepted(self, test_app, client, auth_user):
        resp = _patch(test_app, client, auth_user, "rentable_square_footage", 1500)
        assert resp.status_code == 200, resp.text

    def test_numeric_string_accepted_and_coerced(self, test_app, client, auth_user):
        # "1500" is acceptable: coerced to a number per data_type
        resp = _patch(test_app, client, auth_user, "rentable_square_footage", "1500")
        assert resp.status_code == 200, resp.text
        assert resp.json()["edited_value"] == 1500

    def test_non_numeric_string_rejected(self, test_app, client, auth_user):
        resp = _patch(test_app, client, auth_user, "rentable_square_footage", "lots")
        assert resp.status_code == 422
        assert "number" in resp.json()["detail"].lower()


class TestDateField:
    def test_iso_date_accepted(self, test_app, client, auth_user):
        # commencement_date is a date field in the schema
        resp = _patch(test_app, client, auth_user, "commencement_date", "2026-01-15")
        assert resp.status_code == 200, resp.text

    def test_garbage_date_rejected(self, test_app, client, auth_user):
        resp = _patch(test_app, client, auth_user, "commencement_date", "not-a-date")
        assert resp.status_code == 422
        assert "date" in resp.json()["detail"].lower()


class TestBooleanField:
    def test_bool_accepted(self, test_app, client, auth_user):
        # Find a boolean field
        bool_field = next(
            (
                name
                for name, dtype in FieldEditorService.field_data_types().items()
                if dtype == "boolean"
            ),
            None,
        )
        assert bool_field is not None, "schema should expose at least one boolean"
        resp = _patch(test_app, client, auth_user, bool_field, True)
        assert resp.status_code == 200, resp.text

    def test_string_for_bool_rejected(self, test_app, client, auth_user):
        bool_field = next(
            (
                name
                for name, dtype in FieldEditorService.field_data_types().items()
                if dtype == "boolean"
            ),
            None,
        )
        assert bool_field is not None
        resp = _patch(test_app, client, auth_user, bool_field, "yes")
        assert resp.status_code == 422
        assert "bool" in resp.json()["detail"].lower()


class TestNullValueAlwaysAccepted:
    """None should always be accepted regardless of declared data_type — it
    represents clearing a field, not a type mismatch."""

    def test_none_accepted_for_string(self, test_app, client, auth_user):
        resp = _patch(test_app, client, auth_user, "landlord_legal_name", None)
        assert resp.status_code == 200, resp.text
