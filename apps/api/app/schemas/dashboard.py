from decimal import Decimal

from pydantic import BaseModel


class CategorySpend(BaseModel):
    category: str
    amount: Decimal


class SpendingSummary(BaseModel):
    """Your own share of spending, converted to CAD at fixed approximate rates."""

    currency: str = "CAD"
    total: Decimal
    by_category: list[CategorySpend]
    # Expenses in these currencies have no rate and are left out.
    unconverted_currencies: list[str] = []
