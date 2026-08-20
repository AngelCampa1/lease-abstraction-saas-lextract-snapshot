"""Tests for GET /api/v1/user/dashboard endpoint."""

import time
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.core.security import jwks_cache
from app.main import create_app
from app.models.enums import ExtractionStatus


def _generate_rsa_keypair() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def rsa_keys() -> tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    private = _generate_rsa_keypair()
    return private, private.public_key()


def _make_token(
    private_key: rsa.RSAPrivateKey,
    sub: str = "00000000-0000-0000-0000-000000000001",
) -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "role": "authenticated",
    }
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


@pytest.fixture
def app_client() -> TestClient:
    app = create_app()
    return TestClient(app)


USER_ROW = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "user@example.com",
    "full_name": "Test User",
    "company": "ACME Corp",
    "role": "broker",
    "credits_balance": 5,
    "stripe_customer_id": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}

EXTRACTION_ROWS = [
    {
        "id": "aaaaaaaa-0000-0000-0000-000000000001",
        "document_filename": "lease1.pdf",
        "status": "complete",
        "payment_status": "paid",
        "created_at": "2026-03-15T10:00:00Z",
    },
    {
        "id": "aaaaaaaa-0000-0000-0000-000000000002",
        "document_filename": "lease2.pdf",
        "status": "extracting",
        "payment_status": "unpaid",
        "created_at": "2026-03-14T09:00:00Z",
    },
    {
        "id": "aaaaaaaa-0000-0000-0000-000000000003",
        "document_filename": "lease3.pdf",
        "status": "failed",
        "payment_status": "unpaid",
        "created_at": "2026-03-13T08:00:00Z",
    },
    {
        "id": "aaaaaaaa-0000-0000-0000-000000000004",
        "document_filename": "lease4.pdf",
        "status": "scoring",
        "payment_status": "unpaid",
        "created_at": "2026-03-12T07:00:00Z",
    },
    {
        "id": "aaaaaaaa-0000-0000-0000-000000000005",
        "document_filename": "lease5.pdf",
        "status": "complete",
        "payment_status": "paid",
        "created_at": "2026-03-11T06:00:00Z",
    },
]

# Individual status rows (one per extraction) â€” PostgREST returns flat rows, not grouped
STATUS_ROWS = [
    {"status": "complete"},
    {"status": "complete"},
    {"status": "extracting"},
    {"status": "failed"},
    {"status": "scoring"},
]


def _mock_current_user_lookup(mock_rls: MagicMock, user_row: dict[str, object]) -> None:
    query = mock_rls.table.return_value.select.return_value.eq.return_value
    query.maybe_single.return_value.execute.return_value = MagicMock(data=user_row)
    query.single.return_value.execute.return_value = MagicMock(data=user_row)


def _setup_auth_mocks(
    rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
) -> tuple[dict[str, str], MagicMock, MagicMock]:
    private_key, public_key = rsa_keys
    token = _make_token(private_key)
    headers = {"Authorization": f"Bearer {token}"}

    mock_jwk = MagicMock()
    mock_jwk.key = public_key

    mock_rls = MagicMock()
    _mock_current_user_lookup(mock_rls, USER_ROW.copy())

    return headers, mock_jwk, mock_rls


