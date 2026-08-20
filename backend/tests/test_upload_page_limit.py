"""Tests for the page-count guard on POST /api/v1/extractions/upload.

Verifies that documents whose page count exceeds MAX_PDF_PAGES are rejected at
upload time with a 422 response and a clear error message, and that the object
storage upload and pipeline dispatch are not invoked when the guard fires.
"""

from __future__ import annotations

import io
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.constants import MAX_PDF_PAGES
from app.main import create_app


def _make_pdf_bytes(page_count: int) -> bytes:
    """Build a real, valid PDF with the requested number of pages.

    pypdf is used at the upload endpoint to count pages, so the file must
    parse successfully — we cannot use a magic-bytes stub here.
    """
    import pypdf

    writer = pypdf.PdfWriter()
    for _ in range(page_count):
        writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


@pytest.fixture
def app_client() -> TestClient:
    return TestClient(create_app())


def _mock_session_and_db(
    session_id: str = "00000000-0000-0000-0000-000000000099",
):
    """Return a mock service client that handles session lookup + extraction insert."""
    mock_client = MagicMock()

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
    return mock_client


class TestUploadRejectsOversizedPdfPageCount:
    def test_pdf_over_max_pages_returns_422(self, app_client: TestClient) -> None:
        """A real PDF with > MAX_PDF_PAGES pages must be rejected with 422."""
        pdf_bytes = _make_pdf_bytes(MAX_PDF_PAGES + 1)
        mock_db = _mock_session_and_db()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "should-not-be-called"

        with (
            patch(
                "app.database.client.NeonClientManager.get_service_client",
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
                files=[("file", ("big.pdf", io.BytesIO(pdf_bytes), "application/pdf"))],
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 422, resp.text
        detail = resp.json()["detail"].lower()
        assert str(MAX_PDF_PAGES) in detail
        assert "page" in detail
        mock_object_storage.upload_file.assert_not_called()
        mock_pipeline.assert_not_called()

    def test_pdf_at_max_pages_is_accepted(self, app_client: TestClient) -> None:
        """A PDF with exactly MAX_PDF_PAGES pages must still be accepted."""
        pdf_bytes = _make_pdf_bytes(MAX_PDF_PAGES)
        mock_db = _mock_session_and_db()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "ok-key"

        with (
            patch(
                "app.database.client.NeonClientManager.get_service_client",
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
                files=[("file", ("ok.pdf", io.BytesIO(pdf_bytes), "application/pdf"))],
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 201, resp.text
        mock_object_storage.upload_file.assert_called_once()

    def test_unparseable_pdf_does_not_block_upload(
        self, app_client: TestClient
    ) -> None:
        """A PDF that pypdf can't parse must not block upload — the page guard
        is a fast-fail short-circuit; corrupted content is allowed through so
        the downstream pipeline produces a meaningful failure message instead
        of a 422 that hides the real issue.
        """
        stub = b"%PDF-1.4 fake content for testing"
        mock_db = _mock_session_and_db()
        mock_object_storage = MagicMock()
        mock_object_storage.upload_file.return_value = "ok-key"

        with (
            patch(
                "app.database.client.NeonClientManager.get_service_client",
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
                files=[("file", ("stub.pdf", io.BytesIO(stub), "application/pdf"))],
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 201, resp.text
