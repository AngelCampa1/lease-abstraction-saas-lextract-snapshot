"""Tests for validation_loop module (reflexion-lite)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock

import pytest

from extract_sdk.extraction.client import ExtractionClientProtocol
from extract_sdk.extraction.validation_loop import (
    validate_and_retry,
)
from extract_sdk.models import (
    ExtractionResponse,
    ExtractionResult,
    ValidationFailure,
    ValidationResult,
)
from extract_sdk.schema.registry import FieldRegistry


class TestValidateAndRetry:
    """Tests for the reflexion-lite validation loop."""

    @pytest.mark.asyncio
    async def test_valid_on_first_attempt(
        self,
        mock_extraction_client: ExtractionClientProtocol,
        sample_extraction_response_json: str,
    ) -> None:
        """Passes validation immediately — no retries needed."""

        def always_valid(extraction: ExtractionResult) -> ValidationResult:
            return ValidationResult(failures=[])

        outcome = await validate_and_retry(
            client=mock_extraction_client,
            prompt="extract",
            document_text="lease text",
            raw_response=sample_extraction_response_json,
            validator=always_valid,
        )
        assert outcome.extraction is not None
        assert outcome.retries_used == 0
        assert outcome.needs_review is False
        assert len(outcome.raw_responses) == 1

    @pytest.mark.asyncio
    async def test_invalid_then_valid_on_retry(self) -> None:
        """First attempt fails validation, second succeeds."""
        call_count = 0
        good_response = json.dumps({
            "fields": {
                "base_rent_annual": {
                    "value": 150000, "confidence": 0.95, "source_text": "src"
                }
            }
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=good_response, input_tokens=100, output_tokens=50
            )
        )

        def validator(extraction: ExtractionResult) -> ValidationResult:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return ValidationResult(failures=[
                    ValidationFailure(
                        field_name="base_rent_annual",
                        message="Value seems too low",
                    )
                ])
            return ValidationResult(failures=[])

        bad_response = json.dumps({
            "fields": {
                "base_rent_annual": {
                    "value": 100, "confidence": 0.5, "source_text": "src"
                }
            }
        })

        outcome = await validate_and_retry(
            client=client,
            prompt="extract",
            document_text="lease text",
            raw_response=bad_response,
            validator=validator,
        )
        assert outcome.extraction is not None
        assert outcome.retries_used == 1
        assert outcome.needs_review is False

    @pytest.mark.asyncio
    async def test_exhausted_retries(self) -> None:
        """All retries fail — marks needs_review."""
        bad_response = json.dumps({
            "fields": {"test": {"value": "bad", "confidence": 0.2, "source_text": "s"}}
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=bad_response, input_tokens=100, output_tokens=50
            )
        )

        def always_fail(extraction: ExtractionResult) -> ValidationResult:
            return ValidationResult(failures=[
                ValidationFailure(field_name="test", message="always wrong")
            ])

        outcome = await validate_and_retry(
            client=client,
            prompt="extract",
            document_text="text",
            raw_response=bad_response,
            validator=always_fail,
            max_retries=2,
        )
        assert outcome.needs_review is True
        assert outcome.retries_used == 2
        assert outcome.extraction is not None

    @pytest.mark.asyncio
    async def test_initial_parse_failure_then_recovery(self) -> None:
        """Initial response is invalid JSON, retry succeeds."""
        good_response = json.dumps({
            "fields": {"test": {"value": "ok", "confidence": 0.9, "source_text": "s"}}
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=good_response, input_tokens=100, output_tokens=50
            )
        )

        outcome = await validate_and_retry(
            client=client,
            prompt="extract",
            document_text="text",
            raw_response="not valid json!!!",
        )
        assert outcome.extraction is not None
        assert outcome.retries_used == 1
        assert outcome.needs_review is False

    @pytest.mark.asyncio
    async def test_default_validator_always_passes(
        self, sample_extraction_response_json: str,
        mock_extraction_client: ExtractionClientProtocol,
    ) -> None:
        """With no validator, all valid JSON passes."""
        outcome = await validate_and_retry(
            client=mock_extraction_client,
            prompt="extract",
            document_text="text",
            raw_response=sample_extraction_response_json,
        )
        assert outcome.needs_review is False
        assert outcome.retries_used == 0

    @pytest.mark.asyncio
    async def test_retry_with_api_exception(self) -> None:
        """Tests that API exceptions during retry are handled gracefully."""
        bad_response = json.dumps({
            "fields": {"test": {"value": "bad", "confidence": 0.2, "source_text": "s"}}
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(side_effect=Exception("API error"))

        def always_fail(extraction: ExtractionResult) -> ValidationResult:
            return ValidationResult(failures=[
                ValidationFailure(field_name="test", message="wrong")
            ])

        outcome = await validate_and_retry(
            client=client,
            prompt="extract",
            document_text="text",
            raw_response=bad_response,
            validator=always_fail,
            max_retries=2,
        )
        assert outcome.needs_review is True
        assert outcome.retries_used == 2

    @pytest.mark.asyncio
    async def test_retry_returns_invalid_json(self) -> None:
        """Test retry when Claude returns invalid JSON."""
        bad_response = json.dumps({
            "fields": {"test": {"value": "bad", "confidence": 0.2, "source_text": "s"}}
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text="still not json", input_tokens=100, output_tokens=50
            )
        )

        def always_fail(extraction: ExtractionResult) -> ValidationResult:
            return ValidationResult(failures=[
                ValidationFailure(field_name="test", message="wrong")
            ])

        outcome = await validate_and_retry(
            client=client,
            prompt="extract",
            document_text="text",
            raw_response=bad_response,
            validator=always_fail,
            max_retries=1,
        )
        assert outcome.needs_review is True
        assert len(outcome.raw_responses) == 2

    @pytest.mark.asyncio
    async def test_with_registry(
        self,
        sample_registry: FieldRegistry,
        sample_extraction_response_json: str,
        mock_extraction_client: ExtractionClientProtocol,
    ) -> None:
        """Test validation loop with registry for type coercion."""
        outcome = await validate_and_retry(
            client=mock_extraction_client,
            prompt="extract",
            document_text="text",
            raw_response=sample_extraction_response_json,
            registry=sample_registry,
        )
        assert outcome.extraction is not None
        assert outcome.needs_review is False

    @pytest.mark.asyncio
    async def test_total_tokens_accumulation(self) -> None:
        """Total tokens accumulate across retries."""
        response_json = json.dumps({
            "fields": {"test": {"value": "ok", "confidence": 0.9, "source_text": "s"}}
        })

        call_count = 0
        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=response_json, input_tokens=100, output_tokens=50
            )
        )

        def pass_on_second(extraction: ExtractionResult) -> ValidationResult:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return ValidationResult(failures=[
                    ValidationFailure(field_name="test", message="retry")
                ])
            return ValidationResult(failures=[])

        outcome = await validate_and_retry(
            client=client,
            prompt="extract",
            document_text="text",
            raw_response=response_json,
            validator=pass_on_second,
        )
        assert outcome.total_tokens == 150  # 100 + 50 from one retry

    @pytest.mark.asyncio
    async def test_validation_feedback_in_retry_prompt(self) -> None:
        """Verify that validation feedback is included in retry prompt."""
        response_json = json.dumps({
            "fields": {"test": {"value": "v", "confidence": 0.5, "source_text": "s"}}
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=response_json, input_tokens=100, output_tokens=50
            )
        )

        def fail_with_message(extraction: ExtractionResult) -> ValidationResult:
            return ValidationResult(failures=[
                ValidationFailure(field_name="test", message="Value is wrong")
            ])

        await validate_and_retry(
            client=client,
            prompt="extract",
            document_text="text",
            raw_response=response_json,
            validator=fail_with_message,
            max_retries=1,
        )

        # Check that the retry call included feedback
        call_args = client.extract.call_args
        assert "Value is wrong" in call_args.kwargs["prompt"]
