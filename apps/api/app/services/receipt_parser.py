"""Receipt image -> structured data using the Gemini vision API."""

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.schemas.receipt import ParsedReceipt

PROMPT = (
    "Extract the line items from this receipt. Return each purchased item with its name, "
    "quantity, unit price, and a spending category (e.g. food, drinks, groceries, transport, "
    "entertainment, other). Include subtotal, tax, tip, and total when present."
)


def parse_receipt(image_bytes: bytes, mime_type: str) -> ParsedReceipt:
    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[types.Part.from_bytes(data=image_bytes, mime_type=mime_type), PROMPT],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ParsedReceipt,
        ),
    )
    return ParsedReceipt.model_validate_json(response.text)
