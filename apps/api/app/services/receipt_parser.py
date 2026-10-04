"""Receipt image -> structured data using the Gemini vision API."""

from decimal import Decimal

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.schemas.receipt import ItemCategory, ParsedReceipt

# Differences up to this amount are treated as rounding, not as a misread receipt.
TOLERANCE = Decimal("0.02")

PROMPT = """You are reading a photo of a purchase receipt. Extract it into the JSON schema.

Rules:
- description: the item text exactly as printed. normalized_name: a clean, human-readable name
  (expand abbreviations, title case), e.g. "LG ICD LATTE" -> "Large Iced Latte".
- category: pick the closest category for each item; use "other" if unsure.
- Money values are strings with exactly two decimals and no currency symbol, e.g. "5.00".
- quantity is the number of units (1 if not printed). line_total is what that line costs.
- Item-level discounts or coupons are their own item with a negative line_total.
  A discount on the whole receipt goes in discount as a positive amount ("0.00" if none).
- tax is the sum of all taxes (GST, PST, HST, sales tax). tip is "0.00" if there is none.
- date is the purchase date as YYYY-MM-DD, or null if not printed.
- currency is the ISO 4217 code (e.g. CAD, USD); use CAD if it cannot be determined.
- Use null for any value you cannot read. Never invent items or amounts.
- warnings: short notes about anything unclear (blurry, cut off, handwritten tip, not a
  receipt). Use an empty list if everything is clear.
If the image is not a receipt, return no items and explain in warnings."""


class ReceiptParserNotConfiguredError(RuntimeError):
    pass


class ReceiptParseError(RuntimeError):
    pass


class _GeminiItem(BaseModel):
    description: str
    normalized_name: str
    category: ItemCategory
    quantity: float
    unit_price: str | None
    line_total: str


class _GeminiReceipt(BaseModel):
    """Schema sent to Gemini. Money stays a plain string here and is validated afterwards."""

    merchant: str | None
    date: str | None
    currency: str
    items: list[_GeminiItem]
    subtotal: str | None
    discount: str | None
    tax: str | None
    tip: str | None
    total: str | None
    warnings: list[str]


def parse_receipt(image_bytes: bytes, mime_type: str) -> ParsedReceipt:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ReceiptParserNotConfiguredError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=[types.Part.from_bytes(data=image_bytes, mime_type=mime_type), PROMPT],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_GeminiReceipt,
                temperature=0,
            ),
        )
    except Exception as exc:
        raise ReceiptParseError(f"Gemini request failed: {exc}") from exc

    return to_parsed_receipt(response.text or "")


def to_parsed_receipt(raw_json: str) -> ParsedReceipt:
    """Validate Gemini's JSON against the receipt format and flag totals that don't add up."""
    try:
        raw = _GeminiReceipt.model_validate_json(raw_json).model_dump()
        for key in ("discount", "tip"):
            if raw[key] is None:
                del raw[key]
        receipt = ParsedReceipt.model_validate(raw)
    except ValidationError as exc:
        raise ReceiptParseError(f"Gemini returned an unexpected format: {exc}") from exc

    receipt.warnings.extend(_total_warnings(receipt))
    return receipt


def _total_warnings(receipt: ParsedReceipt) -> list[str]:
    warnings = []
    items_sum = sum((item.line_total for item in receipt.items), Decimal("0.00"))
    if receipt.subtotal is not None and abs(items_sum - receipt.subtotal) > TOLERANCE:
        warnings.append(f"Items add up to {items_sum} but the subtotal is {receipt.subtotal}.")

    if receipt.total is None:
        warnings.append("Could not read the total.")
    else:
        base = receipt.subtotal if receipt.subtotal is not None else items_sum
        expected = base - receipt.discount + (receipt.tax or Decimal("0.00")) + receipt.tip
        if abs(expected - receipt.total) > TOLERANCE:
            warnings.append(
                f"Subtotal - discount + tax + tip is {expected} but the total is {receipt.total}."
            )
    return warnings
