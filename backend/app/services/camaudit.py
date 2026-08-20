"""CamAudit handoff service for encrypted payload generation."""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

from cryptography.fernet import Fernet


def _find_field_schema() -> Path:
    """Locate lextract_field_schema.json by walking upward from this file."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        candidate = current / "docs" / "lextract_field_schema.json"
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent
    raise FileNotFoundError("Cannot locate docs/lextract_field_schema.json")


def _load_cam_fields() -> list[str]:
    """Load CAM-relevant fields from the canonical Lextract schema metadata."""
    try:
        from extract_sdk.schema.lextract_schema import get_lextract_registry

        return [
            field.field_name for field in get_lextract_registry() if field.cam_relevant
        ]
    except (FileNotFoundError, ImportError):
        schema_path = _find_field_schema()
        with open(schema_path, encoding="utf-8") as schema_file:
            schema_fields: list[dict[str, Any]] = json.load(schema_file)
        return [
            str(field["field_name"])
            for field in schema_fields
            if field.get("cam_relevant") is True
        ]


CAM_FIELDS: list[str] = _load_cam_fields()


class CamAuditHandoffService:
    """Generates encrypted CamAudit handoff payloads."""

    def __init__(self, shared_key: str, base_url: str) -> None:
        if not shared_key:
            raise ValueError(
                "CAMAUDIT_SHARED_KEY is required to construct " "CamAuditHandoffService"
            )
        key_bytes = shared_key.encode() if isinstance(shared_key, str) else shared_key
        try:
            self.fernet = Fernet(key_bytes)
        except Exception as exc:
            # Fernet raises ValueError on malformed keys but the underlying
            # cause can be base64.binascii.Error or a raw struct error.
            # Normalize to a single, clear ValueError so misconfiguration
            # surfaces at construction time rather than at first use.
            raise ValueError(
                "CAMAUDIT_SHARED_KEY is not a valid Fernet key. "
                "Expected a 32-byte URL-safe base64-encoded key "
                "(e.g. Fernet.generate_key())."
            ) from exc
        self.base_url = base_url.rstrip("/")

    def build_payload(
        self,
        extraction_id: str,
        extracted_data: dict[str, Any],
        confidence_scores: dict[str, Any],
    ) -> dict[str, Any]:
        """Build the handoff payload with CAM-relevant fields."""
        fields: dict[str, Any] = {}
        scores: dict[str, Any] = {}
        for field_name in CAM_FIELDS:
            field_data = extracted_data.get(field_name)
            if field_data is not None:
                fields[field_name] = field_data
            conf = confidence_scores.get(field_name)
            if conf is not None:
                scores[field_name] = conf
        return {
            "fields": fields,
            "confidence_scores": scores,
            "lextract_handoff": True,
            "extraction_id": extraction_id,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    def encrypt_payload(self, payload: dict[str, Any]) -> str:
        """Encrypt payload to URL-safe string."""
        json_bytes = json.dumps(payload).encode("utf-8")
        encrypted = self.fernet.encrypt(json_bytes)
        return encrypted.decode("ascii")

    def build_redirect_url(self, encrypted_payload: str, extraction_id: str) -> str:
        """Build the CamAudit redirect URL with encrypted payload and UTM params."""
        params = urlencode(
            {
                "payload": encrypted_payload,
                "extraction_id": extraction_id,
                "utm_source": "lextract",
                "utm_campaign": f"extraction_{extraction_id}",
            }
        )
        return f"{self.base_url}/scan?{params}"
