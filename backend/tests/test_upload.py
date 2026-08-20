"""Unit tests for POST /api/v1/extractions/upload endpoint."""

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
from app.schemas.extraction import UploadResponse


# --- Helpers ---

PDF_MAGIC = b"%PDF-1.4 fake content for testing"


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


def _make_pdf_file(content: bytes = PDF_MAGIC, filename: str = "lease.pdf"):
    """Create a tuple suitable for TestClient multipart upload."""
    return ("file", (filename, io.BytesIO(content), "application/pdf"))


@pytest.fixture
def rsa_keys():
    private = _generate_rsa_keypair()
    return private, private.public_key()


@pytest.fixture
def app_client():
    app = create_app()
    return TestClient(app)


def _mock_user_lookup():
    """Return a mock RLS client that returns a valid user row."""
    mock_rls = MagicMock()
    user_row = {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "user@example.com",
        "full_name": "Test User",
        "company": None,
        "role": None,
        "credits_balance": 5,
        "stripe_customer_id": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    query = mock_rls.table.return_value.select.return_value.eq.return_value
    query.maybe_single.return_value.execute.return_value = MagicMock(data=user_row)
    query.single.return_value.execute.return_value = MagicMock(data=user_row)
    return mock_rls


def _mock_session_lookup(session_id: str = "00000000-0000-0000-0000-000000000099"):
    """Return a mock admin client that returns a valid anonymous session."""
    mock_admin = MagicMock()
    mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": session_id,
                "session_token": "test-session-token",
                "linked_user_id": None,
                "expires_at": "2099-01-01T00:00:00+00:00",
                "created_at": "2026-01-01T00:00:00Z",
            }
        ]
    )
    return mock_admin


def _mock_db_insert():
    """Return a mock service client for DB insert operations."""
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "some-id"}]
    )
    return mock_db


def _mock_session_and_db(session_id: str = "00000000-0000-0000-0000-000000000099"):
    """Return a single mock that handles both session lookup and DB insert.

    NeonClientManager.get_service_client is a classmethod shared across
    modules, so we need one mock that supports both the anonymous_sessions
    select chain and the extractions insert chain.
    """
    mock_client = MagicMock()

    # Set up table routing based on table name
    session_table = MagicMock()
    session_table.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": session_id,
                "session_token": "test-session-token",
                "linked_user_id": None,
                "expires_at": "2099-01-01T00:00:00+00:00",
                "created_at": "2026-01-01T00:00:00Z",
            }
        ]
    )

    extraction_table = MagicMock()
    extraction_table.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "some-id"}]
    )

    def table_router(table_name: str) -> MagicMock:
        if table_name == "anonymous_sessions":
            return session_table
        if table_name == "extractions":
            return extraction_table
        return MagicMock()

    mock_client.table.side_effect = table_router
    return mock_client, extraction_table


# --- Schema tests ---


class TestUploadResponseSchema:
    def test_construction(self):
        resp = UploadResponse(extraction_id="abc-123", status="uploading")
        assert resp.extraction_id == "abc-123"
        assert resp.status == "uploading"

    def test_serialization(self):
        resp = UploadResponse(extraction_id="abc-123", status="uploading")
        data = resp.model_dump()
        assert data == {"extraction_id": "abc-123", "status": "uploading"}


# --- Endpoint tests ---


class TestUploadRejectsNonPdf:
    def test_non_pdf_content_type_returns_400(self, app_client):
        """Upload with non-PDF content type should be rejected."""
        resp = app_client.post(
            "/api/v1/extractions/upload",
            files=[("file", ("doc.txt", io.BytesIO(b"not a pdf"), "text/plain"))],
            headers={"Authorization": "Bearer fake"},
        )
        # Auth dependency runs before content-type validation. With a bogus
        # bearer and no reachable auth service in the test env, auth fails
        # closed (401 on positive rejection, or 503 when the auth service is
        # unreachable). See test_non_pdf_content_type_with_auth_returns_400 for
        # the authenticated 400 path.
        assert resp.status_code in (400, 401, 503)

    def test_non_pdf_content_type_with_auth_returns_400(self, app_client, rsa_keys):
        """Upload with non-PDF content type (authenticated) should return 400."""
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[("file", ("doc.txt", io.BytesIO(b"not a pdf"), "text/plain"))],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 400
        assert "pdf" in resp.json()["detail"].lower()


