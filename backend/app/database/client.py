"""Neon database client configuration.

Provides service role client and per-request authenticated client
via direct PostgreSQL connections (psycopg) instead of PostgREST.
"""

import logging

from app.core.config import settings
from app.database.pg_client import PgNeonDB, reset_pools

logger = logging.getLogger(__name__)

# Type alias for backwards compatibility — all call sites reference NeonDB
NeonDB = PgNeonDB


class NeonClientManager:
    """Manages Neon PostgreSQL client instances with class-level caching."""

    _service_client: NeonDB | None = None

    @classmethod
    def get_service_client(cls) -> NeonDB:
        """Return the service role PostgreSQL client.

        Uses the neondb_owner role from the connection string,
        which bypasses RLS. Use only for admin operations that require
        cross-user access (e.g. anonymous session management, webhooks).
        """
        if cls._service_client is None:
            cls._service_client = NeonDB(settings.neon_database_url)
        return cls._service_client

    @classmethod
    def reset_clients(cls) -> None:
        """Clear cached client instances and connection pools. Used in tests only."""
        cls._service_client = None
        reset_pools()


def get_db() -> NeonDB:
    """FastAPI dependency: returns the service role Neon client."""
    return NeonClientManager.get_service_client()


def get_db_admin() -> NeonDB:
    """FastAPI dependency: returns the service role Neon client (admin)."""
    return NeonClientManager.get_service_client()


def get_authenticated_client(token: str) -> NeonDB:
    """Return a database client for authenticated user operations.

    Since we now use direct Postgres (bypassing PostgREST), there is no
    per-request JWT scoping. The service client is returned instead.
    RLS is enforced at the application layer via user_id checks in queries.
    """
    return NeonClientManager.get_service_client()
