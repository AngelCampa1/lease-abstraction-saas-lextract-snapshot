"""Tests for API error handlers and reportable Sentry failures."""

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, field_validator

from app.core.middleware import CORRELATION_ID_HEADER, CorrelationIdMiddleware


def _client(app: FastAPI) -> TestClient:
    app.add_middleware(CorrelationIdMiddleware)
    return TestClient(app, raise_server_exceptions=False)


def test_unhandled_api_exception_is_reported_with_tracking_id(
    monkeypatch: Any,
) -> None:
    from app.core.error_handlers import register_error_handlers

    captured: list[tuple[BaseException, dict[str, Any]]] = []

    def fake_capture(exc: BaseException, **context: Any) -> str:
        captured.append((exc, context))
        return "event-abc"

    monkeypatch.setattr(
        "app.core.error_handlers.capture_reportable_exception",
        fake_capture,
    )

    app = FastAPI()
    register_error_handlers(app)

    @app.get("/api/v1/broken")
    async def broken() -> None:
        raise RuntimeError("database exploded")

    response = _client(app).get("/api/v1/broken")

    assert response.status_code == 500
    body = response.json()
    assert body["message"] == "Something went wrong"
    assert (
        body["detail"]
        == "Please try again. If this keeps happening, contact support with the tracking ID."
    )
    assert body["request_id"] == response.headers[CORRELATION_ID_HEADER]
    assert body["tracking_id"] == "event-abc"
    assert captured
    assert captured[0][1] == {
        "surface": "api",
        "route": "/api/v1/broken",
        "status_code": 500,
        "request_id": body["request_id"],
        "handled": False,
    }


def test_expected_404_is_not_reported_to_sentry(monkeypatch: Any) -> None:
    from app.core.error_handlers import register_error_handlers

    captured: list[BaseException] = []
    monkeypatch.setattr(
        "app.core.error_handlers.capture_reportable_exception",
        lambda exc, **context: captured.append(exc),
    )

    app = FastAPI()
    register_error_handlers(app)

    @app.get("/api/v1/missing")
    async def missing() -> None:
        raise HTTPException(status_code=404, detail="Extraction not found")

    response = _client(app).get("/api/v1/missing")

    assert response.status_code == 404
    assert response.json()["message"] == "Extraction not found"
    assert response.json()["request_id"] == response.headers[CORRELATION_ID_HEADER]
    assert captured == []


def test_reportable_http_503_is_reported_with_friendly_message(
    monkeypatch: Any,
) -> None:
    from app.core.error_handlers import register_error_handlers

    captured: list[dict[str, Any]] = []
    monkeypatch.setattr(
        "app.core.error_handlers.capture_reportable_exception",
        lambda exc, **context: captured.append(context) or "event-503",
    )

    app = FastAPI()
    register_error_handlers(app)

    @app.get("/api/v1/downstream")
    async def downstream() -> None:
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable",
        )

    response = _client(app).get("/api/v1/downstream")

    assert response.status_code == 503
    body = response.json()
    assert body["message"] == "Service temporarily unavailable"
    assert body["detail"] == "Service temporarily unavailable"
    assert body["tracking_id"] == "event-503"
    assert captured[0]["surface"] == "api"
    assert captured[0]["status_code"] == 503
    assert captured[0]["handled"] is True


def test_reportable_http_500_does_not_leak_internal_detail(
    monkeypatch: Any,
) -> None:
    from app.core.error_handlers import register_error_handlers

    monkeypatch.setattr(
        "app.core.error_handlers.capture_reportable_exception",
        lambda exc, **context: "event-secret",
    )

    app = FastAPI()
    register_error_handlers(app)

    @app.get("/api/v1/secret")
    async def secret_failure() -> None:
        raise HTTPException(
            status_code=500,
            detail="postgres password=secret failed for tenant@example.com",
        )

    response = _client(app).get("/api/v1/secret")

    assert response.status_code == 500
    body = response.json()
    assert body["detail"] == (
        "Please try again. If this keeps happening, contact support with the "
        "tracking ID."
    )
    assert "password" not in body["detail"]
    assert "tenant@example.com" not in body["detail"]
    assert body["tracking_id"] == "event-secret"


def test_validation_error_returns_tracking_id_without_reporting(
    monkeypatch: Any,
) -> None:
    from app.core.error_handlers import register_error_handlers

    captured: list[BaseException] = []
    monkeypatch.setattr(
        "app.core.error_handlers.capture_reportable_exception",
        lambda exc, **context: captured.append(exc),
    )

    class Payload(BaseModel):
        email: str

    app = FastAPI()
    register_error_handlers(app)

    @app.post("/api/v1/validate")
    async def validate(payload: Payload) -> dict[str, str]:
        return {"email": payload.email}

    response = _client(app).post("/api/v1/validate", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["message"] == "Validation failed"
    assert body["request_id"] == response.headers[CORRELATION_ID_HEADER]
    assert body["tracking_id"] == body["request_id"]
    assert captured == []


def test_validation_error_context_is_json_safe(monkeypatch: Any) -> None:
    from app.core.error_handlers import register_error_handlers

    monkeypatch.setattr(
        "app.core.error_handlers.capture_reportable_exception",
        lambda exc, **context: None,
    )

    class Payload(BaseModel):
        email: str

        @field_validator("email")
        @classmethod
        def validate_email(cls, value: str) -> str:
            if "@" not in value:
                raise ValueError("email must contain @")
            return value

    app = FastAPI()
    register_error_handlers(app)

    @app.post("/api/v1/validate-email")
    async def validate(payload: Payload) -> dict[str, str]:
        return {"email": payload.email}

    response = _client(app).post(
        "/api/v1/validate-email",
        json={"email": "not-an-email"},
    )

    assert response.status_code == 422
    ctx = response.json()["errors"][0]["ctx"]
    assert ctx == {"error": "email must contain @"}
