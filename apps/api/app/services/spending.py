from collections import defaultdict
from decimal import Decimal

from app.schemas.dashboard import CategorySpend, SpendingSummary
from app.services.expense_splits import CENT, equal_shares

FALLBACK_CATEGORY = "other"


def category_weights(items: list[dict]) -> dict[str, int]:
    """Net item cents per category. Categories that net to zero or less get no share."""
    cents: dict[str, int] = defaultdict(int)
    for item in items:
        cents[item.get("category") or FALLBACK_CATEGORY] += int(Decimal(str(item["amount"])) * 100)
    weights = {category: value for category, value in cents.items() if value > 0}
    return weights or {FALLBACK_CATEGORY: 1}


def allocate(share_cents: int, weights: dict[str, int]) -> dict[str, int]:
    """Split whole cents in proportion to the weights; the parts sum exactly to the share."""
    total = sum(weights.values())
    parts = {category: share_cents * weight // total for category, weight in weights.items()}
    leftover = share_cents - sum(parts.values())
    by_remainder = sorted(weights, key=lambda c: (-(share_cents * weights[c] % total), c))
    for category in by_remainder[:leftover]:
        parts[category] += 1
    return parts


def spending_summary(
    rows: list[dict], items_by_expense: dict[str, list[dict]], user_id: str
) -> SpendingSummary:
    """Each expense counts only the caller's equal share, spread across its item categories.

    Rows must already be converted to one currency (see `convert_to_cad`).
    """
    spent: dict[str, int] = defaultdict(int)
    for row in rows:
        share = equal_shares(Decimal(str(row["amount"])), row["member_ids"]).get(user_id)
        if not share:
            continue
        weights = category_weights(items_by_expense.get(row["id"], []))
        for category, cents in allocate(int(share * 100), weights).items():
            spent[category] += cents
    return SpendingSummary(
        total=Decimal(sum(spent.values())) * CENT,
        by_category=[
            CategorySpend(category=category, amount=Decimal(cents) * CENT)
            for category, cents in sorted(spent.items(), key=lambda c: (-c[1], c[0]))
            if cents
        ],
    )
