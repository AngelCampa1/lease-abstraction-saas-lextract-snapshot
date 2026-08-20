"""Tests for the export Celery task and the export API endpoint.

Mocks external boundaries (Supabase, object storage) while exercising real
export generation logic.
"""

from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError
from fastapi import status
from fastapi.testclient import TestClient

from app.core.exceptions import ExportError
from app.tasks.export import generate_export, EXPORTERS


# -- Fixtures --


@pytest.fixture
def mock_db_record():
    """A fully paid extraction DB record."""
    return {
        "id": "ext-001",
        "user_id": USER_UUID,
        "anonymous_session_id": None,
        "payment_status": "paid",
        "extracted_data": {
            "landlord_legal_name": "ABC Corp",
            "tenant_legal_name": "Acme Inc",
            "premises_address": "123 Main St",
        },
        "confidence_scores": {
            "landlord_legal_name": "HIGH",
            "tenant_legal_name": "HIGH",
            "premises_address": "MEDIUM",
        },
        "red_flags": [
            {
                "field": "cam_cap_percentage",
                "severity": "HIGH",
                "message": "No CAM cap found",
            }
        ],
        "document_filename": "lease.pdf",
    }


@pytest.fixture
def mock_db_unpaid_record(mock_db_record):
    """An unpaid extraction DB record."""
    return {**mock_db_record, "payment_status": "unpaid"}


def _mock_db_response(record):
    """Create a mock Supabase response with .data attribute."""
    response = MagicMock()
    response.data = record
    return response


def _build_mock_db(record):
    """Build a chained-call mock Supabase client."""
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_single = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = record

    mock_is = MagicMock()

    mock_db.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.is_.return_value = mock_is
    mock_is.single.return_value = mock_single
    mock_single.execute.return_value = mock_execute

    return mock_db


class _FluentDB:
    """A self-returning query mock so chained .eq()/.is_() calls all resolve.

    Unlike ``_build_mock_db`` (a fixed-depth chain), this lets the task append
    any number of ownership ``.eq()`` filters before ``.single().execute()``.
    """

    def __init__(self, client: MagicMock, query: MagicMock):
        self.client = client
        self.query = query


def _build_fluent_mock_db(record) -> _FluentDB:
    query = MagicMock()
    query.select.return_value = query
    query.eq.return_value = query
    query.is_.return_value = query
    query.single.return_value.execute.return_value = _mock_db_response(record)
    client = MagicMock()
    client.table.return_value = query
    return _FluentDB(client, query)


def _build_mock_object_storage():
    """Build a mock object-storage service."""
    mock_object_storage = MagicMock()
    mock_object_storage.upload_export.return_value = (
        "user-001/ext-001/exports/docx.docx"
    )
    mock_object_storage.generate_presigned_url.return_value = (
        "https://downloads.lextract.io/signed-url"
    )
    return mock_object_storage


# -- Celery task tests --


