"""Tests for ObjectStorageService (Cloudflare R2 backend) using moto mock."""

from pathlib import Path
from unittest.mock import MagicMock, patch
from uuid import uuid4

import boto3
import pytest
from botocore.exceptions import BotoCoreError, ClientError
from moto import mock_aws

from app.core.config import Settings
from app.core.exceptions import ObjectStorageError

FIXTURES_DIR = Path(__file__).parent / "fixtures"
BUCKET_NAME = "lextract-documents"
REGION = "us-east-1"


def _load_sample_pdf() -> bytes:
    return (FIXTURES_DIR / "sample.pdf").read_bytes()


@pytest.fixture
def settings():
    """Create test settings with R2 credentials for moto.

    moto's ``mock_aws`` decorator emulates the object-storage API regardless of
    ``endpoint_url``. With ``r2_endpoint_url=""`` the boto3 client falls
    back to the default endpoint, which moto intercepts.
    """
    return Settings(
        r2_endpoint_url="",
        r2_access_key_id="testing",
        r2_secret_access_key="testing",
        r2_bucket_name=BUCKET_NAME,
    )


@pytest.fixture
def aws_env(monkeypatch):
    """Set env vars so boto3 uses moto credentials."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)


@pytest.fixture
def object_storage_bucket(aws_env):
    """Create a mocked object-storage bucket via moto."""
    with mock_aws():
        client = boto3.client("s3", region_name=REGION)
        client.create_bucket(Bucket=BUCKET_NAME)
        yield client


@pytest.fixture
def object_storage_service(object_storage_bucket, settings):
    """Create ObjectStorageService with moto-mocked backend."""
    from app.services.object_storage import ObjectStorageService

    return ObjectStorageService(settings=settings)


class TestObjectKeyGeneration:
    """Tests for object key path conventions."""

    def test_upload_key_follows_convention(self, object_storage_service):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        key = object_storage_service.build_upload_key(user_id, extraction_id)
        assert key == f"{user_id}/{extraction_id}/original.pdf"

    def test_export_key_follows_convention(self, object_storage_service):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        key = object_storage_service.build_export_key(
            user_id, extraction_id, "word", "docx"
        )
        assert key == f"{user_id}/{extraction_id}/exports/v2/commercial/word.docx"

    def test_export_key_bypasses_legacy_unversioned_cache(self, object_storage_service):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        key = object_storage_service.build_export_key(
            user_id, extraction_id, "docx", "docx"
        )
        assert key != f"{user_id}/{extraction_id}/exports/docx.docx"

    def test_export_key_includes_version_segment_when_provided(
        self, object_storage_service
    ):
        key = object_storage_service.build_export_key(
            "u", "e", "docx", "docx", "commercial", version="abc123"
        )
        assert key == "u/e/exports/v2/abc123/commercial/docx.docx"

    def test_build_export_prefix(self, object_storage_service):
        assert object_storage_service.build_export_prefix("u", "e") == "u/e/exports/"


class TestExportVersionToken:
    """Tests for the cache-busting version token derivation."""

    def test_strips_iso_punctuation(self, object_storage_service):
        token = object_storage_service.export_version_token("2026-01-01T00:00:00+00:00")
        assert ":" not in token
        assert "+" not in token
        assert "-" not in token
        assert "2026" in token

    def test_stable_for_same_input(self, object_storage_service):
        a = object_storage_service.export_version_token("2026-02-15T10:30:00+00:00")
        b = object_storage_service.export_version_token("2026-02-15T10:30:00+00:00")
        assert a == b

    def test_different_for_different_input(self, object_storage_service):
        a = object_storage_service.export_version_token("2026-01-01T00:00:00+00:00")
        b = object_storage_service.export_version_token("2026-02-15T10:30:00+00:00")
        assert a != b

    @pytest.mark.parametrize("empty", [None, "", 0])
    def test_falls_back_to_v0_when_missing(self, object_storage_service, empty):
        assert object_storage_service.export_version_token(empty) == "v0"


class TestDeletePrefix:
    """Tests for prefix-based deletion of an extraction's export namespace."""

    def test_deletes_all_objects_under_prefix(
        self, object_storage_service, object_storage_bucket
    ):
        prefix = "u/e/exports/"
        for name in ("v1/commercial/docx.docx", "v2/office/xlsx.xlsx"):
            object_storage_bucket.put_object(
                Bucket=BUCKET_NAME, Key=prefix + name, Body=b"x"
            )
        # An object outside the prefix must survive.
        object_storage_bucket.put_object(
            Bucket=BUCKET_NAME, Key="u/e/original.pdf", Body=b"y"
        )

        deleted = object_storage_service.delete_prefix(prefix)

        assert deleted == 2
        remaining = object_storage_bucket.list_objects_v2(Bucket=BUCKET_NAME)
        keys = {obj["Key"] for obj in remaining.get("Contents", [])}
        assert keys == {"u/e/original.pdf"}

    def test_empty_prefix_returns_zero_when_nothing_matches(
        self, object_storage_service, object_storage_bucket
    ):
        assert object_storage_service.delete_prefix("does/not/exist/") == 0

    def test_rejects_blank_prefix(self, object_storage_service):
        with pytest.raises(ObjectStorageError):
            object_storage_service.delete_prefix("")

    def test_wraps_client_error(self, object_storage_service):
        err = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "nope"}}, "ListObjectsV2"
        )
        object_storage_service._client = MagicMock()
        object_storage_service._client.get_paginator.side_effect = err
        with pytest.raises(ObjectStorageError):
            object_storage_service.delete_prefix("u/e/exports/")

    def test_wraps_botocore_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.get_paginator.side_effect = BotoCoreError()
        with pytest.raises(ObjectStorageError):
            object_storage_service.delete_prefix("u/e/exports/")


