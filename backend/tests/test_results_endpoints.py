"""Tests for extraction results endpoints (teaser, full, list, delete)."""

import time
from typing import Any
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.api.v1.extractions import (
    _build_locked_categories,
    _build_teaser_fields,
    _compute_confidence_distribution,
    _compute_overall_confidence,
    _extract_field_value,
    _schema_category_count,
)
from app.core.security import jwks_cache
from app.database.pg_client import PostgrestSingleError
from app.main import create_app
from app.models.results import (
    TEASER_FIELDS,
    ConfidenceDistribution,
    ExtractionListItem,
    ExtractionListResponse,
    FullResultsResponse,
    ExtractionStatusResponse,
    TeaserFieldValue,
    TeaserResponse,
)

# --- Constants ---

USER_ID = "00000000-0000-0000-0000-000000000001"
OTHER_USER_ID = "00000000-0000-0000-0000-000000000099"
SESSION_ID = "00000000-0000-0000-0000-000000000088"
EXTRACTION_ID = "aaaaaaaa-0000-0000-0000-000000000001"

EXTRACTED_DATA: dict[str, Any] = {
    "landlord_legal_name": {
        "value": "Acme Corp",
        "confidence": 0.95,
        "source_text": "Acme Corp LLC",
    },
    "tenant_legal_name": {
        "value": "Tenant Inc",
        "confidence": 0.90,
        "source_text": "Tenant Inc",
    },
    "premises_address": {
        "value": "123 Main St",
        "confidence": 0.88,
        "source_text": "123 Main St, Suite 100",
    },
    "commencement_date": {
        "value": "2026-01-01",
        "confidence": 0.92,
        "source_text": "January 1, 2026",
    },
    "base_rent_annual": {
        "value": "$120,000",
        "confidence": 0.85,
        "source_text": "$120,000 per annum",
    },
    "lease_term_years": {
        "value": "5",
        "confidence": 0.97,
        "source_text": "five (5) years",
    },
    "security_deposit": {
        "value": "$10,000",
        "confidence": 0.60,
        "source_text": "ten thousand dollars",
    },
}

CONFIDENCE_SCORES: dict[str, Any] = {
    "landlord_legal_name": {"score": 0.95, "tier": "high"},
    "tenant_legal_name": {"score": 0.90, "tier": "high"},
    "premises_address": {"score": 0.88, "tier": "high"},
    "commencement_date": {"score": 0.92, "tier": "high"},
    "base_rent_annual": {"score": 0.85, "tier": "medium"},
    "lease_term_years": {"score": 0.97, "tier": "high"},
    "security_deposit": {"score": 0.60, "tier": "low"},
}

RED_FLAGS: list[dict[str, Any]] = [
    {
        "rule_id": "RF-001",
        "name": "Missing insurance clause",
        "severity": "high",
        "description": "No insurance requirements found",
    },
    {
        "rule_id": "RF-005",
        "name": "Unusual termination clause",
        "severity": "medium",
        "description": "Early termination without penalty",
    },
]

FULL_EXTRACTION_ROW: dict[str, Any] = {
    "id": EXTRACTION_ID,
    "user_id": USER_ID,
    "anonymous_session_id": None,
    "status": "complete",
    "payment_status": "paid",
    "document_filename": "lease.pdf",
    "document_object_key": "user/ext/original.pdf",
    "document_page_count": 12,
    "property_type": "office",
    "extracted_data": EXTRACTED_DATA,
    "confidence_scores": CONFIDENCE_SCORES,
    "red_flags": RED_FLAGS,
    "show_camaudit": True,
    "error_message": None,
    "deleted_at": None,
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-15T10:30:00Z",
}

USER_ROW: dict[str, Any] = {
    "id": USER_ID,
    "email": "user@example.com",
    "full_name": "Test User",
    "company": None,
    "role": None,
    "credits_balance": 5,
    "stripe_customer_id": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}


# --- Helpers ---


def _generate_rsa_keypair() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def rsa_keys() -> tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    private = _generate_rsa_keypair()
    return private, private.public_key()


@pytest.fixture
def app_client() -> TestClient:
    app = create_app()
    return TestClient(app)


def _make_token(
    private_key: rsa.RSAPrivateKey,
    sub: str = USER_ID,
) -> str:
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "role": "authenticated",
    }
    return pyjwt.encode(
        payload, private_key, algorithm="RS256", headers={"kid": "test-kid"}
    )


def _setup_auth_mocks(
    rsa_keys: tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey],
    user_id: str = USER_ID,
) -> tuple[dict[str, str], MagicMock, MagicMock]:
    """Set up JWT auth mocks, returning (headers, mock_jwk, mock_rls)."""
    private_key, public_key = rsa_keys
    token = _make_token(private_key, sub=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    mock_jwk = MagicMock()
    mock_jwk.key = public_key

    mock_rls = MagicMock()
    user_row = USER_ROW.copy()
    user_row["id"] = user_id
    user_query = mock_rls.table.return_value.select.return_value.eq.return_value
    user_query.maybe_single.return_value.execute.return_value = MagicMock(data=user_row)
    user_query.single.return_value.execute.return_value = MagicMock(data=user_row)

    return headers, mock_jwk, mock_rls


def _build_service_mock_single(
    row: dict[str, Any] | None = None,
) -> MagicMock:
    """Build a service client mock that returns a single extraction row."""
    mock_admin = MagicMock()
    extraction_table = MagicMock()

    if row is not None:
        extraction_table.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=row
        )
    else:
        extraction_table.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.side_effect = Exception(
            "No rows"
        )

    mock_admin.table.return_value = extraction_table
    return mock_admin


def _build_service_mock_for_list(
    rows: list[dict[str, Any]],
    total: int | None = None,
) -> MagicMock:
    """Build a service client mock for list endpoint with pagination."""
    if total is None:
        total = len(rows)

    mock_admin = MagicMock()
    extraction_table = MagicMock()

    # Chain: select().eq().is_() optionally .eq() then .order().limit().offset().execute()
    select_mock = MagicMock()
    extraction_table.select.return_value = select_mock

    # eq returns self for chaining
    eq_mock = MagicMock()
    select_mock.eq.return_value = eq_mock

    is_mock = MagicMock()
    eq_mock.is_.return_value = is_mock

    # Optional status filter: is_mock.eq() returns another chainable mock
    status_eq_mock = MagicMock()
    is_mock.eq.return_value = status_eq_mock

    order_mock = MagicMock()
    is_mock.order.return_value = order_mock
    status_eq_mock.order.return_value = order_mock

    limit_mock = MagicMock()
    order_mock.limit.return_value = limit_mock

    offset_mock = MagicMock()
    limit_mock.offset.return_value = offset_mock

    result_mock = MagicMock()
    result_mock.data = rows
    result_mock.count = total
    offset_mock.execute.return_value = result_mock

    mock_admin.table.return_value = extraction_table
    return mock_admin


