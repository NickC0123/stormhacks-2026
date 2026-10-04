from datetime import date as Date
from datetime import datetime
from datetime import time as Time
from decimal import Decimal
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

from app.schemas.receipt import ItemCategory, ParsedReceipt

# Keep monetary values exact; JSON responses serialize Decimal as strings.
ItemMoney = Annotated[
    Decimal,
    Field(max_digits=12, decimal_places=2, allow_inf_nan=False),
    AfterValidator(lambda value: value.quantize(Decimal("0.01"))),
]

ExpenseMoney = Annotated[ItemMoney, Field(ge=0)]


class ExpenseItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    name: str = Field(min_length=1, max_length=200)
    category: ItemCategory = "other"
    amount: ItemMoney
    quantity: Annotated[Decimal, Field(gt=0, allow_inf_nan=False)] = Decimal(1)
    unit_price: ItemMoney | None = None

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Item name is required")
        return value.strip()


class ExpenseWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    date: Date
    time: Time | None = None
    currency: str = Field(default="CAD", pattern=r"^[A-Z]{3}$")
    amount: ExpenseMoney
    event_id: UUID | None = None
    items: list[ExpenseItem] = Field(default_factory=list, max_length=500)
    parsed_receipt: ParsedReceipt | None = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Expense title is required")
        return value.strip()

    @field_validator("time")
    @classmethod
    def local_time(cls, value: Time | None) -> Time | None:
        if value is not None and value.tzinfo is not None:
            raise ValueError("Use a local time without a timezone offset")
        return value


class Expense(ExpenseWrite):
    # Rows come from select("*"), so database-only columns such as split_customized are dropped.
    model_config = ConfigDict(extra="ignore")

    id: UUID
    created_by: UUID
    created_at: datetime
    receipt_image_path: str | None = None


class ReceiptImage(BaseModel):
    url: str
