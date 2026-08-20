"""Canonical lead magnet registry for promoted downloadable resources."""

from __future__ import annotations

from dataclasses import dataclass

from app.services.public_knowledge import (
    PublicLeadMagnetFacts,
    get_lead_magnet_public_facts,
)

LEAD_MAGNETS_BUCKET = "lextract-lead-magnets"
LEAD_MAGNET_SIGNED_URL_SECONDS = 7 * 24 * 3600


@dataclass(frozen=True)
class LeadMagnetDefinition:
    """Metadata required to promote, deliver, and verify a lead magnet."""

    slug: str
    title: str
    file_format: str
    content_type: str
    r2_object_key: str
    local_asset_path: str
    minimum_bytes: int
    minimum_pages: int | None = None
    minimum_sheets: int | None = None


def _public_facts(slug: str) -> PublicLeadMagnetFacts:
    facts = get_lead_magnet_public_facts(slug)
    if facts is None:
        raise ValueError(f"Missing public lead magnet facts for {slug!r}")
    return facts


def _lead_magnet_definition(
    *,
    slug: str,
    r2_object_key: str,
    local_asset_path: str,
    minimum_bytes: int,
    minimum_pages: int | None = None,
    minimum_sheets: int | None = None,
) -> LeadMagnetDefinition:
    facts = _public_facts(slug)
    return LeadMagnetDefinition(
        slug=slug,
        title=str(facts["title"]),
        file_format=str(facts["fileFormat"]),
        content_type=str(facts["contentType"]),
        r2_object_key=r2_object_key,
        local_asset_path=local_asset_path,
        minimum_bytes=minimum_bytes,
        minimum_pages=minimum_pages,
        minimum_sheets=minimum_sheets,
    )


PROMOTED_LEAD_MAGNETS: tuple[LeadMagnetDefinition, ...] = (
    _lead_magnet_definition(
        slug="lease-abstraction-checklist",
        r2_object_key="lease-abstraction-checklist-v3.pdf",
        local_asset_path="public/lead-magnets/lease-abstraction-checklist-v3.pdf",
        minimum_bytes=20_000,
        minimum_pages=8,
    ),
    _lead_magnet_definition(
        slug="cam-reconciliation-checklist",
        r2_object_key="cam-reconciliation-checklist-v3.pdf",
        local_asset_path="public/lead-magnets/cam-reconciliation-checklist-v3.pdf",
        minimum_bytes=20_000,
        minimum_pages=7,
    ),
    _lead_magnet_definition(
        slug="due-diligence-checklist",
        r2_object_key="due-diligence-checklist-v3.pdf",
        local_asset_path="public/lead-magnets/due-diligence-checklist-v3.pdf",
        minimum_bytes=20_000,
        minimum_pages=7,
    ),
    _lead_magnet_definition(
        slug="lease-audit-workbook",
        r2_object_key="lease-audit-workbook-v3.xlsx",
        local_asset_path="public/lead-magnets/lease-audit-workbook-v3.xlsx",
        minimum_bytes=20_000,
        minimum_sheets=8,
    ),
)

_LEAD_MAGNET_BY_SLUG = {magnet.slug: magnet for magnet in PROMOTED_LEAD_MAGNETS}


def get_lead_magnet(slug: str) -> LeadMagnetDefinition | None:
    """Return a promoted lead magnet definition by slug."""
    return _LEAD_MAGNET_BY_SLUG.get(slug)


def require_lead_magnet(slug: str) -> LeadMagnetDefinition:
    """Return a promoted lead magnet definition or raise ValueError."""
    magnet = get_lead_magnet(slug)
    if magnet is None:
        allowed = ", ".join(sorted(_LEAD_MAGNET_BY_SLUG))
        raise ValueError(f"Invalid lead magnet slug {slug!r}. Allowed: {allowed}")
    return magnet


def is_promoted_lead_magnet_slug(slug: str) -> bool:
    """Return whether *slug* is a currently promoted lead magnet."""
    return slug in _LEAD_MAGNET_BY_SLUG


def get_promoted_lead_magnet_slugs() -> tuple[str, ...]:
    """Return promoted lead magnet slugs in display order."""
    return tuple(magnet.slug for magnet in PROMOTED_LEAD_MAGNETS)
