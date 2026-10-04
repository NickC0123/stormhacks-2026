from datetime import date as Date
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, model_validator

ItemCategory = Literal[
    "coffee",
    "food",
    "drinks",
    "alcohol",
    "groceries",
    "transport",
    "entertainment",
    "shopping",
    "other",
]


def _parse_money(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip().replace("$", "").replace(",", "")
        try:
            return Decimal(value)
        except InvalidOperation:
            return value
    return value


# Serialized as a string with two decimals, e.g. "10.00".
Money = Annotated[
    Decimal,
    BeforeValidator(_parse_money),
    AfterValidator(lambda d: d.quantize(Decimal("0.01"))),
]


def _whole_number_as_int(value: float) -> int | float:
    return int(value) if float(value).is_integer() else value


class ReceiptItemBase(BaseModel):
    name: str
    quantity: Decimal = Decimal(1)
    unit_price: Decimal
    category: str | None = None


class ReceiptItem(ReceiptItemBase):
    id: UUID
    receipt_id: UUID


class ParsedReceiptItem(BaseModel):
    description: str
    normalized_name: str
    category: ItemCategory = "other"
    quantity: Annotated[float, AfterValidator(_whole_number_as_int)] = 1
    unit_price: Money | None = None
    line_total: Money


class ParsedReceipt(BaseModel):
    """Receipt data extracted from a photo. Money fields are strings like "10.00" in JSON."""

    merchant: str | None = None
    date: Date | None = None
    currency: str = "CAD"
    items: list[ParsedReceiptItem] = Field(default_factory=list)
    subtotal: Money | None = None
    discount: Money = Decimal("0.00")
    tax: Money | None = None
    tip: Money = Decimal("0.00")
    total: Money | None = None
    warnings: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _drop_unreadable_date(cls, data: Any) -> Any:
        if not isinstance(data, dict) or not isinstance(data.get("date"), str):
            return data
        try:
            Date.fromisoformat(data["date"])
        except ValueError:
            warnings = [*data.get("warnings", []), f"Could not read the date {data['date']!r}."]
            data = {**data, "date": None, "warnings": warnings}
        return data


class Receipt(BaseModel):
    id: UUID
    event_id: UUID
    paid_by: UUID
    merchant: str | None = None
    total: Decimal
    image_path: str | None = None
    items: list[ReceiptItem] = Field(default_factory=list)
