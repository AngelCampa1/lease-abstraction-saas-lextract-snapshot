"""Canonical Lextract brand assets for backend-generated surfaces."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path

from app.core.config import get_settings

_ASSET_DIR = Path(__file__).resolve().parents[1] / "assets" / "brand"


def _brand_base_url() -> str:
    return get_settings().frontend_url.rstrip("/")


@dataclass(frozen=True)
class BrandAssets:
    """Locations for the approved Lextract logo assets."""

    logo_path: Path = _ASSET_DIR / "lextract-logo.png"
    icon_path: Path = _ASSET_DIR / "lextract-icon.png"
    email_logo_path: Path = _ASSET_DIR / "lextract-email-logo.png"

    @property
    def logo_url(self) -> str:
        return f"{_brand_base_url()}/brand/lextract-logo.png"

    @property
    def icon_url(self) -> str:
        return f"{_brand_base_url()}/brand/lextract-icon.png"

    @property
    def email_logo_url(self) -> str:
        return f"{_brand_base_url()}/brand/lextract-email-logo.png"

    @cached_property
    def logo_data_uri(self) -> str:
        """Return the logo as an inline PNG data URI for generated documents."""
        encoded = base64.b64encode(self.logo_path.read_bytes()).decode("ascii")
        return f"data:image/png;base64,{encoded}"


BRAND_ASSETS = BrandAssets()