def _build_service_mock(
    status_rows: list[dict[str, object]] | None = None,
    recent_extractions: list[dict[str, object]] | None = None,
) -> MagicMock:
    """Build a mock service client that handles all dashboard DB queries.

    The dashboard endpoint now makes 5 count-only queries + 1 recent query:
    1. Total count: select("id", count="exact").eq(...).is_(...).limit(0)
    2. Completed count: ...eq("status", "complete").limit(0)
    3. Failed count: ...eq("status", "failed").limit(0)
    4. Processing count: ...in_("status", [...]).limit(0)
    5. Recent extractions: select("id, ...").eq(...).order(...).limit(5)
    """
    if status_rows is None:
        status_rows = STATUS_ROWS
    if recent_extractions is None:
        recent_extractions = EXTRACTION_ROWS

    # Pre-compute expected counts from status_rows
    total = len(status_rows)
    completed = sum(1 for r in status_rows if r["status"] == "complete")
    failed = sum(1 for r in status_rows if r["status"] == "failed")
    processing_statuses = {"uploading", "extracting", "scoring"}
    processing = sum(1 for r in status_rows if r["status"] in processing_statuses)

    mock_admin = MagicMock()
    call_counter = {"n": 0}

    def table_dispatch(table_name: str) -> MagicMock:
        mock_table = MagicMock()

        def select_dispatch(columns: str, **kwargs: object) -> MagicMock:
            mock_select = MagicMock()
            call_index = call_counter["n"]
            call_counter["n"] += 1

            # Build a deeply-chainable mock that returns the right count
            # regardless of how many .eq() / .is_() / .in_() / .limit() calls
            count_map = {0: total, 1: completed, 2: failed, 3: processing}

            if call_index < 4:
                # Count-only queries â€” deep chain always returns count
                count_val = count_map.get(call_index, 0)
                result = MagicMock(data=[], count=count_val)
                # Make every chained method return a mock whose .execute returns result
                chain = MagicMock()
                chain.execute.return_value = result
                chain.limit.return_value = chain
                chain.eq.return_value = chain
                chain.is_.return_value = chain
                chain.in_.return_value = chain
                mock_select.eq.return_value = chain
                mock_select.is_.return_value = chain
            else:
                # Recent extractions query
                result = MagicMock(data=recent_extractions)
                chain = MagicMock()
                chain.execute.return_value = result
                chain.limit.return_value = chain
                chain.order.return_value = chain
                chain.eq.return_value = chain
                chain.is_.return_value = chain
                mock_select.eq.return_value = chain

            return mock_select

        mock_table.select.side_effect = select_dispatch
        return mock_table

    mock_admin.table.side_effect = table_dispatch
    return mock_admin


