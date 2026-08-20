"""Tests for the GET /extractions/{id}/document-url endpoint.

Covers auth guards, payment status, missing object key,
ownership, deletion, anonymous sessions, and happy path.
"""

from datetime import UTC, datetime
from urllib.parse import urlparse
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.extractions import router
from app.models.user import AnonymousSession, User

USER_UUID = "00000000-0000-4000-a000-000000000001"
OTHER_UUID = "00000000-0000-4000-a000-000000000099"
ANON_UUID = "00000000-0000-4000-a000-000000000002"
EXTRACTION_UUID = "00000000-0000-4000-a000-000000000010"
OTHER_EXTRACTION_UUID = "00000000-0000-4000-a000-000000000011"
ANON_EXTRACTION_UUID = "00000000-0000-4000-a000-000000000012"


def _auth_override(user):
    """Return a dependency override for get_optional_user."""

    async def override():
        return user

    return override


def _build_mock_db(record):
    """Build a mock Supabase client returning the given record."""
    mock_db = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = record
    (
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
    ) = mock_execute
    return mock_db


def _build_mock_db_not_found():
    """Build a mock Supabase client that raises on single() with no rows."""
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.side_effect = Exception(
        "No rows found"
    )
    return mock_db


@pytest.fixture()
def test_app():
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture()
def client(test_app: FastAPI):
    return TestClient(test_app)


@pytest.fixture()
def mock_user():
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


@pytest.fixture()
def mock_anon():
    return AnonymousSession(
        id=ANON_UUID,
        session_token="anon-token-abc",
        linked_user_id=None,
        expires_at=datetime(2099, 1, 1, tzinfo=UTC),
        created_at=datetime.now(UTC),
    )


@pytest.fixture()
def paid_record():
    return {
        "id": EXTRACTION_UUID,
        "user_id": USER_UUID,
        "anonymous_session_id": None,
        "payment_status": "paid",
        "status": "completed",
        "deleted_at": None,
        "document_object_key": f"uploads/user1/{EXTRACTION_UUID}/lease.pdf",
        "document_filename": "lease.pdf",
    }


URL = f"/api/v1/extractions/{EXTRACTION_UUID}/document-url"