class TestGenerateExportTask:
    def test_happy_path(self, mock_db_record):
        mock_db = _build_mock_db(mock_db_record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            result = generate_export(
                extraction_id="ext-001",
                export_format="docx",
                template="commercial",
            )

        assert result["url"] == "https://downloads.lextract.io/signed-url"
        assert result["format"] == "docx"
        assert "object_key" not in result
        # No updated_at on the fixture → "v0" version token, surfaced so the
        # poller/client can pin the download to the exact generated file.
        assert result["version"] == "v0"
        mock_object_storage.upload_export.assert_called_once()
        mock_object_storage.generate_presigned_url.assert_called_once()

    def test_unpaid_raises(self, mock_db_unpaid_record):
        mock_db = _build_mock_db(mock_db_unpaid_record)

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch("app.tasks.export._get_object_storage_service"),
            pytest.raises(ExportError, match="not paid"),
        ):
            generate_export(extraction_id="ext-001")

    def test_unsupported_format_raises(self):
        with pytest.raises(ExportError, match="Unsupported export format"):
            generate_export(extraction_id="ext-001", export_format="odt")

    def test_extraction_not_found_raises(self):
        mock_db = _build_mock_db(None)

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            pytest.raises(ExportError, match="not found"),
        ):
            generate_export(extraction_id="ext-999")

    def test_uses_default_template(self, mock_db_record):
        mock_db = _build_mock_db(mock_db_record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            result = generate_export(extraction_id="ext-001")

        assert result["format"] == "docx"

    def test_handles_null_extracted_data(self, mock_db_record):
        record = {
            **mock_db_record,
            "extracted_data": None,
            "confidence_scores": None,
            "red_flags": None,
        }
        mock_db = _build_mock_db(record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            result = generate_export(extraction_id="ext-001")

        assert result["url"] == "https://downloads.lextract.io/signed-url"

    def test_exporters_registry(self):
        assert "docx" in EXPORTERS
        from app.services.exports.word import WordExporter

        assert EXPORTERS["docx"] is WordExporter

    def test_exporters_registry_has_xlsx(self):
        assert "xlsx" in EXPORTERS
        from app.services.exports.excel import ExcelExporter

        assert EXPORTERS["xlsx"] is ExcelExporter

    def test_get_available_export_formats_matches_registry(self):
        from app.tasks.export import get_available_export_formats

        available = get_available_export_formats()
        assert available == frozenset(EXPORTERS)
        # docx/xlsx are always available regardless of WeasyPrint.
        assert {"docx", "xlsx"} <= available

    def test_get_available_export_formats_excludes_pdf_when_unavailable(self):
        from app.tasks import export as export_module

        with patch.object(
            export_module,
            "_get_exporters",
            return_value={"docx": object, "xlsx": object},
        ):
            available = export_module.get_available_export_formats()

        assert "pdf" not in available
        assert available == frozenset({"docx", "xlsx"})

    def test_xlsx_export_happy_path(self, mock_db_record):
        mock_db = _build_mock_db(mock_db_record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            result = generate_export(
                extraction_id="ext-001",
                export_format="xlsx",
                template="commercial",
            )

        assert result["format"] == "xlsx"
        assert result["url"] == "https://downloads.lextract.io/signed-url"
        mock_object_storage.upload_export.assert_called_once()

    def test_anonymous_user_export_uses_anon_owner_prefix(self):
        """Anonymous exports must use the anon/ owner prefix to match API cache keys."""
        record = {
            "id": "ext-anon",
            "user_id": None,
            "anonymous_session_id": "anon-session-123",
            "payment_status": "paid",
            "extracted_data": {"landlord_legal_name": "ACME"},
            "confidence_scores": {},
            "red_flags": [],
            "document_filename": "lease.pdf",
        }
        mock_db = _build_mock_db(record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            result = generate_export(extraction_id="ext-anon", export_format="docx")

        assert result["url"] == "https://downloads.lextract.io/signed-url"
        # user_id passed to object storage should include the anon/ prefix
        call_kwargs = mock_object_storage.upload_export.call_args
        actual_user_id = call_kwargs.kwargs.get(
            "user_id", call_kwargs[1].get("user_id") if len(call_kwargs) > 1 else None
        )
        assert actual_user_id == "anon/anon-session-123"

    def test_export_upload_key_includes_template(self, mock_db_record):
        mock_db = _build_mock_db(mock_db_record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            generate_export(
                extraction_id="ext-001",
                export_format="docx",
                template="office",
            )

        call_kwargs = mock_object_storage.upload_export.call_args.kwargs
        assert call_kwargs["format_name"] == "docx"
        assert call_kwargs["template"] == "office"

    def test_soft_deleted_extraction_raises_export_error(self):
        """Soft-deleted or missing extractions should raise a bounded ExportError."""
        # When is_("deleted_at", "null") filters out the record, .single() raises
        mock_db = MagicMock()
        mock_is = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value = (
            mock_is
        )
        mock_is.single.return_value.execute.side_effect = Exception(
            "PGRST116: No rows found"
        )

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch("app.tasks.export._get_object_storage_service"),
            pytest.raises(ExportError, match="not found"),
        ):
            generate_export(extraction_id="ext-deleted", export_format="docx")

    def test_legacy_format_kwarg_is_honored(self, mock_db_record):
        """In-flight queue messages may carry the deprecated ``format`` kwarg."""
        mock_db = _build_mock_db(mock_db_record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            # Pass the deprecated kwarg; it must override export_format.
            result = generate_export(extraction_id="ext-001", format="xlsx")

        assert result["format"] == "xlsx"

    def test_owner_scoped_query_filters(self, mock_db_record):
        """Passing user_id / anonymous_session_id adds ownership eq() filters."""
        fluent = _build_fluent_mock_db(mock_db_record)
        mock_object_storage = _build_mock_object_storage()

        with (
            patch("app.tasks.export._get_db_client", return_value=fluent.client),
            patch(
                "app.tasks.export._get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            generate_export(
                extraction_id="ext-001",
                export_format="docx",
                user_id=USER_UUID,
                anonymous_session_id="anon-1",
            )

        eq_filters = {call.args for call in fluent.query.eq.call_args_list}
        assert ("user_id", USER_UUID) in eq_filters
        assert ("anonymous_session_id", "anon-1") in eq_filters

    def test_db_error_other_than_not_found_is_reraised(self):
        """A non-'row not found' DB error propagates unchanged (not as ExportError)."""

        class WeirdDBError(Exception):
            pass

        mock_db = MagicMock()
        mock_is = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value = (
            mock_is
        )
        mock_is.single.return_value.execute.side_effect = WeirdDBError(
            "connection lost"
        )

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch("app.tasks.export._get_object_storage_service"),
            pytest.raises(WeirdDBError, match="connection lost"),
        ):
            generate_export(extraction_id="ext-x", export_format="docx")

    def test_get_exporters_omits_pdf_when_import_fails(self):
        """_get_exporters degrades gracefully when WeasyPrint/pdf import fails."""
        import sys

        from app.tasks import export as export_module

        # Setting the module to None makes `import ...pdf` raise ImportError.
        with patch.dict(sys.modules, {"app.services.exports.pdf": None}):
            exporters = export_module._get_exporters()

        assert "pdf" not in exporters
        assert "docx" in exporters
        assert "xlsx" in exporters

    def test_get_exporters_registers_pdf_when_import_succeeds(self):
        """When the pdf module imports cleanly, _get_exporters registers it.

        WeasyPrint's system libs are absent on some dev/CI hosts, so the real
        import fails there; inject a stand-in module to exercise the success
        branch deterministically.
        """
        import sys
        import types

        from app.tasks import export as export_module

        fake_pdf = types.ModuleType("app.services.exports.pdf")
        fake_pdf.PdfExporter = type("PdfExporter", (), {})

        with patch.dict(sys.modules, {"app.services.exports.pdf": fake_pdf}):
            exporters = export_module._get_exporters()

        assert exporters["pdf"] is fake_pdf.PdfExporter

    def test_no_owner_raises_export_error(self):
        """BUG #15: Export with both user_id and anonymous_session_id None raises error."""
        record = {
            "id": "ext-orphan",
            "user_id": None,
            "anonymous_session_id": None,
            "payment_status": "paid",
            "extracted_data": {},
            "confidence_scores": {},
            "red_flags": [],
            "document_filename": "lease.pdf",
        }
        mock_db = _build_mock_db(record)

        with (
            patch("app.tasks.export._get_db_client", return_value=mock_db),
            patch("app.tasks.export._get_object_storage_service"),
            pytest.raises(ExportError, match="no owner"),
        ):
            generate_export(extraction_id="ext-orphan", export_format="docx")


# -- API endpoint tests --


@pytest.fixture
def test_app():
    """Create a FastAPI test client with the extractions router."""
    from fastapi import FastAPI
    from app.api.v1.extractions import router

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def client(test_app):
    return TestClient(test_app)


USER_UUID = "00000000-0000-4000-a000-000000000001"
EXPORT_UUID = "00000000-0000-4000-a000-000000000010"
MISSING_EXPORT_UUID = "00000000-0000-4000-a000-000000000011"


@pytest.fixture
def mock_auth_user():
    """Mock authenticated user."""
    from app.models.user import User
    from datetime import datetime, UTC

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


def _auth_override(user):
    """Return a dependency override for get_current_user."""

    async def override():
        return user

    return override


def _build_endpoint_mock_db(record):
    """Build a mock Supabase client for endpoint tests.

    Mocks the chain: table().select().eq().is_().single().execute().data
    Used by _fetch_extraction helper.
    """
    mock_db = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = record
    (
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
    ) = mock_execute
    return mock_db


class TestExportEndpoint:
    def test_invalid_format_returns_400(self, test_app, client, mock_auth_user):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        response = client.post(
            f"/api/v1/extractions/{EXPORT_UUID}/export/odt",
            json={"template": "commercial"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Unsupported export format" in response.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_unauthenticated_returns_401(self, client):
        response = client.post(
            f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
            json={"template": "commercial"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unpaid_returns_403(self, test_app, client, mock_auth_user):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "unpaid",
            }
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "paid" in response.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_dispatches_task_returns_202(self, test_app, client, mock_auth_user):
        from app.core.dependencies import get_optional_user
        from app.api.v1.tasks import build_export_task_id

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = False

        mock_task = MagicMock()
        mock_task.id = "task-abc-123"

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch(
                "app.api.v1.extractions.generate_export.apply_async",
                return_value=mock_task,
            ) as apply_async,
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data["task_id"] == "task-abc-123"
        assert data["status"] == "generating"
        expected_task_id = build_export_task_id(
            mock_auth_user, f"{EXPORT_UUID}:commercial:docx"
        )
        assert apply_async.call_args.kwargs["task_id"] == expected_task_id
        test_app.dependency_overrides.clear()

    def test_anonymous_session_dispatch_uses_anon_session_kwarg(self, test_app, client):
        """An anonymous session export dispatches with anonymous_session_id."""
        from datetime import UTC, datetime

        from app.core.dependencies import get_optional_user
        from app.models.user import AnonymousSession

        anon_id = "00000000-0000-4000-a000-0000000000aa"
        anon = AnonymousSession(
            id=anon_id,
            session_token="anon-token-xyz",
            linked_user_id=None,
            expires_at=datetime(2099, 1, 1, tzinfo=UTC),
            created_at=datetime.now(UTC),
        )
        test_app.dependency_overrides[get_optional_user] = _auth_override(anon)

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": None,
                "anonymous_session_id": anon_id,
                "payment_status": "paid",
            }
        )
        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = False
        mock_task = MagicMock()
        mock_task.id = "task-anon-1"

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch(
                "app.api.v1.extractions.generate_export.apply_async",
                return_value=mock_task,
            ) as apply_async,
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_202_ACCEPTED
        kwargs = apply_async.call_args.kwargs["kwargs"]
        assert kwargs["anonymous_session_id"] == anon_id
        assert "user_id" not in kwargs
        test_app.dependency_overrides.clear()

    def test_dispatch_failure_returns_503(self, test_app, client, mock_auth_user):
        """If apply_async raises (broker down), the endpoint returns 503."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )
        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = False

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch(
                "app.api.v1.extractions.generate_export.apply_async",
                side_effect=RuntimeError("broker down"),
            ),
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        test_app.dependency_overrides.clear()

    def test_format_available_pdf_returns_202(self, test_app, client, mock_auth_user):
        """When PDF is currently available (e.g. production), it dispatches a task."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )
        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = False
        mock_task = MagicMock()
        mock_task.id = "task-pdf-1"

        with (
            patch(
                "app.api.v1.extractions.get_available_export_formats",
                return_value=frozenset({"docx", "xlsx", "pdf"}),
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
                "app.api.v1.extractions.generate_export.apply_async",
                return_value=mock_task,
            ),
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/pdf",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.json()["task_id"] == "task-pdf-1"
        test_app.dependency_overrides.clear()

    def test_format_unavailable_pdf_returns_400_without_dispatch(
        self, test_app, client, mock_auth_user
    ):
        """PDF recognized but unavailable (no WeasyPrint) → 400, no doomed task."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        with (
            patch(
                "app.api.v1.extractions.get_available_export_formats",
                return_value=frozenset({"docx", "xlsx"}),
            ),
            patch(
                "app.api.v1.extractions.generate_export.apply_async",
            ) as apply_async,
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/pdf",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not available" in response.json()["detail"]
        apply_async.assert_not_called()
        test_app.dependency_overrides.clear()

    def test_template_changes_export_cache_key_and_task_id(
        self, test_app, client, mock_auth_user
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )
        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )
        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = False
        mock_task = MagicMock()
        mock_task.id = "task-template"

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
            patch(
                "app.api.v1.extractions.generate_export.apply_async",
                return_value=mock_task,
            ) as apply_async,
        ):
            client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )
            client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "office"},
            )

        checked_keys = [
            call.args[0] for call in mock_object_storage.object_exists.call_args_list
        ]
        task_ids = [call.kwargs["task_id"] for call in apply_async.call_args_list]
        assert checked_keys[0] != checked_keys[1]
        assert "/commercial/" in checked_keys[0]
        assert "/office/" in checked_keys[1]
        assert task_ids[0] != task_ids[1]
        test_app.dependency_overrides.clear()

    def test_returns_cached_url(self, test_app, client, mock_auth_user):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = True
        mock_object_storage.generate_presigned_url.return_value = (
            "https://cached-url.example.com"
        )

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["url"] == "https://cached-url.example.com"
        assert data["format"] == "docx"
        test_app.dependency_overrides.clear()

    def test_cache_hit_returns_version_token(self, test_app, client, mock_auth_user):
        """The cache-hit response must surface the version so the client can
        request the exact file via the download endpoint (edit-after-export)."""
        from app.core.dependencies import get_optional_user
        from app.services.object_storage import ObjectStorageService

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        updated_at = "2026-02-15T10:30:00+00:00"
        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
                "updated_at": updated_at,
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = True
        mock_object_storage.generate_presigned_url.return_value = "https://c.example"

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["version"] == ObjectStorageService.export_version_token(
            updated_at
        )
        test_app.dependency_overrides.clear()

    def test_download_export_streams_from_api_origin(
        self, test_app, client, mock_auth_user
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = True
        mock_object_storage.stream_file.return_value = (
            iter([b"docx-bytes"]),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            response = client.get(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download"
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.content == b"docx-bytes"
        assert (
            response.headers["content-type"]
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        assert (
            response.headers["content-disposition"]
            == 'attachment; filename="lease-abstraction-report.docx"'
        )
        test_app.dependency_overrides.clear()

    def test_download_export_uses_explicit_version_query(
        self, test_app, client, mock_auth_user
    ):
        """An explicit ?version= must pin the streamed key to that version.

        Fixes the edit-after-export 404 race: the record's ``updated_at`` may
        have moved on (a field was edited) since the export was generated, but
        the download must stream the exact file produced for the requested
        version, not a key recomputed from the now-newer ``updated_at``.
        """
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
                # Post-edit timestamp — different from the export's version.
                "updated_at": "2026-02-15T10:30:00+00:00",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = True
        mock_object_storage.stream_file.return_value = (iter([b"docx-bytes"]), None)

        explicit_version = "v20260101000000"
        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            response = client.get(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download"
                f"?version={explicit_version}"
            )

        assert response.status_code == status.HTTP_200_OK
        streamed_key = mock_object_storage.stream_file.call_args.args[0]
        assert explicit_version in streamed_key
        # Must NOT fall back to the post-edit updated_at token.
        assert "20260215" not in streamed_key
        test_app.dependency_overrides.clear()

    def test_download_export_sanitizes_malicious_version(
        self, test_app, client, mock_auth_user
    ):
        """A crafted ?version= must be stripped to alphanumerics (no traversal)."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
                "updated_at": "2026-02-15T10:30:00+00:00",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = True
        mock_object_storage.stream_file.return_value = (iter([b"x"]), None)

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            response = client.get(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download"
                "?version=../../etc/passwd"
            )

        assert response.status_code == status.HTTP_200_OK
        streamed_key = mock_object_storage.stream_file.call_args.args[0]
        assert ".." not in streamed_key
        assert "/etc/passwd" not in streamed_key
        test_app.dependency_overrides.clear()

    def test_download_export_requires_authentication(self, client):
        response = client.get(f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_download_export_unpaid_returns_403(self, test_app, client, mock_auth_user):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "unpaid",
            }
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.get(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download"
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        test_app.dependency_overrides.clear()

    def test_download_export_wrong_owner_returns_404(
        self, test_app, client, mock_auth_user
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": "other-user-999",
                "payment_status": "paid",
            }
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.get(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download"
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()

    def test_download_export_missing_object_returns_404(
        self, test_app, client, mock_auth_user
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )
        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.return_value = False

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            response = client.get(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download"
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()

    def test_download_export_storage_head_failure_returns_503(
        self, test_app, client, mock_auth_user
    ):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": USER_UUID,
                "payment_status": "paid",
            }
        )
        mock_object_storage = MagicMock()
        mock_object_storage.object_exists.side_effect = ClientError(
            {
                "Error": {
                    "Code": "503",
                    "Message": "Service Unavailable",
                }
            },
            "HeadObject",
        )

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            response = client.get(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx/download"
            )

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "temporarily unavailable" in response.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_extraction_not_found_returns_404(self, test_app, client, mock_auth_user):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(None)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.post(
                f"/api/v1/extractions/{MISSING_EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()

    def test_wrong_owner_returns_404(self, test_app, client, mock_auth_user):
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )

        mock_db = _build_endpoint_mock_db(
            {
                "id": EXPORT_UUID,
                "user_id": "other-user-999",
                "payment_status": "paid",
            }
        )

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.post(
                f"/api/v1/extractions/{EXPORT_UUID}/export/docx",
                json={"template": "commercial"},
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()
