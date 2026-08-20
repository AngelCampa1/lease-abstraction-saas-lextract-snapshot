"""Integration tests for the upload-to-results lifecycle.

Tests the complete flow: upload -> pipeline -> teaser -> pay -> full results.

BUG #11 (NEW): _build_teaser_fields extracts raw values from extracted_data
(which may be int/float) but TeaserFieldValue.value is typed str | None.
Numeric field values (like base_rent_annual=120000) cause Pydantic
ValidationError at serialization time.
"""

from unittest.mock import MagicMock, patch

from tests.integration.conftest import (
    EXTRACTION_ID,
    AuthContext,
    auth_headers_for,
    build_extraction,
    build_user,
)


def _mock_extraction_db(extraction: dict):
    mock_db = MagicMock()
    select_chain = MagicMock()
    select_chain.eq.return_value = select_chain
    select_chain.is_.return_value = select_chain
    select_chain.single.return_value = select_chain
    select_chain.execute.return_value = MagicMock(data=extraction)
    mock_db.table.return_value.select.return_value = select_chain
    return mock_db


class TestTeaserView:
    def test_teaser_returns_limited_fields_string_values(self, app_client, rsa_keys):
        """GET /extractions/{id}/teaser returns 5 visible fields (all string values)."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        # Use string values for all teaser fields to avoid the Pydantic bug
        extraction = build_extraction(
            payment_status="unpaid",
            status="complete",
            extracted_data={
                "landlord_legal_name": {
                    "value": "ACME Corp",
                    "confidence": 0.95,
                    "source_text": "ACME",
                },
                "tenant_legal_name": {
                    "value": "Tenant Inc",
                    "confidence": 0.90,
                    "source_text": "Tenant",
                },
                "premises_address": {
                    "value": "123 Main St",
                    "confidence": 0.88,
                    "source_text": "123",
                },
                "commencement_date": {
                    "value": "2026-01-01",
                    "confidence": 0.92,
                    "source_text": "Jan 1",
                },
                "base_rent_annual": {
                    "value": "$120,000",
                    "confidence": 0.85,
                    "source_text": "$120,000",
                },
            },
        )
        mock_db = _mock_extraction_db(extraction)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert "visible_fields" in data
        assert len(data["visible_fields"]) == 5
        assert "confidence_distribution" in data
        assert "red_flag_count" in data

    def test_teaser_numeric_value_returns_200_as_string(self, app_client, rsa_keys):
        """Numeric values in extracted_data are converted to strings for teaser."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        # Use the default extraction which has base_rent_annual as int (120000)
        extraction = build_extraction(payment_status="unpaid", status="complete")
        mock_db = _mock_extraction_db(extraction)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        # Find base_rent_annual in visible_fields
        rent_field = next(
            (
                f
                for f in data["visible_fields"]
                if f["field_name"] == "base_rent_annual"
            ),
            None,
        )
        assert rent_field is not None
        assert rent_field["value"] == "120000"  # Converted to string

    def test_teaser_with_no_extracted_data_returns_empty_fields(
        self, app_client, rsa_keys
    ):
        """Edge case: extraction complete but extracted_data is empty/null."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        extraction = build_extraction(
            payment_status="unpaid",
            status="complete",
            extracted_data={},
            confidence_scores={},
        )
        mock_db = _mock_extraction_db(extraction)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        # Should still return valid response with empty/null fields
        assert isinstance(data["visible_fields"], list)


class TestFullResultsPaymentGate:
    def test_full_results_requires_payment(self, app_client, rsa_keys):
        """GET /extractions/{id} with payment_status='unpaid' returns 403."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        extraction = build_extraction(payment_status="unpaid", status="complete")
        mock_db = _mock_extraction_db(extraction)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}",
                    headers=headers,
                )

        assert resp.status_code == 403

    def test_full_results_after_payment_returns_all_data(self, app_client, rsa_keys):
        """GET /extractions/{id} with payment_status='paid' returns full data."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        extraction = build_extraction(payment_status="paid", status="complete")
        mock_db = _mock_extraction_db(extraction)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}",
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert "extracted_data" in data
        assert "confidence_scores" in data
        assert "red_flags" in data


class TestSoftDelete:
    def test_delete_sets_deleted_at(self, app_client, rsa_keys):
        """DELETE /extractions/{id} sets deleted_at, doesn't hard-delete."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        extraction = build_extraction()

        updates: list[dict] = []

        mock_db = MagicMock()

        def route_table(name):
            t = MagicMock()
            select_chain = MagicMock()
            select_chain.eq.return_value = select_chain
            select_chain.is_.return_value = select_chain
            select_chain.single.return_value = select_chain
            select_chain.execute.return_value = MagicMock(data=extraction)
            t.select.return_value = select_chain

            def capture_update(data):
                updates.append(data)
                chain = MagicMock()
                chain.eq.return_value = chain
                chain.execute.return_value = MagicMock(data=[data])
                return chain

            t.update = capture_update

            return t

        mock_db.table = route_table
        mock_object_storage = MagicMock()

        with AuthContext(rsa_keys, user):
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
                resp = app_client.delete(
                    f"/api/v1/extractions/{EXTRACTION_ID}",
                    headers=headers,
                )

        assert resp.status_code == 204
        mock_object_storage.delete_file.assert_called()
        assert len(updates) >= 1
        assert "deleted_at" in updates[0]


class TestUploadValidation:
    def test_non_pdf_rejected(self, app_client, rsa_keys):
        """Upload a non-PDF file should be rejected."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        with AuthContext(rsa_keys, user):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files={"file": ("test.txt", b"hello world", "text/plain")},
                headers=headers,
            )

        assert resp.status_code == 400

    def test_oversized_file_rejected(self, app_client, rsa_keys):
        """Upload a file > 50MB should be rejected."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        # Create bytes that exceed 50MB (just check the validation, not actually send 50MB)
        # The endpoint reads the file and checks size
        large_pdf = b"%PDF-" + b"\x00" * (50 * 1024 * 1024 + 1)

        with AuthContext(rsa_keys, user):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files={"file": ("big.pdf", large_pdf, "application/pdf")},
                headers=headers,
            )

        assert resp.status_code == 400

    def test_spoofed_content_type_wrong_magic_bytes(self, app_client, rsa_keys):
        """PDF content-type but non-PDF bytes should be rejected."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        with AuthContext(rsa_keys, user):
            resp = app_client.post(
                "/api/v1/extractions/upload",
                files={"file": ("fake.pdf", b"not-a-pdf-content", "application/pdf")},
                headers=headers,
            )

        assert resp.status_code == 400
