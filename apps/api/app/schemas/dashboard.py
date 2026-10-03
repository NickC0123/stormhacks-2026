from decimal import Decimal

from pydantic import BaseModel


class CategorySpend(BaseModel):
    category: str
    amount: Decimal


class SpendingSummary(BaseModel):
    total: Decimal
    by_category: list[CategorySpend]
