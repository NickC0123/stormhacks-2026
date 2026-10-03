from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ReceiptItemBase(BaseModel):
    name: str
    quantity: Decimal = Decimal(1)
    unit_price: Decimal
    category: str | None = None


class ReceiptItem(ReceiptItemBase):
    id: UUID
    receipt_id: UUID


class ParsedReceipt(BaseModel):
    """Structured output requested from Gemini when scanning a receipt image."""

    merchant: str | None = None
    purchased_at: datetime | None = None
    currency: str = "CAD"
    items: list[ReceiptItemBase] = []
    subtotal: Decimal | None = None
    tax: Decimal | None = None
    tip: Decimal | None = None
    total: Decimal


class Receipt(BaseModel):
    id: UUID
    event_id: UUID
    paid_by: UUID
    merchant: str | None = None
    total: Decimal
    image_path: str | None = None
    items: list[ReceiptItem] = Field(default_factory=list)
