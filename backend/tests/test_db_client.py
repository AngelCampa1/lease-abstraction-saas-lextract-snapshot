"""Tests for the Neon database client manager."""

from unittest.mock import MagicMock, patch

from app.database.client import (
    NeonClientManager,
    NeonDB,
    get_authenticated_client,
    get_db,
    get_db_admin,
)
from app.database.pg_client import PgNeonDB, QueryBuilder


class TestNeonDB:
    def test_table_returns_query_builder(self) -> None:
        db = NeonDB("postgresql://example")
        result = db.table("users")
        assert isinstance(result, QueryBuilder)
        assert result._table == "users"

    def test_from_returns_query_builder(self) -> None:
        db = NeonDB("postgresql://example")
        result = db.from_("users")
        assert isinstance(result, QueryBuilder)
        assert result._table == "users"

    def test_auth_is_noop_for_compatibility(self) -> None:
        db = NeonDB("postgresql://example")
        assert db.auth("some-token") is None

    def test_neondb_alias_points_to_pg_client(self) -> None:
        db = NeonDB("postgresql://example")
        assert isinstance(db, PgNeonDB)


class TestNeonClientManager:
    def setup_method(self) -> None:
        NeonClientManager.reset_clients()

    @patch("app.database.client.NeonDB")
    def test_get_service_client_returns_neon_db(self, mock_cls: MagicMock) -> None:
        mock_instance = MagicMock(spec=PgNeonDB)
        mock_cls.return_value = mock_instance
        client = NeonClientManager.get_service_client()
        assert client is mock_instance

    @patch("app.database.client.NeonDB")
    def test_get_service_client_caches(self, mock_cls: MagicMock) -> None:
        mock_instance = MagicMock(spec=PgNeonDB)
        mock_cls.return_value = mock_instance
        c1 = NeonClientManager.get_service_client()
        c2 = NeonClientManager.get_service_client()
        assert c1 is c2
        assert mock_cls.call_count == 1

    @patch("app.database.client.reset_pools")
    def test_reset_clears_cache(self, mock_reset_pools: MagicMock) -> None:
        NeonClientManager._service_client = MagicMock(spec=PgNeonDB)
        NeonClientManager.reset_clients()
        assert NeonClientManager._service_client is None
        mock_reset_pools.assert_called_once()


class TestGetDb:
    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_returns_service_client(self, mock_get_service_client: MagicMock) -> None:
        mock_client = MagicMock(spec=PgNeonDB)
        mock_get_service_client.return_value = mock_client
        assert get_db() is mock_client


class TestGetDbAdmin:
    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_returns_service_client(self, mock_get_service_client: MagicMock) -> None:
        mock_client = MagicMock(spec=PgNeonDB)
        mock_get_service_client.return_value = mock_client
        assert get_db_admin() is mock_client


class TestGetAuthenticatedClient:
    def setup_method(self) -> None:
        NeonClientManager.reset_clients()

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_returns_service_client(self, mock_get_service_client: MagicMock) -> None:
        mock_client = MagicMock(spec=PgNeonDB)
        mock_get_service_client.return_value = mock_client
        assert get_authenticated_client("fake-jwt-token") is mock_client

    @patch("app.database.client.NeonClientManager.get_service_client")
    def test_ignores_token_value(self, mock_get_service_client: MagicMock) -> None:
        mock_client = MagicMock(spec=PgNeonDB)
        mock_get_service_client.return_value = mock_client
        c1 = get_authenticated_client("token-a")
        c2 = get_authenticated_client("token-b")
        assert c1 is mock_client
        assert c2 is mock_client
