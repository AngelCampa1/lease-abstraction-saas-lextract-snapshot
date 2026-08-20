"""Read generated public Lextract knowledge for backend consumers."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, TypedDict, cast

_GENERATED_PATH = Path(__file__).with_name("public_knowledge.generated.json")


class PublicLeadMagnetFacts(TypedDict):
    """Public lead magnet metadata exposed by generated knowledge."""

    slug: str
    title: str
    fileFormat: str
    contentType: str


@lru_cache(maxsize=1)
def get_public_knowledge() -> dict[str, Any]:
    """Return the generated public knowledge JSON."""
    return cast(
        dict[str, Any],
        json.loads(_GENERATED_PATH.read_text(encoding="utf-8")),
    )


def get_email_sender(identity_id: str = "founder") -> str:
    """Return the configured public sender identity."""
    identities = get_public_knowledge()["emails"]["senderIdentities"]
    for identity in identities:
        if identity["id"] == identity_id:
            return str(identity["from"])
    raise KeyError(f"Unknown sender identity: {identity_id}")


def get_contact_email(contact_id: str) -> str:
    """Return a public contact email by contact ID."""
    contacts = get_public_knowledge()["marketing"]["contacts"]
    contact = contacts.get(contact_id)
    if not isinstance(contact, dict):
        raise KeyError(f"Unknown public contact: {contact_id}")
    return str(contact["email"])


def get_email_footer_copy() -> dict[str, str]:
    """Return public email footer copy."""
    footer = get_public_knowledge()["emails"]["footer"]
    return {
        "unsubscribe": str(footer["unsubscribe"]),
        "support": str(footer["support"]),
    }


def get_lead_magnet_public_facts(slug: str) -> PublicLeadMagnetFacts | None:
    """Return public lead magnet facts by slug."""
    magnets = get_public_knowledge()["marketing"]["leadMagnets"]
    for magnet in magnets:
        if magnet["slug"] == slug:
            return {
                "slug": str(magnet["slug"]),
                "title": str(magnet["title"]),
                "fileFormat": str(magnet["fileFormat"]),
                "contentType": str(magnet["contentType"]),
            }
    return None


def get_transactional_subject_template(email_id: str) -> str:
    """Return a transactional email subject template by public email ID."""
    emails = get_public_knowledge()["emails"]["transactional"]
    for email in emails:
        if email["id"] == email_id:
            return str(email["subjectTemplate"])
    raise KeyError(f"Unknown transactional email: {email_id}")


def render_public_subject(email_id: str, **values: object) -> str:
    """Render a public subject template with simple placeholder replacement."""
    subject = get_transactional_subject_template(email_id)
    for key, value in values.items():
        subject = subject.replace(f"{{{key}}}", str(value))
    return subject


def render_public_body_template(
    email_id: str,
    template_key: str,
    **values: object,
) -> str:
    """Render a transactional public email body template."""
    emails = get_public_knowledge()["emails"]["transactional"]
    for email in emails:
        if email["id"] != email_id:
            continue
        body_templates = email.get("bodyTemplates")
        if not isinstance(body_templates, dict):
            raise KeyError(
                f"Missing body templates for transactional email: {email_id}"
            )
        template = body_templates.get(template_key)
        if not isinstance(template, str):
            raise KeyError(f"Missing {template_key} body template for {email_id}")
        for key, value in values.items():
            template = template.replace(f"{{{key}}}", str(value))
        return template
    raise KeyError(f"Unknown transactional email: {email_id}")