def _build_service_mock_for_delete(
    row: dict[str, Any],
) -> MagicMock:
    """Build a service client mock for delete (fetch + update)."""
    mock_admin = MagicMock()
    extraction_table = MagicMock()

    def table_dispatch(table_name: str) -> MagicMock:
        def select_dispatch(columns: str, **kwargs: Any) -> MagicMock:
            mock_select = MagicMock()
            eq_mock = MagicMock()
            mock_select.eq.return_value = eq_mock
            is_mock = MagicMock()
            eq_mock.is_.return_value = is_mock
            single_mock = MagicMock()
            is_mock.single.return_value = single_mock
            single_mock.execute.return_value = MagicMock(data=row)
            # Some callers (e.g. idempotent DELETE) skip the .is_() filter so
            # they can see soft-deleted rows. Wire .single() directly on
            # eq_mock so both chains resolve to the same row.
            direct_single = MagicMock()
            eq_mock.single.return_value = direct_single
            direct_single.execute.return_value = MagicMock(data=row)
            return mock_select

        extraction_table.select.side_effect = select_dispatch

        # update chain
        update_mock = MagicMock()
        extraction_table.update.return_value = update_mock
        update_mock.update_data = None

        def update_dispatch(data: dict[str, Any]) -> MagicMock:
            update_mock.update_data = data
            return update_mock

        extraction_table.update.side_effect = update_dispatch
        eq_mock2 = MagicMock()
        update_mock.eq.return_value = eq_mock2
        eq_mock2.eq.return_value = eq_mock2
        # Support .is_("deleted_at", "null") chaining in cancel and delete endpoints
        eq_mock2.is_.return_value = eq_mock2

        def execute_update() -> MagicMock:
            override = mock_admin.__dict__.get("update_result_override")
            if override is not None:
                return override
            return MagicMock(data=[{**row, **(update_mock.update_data or {})}])

        eq_mock2.execute.side_effect = execute_update

        return extraction_table

    mock_admin.table.side_effect = table_dispatch
    mock_admin.table.return_value = extraction_table
    return mock_admin


# --- Schema tests ---


