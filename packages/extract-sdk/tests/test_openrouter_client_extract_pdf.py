"""Tests for OpenRouterClient.extract_pdf — TDD suite.

All tests exercise:
- Happy-path return type and token parsing
- Base64 encoding of PDF bytes in the payload
- Thinking-tag stripping from model output
- Edge cases: empty choices, missing usage
- Circuit breaker open → CircuitOpenError
- Payload structure: provider config and fallback models
- Tenacity retry on HTTP 5xx (succeeds on 2nd attempt)
- Tenacity retry exhaustion (both fail) → ExtractionError
- No provider key when provider config is empty
- Context manager: __aenter__/__aexit__ / close()
"""

from __future__ import annotations

import base64
from unittest.mock import AsyncMock, MagicMock

import httpx
import pybreaker
import pytest

from extract_sdk.exceptions import CircuitOpenError, ExtractionError
from extract_sdk.extraction.openrouter_client import OpenRouterClient
from extract_sdk.models import ExtractionResponse

# Module-level alias — populated after import so tests can reference it directly.
DEFAULT_PROVIDER_CONFIG = OpenRouterClient.DEFAULT_PROVIDER_CONFIG


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PDF_BYTES = b"%PDF-1.4 fake pdf content for testing"
FILENAME = "lease.pdf"
PROMPT = "Extract all lease fields."


