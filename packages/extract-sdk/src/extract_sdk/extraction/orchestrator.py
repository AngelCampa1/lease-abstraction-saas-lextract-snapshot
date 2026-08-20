"""Multi-pass extraction orchestrator.

Coordinates the legacy 3-pass adversarial pipeline:
  Pass 1: Full extraction (structured JSON)
  Pass 2: Adversarial validation (sparse corrections)
  Pass 3: Escalation (disputed critical field resolution, conditional)

…and an alternate "dual-extract + judge" path gated by
``MultiPassConfig.dual_enabled``:
  Pass 1 (primary) + Sibling (parallel)
  Judge: text-only LLM arbiter resolves per-field disagreements
  Pass 3 (optional): PDF-grounded escalation on critical-field synthesis
                     verdicts or low-confidence outputs.

All PDF passes operate directly on PDF bytes via ``client.extract_pdf()``.
The judge is text-only (it never sees the raw PDF).

No database, no Celery — pure extraction logic.  The backend Celery task
calls this orchestrator and handles persistence and observer wiring.
"""

from __future__ import annotations

import asyncio
import inspect
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel

from extract_sdk.exceptions import ExtractionError, ExtractionParseError, SchemaError
from extract_sdk.extraction.audit_trail import ExtractionAuditTrail
from extract_sdk.extraction.client import ExtractionClientProtocol
from extract_sdk.extraction.escalation_prompts import build_lease_escalation_prompt
from extract_sdk.extraction.json_utils import extract_json
from extract_sdk.extraction.judge import JudgeResult, judge_extractions
from extract_sdk.extraction.observers import (
    NullObserver,
    PipelineObserver,
    PipelineStage,
    PipelineStatus,
)
from extract_sdk.extraction.pass_merger import (
    judge_result_to_patch,
    merge_dual_extractions,
    merge_extraction,
)
from extract_sdk.extraction.pricing import estimate_cost_cents, has_pricing
from extract_sdk.extraction.response_parser import parse_extraction_response
from extract_sdk.extraction.validation_prompts import build_lease_validation_prompt
from extract_sdk.models import (
    ExtractionPassRecord,
    ExtractionPatch,
    ExtractionResult,
    FieldCorrection,
    MultiPassResult,
    PassKind,
)
from extract_sdk.schema.registry import FieldRegistry

logger = logging.getLogger(__name__)


@dataclass
class MultiPassConfig:
    """Configuration for the multi-pass extraction pipeline."""

    pass1_models: list[str]
    pass2_models: list[str]
    pass3_models: list[str]
    min_confidence: float = 0.70
    escalation_threshold: float = 0.80
    pass2_enabled: bool = True
    pass3_enabled: bool = True
    pass1_max_tokens: int | None = None
    pass2_max_tokens: int | None = None
    pass3_max_tokens: int | None = None
    # Dual-extract + judge configuration (Phase 4 — alternate code path).
    dual_enabled: bool = False
    sibling_models: list[str] = field(default_factory=list)
    judge_models: list[str] = field(default_factory=list)
    # type[BaseModel] | None — Any keeps the dataclass simple (Pydantic
    # gymnastics around dataclass field types don't pull their weight here).
    judge_model_class: Any = None
    cost_ceiling_cents: int | None = None


@dataclass
class _PassOutcome:
    """Internal result of a single pass attempt."""

    text: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    duration_ms: int = 0
    cost_cents: int = 0


