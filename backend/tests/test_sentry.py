"""Tests for Sentry integration module."""

from unittest.mock import MagicMock, patch


class TestInitSentry:
    """Tests for init_sentry function."""

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_with_dsn_calls_init(self, mock_sdk: MagicMock) -> None:
        """When a DSN is provided, sentry_sdk.init() is called."""
        from app.core.sentry import init_sentry

        init_sentry(
            dsn="https://examplePublicKey@o0.ingest.sentry.io/0",
            environment="production",
        )

        mock_sdk.init.assert_called_once()
        call_kwargs = mock_sdk.init.call_args[1]
        assert call_kwargs["dsn"] == "https://examplePublicKey@o0.ingest.sentry.io/0"
        assert call_kwargs["environment"] == "production"

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_without_dsn_does_not_call_init(
        self, mock_sdk: MagicMock
    ) -> None:
        """When DSN is empty, sentry_sdk.init() is NOT called."""
        from app.core.sentry import init_sentry

        init_sentry(dsn="", environment="development")

        mock_sdk.init.assert_not_called()

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_with_none_dsn_does_not_call_init(
        self, mock_sdk: MagicMock
    ) -> None:
        """When DSN is None, sentry_sdk.init() is NOT called."""
        from app.core.sentry import init_sentry

        init_sentry(dsn=None, environment="development")

        mock_sdk.init.assert_not_called()

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_sets_traces_sample_rate(self, mock_sdk: MagicMock) -> None:
        """Sentry is configured with a traces sample rate."""
        from app.core.sentry import init_sentry

        init_sentry(dsn="https://test@sentry.io/1", environment="production")

        call_kwargs = mock_sdk.init.call_args[1]
        assert "traces_sample_rate" in call_kwargs
        assert 0 < call_kwargs["traces_sample_rate"] <= 1.0

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_includes_fastapi_integration(
        self, mock_sdk: MagicMock
    ) -> None:
        """Sentry is configured with the FastAPI integration."""
        from app.core.sentry import init_sentry

        init_sentry(dsn="https://test@sentry.io/1", environment="production")

        call_kwargs = mock_sdk.init.call_args[1]
        integrations = call_kwargs.get("integrations", [])
        integration_types = [type(i).__name__ for i in integrations]
        assert "FastApiIntegration" in integration_types

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_disables_beat_task_monitoring(
        self, mock_sdk: MagicMock
    ) -> None:
        """Celery beat is not deployed, so Sentry must not monitor beat tasks."""
        from app.core.sentry import init_sentry

        init_sentry(dsn="https://test@sentry.io/1", environment="production")

        call_kwargs = mock_sdk.init.call_args[1]
        integrations = call_kwargs.get("integrations", [])
        celery_integration = next(
            item for item in integrations if type(item).__name__ == "CeleryIntegration"
        )
        assert celery_integration.monitor_beat_tasks is False

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_fastapi_integration_uses_starlette_capture(
        self, mock_sdk: MagicMock
    ) -> None:
        """FastAPI integration provides Starlette-backed request capture."""
        from app.core.sentry import init_sentry
        from sentry_sdk.integrations.starlette import StarletteIntegration

        init_sentry(dsn="https://test@sentry.io/1", environment="production")

        call_kwargs = mock_sdk.init.call_args[1]
        integrations = call_kwargs.get("integrations", [])
        fastapi_integration = next(
            item for item in integrations if type(item).__name__ == "FastApiIntegration"
        )
        assert isinstance(fastapi_integration, StarletteIntegration)

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_captures_500_statuses(self, mock_sdk: MagicMock) -> None:
        """Only 500-599 HTTP responses are treated as failed requests."""
        from app.core.sentry import init_sentry

        init_sentry(dsn="https://test@sentry.io/1", environment="production")

        call_kwargs = mock_sdk.init.call_args[1]
        integrations = call_kwargs.get("integrations", [])
        http_integrations = [
            integration
            for integration in integrations
            if type(integration).__name__ == "FastApiIntegration"
        ]

        assert http_integrations
        for integration in http_integrations:
            failed_statuses = integration.failed_request_status_codes
            assert 500 in failed_statuses
            assert 599 in failed_statuses
            assert 499 not in failed_statuses

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_configures_before_send(self, mock_sdk: MagicMock) -> None:
        """Sentry is configured with a before_send hook for PII scrubbing."""
        from app.core.sentry import init_sentry

        init_sentry(dsn="https://test@sentry.io/1", environment="production")

        call_kwargs = mock_sdk.init.call_args[1]
        assert "before_send" in call_kwargs
        assert callable(call_kwargs["before_send"])

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_returns_true_when_initialized(
        self, mock_sdk: MagicMock
    ) -> None:
        """init_sentry returns True when Sentry is successfully initialized."""
        from app.core.sentry import init_sentry

        result = init_sentry(dsn="https://test@sentry.io/1", environment="production")

        assert result is True

    @patch("app.core.sentry.sentry_sdk")
    def test_init_sentry_returns_false_when_no_dsn(self, mock_sdk: MagicMock) -> None:
        """init_sentry returns False when DSN is not provided."""
        from app.core.sentry import init_sentry

        result = init_sentry(dsn="", environment="development")

        assert result is False


