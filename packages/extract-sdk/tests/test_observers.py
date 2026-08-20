"""Tests for the PipelineObserver protocol and NullObserver default."""

from __future__ import annotations

from extract_sdk.extraction.observers import (
    NullObserver,
    PipelineObserver,
    PipelineStage,
    PipelineStatus,
)


class TestNullObserver:
    """The default observer must accept every callback signature unchanged."""

    def test_start_stage_returns_none(self) -> None:
        observer = NullObserver()
        handle = observer.start_stage(stage="pass1_extraction")
        assert handle is None

    def test_start_stage_with_full_kwargs(self) -> None:
        observer = NullObserver()
        handle = observer.start_stage(
            stage="judge_arbitration",
            attempt_number=2,
            model="z-ai/glm-5.1",
            fallback_models=["minimax/minimax-m2.7"],
            metadata={"reason": "primary failed"},
        )
        assert handle is None

    def test_finish_stage_accepts_none_handle(self) -> None:
        observer = NullObserver()
        # NullObserver.start_stage returns None — finish_stage must accept it.
        observer.finish_stage(
            None,
            status="succeeded",
            duration_ms=42,
        )

    def test_finish_stage_with_full_kwargs(self) -> None:
        observer = NullObserver()
        observer.finish_stage(
            None,
            status="failed",
            duration_ms=100,
            retry_count=1,
            error_class="TimeoutError",
            model="google/gemini-3-flash-preview",
            metadata={"input_tokens": 12345},
        )


class TestPipelineObserverProtocol:
    """A custom observer should be able to satisfy the protocol structurally."""

    def test_custom_observer_satisfies_protocol(self) -> None:
        events: list[tuple[str, dict[str, object]]] = []

        class RecordingObserver:
            """Inline observer that records every callback for assertions."""

            def start_stage(
                self,
                *,
                stage: PipelineStage,
                attempt_number: int = 1,
                model: str | None = None,
                fallback_models: list[str] | None = None,
                metadata: dict[str, object] | None = None,
            ) -> int:
                handle = len(events)
                events.append(
                    (
                        "start",
                        {
                            "stage": stage,
                            "attempt_number": attempt_number,
                            "model": model,
                            "fallback_models": fallback_models,
                            "metadata": metadata,
                        },
                    )
                )
                return handle

            def finish_stage(
                self,
                handle: object,
                *,
                status: PipelineStatus,
                duration_ms: int,
                retry_count: int = 0,
                error_class: str | None = None,
                model: str | None = None,
                metadata: dict[str, object] | None = None,
            ) -> None:
                events.append(
                    (
                        "finish",
                        {
                            "handle": handle,
                            "status": status,
                            "duration_ms": duration_ms,
                            "retry_count": retry_count,
                            "error_class": error_class,
                            "model": model,
                            "metadata": metadata,
                        },
                    )
                )

        observer: PipelineObserver = RecordingObserver()
        handle = observer.start_stage(
            stage="pass1_extraction",
            model="google/gemini-3-flash-preview",
        )
        observer.finish_stage(
            handle,
            status="succeeded",
            duration_ms=250,
            model="google/gemini-3-flash-preview",
        )

        assert len(events) == 2
        assert events[0][0] == "start"
        assert events[0][1]["stage"] == "pass1_extraction"
        assert events[1][0] == "finish"
        assert events[1][1]["handle"] == 0
        assert events[1][1]["status"] == "succeeded"
