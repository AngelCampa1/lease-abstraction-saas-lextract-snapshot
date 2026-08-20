"""Lead magnet registry coverage tests."""

from __future__ import annotations

from pathlib import Path


def test_promoted_lead_magnets_have_r2_assets_and_quality_thresholds() -> None:
    """Every promoted lead magnet must define its R2 object and asset checks."""
    from app.services.public_knowledge import get_lead_magnet_public_facts
    from app.services.lead_magnets import (
        LEAD_MAGNETS_BUCKET,
        PROMOTED_LEAD_MAGNETS,
    )

    assert LEAD_MAGNETS_BUCKET == "lextract-lead-magnets"
    assert [m.slug for m in PROMOTED_LEAD_MAGNETS] == [
        "lease-abstraction-checklist",
        "cam-reconciliation-checklist",
        "due-diligence-checklist",
        "lease-audit-workbook",
    ]

    for magnet in PROMOTED_LEAD_MAGNETS:
        public_facts = get_lead_magnet_public_facts(magnet.slug)
        assert public_facts is not None
        assert magnet.title == public_facts["title"]
        assert magnet.file_format == public_facts["fileFormat"]
        assert magnet.content_type == public_facts["contentType"]
        assert magnet.r2_object_key
        assert magnet.local_asset_path.startswith("public/lead-magnets/")
        assert magnet.minimum_bytes >= 20_000
        if magnet.file_format == "PDF":
            assert magnet.minimum_pages >= 6
            assert magnet.minimum_sheets is None
        else:
            assert magnet.minimum_sheets >= 6
            assert magnet.minimum_pages is None


def test_get_lead_magnet_rejects_unknown_slug() -> None:
    """Unknown slugs must not be accepted by API/email code paths."""
    from app.services.lead_magnets import get_lead_magnet

    assert get_lead_magnet("not-a-real-magnet") is None


def test_each_promoted_lead_magnet_has_delivery_template() -> None:
    """Resend templates must exist for immediate lead magnet delivery."""
    from app.services.lead_magnets import PROMOTED_LEAD_MAGNETS

    template_dir = (
        Path(__file__).resolve().parent.parent
        / "app"
        / "services"
        / "email_templates"
        / "nurture"
    )

    for magnet in PROMOTED_LEAD_MAGNETS:
        template_path = template_dir / f"{magnet.slug}_step_0.html"
        assert template_path.is_file(), f"Missing {template_path.name}"


def test_public_knowledge_helpers_expose_contacts_footer_and_subjects() -> None:
    """Backend public helpers should hide JSON traversal from consumers."""
    from app.services.public_knowledge import (
        get_contact_email,
        get_email_footer_copy,
        get_email_sender,
        render_public_body_template,
        render_public_subject,
    )

    assert get_contact_email("founderSales") == "angel.campa@lextract.io"
    assert get_email_sender("founder") == "Angel Campa <angel.campa@lextract.io>"
    assert (
        render_public_subject(
            "lead-magnet-delivery",
            magnet_name="Lease Audit Workbook",
        )
        == "Your Lease Audit Workbook is ready - download it here"
    )
    assert (
        render_public_body_template(
            "anonymous-notification",
            "textTemplate",
            document_name="office-lease.pdf",
        )
        == "Your lease extraction for office-lease.pdf is complete."
    )
    assert (
        get_email_footer_copy()["support"] == "For help, contact angel.campa@lextract.io."
    )
    assert get_email_footer_copy()["unsubscribe"] == (
        "Unsubscribe or manage email preferences from the footer link."
    )
    rendered_delivery = render_public_body_template(
        "lead-magnet-delivery",
        "htmlTemplate",
        download_url="https://r2.example.com/signed-url",
    )
    assert "https://r2.example.com/signed-url" in rendered_delivery
    assert "$download_url" not in rendered_delivery


def test_public_knowledge_helpers_reject_unknown_public_ids() -> None:
    """Backend public helpers should fail closed on unknown canonical IDs."""
    import pytest

    from app.services.public_knowledge import (
        get_contact_email,
        get_email_sender,
        render_public_body_template,
        render_public_subject,
    )

    with pytest.raises(KeyError):
        get_contact_email("not-public")
    with pytest.raises(KeyError):
        get_email_sender("not-public")
    with pytest.raises(KeyError):
        render_public_subject("not-public")
    with pytest.raises(KeyError):
        render_public_body_template("not-public", "htmlTemplate")
    with pytest.raises(KeyError):
        render_public_body_template("anonymous-notification", "missingTemplate")


def test_public_knowledge_helpers_fail_closed_for_missing_body_template_shape(
    monkeypatch: object,
) -> None:
    """Malformed generated email body metadata must not render partial copy."""
    import pytest

    import app.services.public_knowledge as public_knowledge

    def malformed_knowledge() -> dict[str, object]:
        return {
            "emails": {
                "transactional": [
                    {
                        "id": "anonymous-notification",
                        "subjectTemplate": "Subject",
                    }
                ]
            }
        }

    monkeypatch.setattr(public_knowledge, "get_public_knowledge", malformed_knowledge)

    with pytest.raises(KeyError):
        public_knowledge.render_public_body_template(
            "anonymous-notification",
            "htmlTemplate",
        )


def test_public_knowledge_helpers_return_none_for_missing_public_entries() -> None:
    """Optional lookups should return None when the public canon has no match."""
    from app.services.public_knowledge import (
        get_lead_magnet_public_facts,
    )

    assert get_lead_magnet_public_facts("missing-magnet") is None