class TestResultsModels:
    def test_schema_category_count_matches_canonical_registry(self):
        """Teaser category count should follow the canonical extraction schema."""
        from extract_sdk.schema.lextract_schema import build_lextract_registry

        assert _schema_category_count() == len(build_lextract_registry().categories)
        assert _schema_category_count() == 16

    def test_teaser_field_value_construction(self):
        field = TeaserFieldValue(
            field_name="landlord_legal_name",
            label="Landlord",
            value="Acme Corp",
        )
        assert field.field_name == "landlord_legal_name"
        assert field.label == "Landlord"
        assert field.value == "Acme Corp"

    def test_teaser_field_value_none_value(self):
        field = TeaserFieldValue(
            field_name="landlord_legal_name",
            label="Landlord",
            value=None,
        )
        assert field.value is None

    def test_confidence_distribution_construction(self):
        dist = ConfidenceDistribution(high=5, medium=1, low=1)
        assert dist.high == 5
        assert dist.medium == 1
        assert dist.low == 1

    def test_confidence_distribution_has_not_found_field(self):
        """ConfidenceDistribution must include not_found count."""
        dist = ConfidenceDistribution(high=5, medium=1, low=0, not_found=3)
        assert dist.not_found == 3

    def test_confidence_distribution_not_found_defaults_to_zero(self):
        """Backward compat: existing distributions without not_found default to 0."""
        dist = ConfidenceDistribution(high=5, medium=1, low=1)
        assert dist.not_found == 0

    def test_compute_confidence_distribution_not_found_excluded_from_low(self):
        """not_found fields must not inflate the LOW count in the distribution."""
        scores = {
            "landlord_legal_name": {"score": 0.95, "tier": "high"},
            "base_rent_annual": {"score": 0.0, "tier": "not_found"},
            "cam_cap_percentage": {"score": 0.0, "tier": "not_found"},
            "premises_address": {"score": 0.55, "tier": "low"},
        }
        dist = _compute_confidence_distribution(scores)
        assert dist.high == 1
        assert dist.low == 1
        assert dist.not_found == 2
        assert dist.medium == 0

    def test_compute_confidence_distribution_excludes_overall_meta_key(self):
        """The synthetic ``_overall`` aggregate is not a field and must not be
        counted in the distribution — otherwise the chart total (e.g. 125)
        disagrees with the field count shown elsewhere on the teaser (124)."""
        scores = {
            "landlord_legal_name": {"score": 0.95, "tier": "high"},
            "premises_address": {"score": 0.55, "tier": "low"},
            "_overall": {"tier": "medium", "overall_score": 0.83},
        }
        dist = _compute_confidence_distribution(scores)
        assert dist.high == 1
        assert dist.low == 1
        assert dist.medium == 0
        assert dist.not_found == 0

    def test_compute_confidence_distribution_skips_any_underscore_meta_key(self):
        """Any underscore-prefixed key is meta, not a field, and is skipped."""
        scores = {
            "landlord_legal_name": {"score": 0.95, "tier": "high"},
            "_meta_debug": {"score": 0.1, "tier": "low"},
        }
        dist = _compute_confidence_distribution(scores)
        assert dist.high == 1
        assert dist.low == 0

    def test_distribution_total_matches_extracted_field_count(self):
        """The four tiers must sum to the count of real fields — the invariant
        the teaser relies on so the chart total agrees with the field count."""
        scores = {
            "landlord_legal_name": {"score": 0.95, "tier": "high"},
            "tenant_legal_name": {"score": 0.9, "tier": "high"},
            "premises_address": {"score": 0.55, "tier": "low"},
            "base_rent_annual": {"score": 0.0, "tier": "not_found"},
            "_overall": {"tier": "medium", "overall_score": 0.8},
        }
        real_field_count = sum(1 for k in scores if not k.startswith("_"))
        dist = _compute_confidence_distribution(scores)
        assert dist.high + dist.medium + dist.low + dist.not_found == real_field_count

    def test_compute_confidence_distribution_empty(self):
        dist = _compute_confidence_distribution(None)
        assert dist.high == 0
        assert dist.medium == 0
        assert dist.low == 0
        assert dist.not_found == 0

    def test_distribution_anchors_not_found_to_total_fields(self):
        """When the canonical total is supplied, fields the model never emitted
        must be counted as not_found so the chart always sums to the full
        schema size (126) — not just the keys the LLM returned."""
        scores = {
            "landlord_legal_name": {"score": 0.95, "tier": "high"},
            "tenant_legal_name": {"score": 0.9, "tier": "high"},
            "premises_address": {"score": 0.55, "tier": "low"},
            "base_rent_annual": {"score": 0.0, "tier": "not_found"},
        }
        dist = _compute_confidence_distribution(scores, total_fields=126)
        assert dist.high == 2
        assert dist.low == 1
        assert dist.medium == 0
        # 126 - 2 high - 0 medium - 1 low = 123 not_found (the lone explicit
        # not_found entry plus the 122 fields the model never returned).
        assert dist.not_found == 123
        assert dist.high + dist.medium + dist.low + dist.not_found == 126

    def test_distribution_anchor_never_negative(self):
        """A total smaller than the emitted tier counts must not yield a
        negative not_found — it clamps at zero."""
        scores = {
            "a": {"tier": "high"},
            "b": {"tier": "high"},
            "c": {"tier": "medium"},
        }
        dist = _compute_confidence_distribution(scores, total_fields=2)
        assert dist.not_found == 0

    def test_compute_overall_confidence_excludes_not_found(self):
        """not_found fields must not drag down the overall confidence score."""
        scores = {
            "landlord_legal_name": {"score": 0.9, "tier": "high"},
            "base_rent_annual": {"score": 0.8, "tier": "high"},
            # 85 absent fields — should be excluded from average
            "cam_cap_percentage": {"score": 0.0, "tier": "not_found"},
            "co_tenancy_clause": {"score": 0.0, "tier": "not_found"},
        }
        result = _compute_overall_confidence(scores)
        # Should average only 0.9 and 0.8, not the two 0.0 not_found values
        assert result == round((0.9 + 0.8) / 2, 2)

    def test_compute_overall_confidence_excludes_meta_keys(self):
        """Synthetic meta entries (``_``-prefixed) must not enter the mean."""
        scores = {
            "landlord_legal_name": {"score": 0.9, "tier": "high"},
            "_overall": {"score": 0.5, "tier": "medium"},
        }
        result = _compute_overall_confidence(scores)
        # Only the real field counts; ``_overall`` is skipped.
        assert result == 0.9

    def test_compute_overall_confidence_all_not_found_returns_none(self):
        """If every field is not_found, return None (no extracted fields)."""
        scores = {
            "cam_cap_percentage": {"score": 0.0, "tier": "not_found"},
            "co_tenancy_clause": {"score": 0.0, "tier": "not_found"},
        }
        result = _compute_overall_confidence(scores)
        assert result is None

    def test_teaser_response_construction(self):
        resp = TeaserResponse(
            id="abc",
            status="complete",
            payment_status="unpaid",
            document_filename="lease.pdf",
            visible_fields=[],
            total_field_count=7,
            category_count=2,
            confidence_distribution=ConfidenceDistribution(high=5, medium=1, low=1),
            red_flag_count=2,
        )
        assert resp.id == "abc"
        assert resp.total_field_count == 7

    def test_full_results_response_construction(self):
        resp = FullResultsResponse(
            id="abc",
            status="complete",
            payment_status="paid",
            document_filename="lease.pdf",
            document_page_count=12,
            property_type="office",
            extracted_data=EXTRACTED_DATA,
            confidence_scores=CONFIDENCE_SCORES,
            red_flags=RED_FLAGS,
            show_camaudit=True,
            overall_confidence=0.87,
            created_at="2026-03-15T10:00:00Z",
            updated_at="2026-03-15T10:30:00Z",
        )
        assert resp.extracted_data == EXTRACTED_DATA
        assert resp.show_camaudit is True
        assert resp.overall_confidence == 0.87

    def test_extraction_status_response_construction(self):
        resp = ExtractionStatusResponse(
            id="abc",
            status="failed",
            payment_status="unpaid",
            document_filename="lease.pdf",
            document_page_count=None,
            error_message="Unable to read PDF",
        )
        assert resp.status == "failed"
        assert resp.payment_status == "unpaid"
        assert resp.error_message == "Unable to read PDF"

    def test_extraction_list_item_construction(self):
        item = ExtractionListItem(
            id="abc",
            document_filename="lease.pdf",
            status="complete",
            payment_status="paid",
            property_type="office",
            created_at="2026-03-15T10:00:00Z",
        )
        assert item.status == "complete"

    def test_extraction_list_response_construction(self):
        resp = ExtractionListResponse(
            items=[],
            total=0,
            limit=20,
            offset=0,
        )
        assert resp.total == 0
        assert resp.items == []

    def test_teaser_fields_constant(self):
        assert len(TEASER_FIELDS) == 5
        assert "landlord_legal_name" in TEASER_FIELDS

    def test_teaser_field_labels_in_field_labels(self):
        from app.services.exports.templates import FIELD_LABELS

        for field in TEASER_FIELDS:
            assert field in FIELD_LABELS


# --- Unit tests for _extract_field_value and _build_teaser_fields ---


