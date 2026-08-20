"""Tests for middleware stack (integration via TestClient)."""

from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.middleware import (
    CORRELATION_ID_HEADER,
    EXEMPT_PATHS,
    CorrelationIdMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)


def _make_test_app() -> FastAPI:
    """Create a minimal app with all 3 middleware layers."""
    app = FastAPI()

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/v1/test")
    async def test_endpoint() -> dict[str, str]:
        return {"data": "hello"}

    # Starlette reverses order: SecurityHeaders last-added = runs last
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    return app


class TestCorrelationIdMiddleware:
    def test_generates_correlation_id(self) -> None:
        client = TestClient(_make_test_app())
        resp = client.get("/api/v1/test")
        assert CORRELATION_ID_HEADER in resp.headers
        UUID(resp.headers[CORRELATION_ID_HEADER])

    def test_propagates_incoming_correlation_id(self) -> None:
        correlation_id = "018f9f2c-f2f4-7b8c-91d1-50be5c8f68bb"
        client = TestClient(_make_test_app())
        resp = client.get(
            "/api/v1/test", headers={CORRELATION_ID_HEADER: correlation_id}
        )
        assert resp.headers[CORRELATION_ID_HEADER] == correlation_id

    def test_propagates_x_request_id(self) -> None:
        request_id = "018f9f2c-f2f4-7b8c-91d1-50be5c8f68bc"
        client = TestClient(_make_test_app())
        resp = client.get("/api/v1/test", headers={"X-Request-ID": request_id})
        assert resp.headers[CORRELATION_ID_HEADER] == request_id

    def test_replaces_unsafe_incoming_correlation_id(self) -> None:
        client = TestClient(_make_test_app())
        resp = client.get(
            "/api/v1/test",
            headers={CORRELATION_ID_HEADER: "lead@example.com secret-token"},
        )
        assert resp.headers[CORRELATION_ID_HEADER] != "lead@example.com secret-token"
        UUID(resp.headers[CORRELATION_ID_HEADER])


class TestSecurityHeadersMiddleware:
    def test_security_headers_present(self) -> None:
        client = TestClient(_make_test_app())
        resp = client.get("/api/v1/test")
        assert resp.headers["X-Content-Type-Options"] == "nosniff"
        assert resp.headers["X-Frame-Options"] == "DENY"
        assert resp.headers["X-XSS-Protection"] == "1; mode=block"
        assert "max-age=31536000" in resp.headers["Strict-Transport-Security"]
        assert "Content-Security-Policy" in resp.headers
        assert "Referrer-Policy" in resp.headers
        assert "Permissions-Policy" in resp.headers

    def test_csp_not_on_docs_paths(self) -> None:
        """CSP is exempted for /docs, /redoc, /openapi.json to allow Swagger UI."""
        app = FastAPI(docs_url="/docs", redoc_url="/redoc", openapi_url="/openapi.json")

        @app.get("/api/v1/test")
        async def test_ep() -> dict[str, str]:
            return {"ok": "true"}

        app.add_middleware(SecurityHeadersMiddleware)
        client = TestClient(app)

        # /openapi.json should NOT have CSP
        resp = client.get("/openapi.json")
        assert "Content-Security-Policy" not in resp.headers
        # But still has other security headers
        assert resp.headers["X-Content-Type-Options"] == "nosniff"

        # Normal API path SHOULD have CSP
        resp = client.get("/api/v1/test")
        assert "Content-Security-Policy" in resp.headers


class TestRateLimitMiddleware:
    def test_exempt_paths_not_rate_limited(self) -> None:
        client = TestClient(_make_test_app())
        # /health is in EXEMPT_PATHS
        for _ in range(50):
            resp = client.get("/health")
            assert resp.status_code == 200

    def test_health_is_exempt(self) -> None:
        assert "/health" in EXEMPT_PATHS

    def test_docs_is_exempt(self) -> None:
        assert "/docs" in EXEMPT_PATHS

    def test_rate_limit_returns_429(self) -> None:
        """Exhaust the rate limit for a single IP to get a 429."""
        app = _make_test_app()
        client = TestClient(app)
        # Reset rate limiter storage
        from app.core.rate_limiting import storage

        storage.reset()

        # In test env, unauth limit is 100/min. Exceed it.
        status_codes = []
        for _ in range(110):
            resp = client.get("/api/v1/test")
            status_codes.append(resp.status_code)
            if resp.status_code == 429:
                break

        assert 429 in status_codes

    def test_429_has_retry_after_header(self) -> None:
        from app.core.rate_limiting import storage

        storage.reset()

        client = TestClient(_make_test_app())
        for _ in range(110):
            resp = client.get("/api/v1/test")
            if resp.status_code == 429:
                assert "Retry-After" in resp.headers
                return

    def test_429_body_is_error_response(self) -> None:
        from app.core.rate_limiting import storage

        storage.reset()

        client = TestClient(_make_test_app())
        for _ in range(110):
            resp = client.get("/api/v1/test")
            if resp.status_code == 429:
                body = resp.json()
                assert body["status_code"] == 429
                assert body["message"] == "Too many requests"
                return