class TestFileValidation:
    """Tests for file validation before upload."""

    def test_rejects_non_pdf_content_type(self, object_storage_service):
        pdf_bytes = _load_sample_pdf()
        with pytest.raises(ObjectStorageError, match="application/pdf"):
            object_storage_service.upload_file(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=pdf_bytes,
                content_type="image/png",
            )

    def test_rejects_file_over_50mb(self, object_storage_service):
        big_content = b"%PDF" + b"\x00" * (50 * 1024 * 1024 + 1)
        with pytest.raises(ObjectStorageError, match="50MB"):
            object_storage_service.upload_file(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=big_content,
                content_type="application/pdf",
            )

    def test_rejects_invalid_pdf_magic_bytes(self, object_storage_service):
        with pytest.raises(ObjectStorageError, match="PDF"):
            object_storage_service.upload_file(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=b"not a pdf at all",
                content_type="application/pdf",
            )

    def test_rejects_empty_file(self, object_storage_service):
        with pytest.raises(ObjectStorageError, match="empty"):
            object_storage_service.upload_file(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=b"",
                content_type="application/pdf",
            )

    def test_accepts_valid_pdf(self, object_storage_service):
        pdf_bytes = _load_sample_pdf()
        key = object_storage_service.upload_file(
            user_id=str(uuid4()),
            extraction_id=str(uuid4()),
            file_content=pdf_bytes,
            content_type="application/pdf",
        )
        assert key.endswith("/original.pdf")

    def test_accepts_exactly_50mb_file(self, object_storage_service):
        content = b"%PDF" + b"\x00" * (50 * 1024 * 1024 - 4)
        assert len(content) == 50 * 1024 * 1024
        key = object_storage_service.upload_file(
            user_id=str(uuid4()),
            extraction_id=str(uuid4()),
            file_content=content,
            content_type="application/pdf",
        )
        assert key.endswith("/original.pdf")


class TestUploadFile:
    """Tests for uploading files to object storage."""

    def test_upload_returns_object_key(self, object_storage_service):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        pdf_bytes = _load_sample_pdf()

        key = object_storage_service.upload_file(
            user_id=user_id,
            extraction_id=extraction_id,
            file_content=pdf_bytes,
            content_type="application/pdf",
        )
        assert key == f"{user_id}/{extraction_id}/original.pdf"

    def test_uploaded_file_exists_in_bucket(
        self, object_storage_service, object_storage_bucket
    ):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        pdf_bytes = _load_sample_pdf()

        key = object_storage_service.upload_file(
            user_id=user_id,
            extraction_id=extraction_id,
            file_content=pdf_bytes,
            content_type="application/pdf",
        )

        response = object_storage_bucket.get_object(Bucket=BUCKET_NAME, Key=key)
        assert response["Body"].read() == pdf_bytes

    def test_upload_sets_content_type(
        self, object_storage_service, object_storage_bucket
    ):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        pdf_bytes = _load_sample_pdf()

        key = object_storage_service.upload_file(
            user_id=user_id,
            extraction_id=extraction_id,
            file_content=pdf_bytes,
            content_type="application/pdf",
        )

        response = object_storage_bucket.head_object(Bucket=BUCKET_NAME, Key=key)
        assert response["ContentType"] == "application/pdf"

    def test_upload_uses_server_side_encryption(
        self, object_storage_service, object_storage_bucket
    ):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        pdf_bytes = _load_sample_pdf()

        key = object_storage_service.upload_file(
            user_id=user_id,
            extraction_id=extraction_id,
            file_content=pdf_bytes,
            content_type="application/pdf",
        )

        response = object_storage_bucket.head_object(Bucket=BUCKET_NAME, Key=key)
        assert response.get("ServerSideEncryption") == "AES256"


