"""Tests for the dual-extract judge module."""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import BaseModel

from extract_sdk.extraction.judge import (
    JudgeResult,
    JudgeVerdict,
    _build_judge_payload,
    _build_verdicts,
    _coerce_value,
    _compute_field_diffs,
    _parse_verdicts_payload,
    _resolve_field_annotation,
    judge_extractions,
)
from extract_sdk.models import ExtractionResponse


class _SampleModel(BaseModel):
    """Schema mirror used to drive judge type coercion."""

    base_rent_annual: float | None = None
    lease_term_months: int | None = None
    landlord_legal_name: str | None = None
    pro_rata_share: Decimal | None = None
    has_renewal_option: bool | None = None
    nested_payload: dict[str, Any] | None = None


def _make_client(
    response_text: str = "[]",
    input_tokens: int = 100,
    output_tokens: int = 50,
) -> Any:
    """Build a mock ExtractionClientProtocol that returns ``response_text``."""
    client = MagicMock()
    client.extract = AsyncMock(
        return_value=ExtractionResponse(
            text=response_text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
    )
    return client


class TestComputeFieldDiffs:
    def test_no_diffs_when_equal(self) -> None:
        a = {"x": 1, "y": "foo"}
        assert _compute_field_diffs(a, dict(a)) == []

    def test_atom_diff(self) -> None:
        a = {"rent": 100}
        b = {"rent": 200}
        assert _compute_field_diffs(a, b) == [("rent", 100, 200)]

    def test_missing_key_b(self) -> None:
        a = {"rent": 100, "term": 60}
        b = {"rent": 100}
        assert _compute_field_diffs(a, b) == [("term", 60, None)]

    def test_missing_key_a(self) -> None:
        a = {"rent": 100}
        b = {"rent": 100, "extra": "yes"}
        assert _compute_field_diffs(a, b) == [("extra", None, "yes")]

    def test_recurse_into_dicts(self) -> None:
        a = {"obj": {"k": 1, "k2": 2}}
        b = {"obj": {"k": 9, "k2": 2}}
        assert _compute_field_diffs(a, b) == [("obj.k", 1, 9)]

    def test_dict_vs_atom_emits_parent_diff(self) -> None:
        a = {"obj": {"k": 1}}
        b = {"obj": "not-a-dict"}
        assert _compute_field_diffs(a, b) == [("obj", {"k": 1}, "not-a-dict")]


class TestResolveFieldAnnotation:
    def test_known_top_level(self) -> None:
        assert _resolve_field_annotation("base_rent_annual", _SampleModel) is not None

    def test_unknown_field_returns_none(self) -> None:
        assert _resolve_field_annotation("not_a_field", _SampleModel) is None

    def test_nested_uses_head(self) -> None:
        # nested_payload is a dict — the head matches even if the trailing
        # path does not.  Coercion will still reject most nested values.
        assert (
            _resolve_field_annotation("nested_payload.subfield", _SampleModel)
            is not None
        )


class TestCoerceValue:
    def test_unknown_field_rejected(self) -> None:
        ok, _ = _coerce_value("missing_field", "anything", _SampleModel)
        assert ok is False

    def test_none_accepted_for_optional(self) -> None:
        ok, val = _coerce_value("base_rent_annual", None, _SampleModel)
        assert ok is True
        assert val is None

    def test_direct_int_match(self) -> None:
        ok, val = _coerce_value("lease_term_months", 60, _SampleModel)
        assert ok is True
        assert val == 60

    def test_bool_not_accepted_as_int(self) -> None:
        # Without the explicit guard, ``isinstance(True, int)`` would slip
        # through. Confirm the guard rejects bools where ints are expected.
        ok, _ = _coerce_value("lease_term_months", True, _SampleModel)
        assert ok is False

    def test_string_to_int(self) -> None:
        ok, val = _coerce_value("lease_term_months", "60", _SampleModel)
        assert ok is True
        assert val == 60

    def test_string_to_int_fails_on_garbage(self) -> None:
        ok, _ = _coerce_value("lease_term_months", "sixty", _SampleModel)
        assert ok is False

    def test_string_to_float(self) -> None:
        ok, val = _coerce_value("base_rent_annual", "120000.50", _SampleModel)
        assert ok is True
        assert val == pytest.approx(120000.50)

    def test_string_to_float_rejected_on_garbage(self) -> None:
        ok, _ = _coerce_value("base_rent_annual", "not a number", _SampleModel)
        assert ok is False

    def test_string_to_decimal(self) -> None:
        ok, val = _coerce_value("pro_rata_share", "0.0525", _SampleModel)
        assert ok is True
        assert val == Decimal("0.0525")

    def test_string_to_decimal_rejected(self) -> None:
        ok, _ = _coerce_value("pro_rata_share", "n/a", _SampleModel)
        assert ok is False

    def test_int_promoted_to_float(self) -> None:
        ok, val = _coerce_value("base_rent_annual", 120000, _SampleModel)
        assert ok is True
        assert val == 120000.0

    def test_bool_not_promoted_to_float(self) -> None:
        # bool is a subclass of int; ``True`` must not coerce to 1.0 for float fields.
        ok, _ = _coerce_value("base_rent_annual", True, _SampleModel)
        assert ok is False

    def test_string_field_accepts_string(self) -> None:
        ok, val = _coerce_value("landlord_legal_name", "Acme Co", _SampleModel)
        assert ok is True
        assert val == "Acme Co"

    def test_mismatched_type_rejected(self) -> None:
        # 123 cannot be coerced to a string-only field via our coercion table
        # (the helper only adds string→numeric promotions, not the reverse).
        ok, _ = _coerce_value("landlord_legal_name", 123, _SampleModel)
        assert ok is False


class TestParseVerdictsPayload:
    def test_plain_array(self) -> None:
        out = _parse_verdicts_payload('[{"a": 1}, {"b": 2}]')
        assert out == [{"a": 1}, {"b": 2}]

    def test_strips_markdown_fence(self) -> None:
        text = '```json\n[{"a": 1}]\n```'
        out = _parse_verdicts_payload(text)
        assert out == [{"a": 1}]

    def test_invalid_json_returns_none(self) -> None:
        assert _parse_verdicts_payload("not json") is None

    def test_non_list_returns_none(self) -> None:
        assert _parse_verdicts_payload('{"foo": "bar"}') is None

    def test_filters_non_dict_entries(self) -> None:
        # 5 is not a dict — it is dropped silently.
        out = _parse_verdicts_payload('[{"a": 1}, 5, "string", {"b": 2}]')
        assert out == [{"a": 1}, {"b": 2}]


class TestBuildVerdicts:
    def test_drops_unknown_field(self) -> None:
        diffs = [("not_a_field", "x", "y")]
        verdicts = _build_verdicts(
            [
                {
                    "field_path": "not_a_field",
                    "winner": "a",
                    "value": "x",
                    "confidence": 0.9,
                    "reason": "n/a",
                }
            ],
            diffs,
            _SampleModel,
        )
        assert verdicts == []

    def test_drops_non_disagreeing_field(self) -> None:
        # The judge claims a verdict for a field that wasn't in the diff list.
        diffs = [("base_rent_annual", 100, 200)]
        verdicts = _build_verdicts(
            [
                {
                    "field_path": "lease_term_months",
                    "winner": "a",
                    "value": 60,
                    "confidence": 1.0,
                    "reason": "no",
                }
            ],
            diffs,
            _SampleModel,
        )
        assert verdicts == []

    def test_drops_invalid_winner(self) -> None:
        diffs = [("base_rent_annual", 100, 200)]
        verdicts = _build_verdicts(
            [
                {
                    "field_path": "base_rent_annual",
                    "winner": "neither",
                    "value": 150,
                    "confidence": 0.5,
                    "reason": "weird",
                }
            ],
            diffs,
            _SampleModel,
        )
        assert verdicts == []

    def test_drops_missing_value(self) -> None:
        diffs = [("base_rent_annual", 100, 200)]
        verdicts = _build_verdicts(
            [
                {
                    "field_path": "base_rent_annual",
                    "winner": "a",
                    "confidence": 0.9,
                    "reason": "yes",
                }
            ],
            diffs,
            _SampleModel,
        )
        assert verdicts == []

    def test_drops_uncoercible_value(self) -> None:
        diffs = [("lease_term_months", 60, 72)]
        verdicts = _build_verdicts(
            [
                {
                    "field_path": "lease_term_months",
                    "winner": "synthesis",
                    "value": "five hundred years",
                    "confidence": 0.5,
                    "reason": "weird",
                }
            ],
            diffs,
            _SampleModel,
        )
        assert verdicts == []

    def test_accepts_each_winner_literal(self) -> None:
        diffs = [
            ("base_rent_annual", 100, 200),
            ("lease_term_months", 60, 72),
            ("landlord_legal_name", "Foo", "Bar"),
        ]
        verdicts = _build_verdicts(
            [
                {
                    "field_path": "base_rent_annual",
                    "winner": "a",
                    "value": 100,
                    "confidence": 0.9,
                    "reason": "A correct",
                },
                {
                    "field_path": "lease_term_months",
                    "winner": "b",
                    "value": 72,
                    "confidence": 0.7,
                    "reason": "B better",
                },
                {
                    "field_path": "landlord_legal_name",
                    "winner": "synthesis",
                    "value": "Acme Properties LLC",
                    "confidence": 0.6,
                    "reason": "merged",
                },
            ],
            diffs,
            _SampleModel,
        )
        assert {v.winner for v in verdicts} == {"a", "b", "synthesis"}

    def test_invalid_confidence_falls_back_to_zero(self) -> None:
        diffs = [("base_rent_annual", 100, 200)]
        verdicts = _build_verdicts(
            [
                {
                    "field_path": "base_rent_annual",
                    "winner": "a",
                    "value": 100,
                    "confidence": "high",
                    "reason": "ok",
                }
            ],
            diffs,
            _SampleModel,
        )
        assert len(verdicts) == 1
        assert verdicts[0].confidence == 0.0

    def test_skips_non_dict_entries(self) -> None:
        diffs = [("base_rent_annual", 100, 200)]
        verdicts = _build_verdicts(
            [
                {"field_path": None, "winner": "a", "value": 100},
                {"field_path": "", "winner": "a", "value": 100},
            ],
            diffs,
            _SampleModel,
        )
        assert verdicts == []


class TestBuildJudgePayload:
    def test_payload_includes_diffs_and_schema(self) -> None:
        diffs = [("base_rent_annual", 100, 200)]
        payload = _build_judge_payload(
            {"base_rent_annual": 100},
            {"base_rent_annual": 200},
            diffs,
            _SampleModel,
        )
        assert "Disagreeing fields" in payload
        assert "base_rent_annual" in payload
        # Schema JSON should be embedded.
        assert "properties" in payload


class TestJudgeExtractionsAsync:
    @pytest.mark.asyncio
    async def test_no_diffs_returns_empty_result(self) -> None:
        client = _make_client()
        result = await judge_extractions(
            {"base_rent_annual": 100},
            {"base_rent_annual": 100},
            model_class=_SampleModel,
            client=client,
            judge_model="z-ai/glm-5.1",
        )
        assert result.verdicts == []
        # No LLM call when there are no diffs.
        assert client.extract.call_count == 0
        assert result.model_used == "z-ai/glm-5.1"

    @pytest.mark.asyncio
    async def test_judge_returns_valid_verdict(self) -> None:
        verdicts_payload = json.dumps(
            [
                {
                    "field_path": "base_rent_annual",
                    "winner": "b",
                    "value": 200,
                    "confidence": 0.9,
                    "reason": "B is correct",
                }
            ]
        )
        client = _make_client(verdicts_payload, input_tokens=1234, output_tokens=99)
        result = await judge_extractions(
            {"base_rent_annual": 100},
            {"base_rent_annual": 200},
            model_class=_SampleModel,
            client=client,
            judge_model="z-ai/glm-5.1",
        )
        assert len(result.verdicts) == 1
        assert isinstance(result.verdicts[0], JudgeVerdict)
        assert result.verdicts[0].value == 200
        assert result.total_input_tokens == 1234
        assert result.total_output_tokens == 99

    @pytest.mark.asyncio
    async def test_llm_failure_returns_empty(self) -> None:
        client = MagicMock()
        client.extract = AsyncMock(side_effect=RuntimeError("boom"))
        result = await judge_extractions(
            {"base_rent_annual": 100},
            {"base_rent_annual": 200},
            model_class=_SampleModel,
            client=client,
            judge_model="z-ai/glm-5.1",
        )
        assert result.verdicts == []
        assert result.total_input_tokens == 0
        assert result.total_output_tokens == 0

    @pytest.mark.asyncio
    async def test_invalid_json_returns_empty_with_token_counts(self) -> None:
        client = _make_client("not a json array", input_tokens=10, output_tokens=20)
        result = await judge_extractions(
            {"base_rent_annual": 100},
            {"base_rent_annual": 200},
            model_class=_SampleModel,
            client=client,
            judge_model="z-ai/glm-5.1",
        )
        assert result.verdicts == []
        # Tokens are still attributed even on parse failure.
        assert result.total_input_tokens == 10
        assert result.total_output_tokens == 20


class TestAnnotationAcceptsNone:
    """Direct tests of internal helpers for branch coverage."""

    def test_type_none_is_accepted(self) -> None:
        from extract_sdk.extraction.judge import _annotation_accepts_none

        assert _annotation_accepts_none(type(None)) is True

    def test_plain_int_does_not_accept_none(self) -> None:
        from extract_sdk.extraction.judge import _annotation_accepts_none

        assert _annotation_accepts_none(int) is False


class TestCoerceValueBareAnnotation:
    """A model with a bare (non-Optional) field exercises the elif branch."""

    def test_required_int_field_coerces(self) -> None:
        class _M(BaseModel):
            term: int

        ok, val = _coerce_value("term", 60, _M)
        assert ok is True
        assert val == 60


class TestParseVerdictsPayloadEdges:
    def test_non_string_returns_none(self) -> None:
        # raw is not a str — _parse_verdicts_payload guards with isinstance.
        assert _parse_verdicts_payload(123) is None  # type: ignore[arg-type]

    def test_fenced_without_trailing_fence_still_parses(self) -> None:
        # Leading fence, no trailing fence — code strips the leading line and
        # tries the rest as JSON.
        text = '```json\n[{"a": 1}]'
        out = _parse_verdicts_payload(text)
        assert out == [{"a": 1}]


class TestJudgeResultModel:
    def test_judge_result_serialises(self) -> None:
        result = JudgeResult(
            verdicts=[
                JudgeVerdict(
                    field_path="base_rent_annual",
                    winner="a",
                    value=100,
                    confidence=0.9,
                    reason="ok",
                )
            ],
            total_input_tokens=1,
            total_output_tokens=2,
            model_used="z-ai/glm-5.1",
        )
        dumped = result.model_dump()
        assert dumped["verdicts"][0]["winner"] == "a"
        assert dumped["model_used"] == "z-ai/glm-5.1"