class TestScrubSensitiveData:
    """Tests for PII scrubbing in before_send hook."""

    def test_scrub_removes_authorization_header(self) -> None:
        """Authorization header values are scrubbed from events."""
        from app.core.sentry import scrub_sensitive_data

        event: dict = {
            "request": {
                "headers": {
                    "Authorization": "Bearer secret-token-123",
                    "Content-Type": "application/json",
                }
            }
        }
        hint: dict = {}

        result = scrub_sensitive_data(event, hint)

        assert result is not None
        assert result["request"]["headers"]["Authorization"] == "[Filtered]"
        assert result["request"]["headers"]["Content-Type"] == "application/json"

    def test_scrub_removes_cookie_header(self) -> None:
        """Cookie header values are scrubbed from events."""
        from app.core.sentry import scrub_sensitive_data

        event: dict = {
            "request": {
                "headers": {
                    "Cookie": "session=abc123; token=xyz",
                }
            }
        }
        hint: dict = {}

        result = scrub_sensitive_data(event, hint)

        assert result is not None
        assert result["request"]["headers"]["Cookie"] == "[Filtered]"

    def test_scrub_handles_missing_request(self) -> None:
        """Events without a request key are returned unchanged."""
        from app.core.sentry import scrub_sensitive_data

        event: dict = {"exception": {"values": []}}
        hint: dict = {}

        result = scrub_sensitive_data(event, hint)

        assert result == event

    def test_scrub_handles_missing_headers(self) -> None:
        """Events with request but no headers still scrub URL fields."""
        from app.core.sentry import scrub_sensitive_data

        event: dict = {"request": {"url": "https://example.com"}}
        hint: dict = {}

        result = scrub_sensitive_data(event, hint)

        assert result is not None
        assert result["request"]["url"] == "[Filtered]"

    def test_scrub_removes_set_cookie_header(self) -> None:
        """Set-Cookie header values are scrubbed from events."""
        from app.core.sentry import scrub_sensitive_data

        event: dict = {
            "request": {
                "headers": {
                    "Set-Cookie": "session=abc123",
                }
            }
        }
        hint: dict = {}

        result = scrub_sensitive_data(event, hint)

        assert result is not None
        assert result["request"]["headers"]["Set-Cookie"] == "[Filtered]"

    def test_scrub_removes_query_string_body_and_ip_metadata(self) -> None:
        """Request query/body/IP fields are removed before sending events."""
        from app.core.sentry import scrub_sensitive_data

        event: dict = {
            "request": {
                "query_string": "email=lead@example.com&token=secret",
                "data": {"email": "lead@example.com", "lease": "private"},
                "cookies": {"session": "abc"},
                "url": "https://api.lextract.io/api/v1/extractions?email=lead@example.com",
                "env": {"REMOTE_ADDR": "203.0.113.10"},
                "headers": {
                    "Referer": "https://lextract.io/calculator?email=lead@example.com",
                    "X-Forwarded-For": "203.0.113.10",
                    "X-Original-URL": "/api/v1/extractions?token=secret",
                },
            },
            "user": {
                "id": "user-123",
                "email": "lead@example.com",
                "ip_address": "203.0.113.10",
            },
        }

        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result["request"]["query_string"] == "[Filtered]"
        assert result["request"]["data"] == "[Filtered]"
        assert result["request"]["cookies"] == "[Filtered]"
        assert result["request"]["url"] == "[Filtered]"
        assert result["request"]["env"]["REMOTE_ADDR"] == "[Filtered]"
        assert result["request"]["headers"]["Referer"] == "[Filtered]"
        assert result["request"]["headers"]["X-Forwarded-For"] == "[Filtered]"
        assert result["request"]["headers"]["X-Original-URL"] == "[Filtered]"
        assert result["user"] == {"id": "user-123"}


class TestSetUserContext:
    """Tests for set_user_context function."""

    @patch("app.core.sentry.sentry_sdk")
    def test_set_user_context_with_user_id(self, mock_sdk: MagicMock) -> None:
        """set_user_context sets user info on the Sentry scope."""
        from app.core.sentry import set_user_context

        set_user_context(user_id="user-abc-123")

        mock_sdk.set_user.assert_called_once_with({"id": "user-abc-123"})

    @patch("app.core.sentry.sentry_sdk")
    def test_set_user_context_with_email(self, mock_sdk: MagicMock) -> None:
        """set_user_context does not send email addresses to Sentry."""
        from app.core.sentry import set_user_context

        set_user_context(user_id="user-abc-123", email="test@example.com")

        mock_sdk.set_user.assert_called_once_with({"id": "user-abc-123"})

    @patch("app.core.sentry.sentry_sdk")
    def test_set_user_context_with_none_clears_context(
        self, mock_sdk: MagicMock
    ) -> None:
        """set_user_context with None user_id clears the user context."""
        from app.core.sentry import set_user_context

        set_user_context(user_id=None)

        mock_sdk.set_user.assert_called_once_with(None)