class TestExtractFieldValue:
    def test_dict_entry_with_value(self):
        assert _extract_field_value({"value": "Acme", "confidence": 0.9}) == "Acme"

    def test_dict_entry_with_none_value(self):
        assert _extract_field_value({"value": None}) is None

    def test_dict_entry_missing_value_key(self):
        assert _extract_field_value({"confidence": 0.9}) is None

    def test_raw_string_entry(self):
        assert _extract_field_value("ABC Corp") == "ABC Corp"

    def test_raw_none_entry(self):
        assert _extract_field_value(None) is None

    def test_raw_numeric_entry(self):
        assert _extract_field_value(42) == "42"

    def test_bool_true_renders_as_yes(self):
        # Booleans must read as human Yes/No, never Python-cased "True"/"False".
        assert _extract_field_value(True) == "Yes"
        assert _extract_field_value({"value": True}) == "Yes"

    def test_bool_false_renders_as_no(self):
        assert _extract_field_value(False) == "No"
        assert _extract_field_value({"value": False}) == "No"

    def test_curly_template_placeholder_treated_as_not_found(self):
        # Blank template leases yield literal fill-in tokens; never show them.
        assert _extract_field_value("{NAME OF TENANT}") is None
        assert _extract_field_value({"value": "{insert address here}"}) is None
        assert _extract_field_value("  {ANY TOKEN}  ") is None

    def test_insert_prefixed_placeholder_treated_as_not_found(self):
        assert _extract_field_value("insert address of property to be leased") is None
        assert _extract_field_value("Insert tenant name") is None

    def test_real_value_with_braces_inside_is_kept(self):
        # Only fully-wrapped tokens are placeholders; braces mid-string are real.
        assert (
            _extract_field_value("Suite {2}, 100 Main St") == "Suite {2}, 100 Main St"
        )

    def test_empty_or_whitespace_value_treated_as_not_found(self):
        assert _extract_field_value("   ") is None
        assert _extract_field_value("") is None

    def test_list_value_joined_for_humans(self):
        # Array fields must read as prose, never raw Python list repr.
        assert (
            _extract_field_value(["Real estate taxes", "Building insurance"])
            == "Real estate taxes, Building insurance"
        )
        assert (
            _extract_field_value({"value": ["Taxes", "Insurance", "CAM"]})
            == "Taxes, Insurance, CAM"
        )

    def test_list_with_blank_and_placeholder_items_filtered(self):
        assert _extract_field_value(["real use", "  ", "{TOKEN}"]) == "real use"

    def test_empty_list_treated_as_not_found(self):
        assert _extract_field_value([]) is None
        assert _extract_field_value(["  ", "{X}"]) is None


class TestBuildTeaserFields:
    def test_none_extracted_data_returns_empty(self):
        assert _build_teaser_fields(None) == []

    def test_all_values_none_returns_empty(self):
        data = {
            "landlord_legal_name": {"value": None},
            "tenant_legal_name": {"value": None},
        }
        assert _build_teaser_fields(data) == []

    def test_only_found_fields_returned(self):
        data = {
            "landlord_legal_name": {"value": "Acme", "confidence": 0.9},
            "tenant_legal_name": {"value": None, "confidence": 0.0},
            "commencement_date": {"value": "2026-01-01", "confidence": 0.9},
        }
        result = _build_teaser_fields(data)
        assert len(result) == 2
        field_names = [f.field_name for f in result]
        assert "landlord_legal_name" in field_names
        assert "commencement_date" in field_names
        assert "tenant_legal_name" not in field_names

    def test_all_values_non_null(self):
        data = {
            "landlord_legal_name": {"value": "Acme"},
            "tenant_legal_name": {"value": "Tenant Inc"},
        }
        for f in _build_teaser_fields(data):
            assert f.value is not None

    def test_capped_at_5_fields(self):
        data = {f"field_{i}": {"value": f"val_{i}"} for i in range(10)}
        result = _build_teaser_fields(data)
        assert len(result) == 5

    def test_priority_fields_appear_first(self):
        # 3 priority fields + 3 non-priority, total 6 -> capped at 5
        # priority fields must occupy the first positions
        data = {
            "extra_field_a": {"value": "X"},
            "extra_field_b": {"value": "Y"},
            "extra_field_c": {"value": "Z"},
            "landlord_legal_name": {"value": "Acme"},
            "tenant_legal_name": {"value": "Tenant"},
            "commencement_date": {"value": "2026-01-01"},
        }
        result = _build_teaser_fields(data)
        assert len(result) == 5
        field_names = [f.field_name for f in result]
        priority_indices = [
            field_names.index(n) for n in TEASER_FIELDS if n in field_names
        ]
        non_priority_indices = [
            i for i, n in enumerate(field_names) if n not in TEASER_FIELDS
        ]
        assert max(priority_indices) < min(non_priority_indices)

    def test_label_from_field_labels(self):
        data = {"landlord_legal_name": {"value": "Acme"}}
        result = _build_teaser_fields(data)
        assert result[0].label == "Landlord Name"

    def test_fallback_label_for_unknown_field(self):
        data = {"some_unknown_field_xyz": {"value": "val"}}
        result = _build_teaser_fields(data)
        assert result[0].label == "Some Unknown Field Xyz"

    def test_raw_non_dict_entry_coerced(self):
        data = {"landlord_legal_name": "raw string value"}
        result = _build_teaser_fields(data)
        assert len(result) == 1
        assert result[0].value == "raw string value"

    def test_all_5_priority_fields_included_when_present(self):
        data = {
            "landlord_legal_name": {"value": "Landlord"},
            "tenant_legal_name": {"value": "Tenant"},
            "premises_address": {"value": "123 Main"},
            "commencement_date": {"value": "2026-01-01"},
            "base_rent_annual": {"value": "$120,000"},
        }
        result = _build_teaser_fields(data)
        assert len(result) == 5
        field_names = [f.field_name for f in result]
        for name in TEASER_FIELDS:
            assert name in field_names

    def test_content_fields_preferred_over_booleans_in_backfill(self):
        """A yes/no flag is a weak preview card; surface content first.

        Only landlord is a priority field; a boolean and a plain text field
        compete for backfill. The content-bearing text field must rank ahead
        of the boolean so the preview never degrades into 'No, No, No'.
        """
        data = {
            "audit_rights": {"value": False},
            "hvac_responsibility": {"value": "Landlord maintains and repairs"},
            "landlord_legal_name": {"value": "Acme"},
        }
        names = [f.field_name for f in _build_teaser_fields(data)]
        assert names.index("hvac_responsibility") < names.index("audit_rights")

    def test_secondary_priority_fields_rank_before_other_text(self):
        """Curated high-value lease terms outrank arbitrary document-order text."""
        data = {
            "aaa_other_text": {"value": "incidental"},
            "lease_structure_type": {"value": "gross"},
            "landlord_legal_name": {"value": "Acme"},
        }
        names = [f.field_name for f in _build_teaser_fields(data)]
        assert names.index("lease_structure_type") < names.index("aaa_other_text")

    def test_booleans_still_surface_when_no_content_fields_remain(self):
        """If a boolean is all that's left, it should still fill an open slot."""
        data = {
            "landlord_legal_name": {"value": "Acme"},
            "audit_rights": {"value": True},
        }
        names = [f.field_name for f in _build_teaser_fields(data)]
        assert "audit_rights" in names


