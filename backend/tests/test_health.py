"""Tests for the health check endpoint."""

from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    """Health endpoint must return HTTP 200."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_returns_ok_status(client: TestClient) -> None:
    """Health endpoint must return {"status": "ok"}."""
    response = client.get("/health")
    data = response.json()
    assert data == {"status": "ok"}


def test_health_content_type_is_json(client: TestClient) -> None:
    """Health endpoint must return JSON content-type."""
    response = client.get("/health")
    assert "application/json" in response.headers["content-type"]
