from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services.expense_splits import ExpenseBalancesRepo
from app.services.spending import allocate, spending_summary

client = TestClient(app)
ALICE, BOB, CAROL = [str(uuid4()) for _ in range(3)]


def expense(payer, amount, members, currency="CAD"):
    return {
        "id": str(uuid4()),
        "created_by": payer,
        "amount": amount,
        "member_ids": members,
        "currency": currency,
    }


def item(category, amount):
    return {"name": category, "category": category, "amount": amount}


def as_json(summary):
    return summary.model_dump(mode="json")


def test_only_your_share_counts_whether_you_paid_or_owe():
    paid = expense(ALICE, "90.00", [ALICE, BOB, CAROL])
    owed = expense(BOB, "20.00", [ALICE, BOB])
    items = {paid["id"]: [item("groceries", "90.00")], owed["id"]: [item("food_drinks", "20.00")]}
    assert as_json(spending_summary([paid, owed], items, ALICE)) == {
        "currency": "CAD",
        "total": "40.00",
        "by_category": [
            {"category": "groceries", "amount": "30.00"},
            {"category": "food_drinks", "amount": "10.00"},
        ],
        "unconverted_currencies": [],
    }
    assert spending_summary([paid, owed], items, BOB).total == Decimal("40.00")


def test_share_is_spread_by_item_amounts_including_tax_tip_and_discount():
    # Items 60 + 20 = 80; the 100.00 total includes tax and tip, spread in proportion.
    row = expense(ALICE, "100.00", [ALICE, BOB])
    items = {row["id"]: [item("groceries", "60.00"), item("work", "20.00")]}
    assert as_json(spending_summary([row], items, ALICE))["by_category"] == [
        {"category": "groceries", "amount": "37.50"},
        {"category": "work", "amount": "12.50"},
    ]


def test_coupons_reduce_their_category_and_items_without_categories_count_as_other():
    row = expense(ALICE, "35.00", [ALICE])
    items = {
        row["id"]: [
            item("shopping", "25.00"),
            item("shopping", "-5.00"),
            item("health_fitness", "10.00"),
            {"name": "Mystery", "amount": "5.00"},
        ]
    }
    assert as_json(spending_summary([row], items, ALICE))["by_category"] == [
        {"category": "shopping", "amount": "20.00"},
        {"category": "health_fitness", "amount": "10.00"},
        {"category": "other", "amount": "5.00"},
    ]


def test_expenses_without_items_count_as_other():
    row = expense(ALICE, "10.00", [ALICE])
    assert as_json(spending_summary([row], {}, ALICE))["by_category"] == [
        {"category": "other", "amount": "10.00"}
    ]


def test_payer_who_excluded_themselves_spends_nothing():
    row = expense(ALICE, "90.00", [BOB, CAROL])
    summary = spending_summary([row], {row["id"]: [item("housing", "90.00")]}, ALICE)
    assert summary.total == Decimal("0.00") and summary.by_category == []


@pytest.mark.parametrize("cents", [0, 1, 2, 100, 3333, 999_999])
def test_allocation_is_exact_in_cents(cents):
    parts = allocate(cents, {"a": 1, "b": 1, "c": 1})
    assert sum(parts.values()) == cents
    assert max(parts.values()) - min(parts.values()) <= 1


def test_total_matches_the_sum_of_categories():
    rows = [expense(ALICE, "10.00", [ALICE, BOB, CAROL]) for _ in range(3)]
    items = {row["id"]: [item("groceries", "1.00"), item("work", "1.00")] for row in rows}
    summary = spending_summary(rows, items, ALICE)
    assert summary.total == sum((c.amount for c in summary.by_category), Decimal("0.00"))


class FakeRepo(ExpenseBalancesRepo):
    def __init__(self, rows, items):
        self.rows, self.items = rows, items

    def list_inputs(self, user_id, event_id=None):
        return [
            row for row in self.rows if row["created_by"] == user_id or user_id in row["member_ids"]
        ]

    def list_items(self, expense_ids):
        return {expense_id: self.items.get(expense_id, []) for expense_id in expense_ids}


@pytest.fixture
def signed_in():
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=ALICE)
    yield
    app.dependency_overrides.clear()


def test_endpoint_converts_every_currency_into_one_cad_chart(signed_in):
    cad = expense(BOB, "30.00", [ALICE, BOB, CAROL])
    usd = expense(ALICE, "100.00", [ALICE, BOB], "USD")
    unknown = expense(ALICE, "50.00", [ALICE], "XYZ")
    app.dependency_overrides[ExpenseBalancesRepo] = lambda: FakeRepo(
        [cad, usd, unknown],
        {cad["id"]: [item("entertainment", "30.00")], usd["id"]: [item("groceries", "100.00")]},
    )
    assert client.get("/api/v1/dashboard/spending").json() == {
        "currency": "CAD",
        # 30.00 CAD / 3 + 100.00 USD (142.46 CAD) / 2
        "total": "81.23",
        "by_category": [
            {"category": "groceries", "amount": "71.23"},
            {"category": "entertainment", "amount": "10.00"},
        ],
        "unconverted_currencies": ["XYZ"],
    }


def test_endpoint_requires_authentication(signed_in):
    app.dependency_overrides.pop(get_current_user)
    assert client.get("/api/v1/dashboard/spending").status_code == 401
