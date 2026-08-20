"""Extraction validation + re-extraction loop (reflexion-lite).

After Claude returns an extraction JSON, this module:
1. Parses the raw response into an ExtractionResult
2. Runs a pluggable validator function
3. On failure, re-extracts with error feedback appended to the prompt
4. Repeats up to max_retries times
5. After exhausting retries, returns the last extraction with needs_review=True
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field

from extract_sdk.exceptions import (
    CircuitOpenError,
    ExtractionError,
    ExtractionParseError,
)
from extract_sdk.extraction.client import ExtractionClientProtocol
from extract_sdk.extraction.response_parser import parse_extraction_response
from extract_sdk.models import ExtractionResult, ValidationResult
from extract_sdk.schema.registry import FieldRegistry

logger = logging.getLogger(__name__)

# Validator type: takes ExtractionResult, returns ValidationResult
ValidatorFn = Callable[[ExtractionResult], ValidationResult]


@dataclass
class ValidationLoopOutcome:
    """Result of the validation + retry loop."""

    extraction: ExtractionResult | None
    validation_result: ValidationResult
    retries_used: int
    total_tokens: int
    needs_review: bool
    raw_responses: list[str] = field(default_factory=list)


_JSON_REPAIR_SUFFIX = (
    "\n\nIMPORTANT: Return ONLY a single valid JSON object matching the schema. "
    "Do not include markdown fences, comments, prose, or trailing text."
)


def _default_validator(extraction: ExtractionResult) -> ValidationResult:
    """Default validator that always passes (no-op)."""
    return ValidationResult(failures=[])


def _try_parse(
    raw: str, registry: FieldRegistry | None = None
) -> ExtractionResult | None:
    """Attempt to parse a raw response string into an ExtractionResult."""
    try:
        return parse_extraction_response(raw, registry=registry)
    except (ExtractionParseError, ValueError, KeyError):
        return None


async def validate_and_retry(
    *,
    client: ExtractionClientProtocol,
    prompt: str,
    document_text: str,
    raw_response: str,
    registry: FieldRegistry | None = None,
    validator: ValidatorFn | None = None,
    max_retries: int = 2,
) -> ValidationLoopOutcome:
    """Parse, validate, and optionally re-extract with error feedback.

    Args:
        client: Client for re-extraction calls.
        prompt: Original extraction prompt.
        document_text: Original document text.
        raw_response: Claude's initial raw JSON response.
        registry: Optional FieldRegistry for type coercion during parsing.
        validator: Pluggable validation function. If None, uses default (always pass).
        max_retries: Maximum re-extraction attempts (default 2).

    Returns:
        ValidationLoopOutcome with the best extraction achieved.
    """
    if validator is None:
        validator = _default_validator

    raw_responses: list[str] = [raw_response]
    total_tokens = 0
    retries_used = 0

    # Parse the initial response
    current_extraction = _try_parse(raw_response, registry)
    if current_extraction is None:
        validation_result = ValidationResult(failures=[])
        feedback = (
            "The previous response was not valid JSON. "
            "Please return ONLY a valid JSON object matching the schema."
        )
    else:
        validation_result = validator(current_extraction)
        if validation_result.is_valid:
            return ValidationLoopOutcome(
                extraction=current_extraction,
                validation_result=validation_result,
                retries_used=0,
                total_tokens=0,
                needs_review=False,
                raw_responses=raw_responses,
            )
        feedback = validation_result.feedback_prompt

    # Retry loop
    for attempt in range(max_retries):
        retries_used += 1
        retry_prompt = f"{prompt}\n\n{feedback}{_JSON_REPAIR_SUFFIX}"

        try:
            resp = await client.extract(
                prompt=retry_prompt,
                document_text=document_text,
            )
        except (ExtractionError, CircuitOpenError, Exception):
            logger.exception("Re-extraction attempt %d failed", attempt + 1)
            continue

        total_tokens += resp.total_tokens
        raw_responses.append(resp.text)

        parsed = _try_parse(resp.text, registry)
        if parsed is None:
            feedback = (
                "The previous response was not valid JSON. "
                "Please return ONLY a valid JSON object matching the schema."
            )
            continue

        current_extraction = parsed
        validation_result = validator(current_extraction)
        if validation_result.is_valid:
            logger.info("Extraction validation passed after %d retries", retries_used)
            return ValidationLoopOutcome(
                extraction=current_extraction,
                validation_result=validation_result,
                retries_used=retries_used,
                total_tokens=total_tokens,
                needs_review=False,
                raw_responses=raw_responses,
            )
        feedback = validation_result.feedback_prompt

    # Exhausted retries
    logger.warning(
        "Extraction validation still failing after %d retries — marking needs_review",
        retries_used,
    )
    return ValidationLoopOutcome(
        extraction=current_extraction,
        validation_result=validation_result,
        retries_used=retries_used,
        total_tokens=total_tokens,
        needs_review=True,
        raw_responses=raw_responses,
    )
