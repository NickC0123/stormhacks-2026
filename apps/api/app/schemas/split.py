from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ItemAssignment(BaseModel):
    """Split one receipt item between users. Shares are relative weights (e.g. 1 and 1 = 50/50)."""

    item_id: UUID
    user_ids: list[UUID] = Field(min_length=1)
    shares: list[Decimal] | None = None


class SplitRequest(BaseModel):
    assignments: list[ItemAssignment]
