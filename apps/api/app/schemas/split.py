from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.person import EventUser
from app.schemas.profile import Contact


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


class BalanceSettlement(BaseModel):
    id: UUID
    amount: Decimal  # Positive: you paid them. Negative: they paid you.
    created_at: datetime


class PersonBalance(BaseModel):
    user: EventUser
    currency: str
    you_owe: Decimal
    owed_to_you: Decimal
    expenses: list[BalanceExpense]
    settlements: list[BalanceSettlement] = []
    # Their visible e-transfer details, only while you owe them.
    payment_contacts: list[Contact] = []


class CurrencyBalance(BaseModel):
    currency: str
    you_owe: Decimal
    owed_to_you: Decimal


class BalanceDashboard(BaseModel):
    """Amounts are converted to CAD at fixed approximate rates."""

    totals: list[CurrencyBalance]
    people: list[PersonBalance]
    # Expenses in these currencies have no rate and are left out.
    unconverted_currencies: list[str] = []


class ItemAssignment(BaseModel):
    """Split one receipt item between users. Shares are relative weights."""

    item_id: UUID
    user_ids: list[UUID] = Field(min_length=1)
    shares: list[Decimal] | None = None


class SplitRequest(BaseModel):
    assignments: list[ItemAssignment]


class SettleUpRequest(BaseModel):
    """Record that the full balance with `user_id` was paid.

    `amount` is the balance the caller saw; a stale amount is rejected.
    """

    user_id: UUID
    amount: Decimal = Field(gt=0)
    event_id: UUID | None = None
