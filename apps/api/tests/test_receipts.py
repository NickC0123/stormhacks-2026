import json

import pytest
from fastapi.testclient import TestClient

from app.api.v1.routes import receipts as receipts_route
from app.core import auth
from app.core.config import Settings
from app.main import app
from app.services.receipt_parser import (
    ReceiptParseError,
    ReceiptParserNotConfiguredError,
    to_parsed_receipt,
)

client = TestClient(app)

GEMINI_JSON = {
    "merchant": "Sample Cafe",
    "date": "2026-10-03",
    "currency": "CAD",
    "items": [
        {
            "description": "LATTE",
            "normalized_name": "Latte",
            "category": "coffee",
            "quantity": 2.0,
            "unit_price": "5.00",
            "line_total": "10.00",
        },
        {
            "description": "SANDWICH",
            "normalized_name": "Sandwich",
            "category": "food",
            "quantity": 1.0,
            "unit_price": "8",
            "line_total": "$8.00",
        },
    ],
    "subtotal": "18.00",
    "discount": None,
    "tax": "0.90",
    "tip": "3.00",
    "total": "21.90",
    "warnings": [],
}


JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 16


def scan(content_type: str | None = "image/jpeg", data: bytes = JPEG_BYTES):
    return client.post("/api/v1/receipts/scan", files={"file": ("r.jpg", data, content_type)})


def test_scan_returns_receipt_json(monkeypatch: pytest.MonkeyPatch) -> None:
    parsed = to_parsed_receipt(json.dumps(GEMINI_JSON))
    monkeypatch.setattr(receipts_route, "parse_receipt", lambda data, mime: parsed)

    res = scan()

    assert res.status_code == 200
    body = res.json()
    assert body["items"][0] == {
        "description": "LATTE",
        "normalized_name": "Latte",
        "category": "coffee",
        "quantity": 2,
        "unit_price": "5.00",
        "line_total": "10.00",
    }
    assert body["items"][1]["line_total"] == "8.00"
    assert body["discount"] == "0.00"
    assert body["total"] == "21.90"
    assert body["warnings"] == []


def test_scan_rejects_non_images() -> None:
    assert scan(data=b"%PDF-1.7 not an image").status_code == 415


def test_scan_detects_type_when_client_sends_none(monkeypatch: pytest.MonkeyPatch) -> None:
    seen = {}

    def fake_parse(data: bytes, mime: str):
        seen["mime"] = mime
        return to_parsed_receipt(json.dumps(GEMINI_JSON))

    monkeypatch.setattr(receipts_route, "parse_receipt", fake_parse)
    assert scan(content_type=None).status_code == 200
    assert seen["mime"] == "image/jpeg"


def test_scan_without_gemini_key(monkeypatch: pytest.MonkeyPatch) -> None:
    def not_configured(data: bytes, mime: str):
        raise ReceiptParserNotConfiguredError

    monkeypatch.setattr(receipts_route, "parse_receipt", not_configured)
    assert scan().status_code == 503


def test_scan_requires_token_outside_development(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth, "get_settings", lambda: Settings(environment="production"))
    assert scan().status_code == 401


def test_mismatched_totals_add_warnings() -> None:
    receipt = to_parsed_receipt(json.dumps({**GEMINI_JSON, "subtotal": "20.00", "total": "30.00"}))
    assert len(receipt.warnings) == 2


def test_unreadable_date_becomes_warning() -> None:
    receipt = to_parsed_receipt(json.dumps({**GEMINI_JSON, "date": "Oct ?? 2026"}))
    assert receipt.date is None
    assert "Could not read the date" in receipt.warnings[0]


def test_bad_gemini_output_raises() -> None:
    with pytest.raises(ReceiptParseError):
        to_parsed_receipt('{"merchant": "x"}')
