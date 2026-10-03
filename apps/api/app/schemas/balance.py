from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class Balance(BaseModel):
    from_user_id: UUID
    to_user_id: UUID
    amount: Decimal
