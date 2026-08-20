"""Cloudflare R2 object-storage service for uploads, downloads, and exports.

Provides a stateless ``ObjectStorageService`` that wraps boto3 against
Cloudflare R2's object-storage API with:
- File validation (PDF only, max 50MB)
- Server-side encryption (AES-256, accepted by R2 as a no-op)
- Presigned URL generation
- Structured path conventions for lease documents and exports
"""

import logging
import re
from collections.abc import Iterator
from typing import Any, cast

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import Settings, get_settings
from app.core.exceptions import ObjectStorageError

logger = logging.getLogger(__name__)

PDF_MAGIC_BYTES = b"%PDF"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
EXPORT_CACHE_VERSION = "v2"


class ObjectStorageService:
    """Stateless R2 object-storage service for lease document storage.

    Handles uploading, downloading, generating presigned URLs, and deleting
    files in Cloudflare R2 via its object-storage API. Enforces PDF-only
    uploads with a 50MB size limit.

    Path conventions:
        - Original uploads: ``{user_id}/{extraction_id}/original.pdf``
        - Export files: ``{user_id}/{extraction_id}/exports/v2/{format}.{ext}``

    Args:
        settings: Application settings with R2 credentials and bucket config.
        client: Optional pre-configured boto3 client (for testing).
    """

    def __init__(
        self,
        settings: Settings | None = None,
        client: Any | None = None,
    ) -> None:
        resolved_settings = settings or get_settings()
        self.bucket = resolved_settings.r2_bucket_name

        if client is not None:
            self._client = client
            return

        config = Config(
            retries={"max_attempts": 3, "mode": "adaptive"},
            connect_timeout=5,
            read_timeout=30,
            signature_version="s3v4",
        )
        client_kwargs: dict[str, Any] = {
            "service_name": "s3",
            "endpoint_url": resolved_settings.r2_endpoint_url or None,
            "region_name": "auto",
            "config": config,
        }
        if (
            resolved_settings.r2_access_key_id
            and resolved_settings.r2_secret_access_key
        ):
            client_kwargs["aws_access_key_id"] = resolved_settings.r2_access_key_id
            client_kwargs["aws_secret_access_key"] = (
                resolved_settings.r2_secret_access_key
            )

        if resolved_settings.environment in ("production", "staging") and (
            not resolved_settings.r2_access_key_id
            or not resolved_settings.r2_secret_access_key
            or not resolved_settings.r2_endpoint_url
        ):
            raise ValueError(
                "R2 credentials (r2_endpoint_url, r2_access_key_id, "
                "r2_secret_access_key) are required in production. "
                "Set them via environment variables."
            )

        self._client = boto3.client(**client_kwargs)

    @staticmethod
    def build_upload_key(user_id: str, extraction_id: str) -> str:
        """Build the object key for an original PDF upload."""
        return f"{user_id}/{extraction_id}/original.pdf"

    @staticmethod
    def build_export_key(
        user_id: str,
        extraction_id: str,
        format_name: str,
        extension: str,
        template: str = "commercial",
        version: str | None = None,
    ) -> str:
        """Build the object key for an export file.

        ``version`` is an optional cache-busting segment derived from the
        extraction's ``updated_at`` (see :meth:`export_version_token`). When
        present it is inserted into the path so that editing a field — which
        bumps ``updated_at`` — yields a fresh key and the pre-edit export is no
        longer served from cache. Omitting it preserves the legacy key shape.
        """
        version_segment = f"{version}/" if version else ""
        return (
            f"{user_id}/{extraction_id}/exports/"
            f"{EXPORT_CACHE_VERSION}/{version_segment}{template}/"
            f"{format_name}.{extension}"
        )

    @staticmethod
    def build_export_prefix(user_id: str, extraction_id: str) -> str:
        """Return the prefix covering every export for an extraction.

        All cache-busting versions live under this prefix, so deleting it
        removes every cached export regardless of ``updated_at`` history.
        """
        return f"{user_id}/{extraction_id}/exports/"

    @staticmethod
    def export_version_token(updated_at: Any) -> str:
        """Derive a filesystem/object-store-safe cache-busting token.

        Strips ISO-8601 punctuation (``:``, ``+``, ``-``, ``.``) so the token
        is safe to embed in an object key, while remaining stable for a given
        ``updated_at`` value. Returns ``"v0"`` when no timestamp is available so
        callers always get a usable segment.
        """
        if not updated_at:
            return "v0"
        token = re.sub(r"[^0-9A-Za-z]", "", str(updated_at))
        return token or "v0"

    @staticmethod
    def build_extraction_artifact_key(extraction_id: str, artifact_name: str) -> str:
        """Build the object key for a raw-extraction artifact (JSON dump)."""
        return f"extractions/{extraction_id}/raw/{artifact_name}.json"

    def upload_extraction_artifact(
        self,
        extraction_id: str,
        artifact_name: str,
        payload: bytes,
    ) -> str:
        """Upload a raw-extraction JSON artifact to object storage.

        Used for forensic replay: raw model response for each pass is stored
        so that extraction failures can be replayed without hitting the LLM.

        Args:
            extraction_id: UUID of the extraction record.
            artifact_name: Human-readable name, e.g. ``pass1-gemini-3-flash``.
            payload: UTF-8 encoded JSON bytes.

        Returns:
            The object key the artifact was stored under.
        """
        key = self.build_extraction_artifact_key(extraction_id, artifact_name)

        try:
            self._client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=payload,
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Object storage artifact upload failed",
                extra={"key": key, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to upload artifact: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error(
                "Storage client error during artifact upload",
                extra={"key": key},
            )
            raise ObjectStorageError(
                f"Storage client error uploading artifact: {e}",
                original_error=e,
            ) from e

        logger.info(
            "Extraction artifact uploaded",
            extra={"key": key, "size": len(payload)},
        )
        return key

    def _validate_pdf_upload(self, file_content: bytes, content_type: str) -> None:
        """Validate file content before uploading to object storage."""
        if len(file_content) == 0:
            raise ObjectStorageError("File is empty — cannot upload an empty file")

        if content_type != "application/pdf":
            raise ObjectStorageError(
                f"Invalid content type: {content_type}. "
                "Only application/pdf is accepted"
            )

        if len(file_content) > MAX_FILE_SIZE:
            raise ObjectStorageError(
                f"File size {len(file_content)} bytes exceeds the 50MB limit"
            )

        if len(file_content) < 4 or file_content[:4] != PDF_MAGIC_BYTES:
            raise ObjectStorageError(
                "Invalid file: content does not start with PDF magic bytes (%PDF)"
            )

    def upload_file(
        self,
        user_id: str,
        extraction_id: str,
        file_content: bytes,
        content_type: str,
    ) -> str:
        """Upload a PDF file to object storage."""
        self._validate_pdf_upload(file_content, content_type)

        key = self.build_upload_key(user_id, extraction_id)

        try:
            self._client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_content,
                ContentType=content_type,
                ServerSideEncryption="AES256",
            )
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Object storage upload failed",
                extra={"key": key, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to upload file: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error("Storage client error during upload", extra={"key": key})
            raise ObjectStorageError(
                f"Storage client error uploading file: {e}",
                original_error=e,
            ) from e

        logger.info(
            "File uploaded to object storage",
            extra={"key": key, "size": len(file_content)},
        )
        return key

    def upload_export(
        self,
        user_id: str,
        extraction_id: str,
        file_content: bytes,
        format_name: str,
        extension: str,
        content_type: str,
        template: str = "commercial",
        version: str | None = None,
    ) -> str:
        """Upload an export file to object storage."""
        key = self.build_export_key(
            user_id, extraction_id, format_name, extension, template, version
        )

        try:
            self._client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_content,
                ContentType=content_type,
                ServerSideEncryption="AES256",
            )
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Object storage export upload failed",
                extra={"key": key, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to upload export: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error(
                "Storage client error during export upload",
                extra={"key": key},
            )
            raise ObjectStorageError(
                f"Storage client error uploading export: {e}",
                original_error=e,
            ) from e

        logger.info(
            "Export uploaded to object storage",
            extra={"key": key, "size": len(file_content)},
        )
        return key

    def generate_presigned_url(self, object_key: str, expiry: int = 3600) -> str:
        """Generate a presigned URL for downloading a stored object."""
        try:
            url: str = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": object_key},
                ExpiresIn=expiry,
            )
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Failed to generate presigned URL",
                extra={"key": object_key, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to generate presigned URL: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error(
                "Storage client error generating presigned URL",
                extra={"key": object_key},
            )
            raise ObjectStorageError(
                f"Storage client error generating URL: {e}",
                original_error=e,
            ) from e

        logger.info(
            "Presigned URL generated",
            extra={"key": object_key, "expiry": expiry},
        )
        return url

    def download_file(self, object_key: str) -> bytes:
        """Download a file from object storage."""
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=object_key)
            data: bytes = response["Body"].read()
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Object storage download failed",
                extra={"key": object_key, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to download file: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error(
                "Storage client error during download",
                extra={"key": object_key},
            )
            raise ObjectStorageError(
                f"Storage client error downloading file: {e}",
                original_error=e,
            ) from e

        logger.info(
            "File downloaded from object storage",
            extra={"key": object_key, "size": len(data)},
        )
        return data

    def stream_file(
        self, object_key: str, chunk_size: int = 64 * 1024
    ) -> tuple[Iterator[bytes], str | None]:
        """Return a streaming iterator for a stored file."""
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=object_key)
            body = response["Body"]
            content_type = response.get("ContentType")
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Object storage stream failed",
                extra={"key": object_key, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to stream file: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error(
                "Storage client error during stream",
                extra={"key": object_key},
            )
            raise ObjectStorageError(
                f"Storage client error streaming file: {e}",
                original_error=e,
            ) from e

        def iterator() -> Iterator[bytes]:
            try:
                yield from body.iter_chunks(chunk_size=chunk_size)
            finally:
                close = getattr(body, "close", None)
                if callable(close):
                    close()

        logger.info("File stream opened from object storage", extra={"key": object_key})
        return iterator(), content_type if isinstance(content_type, str) else None

    def object_exists(self, object_key: str) -> bool:
        """Check whether an object exists in object storage."""
        try:
            self._client.head_object(Bucket=self.bucket, Key=object_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise

    def delete_file(self, object_key: str) -> None:
        """Delete a file from object storage."""
        try:
            self._client.delete_object(Bucket=self.bucket, Key=object_key)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Object storage delete failed",
                extra={"key": object_key, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to delete file: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error(
                "Storage client error during delete",
                extra={"key": object_key},
            )
            raise ObjectStorageError(
                f"Storage client error deleting file: {e}",
                original_error=e,
            ) from e

        logger.info("File deleted from object storage", extra={"key": object_key})

    def delete_prefix(self, prefix: str) -> int:
        """Delete every object whose key starts with ``prefix``.

        Used to purge an extraction's entire export namespace
        (``{owner}/{extraction}/exports/``) on deletion, regardless of how
        many cache-busting versions accumulated from field edits. Paginates
        through ``list_objects_v2`` and removes objects in batches of up to
        1000 (the S3/R2 ``delete_objects`` limit).

        Args:
            prefix: Object-key prefix to delete under. Must be non-empty to
                avoid accidentally clearing the whole bucket.

        Returns:
            The number of objects deleted.

        Raises:
            ObjectStorageError: On any list or delete failure.
        """
        if not prefix:
            raise ObjectStorageError("delete_prefix requires a non-empty prefix")

        deleted = 0
        try:
            paginator = self._client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                contents = page.get("Contents") or []
                batch = [{"Key": obj["Key"]} for obj in contents if obj.get("Key")]
                if not batch:
                    continue
                self._client.delete_objects(
                    Bucket=self.bucket, Delete={"Objects": batch, "Quiet": True}
                )
                deleted += len(batch)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(
                "Object storage prefix delete failed",
                extra={"prefix": prefix, "error_code": error_code},
            )
            raise ObjectStorageError(
                f"Failed to delete prefix: {error_code} - {error_msg}",
                original_error=e,
            ) from e
        except BotoCoreError as e:
            logger.error(
                "Storage client error during prefix delete",
                extra={"prefix": prefix},
            )
            raise ObjectStorageError(
                f"Storage client error deleting prefix: {e}",
                original_error=e,
            ) from e

        logger.info(
            "Prefix deleted from object storage",
            extra={"prefix": prefix, "deleted": deleted},
        )
        return deleted


_settings_override: Settings | None = None
_object_storage_service: ObjectStorageService | None = None


def generate_presigned_download_url(
    *,
    bucket: str,
    object_key: str,
    endpoint_url: str,
    access_key_id: str,
    secret_access_key: str,
    expiry: int,
) -> str:
    """Generate a presigned download URL for an arbitrary R2 bucket."""
    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        region_name="auto",
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        config=Config(signature_version="s3v4"),
    )
    # boto3 stubs type generate_presigned_url as Any; cast to str for mypy
    return cast(
        str,
        client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_key},
            ExpiresIn=expiry,
        ),
    )


def get_object_storage_service() -> ObjectStorageService:
    """Return a singleton ``ObjectStorageService`` instance."""
    global _object_storage_service  # noqa: PLW0603
    if _object_storage_service is None:
        _object_storage_service = ObjectStorageService(settings=_settings_override)
    return _object_storage_service


def reset_object_storage_service() -> None:
    """Clear the cached object-storage service instance."""
    global _object_storage_service  # noqa: PLW0603
    _object_storage_service = None
