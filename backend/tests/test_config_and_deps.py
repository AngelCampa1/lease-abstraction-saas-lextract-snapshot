"""Tests for settings config and dependency injection."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings, settings
from app.core.dependencies import get_db


class TestSettings:
    def test_module_level_settings_is_settings_instance(self) -> None:
        assert isinstance(settings, Settings)

    def test_get_settings_returns_same_instance(self) -> None:
        """lru_cache ensures the same Settings instance is returned."""
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2

    def test_default_api_v1_prefix(self) -> None:
        assert settings.api_v1_prefix == "/api/v1"

    def test_default_environment(self) -> None:
        assert settings.environment == "development"

    def test_dev_localhost_origins_appended(self) -> None:
        """Development mode adds localhost to CORS origins."""
        s = Settings(environment="development")
        assert "http://localhost:3000" in s.cors_origins

    def test_prod_no_localhost_origins(self) -> None:
        """Production mode does not add localhost CORS origins."""
        s = Settings(
            environment="production",
            openrouter_api_key="sk-or-prod-key",
            stripe_secret_key="sk_live_prod_key",
            stripe_webhook_secret="whsec_prod_secret",
            resend_api_key="re_prod_key",
        )
        assert "http://localhost:3000" not in s.cors_origins

    def test_default_redis_url(self) -> None:
        assert "redis://" in settings.redis_url

    def test_sentry_dsn_defaults_empty(self) -> None:
        assert settings.sentry_dsn == ""

    def test_invalid_environment_raises(self) -> None:
        """validate_environment rejects unknown env names (e.g. 'prod')."""
        with pytest.raises(ValidationError, match="Unknown environment"):
            Settings(environment="prod")

    def test_staging_environment_accepted(self) -> None:
        """'staging' is a valid environment."""
        s = Settings(environment="staging")
        assert s.environment == "staging"

    def test_cors_origins_json_array_format(self) -> None:
        """CORS_ORIGINS env var can be a JSON array string."""
        s = Settings(
            environment="staging",
            cors_origins='["https://example.com","https://www.example.com"]',
        )
        assert "https://example.com" in s.cors_origins
        assert "https://www.example.com" in s.cors_origins

    def test_cors_origins_comma_separated_format(self) -> None:
        """CORS_ORIGINS env var can be comma-separated (Railway plain-string format)."""
        s = Settings(
            environment="staging",
            cors_origins="https://example.com,https://www.example.com",
        )
        assert "https://example.com" in s.cors_origins
        assert "https://www.example.com" in s.cors_origins

    def test_cors_origins_empty_string_falls_back_to_defaults(self) -> None:
        """Empty CORS_ORIGINS env var restores production defaults instead of
        silently blocking all cross-origin requests."""
        s = Settings(environment="staging", cors_origins="")
        assert "https://lextract.io" in s.cors_origins
        assert "https://www.lextract.io" in s.cors_origins

    def test_cors_origins_not_empty_in_production(self) -> None:
        """Production Settings always has at least the two canonical origins."""
        s = Settings(
            environment="production",
            openrouter_api_key="sk-or-prod-key",
            stripe_secret_key="sk_live_prod_key",
            stripe_webhook_secret="whsec_prod_secret",
            resend_api_key="re_prod_key",
        )
        assert "https://lextract.io" in s.cors_origins
        assert "https://www.lextract.io" in s.cors_origins

    def test_prod_rejects_placeholder_secrets(self) -> None:
        """reject_insecure_defaults_in_production raises when placeholder
        values are present in production mode."""
        with pytest.raises(ValidationError, match="insecure placeholder"):
            Settings(environment="production")  # all defaults are placeholders


class TestGetDb:
    def test_returns_neon_db_client(self) -> None:
        """get_db() must return a NeonDB object."""
        from app.database.client import NeonDB

        client = get_db()
        assert isinstance(client, NeonDB)


class TestGetCurrentUserRequiresAuth:
    def test_endpoint_with_current_user_requires_bearer(self) -> None:
        """get_current_user dependency requires Authorization header."""
        from fastapi.testclient import TestClient

        from app.main import create_app

        app = create_app()
        with TestClient(app) as client:
            resp = client.get("/api/v1/user/profile")
            assert resp.status_code == 401


class TestNewConfigFields:
    def test_neon_auth_base_url_default(self) -> None:
        assert settings.neon_auth_base_url == "http://localhost:4000"

    def test_rate_limit_auth_default(self) -> None:
        assert settings.rate_limit_auth == 100

    def test_rate_limit_anon_default(self) -> None:
        assert settings.rate_limit_anon == 20

    def test_log_level_default(self) -> None:
        assert settings.log_level == "INFO"

    def test_log_format_default(self) -> None:
        assert Settings.model_fields["log_format"].default == "text"

    def test_frontend_url_default(self) -> None:
        assert settings.frontend_url == "http://localhost:3000"


class TestLifespan:
    def test_lifespan_startup_and_shutdown(self) -> None:
        """TestClient context manager triggers the lifespan."""
        from fastapi.testclient import TestClient

        from app.main import create_app

        app = create_app()
        with TestClient(app) as client:
            response = client.get("/health")
            assert response.status_code == 200


class TestOpenApiExposure:
    def test_production_disables_openapi_schema_endpoint(self, monkeypatch) -> None:
        from app import main

        monkeypatch.setattr(main.settings, "debug", False)
        monkeypatch.setattr(main.settings, "environment", "production")

        app = main.create_app()

        assert app.openapi_url is None

    def test_debug_non_production_exposes_openapi_schema_endpoint(
        self, monkeypatch
    ) -> None:
        from app import main

        monkeypatch.setattr(main.settings, "debug", True)
        monkeypatch.setattr(main.settings, "environment", "development")

        app = main.create_app()

        assert app.openapi_url == "/openapi.json"


class TestHealthEndpoints:
    def test_health_returns_ok(self) -> None:
        from fastapi.testclient import TestClient

        from app.main import create_app

        app = create_app()
        with TestClient(app) as client:
            resp = client.get("/health")
            assert resp.status_code == 200
            assert resp.json()["status"] == "ok"

    def test_health_ready_returns_response(self) -> None:
        from fastapi.testclient import TestClient

        from app.main import create_app

        app = create_app()
        with TestClient(app) as client:
            resp = client.get("/health/ready")
            assert resp.status_code == 200
            data = resp.json()
            assert data == {"status": "ok"}

    def test_health_endpoints_do_not_create_db_client(self, monkeypatch) -> None:
        from fastapi.testclient import TestClient

        from app.database.client import NeonClientManager
        from app.main import create_app

        def fail_if_called() -> None:
            raise AssertionError("health endpoints must not touch Neon")

        monkeypatch.setattr(
            NeonClientManager,
            "get_service_client",
            fail_if_called,
        )

        app = create_app()
        with TestClient(app) as client:
            assert client.get("/health").status_code == 200
            assert client.get("/health/ready").status_code == 200

    def test_health_has_correlation_id_header(self) -> None:
        from fastapi.testclient import TestClient

        from app.main import create_app

        app = create_app()
        with TestClient(app) as client:
            resp = client.get("/health")
            assert "X-Correlation-ID" in resp.headers

    def test_health_has_security_headers(self) -> None:
        from fastapi.testclient import TestClient

        from app.main import create_app

        app = create_app()
        with TestClient(app) as client:
            resp = client.get("/health")
            assert resp.headers["X-Content-Type-Options"] == "nosniff"
            assert "Strict-Transport-Security" in resp.headers