class TestBuildLockedCategories:
    def test_no_visible_fields_locks_every_category(self):
        """With nothing visible, every schema category is locked in full."""
        locked = _build_locked_categories([])
        assert len(locked) == _schema_category_count()
        for cat in locked:
            assert cat.name
            assert cat.field_count > 0

    def test_visible_fields_reduce_locked_counts(self):
        """Showing a field decreases its category's locked count by one."""
        all_locked = {c.name: c.field_count for c in _build_locked_categories([])}

        # Pick one real field from the schema and mark it visible.
        from app.api.v1.extractions import build_lextract_registry

        registry = build_lextract_registry()
        sample_category = registry.categories[0]
        sample_field = registry.get_fields_by_category(sample_category)[0]
        visible = [
            TeaserFieldValue(
                field_name=sample_field.field_name,
                label="Sample",
                value="seen",
            )
        ]

        after = {c.name: c.field_count for c in _build_locked_categories(visible)}
        assert after[sample_category] == all_locked[sample_category] - 1

    def test_category_fully_visible_is_omitted(self):
        """A category with every field visible is not returned as locked."""
        from app.api.v1.extractions import build_lextract_registry

        registry = build_lextract_registry()
        target = registry.categories[0]
        visible = [
            TeaserFieldValue(
                field_name=f.field_name,
                label=f.field_name,
                value="seen",
            )
            for f in registry.get_fields_by_category(target)
        ]
        locked_names = {c.name for c in _build_locked_categories(visible)}
        assert target not in locked_names


# --- Teaser endpoint tests ---


class TestGetTeaser:
    def test_get_teaser_returns_only_found_fields(self, app_client, rsa_keys):
        """Teaser returns only fields with values, up to 5, priority fields first."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["payment_status"] = "unpaid"
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        # All visible_fields must have a non-null value
        for f in data["visible_fields"]:
            assert f["value"] is not None
        # No more than 5 fields shown
        assert len(data["visible_fields"]) <= 5

    def test_get_teaser_total_field_count_is_canonical(self, app_client, rsa_keys):
        """The teaser must advertise the canonical schema field count (126) —
        the same number used in all marketing copy — regardless of how many
        keys the model happened to emit. The confidence chart must also sum to
        that canonical total so 'Unlock all N fields' never drifts below 126."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["payment_status"] = "unpaid"
        # Simulate the real-world case: the model returned far fewer keys than
        # the full schema (here just 2 scored fields), so naive len()-based
        # counting would under-report the total.
        row["confidence_scores"] = {
            "landlord_legal_name": {"score": 0.95, "tier": "high"},
            "premises_address": {"score": 0.55, "tier": "low"},
            "_overall": {"tier": "high", "overall_score": 0.9},
        }
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        from app.api.v1.extractions import build_lextract_registry

        canonical = build_lextract_registry().field_count
        assert data["total_field_count"] == canonical
        dist = data["confidence_distribution"]
        chart_total = dist["high"] + dist["medium"] + dist["low"] + dist["not_found"]
        assert chart_total == canonical

    def test_get_teaser_includes_locked_categories(self, app_client, rsa_keys):
        """Teaser exposes real schema category names + locked field counts."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["payment_status"] = "unpaid"
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 200
        locked = resp.json()["locked_categories"]
        # The schema has many fields; only 5 are shown, so locked categories
        # must be present with positive locked counts and real names.
        assert isinstance(locked, list)
        assert len(locked) > 0
        for cat in locked:
            assert isinstance(cat["name"], str) and cat["name"]
            assert isinstance(cat["field_count"], int) and cat["field_count"] > 0

    def test_get_teaser_priority_fields_appear_first(self, app_client, rsa_keys):
        """Priority fields should appear before other found fields."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        # extracted_data has all 5 priority fields + extras — EXTRACTED_DATA qualifies
        row = FULL_EXTRACTION_ROW.copy()
        row["payment_status"] = "unpaid"
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        field_names = [f["field_name"] for f in resp.json()["visible_fields"]]
        priority_positions = [
            field_names.index(n) for n in TEASER_FIELDS if n in field_names
        ]
        non_priority_positions = [
            i for i, n in enumerate(field_names) if n not in TEASER_FIELDS
        ]
        if priority_positions and non_priority_positions:
            assert max(priority_positions) < min(non_priority_positions)

    def test_get_teaser_fewer_than_5_found_fields(self, app_client, rsa_keys):
        """When fewer than 5 fields have values, return only found fields."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["payment_status"] = "unpaid"
        row["extracted_data"] = {
            "landlord_legal_name": {"value": "Acme Corp", "confidence": 0.95},
            "tenant_legal_name": {"value": None, "confidence": 0.0},
            "commencement_date": {"value": "2026-01-01", "confidence": 0.90},
        }
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        data = resp.json()
        assert resp.status_code == 200
        assert len(data["visible_fields"]) == 2
        field_names = [f["field_name"] for f in data["visible_fields"]]
        assert "landlord_legal_name" in field_names
        assert "commencement_date" in field_names
        assert "tenant_legal_name" not in field_names

    def test_get_teaser_unauthenticated_returns_401(self, app_client):
        """Request without auth should return 401."""
        resp = app_client.get(f"/api/v1/extractions/{EXTRACTION_ID}/teaser")
        assert resp.status_code == 401

    def test_get_teaser_wrong_owner_returns_404(self, app_client, rsa_keys):
        """Access by a different user should return 404."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys, user_id=USER_ID)
        row = FULL_EXTRACTION_ROW.copy()
        row["user_id"] = OTHER_USER_ID
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 404

    def test_get_teaser_deleted_returns_404(self, app_client, rsa_keys):
        """Soft-deleted extraction should return 404."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["deleted_at"] = "2026-03-15T12:00:00Z"
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 404

    def test_get_teaser_filtered_deleted_row_returns_404_with_pg_client(
        self, app_client, rsa_keys
    ):
        """Direct Postgres .single() no-row errors should map to 404."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = MagicMock()
        extraction_query = (
            mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value
        )
        extraction_query.execute.side_effect = PostgrestSingleError("Row not found")

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 404

    def test_get_teaser_computes_confidence_distribution(self, app_client, rsa_keys):
        """Confidence distribution should count high/medium/low tiers."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_single(FULL_EXTRACTION_ROW)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 200
        dist = resp.json()["confidence_distribution"]
        # 5 high, 1 medium, 1 low from CONFIDENCE_SCORES. The remaining schema
        # fields the fixture never scored are anchored into not_found so the
        # chart sums to the canonical 126.
        assert dist["high"] == 5
        assert dist["medium"] == 1
        assert dist["low"] == 1
        assert dist["not_found"] == 126 - 5 - 1 - 1
        assert dist["high"] + dist["medium"] + dist["low"] + dist["not_found"] == 126

    def test_get_teaser_red_flag_count(self, app_client, rsa_keys):
        """Teaser should report correct red flag count."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_single(FULL_EXTRACTION_ROW)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.json()["red_flag_count"] == 2

    def test_get_teaser_total_field_count(self, app_client, rsa_keys):
        """total_field_count is always the canonical schema size (126), not the
        number of keys the model happened to return."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_single(FULL_EXTRACTION_ROW)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.json()["total_field_count"] == 126

    def test_get_teaser_with_session_token(self, app_client):
        """Anonymous session should be able to access their own teaser."""
        row = FULL_EXTRACTION_ROW.copy()
        row["user_id"] = None
        row["anonymous_session_id"] = SESSION_ID

        mock_admin = MagicMock()

        session_table = MagicMock()
        session_table.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": SESSION_ID,
                    "session_token": "test-session-token",
                    "linked_user_id": None,
                    "expires_at": "2099-01-01T00:00:00+00:00",
                    "created_at": "2026-01-01T00:00:00Z",
                }
            ]
        )

        extraction_table = MagicMock()
        extraction_table.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=row
        )

        def table_router(table_name: str) -> MagicMock:
            if table_name == "anonymous_sessions":
                return session_table
            if table_name == "extractions":
                return extraction_table
            return MagicMock()

        mock_admin.table.side_effect = table_router

        with patch(
            "app.database.client.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 200

    def test_get_teaser_null_extracted_data(self, app_client, rsa_keys):
        """Teaser with null extracted_data should return empty fields."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["extracted_data"] = None
        row["confidence_scores"] = None
        row["red_flags"] = None
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        # The advertised total is canonical (126) even when no data was
        # extracted; the chart stays empty because there are no scores.
        assert data["total_field_count"] == 126
        assert data["red_flag_count"] == 0
        assert data["visible_fields"] == []


