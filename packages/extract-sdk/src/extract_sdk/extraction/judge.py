"""Per-field judge that arbitrates between two parallel extractions.

Phase 4 (Dual-Extract) of the Lextract pipeline. Two extractions (Pass 1
"primary" and Sibling "B") run in parallel against the same PDF; this module
compares their outputs field-by-field, asks an LLM to pick a winner (or
synthesize a value) for each disagreement, and emits a list of verdicts that
the merger applies to produce a canonical extraction.

Ported from camaudit-v2/backend/app/services/extraction/judge.py.  Lextract
adaptations:

* The CamAudit version imported ``app.config.Settings`` for default model
  resolution. The SDK is config-agnostic — the judge model slug is passed
  in as an argument.
* The CamAudit version called ``client.chat_complete`` /
  ``chat_complete_with_usage``. Lextract's ``OpenRouterClient`` exposes
  ``extract(prompt, document_text)``. We pack the schema, two extractions,
  and the diff payload into ``document_text`` and use the shared system
  prompt as ``prompt``.

Design invariants (unchanged from CamAudit)
===========================================

* **Diff in Python**: the per-field diff is computed locally — the model is
  never asked to find the disagreements, only to resolve them.
* **Schema-typed verdicts**: each verdict's value must coerce cleanly to the
  target schema's type. Verdicts that reference unknown fields, miss a
  ``winner``, or carry a value that cannot be coerced are dropped.
* **Fail-open**: any LLM error, JSON parse failure, or unhandled exception
  yields ``JudgeResult(verdicts=[], …)``. The caller's merger falls back
  to extraction A. The judge never raises.
* **Schema-only context**: the judge sees JSON A, JSON B, the per-field diff,
  and the JSON Schema of the target Pydantic model. It does NOT see the raw
  PDFs — Pass 3 is the PDF-grounded escalation in dual mode.
"""

from __future__ import annotations

import json
import logging
import types
from decimal import Decimal, InvalidOperation
from typing import Any, Literal, Union, get_args, get_origin

from pydantic import BaseModel

from extract_sdk.extraction.client import ExtractionClientProtocol

logger = logging.getLogger(__name__)


_JUDGE_SYSTEM_PROMPT = (
    "You are a precision arbiter for two parallel structured extractions of "
    "the same source document. For every disagreeing field listed in the "
    "diff, choose 'a', 'b', or synthesize a corrected value, with a short "
    "reason and a confidence score in [0.0, 1.0]. Return ONLY a JSON array "
    "matching the user prompt's schema. Do not include markdown fences, "
    "comments, or prose."
)

_JUDGE_USER_PROMPT_TEMPLATE = """\
Two extractions disagree on the fields listed below. Pick the winner per field.

Each verdict object MUST have this shape:
{{
  "field_path": "<dotted path>",
  "winner": "a" | "b" | "synthesis",
  "value": <value coercible to the field's schema type>,
  "confidence": <float in 0.0-1.0>,
  "reason": "<one short sentence>"
}}

Return ONLY a JSON array of verdict objects. One verdict per disagreeing
field. Do not emit verdicts for agreeing fields.

Target schema (JSON Schema):
{schema_json}

Extraction A:
{extraction_a_json}

Extraction B:
{extraction_b_json}

Disagreeing fields ({n_diffs}):
{diffs_json}
"""


class JudgeVerdict(BaseModel):
    """A single per-field arbitration verdict."""

    field_path: str
    winner: Literal["a", "b", "synthesis"]
    value: Any
    confidence: float
    reason: str


class JudgeResult(BaseModel):
    """Aggregate output of one judge call."""

    verdicts: list[JudgeVerdict]
    total_input_tokens: int
    total_output_tokens: int
    model_used: str


def _compute_field_diffs(
    a: dict[str, Any],
    b: dict[str, Any],
    *,
    prefix: str = "",
) -> list[tuple[str, Any, Any]]:
    """Walk both extractions and emit ``(dotted_path, value_a, value_b)`` tuples.

    Disagreement is computed structurally:
    * Both values are dicts → recurse, joining keys with ``.``.
    * Otherwise compare with ``!=`` and emit one tuple at the parent path.

    Lists, ints, strings, ``None``, etc. are compared as atoms (no per-element
    list diffing — list shape changes show up as a single field-level diff).
    """
    diffs: list[tuple[str, Any, Any]] = []
    keys = list(a.keys())
    for key in b:
        if key not in a:
            keys.append(key)

    for key in keys:
        value_a = a.get(key)
        value_b = b.get(key)
        path = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
        if isinstance(value_a, dict) and isinstance(value_b, dict):
            diffs.extend(_compute_field_diffs(value_a, value_b, prefix=path))
            continue
        if value_a != value_b:
            diffs.append((path, value_a, value_b))
    return diffs


