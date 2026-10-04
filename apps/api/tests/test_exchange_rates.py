from decimal import Decimal

from app.services.exchange_rates import CAD_PER_UNIT, convert_to_cad, to_cad


def test_common_currencies_convert_at_their_fixed_rate():
    assert to_cad(Decimal("10.00"), "CAD") == Decimal("10.00")
    assert to_cad(Decimal("10.00"), "USD") == Decimal("14.25")
    assert to_cad(Decimal("1000"), "JPY") == Decimal("9.03")
    assert to_cad(Decimal("10.00"), "XYZ") is None
    assert {"USD", "EUR", "GBP", "CHF", "JPY", "CNY", "MXN", "AUD"} <= CAD_PER_UNIT.keys()


def test_conversion_drops_and_reports_unsupported_currencies():
    rows = [
        {"id": "cad", "amount": "10.00", "currency": "CAD"},
        {"id": "eur", "amount": "10.00", "currency": "EUR"},
        {"id": "xyz", "amount": "10.00", "currency": "XYZ"},
    ]
    converted, unconverted = convert_to_cad(rows)
    assert [(row["id"], row["amount"], row["currency"]) for row in converted] == [
        ("cad", Decimal("10.00"), "CAD"),
        ("eur", Decimal("16.04"), "CAD"),
    ]
    assert unconverted == ["XYZ"]
