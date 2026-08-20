"""Tests for POST /api/v1/extractions/{id}/retry.

Covers the happy path (a failed extraction is reset to extracting and the
pipeline chain is re-dispatched), authorization (non-owner sees 404), and
the wrong-status guard (only failed extractions are retryable).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.extractions import router
from app.models.user import User

USER_UUID = "00000000-0000-4000-a000-000000000001"
OTHER_UUID = "00000000-0000-4000-a000-000000000099"
EXTRACTION_ID = "00000000-0000-4000-a000-000000000777"


@pytest.fixture
def test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def client(test_app: FastAPI) -> TestClient:
    return TestClient(test_app)


@pytest.fixture
def auth_user() -> User:
    return User(
        id=USER_UUID,
        email="user@example.com",
        full_name="Test User",
        company=None,
        role="user",
        credits_balance=5,
        stripe_customer_id=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _auth_override(user: User):
    async def override():
        return user

    return override


def _record(*, status: str = "failed", user_id: str = USER_UUID) -> dict[str, Any]:
    return {
        "id": EXTRACTION_ID,
        "user_id": user_id,
        "anonymous_session_id": None,
        "status": status,
        "payment_status": "pending",
        "document_filename": "lease.pdf",
        "deleted_at": None,
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }


def _mock_db_for_retry(
    record: dict[str, Any], update_data: list[dict[str, Any]] | None = None
) -> MagicMock:
    """Build a mock service client that exposes select+update for retry."""
    mock_db = MagicMock()
    mock_execute = MagicMock(data=record)
    (
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
    ) = mock_execute
    update_chain = (
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value
    )
    update_chain.execute.return_value = MagicMock(
        data=update_data if update_data is not None else [{"id": EXTRACTION_ID}]
    )
    return mock_db


class TestRetryHappyPath:
    def test_failed_extraction_retry_resets_and_redispatches(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        mock_db = _mock_db_for_retry(_record(status="failed"))

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline") as mock_pipeline,
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 202, resp.text
        body = resp.json()
        assert body["id"] == EXTRACTION_ID
        assert body["status"] == "extracting"
        mock_pipeline.assert_called_once_with(EXTRACTION_ID)
        # Confirm the DB transition wrote the new status + cleared error_message
        update_call = mock_db.table.return_value.update.call_args.args[0]
        assert update_call["status"] == "extracting"
        assert update_call["error_message"] is None
        test_app.dependency_overrides.clear()

    def test_retry_clears_stale_result_columns(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        """Retry must null prior-run result data.

        ``get_extraction_full`` gates only on ``payment_status == 'paid'``,
        not on ``status == complete``, so a paid extraction mid-retry would
        otherwise serve stale ``extracted_data``/``red_flags`` from the prior
        run until the new pipeline finishes. Nulling on retry prevents that.
        """
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        mock_db = _mock_db_for_retry(_record(status="failed"))

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline"),
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 202, resp.text
        update_call = mock_db.table.return_value.update.call_args.args[0]
        for column in (
            "extracted_data",
            "confidence_scores",
            "overall_confidence",
            "red_flags",
            "show_camaudit",
        ):
            assert update_call[column] is None, f"{column} not cleared on retry"
        test_app.dependency_overrides.clear()

    def test_cas_lost_returns_409(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        """An empty update result (status changed under us) yields 409."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        # update_data=[] => CAS lost: a parallel retry/cleanup moved the status.
        mock_db = _mock_db_for_retry(_record(status="failed"), update_data=[])

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline") as mock_pipeline,
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 409, resp.text
        mock_pipeline.assert_not_called()
        test_app.dependency_overrides.clear()

    def test_pipeline_dispatch_failure_rolls_back_and_503(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        """If re-dispatch raises, the row is rolled back to failed and 503 returned."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        mock_db = _mock_db_for_retry(_record(status="failed"))

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.run_extraction_pipeline",
                side_effect=RuntimeError("broker down"),
            ),
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 503, resp.text
        # Two updates: the optimistic transition, then the rollback to failed.
        update_calls = mock_db.table.return_value.update.call_args_list
        assert len(update_calls) >= 2
        rollback_payload = update_calls[-1].args[0]
        assert rollback_payload["status"] == "failed"
        assert rollback_payload["error_message"]
        test_app.dependency_overrides.clear()

    def test_pipeline_dispatch_failure_swallows_rollback_error(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        """A rollback that itself fails is logged but still surfaces the 503."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        mock_db = _mock_db_for_retry(_record(status="failed"))
        # Make the rollback update chain raise (2x .eq, no .is_).
        (
            mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.side_effect
        ) = RuntimeError("db gone")

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch(
                "app.api.v1.extractions.run_extraction_pipeline",
                side_effect=RuntimeError("broker down"),
            ),
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 503, resp.text
        test_app.dependency_overrides.clear()


class TestRetryAuthz:
    def test_non_owner_returns_404(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        mock_db = _mock_db_for_retry(_record(status="failed", user_id=OTHER_UUID))

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline") as mock_pipeline,
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 404
        mock_pipeline.assert_not_called()
        test_app.dependency_overrides.clear()


class TestRetryWrongStatus:
    def test_complete_extraction_returns_409(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        mock_db = _mock_db_for_retry(_record(status="complete"))

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline") as mock_pipeline,
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 409
        assert "failed" in resp.json()["detail"].lower()
        mock_pipeline.assert_not_called()
        test_app.dependency_overrides.clear()

    def test_extracting_extraction_returns_409(
        self, test_app: FastAPI, client: TestClient, auth_user: User
    ) -> None:
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(auth_user)
        mock_db = _mock_db_for_retry(_record(status="extracting"))

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.extractions.run_extraction_pipeline") as mock_pipeline,
        ):
            resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")

        assert resp.status_code == 409
        mock_pipeline.assert_not_called()
        test_app.dependency_overrides.clear()


class TestRetryUnauthenticated:
    def test_unauthenticated_returns_401(self, client: TestClient) -> None:
        resp = client.post(f"/api/v1/extractions/{EXTRACTION_ID}/retry")
        assert resp.status_code == 401