class MultiPassOrchestrator:
    """Orchestrates the adversarial extraction pipeline.

    Two code paths exist:

    * **Legacy 3-pass** (default): Pass 1 PDF extraction → Pass 2 adversarial
      validation → Pass 3 PDF-grounded escalation on disputed critical fields.
    * **Dual-extract + judge** (gated on ``config.dual_enabled``): Two parallel
      Pass 1-style extractions (primary + sibling), a text-only judge LLM
      that arbitrates per-field disagreements, then Pass 3 escalation on
      critical-field synthesis verdicts.

    Uses a ``client_factory`` callable to create model-specific clients,
    allowing the caller to control which provider is used per model.

    All PDF passes call ``client.extract_pdf(prompt, pdf_bytes, filename)``
    directly — no OCR pre-processing is needed.

    Args:
        config: Pipeline configuration (model lists, thresholds, toggles).
        client_factory: Callable that takes a model slug string and returns
            an ``ExtractionClientProtocol``-compliant client.
        registry: Field registry for schema-driven extraction.
        observer: Optional observer for stage-level lifecycle events. Defaults
            to a :class:`NullObserver` so SDK consumers can omit one entirely.

    Raises:
        ValueError: If ``config.dual_enabled`` is True but
            ``config.judge_model_class`` is None — the judge cannot coerce
            verdicts without a target Pydantic model.
    """

    def __init__(
        self,
        config: MultiPassConfig,
        client_factory: Callable[[str], ExtractionClientProtocol],
        registry: FieldRegistry,
        observer: PipelineObserver | None = None,
    ) -> None:
        if config.dual_enabled and config.judge_model_class is None:
            raise ValueError(
                "dual_enabled requires judge_model_class — pass a Pydantic "
                "BaseModel class (use schema.registry.build_extraction_model)"
            )
        self.config = config
        self.client_factory = client_factory
        self.registry = registry
        self._observer: PipelineObserver = observer or NullObserver()
        # Cost accounting — reset at the top of every ``run()`` so a single
        # orchestrator instance can be reused across documents.
        self._extraction_cost_cents: int = 0
        self._cost_ceiling_hit: bool = False
        self._unknown_pricing_models: list[str] = []

    # ------------------------------------------------------------------
    # Cost-ceiling helpers
    # ------------------------------------------------------------------
    def _remaining_budget_cents(self) -> int | None:
        """Return remaining cost budget in cents; ``None`` when uncapped."""
        ceiling = self.config.cost_ceiling_cents
        if ceiling is None:
            return None
        return ceiling - self._extraction_cost_cents

    def _cost_ceiling_exhausted(self) -> bool:
        """True when ``cost_ceiling_cents`` is set and the running total is at
        or above the ceiling. Cheap calls (tiny output) still increment the
        meter, so this flips deterministically on overrun."""
        remaining = self._remaining_budget_cents()
        return remaining is not None and remaining <= 0

    def _mark_cost_ceiling_hit(self, stage_label: str) -> None:
        """Record that a stage was skipped due to the cost ceiling.

        ``stage_label`` is purely descriptive (e.g. ``"Pass 2"``) and ends up
        in logs only — the boolean ``cost_ceiling_hit`` on
        :class:`MultiPassResult` is what callers gate on.
        """
        self._cost_ceiling_hit = True
        logger.warning(
            "extraction_cost_ceiling_hit stage=%s spent_cents=%d ceiling_cents=%s",
            stage_label,
            self._extraction_cost_cents,
            self.config.cost_ceiling_cents,
        )

    # ------------------------------------------------------------------
    # Observer helpers (exception-safe wrappers)
    # ------------------------------------------------------------------
    def _safe_start_stage(
        self,
        *,
        stage: PipelineStage,
        attempt_number: int = 1,
        model: str | None = None,
        fallback_models: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Call ``observer.start_stage`` swallowing exceptions.

        Observability is non-essential — extraction must complete even when
        the observer raises (e.g. the DB session expired). Returns ``None``
        on failure; the matching :meth:`_safe_finish_stage` accepts ``None``.
        """
        try:
            return self._observer.start_stage(
                stage=stage,
                attempt_number=attempt_number,
                model=model,
                fallback_models=fallback_models,
                metadata=metadata,
            )
        except Exception:
            logger.warning(
                "observer.start_stage raised — continuing extraction "
                "(stage=%s, model=%s)",
                stage,
                model,
                exc_info=True,
            )
            return None

    def _safe_finish_stage(
        self,
        handle: Any,
        *,
        status: PipelineStatus,
        duration_ms: int,
        retry_count: int = 0,
        error_class: str | None = None,
        model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Call ``observer.finish_stage`` swallowing exceptions."""
        try:
            self._observer.finish_stage(
                handle,
                status=status,
                duration_ms=duration_ms,
                retry_count=retry_count,
                error_class=error_class,
                model=model,
                metadata=metadata,
            )
        except Exception:
            logger.warning(
                "observer.finish_stage raised — continuing extraction "
                "(status=%s, model=%s)",
                status,
                model,
                exc_info=True,
            )

    # ------------------------------------------------------------------
    # Model dispatch
    # ------------------------------------------------------------------
    async def _try_models_pdf(
        self,
        models: list[str],
        prompt: str,
        pdf_bytes: bytes,
        filename: str,
        max_tokens: int | None,
        pass_number: int,
    ) -> _PassOutcome | None:
        """Try each model in a fallback chain until one succeeds.

        All calls use ``extract_pdf`` to read the PDF directly. On success,
        the per-call cost is computed via :func:`estimate_cost_cents` and
        accumulated onto ``self._extraction_cost_cents`` for ceiling
        bookkeeping; the same cost is also stamped on the returned
        :class:`_PassOutcome` so the caller can copy it into the
        :class:`ExtractionPassRecord`.

        Returns the first successful outcome, or None if all models fail.
        """
        for model_name in models:
            client: ExtractionClientProtocol | None = None
            try:
                if (
                    self.config.cost_ceiling_cents is not None
                    and not has_pricing(model_name)
                ):
                    self._unknown_pricing_models.append(model_name)
                    self._mark_cost_ceiling_hit(
                        f"Pass {pass_number} unknown pricing"
                    )
                    logger.warning(
                        "Skipping model %s because cost ceiling is enabled "
                        "but pricing is unknown",
                        model_name,
                    )
                    continue
                client = self.client_factory(model_name)
                start = time.monotonic()
                kwargs: dict[str, Any] = {
                    "prompt": prompt,
                    "pdf_bytes": pdf_bytes,
                    "filename": filename,
                    "temperature": 0.0,
                }
                if max_tokens is not None:
                    kwargs["max_tokens"] = max_tokens
                response = await client.extract_pdf(**kwargs)
                duration_ms = int((time.monotonic() - start) * 1000)
                cost_cents = estimate_cost_cents(
                    model_name, response.input_tokens, response.output_tokens
                )
                self._extraction_cost_cents += cost_cents

                return _PassOutcome(
                    text=response.text,
                    model=model_name,
                    input_tokens=response.input_tokens,
                    output_tokens=response.output_tokens,
                    duration_ms=duration_ms,
                    cost_cents=cost_cents,
                )
            except Exception:
                logger.warning(
                    "Pass %d model %s failed, trying next",
                    pass_number,
                    model_name,
                    exc_info=True,
                )
                continue
            finally:
                if client is not None:
                    await _close_client_if_supported(client)
        return None

    # ------------------------------------------------------------------
    # Parsing helpers
    # ------------------------------------------------------------------
    def _parse_patch(self, text: str) -> ExtractionPatch | None:
        """Parse a Pass 2 response into an ExtractionPatch.

        Returns None if the response is not valid JSON, signaling that
        Pass 2 should be treated as failed (not silently skipped).
        """
        try:
            raw = extract_json(text)
        except ExtractionParseError:
            logger.error(
                "Pass 2 response is not valid JSON — treating as pass failure "
                "(will escalate to Pass 3 if enabled)"
            )
            return None

        corrections_raw = raw.get("field_corrections", {})
        if not isinstance(corrections_raw, dict):
            return ExtractionPatch()

        corrections: dict[str, FieldCorrection] = {}
        for field_name, corr_data in corrections_raw.items():
            if isinstance(corr_data, dict):
                corrections[field_name] = FieldCorrection(
                    original_value=corr_data.get("original_value"),
                    corrected_value=corr_data.get("corrected_value"),
                    reasoning=corr_data.get("reasoning", ""),
                    confidence=float(corr_data.get("confidence", 0.0)),
                    # Models may return section numbers as ints; coerce to str.
                    rule_relevance=[
                        str(r) for r in corr_data.get("rule_relevance", [])
                    ],
                )

        return ExtractionPatch(field_corrections=corrections)

    def _parse_overrides(self, text: str) -> dict[str, Any]:
        """Parse a Pass 3 response into a field overrides dict."""
        try:
            return extract_json(text)
        except ExtractionParseError:
            logger.warning("Pass 3 response is not valid JSON, returning empty")
            return {}

    def _should_escalate(
        self,
        patch: ExtractionPatch,
        pass1_result: ExtractionResult,
    ) -> tuple[bool, list[str]]:
        """Determine if Pass 3 should run and which fields to escalate.

        Returns:
            Tuple of (should_run, disputed_field_names).
        """
        critical_names = self.registry.get_critical_field_names()
        disputed: list[str] = []

        # Check if Pass 2 corrected any critical fields
        critical_corrections = patch.critical_corrections(critical_names)
        disputed.extend(critical_corrections.keys())

        # Check if any critical field has low confidence
        for name in critical_names:
            conf = pass1_result.get_field_confidence(name)
            if conf < self.config.escalation_threshold and name not in disputed:
                disputed.append(name)

        return len(disputed) > 0, disputed

    def _should_escalate_dual(
        self,
        judge_result: JudgeResult,
        pass1_result: ExtractionResult,
        critical_names: list[str],
    ) -> tuple[bool, list[str]]:
        """Decide if Pass 3 should run after a dual-extract + judge round.

        Triggers escalation when:

        * The judge synthesized (``winner == "synthesis"``) a critical field —
          the judge fabricated a value without seeing the PDF, so PDF-grounded
          Pass 3 should sanity-check it.
        * The judge produced a low-confidence verdict
          (``confidence < escalation_threshold``) for a critical field.
        * A critical field has low Pass-1 confidence
          (mirrors :meth:`_should_escalate`).
        """
        critical_set = set(critical_names)
        disputed: list[str] = []

        # Critical synthesis verdicts → always escalate.
        for verdict in judge_result.verdicts:
            head = verdict.field_path.split(".", 1)[0]
            if head not in critical_set:
                continue
            if verdict.winner == "synthesis":
                if head not in disputed:
                    disputed.append(head)
                continue
            if verdict.confidence < self.config.escalation_threshold:
                if head not in disputed:
                    disputed.append(head)

        # Low Pass-1 confidence on critical fields — same as legacy path.
        for name in critical_names:
            conf = pass1_result.get_field_confidence(name)
            if conf < self.config.escalation_threshold and name not in disputed:
                disputed.append(name)

        return len(disputed) > 0, disputed

    def _extraction_to_flat_dict(self, result: ExtractionResult) -> dict[str, Any]:
        """Convert ExtractionResult to a flat {field_name: value} dict."""
        return {name: fv.value for name, fv in result.fields.items()}

    def _flat_dict_to_extraction(
        self,
        flat: dict[str, Any],
        original: ExtractionResult,
        patch: ExtractionPatch,
    ) -> ExtractionResult:
        """Rebuild ExtractionResult from a merged flat dict.

        Preserves confidence and source_text from the original where the
        value hasn't changed.  For changed values, uses the correction's
        confidence from the patch if available.
        """
        from extract_sdk.models import FieldExtractionValue

        fields: dict[str, FieldExtractionValue] = {}
        for name, value in flat.items():
            original_fv = original.fields.get(name)
            if original_fv and original_fv.value == value:
                fields[name] = original_fv
            else:
                # Use the Pass 2 correction confidence if available
                correction = patch.field_corrections.get(name)
                conf = correction.confidence if correction else 0.80
                fields[name] = FieldExtractionValue(
                    value=value,
                    confidence=conf,
                    source_text=original_fv.source_text if original_fv else "",
                )
        return ExtractionResult(fields=fields)

    # ------------------------------------------------------------------
    # Pass dispatch helpers — observer-instrumented
    # ------------------------------------------------------------------
    async def _dispatch_pass(
        self,
        *,
        stage: PipelineStage,
        models: list[str],
        prompt: str,
        pdf_bytes: bytes,
        filename: str,
        max_tokens: int | None,
        pass_number: int,
    ) -> _PassOutcome | None:
        """Execute a PDF pass, emitting observer start/finish events.

        Returns the outcome (or ``None`` on full chain failure) and emits a
        single ``finish_stage`` call. This keeps the observer event count
        deterministic: one ``start``/``finish`` pair per pass attempt. We
        do *not* emit an event per fallback model — fallbacks are an
        implementation detail of :meth:`_try_models_pdf`.
        """
        if not models:
            return None
        primary = models[0]
        fallbacks = list(models[1:])
        handle = self._safe_start_stage(
            stage=stage,
            model=primary,
            fallback_models=fallbacks,
        )
        start = time.monotonic()
        try:
            outcome = await self._try_models_pdf(
                models, prompt, pdf_bytes, filename, max_tokens, pass_number
            )
        except Exception as exc:
            duration_ms = int((time.monotonic() - start) * 1000)
            self._safe_finish_stage(
                handle,
                status="failed",
                duration_ms=duration_ms,
                error_class=type(exc).__name__,
                model=primary,
            )
            raise

        duration_ms = int((time.monotonic() - start) * 1000)
        if outcome is None:
            self._safe_finish_stage(
                handle,
                status="failed",
                duration_ms=duration_ms,
                error_class="all_models_failed",
                model=primary,
            )
            return None
        self._safe_finish_stage(
            handle,
            status="succeeded",
            duration_ms=duration_ms,
            model=outcome.model,
        )
        return outcome

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    async def run(
        self,
        pdf_bytes: bytes,
        filename: str,
        prompt: str,
    ) -> MultiPassResult:
        """Execute the multi-pass extraction pipeline on a PDF document.

        Args:
            pdf_bytes: Raw PDF file bytes to extract from.
            filename: Original filename (used by the AI model for context).
            prompt: Full extraction prompt (including schema and domain knowledge).

        Returns:
            MultiPassResult with merged extraction and audit trail attached
            at ``result.audit_trail``.

        Raises:
            ExtractionError: If all Pass 1 models fail.
        """
        # Reset cost accounting for this run.
        self._extraction_cost_cents = 0
        self._cost_ceiling_hit = False
        self._unknown_pricing_models = []

        if self.config.dual_enabled:
            return await self._run_dual_extract(pdf_bytes, filename, prompt)
        return await self._run_legacy(pdf_bytes, filename, prompt)

    # ------------------------------------------------------------------
    # Legacy 3-pass path
    # ------------------------------------------------------------------
    async def _run_legacy(
        self,
        pdf_bytes: bytes,
        filename: str,
        prompt: str,
    ) -> MultiPassResult:
        pass_records: list[ExtractionPassRecord] = []
        audit = ExtractionAuditTrail()

        # ------------------------------------------------------------------
        # Pass 1: Full extraction
        # ------------------------------------------------------------------
        outcome1 = await self._dispatch_pass(
            stage="pass1_extraction",
            models=self.config.pass1_models,
            prompt=prompt,
            pdf_bytes=pdf_bytes,
            filename=filename,
            max_tokens=self.config.pass1_max_tokens,
            pass_number=1,
        )
        if outcome1 is None:
            raise ExtractionError("All Pass 1 models failed")

        pass_records.append(_record_from_outcome(outcome1, pass_number=1, kind="pass1"))
        audit.raw_responses.append(outcome1.text)
        audit.retry_counts.append(0)

        try:
            pass1_result = parse_extraction_response(
                outcome1.text, registry=self.registry
            )
        except ExtractionParseError:
            # Large documents can produce malformed JSON (truncation or unescaped
            # chars in source text).  Retry once with the full model list — even at
            # temperature=0 the retry frequently produces clean JSON because the
            # model's token-level sampling varies between calls.
            logger.warning("Pass 1 JSON parse failed, retrying model call")
            audit.validation_failures.append("Pass 1 JSON parse failed — retrying")
            audit.needs_review = True
            audit.retry_counts[-1] += 1

            outcome1 = await self._dispatch_pass(
                stage="pass1_extraction",
                models=self.config.pass1_models,
                prompt=prompt,
                pdf_bytes=pdf_bytes,
                filename=filename,
                max_tokens=self.config.pass1_max_tokens,
                pass_number=1,
            )
            if outcome1 is None:
                raise ExtractionError("All Pass 1 models failed on retry")
            pass_records.append(
                _record_from_outcome(outcome1, pass_number=1, kind="pass1")
            )
            # Replace the raw response for Pass 1 with the retry's response so
            # raw_responses and retry_counts remain index-parallel (one slot per pass).
            audit.raw_responses[-1] = outcome1.text
            try:
                pass1_result = parse_extraction_response(
                    outcome1.text, registry=self.registry
                )
            except ExtractionParseError as exc:
                raise ExtractionError("All Pass 1 models failed on retry") from exc
        pass1_flat = self._extraction_to_flat_dict(pass1_result)

        # ------------------------------------------------------------------
        # Pass 2: Adversarial validation
        # ------------------------------------------------------------------
        patch = ExtractionPatch()
        parsed_patch: ExtractionPatch | None = None
        outcome2: _PassOutcome | None = None

        if self.config.pass2_enabled:
            if self._cost_ceiling_exhausted():
                self._mark_cost_ceiling_hit("Pass 2")
            else:
                validation_prompt = build_lease_validation_prompt(pass1_flat)
                outcome2 = await self._dispatch_pass(
                    stage="pass2_validation",
                    models=self.config.pass2_models,
                    prompt=validation_prompt,
                    pdf_bytes=pdf_bytes,
                    filename=filename,
                    max_tokens=self.config.pass2_max_tokens,
                    pass_number=2,
                )

                if outcome2 is not None:
                    pass_records.append(
                        _record_from_outcome(outcome2, pass_number=2, kind="pass2")
                    )
                    audit.raw_responses.append(outcome2.text)
                    audit.retry_counts.append(0)
                    parsed_patch = self._parse_patch(outcome2.text)
                    if parsed_patch is not None:
                        patch = parsed_patch
                        logger.info(
                            "Pass 2 produced %d corrections",
                            len(patch.field_corrections),
                        )
                    else:
                        logger.warning(
                            "Pass 2 JSON parse failed — escalating to Pass 3 "
                            "if critical fields have low confidence"
                        )
                        audit.validation_failures.append(
                            "Pass 2 JSON parse failed — escalating to Pass 3 "
                            "if critical fields have low confidence"
                        )
                        audit.needs_review = True
                else:
                    logger.warning(
                        "All Pass 2 models failed, validation unavailable; "
                        "using Pass 1 as-is"
                    )
                    audit.validation_failures.append(
                        "Pass 2 validation unavailable — all models failed"
                    )
                    if self._unknown_pricing_models:
                        audit.validation_failures.append(
                            "Pass 2 validation unavailable due to unknown pricing "
                            f"for models: {', '.join(self._unknown_pricing_models)}"
                        )
                    audit.needs_review = True

        # ------------------------------------------------------------------
        # Pass 3: Escalation (conditional)
        # ------------------------------------------------------------------
        pass3_overrides: dict[str, Any] | None = None

        # Run Pass 3 if: (a) patch has corrections, OR (b) Pass 2 JSON parse
        # failed (unreadable), OR (c) any critical field has low confidence.
        # _should_escalate() covers cases (a) and (c); pass2_failed handles (b).
        pass2_failed = self.config.pass2_enabled and (
            outcome2 is not None and parsed_patch is None
        )
        if self.config.pass3_enabled:
            should_escalate, disputed_fields = self._should_escalate(
                patch, pass1_result
            )
            should_escalate = should_escalate or pass2_failed

            if should_escalate:
                if not disputed_fields and pass2_failed:
                    disputed_fields = list(self.registry.get_critical_field_names())
                if not disputed_fields:
                    should_escalate = False

            if should_escalate:
                if self._cost_ceiling_exhausted():
                    self._mark_cost_ceiling_hit("Pass 3")
                else:
                    pass3_overrides = await self._run_pass3(
                        pdf_bytes,
                        filename,
                        pass1_flat,
                        patch,
                        disputed_fields,
                        pass_records,
                        audit,
                    )

        # ------------------------------------------------------------------
        # Merge
        # ------------------------------------------------------------------
        merged_flat = merge_extraction(
            pass1_flat, patch, pass3_overrides, self.config.min_confidence
        )
        merged_extraction = self._flat_dict_to_extraction(
            merged_flat, pass1_result, patch
        )

        return self._build_result(
            merged_extraction=merged_extraction,
            pass_records=pass_records,
            patch=patch,
            pass3_overrides=pass3_overrides,
            audit=audit,
        )

    # ------------------------------------------------------------------
    # Dual-extract + judge path
    # ------------------------------------------------------------------
    async def _run_dual_extract(
        self,
        pdf_bytes: bytes,
        filename: str,
        prompt: str,
    ) -> MultiPassResult:
        """Two-extract + judge implementation, called when ``dual_enabled``.

        Sequence:
          1. Run primary (``pass1_models``) and sibling (``sibling_models``)
             extractions in parallel.
          2. If either side fully fails, fall back to the surviving side; no
             judge call is issued.
          3. Otherwise call :func:`judge_extractions`. Judge failures are
             swallowed — the merger then uses A as the canonical answer.
          4. Optionally escalate to Pass 3 on critical-field synthesis or low
             verdict confidence.

        ``ExtractionError`` is raised only when both primary and sibling
        chains exhaust without success.
        """
        pass_records: list[ExtractionPassRecord] = []
        audit = ExtractionAuditTrail()

        # ------------------------------------------------------------------
        # Parallel primary + sibling
        # ------------------------------------------------------------------
        primary_handle = self._safe_start_stage(
            stage="pass1_extraction",
            model=self.config.pass1_models[0] if self.config.pass1_models else None,
            fallback_models=list(self.config.pass1_models[1:]),
        )
        sibling_handle = self._safe_start_stage(
            stage="sibling_extraction",
            model=self.config.sibling_models[0] if self.config.sibling_models else None,
            fallback_models=list(self.config.sibling_models[1:]),
        )

        parallel_start = time.monotonic()
        results = await asyncio.gather(
            self._try_models_pdf(
                self.config.pass1_models,
                prompt,
                pdf_bytes,
                filename,
                self.config.pass1_max_tokens,
                pass_number=1,
            ),
            self._try_models_pdf(
                self.config.sibling_models,
                prompt,
                pdf_bytes,
                filename,
                self.config.pass1_max_tokens,
                pass_number=1,
            ),
        )
        primary_outcome, sibling_outcome = results
        # Use each side's own per-model duration when available so the observer
        # receives accurate timings rather than the shared wall-clock total.
        wall_duration = int((time.monotonic() - parallel_start) * 1000)
        primary_duration_ms = (
            primary_outcome.duration_ms if primary_outcome else wall_duration
        )
        sibling_duration_ms = (
            sibling_outcome.duration_ms if sibling_outcome else wall_duration
        )

        self._safe_finish_stage(
            primary_handle,
            status="succeeded" if primary_outcome else "failed",
            duration_ms=primary_duration_ms,
            error_class=None if primary_outcome else "all_models_failed",
            model=primary_outcome.model if primary_outcome else None,
        )
        self._safe_finish_stage(
            sibling_handle,
            status="succeeded" if sibling_outcome else "failed",
            duration_ms=sibling_duration_ms,
            error_class=None if sibling_outcome else "dual_side_failure",
            model=sibling_outcome.model if sibling_outcome else None,
        )

        if primary_outcome is None and sibling_outcome is None:
            raise ExtractionError(
                "All primary and sibling models failed in dual-extract mode"
            )

        # ------------------------------------------------------------------
        # Fall back to the surviving side if either failed
        # ------------------------------------------------------------------
        if primary_outcome is None or sibling_outcome is None:
            return self._fallback_dual_single_side(
                primary_outcome,
                sibling_outcome,
                pass_records,
                audit,
            )

        pass_records.append(
            _record_from_outcome(primary_outcome, pass_number=1, kind="pass1")
        )
        pass_records.append(
            _record_from_outcome(sibling_outcome, pass_number=1, kind="sibling")
        )
        audit.raw_responses.append(primary_outcome.text)
        audit.retry_counts.append(0)
        audit.raw_responses.append(sibling_outcome.text)
        audit.retry_counts.append(0)

        try:
            pass1_result = parse_extraction_response(
                primary_outcome.text, registry=self.registry
            )
        except ExtractionParseError as exc:
            raise ExtractionError(
                "Dual-extract primary response failed to parse"
            ) from exc
        try:
            sibling_result = parse_extraction_response(
                sibling_outcome.text, registry=self.registry
            )
        except ExtractionParseError:
            # Sibling unparseable — defensively fall back to primary alone.
            logger.warning(
                "Dual-extract sibling response failed to parse — using primary "
                "as canonical"
            )
            audit.validation_failures.append(
                "Dual-extract sibling JSON parse failed — using primary"
            )
            audit.needs_review = True
            return self._build_result(
                merged_extraction=pass1_result,
                pass_records=pass_records,
                patch=ExtractionPatch(),
                pass3_overrides=None,
                audit=audit,
            )

        primary_flat = self._extraction_to_flat_dict(pass1_result)
        sibling_flat = self._extraction_to_flat_dict(sibling_result)

        # ------------------------------------------------------------------
        # Judge arbitration
        # ------------------------------------------------------------------
        judge_start = time.monotonic()
        judge_result = await self._run_judge(primary_flat, sibling_flat, audit)
        judge_duration_ms = int((time.monotonic() - judge_start) * 1000)

        # Convert verdicts to a patch — feeds the existing Pass 3 prompt
        # builder and `_should_escalate_dual` without changing escalation infra.
        synthetic_patch = judge_result_to_patch(judge_result, primary_flat)

        # Append a pass-record for the judge so callers see the full
        # cost / model trail: pass_number=3 + kind=judge mirrors the spec
        # ("judge IS the third stage in dual mode") without violating the
        # ge=1, le=3 constraint on ExtractionPassRecord.pass_number.
        if judge_result.verdicts or judge_result.total_input_tokens > 0:
            judge_cost = estimate_cost_cents(
                judge_result.model_used,
                judge_result.total_input_tokens,
                judge_result.total_output_tokens,
            )
            pass_records.append(
                ExtractionPassRecord(
                    pass_number=3,
                    pass_kind="judge",
                    model=judge_result.model_used,
                    input_tokens=judge_result.total_input_tokens,
                    output_tokens=judge_result.total_output_tokens,
                    duration_ms=judge_duration_ms,
                    cost_cents=judge_cost,
                )
            )

        # Merge dual extractions with the verdicts.
        merged_flat = merge_dual_extractions(primary_flat, sibling_flat, judge_result)

        # ------------------------------------------------------------------
        # Pass 3 (optional) — PDF-grounded review of synthesis verdicts
        # ------------------------------------------------------------------
        pass3_overrides: dict[str, Any] | None = None
        if self.config.pass3_enabled:
            critical_names = list(self.registry.get_critical_field_names())
            should_escalate, disputed_fields = self._should_escalate_dual(
                judge_result, pass1_result, critical_names
            )

            if should_escalate and disputed_fields:
                if self._cost_ceiling_exhausted():
                    self._mark_cost_ceiling_hit("Pass 3 (dual)")
                else:
                    pass3_overrides = await self._run_pass3(
                        pdf_bytes,
                        filename,
                        merged_flat,
                        synthetic_patch,
                        disputed_fields,
                        pass_records,
                        audit,
                    )
                    if pass3_overrides:
                        merged_flat = merge_extraction(
                            merged_flat,
                            ExtractionPatch(),
                            pass3_overrides,
                            self.config.min_confidence,
                        )

        merged_extraction = self._flat_dict_to_extraction(
            merged_flat, pass1_result, synthetic_patch
        )

        return self._build_result(
            merged_extraction=merged_extraction,
            pass_records=pass_records,
            patch=synthetic_patch,
            pass3_overrides=pass3_overrides,
            audit=audit,
        )

    def _fallback_dual_single_side(
        self,
        primary_outcome: _PassOutcome | None,
        sibling_outcome: _PassOutcome | None,
        pass_records: list[ExtractionPassRecord],
        audit: ExtractionAuditTrail,
    ) -> MultiPassResult:
        """Build a result from whichever single side succeeded.

        Used when one of primary/sibling fails completely. No judge call,
        no Pass 3 — the surviving extraction stands alone.
        """
        survivor: _PassOutcome | None
        kind: PassKind
        if primary_outcome is not None:
            survivor = primary_outcome
            kind = "pass1"
            logger.warning("Dual-extract sibling failed — using primary as canonical")
            audit.validation_failures.append(
                "Dual-extract sibling extraction failed — using primary alone"
            )
        else:
            survivor = sibling_outcome
            kind = "sibling"
            logger.warning("Dual-extract primary failed — using sibling as canonical")
            audit.validation_failures.append(
                "Dual-extract primary extraction failed — using sibling alone"
            )
        audit.needs_review = True

        # ``primary_outcome is None and sibling_outcome is None`` is rejected
        # before this method is called.
        assert survivor is not None  # nosec - mypy narrowing
        pass_records.append(_record_from_outcome(survivor, pass_number=1, kind=kind))
        audit.raw_responses.append(survivor.text)
        audit.retry_counts.append(0)

        try:
            extraction = parse_extraction_response(
                survivor.text, registry=self.registry
            )
        except ExtractionParseError as exc:
            raise ExtractionError(
                "Dual-extract survivor response failed to parse"
            ) from exc

        return self._build_result(
            merged_extraction=extraction,
            pass_records=pass_records,
            patch=ExtractionPatch(),
            pass3_overrides=None,
            audit=audit,
        )

    async def _run_judge(
        self,
        primary_flat: dict[str, Any],
        sibling_flat: dict[str, Any],
        audit: ExtractionAuditTrail,
    ) -> JudgeResult:
        """Invoke the judge LLM with observer instrumentation.

        On any failure (no judge models configured, all models throw, or the
        judge itself returns empty) we synthesize an empty :class:`JudgeResult`
        so the merger falls back to A.
        """
        judge_models = self.config.judge_models or []
        empty = JudgeResult(
            verdicts=[],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used=judge_models[0] if judge_models else "",
        )
        if not judge_models:
            logger.warning(
                "Dual-extract: no judge models configured — falling back to A"
            )
            audit.validation_failures.append(
                "Dual-extract: judge_models list empty — using primary"
            )
            return empty
        if self._cost_ceiling_exhausted():
            self._mark_cost_ceiling_hit("Judge")
            return empty

        # judge_model_class is validated non-None in __init__ when dual_enabled.
        judge_model_class = self.config.judge_model_class
        assert isinstance(judge_model_class, type) and issubclass(
            judge_model_class, BaseModel
        )

        for slug in judge_models:
            client: ExtractionClientProtocol | None = None
            if self.config.cost_ceiling_cents is not None and not has_pricing(slug):
                self._unknown_pricing_models.append(slug)
                self._mark_cost_ceiling_hit("Judge unknown pricing")
                audit.validation_failures.append(
                    "Dual-extract judge unavailable due to unknown pricing "
                    f"for model: {slug}"
                )
                audit.needs_review = True
                logger.warning(
                    "Skipping judge model %s because cost ceiling is enabled "
                    "but pricing is unknown",
                    slug,
                )
                continue
            handle = self._safe_start_stage(
                stage="judge_arbitration",
                model=slug,
                fallback_models=(
                    list(judge_models[1:]) if slug == judge_models[0] else None
                ),
            )
            start = time.monotonic()
            try:
                client = self.client_factory(slug)
                judge_result = await judge_extractions(
                    primary_flat,
                    sibling_flat,
                    model_class=judge_model_class,
                    client=client,
                    judge_model=slug,
                )
            except Exception as exc:
                duration_ms = int((time.monotonic() - start) * 1000)
                self._safe_finish_stage(
                    handle,
                    status="failed",
                    duration_ms=duration_ms,
                    error_class=type(exc).__name__,
                    model=slug,
                )
                logger.warning(
                    "Dual-extract: judge call raised on model %s — trying next",
                    slug,
                    exc_info=True,
                )
                continue
            finally:
                if client is not None:
                    await _close_client_if_supported(client)

            duration_ms = int((time.monotonic() - start) * 1000)
            cost_cents = estimate_cost_cents(
                slug,
                judge_result.total_input_tokens,
                judge_result.total_output_tokens,
            )
            self._extraction_cost_cents += cost_cents
            self._safe_finish_stage(
                handle,
                status="succeeded",
                duration_ms=duration_ms,
                model=slug,
            )
            # Append the judge's verdicts to the audit trail. Storing the
            # serialized verdict list (rather than a placeholder) keeps the
            # audit trail useful for debugging arbitration disagreements.
            audit.raw_responses.append(judge_result.model_dump_json())
            audit.retry_counts.append(0)
            return judge_result

        logger.warning("Dual-extract: all judge models failed — falling back to A")
        audit.validation_failures.append(
            "Dual-extract: all judge models failed — using primary"
        )
        return empty

    # ------------------------------------------------------------------
    # Shared Pass 3
    # ------------------------------------------------------------------
    async def _run_pass3(
        self,
        pdf_bytes: bytes,
        filename: str,
        base_flat: dict[str, Any],
        patch: ExtractionPatch,
        disputed_fields: list[str],
        pass_records: list[ExtractionPassRecord],
        audit: ExtractionAuditTrail,
    ) -> dict[str, Any] | None:
        """Run Pass 3 escalation on disputed fields, return its overrides."""
        field_categories: dict[str, str] = {}
        for name in disputed_fields:
            try:
                fd = self.registry.get_field(name)
                field_categories[name] = fd.category
            except SchemaError:
                continue

        escalation_prompt = build_lease_escalation_prompt(
            base_flat, patch, disputed_fields, field_categories
        )

        outcome3 = await self._dispatch_pass(
            stage="pass3_escalation",
            models=self.config.pass3_models,
            prompt=escalation_prompt,
            pdf_bytes=pdf_bytes,
            filename=filename,
            max_tokens=self.config.pass3_max_tokens,
            pass_number=3,
        )

        if outcome3 is None:
            logger.warning("All Pass 3 models failed, using earlier-pass merge")
            return None

        pass_records.append(_record_from_outcome(outcome3, pass_number=3, kind="pass3"))
        audit.raw_responses.append(outcome3.text)
        audit.retry_counts.append(0)
        overrides = self._parse_overrides(outcome3.text)
        logger.info("Pass 3 resolved %d fields", len(overrides))
        return overrides

    # ------------------------------------------------------------------
    # Result assembly
    # ------------------------------------------------------------------
    def _build_result(
        self,
        *,
        merged_extraction: ExtractionResult,
        pass_records: list[ExtractionPassRecord],
        patch: ExtractionPatch,
        pass3_overrides: dict[str, Any] | None,
        audit: ExtractionAuditTrail,
    ) -> MultiPassResult:
        """Compose a :class:`MultiPassResult` from pipeline state.

        Centralises ``needs_review`` propagation, confidence-score serialisation,
        and cost accounting so both the legacy and dual paths build identical
        result objects.
        """
        needs_review = audit.needs_review
        critical_names = self.registry.get_critical_field_names()
        review_threshold = self.config.min_confidence
        for name in critical_names:
            if merged_extraction.get_field_confidence(name) < review_threshold:
                needs_review = True
                break

        if needs_review:
            audit.needs_review = True

        merged_confidence_scores: dict[str, Any] = {
            name: fv.confidence for name, fv in merged_extraction.fields.items()
        }

        return MultiPassResult(
            extraction=merged_extraction,
            pass_records=pass_records,
            patch=patch if not patch.is_empty else None,
            pass3_overrides=pass3_overrides,
            needs_review=needs_review,
            confidence_scores=merged_confidence_scores,
            audit_trail=audit.to_dict(),
            extraction_cost_cents=self._extraction_cost_cents,
            cost_ceiling_hit=self._cost_ceiling_hit,
        )


# ----------------------------------------------------------------------
# Module helpers
# ----------------------------------------------------------------------
def _record_from_outcome(
    outcome: _PassOutcome,
    *,
    pass_number: int,
    kind: PassKind,
) -> ExtractionPassRecord:
    """Build an :class:`ExtractionPassRecord` from a :class:`_PassOutcome`."""
    return ExtractionPassRecord(
        pass_number=pass_number,
        pass_kind=kind,
        model=outcome.model,
        input_tokens=outcome.input_tokens,
        output_tokens=outcome.output_tokens,
        duration_ms=outcome.duration_ms,
        cost_cents=outcome.cost_cents,
    )


async def _close_client_if_supported(client: ExtractionClientProtocol) -> None:
    """Close orchestrator-created clients when they expose close/aclose."""
    close = getattr(client, "close", None)
    if close is None:
        close = getattr(client, "aclose", None)
    if close is None:
        return
    try:
        result = close()
        if inspect.isawaitable(result):
            await result
    except Exception:
        logger.warning("Failed to close extraction client", exc_info=True)
