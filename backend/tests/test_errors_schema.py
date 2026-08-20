"""Tests for error response schemas."""

from datetime import datetime

from app.schemas.errors import (
    ErrorDetail,
    ErrorResponse,
    ValidationErrorResponse,
)


class TestErrorDetail:
    def test_basic_construction(self) -> None:
        detail = ErrorDetail(
            loc=["body", "email"],
            msg="invalid email",
            type="value_error.email",
        )
        assert detail.loc == ["body", "email"]
        assert detail.msg == "invalid email"
        assert detail.type == "value_error.email"
        assert detail.ctx is None

    def test_with_context(self) -> None:
        detail = ErrorDetail(
            loc=["body", "age"],
            msg="too small",
            type="value_error",
            ctx={"limit_value": 18},
        )
        assert detail.ctx == {"limit_value": 18}

    def test_loc_accepts_int_indices(self) -> None:
        detail = ErrorDetail(loc=["body", 0, "name"], msg="required", type="missing")
        assert detail.loc == ["body", 0, "name"]


class TestErrorResponse:
    def test_bad_request_factory(self) -> None:
        err = ErrorResponse.bad_request(message="Invalid input", detail="fix it")
        assert err.status_code == 400
        assert err.message == "Invalid input"
        assert err.detail == "fix it"

    def test_bad_request_defaults(self) -> None:
        err = ErrorResponse.bad_request()
        assert err.message == "Bad request"

    def test_unauthorized_factory(self) -> None:
        err = ErrorResponse.unauthorized()
        assert err.status_code == 401
        assert err.message == "Authentication required"

    def test_forbidden_factory(self) -> None:
        err = ErrorResponse.forbidden()
        assert err.status_code == 403
        assert err.message == "Access denied"

    def test_not_found_factory(self) -> None:
        err = ErrorResponse.not_found(message="Lease not found")
        assert err.status_code == 404
        assert err.message == "Lease not found"

    def test_conflict_factory(self) -> None:
        err = ErrorResponse.conflict()
        assert err.status_code == 409
        assert err.message == "Resource conflict"

    def test_internal_error_factory(self) -> None:
        err = ErrorResponse.internal_error()
        assert err.status_code == 500
        assert err.message == "Internal server error"

    def test_timestamp_is_set(self) -> None:
        err = ErrorResponse.bad_request()
        assert isinstance(err.timestamp, datetime)

    def test_request_id_and_path(self) -> None:
        err = ErrorResponse.bad_request(request_id="req-123", path="/api/v1/leases")
        assert err.request_id == "req-123"
        assert err.path == "/api/v1/leases"

    def test_json_serialization(self) -> None:
        err = ErrorResponse.bad_request(message="test")
        data = err.model_dump(mode="json")
        assert data["status_code"] == 400
        assert data["message"] == "test"
        assert "timestamp" in data


class TestValidationErrorResponse:
    def test_from_errors_factory(self) -> None:
        errors = [
            ErrorDetail(loc=["body", "email"], msg="required", type="missing"),
        ]
        resp = ValidationErrorResponse.from_errors(errors)
        assert resp.status_code == 422
        assert resp.message == "Validation failed"
        assert len(resp.errors) == 1

    def test_from_errors_with_request_id_and_path(self) -> None:
        errors = [
            ErrorDetail(loc=["body", "x"], msg="bad", type="err"),
        ]
        resp = ValidationErrorResponse.from_errors(
            errors, request_id="req-1", path="/api/v1/test"
        )
        assert resp.request_id == "req-1"
        assert resp.path == "/api/v1/test"

    def test_json_serialization(self) -> None:
        errors = [
            ErrorDetail(loc=["body", "name"], msg="required", type="missing"),
        ]
        resp = ValidationErrorResponse.from_errors(errors)
        data = resp.model_dump(mode="json")
        assert data["status_code"] == 422
        assert len(data["errors"]) == 1