class TestDownloadFile:
    """Tests for downloading files from object storage."""

    def test_download_returns_bytes(
        self, object_storage_service, object_storage_bucket
    ):
        pdf_bytes = _load_sample_pdf()
        key = "test-user/test-extraction/original.pdf"
        object_storage_bucket.put_object(Bucket=BUCKET_NAME, Key=key, Body=pdf_bytes)

        result = object_storage_service.download_file(key)
        assert result == pdf_bytes

    def test_download_nonexistent_key_raises_error(self, object_storage_service):
        with pytest.raises(ObjectStorageError, match="download"):
            object_storage_service.download_file("nonexistent/key.pdf")

    def test_stream_file_yields_pdf_chunks(
        self, object_storage_service, object_storage_bucket
    ):
        pdf_bytes = _load_sample_pdf()
        key = "test-user/test-extraction/original.pdf"
        object_storage_bucket.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )

        stream, content_type = object_storage_service.stream_file(key, chunk_size=32)

        assert b"".join(stream) == pdf_bytes
        assert content_type == "application/pdf"

    def test_stream_nonexistent_key_raises_error(self, object_storage_service):
        with pytest.raises(ObjectStorageError, match="stream"):
            object_storage_service.stream_file("nonexistent/key.pdf")


class TestPresignedUrl:
    """Tests for generating presigned URLs."""

    def test_presigned_url_is_string(
        self, object_storage_service, object_storage_bucket
    ):
        key = "test-user/test-extraction/original.pdf"
        object_storage_bucket.put_object(Bucket=BUCKET_NAME, Key=key, Body=b"%PDF-test")

        url = object_storage_service.generate_presigned_url(key)
        assert isinstance(url, str)
        assert BUCKET_NAME in url
        assert key in url

    def test_presigned_url_default_expiry(
        self, object_storage_service, object_storage_bucket
    ):
        key = "test-user/test-extraction/original.pdf"
        object_storage_bucket.put_object(Bucket=BUCKET_NAME, Key=key, Body=b"%PDF-test")

        url = object_storage_service.generate_presigned_url(key)
        assert "3600" in url or "Expires" in url

    def test_presigned_url_custom_expiry(
        self, object_storage_service, object_storage_bucket
    ):
        key = "test-user/test-extraction/original.pdf"
        object_storage_bucket.put_object(Bucket=BUCKET_NAME, Key=key, Body=b"%PDF-test")

        url = object_storage_service.generate_presigned_url(key, expiry=7200)
        assert isinstance(url, str)


class TestDeleteFile:
    """Tests for deleting files from object storage."""

    def test_delete_removes_file(self, object_storage_service, object_storage_bucket):
        key = "test-user/test-extraction/original.pdf"
        object_storage_bucket.put_object(Bucket=BUCKET_NAME, Key=key, Body=b"%PDF-test")

        object_storage_service.delete_file(key)

        with pytest.raises(ClientError):
            object_storage_bucket.head_object(Bucket=BUCKET_NAME, Key=key)

    def test_delete_nonexistent_key_does_not_raise(self, object_storage_service):
        """delete_object is idempotent and should not raise for missing keys."""
        object_storage_service.delete_file("nonexistent/key.pdf")


class TestObjectStorageServiceConstructor:
    """Tests for ObjectStorageService construction and dependency injection."""

    def test_creates_with_settings(self, object_storage_bucket, settings):
        from app.services.object_storage import ObjectStorageService

        service = ObjectStorageService(settings=settings)
        assert service.bucket == BUCKET_NAME

    def test_creates_with_custom_client(self, object_storage_bucket, settings):
        from app.services.object_storage import ObjectStorageService

        custom_client = boto3.client("s3", region_name=REGION)
        service = ObjectStorageService(settings=settings, client=custom_client)
        assert service.bucket == BUCKET_NAME


