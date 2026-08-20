"""Integration tests for error handling across service boundaries.

BUG #3: _fetch_extraction catches all exceptions (including DB connection
errors) and returns 404 "Extraction not found" — masking infrastructure
failures from users and monitoring.
"""

from unittest.mock import MagicMock, patch

from tests.integration.conftest import (
    EXTRACTION_ID,
    AuthContext,
    auth_headers_for,
    build_user,
)


class TestFetchExtractionErrorMasking:
    """BUG #3: DB errors masked as 404."""

    def test_db_connection_error_returns_503(self, app_client, rsa_keys):
        """When the database is down, _fetch_extraction returns 503."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.side_effect = ConnectionError(
            "Database connection refused"
        )

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}",
                    headers=headers,
                )

        assert resp.status_code == 503
        assert resp.json()["detail"] == "Service temporarily unavailable"

    def test_db_timeout_also_masked_as_404(self, app_client, rsa_keys):
        """Timeout errors are also caught by the same except block."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.side_effect = TimeoutError(
            "Query timed out after 30s"
        )

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}",
                    headers=headers,
                )

        # Fixed: TimeoutError returns 503
        assert resp.status_code == 503

    def test_real_not_found_still_returns_404(self, app_client, rsa_keys):
        """Verify that legitimate 'not found' still works correctly."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        # PostgREST .single() raises when no row found
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    f"/api/v1/extractions/{EXTRACTION_ID}",
                    headers=headers,
                )

        assert resp.status_code == 404
        assert resp.json()["detail"] == "Extraction not found"


class TestProfileUpdateEmptyBody:
    def test_empty_body_returns_400(self, app_client, rsa_keys):
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        with AuthContext(rsa_keys, user):
            resp = app_client.patch(
                "/api/v1/user/profile",
                json={},
                headers=headers,
            )

        assert resp.status_code == 400
        assert "No fields" in resp.json()["detail"]
