"""CAD conversion at fixed, approximate rates for common currencies."""

from decimal import ROUND_HALF_UP, Decimal

HOME_CURRENCY = "CAD"
CENT = Decimal("0.01")

# CAD per unit, from the Bank of Canada daily average on 2026-10-02. Update occasionally.
CAD_PER_UNIT = {
    "AUD": Decimal("0.9910"),
    "BRL": Decimal("0.2727"),
    "CHF": Decimal("1.7197"),
    "CNY": Decimal("0.2125"),
    "EUR": Decimal("1.6037"),
    "GBP": Decimal("1.8853"),
    "HKD": Decimal("0.1816"),
    "IDR": Decimal("0.000080"),
    "INR": Decimal("0.01479"),
    "JPY": Decimal("0.009030"),
    "KRW": Decimal("0.001059"),
    "MXN": Decimal("0.07830"),
    "MYR": Decimal("0.3488"),
    "NOK": Decimal("0.1480"),
    "NZD": Decimal("0.8001"),
    "PEN": Decimal("0.4139"),
    "PLN": Decimal("0.3661"),
    "SEK": Decimal("0.1420"),
    "SGD": Decimal("1.1140"),
    "THB": Decimal("0.04246"),
    "TRY": Decimal("0.02900"),
    "TWD": Decimal("0.04475"),
    "USD": Decimal("1.4246"),
    "ZAR": Decimal("0.08551"),
}


def to_cad(amount: Decimal, currency: str) -> Decimal | None:
    """The amount in CAD, or None for a currency without a rate."""
    if currency == HOME_CURRENCY:
        return amount
    rate = CAD_PER_UNIT.get(currency)
    return None if rate is None else (amount * rate).quantize(CENT, ROUND_HALF_UP)


def convert_to_cad(rows: list[dict]) -> tuple[list[dict], list[str]]:
    """Copies of the rows with amounts in CAD, plus currencies that could not be converted."""
    converted, unsupported = [], set()
    for row in rows:
        amount = to_cad(Decimal(str(row["amount"])), row["currency"])
        if amount is None:
            unsupported.add(row["currency"])
            continue
        converted.append({**row, "amount": amount, "currency": HOME_CURRENCY})
    return converted, sorted(unsupported)
