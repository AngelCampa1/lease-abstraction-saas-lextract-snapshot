"""Shared test fixtures for extract-sdk tests."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from extract_sdk.extraction.client import ExtractionClientProtocol
from extract_sdk.models import ExtractionResponse
from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.registry import FieldRegistry


@pytest.fixture
def sample_fields() -> list[FieldDefinition]:
    """A small set of field definitions for testing."""
    return [
        FieldDefinition(
            field_name="base_rent_annual",
            category="Rent & Escalations",
            display_label="Annual Base Rent",
            description="Total base rent payable for the first full lease year.",
            data_type="currency",
            required=True,
            weight=2.0,
            critical=True,
        ),
        FieldDefinition(
            field_name="pro_rata_share",
            category="CAM & Operating Expenses",
            display_label="Pro Rata Share",
            description="Tenant's fractional responsibility for total operating expenses.",
            data_type="percentage",
            required=True,
            aliases=["Proportionate Share", "Tenant Share"],
            cam_relevant=True,
            weight=2.0,
            critical=True,
        ),
        FieldDefinition(
            field_name="lease_term_months",
            category="Key Dates & Term",
            display_label="Lease Term (Months)",
            description="Total duration of the initial lease term in months.",
            data_type="number",
            required=True,
            weight=1.5,
            critical=True,
        ),
        FieldDefinition(
            field_name="landlord_legal_name",
            category="Parties & Property",
            display_label="Landlord Name",
            description="Legal corporate name of the landlord/lessor.",
            data_type="string",
            required=True,
            aliases=["Lessor", "Landlord", "Owner"],
        ),
        FieldDefinition(
            field_name="has_renewal_option",
            category="Options",
            display_label="Has Renewal Option",
            description="Presence of a contractual right to extend the lease term.",
            data_type="boolean",
            required=True,
        ),
        FieldDefinition(
            field_name="cam_exclusions",
            category="CAM & Operating Expenses",
            display_label="CAM Exclusions",
            description="Costs barred from being passed through to the tenant.",
            data_type="array",
            required=True,
            cam_relevant=True,
        ),
        FieldDefinition(
            field_name="commencement_date",
            category="Key Dates & Term",
            display_label="Commencement Date",
            description="Date the legal term of the lease officially begins.",
            data_type="date",
            required=True,
        ),
        FieldDefinition(
            field_name="parking_ratio",
            category="Parking & Common Areas",
            display_label="Parking Ratio",
            description="Number of spaces per 1,000 sf of leased space.",
            data_type="number",
            required=False,
        ),
    ]


@pytest.fixture
def sample_registry(sample_fields: list[FieldDefinition]) -> FieldRegistry:
    """A small FieldRegistry for testing."""
    return FieldRegistry(name="Test Schema", fields=sample_fields)


@pytest.fixture
def lextract_schema_path() -> Path:
    """Path to the actual lextract_field_schema.json."""
    return Path(__file__).resolve().parent.parent.parent.parent / "docs" / "lextract_field_schema.json"


@pytest.fixture
def sample_extraction_response_json() -> str:
    """A sample Claude extraction response JSON."""
    return json.dumps({
        "fields": {
            "base_rent_annual": {
                "value": 150000.00,
                "confidence": 0.95,
                "source_text": "Annual base rent of $150,000"
            },
            "pro_rata_share": {
                "value": 0.0525,
                "confidence": 0.90,
                "source_text": "Tenant's pro rata share: 5.25%"
            },
            "lease_term_months": {
                "value": 60,
                "confidence": 0.98,
                "source_text": "The initial term shall be sixty (60) months"
            },
            "landlord_legal_name": {
                "value": "Acme Properties LLC",
                "confidence": 0.99,
                "source_text": "LANDLORD: Acme Properties LLC"
            },
            "has_renewal_option": {
                "value": True,
                "confidence": 0.85,
                "source_text": "Tenant shall have one option to renew"
            },
            "cam_exclusions": {
                "value": ["capital improvements", "leasing commissions"],
                "confidence": 0.80,
                "source_text": "Excluded from CAM: capital improvements, leasing commissions"
            },
            "commencement_date": {
                "value": "2024-01-15",
                "confidence": 0.97,
                "source_text": "Commencement Date: January 15, 2024"
            },
            "parking_ratio": {
                "value": 4.0,
                "confidence": 0.75,
                "source_text": "4 spaces per 1,000 RSF"
            }
        }
    })


@pytest.fixture
def mock_extraction_client(sample_extraction_response_json: str) -> ExtractionClientProtocol:
    """A mock ExtractionClientProtocol that returns sample data."""
    client = AsyncMock(spec=ExtractionClientProtocol)
    client.extract = AsyncMock(
        return_value=ExtractionResponse(
            text=sample_extraction_response_json,
            input_tokens=5000,
            output_tokens=2000,
        )
    )
    return client


@pytest.fixture
def sample_document_text() -> str:
    """Sample lease document text for unit tests."""
    return """
COMMERCIAL LEASE AGREEMENT

This Lease Agreement ("Lease") is entered into as of January 15, 2024.

LANDLORD: Acme Properties LLC
TENANT: Best Corp Inc.

PREMISES: 123 Main Street, Suite 200, Anytown, TX 75001
Rentable Square Footage: 10,000 RSF

TERM: The initial term shall be sixty (60) months, commencing on
January 15, 2024 and expiring on January 14, 2029.

BASE RENT: Annual base rent of $150,000 ($12,500 per month),
payable monthly in advance.

ESCALATION: Rent shall increase by 3% annually on each anniversary.

PRO RATA SHARE: Tenant's pro rata share: 5.25% (10,000 RSF / 190,476 RSF).

CAM CHARGES: Tenant shall pay its pro rata share of operating expenses.
Excluded from CAM: capital improvements, leasing commissions.

RENEWAL: Tenant shall have one option to renew for an additional 60-month term.

PARKING: 4 spaces per 1,000 RSF.

SECURITY DEPOSIT: $25,000 cash deposit.
"""
