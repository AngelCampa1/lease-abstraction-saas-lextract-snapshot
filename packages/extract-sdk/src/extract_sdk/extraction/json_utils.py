"""Utilities for extracting JSON from messy model responses.

Handles common issues: markdown code fences, <think> reasoning blocks,
leading/trailing prose, and malformed JSON.
"""

from __future__ import annotations

import json
import re
from typing import Any

from extract_sdk.exceptions import ExtractionParseError

# Compiled regex for stripping leading <think>...</think> blocks from reasoning
# models (Qwen3-Thinking, QwQ, DeepSeek R1, etc.).  The \s* prefix handles any
# leading whitespace some providers may prepend.
_THINK_TAG_RE = re.compile(r"\A\s*<think>.*?</think>\s*", re.DOTALL)

# Matches ```json ... ``` or ``` ... ``` code fences.
_CODE_FENCE_RE = re.compile(r"```(?:json)?\s*\n?(.*?)\n?\s*```", re.DOTALL)


def strip_thinking_tags(text: str) -> str:
    """Remove a leading ``<think>...</think>`` block from reasoning models.

    Handles output from Qwen3-Thinking, QwQ, DeepSeek R1, and any other
    model that emits reasoning traces in ``<think>`` tags.  Only the first
    leading block is removed; subsequent occurrences inside the actual
    response content are left intact.

    Args:
        text: Raw model response, possibly prefixed with a reasoning block.

    Returns:
        Response text with the leading think block stripped.
    """
    return _THINK_TAG_RE.sub("", text)


def extract_json(text: str) -> dict[str, Any]:
    """Extract a JSON object from a model response.

    Tries multiple strategies in order:
    1. Strip ``<think>`` blocks, then try direct parse
    2. Extract content from markdown code fences
    3. Find the first ``{`` and last ``}`` and parse that substring

    Args:
        text: Raw model response text.

    Returns:
        Parsed JSON as a dict.

    Raises:
        ExtractionParseError: If no valid JSON can be extracted.
    """
    if not text or not text.strip():
        raise ExtractionParseError("Empty response text")

    # Step 1: Strip think tags
    cleaned = strip_thinking_tags(text).strip()

    # Step 2: Try direct parse
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    # Step 3: Try extracting from code fences
    fence_match = _CODE_FENCE_RE.search(cleaned)
    if fence_match:
        try:
            result = json.loads(fence_match.group(1).strip())
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    # Step 4: Find first { and last } — brute force substring
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        candidate = cleaned[first_brace : last_brace + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    raise ExtractionParseError(
        f"Could not extract JSON from response (length={len(text)})"
    )