class TestGetObjectStorageService:
    """Tests for the FastAPI dependency function."""

    def test_get_object_storage_service_returns_instance(
        self, object_storage_bucket, settings, monkeypatch
    ):
        from app.services import object_storage as object_storage_module
        from app.services.object_storage import (
            ObjectStorageService,
            get_object_storage_service,
        )

        monkeypatch.setattr(object_storage_module, "_settings_override", settings)
        service = get_object_storage_service()
        assert isinstance(service, ObjectStorageService)

    def test_reset_object_storage_service_clears_cached_instance(
        self, object_storage_bucket, settings, monkeypatch
    ):
        """The cached singleton should be rebuilt after reset."""
        from app.services import object_storage as object_storage_module
        from app.services.object_storage import (
            get_object_storage_service,
            reset_object_storage_service,
        )

        monkeypatch.setattr(object_storage_module, "_settings_override", settings)
        first = get_object_storage_service()
        reset_object_storage_service()
        assert object_storage_module._object_storage_service is None
        second = get_object_storage_service()
        assert first is not second


class TestObjectExists:
    """Tests for the object_exists() helper."""

    def test_returns_true_when_object_present(
        self, object_storage_service, object_storage_bucket
    ):
        key = "test-user/test-extraction/original.pdf"
        object_storage_bucket.put_object(Bucket=BUCKET_NAME, Key=key, Body=b"%PDF-test")
        assert object_storage_service.object_exists(key) is True

    def test_returns_false_when_object_missing(self, object_storage_service):
        assert object_storage_service.object_exists("missing/key.pdf") is False

    def test_reraises_non_404_client_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.head_object.side_effect = ClientError(
            {"Error": {"Code": "403", "Message": "Forbidden"}}, "HeadObject"
        )
        with pytest.raises(ClientError):
            object_storage_service.object_exists("forbidden/key.pdf")


class TestExtractionArtifact:
    """Tests for upload_extraction_artifact and build_extraction_artifact_key."""

    def test_artifact_key_convention(self, object_storage_service):
        extraction_id = str(uuid4())
        key = object_storage_service.build_extraction_artifact_key(
            extraction_id, "pass1-gemini"
        )
        assert key == f"extractions/{extraction_id}/raw/pass1-gemini.json"

    def test_upload_artifact_stores_json(
        self, object_storage_service, object_storage_bucket
    ):
        extraction_id = str(uuid4())
        payload = b'{"pass_kind": "pass1", "raw_response": "test"}'

        key = object_storage_service.upload_extraction_artifact(
            extraction_id=extraction_id,
            artifact_name="pass1-gemini-3-flash",
            payload=payload,
        )

        assert key == f"extractions/{extraction_id}/raw/pass1-gemini-3-flash.json"
        stored = object_storage_bucket.get_object(Bucket=BUCKET_NAME, Key=key)
        assert stored["Body"].read() == payload

    def test_upload_artifact_uses_json_content_type(
        self, object_storage_service, object_storage_bucket
    ):
        extraction_id = str(uuid4())
        payload = b'{"test": true}'

        key = object_storage_service.upload_extraction_artifact(
            extraction_id=extraction_id,
            artifact_name="pass1-model",
            payload=payload,
        )

        obj_head = object_storage_bucket.head_object(Bucket=BUCKET_NAME, Key=key)
        assert obj_head["ContentType"] == "application/json"

    def test_upload_artifact_raises_on_client_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.put_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchBucket", "Message": "Bucket not found"}},
            "PutObject",
        )
        from app.core.exceptions import ObjectStorageError

        with pytest.raises(ObjectStorageError, match="NoSuchBucket"):
            object_storage_service.upload_extraction_artifact(
                extraction_id=str(uuid4()),
                artifact_name="test",
                payload=b"{}",
            )

    def test_upload_artifact_raises_on_botocore_error(self, object_storage_service):
        from botocore.exceptions import BotoCoreError

        object_storage_service._client = MagicMock()
        object_storage_service._client.put_object.side_effect = BotoCoreError()
        from app.core.exceptions import ObjectStorageError

        with pytest.raises(ObjectStorageError, match="Storage client error"):
            object_storage_service.upload_extraction_artifact(
                extraction_id=str(uuid4()),
                artifact_name="test",
                payload=b"{}",
            )


