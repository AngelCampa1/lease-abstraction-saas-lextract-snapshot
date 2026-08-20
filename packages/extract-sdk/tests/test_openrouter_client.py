"""Tests for OpenRouterClient."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pybreaker
import pytest

from extract_sdk.exceptions import CircuitOpenError
from extract_sdk.extraction.client import _async_breaker_call
from extract_sdk.extraction.openrouter_client import (
    DEFAULT_SYSTEM_PROMPT,
    MAX_DOC_CHARS,
    OpenRouterClient,
)
from extract_sdk.models import ExtractionResponse


def _mock_response(
    text: str = '{"fields": {}}',
    prompt_tokens: int = 100,
    completion_tokens: int = 50,
) -> Any:
    """Create a mock OpenAI chat completion response."""
    message = SimpleNamespace(content=text)
    choice = SimpleNamespace(message=message)
    usage = SimpleNamespace(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    return SimpleNamespace(choices=[choice], usage=usage)


class TestOpenRouterClientInit:
    """Initialization and configuration tests."""

    def test_max_doc_chars_constant_value(self):
        # Regression guard: 200_000 chars ≈ 55-60K tokens, within DeepSeek V3.2's 128K window.
        # Raising this limit exposes more addendum/exhibit content to the model.
        assert MAX_DOC_CHARS == 200_000

    def test_default_init(self):
        client = OpenRouterClient(api_key="test-key", model="deepseek/deepseek-v3.2")
        assert client.model == "deepseek/deepseek-v3.2"
        assert client.system_prompt == DEFAULT_SYSTEM_PROMPT
        assert client.max_doc_chars == MAX_DOC_CHARS
        assert client.circuit_breaker is None

    def test_custom_params(self):
        breaker = pybreaker.CircuitBreaker(fail_max=5)
        client = OpenRouterClient(
            api_key="test-key",
            model="qwen/qwen3-235b-a22b-2507",
            base_url="https://custom.endpoint/v1",
            system_prompt="Custom prompt",
            circuit_breaker=breaker,
            max_doc_chars=50_000,
        )
        assert client.model == "qwen/qwen3-235b-a22b-2507"
        assert client.system_prompt == "Custom prompt"
        assert client.max_doc_chars == 50_000
        assert client.circuit_breaker is breaker


class TestBuildUserContent:
    """Document wrapping and truncation tests."""

    def test_wraps_in_xml_tags(self):
        client = OpenRouterClient(api_key="k", model="m")
        content = client._build_user_content("Extract fields", "Lease text here")
        assert "<document_text>" in content
        assert "</document_text>" in content
        assert "Extract fields" in content
        assert "Lease text here" in content

    def test_prompt_before_document(self):
        client = OpenRouterClient(api_key="k", model="m")
        content = client._build_user_content("PROMPT", "DOC")
        prompt_pos = content.index("PROMPT")
        doc_pos = content.index("DOC")
        assert prompt_pos < doc_pos

    def test_truncation(self):
        client = OpenRouterClient(api_key="k", model="m", max_doc_chars=10)
        content = client._build_user_content("P", "A" * 100)
        # Only 10 chars of the document should be present
        assert content.count("A") == 10


class TestExtract:
    """Extraction call tests with mocked OpenAI client."""

    @pytest.mark.asyncio
    async def test_basic_extraction(self):
        client = OpenRouterClient(api_key="k", model="deepseek/deepseek-v3.2")
        mock_resp = _mock_response('{"fields": {"rent": 1200}}', 500, 100)
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=mock_resp)

        result = await client.extract("Extract", "Lease text")

        assert isinstance(result, ExtractionResponse)
        assert result.text == '{"fields": {"rent": 1200}}'
        assert result.input_tokens == 500
        assert result.output_tokens == 100
        assert result.total_tokens == 600

    @pytest.mark.asyncio
    async def test_think_tags_stripped(self):
        client = OpenRouterClient(
            api_key="k", model="qwen/qwen3-235b-a22b-thinking-2507"
        )
        mock_resp = _mock_response(
            '<think>Analyzing...</think>{"field_corrections": {}}', 300, 80
        )
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=mock_resp)

        result = await client.extract("Validate", "JSON data")

        assert "<think>" not in result.text
        assert result.text == '{"field_corrections": {}}'

    @pytest.mark.asyncio
    async def test_empty_response(self):
        client = OpenRouterClient(api_key="k", model="m")
        resp = SimpleNamespace(
            choices=[],
            usage=SimpleNamespace(prompt_tokens=100, completion_tokens=0),
        )
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=resp)

        result = await client.extract("P", "D")
        assert result.text == ""

    @pytest.mark.asyncio
    async def test_no_usage(self):
        client = OpenRouterClient(api_key="k", model="m")
        message = SimpleNamespace(content="response")
        choice = SimpleNamespace(message=message)
        resp = SimpleNamespace(choices=[choice], usage=None)
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=resp)

        result = await client.extract("P", "D")
        assert result.input_tokens == 0
        assert result.output_tokens == 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_open(self):
        breaker = pybreaker.CircuitBreaker(fail_max=1, reset_timeout=9999)

        # Trip the breaker by causing a failure
        def failing_call():
            raise Exception("forced failure")

        for _ in range(2):
            try:
                breaker.call(failing_call)
            except Exception:
                pass

        client = OpenRouterClient(api_key="k", model="m", circuit_breaker=breaker)

        with pytest.raises(CircuitOpenError):
            await client.extract("P", "D")


class TestProviderSafety:
    """Tests for OpenRouter provider routing configuration."""

    def test_default_provider_config(self):
        """Default provider config restricts to approved non-China providers."""
        client = OpenRouterClient(api_key="k", model="m")
        assert client.provider == OpenRouterClient.DEFAULT_PROVIDER_CONFIG
        assert "deepinfra" in client.provider["only"]
        assert "google-vertex" in client.provider["only"]

    def test_custom_provider_override(self):
        """Custom provider config replaces defaults."""
        custom = {"only": ["google"], "data_collection": "allow"}
        client = OpenRouterClient(api_key="k", model="m", provider=custom)
        assert client.provider == custom
        assert "deepinfra" not in client.provider["only"]

    def test_empty_provider_disables_restrictions(self):
        """Empty dict disables all provider routing restrictions."""
        client = OpenRouterClient(api_key="k", model="m", provider={})
        assert client.provider == {}

    @pytest.mark.asyncio
    async def test_provider_injected_in_extra_body(self):
        """Provider config is injected via extra_body in API call."""
        client = OpenRouterClient(api_key="k", model="m")
        mock_resp = _mock_response()
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=mock_resp)

        await client.extract("P", "D")

        call_kwargs = client._client.chat.completions.create.call_args
        extra_body = call_kwargs.kwargs.get("extra_body", {})
        assert "provider" in extra_body
        assert "deepinfra" in extra_body["provider"]["only"]

    @pytest.mark.asyncio
    async def test_no_extra_body_when_provider_empty(self):
        """Empty provider config does not inject extra_body."""
        client = OpenRouterClient(api_key="k", model="m", provider={})
        mock_resp = _mock_response()
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=mock_resp)

        await client.extract("P", "D")

        call_kwargs = client._client.chat.completions.create.call_args
        assert "extra_body" not in call_kwargs.kwargs


class TestProtocolCompliance:
    """Verify OpenRouterClient satisfies ExtractionClientProtocol."""

    def test_has_extract_method(self):
        client = OpenRouterClient(api_key="k", model="m")
        assert hasattr(client, "extract")
        assert callable(client.extract)

    def test_extract_signature(self):
        """extract() accepts the required parameters."""
        import inspect

        sig = inspect.signature(OpenRouterClient.extract)
        params = list(sig.parameters.keys())
        assert "prompt" in params
        assert "document_text" in params
        assert "max_tokens" in params
        assert "temperature" in params

    def test_max_tokens_default_is_none(self):
        """max_tokens defaults to None so OpenRouter uses full model capacity."""
        import inspect

        sig = inspect.signature(OpenRouterClient.extract)
        assert sig.parameters["max_tokens"].default is None

    @pytest.mark.asyncio
    async def test_none_max_tokens_omits_key_from_request(self):
        """When max_tokens=None, the key must NOT appear in the API call kwargs."""
        client = OpenRouterClient(api_key="k", model="m")
        mock_resp = _mock_response()
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=mock_resp)

        await client.extract("P", "D", max_tokens=None)

        call_kwargs = client._client.chat.completions.create.call_args
        assert "max_tokens" not in call_kwargs.kwargs

    @pytest.mark.asyncio
    async def test_explicit_max_tokens_included_in_request(self):
        """When max_tokens is set, it must be forwarded to the API call."""
        client = OpenRouterClient(api_key="k", model="m")
        mock_resp = _mock_response()
        client._client = MagicMock()
        client._client.chat = MagicMock()
        client._client.chat.completions = MagicMock()
        client._client.chat.completions.create = AsyncMock(return_value=mock_resp)

        await client.extract("P", "D", max_tokens=4096)

        call_kwargs = client._client.chat.completions.create.call_args
        assert call_kwargs.kwargs.get("max_tokens") == 4096


class TestAsyncBreakerCall:
    """Tests for _async_breaker_call — the asyncio-compatible circuit breaker helper."""

    def _tripped_breaker(self, reset_timeout: int = 9999) -> pybreaker.CircuitBreaker:
        """Return a CircuitBreaker in OPEN state."""
        cb = pybreaker.CircuitBreaker(fail_max=1, reset_timeout=reset_timeout)

        def fail() -> None:
            raise RuntimeError("forced trip")

        try:
            cb.call(fail)
        except Exception:
            pass
        assert cb.current_state == "open"
        return cb

    @pytest.mark.asyncio
    async def test_closed_state_success_returns_result(self) -> None:
        """CLOSED state: successful async call returns result and records success."""
        cb = pybreaker.CircuitBreaker(fail_max=3)
        assert cb.current_state == "closed"

        fn = AsyncMock(return_value="ok")
        result = await _async_breaker_call(cb, fn, x=1)

        assert result == "ok"
        fn.assert_awaited_once_with(x=1)

    @pytest.mark.asyncio
    async def test_closed_state_exception_records_error_and_reraises(self) -> None:
        """CLOSED state: when fn raises, error is recorded and exception re-raised."""
        cb = pybreaker.CircuitBreaker(fail_max=3)

        fn = AsyncMock(side_effect=ValueError("bad"))

        with pytest.raises(ValueError, match="bad"):
            await _async_breaker_call(cb, fn)

        fn.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_open_state_timeout_not_elapsed_raises_immediately(self) -> None:
        """OPEN state with timeout not elapsed: CircuitBreakerError raised, fn not called."""
        cb = self._tripped_breaker(reset_timeout=9999)

        fn = AsyncMock(return_value="should not be called")

        with pytest.raises(pybreaker.CircuitBreakerError, match="still open"):
            await _async_breaker_call(cb, fn)

        fn.assert_not_called()

    @pytest.mark.asyncio
    async def test_open_state_timeout_elapsed_calls_half_open_then_proceeds(
        self,
    ) -> None:
        """OPEN state with timeout elapsed: half_open() is called and fn proceeds."""
        cb = self._tripped_breaker(reset_timeout=1)

        # Wind the clock back so the timeout is elapsed
        past = pybreaker.datetime.now(pybreaker.UTC) - pybreaker.timedelta(seconds=10)
        cb._state_storage._opened_at = past

        fn = AsyncMock(return_value="probe-ok")
        result = await _async_breaker_call(cb, fn)

        assert result == "probe-ok"
        fn.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_half_open_state_success_closes_breaker(self) -> None:
        """HALF_OPEN state: successful call records success (not treated as OPEN)."""
        cb = self._tripped_breaker(reset_timeout=9999)
        cb.half_open()
        # Verify we're in HALF_OPEN, not OPEN
        assert cb.current_state != "open"

        fn = AsyncMock(return_value="half-open-ok")
        result = await _async_breaker_call(cb, fn)

        assert result == "half-open-ok"
        fn.assert_awaited_once()
