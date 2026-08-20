"""Integration tests for pagination edge cases.

BUG #4: list_extractions has no validation on limit/offset parameters.
- limit=0 produces range(0, -1) which is invalid for PostgREST
- Negative offset is passed directly through
"""

from unittest.mock import MagicMock, patch

from tests.integration.conftest import (
    AuthContext,
    auth_headers_for,
    build_user,
)


class TestListExtractionsPagination:
    """BUG #4: No validation on limit and offset parameters."""

    def _mock_db_list(self, rows, total=None):
        """Build a mock DB that handles the list query chain."""
        mock_db = MagicMock()
        if total is None:
            total = len(rows)

        # Chain: .table().select(cols, count="exact").eq().is_().order().limit().offset().execute()
        chain = MagicMock()
        chain.eq.return_value = chain
        chain.is_.return_value = chain
        chain.gte.return_value = chain
        chain.lt.return_value = chain
        chain.order.return_value = chain
        chain.limit.return_value = chain
        chain.offset.return_value = chain
        result = MagicMock()
        result.data = rows
        result.count = total
        chain.execute.return_value = result
        mock_db.table.return_value.select.return_value = chain
        return mock_db, chain

    def test_empty_list_returns_zero_total(self, app_client, rsa_keys):
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        mock_db, chain = self._mock_db_list([], total=0)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    "/api/v1/extractions",
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_offset_beyond_total_returns_empty_items(self, app_client, rsa_keys):
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        mock_db, chain = self._mock_db_list([], total=5)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    "/api/v1/extractions?offset=100&limit=20",
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert data["items"] == []

    def test_limit_zero_returns_422(self, app_client, rsa_keys):
        """limit=0 is rejected with 422 validation error."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        with AuthContext(rsa_keys, user):
            resp = app_client.get(
                "/api/v1/extractions?limit=0",
                headers=headers,
            )

        assert resp.status_code == 422

    def test_negative_offset_returns_422(self, app_client, rsa_keys):
        """Negative offset is rejected with 422 validation error."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        with AuthContext(rsa_keys, user):
            resp = app_client.get(
                "/api/v1/extractions?offset=-5",
                headers=headers,
            )

        assert resp.status_code == 422

    def test_large_valid_pagination_works(self, app_client, rsa_keys):
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        rows = [
            {
                "id": str(i),
                "document_filename": f"lease_{i}.pdf",
                "status": "complete",
                "payment_status": "paid",
                "property_type": "office",
                "created_at": "2026-01-15T10:00:00Z",
            }
            for i in range(5)
        ]
        mock_db, chain = self._mock_db_list(rows, total=100)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    "/api/v1/extractions?offset=50&limit=5",
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 100
        assert len(data["items"]) == 5

        # Verify limit/offset were called correctly (migrated from PostgREST .range())
        chain.limit.assert_called_once_with(5)
        chain.offset.assert_called_once_with(50)

    def test_valid_date_range_filters_applied(self, app_client, rsa_keys):
        """Valid date_from/date_to bound the query with gte/lt on created_at."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        mock_db, chain = self._mock_db_list([], total=0)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    "/api/v1/extractions?date_from=2026-01-01&date_to=2026-01-31",
                    headers=headers,
                )

        assert resp.status_code == 200
        chain.gte.assert_called_once_with("created_at", "2026-01-01")
        # date_to is exclusive on the following day.
        chain.lt.assert_called_once_with("created_at", "2026-02-01")

    def test_invalid_date_from_returns_400(self, app_client, rsa_keys):
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        mock_db, _ = self._mock_db_list([], total=0)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    "/api/v1/extractions?date_from=not-a-date",
                    headers=headers,
                )

        assert resp.status_code == 400
        assert "date_from" in resp.json()["detail"]

    def test_invalid_date_to_returns_400(self, app_client, rsa_keys):
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        mock_db, _ = self._mock_db_list([], total=0)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.get(
                    "/api/v1/extractions?date_to=31-01-2026",
                    headers=headers,
                )

        assert resp.status_code == 400
        assert "date_to" in resp.json()["detail"]
