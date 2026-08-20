"""Tests for JSON extraction utilities."""

import pytest

from extract_sdk.exceptions import ExtractionParseError
from extract_sdk.extraction.json_utils import extract_json, strip_thinking_tags


class TestStripThinkingTags:
    """Tests for reasoning model <think> block removal."""

    def test_no_think_tag(self):
        text = '{"field": "value"}'
        assert strip_thinking_tags(text) == '{"field": "value"}'

    def test_leading_think_tag(self):
        text = '<think>Let me analyze this...</think>{"field": "value"}'
        assert strip_thinking_tags(text) == '{"field": "value"}'

    def test_multiline_think_tag(self):
        text = (
            "<think>\nI need to consider:\n1. First\n2. Second\n"
            "</think>\n\n{\"result\": 42}"
        )
        assert strip_thinking_tags(text) == '{"result": 42}'

    def test_only_first_think_tag_stripped(self):
        text = "<think>first</think>response with <think>second</think> inside"
        result = strip_thinking_tags(text)
        assert "first" not in result
        assert "<think>second</think>" in result

    def test_empty_string(self):
        assert strip_thinking_tags("") == ""

    def test_no_closing_tag(self):
        text = "<think>no closing tag here"
        assert strip_thinking_tags(text) == "<think>no closing tag here"


class TestExtractJson:
    """Tests for extract_json() multi-strategy parser."""

    def test_raw_json(self):
        text = '{"fields": {"rent": 1200}}'
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_json_with_whitespace(self):
        text = '  \n  {"fields": {"rent": 1200}}  \n  '
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_json_in_code_fence(self):
        text = 'Here is the extraction:\n```json\n{"fields": {"rent": 1200}}\n```'
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_json_in_plain_code_fence(self):
        text = '```\n{"fields": {"rent": 1200}}\n```'
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_json_with_think_tags(self):
        text = (
            "<think>Analyzing lease terms...</think>"
            '{"fields": {"rent": 1200}}'
        )
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_json_with_leading_prose(self):
        text = (
            "Based on my analysis of the lease document, here are the "
            'extracted fields:\n{"fields": {"rent": 1200}}'
        )
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_json_with_trailing_prose(self):
        text = (
            '{"fields": {"rent": 1200}}\n\n'
            "I've extracted the key fields above."
        )
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_json_surrounded_by_prose(self):
        text = (
            "Here is the result:\n"
            '{"fields": {"rent": 1200}}\n'
            "Note: confidence is high."
        )
        result = extract_json(text)
        assert result == {"fields": {"rent": 1200}}

    def test_think_plus_code_fence(self):
        text = (
            "<think>Let me check the fields...</think>\n"
            "```json\n"
            '{"field_corrections": {}}\n'
            "```"
        )
        result = extract_json(text)
        assert result == {"field_corrections": {}}

    def test_empty_string_raises(self):
        with pytest.raises(ExtractionParseError, match="Empty response"):
            extract_json("")

    def test_whitespace_only_raises(self):
        with pytest.raises(ExtractionParseError, match="Empty response"):
            extract_json("   \n  ")

    def test_no_json_raises(self):
        with pytest.raises(ExtractionParseError, match="Could not extract JSON"):
            extract_json("This response contains no JSON at all.")

    def test_invalid_json_raises(self):
        with pytest.raises(ExtractionParseError, match="Could not extract JSON"):
            extract_json("{broken: json, missing quotes}")

    def test_array_not_dict_uses_brace_strategy(self):
        # extract_json expects a dict; an array should fail all strategies
        with pytest.raises(ExtractionParseError):
            extract_json("[1, 2, 3]")

    def test_nested_json(self):
        text = '{"fields": {"rent": {"value": 1200, "confidence": 0.95}}}'
        result = extract_json(text)
        assert result["fields"]["rent"]["value"] == 1200
        assert result["fields"]["rent"]["confidence"] == 0.95