# --- Full results endpoint tests ---


class TestGetExtractionStatus:
    def test_get_status_unpaid_returns_processing_metadata(self, app_client, rsa_keys):
        """Processing status is available to the owner before payment."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["payment_status"] = "unpaid"
        row["status"] = "failed"
        row["error_message"] = "Unable to read PDF"
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/status",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json() == {
            "id": EXTRACTION_ID,
            "status": "failed",
            "payment_status": "unpaid",
            "document_filename": "lease.pdf",
            "document_page_count": 12,
            "error_message": "Unable to read PDF",
        }

    def test_get_status_wrong_owner_returns_404(self, app_client, rsa_keys):
        """Different users should not be able to inspect processing status."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["user_id"] = OTHER_USER_ID
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/status",
                headers=headers,
            )

        assert resp.status_code == 404


class TestGetFullResults:
    def test_get_full_results_paid(self, app_client, rsa_keys):
        """Paid extraction should return full data."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_single(FULL_EXTRACTION_ROW)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == EXTRACTION_ID
        assert data["extracted_data"] == EXTRACTED_DATA
        assert data["confidence_scores"] == CONFIDENCE_SCORES
        assert data["red_flags"] == RED_FLAGS
        assert data["document_page_count"] == 12
        assert data["property_type"] == "office"
        assert data["show_camaudit"] is True

    def test_get_full_results_unpaid_returns_403(self, app_client, rsa_keys):
        """Unpaid extraction should return 403."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["payment_status"] = "unpaid"
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 403

    def test_get_full_results_unauthenticated_returns_401(self, app_client):
        """Request without auth should return 401."""
        resp = app_client.get(f"/api/v1/extractions/{EXTRACTION_ID}")
        assert resp.status_code == 401

    def test_get_full_results_wrong_owner_returns_404(self, app_client, rsa_keys):
        """Different user should get 404."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["user_id"] = OTHER_USER_ID
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 404

    def test_get_full_results_deleted_returns_404(self, app_client, rsa_keys):
        """Soft-deleted extraction should return 404."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["deleted_at"] = "2026-03-15T12:00:00Z"
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 404

    def test_get_full_results_overall_confidence(self, app_client, rsa_keys):
        """Overall confidence should be the average of all scores."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_single(FULL_EXTRACTION_ROW)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        data = resp.json()
        # Average of: 0.95, 0.90, 0.88, 0.92, 0.85, 0.97, 0.60
        expected = round((0.95 + 0.90 + 0.88 + 0.92 + 0.85 + 0.97 + 0.60) / 7, 2)
        assert data["overall_confidence"] == expected


class TestCancelExtraction:
    def test_cancel_processing_extraction_marks_failed(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["status"] = "extracting"
        mock_admin = _build_service_mock_for_delete(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                f"/api/v1/extractions/{EXTRACTION_ID}/cancel",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "failed"
        assert data["error_message"] == "Processing cancelled by user"

        table = mock_admin.table.return_value
        update_data = table.update.call_args.args[0]
        assert update_data["status"] == "failed"
        assert update_data["error_message"] == "Processing cancelled by user"
        assert "processing_completed_at" in update_data

    def test_cancel_terminal_extraction_returns_409(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["status"] = "complete"
        mock_admin = _build_service_mock_for_delete(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                f"/api/v1/extractions/{EXTRACTION_ID}/cancel",
                headers=headers,
            )

        assert resp.status_code == 409

    def test_cancel_concurrent_terminal_update_returns_409(self, app_client, rsa_keys):
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["status"] = "extracting"
        mock_admin = _build_service_mock_for_delete(row)
        mock_admin.update_result_override = MagicMock(data=[])

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.post(
                f"/api/v1/extractions/{EXTRACTION_ID}/cancel",
                headers=headers,
            )

        assert resp.status_code == 409


# --- List extractions endpoint tests ---


class TestListExtractions:
    def _make_list_rows(self, count: int = 3) -> list[dict[str, Any]]:
        rows = []
        for i in range(count):
            rows.append(
                {
                    "id": f"aaaaaaaa-0000-0000-0000-00000000000{i + 1}",
                    "document_filename": f"lease{i + 1}.pdf",
                    "status": "complete",
                    "payment_status": "paid",
                    "property_type": "office",
                    "created_at": f"2026-03-{15 - i:02d}T10:00:00Z",
                }
            )
        return rows

    def test_list_extractions_returns_paginated(self, app_client, rsa_keys):
        """List should return paginated results."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        rows = self._make_list_rows(3)
        mock_admin = _build_service_mock_for_list(rows, total=3)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers=headers,
                params={"limit": 20, "offset": 0},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        assert data["limit"] == 20
        assert data["offset"] == 0

    def test_list_extractions_filters_by_status(self, app_client, rsa_keys):
        """List with status filter should pass filter to query."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        rows = self._make_list_rows(1)
        mock_admin = _build_service_mock_for_list(rows, total=1)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers=headers,
                params={"status": "complete"},
            )

        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_list_extractions_excludes_deleted(self, app_client, rsa_keys):
        """List should filter out soft-deleted items via is_(deleted_at, null)."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        rows = self._make_list_rows(2)
        mock_admin = _build_service_mock_for_list(rows, total=2)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers=headers,
            )

        assert resp.status_code == 200
        # Verify is_ was called (deleted_at filter)
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.assert_called()

    def test_list_extractions_invalid_status_filter_returns_400(
        self, app_client, rsa_keys
    ):
        """Bug #41: Invalid status_filter should return 400, not silently pass through."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_for_list([], total=0)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers=headers,
                params={"status": "invalid_status_value"},
            )

        assert resp.status_code == 400
        assert "Invalid status filter" in resp.json()["detail"]

    def test_list_extractions_unauthenticated_returns_401(self, app_client):
        """Request without auth should return 401."""
        resp = app_client.get("/api/v1/extractions")
        assert resp.status_code == 401

    def test_list_extractions_empty(self, app_client, rsa_keys):
        """Empty list should return zero items."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_for_list([], total=0)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_extractions_with_session_token(self, app_client):
        """Anonymous session should be able to list their extractions."""
        rows = [
            {
                "id": EXTRACTION_ID,
                "document_filename": "lease.pdf",
                "status": "complete",
                "payment_status": "unpaid",
                "property_type": None,
                "created_at": "2026-03-15T10:00:00Z",
            }
        ]

        mock_admin = MagicMock()

        session_table = MagicMock()
        session_table.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": SESSION_ID,
                    "session_token": "test-session-token",
                    "linked_user_id": None,
                    "expires_at": "2099-01-01T00:00:00+00:00",
                    "created_at": "2026-01-01T00:00:00Z",
                }
            ]
        )

        extraction_table = MagicMock()
        select_mock = MagicMock()
        extraction_table.select.return_value = select_mock
        eq_mock = MagicMock()
        select_mock.eq.return_value = eq_mock
        is_mock = MagicMock()
        eq_mock.is_.return_value = is_mock
        order_mock = MagicMock()
        is_mock.order.return_value = order_mock
        limit_mock = MagicMock()
        order_mock.limit.return_value = limit_mock
        offset_mock = MagicMock()
        limit_mock.offset.return_value = offset_mock
        result_mock = MagicMock()
        result_mock.data = rows
        result_mock.count = 1
        offset_mock.execute.return_value = result_mock

        def table_router(table_name: str) -> MagicMock:
            if table_name == "anonymous_sessions":
                return session_table
            if table_name == "extractions":
                return extraction_table
            return MagicMock()

        mock_admin.table.side_effect = table_router

        with patch(
            "app.database.client.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 1


# --- Delete endpoint tests ---


class TestDeleteExtraction:
    def test_delete_extraction_removes_storage_objects_before_soft_delete(
        self, app_client, rsa_keys
    ):
        """DELETE should remove document, raw artifacts, and cached exports."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["raw_extraction_object_keys"] = [
            "extractions/ext-123/raw/pass1.json",
            "extractions/ext-123/raw/pass2.json",
        ]
        mock_admin = _build_service_mock_for_delete(row)
        mock_object_storage = MagicMock()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            resp = app_client.delete(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 204
        deleted_keys = [
            call.args[0] for call in mock_object_storage.delete_file.call_args_list
        ]
        assert row["document_object_key"] in deleted_keys
        assert "extractions/ext-123/raw/pass1.json" in deleted_keys
        assert "extractions/ext-123/raw/pass2.json" in deleted_keys
        # Exports are purged by prefix (covers every cache-busting version),
        # not enumerated per template/format.
        deleted_prefixes = [
            call.args[0] for call in mock_object_storage.delete_prefix.call_args_list
        ]
        assert f"{USER_ID}/{EXTRACTION_ID}/exports/" in deleted_prefixes

    def test_delete_extraction_storage_failure_returns_503_without_soft_delete(
        self, app_client, rsa_keys
    ):
        """DELETE should not mark deleted when object removal fails."""
        from app.core.exceptions import ObjectStorageError

        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_for_delete(FULL_EXTRACTION_ROW)
        mock_object_storage = MagicMock()
        mock_object_storage.delete_file.side_effect = ObjectStorageError(
            "delete failed"
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            resp = app_client.delete(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 503
        assert mock_admin.table.call_count == 1

    def test_delete_extraction_soft_deletes(self, app_client, rsa_keys):
        """DELETE should soft-delete (set deleted_at) and return 204."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_for_delete(FULL_EXTRACTION_ROW)
        mock_object_storage = MagicMock()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            resp = app_client.delete(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 204
        mock_object_storage.delete_file.assert_called()

    def test_delete_extraction_wrong_owner_returns_404(self, app_client, rsa_keys):
        """Delete by a different user should return 404."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["user_id"] = OTHER_USER_ID
        mock_admin = _build_service_mock_for_delete(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.delete(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 404

    def test_delete_already_deleted_is_idempotent(self, app_client, rsa_keys):
        """Deleting an already-soft-deleted extraction should return 204 without
        re-running the storage cleanup. The DELETE endpoint is idempotent so
        retried client calls do not surface a misleading 404 or repeatedly
        try to remove R2 objects that have already been purged.
        """
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["deleted_at"] = "2026-03-15T12:00:00Z"
        mock_admin = _build_service_mock_for_delete(row)
        mock_object_storage = MagicMock()

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
            patch(
                "app.api.v1.extractions.get_object_storage_service",
                return_value=mock_object_storage,
            ),
        ):
            resp = app_client.delete(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 204
        mock_object_storage.delete_file.assert_not_called()

    def test_delete_extraction_unauthenticated_returns_401(self, app_client):
        """Delete without auth should return 401."""
        resp = app_client.delete(f"/api/v1/extractions/{EXTRACTION_ID}")
        assert resp.status_code == 401


# --- Edge case tests for coverage ---


class TestEdgeCases:
    def test_fetch_extraction_non_uuid_short_circuits_to_404(self):
        """Non-UUID extraction_id must raise 404 without hitting the DB."""
        from fastapi import HTTPException

        from app.api.v1.extractions import _fetch_extraction

        mock_admin = MagicMock()
        with patch(
            "app.api.v1.extractions.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            with pytest.raises(HTTPException) as exc_info:
                _fetch_extraction("demo")

        assert exc_info.value.status_code == 404
        mock_admin.table.assert_not_called()

    def test_fetch_extraction_db_error_returns_503(self, app_client, rsa_keys):
        """Database error during fetch should return 503."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.side_effect = Exception(
            "DB connection lost"
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 503

    def test_fetch_extraction_returns_none_data(self, app_client, rsa_keys):
        """Null result.data should return 404."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)

        mock_admin = MagicMock()
        mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 404

    def test_anon_session_wrong_owner_returns_404(self, app_client):
        """Anonymous session accessing another session's extraction should return 404."""
        row = FULL_EXTRACTION_ROW.copy()
        row["user_id"] = None
        row["anonymous_session_id"] = OTHER_USER_ID  # Different session

        mock_admin = MagicMock()

        session_table = MagicMock()
        session_table.select.return_value.eq.return_value.is_.return_value.gt.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "id": SESSION_ID,
                    "session_token": "test-session-token",
                    "linked_user_id": None,
                    "expires_at": "2099-01-01T00:00:00+00:00",
                    "created_at": "2026-01-01T00:00:00Z",
                }
            ]
        )

        extraction_table = MagicMock()
        extraction_table.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = MagicMock(
            data=row
        )

        def table_router(table_name: str) -> MagicMock:
            if table_name == "anonymous_sessions":
                return session_table
            if table_name == "extractions":
                return extraction_table
            return MagicMock()

        mock_admin.table.side_effect = table_router

        with patch(
            "app.database.client.NeonClientManager.get_service_client",
            return_value=mock_admin,
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers={"X-Session-Token": "test-session-token"},
            )

        assert resp.status_code == 404

    def test_overall_confidence_null_scores(self, app_client, rsa_keys):
        """Null confidence_scores should return null overall_confidence."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["confidence_scores"] = None
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["overall_confidence"] is None

    def test_overall_confidence_empty_scores_dict(self, app_client, rsa_keys):
        """Empty confidence_scores dict should return null overall_confidence."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["confidence_scores"] = {}
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["overall_confidence"] is None

    def test_confidence_scores_all_missing_score_key(self, app_client, rsa_keys):
        """When all entries lack 'score' key, overall_confidence is None."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["confidence_scores"] = {
            "field_a": {"tier": "high"},
            "field_b": {"tier": "medium"},
        }
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["overall_confidence"] is None

    def test_confidence_scores_without_score_key(self, app_client, rsa_keys):
        """Confidence entries without 'score' key should be skipped."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["confidence_scores"] = {
            "field_a": {"tier": "high"},  # No 'score' key
            "field_b": {"score": 0.90, "tier": "high"},
        }
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}",
                headers=headers,
            )

        assert resp.status_code == 200
        assert resp.json()["overall_confidence"] == 0.90

    def test_teaser_non_dict_field_value(self, app_client, rsa_keys):
        """Extracted data with non-dict values should still work."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["extracted_data"] = {
            "landlord_legal_name": "Acme Corp",  # Plain string, not dict
            "tenant_legal_name": {"value": "Tenant Inc"},
            "premises_address": None,  # Null value
            "commencement_date": {"value": "2026-01-01"},
            "base_rent_annual": {"value": "$120,000"},
        }
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 200
        fields = {f["field_name"]: f["value"] for f in resp.json()["visible_fields"]}
        assert fields["landlord_legal_name"] == "Acme Corp"
        assert "premises_address" not in fields

    def test_confidence_non_dict_entry_counted_as_low(self, app_client, rsa_keys):
        """Non-dict confidence entries should be counted as 'low'."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        row = FULL_EXTRACTION_ROW.copy()
        row["confidence_scores"] = {
            "field_a": "not_a_dict",
            "field_b": {"score": 0.90, "tier": "high"},
        }
        mock_admin = _build_service_mock_single(row)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                f"/api/v1/extractions/{EXTRACTION_ID}/teaser",
                headers=headers,
            )

        assert resp.status_code == 200
        dist = resp.json()["confidence_distribution"]
        assert dist["low"] == 1
        assert dist["high"] == 1

    def test_list_extractions_custom_limit_offset(self, app_client, rsa_keys):
        """List with custom limit/offset should be reflected in response."""
        headers, mock_jwk, mock_rls = _setup_auth_mocks(rsa_keys)
        mock_admin = _build_service_mock_for_list([], total=0)

        with (
            patch.object(jwks_cache, "get_signing_key", return_value=mock_jwk),
            patch(
                "app.core.dependencies.get_authenticated_client",
                return_value=mock_rls,
            ),
            patch(
                "app.api.v1.extractions.NeonClientManager.get_service_client",
                return_value=mock_admin,
            ),
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers=headers,
                params={"limit": 5, "offset": 10},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["limit"] == 5
        assert data["offset"] == 10