def _make_httpx_response(
    status_code: int = 200,
) -> MagicMock:
    """Build a mock httpx.Response."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = {
        "choices": [{"message": {"content": "result"}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5},
    }
    resp.raise_for_status = MagicMock()
    return resp


def _make_client(
    *,
    provider: dict | None = None,
    fallback_models: list[str] | None = None,
    circuit_breaker: pybreaker.CircuitBreaker | None = None,
) -> OpenRouterClient:
    """Return a test client with sensible defaults."""
    return OpenRouterClient(
        api_key="sk-test",
        model="google/gemini-3-flash",
        provider=provider,
        fallback_models=fallback_models,
        circuit_breaker=circuit_breaker,
    )


# ---------------------------------------------------------------------------
# Test 1: happy path — correct return type
# ---------------------------------------------------------------------------


class TestExtractPdfReturnsExtractionResponse:
    @pytest.mark.asyncio
    async def test_extract_pdf_returns_extraction_response(self):
        """extract_pdf must return an ExtractionResponse on success."""
        client = _make_client()
        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "extracted text"}}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 50},
        }

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = AsyncMock(return_value=mock_resp)

        result = await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert isinstance(result, ExtractionResponse)
        assert result.text == "extracted text"
        assert result.input_tokens == 100
        assert result.output_tokens == 50


# ---------------------------------------------------------------------------
# Test 2: base64 encoding of PDF bytes
# ---------------------------------------------------------------------------


class TestExtractPdfEncodingPayload:
    @pytest.mark.asyncio
    async def test_extract_pdf_encodes_bytes_as_base64(self):
        """Payload file_data must be data:application/pdf;base64,<b64>."""
        client = _make_client()
        captured_payload: dict = {}
        expected_b64 = base64.b64encode(PDF_BYTES).decode()

        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "ok"}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }

        async def capture_post(url: str, *, json: dict, headers: dict) -> MagicMock:
            captured_payload.update(json)
            return mock_resp

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = capture_post

        await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        user_msg = captured_payload["messages"][1]
        file_part = next(p for p in user_msg["content"] if p.get("type") == "file")
        expected_file_data = f"data:application/pdf;base64,{expected_b64}"
        assert file_part["file"]["file_data"] == expected_file_data
        assert file_part["file"]["filename"] == FILENAME


# ---------------------------------------------------------------------------
# Test 3: thinking tags stripped
# ---------------------------------------------------------------------------


class TestExtractPdfStripsThinkingTags:
    @pytest.mark.asyncio
    async def test_extract_pdf_strips_thinking_tags(self):
        """<think>...</think> blocks must be removed from the returned text."""
        client = _make_client()
        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "<think>Analyzing the lease...</think>{'field': 'value'}"
                    }
                }
            ],
            "usage": {"prompt_tokens": 200, "completion_tokens": 80},
        }

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = AsyncMock(return_value=mock_resp)

        result = await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert "<think>" not in result.text
        assert "</think>" not in result.text
        assert "{'field': 'value'}" in result.text


# ---------------------------------------------------------------------------
# Test 4: empty choices → ExtractionResponse(text='')
# ---------------------------------------------------------------------------


class TestExtractPdfEmptyChoices:
    @pytest.mark.asyncio
    async def test_extract_pdf_empty_choices_returns_empty_string(self):
        """When choices list is empty, ExtractionResponse.text must be ''."""
        client = _make_client()
        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [],
            "usage": {"prompt_tokens": 50, "completion_tokens": 0},
        }

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = AsyncMock(return_value=mock_resp)

        result = await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert result.text == ""

    @pytest.mark.asyncio
    async def test_extract_pdf_choice_missing_message_returns_empty_string(self):
        """A choice with no 'message' key (malformed body) degrades to ''.

        Vision-LLM responses occasionally omit 'message' (e.g. truncated or
        provider-malformed bodies). The client must not raise a raw KeyError;
        it degrades to empty text exactly like the empty-choices case.
        """
        client = _make_client()
        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{}],
            "usage": {"prompt_tokens": 50, "completion_tokens": 0},
        }

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = AsyncMock(return_value=mock_resp)

        result = await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert result.text == ""

    @pytest.mark.asyncio
    async def test_extract_pdf_message_missing_content_returns_empty_string(self):
        """A message with no 'content' key (e.g. content-filter refusal).

        finish_reason=content_filter / tool-call responses can return a
        message object without a 'content' key. The client must degrade to ''
        rather than raising KeyError.
        """
        client = _make_client()
        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{"message": {"role": "assistant"}}],
            "usage": {"prompt_tokens": 50, "completion_tokens": 0},
        }

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = AsyncMock(return_value=mock_resp)

        result = await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert result.text == ""


# ---------------------------------------------------------------------------
# Test 5: missing usage → defaults to zero
# ---------------------------------------------------------------------------


class TestExtractPdfMissingUsage:
    @pytest.mark.asyncio
    async def test_extract_pdf_missing_usage_defaults_to_zero(self):
        """When 'usage' key is absent, input_tokens and output_tokens must be 0."""
        client = _make_client()
        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "text"}}],
            # no "usage" key
        }

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = AsyncMock(return_value=mock_resp)

        result = await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert result.input_tokens == 0
        assert result.output_tokens == 0


# ---------------------------------------------------------------------------
# Test 6: circuit breaker open → CircuitOpenError
# ---------------------------------------------------------------------------


class TestExtractPdfCircuitBreaker:
    @pytest.mark.asyncio
    async def test_extract_pdf_circuit_breaker_raises_circuit_open_error(self):
        """When the circuit breaker is open, CircuitOpenError must be raised."""
        breaker = pybreaker.CircuitBreaker(fail_max=1, reset_timeout=9999)

        # Trip the breaker
        def _fail():
            raise Exception("forced failure")

        for _ in range(2):
            try:
                breaker.call(_fail)
            except Exception:
                pass

        client = _make_client(circuit_breaker=breaker)

        with pytest.raises(CircuitOpenError):
            await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)


# ---------------------------------------------------------------------------
# Test 7: DEFAULT_PROVIDER_CONFIG appears in payload["provider"]
# ---------------------------------------------------------------------------


class TestExtractPdfProviderInPayload:
    @pytest.mark.asyncio
    async def test_extract_pdf_includes_provider_in_payload(self):
        """DEFAULT_PROVIDER_CONFIG must appear as payload['provider']."""
        client = _make_client()  # uses DEFAULT_PROVIDER_CONFIG
        captured_payload: dict = {}

        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "ok"}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }

        async def capture_post(url: str, *, json: dict, headers: dict) -> MagicMock:
            captured_payload.update(json)
            return mock_resp

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = capture_post

        await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert "provider" in captured_payload
        assert captured_payload["provider"] == DEFAULT_PROVIDER_CONFIG


# ---------------------------------------------------------------------------
# Test 8: fallback models appear in payload["models"]
# ---------------------------------------------------------------------------


class TestExtractPdfFallbackModels:
    @pytest.mark.asyncio
    async def test_extract_pdf_fallback_models_in_payload(self):
        """Fallback models must appear in payload['models'] after the primary."""
        fallbacks = ["google/gemini-flash-1.5", "anthropic/claude-3-haiku"]
        client = _make_client(fallback_models=fallbacks)
        captured_payload: dict = {}

        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "ok"}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }

        async def capture_post(url: str, *, json: dict, headers: dict) -> MagicMock:
            captured_payload.update(json)
            return mock_resp

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = capture_post

        await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert "models" in captured_payload
        assert captured_payload["models"][0] == "google/gemini-3-flash"
        assert fallbacks[0] in captured_payload["models"]
        assert fallbacks[1] in captured_payload["models"]


# ---------------------------------------------------------------------------
# Test 9: HTTP 500 triggers tenacity retry (succeeds on 2nd attempt)
# ---------------------------------------------------------------------------


class TestExtractPdfRetryOn5xx:
    @pytest.mark.asyncio
    async def test_extract_pdf_retries_on_5xx_via_tenacity(self):
        """HTTP 500 must trigger at least 2 calls via tenacity retry."""
        client = _make_client()
        call_count = 0

        success_resp = _make_httpx_response()
        success_resp.json.return_value = {
            "choices": [{"message": {"content": "ok"}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }

        async def flaky_post(url: str, *, json: dict, headers: dict) -> MagicMock:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First call raises 500
                error_resp = MagicMock(spec=httpx.Response)
                error_resp.status_code = 500
                raise httpx.HTTPStatusError(
                    "Server error",
                    request=MagicMock(),
                    response=error_resp,
                )
            # Second call succeeds
            return success_resp

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = flaky_post

        result = await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert call_count >= 2
        assert result.text == "ok"


# ---------------------------------------------------------------------------
# Test 10: empty provider → no "provider" key in payload
# ---------------------------------------------------------------------------


class TestExtractPdfNoProviderWhenEmpty:
    @pytest.mark.asyncio
    async def test_extract_pdf_no_provider_when_empty(self):
        """Empty provider config must NOT add 'provider' key to payload."""
        client = _make_client(provider={})
        captured_payload: dict = {}

        mock_resp = _make_httpx_response()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "ok"}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }

        async def capture_post(url: str, *, json: dict, headers: dict) -> MagicMock:
            captured_payload.update(json)
            return mock_resp

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = capture_post

        await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert "provider" not in captured_payload


# ---------------------------------------------------------------------------
# Test 11: retry exhaustion — both attempts fail → ExtractionError
# ---------------------------------------------------------------------------


class TestExtractPdfRetryExhaustionRaisesExtractionError:
    @pytest.mark.asyncio
    async def test_extract_pdf_retry_exhaustion_raises_extraction_error(self):
        """Both retry attempts fail with 5xx → ExtractionError is raised."""
        client = _make_client()
        call_count = 0

        async def always_fail(url: str, *, json: dict, headers: dict) -> MagicMock:
            nonlocal call_count
            call_count += 1
            error_resp = MagicMock(spec=httpx.Response)
            error_resp.status_code = 500
            raise httpx.HTTPStatusError(
                "Server error",
                request=MagicMock(),
                response=error_resp,
            )

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = always_fail

        with pytest.raises(ExtractionError):
            await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        # tenacity stop_after_attempt(2) → exactly 2 attempts
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_extract_pdf_timeout_exhaustion_raises_extraction_error(self):
        """Both retry attempts fail with TimeoutException → ExtractionError."""
        client = _make_client()
        call_count = 0

        async def always_timeout(url: str, *, json: dict, headers: dict) -> MagicMock:
            nonlocal call_count
            call_count += 1
            raise httpx.TimeoutException("timed out", request=MagicMock())

        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.post = always_timeout

        with pytest.raises(ExtractionError):
            await client.extract_pdf(PROMPT, PDF_BYTES, FILENAME)

        assert call_count == 2


# ---------------------------------------------------------------------------
# Test 12: context manager and close()
# ---------------------------------------------------------------------------


class TestOpenRouterClientContextManager:
    @pytest.mark.asyncio
    async def test_aenter_returns_self(self):
        """__aenter__ must return the client instance itself."""
        client = _make_client()
        # Mock out the real http client to avoid real connections on close
        client._http_client = AsyncMock(spec=httpx.AsyncClient)
        client._http_client.aclose = AsyncMock()
        client._client = AsyncMock()
        client._client.close = AsyncMock()

        entered = await client.__aenter__()
        assert entered is client

    @pytest.mark.asyncio
    async def test_aexit_calls_close(self):
        """__aexit__ must call close(), which closes both internal clients."""
        client = _make_client()
        mock_http = AsyncMock(spec=httpx.AsyncClient)
        mock_http.aclose = AsyncMock()
        client._http_client = mock_http

        mock_openai = AsyncMock()
        mock_openai.close = AsyncMock()
        client._client = mock_openai

        await client.__aexit__(None, None, None)

        mock_http.aclose.assert_called_once()
        mock_openai.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_context_manager_closes_on_exit(self):
        """Using client as async context manager must call close on exit."""
        client = _make_client()
        mock_http = AsyncMock(spec=httpx.AsyncClient)
        mock_http.aclose = AsyncMock()
        client._http_client = mock_http

        mock_openai = AsyncMock()
        mock_openai.close = AsyncMock()
        client._client = mock_openai

        async with client:
            pass

        mock_http.aclose.assert_called_once()
        mock_openai.close.assert_called_once()