class TestDocumentUrl:
    """GET /extractions/{id}/document-url tests."""

    def test_unauthenticated_returns_401(
        self, test_app: FastAPI, client: TestClient
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(None)
        resp = client.get(URL)
        assert resp.status_code == 401
        test_app.dependency_overrides.clear()

    def test_extraction_not_found_returns_404(
        self, test_app: FastAPI, client: TestClient, mock_user: User
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        mock_db = _build_mock_db_not_found()

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(
                f"/api/v1/extractions/{OTHER_EXTRACTION_UUID}/document-url"
            )
            assert resp.status_code == 404
        test_app.dependency_overrides.clear()

    def test_unpaid_extraction_returns_403(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        unpaid = {
            "id": EXTRACTION_UUID,
            "user_id": USER_UUID,
            "anonymous_session_id": None,
            "payment_status": "unpaid",
            "status": "completed",
            "deleted_at": None,
            "document_object_key": f"uploads/user1/{EXTRACTION_UUID}/lease.pdf",
            "document_filename": "lease.pdf",
        }
        mock_db = _build_mock_db(unpaid)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(URL)
            assert resp.status_code == 403
            assert "Payment required" in resp.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_missing_document_object_key_returns_404(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        no_key = {
            "id": EXTRACTION_UUID,
            "user_id": USER_UUID,
            "anonymous_session_id": None,
            "payment_status": "paid",
            "status": "completed",
            "deleted_at": None,
            "document_object_key": None,
            "document_filename": "lease.pdf",
        }
        mock_db = _build_mock_db(no_key)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(URL)
            assert resp.status_code == 404
            assert "Document not found" in resp.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_successful_presigned_url(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
        paid_record: dict,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        mock_db = _build_mock_db(paid_record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(URL)
            assert resp.status_code == 200
            body = resp.json()
            assert body["url"].startswith(
                f"http://testserver/api/v1/extractions/{EXTRACTION_UUID}/document?token="
            )
            assert body["expires_in"] == 3600
        test_app.dependency_overrides.clear()

    def test_forwarded_https_origin_is_used_for_proxy_url(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
        paid_record: dict,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        mock_db = _build_mock_db(paid_record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(
                URL,
                headers={
                    "X-Forwarded-Proto": "https",
                    "X-Forwarded-Host": "api.lextract.io",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["url"].startswith(
                f"https://api.lextract.io/api/v1/extractions/{EXTRACTION_UUID}/document?token="
            )
        test_app.dependency_overrides.clear()

    def test_host_header_fallback_is_used_for_proxy_url(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
        paid_record: dict,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        mock_db = _build_mock_db(paid_record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(
                URL,
                headers={
                    "X-Forwarded-Proto": "https",
                    "Host": "api.lextract.io",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["url"].startswith(
                f"https://api.lextract.io/api/v1/extractions/{EXTRACTION_UUID}/document?token="
            )
        test_app.dependency_overrides.clear()

    def test_production_host_defaults_proxy_url_to_https(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
        paid_record: dict,
    ) -> None:
        from app.core.config import settings
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        mock_db = _build_mock_db(paid_record)
        original_environment = settings.environment
        settings.environment = "production"

        try:
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = client.get(
                    URL,
                    headers={
                        "Host": "api.lextract.io",
                    },
                )
                assert resp.status_code == 200
                assert resp.json()["url"].startswith(
                    f"https://api.lextract.io/api/v1/extractions/{EXTRACTION_UUID}/document?token="
                )
        finally:
            settings.environment = original_environment
            test_app.dependency_overrides.clear()

    def test_legacy_document_s3_key_is_accepted(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        legacy_record = {
            "id": EXTRACTION_UUID,
            "user_id": USER_UUID,
            "anonymous_session_id": None,
            "payment_status": "paid",
            "status": "completed",
            "deleted_at": None,
            "document_object_key": None,
            "document_s3_key": f"uploads/user1/{EXTRACTION_UUID}/legacy-lease.pdf",
            "document_filename": "legacy-lease.pdf",
        }
        mock_db = _build_mock_db(legacy_record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(URL)
            assert resp.status_code == 200
            assert resp.json()["url"].startswith(
                f"http://testserver/api/v1/extractions/{EXTRACTION_UUID}/document?token="
            )
        test_app.dependency_overrides.clear()

    def test_anonymous_session_can_access(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_anon: AnonymousSession,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_anon)
        record = {
            "id": ANON_EXTRACTION_UUID,
            "user_id": None,
            "anonymous_session_id": ANON_UUID,
            "payment_status": "paid",
            "status": "completed",
            "deleted_at": None,
            "document_object_key": f"uploads/anon/{ANON_EXTRACTION_UUID}/lease.pdf",
            "document_filename": "lease.pdf",
        }
        mock_db = _build_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(
                f"/api/v1/extractions/{ANON_EXTRACTION_UUID}/document-url"
            )
            assert resp.status_code == 200
            assert resp.json()["url"].startswith(
                f"http://testserver/api/v1/extractions/{ANON_EXTRACTION_UUID}/document?token="
            )
        test_app.dependency_overrides.clear()

    def test_document_proxy_downloads_pdf_with_valid_token(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
        paid_record: dict,
    ) -> None:
        from app.core.dependencies import get_optional_user
        from app.services.object_storage import get_object_storage_service

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        mock_db = _build_mock_db(paid_record)
        mock_object_storage = MagicMock()
        mock_object_storage.stream_file.return_value = (
            iter([b"%PDF-1.7 ", b"mock document"]),
            "application/pdf",
        )
        test_app.dependency_overrides[get_object_storage_service] = (
            lambda: mock_object_storage
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            url_resp = client.get(URL)
            assert url_resp.status_code == 200
            proxy_url = url_resp.json()["url"]
            proxy_path = urlparse(proxy_url).path + "?" + urlparse(proxy_url).query

            test_app.dependency_overrides.pop(get_optional_user, None)

            proxy_resp = client.get(proxy_path)
            assert proxy_resp.status_code == 200
            assert proxy_resp.content == b"%PDF-1.7 mock document"
            assert proxy_resp.headers["content-type"].startswith("application/pdf")
            assert 'filename="lease.pdf"' in proxy_resp.headers["content-disposition"]
            mock_object_storage.stream_file.assert_called_once_with(
                f"uploads/user1/{EXTRACTION_UUID}/lease.pdf"
            )

        test_app.dependency_overrides.clear()

    def test_document_proxy_rejects_invalid_token(
        self,
        test_app: FastAPI,
        client: TestClient,
        paid_record: dict,
    ) -> None:
        from app.services.object_storage import get_object_storage_service

        mock_db = _build_mock_db(paid_record)
        mock_object_storage = MagicMock()
        test_app.dependency_overrides[get_object_storage_service] = (
            lambda: mock_object_storage
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/document?token=not-a-valid-token"
            )
            assert resp.status_code == 403
            assert "Invalid or expired document token" in resp.json()["detail"]
            mock_object_storage.stream_file.assert_not_called()

        test_app.dependency_overrides.clear()

    def test_document_proxy_rejects_expired_token(
        self,
        test_app: FastAPI,
        client: TestClient,
        paid_record: dict,
    ) -> None:
        from app.api.v1.extractions import (
            _build_document_owner_claim,
            _build_document_proxy_token,
        )
        from app.services.object_storage import get_object_storage_service

        mock_db = _build_mock_db(paid_record)
        mock_object_storage = MagicMock()
        test_app.dependency_overrides[get_object_storage_service] = (
            lambda: mock_object_storage
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            expired_token = _build_document_proxy_token(
                EXTRACTION_UUID,
                _build_document_owner_claim(paid_record),
                expires_in=-1,
            )
            resp = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/document?token={expired_token}"
            )
            assert resp.status_code == 403
            assert "Invalid or expired document token" in resp.json()["detail"]
            mock_object_storage.stream_file.assert_not_called()

        test_app.dependency_overrides.clear()

    def test_document_proxy_rejects_wrong_owner_claim(
        self,
        test_app: FastAPI,
        client: TestClient,
        paid_record: dict,
    ) -> None:
        from app.api.v1.extractions import _build_document_proxy_token
        from app.services.object_storage import get_object_storage_service

        mock_db = _build_mock_db(paid_record)
        mock_object_storage = MagicMock()
        test_app.dependency_overrides[get_object_storage_service] = (
            lambda: mock_object_storage
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            wrong_owner_token = _build_document_proxy_token(
                EXTRACTION_UUID,
                "user:00000000-0000-4000-a000-000000000999",
            )
            resp = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/document?token={wrong_owner_token}"
            )
            assert resp.status_code == 403
            assert "Invalid or expired document token" in resp.json()["detail"]
            mock_object_storage.stream_file.assert_not_called()

        test_app.dependency_overrides.clear()

    def test_document_proxy_sanitizes_content_disposition_filename(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
        paid_record: dict,
    ) -> None:
        from app.core.dependencies import get_optional_user
        from app.services.object_storage import get_object_storage_service

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        paid_record["document_filename"] = 'Bob "signed"\r\nlease.pdf'
        mock_db = _build_mock_db(paid_record)
        mock_object_storage = MagicMock()
        mock_object_storage.stream_file.return_value = (
            iter([b"%PDF-1.7 sanitized"]),
            "application/pdf",
        )
        test_app.dependency_overrides[get_object_storage_service] = (
            lambda: mock_object_storage
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            url_resp = client.get(URL)
            proxy_url = url_resp.json()["url"]
            proxy_path = urlparse(proxy_url).path + "?" + urlparse(proxy_url).query

            test_app.dependency_overrides.pop(get_optional_user, None)

            proxy_resp = client.get(proxy_path)
            content_disposition = proxy_resp.headers["content-disposition"]
            assert 'filename="Bob signedlease.pdf"' in content_disposition
            assert "filename*=UTF-8''Bob%20%22signed%22%0D%0Alease.pdf" in (
                content_disposition
            )

        test_app.dependency_overrides.clear()

    def test_deleted_extraction_returns_404(
        self,
        test_app: FastAPI,
        client: TestClient,
        mock_user: User,
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(mock_user)
        deleted = {
            "id": EXTRACTION_UUID,
            "user_id": USER_UUID,
            "anonymous_session_id": None,
            "payment_status": "paid",
            "status": "completed",
            "deleted_at": "2026-01-15T00:00:00+00:00",
            "document_object_key": f"uploads/user1/{EXTRACTION_UUID}/lease.pdf",
            "document_filename": "lease.pdf",
        }
        mock_db = _build_mock_db(deleted)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(URL)
            assert resp.status_code == 404
        test_app.dependency_overrides.clear()

    def test_non_owner_returns_404(
        self,
        test_app: FastAPI,
        client: TestClient,
        paid_record: dict,
    ) -> None:
        from app.core.dependencies import get_optional_user

        other_user = User(
            id=OTHER_UUID,
            email="other@example.com",
            full_name="Other User",
            company=None,
            role="user",
            credits_balance=5,
            stripe_customer_id=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        test_app.dependency_overrides[get_optional_user] = _auth_override(other_user)
        mock_db = _build_mock_db(paid_record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = client.get(URL)
            assert resp.status_code == 404
        test_app.dependency_overrides.clear()
