"""Extraction pipeline — multi-pass (OpenRouter)."""

from extract_sdk.extraction.client import ExtractionClientProtocol
from extract_sdk.extraction.dual_extraction import (
    DualExtractionOutcome,
    DualFieldResult,
    dual_extract_critical_fields,
)
from extract_sdk.extraction.json_utils import extract_json, strip_thinking_tags
from extract_sdk.extraction.openrouter_client import OpenRouterClient
from extract_sdk.extraction.orchestrator import MultiPassConfig, MultiPassOrchestrator
from extract_sdk.extraction.pass_merger import merge_extraction
from extract_sdk.extraction.prompt_builder import ExtractionPromptBuilder
from extract_sdk.extraction.response_parser import parse_extraction_response
from extract_sdk.extraction.validation_loop import (
    ValidationLoopOutcome,
    validate_and_retry,
)

__all__ = [
    "DualExtractionOutcome",
    "DualFieldResult",
    "ExtractionClientProtocol",
    "ExtractionPromptBuilder",
    "MultiPassConfig",
    "MultiPassOrchestrator",
    "OpenRouterClient",
    "ValidationLoopOutcome",
    "dual_extract_critical_fields",
    "extract_json",
    "merge_extraction",
    "parse_extraction_response",
    "strip_thinking_tags",
    "validate_and_retry",
]