class TestUploadRejectsOversizedFile:
    def test_file_over_50mb_returns_400(self, app_client, rsa_keys):
        """Upload exceeding 50MB should return 400."""
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()

        # Create a file just over 50MB: PDF magic + padding
        oversized = PDF_MAGIC + b"\x00" * (50 * 1024 * 1024 + 1)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[
                    (
                        "file",
                        ("big.pdf", io.BytesIO(oversized), "application/pdf"),
                    )
                ],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert "50" in detail.lower() or "size" in detail.lower()
        # Bug #45: error message must NOT leak the exact byte count
        assert "bytes" not in detail.lower()


class TestUploadRejectsUnauthenticated:
    def test_no_auth_returns_401(self, app_client):
        """Upload without any auth should return 401."""
        resp = app_client.post(
            "/api/v1/extractions/upload",
            files=[_make_pdf_file()],
        )
        assert resp.status_code == 401


class TestUploadSucceedsWithJwtUser:
    def test_jwt_user_upload_returns_201(self, app_client, rsa_keys):
        """Authenticated user uploading a valid PDF should get 201."""
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()
        mock_db = _mock_db_insert()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = (
            "user-id/extraction-id/original.pdf"
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
            patch(
                "app.api.v1.extractions.run_extraction_pipeline",
            ),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201
        data = resp.json()
        assert "extraction_id" in data
        assert data["status"] == "uploading"
        # Verify UUID format
        uuid.UUID(data["extraction_id"])


class TestUploadSucceedsWithSessionToken:
    def test_session_token_upload_returns_201(self, app_client):
        """Anonymous user with session token uploading a valid PDF should get 201."""
        mock_combined, _ = _mock_session_and_db()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = (
            "anon/session-id/extraction-id/original.pdf"
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
            patch(
                "app.api.v1.extractions.run_extraction_pipeline",
            ),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 201
        data = resp.json()
        assert "extraction_id" in data
        assert data["status"] == "uploading"


class TestObjectStorageUploadCalledCorrectly:
    def test_object_storage_upload_called_with_correct_key_for_user(
        self, app_client, rsa_keys
    ):
        """Object storage upload should use user_id in the key path."""
        private_key, public_key = rsa_keys
        user_id = "00000000-0000-0000-0000-000000000001"
        token = _make_token(private_key, sub=user_id)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()
        mock_db = _mock_db_insert()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "some-key"

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
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201
        mock_object_storage.upload_file.assert_called_once()
        call_kwargs = mock_object_storage.upload_file.call_args
        # user_id should be the first positional arg or keyword
        args, kwargs = call_kwargs
        # Check user_id is passed correctly
        assert args[0] == user_id or kwargs.get("user_id") == user_id

    def test_object_upload_called_with_anon_prefix_for_session(self, app_client):
        """Object upload for anonymous sessions should use anon/ prefix."""
        session_id = "00000000-0000-0000-0000-000000000099"
        mock_combined, _ = _mock_session_and_db(session_id)
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "anon-key"

        with (
            patch(
                "app.database.client.NeonClientManager.get_service_client",
                return_value=mock_combined,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 201
        mock_object_storage.upload_file.assert_called_once()
        call_args = mock_object_storage.upload_file.call_args
        args, kwargs = call_args
        # First arg (user_id) should have "anon/" prefix
        owner_id = args[0] if args else kwargs.get("user_id", "")
        assert owner_id.startswith("anon/")


class TestCeleryTaskDispatched:
    def test_ocr_task_dispatched_after_upload(self, app_client, rsa_keys):
        """run_extraction_pipeline.delay should be called after successful upload."""
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()
        mock_db = _mock_db_insert()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "some-key"

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
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201
        mock_pipeline.assert_called_once()
        call_args = mock_pipeline.call_args[0]
        assert len(call_args) == 1
        # Verify it's a valid UUID
        uuid.UUID(call_args[0])


class TestDbRowCreated:
    def test_db_insert_called_with_correct_fields(self, app_client, rsa_keys):
        """Extraction row should be inserted with correct fields."""
        private_key, public_key = rsa_keys
        user_id = "00000000-0000-0000-0000-000000000001"
        token = _make_token(private_key, sub=user_id)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()
        mock_db = _mock_db_insert()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "some-key"

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
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201
        mock_db.table.assert_called_with("extractions")
        insert_call = mock_db.table.return_value.insert
        insert_call.assert_called_once()
        insert_data = insert_call.call_args[0][0]
        assert insert_data["status"] == "uploading"
        assert insert_data["document_filename"] == "lease.pdf"
        assert insert_data["user_id"] == user_id
        assert "document_object_key" in insert_data
        assert "id" in insert_data

    def test_db_insert_has_anonymous_session_id_for_session(self, app_client):
        """Extraction row for anonymous upload should have anonymous_session_id."""
        session_id = "00000000-0000-0000-0000-000000000099"
        mock_combined, extraction_table = _mock_session_and_db(session_id)
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "anon-key"

        with (
            patch(
                "app.database.client.NeonClientManager.get_service_client",
                return_value=mock_combined,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 201
        insert_data = extraction_table.insert.call_args[0][0]
        assert insert_data["anonymous_session_id"] == session_id
        assert insert_data.get("user_id") is None

    def test_db_insert_falls_back_to_legacy_document_s3_key_on_old_schema(
        self, app_client, rsa_keys
    ):
        """Uploads still succeed before the column rename migration lands."""
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()
        mock_db = MagicMock()
        insert_query = mock_db.table.return_value.insert.return_value
        insert_query.execute.side_effect = [
            Exception("Could not find the 'document_object_key' column"),
            MagicMock(data=[{"id": "some-id"}]),
        ]
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "some-key"

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
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201
        first_payload = mock_db.table.return_value.insert.call_args_list[0][0][0]
        second_payload = mock_db.table.return_value.insert.call_args_list[1][0][0]
        assert "document_object_key" in first_payload
        assert "document_s3_key" not in first_payload
        assert "document_s3_key" in second_payload
        assert second_payload["document_s3_key"] == "some-key"


class TestUploadObjectStorageError:
    def test_object_storage_error_returns_500(self, app_client, rsa_keys):
        """Object-storage upload failure should return 500."""
        from app.core.exceptions import ObjectStorageError

        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.side_effect = ObjectStorageError(
            "Upload failed"
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 500
        assert "upload" in resp.json()["detail"].lower()


class TestUploadFailureCompensation:
    def test_db_insert_failure_cleans_up_uploaded_file(self, app_client, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()
        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.side_effect = Exception(
            "insert failed"
        )
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "user/ext/original.pdf"

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
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 500
        mock_object_storage.delete_file.assert_called_once_with("user/ext/original.pdf")

    def test_pipeline_dispatch_failure_marks_upload_failed(self, app_client, rsa_keys):
        private_key, public_key = rsa_keys
        token = _make_token(private_key)

        mock_jwk = MagicMock()
        mock_jwk.key = public_key
        mock_rls = _mock_user_lookup()

        mock_db = MagicMock()
        extraction_table = MagicMock()
        extraction_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "some-id"}]
        )
        extraction_table.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "some-id", "status": "failed"}]
        )
        mock_db.table.return_value = extraction_table

        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "user/ext/original.pdf"

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
            patch(
                "app.api.v1.extractions.run_extraction_pipeline",
                side_effect=RuntimeError("broker unavailable"),
            ),
        ):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files=[_make_pdf_file()],
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 503
        extraction_table.update.assert_called_once()
        update_data = extraction_table.update.call_args[0][0]
        assert update_data["status"] == "failed"
        assert "couldn't start processing" in update_data["error_message"].lower()
