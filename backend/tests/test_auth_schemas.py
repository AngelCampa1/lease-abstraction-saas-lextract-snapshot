"""Tests for auth and user schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    AnonymousSessionResponse,
    LinkSessionRequest,
    LinkSessionResponse,
    SyncUserRequest,
    SyncUserResponse,
)
from app.schemas.user import (
    VALID_ROLES,
    UpdateProfileRequest,
    UpdateProfileResponse,
    UserProfileResponse,
)


# --- SyncUserRequest ---


class TestSyncUserRequest:
    def test_valid_sync_user(self):
        req = SyncUserRequest(email="test@example.com")
        assert req.email == "test@example.com"
        assert req.full_name is None

    def test_sync_user_with_full_name(self):
        req = SyncUserRequest(email="test@example.com", full_name="John Doe")
        assert req.full_name == "John Doe"

    def test_sync_user_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            SyncUserRequest(email="not-an-email")

    def test_sync_user_full_name_max_length(self):
        with pytest.raises(ValidationError):
            SyncUserRequest(email="test@example.com", full_name="x" * 201)

    def test_sync_user_full_name_optional(self):
        req = SyncUserRequest(email="test@example.com")
        assert req.full_name is None


# --- SyncUserResponse ---


class TestSyncUserResponse:
    def test_sync_response(self):
        resp = SyncUserResponse(synced=True, user_id="uuid-1")
        assert resp.synced is True
        assert resp.user_id == "uuid-1"


# --- AnonymousSessionResponse ---


class TestAnonymousSessionResponse:
    def test_session_response(self):
        resp = AnonymousSessionResponse(
            session_token="abc-123",
            expires_at="2026-03-19T00:00:00+00:00",
        )
        assert resp.session_token == "abc-123"


# --- LinkSessionRequest ---


class TestLinkSessionRequest:
    def test_valid_request(self):
        req = LinkSessionRequest(session_token="some-token")
        assert req.session_token == "some-token"

    def test_empty_token_rejected(self):
        with pytest.raises(ValidationError):
            LinkSessionRequest(session_token="")


# --- LinkSessionResponse ---


class TestLinkSessionResponse:
    def test_linked_response(self):
        resp = LinkSessionResponse(linked=True, extractions_transferred=3)
        assert resp.linked is True
        assert resp.extractions_transferred == 3

    def test_default_extractions_transferred(self):
        resp = LinkSessionResponse(linked=False)
        assert resp.extractions_transferred == 0


# --- UserProfileResponse ---


class TestUserProfileResponse:
    def test_profile_response(self):
        resp = UserProfileResponse(
            id="uuid-1",
            email="test@example.com",
            credits_balance=5,
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.id == "uuid-1"
        assert resp.credits_balance == 5

    def test_optional_fields_default_none(self):
        resp = UserProfileResponse(
            id="uuid-1",
            email="test@example.com",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.full_name is None
        assert resp.company is None
        assert resp.role is None


# --- UpdateProfileRequest ---


class TestUpdateProfileRequest:
    def test_valid_update(self):
        req = UpdateProfileRequest(full_name="Jane Doe", company="ACME", role="broker")
        assert req.full_name == "Jane Doe"
        assert req.role == "broker"

    def test_invalid_role_rejected(self):
        with pytest.raises(ValidationError, match="Invalid role"):
            UpdateProfileRequest(role="admin")

    def test_all_valid_roles(self):
        for role in VALID_ROLES:
            req = UpdateProfileRequest(role=role)
            assert req.role == role

    def test_none_role_allowed(self):
        req = UpdateProfileRequest(role=None)
        assert req.role is None

    def test_full_name_max_length(self):
        with pytest.raises(ValidationError):
            UpdateProfileRequest(full_name="x" * 201)


# --- UpdateProfileResponse ---


class TestUpdateProfileResponse:
    def test_response_fields(self):
        resp = UpdateProfileResponse(
            id="uuid-1",
            email="test@example.com",
            full_name="Updated",
            credits_balance=10,
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.full_name == "Updated"