def _annotation_accepts_none(annotation: Any) -> bool:
    if annotation is type(None):
        return True
    origin = get_origin(annotation)
    # ``X | Y`` uses ``types.UnionType``; ``Optional[X]`` / ``Union[X, Y]``
    # uses ``typing.Union``. Both must be checked.
    if origin is Union or origin is types.UnionType:
        return type(None) in get_args(annotation)
    return False


def _resolve_field_annotation(
    field_path: str,
    model_class: type[BaseModel],
) -> Any | None:
    """Return the annotation for a top-level field; None for unknown/nested.

    Top-level field arbitration only — nested-path coercion would require
    walking the schema; we defer to Pydantic validation in the merger for
    nested types.
    """
    head = field_path.split(".", 1)[0]
    field = model_class.model_fields.get(head)
    if field is None:
        return None
    return field.annotation


def _coerce_value(
    field_path: str,
    value: Any,
    model_class: type[BaseModel],
) -> tuple[bool, Any]:
    """Coerce ``value`` to be acceptable for ``field_path`` in ``model_class``.

    Returns ``(ok, coerced_value)``. ``ok`` is False when the field is not
    present on the model OR the value cannot be coerced to a compatible type.

    Coercion rules:
    * ``None`` is accepted only when the annotation includes ``None``.
    * ``int`` / ``float`` / ``Decimal`` types accept their own value as-is.
    * Strings are coerced to numeric types via ``Decimal`` / ``int`` parsing.
    * Mismatched types are rejected.
    """
    annotation = _resolve_field_annotation(field_path, model_class)
    if annotation is None:
        return False, None

    args = get_args(annotation)
    type_set: set[type[Any]] = set()
    if args:
        for arg in args:
            if isinstance(arg, type):
                type_set.add(arg)
    elif isinstance(annotation, type):
        type_set.add(annotation)

    if value is None:
        return _annotation_accepts_none(annotation), None

    # Direct type matches.
    for tp in type_set:
        if tp is type(None):
            continue
        if isinstance(value, tp) and not (tp is int and isinstance(value, bool)):
            return True, value

    # String → numeric coercion when the field expects a number.
    if isinstance(value, str):
        if int in type_set:
            try:
                coerced_int = int(Decimal(value))
            except (InvalidOperation, ValueError):
                return False, None
            return True, coerced_int
        if float in type_set:
            try:
                return True, float(value)
            except ValueError:
                return False, None
        if Decimal in type_set:
            try:
                return True, Decimal(value)
            except InvalidOperation:
                return False, None
        # str is already caught by the direct ``isinstance`` match above.

    # int → float promotion (bool is a subclass of int; exclude it explicitly so
    # that LLM responses of `true` are not silently coerced to 1.0 for rent fields).
    if isinstance(value, int) and not isinstance(value, bool) and float in type_set:
        return True, float(value)

    return False, None


def _build_judge_payload(
    extraction_a: dict[str, Any],
    extraction_b: dict[str, Any],
    diffs: list[tuple[str, Any, Any]],
    model_class: type[BaseModel],
) -> str:
    """Build the user-message body containing schema + extractions + diff."""
    schema_json = json.dumps(model_class.model_json_schema(), default=str)
    diffs_payload = [
        {"field_path": path, "value_a": value_a, "value_b": value_b}
        for path, value_a, value_b in diffs
    ]
    return _JUDGE_USER_PROMPT_TEMPLATE.format(
        schema_json=schema_json,
        extraction_a_json=json.dumps(extraction_a, default=str),
        extraction_b_json=json.dumps(extraction_b, default=str),
        diffs_json=json.dumps(diffs_payload, default=str),
        n_diffs=len(diffs),
    )


def _parse_verdicts_payload(raw: str) -> list[dict[str, Any]] | None:
    """Parse the raw judge response into a list-of-dicts, or None on failure."""
    if not isinstance(raw, str):
        return None
    text = raw.strip()
    if text.startswith("```"):
        # Strip a leading fence (with or without a json hint) and trailing fence.
        text = text.split("\n", 1)[-1] if "\n" in text else text
        if text.endswith("```"):
            text = text[: -len("```")]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, list):
        return None
    out: list[dict[str, Any]] = []
    for entry in parsed:
        if isinstance(entry, dict):
            out.append(entry)
    return out


