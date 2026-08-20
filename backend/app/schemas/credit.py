"""Request and response schemas for credit and payment history endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class CreditTransactionResponse(BaseModel):
    """A single credit ledger entry for API responses."""

    id: str = Field(description="Transaction UUID")
    amount: int = Field(description="Credits added (positive) or used (negative)")
    balance_after: int = Field(description="Balance after this transaction")
    description: str = Field(description="Human-readable description")
    created_at: datetime = Field(description="When the transaction occurred")


class CreditBalanceResponse(BaseModel):
    """Current balance and recent transactions."""

    balance: int = Field(description="Current credit balance")
    recent_transactions: list[CreditTransactionResponse] = Field(
        description="Most recent credit transactions"
    )


class UseCreditRequest(BaseModel):
    """Request body for POST /payments/use-credit."""

    extraction_id: str = Field(
        min_length=1,
        description="UUID of the extraction to unlock",
    )


class UseCreditResponse(BaseModel):
    """Response body for use-credit endpoint."""

    success: bool = Field(description="Whether the credit was applied")
    new_balance: int = Field(description="Balance after using the credit")
    extraction_id: str = Field(description="The extraction that was unlocked")


class PaymentRecord(BaseModel):
    """A single payment record for API responses."""

    id: str = Field(description="Payment UUID")
    payment_type: str = Field(description="single, credit_pack_5, or credit_pack_10")
    amount_cents: int = Field(description="Amount charged in cents")
    currency: str = Field(description="ISO 4217 currency code (e.g. usd)")
    status: str = Field(description="Payment status")
    created_at: datetime = Field(description="When the payment was recorded")


class PaymentHistoryResponse(BaseModel):
    """Paginated payment history."""

    payments: list[PaymentRecord] = Field(description="Payment records")
    total: int = Field(description="Total number of payments")
    page: int = Field(description="Current page number (1-indexed)")
    page_size: int = Field(description="Number of records per page")