class TestGetDashboard:
    """Tests for GET /api/v1/user/dashboard."""

    def test_dashboard_returns_200_with_data(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        assert resp.status_code == 200
        data = resp.json()
        assert "extraction_count" in data
        assert "credit_balance" in data
        assert "recent_extractions" in data
        assert "quick_stats" in data

    def test_dashboard_credit_balance_from_user(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        data = resp.json()
        assert data["credit_balance"] == 5

    def test_dashboard_quick_stats_aggregation(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        stats = resp.json()["quick_stats"]
        assert stats["completed"] == 2
        assert stats["processing"] == 2  # extracting + scoring
        assert stats["failed"] == 1

    def test_dashboard_recent_extractions_structure(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        extractions = resp.json()["recent_extractions"]
        assert len(extractions) == 5
        first = extractions[0]
        assert "id" in first
        assert "document_filename" in first
        assert "status" in first
        assert "payment_status" in first
        assert "created_at" in first

    def test_dashboard_empty_state_new_user(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        # New user with zero credits
        user_row = USER_ROW.copy()
        user_row["credits_balance"] = 0
        _mock_current_user_lookup(mock_rls, user_row)

        mock_admin = _build_service_mock(
            status_rows=[],
            recent_extractions=[],
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["extraction_count"] == 0
        assert data["credit_balance"] == 0
        assert data["recent_extractions"] == []
        assert data["quick_stats"] == {
            "completed": 0,
            "processing": 0,
            "failed": 0,
        }

    def test_dashboard_requires_auth(self, app_client: TestClient) -> None:
        resp = app_client.get("/api/v1/user/dashboard")
        assert resp.status_code == 401

    def test_dashboard_rejects_invalid_token(self, app_client: TestClient) -> None:
        resp = app_client.get(
            "/api/v1/user/dashboard",
            headers={"Authorization": "Bearer invalid-token"},
        )
        # Fail-closed auth: an invalid JWT plus an unreachable Neon auth
        # service yields 503 (retry), whereas a positive rejection from a
        # reachable auth service yields 401. Both are correct "not signed
        # in" outcomes for this endpoint.
        assert resp.status_code in (401, 503)

    def test_dashboard_db_error_returns_500(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        mock_admin = MagicMock()
        # First count-only query fails â€” deeply chained mock
        chain = MagicMock()
        chain.execute.side_effect = Exception("DB connection lost")
        chain.limit.return_value = chain
        chain.eq.return_value = chain
        chain.is_.return_value = chain
        mock_admin.table.return_value.select.return_value.eq.return_value = chain

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        assert resp.status_code == 500

    def test_dashboard_only_scoring_status_counts_as_processing(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        """Scoring status should count as 'processing' in quick_stats."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock(
            status_rows=[
                {"status": "scoring"},
                {"status": "scoring"},
                {"status": "scoring"},
                {"status": "complete"},
            ],
            recent_extractions=[],
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        stats = resp.json()["quick_stats"]
        assert stats["processing"] == 3
        assert stats["completed"] == 1
        assert stats["failed"] == 0

    def test_dashboard_uploading_counts_as_processing(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        """Uploading status should count as 'processing' in quick_stats."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock(
            status_rows=[
                {"status": "uploading"},
                {"status": "uploading"},
            ],
            recent_extractions=[],
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        stats = resp.json()["quick_stats"]
        assert stats["processing"] == 2

    def test_dashboard_excludes_soft_deleted_extractions(
        self,
        app_client: TestClient,
        rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    ) -> None:
        """BUG #16: Dashboard must filter out soft-deleted extractions."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        # The mock service client tracks which chain methods are called
        mock_admin = MagicMock()
        is_calls: list[tuple] = []

        def table_dispatch(table_name: str) -> MagicMock:
            mock_table = MagicMock()

            def select_dispatch(columns: str, **kwargs: object) -> MagicMock:
                mock_select = MagicMock()
                eq_mock = MagicMock()

                def track_is(*args, **kw):
                    is_calls.append(args)
                    is_result = MagicMock()
                    is_result.execute.return_value = MagicMock(data=[], count=0)
                    is_result.limit.return_value.execute.return_value = MagicMock(
                        data=[], count=0
                    )
                    is_result.eq.return_value = is_result
                    is_result.in_.return_value = is_result
                    is_result.order.return_value.limit.return_value.execute.return_value = MagicMock(
                        data=[]
                    )
                    is_result.order.return_value = is_result
                    return is_result

                eq_mock.is_ = track_is
                mock_select.eq.return_value = eq_mock
                return mock_select

            mock_table.select.side_effect = select_dispatch
            return mock_table

        mock_admin.table.side_effect = table_dispatch

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.user.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get("/api/v1/user/dashboard", headers=headers)

        assert resp.status_code == 200
        # All 5 queries must have called .is_("deleted_at", "null")
        assert (
            len(is_calls) >= 5
        ), "All dashboard queries should filter deleted_at IS NULL"
        for call_args in is_calls:
            assert call_args == (
                "deleted_at",
                "null",
            ), f"Expected is_('deleted_at', 'null'), got is_{call_args}"

    @pytest.mark.asyncio
    async def test_dashboard_status_filters_use_primitive_strings(self) -> None:
        from app.api.v1.user import get_dashboard
        from app.models.user import User

        eq_calls: list[tuple[str, object]] = []
        in_calls: list[tuple[str, list[object]]] = []

        class Chain:
            def __init__(self, result):
                self.result = result

            def eq(self, field, value):
                eq_calls.append((field, value))
                return self

            def is_(self, field, value):
                return self

            def in_(self, field, values):
                in_calls.append((field, values))
                return self

            def order(self, *_args, **_kwargs):
                return self

            def limit(self, *_args, **_kwargs):
                return self

            def execute(self):
                return self.result

        class Table:
            def __init__(self):
                self.count = 0

            def select(self, *_args, **_kwargs):
                self.count += 1
                if self.count < 5:
                    return Chain(MagicMock(data=[], count=0))
                return Chain(MagicMock(data=[]))

        table = Table()
        mock_admin = MagicMock()
        mock_admin.table.return_value = table
        user = User(
            id="00000000-0000-0000-0000-000000000001",
            email="user@example.com",
            credits_balance=0,
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )

        with patch(
            "app.api.v1.user.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            await get_dashboard(user)

        assert all(not isinstance(value, ExtractionStatus) for _, value in eq_calls)
        assert ("status", "complete") in eq_calls
        assert ("status", "failed") in eq_calls
        assert all(isinstance(value, str) for _, values in in_calls for value in values)