def _build_verdicts(
    raw_verdicts: list[dict[str, Any]],
    diffs: list[tuple[str, Any, Any]],
    model_class: type[BaseModel],
) -> list[JudgeVerdict]:
    """Validate raw verdict dicts and convert to typed ``JudgeVerdict`` objects.

    Drops any verdict that:
    * references a field not present on ``model_class``;
    * references a field that did not actually disagree (defensive);
    * is missing a winner or a value;
    * carries a value that cannot be coerced to the field's annotation.
    """
    diff_paths = {path for path, _, _ in diffs}
    out: list[JudgeVerdict] = []
    for entry in raw_verdicts:
        path_obj = entry.get("field_path")
        winner = entry.get("winner")
        if not isinstance(path_obj, str) or not path_obj:
            continue
        if winner not in ("a", "b", "synthesis"):
            continue
        if path_obj not in diff_paths:
            logger.debug(
                "judge: ignoring verdict for non-disagreeing path %r", path_obj
            )
            continue
        if "value" not in entry:
            continue
        ok, coerced = _coerce_value(path_obj, entry["value"], model_class)
        if not ok:
            logger.warning(
                "judge: dropping verdict for %r — value %r failed coercion",
                path_obj,
                entry["value"],
            )
            continue
        try:
            confidence = float(entry.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        reason = str(entry.get("reason", ""))
        winner_literal: Literal["a", "b", "synthesis"]
        if winner == "a":
            winner_literal = "a"
        elif winner == "b":
            winner_literal = "b"
        else:
            winner_literal = "synthesis"
        out.append(
            JudgeVerdict(
                field_path=path_obj,
                winner=winner_literal,
                value=coerced,
                confidence=confidence,
                reason=reason,
            )
        )
    return out


async def judge_extractions(
    extraction_a: dict[str, Any],
    extraction_b: dict[str, Any],
    *,
    model_class: type[BaseModel],
    client: ExtractionClientProtocol,
    judge_model: str,
) -> JudgeResult:
    """Arbitrate per-field disagreements between two parallel extractions.

    Args:
        extraction_a: Pass 1 (primary) extraction as a plain dict.
        extraction_b: Sibling extraction as a plain dict.
        model_class: Target Pydantic model for verdict coercion + schema.
        client: ExtractionClientProtocol-compliant client (text input).
            ``client.extract(prompt, document_text)`` is invoked.
        judge_model: OpenRouter model slug for the judge call. Passed
            informationally — the actual model used is determined by the
            client's configured slug.

    Returns:
        :class:`JudgeResult` with zero or more validated verdicts plus
        token / model accounting. On any failure the verdict list is empty —
        the caller's merger should fall back to ``extraction_a``.
    """
    diffs = _compute_field_diffs(extraction_a, extraction_b)
    if not diffs:
        return JudgeResult(
            verdicts=[],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used=judge_model,
        )

    payload = _build_judge_payload(extraction_a, extraction_b, diffs, model_class)
    try:
        response = await client.extract(
            prompt=_JUDGE_SYSTEM_PROMPT,
            document_text=payload,
            temperature=0.0,
        )
    except Exception:
        logger.warning(
            "judge: LLM call failed (model=%s, n_diffs=%d) — falling back to A",
            judge_model,
            len(diffs),
        )
        return JudgeResult(
            verdicts=[],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used=judge_model,
        )

    raw_verdicts = _parse_verdicts_payload(response.text)
    if raw_verdicts is None:
        logger.warning(
            "judge: response was not a JSON array (model=%s, n_diffs=%d) — "
            "falling back to A",
            judge_model,
            len(diffs),
        )
        return JudgeResult(
            verdicts=[],
            total_input_tokens=response.input_tokens,
            total_output_tokens=response.output_tokens,
            model_used=judge_model,
        )

    verdicts = _build_verdicts(raw_verdicts, diffs, model_class)

    logger.info(
        "judge: model=%s n_diffs=%d n_verdicts=%d",
        judge_model,
        len(diffs),
        len(verdicts),
    )

    return JudgeResult(
        verdicts=verdicts,
        total_input_tokens=response.input_tokens,
        total_output_tokens=response.output_tokens,
        model_used=judge_model,
    )


__all__ = [
    "JudgeResult",
    "JudgeVerdict",
    "judge_extractions",
]
