from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.person import EventUser


class EqualShare(BaseModel):
    user: EventUser
    amount: Decimal


class ExpenseSplit(BaseModel):
    expense_id: UUID
    paid_by: EventUser
    currency: str
    total: Decimal
    shares: list[EqualShare]
    customized: bool = False


class BalanceExpense(BaseModel):
    expense_id: UUID
    title: str
    amount: Decimal  # Positive: they owe you. Negative: you owe them.


class PersonBalance(BaseModel):
    user: EventUser
    currency: str
    you_owe: Decimal
    owed_to_you: Decimal
    expenses: list[BalanceExpense]


class CurrencyBalance(BaseModel):
    currency: str
    you_owe: Decimal
    owed_to_you: Decimal


class BalanceDashboard(BaseModel):
    totals: list[CurrencyBalance]
    people: list[PersonBalance]


class ItemAssignment(BaseModel):
    """Split one receipt item between users. Shares are relative weights."""

    item_id: UUID
    user_ids: list[UUID] = Field(min_length=1)
    shares: list[Decimal] | None = None


class SplitRequest(BaseModel):
    assignments: list[ItemAssignment]
