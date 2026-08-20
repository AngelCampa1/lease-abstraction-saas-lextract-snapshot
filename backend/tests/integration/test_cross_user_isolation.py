"""Integration tests for cross-user data isolation.

Verifies that ownership checks prevent User A from accessing User B's
extractions across all endpoints.
"""

from unittest.mock import MagicMock, patch

from tests.integration.conftest import (
    EXTRACTION_B_ID,
    USER_A_ID,
    USER_B_ID,
    AuthContext,
    auth_headers_for,
    build_extraction,
    build_user,
)


def _mock_extraction_db(extraction: dict):
    """Build mock DB that returns a specific extraction."""
    mock_db = MagicMock()
    select_chain = MagicMock()
    select_chain.eq.return_value = select_chain
    select_chain.is_.return_value = select_chain
    select_chain.single.return_value = select_chain
    select_chain.execute.return_value = MagicMock(data=extraction)
    mock_db.table.return_value.select.return_value = select_chain
    return mock_db


class TestCrossUserIsolation:
    """User A should get 404 (not 403) when accessing User B's extractions."""

    def _make_request(self, app_client, rsa_keys, method, path, **kwargs):
        """Make an authenticated request as User A."""
        user_a = build_user(user_id=USER_A_ID)
        headers = auth_headers_for(rsa_keys, USER_A_ID)

        # Extraction owned by User B
        extraction_b = build_extraction(
            extraction_id=EXTRACTION_B_ID,
            user_id=USER_B_ID,
        )
        mock_db = _mock_extraction_db(extraction_b)

        with AuthContext(rsa_keys, user_a):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                fn = getattr(app_client, method)
                return fn(path, headers=headers, **kwargs)

    def test_user_a_cannot_see_user_b_teaser(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "get",
            f"/api/v1/extractions/{EXTRACTION_B_ID}/teaser",
        )
        assert resp.status_code == 404

    def test_user_a_cannot_see_user_b_full_results(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "get",
            f"/api/v1/extractions/{EXTRACTION_B_ID}",
        )
        assert resp.status_code == 404

    def test_user_a_cannot_delete_user_b_extraction(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "delete",
            f"/api/v1/extractions/{EXTRACTION_B_ID}",
        )
        assert resp.status_code == 404

    def test_user_a_cannot_edit_user_b_field(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "patch",
            f"/api/v1/extractions/{EXTRACTION_B_ID}/fields",
            json={"field_name": "landlord_legal_name", "value": "Hacked"},
        )
        assert resp.status_code == 404

    def test_user_a_cannot_see_user_b_edit_history(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "get",
            f"/api/v1/extractions/{EXTRACTION_B_ID}/edits",
        )
        assert resp.status_code == 404

    def test_user_a_cannot_get_user_b_document_url(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "get",
            f"/api/v1/extractions/{EXTRACTION_B_ID}/document-url",
        )
        assert resp.status_code == 404

    def test_user_a_cannot_export_user_b_extraction(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "post",
            f"/api/v1/extractions/{EXTRACTION_B_ID}/export/docx",
        )
        assert resp.status_code == 404

    def test_user_a_cannot_get_user_b_camaudit_payload(self, app_client, rsa_keys):
        resp = self._make_request(
            app_client,
            rsa_keys,
            "get",
            f"/api/v1/extractions/{EXTRACTION_B_ID}/camaudit-payload",
        )
        assert resp.status_code == 404
