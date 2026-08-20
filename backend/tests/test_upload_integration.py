"""Integration tests for the full upload flow.

Verifies: auth -> validation -> object upload -> DB insert -> Celery dispatch.
"""

import io
import time
import uuid
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.core.security import jwks_cache
from app.main import create_app

PDF_MAGIC = b"%PDF-1.4 fake content for integration testing"


def _generate_rsa_keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _make_token(private_key, sub="00000000-0000-0000-0000-000000000001", **overrides):
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "role": "authenticated",
    }
    payload.update(overrides)
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


@pytest.fixture
def rsa_keys():
    private = _generate_rsa_keypair()
    return private, private.public_key()


@pytest.fixture
def app_client():
    app = create_app()
    return TestClient(app)


class TestFullUploadFlowJwtUser:
    """Integration test: JWT user uploads PDF -> storage + DB + Celery."""

    def test_full_jwt_upload_flow(self, app_client, rsa_keys):
        private_key, public_key = rsa_keys
        user_id = "00000000-0000-0000-0000-000000000001"
        token = _make_token(private_key, sub=user_id)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key

        mock_rls = MagicMock()
        user_query = mock_rls.table.return_value.select.return_value.eq.return_value
        user_row = {
            "id": user_id,
            "email": "user@example.com",
            "full_name": "Test User",
            "company": None,
            "role": None,
            "credits_balance": 5,
            "stripe_customer_id": None,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }
        user_query.maybe_single.return_value.execute.return_value = MagicMock(
            data=user_row
        )
        user_query.single.return_value.execute.return_value = MagicMock(data=user_row)

        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "inserted"}]
        )

        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = (
            f"{user_id}/some-ext-id/original.pdf"
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline") as mock_pipeline,
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[
                    (
                        "file",
                        ("my-lease.pdf", io.BytesIO(PDF_MAGIC), "application/pdf"),
                    )
                ],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201
        data = resp.json()
        extraction_id = data["extraction_id"]
        uuid.UUID(extraction_id)
        assert data["status"] == "uploading"

        mock_object_storage.upload_file.assert_called_once()
        object_args = mock_object_storage.upload_file.call_args[0]
        assert object_args[0] == user_id
        assert object_args[1] == extraction_id
        assert object_args[2] == PDF_MAGIC
        assert object_args[3] == "application/pdf"

        mock_db.table.assert_called_with("extractions")
        insert_data = mock_db.table.return_value.insert.call_args[0][0]
        assert insert_data["id"] == extraction_id
        assert insert_data["user_id"] == user_id
        assert insert_data["anonymous_session_id"] is None
        assert insert_data["status"] == "uploading"
        assert insert_data["document_filename"] == "my-lease.pdf"
        assert "document_object_key" in insert_data

        mock_pipeline.assert_called_once_with(extraction_id)


class TestFullUploadFlowAnonymousSession:
    """Integration test: anonymous session uploads PDF -> storage + DB + Celery."""

    def test_full_anonymous_upload_flow(self, app_client):
        session_id = "00000000-0000-0000-0000-000000000099"

        mock_combined = MagicMock()

        session_table = MagicMock()
        session_table.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": session_id,
                    "session_token": "anon-tok",
                    "linked_user_id": None,
                    "expires_at": "2099-01-01T00:00:00+00:00",
                    "created_at": "2026-01-01T00:00:00Z",
                }
            ]
        )

        extraction_table = MagicMock()
        extraction_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "inserted"}]
        )

        def table_router(table_name: str) -> MagicMock:
            if table_name == "anonymous_sessions":
                return session_table
            if table_name == "extractions":
                return extraction_table
            return MagicMock()

        mock_combined.table.side_effect = table_router

        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = (
            f"anon/{session_id}/ext-id/original.pdf"
        )

        with (
            patch(
                "app.database.client.NeonClientManager.get_service_client",
                return_value=mock_combined,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline") as mock_pipeline,
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[
                    (
                        "file",
                        (
                            "anon-lease.pdf",
                            io.BytesIO(PDF_MAGIC),
                            "application/pdf",
                        ),
                    )
                ],
                headers={"X-Session-Token": "anon-tok"},
            )

        assert resp.status_code == 201
        data = resp.json()
        extraction_id = data["extraction_id"]
        uuid.UUID(extraction_id)
        assert data["status"] == "uploading"

        mock_object_storage.upload_file.assert_called_once()
        object_args = mock_object_storage.upload_file.call_args[0]
        assert object_args[0] == f"anon/{session_id}"

        insert_data = extraction_table.insert.call_args[0][0]
        assert insert_data["anonymous_session_id"] == session_id
        assert insert_data["user_id"] is None
        assert insert_data["document_filename"] == "anon-lease.pdf"

        mock_pipeline.assert_called_once_with(extraction_id)