class TestUploadExportFile:
    """Tests for uploading export files."""

    def test_upload_export_uses_export_path(
        self, object_storage_service, object_storage_bucket
    ):
        user_id = str(uuid4())
        extraction_id = str(uuid4())
        content = b"fake docx content"

        key = object_storage_service.upload_export(
            user_id=user_id,
            extraction_id=extraction_id,
            file_content=content,
            format_name="word",
            extension="docx",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        assert key == f"{user_id}/{extraction_id}/exports/v2/commercial/word.docx"

        response = object_storage_bucket.get_object(Bucket=BUCKET_NAME, Key=key)
        assert response["Body"].read() == content


class TestBotoCoreErrorHandling:
    """Tests that BotoCoreError exceptions are wrapped in ObjectStorageError."""

    def test_upload_botocore_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.put_object.side_effect = BotoCoreError()
        pdf_bytes = _load_sample_pdf()

        with pytest.raises(ObjectStorageError, match="Storage client error"):
            object_storage_service.upload_file(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=pdf_bytes,
                content_type="application/pdf",
            )

    def test_download_botocore_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.get_object.side_effect = BotoCoreError()

        with pytest.raises(ObjectStorageError, match="Storage client error"):
            object_storage_service.download_file("some/key.pdf")

    def test_delete_botocore_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.delete_object.side_effect = BotoCoreError()

        with pytest.raises(ObjectStorageError, match="Storage client error"):
            object_storage_service.delete_file("some/key.pdf")

    def test_presigned_url_botocore_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.generate_presigned_url.side_effect = (
            BotoCoreError()
        )

        with pytest.raises(ObjectStorageError, match="Storage client error"):
            object_storage_service.generate_presigned_url("some/key.pdf")

    def test_upload_export_botocore_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.put_object.side_effect = BotoCoreError()

        with pytest.raises(ObjectStorageError, match="Storage client error"):
            object_storage_service.upload_export(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=b"content",
                format_name="word",
                extension="docx",
                content_type="application/octet-stream",
            )


class TestClientErrorHandling:
    """Tests that ClientError exceptions are wrapped in ObjectStorageError."""

    @staticmethod
    def _make_client_error(code="InternalError", message="Something went wrong"):
        return ClientError(
            {"Error": {"Code": code, "Message": message}}, "TestOperation"
        )

    def test_upload_client_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.put_object.side_effect = (
            self._make_client_error()
        )
        pdf_bytes = _load_sample_pdf()

        with pytest.raises(ObjectStorageError, match="upload"):
            object_storage_service.upload_file(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=pdf_bytes,
                content_type="application/pdf",
            )

    def test_delete_client_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.delete_object.side_effect = (
            self._make_client_error()
        )

        with pytest.raises(ObjectStorageError, match="delete"):
            object_storage_service.delete_file("some/key.pdf")

    def test_presigned_url_client_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.generate_presigned_url.side_effect = (
            self._make_client_error()
        )

        with pytest.raises(ObjectStorageError, match="presigned"):
            object_storage_service.generate_presigned_url("some/key.pdf")

    def test_upload_export_client_error(self, object_storage_service):
        object_storage_service._client = MagicMock()
        object_storage_service._client.put_object.side_effect = (
            self._make_client_error()
        )

        with pytest.raises(ObjectStorageError, match="export"):
            object_storage_service.upload_export(
                user_id=str(uuid4()),
                extraction_id=str(uuid4()),
                file_content=b"content",
                format_name="word",
                extension="docx",
                content_type="application/octet-stream",
            )


class TestConstructorWithoutCredentials:
    """Tests for constructor behavior when R2 credentials are absent."""

    def test_creates_without_credentials(self, object_storage_bucket):
        from app.services.object_storage import ObjectStorageService

        no_creds_settings = Settings(
            r2_endpoint_url="",
            r2_access_key_id="",
            r2_secret_access_key="",
            r2_bucket_name=BUCKET_NAME,
        )
        service = ObjectStorageService(settings=no_creds_settings)
        assert service.bucket == BUCKET_NAME


class TestR2Configuration:
    """Tests for Cloudflare R2 boto3 client configuration."""

    def test_r2_endpoint_url_passed_to_boto3_client_when_set(self):
        """When r2_endpoint_url is set, boto3 receives it as endpoint_url."""
        from app.services.object_storage import ObjectStorageService

        endpoint = "https://abc123.r2.cloudflarestorage.com"
        r2_settings = Settings(
            r2_endpoint_url=endpoint,
            r2_access_key_id="testing",
            r2_secret_access_key="testing",
            r2_bucket_name=BUCKET_NAME,
        )
        with patch("app.services.object_storage.boto3.client") as mock_boto3_client:
            ObjectStorageService(settings=r2_settings)
            assert mock_boto3_client.called
            kwargs = mock_boto3_client.call_args.kwargs
            assert kwargs["endpoint_url"] == endpoint

    def test_r2_endpoint_url_is_none_when_unset(self):
        """When r2_endpoint_url is empty, endpoint_url falls back to None."""
        from app.services.object_storage import ObjectStorageService

        r2_settings = Settings(
            r2_endpoint_url="",
            r2_access_key_id="testing",
            r2_secret_access_key="testing",
            r2_bucket_name=BUCKET_NAME,
        )
        with patch("app.services.object_storage.boto3.client") as mock_boto3_client:
            ObjectStorageService(settings=r2_settings)
            kwargs = mock_boto3_client.call_args.kwargs
            assert kwargs["endpoint_url"] is None

    def test_r2_region_name_is_auto(self):
        """R2 requires region_name='auto'."""
        from app.services.object_storage import ObjectStorageService

        r2_settings = Settings(
            r2_endpoint_url="https://abc123.r2.cloudflarestorage.com",
            r2_access_key_id="testing",
            r2_secret_access_key="testing",
            r2_bucket_name=BUCKET_NAME,
        )
        with patch("app.services.object_storage.boto3.client") as mock_boto3_client:
            ObjectStorageService(settings=r2_settings)
            kwargs = mock_boto3_client.call_args.kwargs
            assert kwargs["region_name"] == "auto"

    def test_r2_signature_version_is_s3v4(self):
        """R2 requires SigV4 signatures."""
        from app.services.object_storage import ObjectStorageService

        r2_settings = Settings(
            r2_endpoint_url="https://abc123.r2.cloudflarestorage.com",
            r2_access_key_id="testing",
            r2_secret_access_key="testing",
            r2_bucket_name=BUCKET_NAME,
        )
        with patch("app.services.object_storage.boto3.client") as mock_boto3_client:
            ObjectStorageService(settings=r2_settings)
            kwargs = mock_boto3_client.call_args.kwargs
            assert kwargs["config"].signature_version == "s3v4"

    def test_r2_credentials_required_in_production(self):
        """Missing R2 credentials in production must raise ValueError."""
        from app.services.object_storage import ObjectStorageService

        prod_settings = Settings(
            environment="production",
            r2_endpoint_url="",
            r2_access_key_id="",
            r2_secret_access_key="",
            r2_bucket_name=BUCKET_NAME,
            openrouter_api_key="sk-or-prod-key",
            stripe_secret_key="sk_live_prod_key",
            stripe_webhook_secret="whsec_prod_secret",
            resend_api_key="re_prod_key",
        )
        with pytest.raises(ValueError, match="R2 credentials"):
            ObjectStorageService(settings=prod_settings)


class TestGeneratePresignedDownloadUrl:
    """Tests for the shared presigned-download helper."""

    def test_builds_r2_client_and_generates_url(self):
        from app.services.object_storage import generate_presigned_download_url

        fake_client = MagicMock()
        fake_client.generate_presigned_url.return_value = (
            "https://downloads.lextract.io/object.pdf?sig=abc"
        )

        with patch(
            "app.services.object_storage.boto3.client",
            return_value=fake_client,
        ) as mock_boto_client:
            result = generate_presigned_download_url(
                bucket="lead-magnets",
                object_key="checklist.pdf",
                endpoint_url="https://example.r2.cloudflarestorage.com",
                access_key_id="key-id",
                secret_access_key="secret-key",
                expiry=604800,
            )

        assert result == "https://downloads.lextract.io/object.pdf?sig=abc"
        assert mock_boto_client.call_args.args == ("s3",)
        kwargs = mock_boto_client.call_args.kwargs
        assert kwargs["endpoint_url"] == "https://example.r2.cloudflarestorage.com"
        assert kwargs["region_name"] == "auto"
        assert kwargs["aws_access_key_id"] == "key-id"
        assert kwargs["aws_secret_access_key"] == "secret-key"
        assert kwargs["config"].signature_version == "s3v4"
        fake_client.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "lead-magnets", "Key": "checklist.pdf"},
            ExpiresIn=604800,
        )
