"""Tests for the leads unsubscribe endpoint."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def leads_client() -> TestClient:
    app = create_app()
    return TestClient(app)


_VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"


def _mock_worker(
    *,
    unsubscribe_result: bool = True,
) -> MagicMock:
    worker = MagicMock()
    worker.unsubscribe = AsyncMock(return_value=unsubscribe_result)
    return worker


class TestUnsubscribeEndpoint:
    def test_unsubscribe_proxies_to_worker(self, leads_client: TestClient) -> None:
        worker = _mock_worker(unsubscribe_result=True)

        with patch("app.api.v1.leads.MarketingWorkerClient", return_value=worker):
            resp = leads_client.get(
                "/api/v1/leads/unsubscribe",
                params={"lead_id": _VALID_UUID},
            )

        assert resp.status_code == 200
        assert resp.json() == {"success": True}
        worker.unsubscribe.assert_awaited_once_with(_VALID_UUID)

    def test_unsubscribe_returns_404_when_worker_reports_missing(
        self, leads_client: TestClient
    ) -> None:
        worker = _mock_worker(unsubscribe_result=False)

        with patch("app.api.v1.leads.MarketingWorkerClient", return_value=worker):
            resp = leads_client.get(
                "/api/v1/leads/unsubscribe",
                params={"lead_id": _VALID_UUID},
            )

        assert resp.status_code == 404

    def test_unsubscribe_worker_failure_returns_503(
        self, leads_client: TestClient
    ) -> None:
        worker = _mock_worker()
        worker.unsubscribe.side_effect = RuntimeError("worker down")

        with patch("app.api.v1.leads.MarketingWorkerClient", return_value=worker):
            resp = leads_client.get(
                "/api/v1/leads/unsubscribe",
                params={"lead_id": _VALID_UUID},
            )

        assert resp.status_code == 503

    def test_unsubscribe_invalid_uuid_returns_422(
        self, leads_client: TestClient
    ) -> None:
        resp = leads_client.get(
            "/api/v1/leads/unsubscribe",
            params={"lead_id": "not-a-uuid"},
        )
        assert resp.status_code == 422

    def test_unsubscribe_missing_param_returns_422(
        self, leads_client: TestClient
    ) -> None:
        resp = leads_client.get("/api/v1/leads/unsubscribe")
        assert resp.status_code == 422
