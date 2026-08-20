"""Tests for GET /api/v1/tasks/{task_id}/status endpoint."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.v1.tasks import build_export_task_id
from app.core.dependencies import get_optional_user
from app.main import create_app
from app.models.user import User


USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
OTHER_USER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


@pytest.fixture
def task_client() -> TestClient:
    app = create_app()
    return TestClient(app)


@pytest.fixture
def authed_user() -> User:
    return User(
        id=USER_ID,
        email="owner@example.com",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
def auth_client(task_client: TestClient, authed_user: User) -> TestClient:
    task_client.app.dependency_overrides[get_optional_user] = lambda: authed_user
    try:
        yield task_client
    finally:
        task_client.app.dependency_overrides.clear()


def _user(user_id: uuid.UUID) -> User:
    return User(
        id=user_id,
        email=f"{user_id}@example.com",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


class TestGetTaskStatus:
    """Covers all Celery state mappings for the task-status poll endpoint."""

    @pytest.fixture
    def mock_async_result(self):
        """Factory that returns a configured AsyncResult mock."""

        def _make(state: str, result: object = None) -> MagicMock:
            m = MagicMock()
            m.state = state
            m.result = result
            return m

        return _make

    def _patch_result(self, task_id: str, mock_result: MagicMock):
        """Context manager patching AsyncResult construction."""
        return patch(
            "app.api.v1.tasks.AsyncResult",
            return_value=mock_result,
        )

    # ------------------------------------------------------------------
    # SUCCESS state
    # ------------------------------------------------------------------

    def test_success_state_returns_complete_with_url(
        self, auth_client: TestClient, mock_async_result, authed_user: User
    ) -> None:
        task_id = build_export_task_id(authed_user, "abc-123")
        ar = mock_async_result(
            "SUCCESS",
            result={
                "url": "https://downloads.lextract.io/export.pdf",
                "user_id": str(USER_ID),
            },
        )

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "complete"
        assert body["task_id"] == task_id
        assert body["url"] == "https://downloads.lextract.io/export.pdf"

    def test_success_state_surfaces_version_token(
        self, auth_client: TestClient, mock_async_result, authed_user: User
    ) -> None:
        """The export's version token must be surfaced so the client can pin
        the download to the exact generated file (edit-after-export race)."""
        task_id = build_export_task_id(authed_user, "abc-ver")
        ar = mock_async_result(
            "SUCCESS",
            result={
                "url": "https://downloads.lextract.io/export.pdf",
                "user_id": str(USER_ID),
                "version": "v20260101000000",
            },
        )

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 200
        assert resp.json()["version"] == "v20260101000000"

    def test_success_state_with_non_dict_result_omits_url(
        self, auth_client: TestClient, mock_async_result, authed_user: User
    ) -> None:
        task_id = build_export_task_id(authed_user, "abc-456")
        ar = mock_async_result("SUCCESS", result="some-string")

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "complete"
        assert body["url"] is None

    def test_success_state_with_no_url_key_returns_none(
        self, auth_client: TestClient, mock_async_result, authed_user: User
    ) -> None:
        task_id = build_export_task_id(authed_user, "abc-789")
        ar = mock_async_result("SUCCESS", result={"user_id": str(USER_ID)})

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 200
        assert resp.json()["url"] is None

    # ------------------------------------------------------------------
    # FAILURE state
    # ------------------------------------------------------------------

    def test_failure_state_returns_failed(
        self, auth_client: TestClient, mock_async_result, authed_user: User
    ) -> None:
        task_id = build_export_task_id(authed_user, "fail-001")
        ar = mock_async_result("FAILURE")

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "failed"
        assert body["url"] is None

    # ------------------------------------------------------------------
    # In-progress states
    # ------------------------------------------------------------------

    @pytest.mark.parametrize("celery_state", ["PENDING", "STARTED", "RETRY"])
    def test_in_progress_states_return_generating(
        self,
        auth_client: TestClient,
        mock_async_result,
        celery_state: str,
        authed_user: User,
    ) -> None:
        task_id = build_export_task_id(authed_user, f"task-{celery_state.lower()}")
        ar = mock_async_result(celery_state)

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 200
        assert resp.json()["status"] == "generating"

    def test_unknown_non_app_task_id_returns_404(
        self, auth_client: TestClient, mock_async_result
    ) -> None:
        """Do not expose raw Celery status for arbitrary task IDs."""
        ar = mock_async_result("PENDING")
        task_id = "completely-unknown-task-id"

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 404

    # ------------------------------------------------------------------
    # Response shape
    # ------------------------------------------------------------------

    def test_response_always_includes_task_id(
        self, auth_client: TestClient, mock_async_result, authed_user: User
    ) -> None:
        task_id = build_export_task_id(authed_user, "shape-check")
        ar = mock_async_result("PENDING")

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        body = resp.json()
        assert "task_id" in body
        assert "status" in body
        assert "url" in body
        assert body["task_id"] == task_id

    def test_polling_requires_authentication(
        self, task_client: TestClient, mock_async_result
    ) -> None:
        task_id = build_export_task_id(_user(USER_ID), "requires-auth")
        ar = mock_async_result("PENDING")

        with self._patch_result(task_id, ar):
            resp = task_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 401

    def test_unowned_app_task_id_returns_404(
        self, auth_client: TestClient, mock_async_result
    ) -> None:
        task_id = build_export_task_id(_user(OTHER_USER_ID), "pending")
        ar = mock_async_result("PENDING")

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 404

    def test_success_result_for_other_owner_returns_404_without_url(
        self, auth_client: TestClient, mock_async_result, authed_user: User
    ) -> None:
        task_id = build_export_task_id(authed_user, "completed")
        ar = mock_async_result(
            "SUCCESS",
            result={
                "url": "https://downloads.lextract.io/other-user-export.pdf",
                "user_id": str(OTHER_USER_ID),
            },
        )

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 404

    def test_forged_app_task_id_returns_404(
        self, auth_client: TestClient, mock_async_result
    ) -> None:
        task_id = f"export:user:{USER_ID}:forged:bad-signature"
        ar = mock_async_result("PENDING")

        with self._patch_result(task_id, ar):
            resp = auth_client.get(f"/api/v1/tasks/{task_id}/status")

        assert resp.status_code == 404
