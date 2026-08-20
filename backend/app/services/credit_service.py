"""Credit ledger service for Lextract.

IMMUTABILITY RULE: credit_transactions rows are NEVER updated. INSERT only.
balance_after is computed and stored at insert time.

Uses database transactions for atomicity — all balance changes, ledger
inserts, and extraction status updates happen within a single transaction.
"""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.exceptions import ConflictError, InsufficientCreditsError, NotFoundError
from app.database.client import NeonClientManager

logger = logging.getLogger(__name__)


class CreditService:
    """Manages the immutable credit ledger and user balance."""

    def _get_db(self) -> Any:
        """Return the service-role Neon client."""
        return NeonClientManager.get_service_client()

    def get_balance(self, user_id: str) -> int:
        """Read the current credits_balance from the users table.

        Args:
            user_id: The user's UUID.

        Returns:
            The current credit balance.
        """
        db = self._get_db()
        result = (
            db.table("users")
            .select("credits_balance")
            .eq("id", user_id)
            .single()
            .execute()
        )
        row: dict[str, Any] = dict(result.data) if result.data else {}
        return int(row.get("credits_balance", 0))

    def get_recent_transactions(
        self, user_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Fetch recent credit transactions ordered by created_at descending.

        Args:
            user_id: The user's UUID.
            limit: Max number of transactions to return.

        Returns:
            List of transaction dicts.
        """
        db = self._get_db()
        result = (
            db.table("credit_transactions")
            .select("id, amount, balance_after, description, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        data: list[dict[str, Any]] = result.data or []
        return data

    async def add_credits(
        self,
        user_id: str,
        amount: int,
        payment_id: str | None,
        description: str,
    ) -> dict[str, Any]:
        """Add credits to a user's balance atomically within a transaction.

        Steps (all within one DB transaction):
        1. Read users.credits_balance with FOR UPDATE lock
        2. Compute new_balance = current + amount
        3. UPDATE users SET credits_balance=new
        4. INSERT credit_transactions row

        Args:
            user_id: The user's UUID.
            amount: Number of credits to add (positive integer).
            payment_id: Optional payment UUID linking this credit grant.
            description: Human-readable description of the transaction.

        Returns:
            Dict with transaction_id, new_balance, amount, and ``created``.
            ``created`` is False when a grant for this ``payment_id`` already
            existed (idempotent no-op), True when a new grant was inserted.
        """
        if amount <= 0:
            raise ValueError(f"Credit amount must be positive, got {amount}")

        db = self._get_db()
        transaction_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()

        with db.transaction() as tx:
            # Read current balance with FOR UPDATE lock to prevent concurrent reads
            balance_result = (
                tx.table("users")
                .select("credits_balance")
                .eq("id", user_id)
                .for_update()
                .single()
                .execute()
            )
            if balance_result.data is None:
                raise NotFoundError("user", user_id)

            # Idempotency / self-heal: a credit grant is uniquely tied to its
            # payment. If a prior webhook delivery already recorded the payment
            # but a separate retry re-enters here, we must not grant twice; and
            # if the payment was recorded but the grant never landed, a retry
            # MUST still grant. Keying on the existing ledger row (not on whether
            # the payment row was just created) makes this correct under retries.
            # The check runs while holding the user-row FOR UPDATE lock, so
            # concurrent deliveries for the same user serialize behind it.
            if payment_id:
                existing_grant = (
                    tx.table("credit_transactions")
                    .select("id, amount, balance_after")
                    .eq("payment_id", payment_id)
                    .maybe_single()
                    .execute()
                )
                if isinstance(existing_grant.data, dict) and existing_grant.data:
                    row = existing_grant.data
                    return {
                        "transaction_id": str(row.get("id", "")),
                        "new_balance": int(row.get("balance_after", 0)),
                        "amount": int(row.get("amount", amount)),
                        "created": False,
                    }

            current_balance = int(balance_result.data.get("credits_balance", 0))
            new_balance = current_balance + amount

            # Update balance (CAS — check that exactly one row was modified)
            update_result = (
                tx.table("users")
                .update({"credits_balance": new_balance, "updated_at": now})
                .eq("id", user_id)
                .execute()
            )
            if not update_result.data:
                raise ConflictError(
                    "Concurrent modification detected — please retry",
                    resource_type="user",
                    resource_id=user_id,
                )

            # Insert immutable ledger row
            insert_data: dict[str, Any] = {
                "id": transaction_id,
                "user_id": user_id,
                "amount": amount,
                "balance_after": new_balance,
                "description": description,
                "created_at": now,
            }
            if payment_id:
                insert_data["payment_id"] = payment_id
            tx.table("credit_transactions").insert(insert_data).execute()

        # Transaction committed successfully
        logger.info(
            "Credits added",
            extra={
                "user_id": user_id,
                "amount": amount,
                "new_balance": new_balance,
                "transaction_id": transaction_id,
            },
        )

        return {
            "transaction_id": transaction_id,
            "new_balance": new_balance,
            "amount": amount,
            "created": True,
        }

    async def use_credit(self, user_id: str, extraction_id: str) -> dict[str, Any]:
        """Use one credit for an extraction atomically within a transaction.

        Steps (all within one DB transaction):
        1. Verify extraction exists, belongs to user, is unpaid
        2. Read balance, check >= 1
        3. UPDATE users SET credits_balance = balance - 1
        4. INSERT credit_transactions (amount=-1)
        5. UPDATE extractions SET payment_status='paid'

        Args:
            user_id: The user's UUID.
            extraction_id: The extraction UUID to unlock.

        Returns:
            Dict with new_balance, extraction_id.

        Raises:
            InsufficientCreditsError: If balance < 1.
            NotFoundError: If extraction not found or not owned by user.
            ConflictError: If extraction already paid.
        """
        db = self._get_db()
        transaction_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()

        with db.transaction() as tx:
            # Lock extraction row to prevent double-spend
            extraction_check = (
                tx.table("extractions")
                .select("id, user_id, payment_status")
                .eq("id", extraction_id)
                .for_update()
                .maybe_single()
                .execute()
            )
            if not extraction_check.data:
                raise NotFoundError("extraction", extraction_id)
            extraction_owner = extraction_check.data.get("user_id")
            if extraction_owner is None or str(extraction_owner) != user_id:
                raise NotFoundError("extraction", extraction_id)
            if extraction_check.data.get("payment_status") == "paid":
                raise ConflictError(
                    "Extraction is already paid",
                    resource_type="extraction",
                    resource_id=extraction_id,
                )

            # Read current balance with FOR UPDATE lock
            balance_result = (
                tx.table("users")
                .select("credits_balance")
                .eq("id", user_id)
                .for_update()
                .single()
                .execute()
            )
            if balance_result.data is None:
                raise NotFoundError("user", user_id)
            current_balance = int(balance_result.data.get("credits_balance", 0))
            if current_balance < 1:
                raise InsufficientCreditsError(required=1, available=current_balance)

            new_balance = current_balance - 1

            # Update balance (CAS — raise if 0 rows modified to detect races)
            users_update = (
                tx.table("users")
                .update({"credits_balance": new_balance, "updated_at": now})
                .eq("id", user_id)
                .execute()
            )
            if not users_update.data:
                raise ConflictError(
                    "Concurrent modification detected — please retry",
                    resource_type="user",
                    resource_id=user_id,
                )

            # Insert immutable ledger row
            tx.table("credit_transactions").insert(
                {
                    "id": transaction_id,
                    "user_id": user_id,
                    "extraction_id": extraction_id,
                    "amount": -1,
                    "balance_after": new_balance,
                    "description": "Credit used for extraction",
                    "created_at": now,
                }
            ).execute()

            # Mark extraction as paid
            tx.table("extractions").update(
                {"payment_status": "paid", "updated_at": now}
            ).eq("id", extraction_id).eq("payment_status", "unpaid").execute()

        # Transaction committed successfully
        logger.info(
            "Credit used",
            extra={
                "user_id": user_id,
                "extraction_id": extraction_id,
                "new_balance": new_balance,
                "transaction_id": transaction_id,
            },
        )

        return {
            "new_balance": new_balance,
            "extraction_id": extraction_id,
        }

    def record_payment(
        self,
        user_id: str,
        payment_type: str,
        amount_cents: int,
        stripe_session_id: str,
        stripe_payment_intent_id: str | None,
    ) -> dict[str, Any]:
        """Record a payment in the payments table.

        Args:
            user_id: The user's UUID.
            payment_type: One of single, credit_pack_5, credit_pack_10.
            amount_cents: Amount charged in cents.
            stripe_session_id: Stripe Checkout Session ID.
            stripe_payment_intent_id: Stripe PaymentIntent ID (may be None).

        Returns:
            The inserted payment row as a dict.
        """
        db = self._get_db()

        # Idempotency: check if payment already recorded for this Stripe session.
        existing = (
            db.table("payments")
            .select("id, user_id, payment_type, amount_cents, status, created_at")
            .eq("stripe_checkout_session_id", stripe_session_id)
            .maybe_single()
            .execute()
        )
        if existing.data:
            logger.info(
                "Payment already recorded for Stripe session %s", stripe_session_id
            )
            existing_row = dict(existing.data)
            existing_row["created"] = False
            return existing_row

        payment_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()

        insert_data: dict[str, Any] = {
            "id": payment_id,
            "user_id": user_id,
            "stripe_checkout_session_id": stripe_session_id,
            "payment_type": payment_type,
            "amount_cents": amount_cents,
            "status": "completed",
            "created_at": now,
        }
        if stripe_payment_intent_id:
            insert_data["stripe_payment_intent_id"] = stripe_payment_intent_id

        try:
            result = db.table("payments").insert(insert_data).execute()
        except Exception as exc:
            if not self._is_unique_violation(exc):
                raise
            existing_after_race = (
                db.table("payments")
                .select("id, user_id, payment_type, amount_cents, status, created_at")
                .eq("stripe_checkout_session_id", stripe_session_id)
                .maybe_single()
                .execute()
            )
            if existing_after_race.data:
                logger.info(
                    "Payment already recorded after concurrent insert "
                    "for Stripe session %s",
                    stripe_session_id,
                )
                existing_row = dict(existing_after_race.data)
                existing_row["created"] = False
                return existing_row
            raise

        logger.info(
            "Payment recorded",
            extra={
                "payment_id": payment_id,
                "user_id": user_id,
                "payment_type": payment_type,
                "amount_cents": amount_cents,
            },
        )

        row: dict[str, Any] = (
            result.data[0] if result.data and len(result.data) > 0 else insert_data
        )
        row["created"] = True
        return row

    def record_single_payment_and_unlock(
        self,
        user_id: str,
        extraction_id: str,
        amount_cents: int,
        stripe_session_id: str,
        stripe_payment_intent_id: str | None,
        guest_anonymous_session_id: str | None = None,
    ) -> dict[str, Any]:
        """Record a single-purchase payment and unlock the extraction atomically.

        Duplicate Stripe sessions reuse the existing payment row and retry the
        extraction unlock, making recovery possible if a previous attempt
        recorded payment but failed before marking the extraction paid.
        """
        db = self._get_db()
        now = datetime.now(UTC).isoformat()

        with db.transaction() as tx:
            existing = (
                tx.table("payments")
                .select(
                    "id, user_id, payment_type, amount_cents, status, created_at, "
                    "stripe_payment_intent_id"
                )
                .eq("stripe_checkout_session_id", stripe_session_id)
                .maybe_single()
                .execute()
            )

            if isinstance(existing.data, dict) and existing.data:
                payment_row = dict(existing.data)
                if not self._existing_single_payment_matches_unlock(
                    payment_row=payment_row,
                    user_id=user_id,
                    amount_cents=amount_cents,
                    stripe_payment_intent_id=stripe_payment_intent_id,
                ):
                    raise ValueError(
                        "existing single purchase payment does not match unlock request"
                    )
                payment_id = str(payment_row.get("id", ""))
                payment_created = False
            else:
                payment_id = str(uuid.uuid4())
                insert_data: dict[str, Any] = {
                    "id": payment_id,
                    "user_id": user_id,
                    "stripe_checkout_session_id": stripe_session_id,
                    "payment_type": "single",
                    "amount_cents": amount_cents,
                    "status": "completed",
                    "created_at": now,
                }
                if stripe_payment_intent_id:
                    insert_data["stripe_payment_intent_id"] = stripe_payment_intent_id
                result = tx.table("payments").insert(insert_data).execute()
                payment_row = (
                    result.data[0]
                    if result.data and len(result.data) > 0
                    else insert_data
                )
                payment_created = True

            update_data = {
                "payment_status": "paid",
                "payment_id": payment_id,
                "updated_at": now,
            }
            update_query = (
                tx.table("extractions")
                .update(update_data)
                .eq("id", extraction_id)
                .eq("payment_status", "unpaid")
            )
            if guest_anonymous_session_id:
                update_data["user_id"] = user_id
                update_query = update_query.eq(
                    "anonymous_session_id", guest_anonymous_session_id
                ).is_("user_id", "null")
            else:
                update_query = update_query.eq("user_id", user_id)

            update_response = update_query.execute()
            if not update_response.data:
                if payment_created:
                    raise ValueError(
                        "single purchase extraction could not be marked paid"
                    )

                recover_query = (
                    tx.table("extractions")
                    .select("id")
                    .eq("id", extraction_id)
                    .eq("payment_status", "paid")
                    .eq("payment_id", payment_id)
                    .eq("user_id", user_id)
                )
                if guest_anonymous_session_id:
                    recover_query = recover_query.eq(
                        "anonymous_session_id", guest_anonymous_session_id
                    )
                recovered = recover_query.maybe_single().execute()
                if not recovered.data:
                    raise ValueError(
                        "single purchase extraction could not be marked paid"
                    )

        payment_row["created"] = payment_created
        return payment_row

    @staticmethod
    def _existing_single_payment_matches_unlock(
        *,
        payment_row: dict[str, Any],
        user_id: str,
        amount_cents: int,
        stripe_payment_intent_id: str | None,
    ) -> bool:
        existing_intent = payment_row.get("stripe_payment_intent_id")
        if (
            str(payment_row.get("user_id", "")) != user_id
            or payment_row.get("payment_type") != "single"
            or int(payment_row.get("amount_cents", -1)) != amount_cents
            or payment_row.get("status") != "completed"
            or not str(payment_row.get("id", ""))
        ):
            return False
        return (
            not stripe_payment_intent_id
            or str(existing_intent or "") == stripe_payment_intent_id
        )

    @staticmethod
    def _is_unique_violation(exc: Exception) -> bool:
        exc_str = str(exc).lower()
        return "duplicate" in exc_str or "23505" in exc_str or "unique" in exc_str

    def get_payment_history(
        self, user_id: str, page: int = 1, page_size: int = 20
    ) -> tuple[list[dict[str, Any]], int]:
        """Fetch paginated payment history for a user.

        Args:
            user_id: The user's UUID.
            page: Page number (1-indexed).
            page_size: Items per page.

        Returns:
            Tuple of (payment rows, total count).
        """
        db = self._get_db()

        count_result = (
            db.table("payments")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        total: int = count_result.count if count_result.count is not None else 0

        offset = (page - 1) * page_size
        result = (
            db.table("payments")
            .select("id, payment_type, amount_cents, currency, status, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(page_size)
            .offset(offset)
            .execute()
        )

        rows: list[dict[str, Any]] = result.data or []
        return rows, total


_credit_service: CreditService | None = None


def get_credit_service() -> CreditService:
    """Return a singleton CreditService instance."""
    global _credit_service  # noqa: PLW0603
    if _credit_service is None:
        _credit_service = CreditService()
    return _credit_service


def reset_credit_service() -> None:
    """Clear the cached CreditService instance. Used in tests."""
    global _credit_service  # noqa: PLW0603
    _credit_service = None
