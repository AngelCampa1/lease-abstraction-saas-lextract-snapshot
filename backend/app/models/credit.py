"""Credit transaction Pydantic model.

IMMUTABILITY RULE: CreditTransaction rows are an immutable append-only ledger.
Never update existing rows. Always insert new rows. The balance_after field must
be computed and stored at insert time to enable fast balance reads without
summing the entire ledger.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CreditTransaction(BaseModel):
    """Immutable ledger entry for a credit purchase or usage event.

    Never update rows in this table — always insert new entries.
    balance_after must be computed and stored at insert time.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    extraction_id: uuid.UUID | None = None
    payment_id: uuid.UUID | None = None
    amount: int
    balance_after: int
    description: str
    created_at: datetime
