"""Tests for the CamAudit handoff service and endpoint.

Exercises real encryption/decryption logic; mocks only external
boundaries (Supabase).
"""

import json
import builtins
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

import pytest
from cryptography.fernet import Fernet
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from app.services.camaudit import CAM_FIELDS, CamAuditHandoffService

TEST_FERNET_KEY = Fernet.generate_key().decode()
USER_UUID = "00000000-0000-4000-a000-000000000001"
EXTRACTION_UUID = "00000000-0000-4000-a000-000000000002"
SCHEMA_PATH = (
    Path(__file__).resolve().parents[2] / "docs" / "lextract_field_schema.json"
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def service() -> CamAuditHandoffService:
    """Create a CamAuditHandoffService with a real Fernet key."""
    return CamAuditHandoffService(
        shared_key=TEST_FERNET_KEY,
        base_url="https://www.camaudit.io",
    )


@pytest.fixture
def sample_extracted_data() -> dict:
    """Extraction data containing all canonical CAM fields in nested format."""
    return {
        "rentable_square_footage": {"value": 5000, "confidence": 0.95},
        "building_total_rsf": {"value": 50000, "confidence": 0.9},
        "lease_structure_type": {"value": "NNN", "confidence": 0.85},
        "pro_rata_share": {"value": 10.0, "confidence": 0.92},
        "base_year": {"value": 2024, "confidence": 0.88},
        "cam_cap_percentage": {"value": 5.0, "confidence": 0.87},
        "cam_cap_type": {"value": "cumulative", "confidence": 0.80},
        "gross_up_percentage": {"value": 95.0, "confidence": 0.91},
        "management_fee_cap": {"value": 15.0, "confidence": 0.78},
        "cam_exclusions": {"value": "capital expenditures", "confidence": 0.75},
        "audit_rights": {"value": True, "confidence": 0.93},
        "hvac_responsibility": {"value": "landlord", "confidence": 0.82},
        "reconciliation_frequency": {"value": "annual", "confidence": 0.90},
        "cam_audit_deadline_days": {"value": 180, "confidence": 0.84},
        "cap_cumulative_vs_annual": {"value": "cumulative", "confidence": 0.81},
        "controllable_vs_noncontrollable_expenses": {
            "value": "split",
            "confidence": 0.77,
        },
        "base_year_gross_up": {"value": True, "confidence": 0.86},
        "cam_estimate_method": {"value": "budget", "confidence": 0.79},
        "expense_stop_amount": {"value": 8.5, "confidence": 0.83},
        # non-CAM fields should be ignored
        "landlord_legal_name": {"value": "Acme Properties LLC", "confidence": 0.99},
        "tenant_legal_name": {"value": "Tenant Corp", "confidence": 0.98},
    }


@pytest.fixture
def sample_confidence_scores() -> dict:
    """Confidence scores dict (keyed by field name)."""
    return {
        "rentable_square_footage": 0.95,
        "building_total_rsf": 0.9,
        "lease_structure_type": 0.85,
        "pro_rata_share": 0.92,
        "base_year": 0.88,
        "cam_cap_percentage": 0.87,
        "cam_cap_type": 0.80,
        "gross_up_percentage": 0.91,
        "management_fee_cap": 0.78,
        "cam_exclusions": 0.75,
        "audit_rights": 0.93,
        "hvac_responsibility": 0.82,
        "reconciliation_frequency": 0.90,
        "cam_audit_deadline_days": 0.84,
        "cap_cumulative_vs_annual": 0.81,
        "controllable_vs_noncontrollable_expenses": 0.77,
        "base_year_gross_up": 0.86,
        "cam_estimate_method": 0.79,
        "expense_stop_amount": 0.83,
        "landlord_legal_name": 0.99,
    }


# ---------------------------------------------------------------------------
# Service tests
# ---------------------------------------------------------------------------


class TestCamAuditHandoffService:
    def test_cam_fields_fall_back_to_canonical_schema_when_sdk_unavailable(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """CAM field discovery can use the canonical schema without the SDK."""
        import app.services.camaudit as camaudit

        real_import = builtins.__import__

        def fake_import(name: str, *args: object, **kwargs: object) -> object:
            if name == "extract_sdk.schema.lextract_schema":
                raise ImportError("SDK unavailable")
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", fake_import)
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        expected = [
            field["field_name"] for field in schema if field.get("cam_relevant") is True
        ]

        assert camaudit._load_cam_fields() == expected

    def test_find_field_schema_raises_when_schema_is_unavailable(
        self,
        monkeypatch: pytest.MonkeyPatch,
        tmp_path: Path,
    ) -> None:
        """Schema discovery fails explicitly when no canonical schema exists."""
        import app.services.camaudit as camaudit

        monkeypatch.setattr(camaudit, "__file__", str(tmp_path / "camaudit.py"))

        with pytest.raises(FileNotFoundError):
            camaudit._find_field_schema()

    def test_build_payload_includes_every_canonical_cam_relevant_field_with_metadata(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Every schema CAM field present in extraction is handed off intact."""
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        cam_fields = [
            field["field_name"] for field in schema if field.get("cam_relevant") is True
        ]
        extracted_data = {
            field_name: {
                "value": f"value-for-{field_name}",
                "confidence": 0.91,
                "source": {
                    "page": 3,
                    "text": f"Source text for {field_name}",
                },
            }
            for field_name in cam_fields
        }
        extracted_data["landlord_legal_name"] = {
            "value": "Acme Properties LLC",
            "confidence": 0.99,
            "source": {"page": 1, "text": "Acme Properties LLC"},
        }
        confidence_scores = {
            field_name: {"score": 0.91, "reason": f"Matched {field_name}"}
            for field_name in cam_fields
        }

        payload = service.build_payload(
            "ext-canonical", extracted_data, confidence_scores
        )

        assert "expense_stop_amount" in cam_fields
        assert set(payload["fields"]) == set(cam_fields)
        assert (
            payload["fields"]["expense_stop_amount"]
            == extracted_data["expense_stop_amount"]
        )
        assert (
            payload["fields"]["rentable_square_footage"]
            == extracted_data["rentable_square_footage"]
        )
        assert payload["confidence_scores"] == confidence_scores
        assert "landlord_legal_name" not in payload["fields"]

    def test_build_payload_includes_cam_fields(
        self,
        service: CamAuditHandoffService,
        sample_extracted_data: dict,
        sample_confidence_scores: dict,
    ) -> None:
        """All canonical CAM fields present in extraction should appear in payload."""
        payload = service.build_payload(
            "ext-001", sample_extracted_data, sample_confidence_scores
        )
        for field_name in CAM_FIELDS:
            assert field_name in payload["fields"], f"Missing field: {field_name}"
        assert len(payload["fields"]) == len(CAM_FIELDS)
        # Non-CAM fields must NOT appear
        assert "landlord_legal_name" not in payload["fields"]

    def test_build_payload_omits_missing_fields(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Only fields present in extracted_data are included."""
        partial_data = {
            "rentable_square_footage": {"value": 5000, "confidence": 0.95},
            "audit_rights": {"value": True, "confidence": 0.93},
        }
        partial_scores = {
            "rentable_square_footage": 0.95,
        }
        payload = service.build_payload("ext-002", partial_data, partial_scores)

        assert len(payload["fields"]) == 2
        assert "rentable_square_footage" in payload["fields"]
        assert "audit_rights" in payload["fields"]
        assert "cam_cap_percentage" not in payload["fields"]
        assert len(payload["confidence_scores"]) == 1

    def test_build_payload_preserves_nested_metadata(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Nested field payloads retain value, confidence, and source metadata."""
        data = {
            "rentable_square_footage": {
                "value": 5000,
                "confidence": 0.95,
                "source": {"page": 2, "text": "5,000 rentable square feet"},
            },
            "base_year": 2024,  # plain value (not nested)
        }
        payload = service.build_payload("ext-003", data, {})

        assert (
            payload["fields"]["rentable_square_footage"]
            == data["rentable_square_footage"]
        )
        assert payload["fields"]["base_year"] == 2024

    def test_build_payload_identifies_lextract_handoff_without_discount(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Payload identifies the Lextract handoff without discount positioning."""
        payload = service.build_payload("ext-004", {}, {})
        assert payload["lextract_handoff"] is True
        assert "lextract_referral" not in payload
        assert "discount_percent" not in payload
        assert payload["extraction_id"] == "ext-004"
        assert "timestamp" in payload

    def test_encrypt_decrypt_roundtrip(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Encrypting then decrypting must recover original payload."""
        original = {
            "fields": {"rentable_square_footage": 5000},
            "lextract_handoff": True,
            "extraction_id": "ext-005",
            "timestamp": datetime.now(UTC).isoformat(),
            "confidence_scores": {},
        }
        encrypted = service.encrypt_payload(original)
        fernet = Fernet(TEST_FERNET_KEY.encode())
        decrypted = json.loads(fernet.decrypt(encrypted.encode()))
        assert decrypted == original

    def test_encrypt_produces_string(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Encrypted output must be a string (URL-safe base64)."""
        encrypted = service.encrypt_payload({"test": True})
        assert isinstance(encrypted, str)
        # Fernet tokens are URL-safe base64 — they only contain
        # alphanumeric, -, _, and = characters
        allowed = set(
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_="
        )
        assert all(c in allowed for c in encrypted)

    def test_build_redirect_url_format(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Redirect URL must use the live CamAudit scan entrypoint."""
        url = service.build_redirect_url("encrypted-token", "ext-006")
        parsed = urlparse(url)
        assert parsed.scheme == "https"
        assert parsed.netloc == "www.camaudit.io"
        assert parsed.path == "/scan"
        params = parse_qs(parsed.query)
        assert "payload" in params
        assert params["payload"][0] == "encrypted-token"
        assert params["extraction_id"][0] == "ext-006"

    def test_build_redirect_url_utm_params(
        self,
        service: CamAuditHandoffService,
    ) -> None:
        """Redirect URL must include correct UTM parameters."""
        url = service.build_redirect_url("token", "ext-007")
        params = parse_qs(urlparse(url).query)
        assert params["utm_source"][0] == "lextract"
        assert params["utm_campaign"][0] == "extraction_ext-007"
        assert params["extraction_id"][0] == "ext-007"


# ---------------------------------------------------------------------------
# Endpoint tests
# ---------------------------------------------------------------------------


@pytest.fixture
def test_app() -> FastAPI:
    """Create a FastAPI app with the extractions router."""
    from app.api.v1.extractions import router

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def client(test_app: FastAPI) -> TestClient:
    return TestClient(test_app)


@pytest.fixture
def mock_auth_user():
    """Mock authenticated user."""
    from app.models.user import User

    return User(
        id=USER_UUID,
        email="test@example.com",
        full_name="Test User",
        company=None,
        role="user",
        credits_balance=10,
        stripe_customer_id=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _auth_override(user):
    """Return a dependency override for get_optional_user."""

    async def override():
        return user

    return override


def _build_endpoint_mock_db(record):
    """Build a mock Supabase client for endpoint tests.

    Mocks the chain: table().select().eq().is_().single().execute().data
    """
    mock_db = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = record
    (
        mock_db.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value
    ) = mock_execute
    return mock_db


def _eligible_record() -> dict:
    """A paid extraction with show_camaudit=true and CAM data."""
    return {
        "id": EXTRACTION_UUID,
        "user_id": USER_UUID,
        "anonymous_session_id": None,
        "payment_status": "paid",
        "show_camaudit": True,
        "deleted_at": None,
        "extracted_data": {
            "rentable_square_footage": {"value": 5000, "confidence": 0.95},
            "cam_cap_percentage": {"value": 5.0, "confidence": 0.87},
        },
        "confidence_scores": {
            "rentable_square_footage": 0.95,
            "cam_cap_percentage": 0.87,
        },
        "document_filename": "lease.pdf",
    }


class TestCamAuditEndpoint:
    def test_eligible_extraction_returns_200(
        self, test_app: FastAPI, client: TestClient, mock_auth_user
    ) -> None:
        """Paid extraction with show_camaudit=true returns 200 + redirect_url."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )
        mock_db = _build_endpoint_mock_db(_eligible_record())

        with (
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_db,
            ),
            patch("app.api.v1.extractions.settings") as mock_settings,
        ):
            mock_settings.camaudit_shared_key = TEST_FERNET_KEY
            mock_settings.camaudit_base_url = "https://www.camaudit.io"
            response = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/camaudit-payload"
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "redirect_url" in data
        assert data["extraction_id"] == EXTRACTION_UUID
        assert "www.camaudit.io/scan" in data["redirect_url"]
        assert f"extraction_id={EXTRACTION_UUID}" in data["redirect_url"]
        assert "utm_source=lextract" in data["redirect_url"]
        test_app.dependency_overrides.clear()

    def test_unpaid_returns_403(
        self, test_app: FastAPI, client: TestClient, mock_auth_user
    ) -> None:
        """Unpaid extraction returns 403."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )
        record = _eligible_record()
        record["payment_status"] = "unpaid"
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/camaudit-payload"
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "paid" in response.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_ineligible_returns_403(
        self, test_app: FastAPI, client: TestClient, mock_auth_user
    ) -> None:
        """Extraction with show_camaudit=false returns 403."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )
        record = _eligible_record()
        record["show_camaudit"] = False
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/camaudit-payload"
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "not eligible" in response.json()["detail"]
        test_app.dependency_overrides.clear()

    def test_non_owner_returns_404(
        self, test_app: FastAPI, client: TestClient, mock_auth_user
    ) -> None:
        """Wrong user_id returns 404."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )
        record = _eligible_record()
        record["user_id"] = "other-user-999"
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/camaudit-payload"
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()

    def test_unauthenticated_returns_401(self, client: TestClient) -> None:
        """No auth returns 401."""
        response = client.get(f"/api/v1/extractions/{EXTRACTION_UUID}/camaudit-payload")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_deleted_returns_404(
        self, test_app: FastAPI, client: TestClient, mock_auth_user
    ) -> None:
        """Soft-deleted extraction returns 404."""
        from app.core.dependencies import get_optional_user

        test_app.dependency_overrides[get_optional_user] = _auth_override(
            mock_auth_user
        )
        record = _eligible_record()
        record["deleted_at"] = datetime.now(UTC).isoformat()
        mock_db = _build_endpoint_mock_db(record)

        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            response = client.get(
                f"/api/v1/extractions/{EXTRACTION_UUID}/camaudit-payload"
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        test_app.dependency_overrides.clear()
