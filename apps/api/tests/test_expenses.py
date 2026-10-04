from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1.routes import events as events_route
from app.api.v1.routes import expenses as route
from app.core.auth import CurrentUser, get_current_user
from app.main import app

USER = str(uuid4())
OTHER = str(uuid4())
EVENT = str(uuid4())
JPEG = b"\xff\xd8\xff\xe0" + b"\0" * 16
client = TestClient(app)


class Query:
    def __init__(self, db, table):
        self.db, self.table_name = db, table
        self.filters = []
        self.action, self.values = "select", None
        self.page = None

    def select(self, *args):
        return self

    def eq(self, name, value):
        self.filters.append(lambda row: row.get(name) == value)
        return self

    def in_(self, name, values):
        self.filters.append(lambda row: row.get(name) in values)
        return self

    def or_(self, expression):
        owner, ids = expression.split(",id.in.(")
        user_id = owner.removeprefix("created_by.eq.")
        expense_ids = ids.removesuffix(")").split(",")
        self.filters.append(
            lambda row: row.get("created_by") == user_id or row["id"] in expense_ids
        )
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, start, end):
        self.page = (start, end)
        return self

    def insert(self, values):
        self.action, self.values = "insert", deepcopy(values)
        return self

    def update(self, values):
        self.action, self.values = "update", deepcopy(values)
        return self

    def execute(self):
        table = self.db.rows[self.table_name]
        if self.action == "insert":
            row = {
                "id": str(uuid4()),
                "created_at": "2026-10-04T04:00:00Z",
                "receipt_image_path": None,
                **self.values,
            }
            table.append(row)
            return SimpleNamespace(data=[deepcopy(row)])
        rows = [row for row in table if all(condition(row) for condition in self.filters)]
        if self.action == "update":
            if self.db.fail_update:
                raise RuntimeError("Database write failed")
            for row in rows:
                row.update(self.values)
        if self.page:
            rows = rows[self.page[0] : self.page[1] + 1]
        return SimpleNamespace(data=deepcopy(rows))


class DB:
    def __init__(self):
        self.rows = {"expenses": [], "events": [], "event_members": [], "expense_members": []}
        self.fail_update = False

    def table(self, name):
        return Query(self, name)


@pytest.fixture
def db(monkeypatch):
    db = DB()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER)
    monkeypatch.setattr(route, "get_supabase", lambda: db)
    monkeypatch.setattr(events_route, "get_supabase", lambda: db)
    yield db
    app.dependency_overrides.clear()


@pytest.fixture
def body():
    return {
        "title": "Lunch",
        "description": "Manual expense",
        "date": "2026-10-03",
        "time": "12:30",
        "currency": "CAD",
        "amount": "12.50",
        "event_id": None,
        "items": [{"name": "Sandwich", "category": "food_drinks", "amount": "12.50"}],
    }


def create(body):
    return client.post("/api/v1/expenses", json=body)


def test_manual_expense_without_event_saved_and_listed(db, body):
    response = create(body)
    assert response.status_code == 201
    expense = response.json()
    assert expense["event_id"] is None
    assert expense["created_by"] == USER
    assert expense["items"][0]["id"]
    assert expense["amount"] == "12.50"
    assert expense["time"] == "12:30:00"
    assert client.get("/api/v1/expenses").json() == [expense]
    assert client.get(f"/api/v1/expenses/{expense['id']}").json() == expense


@pytest.mark.parametrize(
    "category",
    [
        "groceries",
        "food_drinks",
        "transportation",
        "shopping",
        "entertainment",
        "housing",
        "bills_utilities",
        "subscriptions",
        "health_fitness",
        "education",
        "personal_care",
        "work",
        "other",
    ],
)
def test_current_expense_categories_are_accepted(db, body, category):
    body["items"][0]["category"] = category
    response = create(body)
    assert response.status_code == 201
    assert response.json()["items"][0]["category"] == category


@pytest.mark.parametrize(
    "old,new",
    [
        ("coffee", "food_drinks"),
        ("food", "food_drinks"),
        ("drinks", "food_drinks"),
        ("alcohol", "food_drinks"),
        ("transport", "transportation"),
    ],
)
def test_legacy_expense_categories_are_normalized(db, body, old, new):
    body["items"][0]["category"] = old
    response = create(body)
    assert response.status_code == 201
    assert response.json()["items"][0]["category"] == new


def test_scanned_fields_and_original_json_saved_with_printed_total(db, body):
    parsed = {
        "merchant": "Berghotel Grosse Scheidegg",
        "date": "2007-07-30",
        "currency": "CHF",
        "items": [
            {
                "description": "2xLatte",
                "normalized_name": "Latte Macchiato",
                "category": "food_drinks",
                "quantity": 2,
                "unit_price": "4.50",
                "line_total": "9.00",
            }
        ],
        "total": "54.50",
        "tax": "3.85",
        "discount": "0.00",
        "tip": "0.00",
        "warnings": ["Total mismatch"],
    }
    response = create(
        {
            **body,
            "title": parsed["merchant"],
            "date": parsed["date"],
            "time": None,
            "currency": parsed["currency"],
            "amount": parsed["total"],
            "parsed_receipt": parsed,
            "items": [
                {
                    "name": "Latte Macchiato",
                    "category": "food_drinks",
                    "amount": "9.00",
                    "quantity": 2,
                    "unit_price": "4.50",
                }
            ],
        }
    )
    assert response.status_code == 201
    expense = response.json()
    assert expense["amount"] == "54.50"  # Not recalculated from items or tax.
    assert expense["time"] is None
    assert expense["parsed_receipt"]["warnings"] == ["Total mismatch"]
    assert expense["items"][0]["quantity"] == "2"


@pytest.mark.parametrize(
    "owner,is_member,expected", [(USER, False, 201), (OTHER, True, 201), (OTHER, False, 403)]
)
def test_event_link_requires_creator_or_membership(db, body, owner, is_member, expected):
    db.rows["events"].append({"id": EVENT, "created_by": owner})
    if is_member:
        db.rows["event_members"].append({"event_id": EVENT, "user_id": USER})
    assert create({**body, "event_id": EVENT}).status_code == expected
    assert len(db.rows["expenses"]) == (1 if expected == 201 else 0)


def test_missing_event_rejected(db, body):
    assert create({**body, "event_id": EVENT}).status_code == 404
    assert db.rows["expenses"] == []


@pytest.mark.parametrize(
    "patch",
    [
        {"title": " "},
        {"amount": "-1.00"},
        {"amount": "1.001"},
        {"amount": "NaN"},
        {"date": "2026-02-30"},
        {"currency": "CHF123"},
        {"items": [{"name": "", "amount": "2"}]},
        {"created_by": OTHER},
    ],
)
def test_invalid_fields_and_ownership_injection_rejected(db, body, patch):
    assert create({**body, **patch}).status_code == 422
    assert not db.rows["expenses"]


def test_other_users_expenses_are_hidden_and_cannot_change(db, body):
    expense = create(body).json()
    db.rows["expenses"][0]["created_by"] = OTHER
    path = f"/api/v1/expenses/{expense['id']}"
    assert client.get("/api/v1/expenses").json() == []
    assert client.get(path).status_code == 404
    assert client.put(path, json=body).status_code == 404
    assert client.post(path + "/receipt", files={"file": ("r.jpg", JPEG)}).status_code == 404
    assert client.get(path + "/receipt").status_code == 404


def test_update_expense_and_items_together(db, body):
    expense = create(body).json()
    updated = client.put(
        f"/api/v1/expenses/{expense['id']}",
        json={
            **body,
            "amount": "15.00",
            "items": [{"name": "Meal", "amount": "15.00"}],
        },
    )
    assert updated.status_code == 200
    assert updated.json()["items"][0]["name"] == "Meal"
    assert updated.json()["amount"] == "15.00"
    assert len(db.rows["expenses"]) == 1


def test_attach_receipt_later_preserves_manual_fields(db, body, monkeypatch):
    expense = create(body).json()
    uploaded = []
    monkeypatch.setattr(route, "upload_file", lambda *args: uploaded.append(args))
    response = client.post(
        f"/api/v1/expenses/{expense['id']}/receipt", files={"file": ("r.jpg", JPEG, "image/jpeg")}
    )
    assert response.status_code == 200
    saved = response.json()
    for field in ("title", "description", "date", "amount", "items"):
        assert saved[field] == expense[field]
    assert saved["receipt_image_path"].startswith(f"{USER}/{expense['id']}/")
    assert uploaded[0][2:] == (JPEG, "image/jpeg")
    monkeypatch.setattr(route, "signed_url", lambda *args: "https://example.com/signed-receipt")
    assert client.get(f"/api/v1/expenses/{expense['id']}/receipt").json() == {
        "url": "https://example.com/signed-receipt"
    }


@pytest.mark.parametrize(
    "data,status", [(b"", 400), (b"not an image", 415), (b"x" * (10 * 1024 * 1024 + 1), 413)]
)
def test_bad_receipt_does_not_mutate_expense(db, body, data, status):
    expense = create(body).json()
    res = client.post(f"/api/v1/expenses/{expense['id']}/receipt", files={"file": ("r.jpg", data)})
    assert res.status_code == status
    assert db.rows["expenses"][0]["receipt_image_path"] is None


def test_receipt_database_failure_cleans_new_upload(db, body, monkeypatch):
    expense = create(body).json()
    uploaded, removed = [], []
    monkeypatch.setattr(route, "upload_file", lambda *args: uploaded.append(args[1]))
    monkeypatch.setattr(route, "remove_image", removed.append)
    db.fail_update = True
    with pytest.raises(RuntimeError, match="Database write failed"):
        client.post(f"/api/v1/expenses/{expense['id']}/receipt", files={"file": ("r.jpg", JPEG)})
    assert removed == uploaded
    assert db.rows["expenses"][0]["receipt_image_path"] is None


def test_expenses_require_authentication(db, body):
    app.dependency_overrides.clear()
    assert client.get("/api/v1/expenses").status_code == 401
    assert create(body).status_code == 401


def test_event_choices_only_include_owned_or_joined_events(db):
    def event(owner):
        return {
            "id": str(uuid4()),
            "title": "Trip",
            "created_by": owner,
            "created_at": "2026-10-04T04:00:00Z",
        }

    owned, joined, hidden = event(USER), event(OTHER), event(OTHER)
    db.rows["events"] = [owned, joined, hidden]
    db.rows["event_members"] = [{"user_id": USER, "event_id": joined["id"]}]
    response = client.get("/api/v1/events")
    assert response.status_code == 200
    assert {row["id"] for row in response.json()} == {owned["id"], joined["id"]}


def test_discount_items_can_be_negative_while_total_stays_nonnegative(db, body):
    response = create(
        {
            **body,
            "amount": "10.50",
            "items": [
                {"name": "Meal", "category": "food_drinks", "amount": "12.50"},
                {"name": "Coupon", "category": "other", "amount": "-2.00", "unit_price": "-2.00"},
            ],
        }
    )
    assert response.status_code == 201
    expense = response.json()
    assert expense["items"][1]["amount"] == "-2.00"
    assert expense["amount"] == "10.50"


def test_participants_can_read_expenses_and_receipts_but_cannot_edit(db, body, monkeypatch):
    expense = create(body).json()
    expense_id = expense["id"]
    db.rows["expense_members"].append({"expense_id": expense_id, "user_id": OTHER})
    db.rows["expenses"][0]["receipt_image_path"] = "owner/receipt.jpg"
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=OTHER)
    path = f"/api/v1/expenses/{expense_id}"
    assert client.get(path).status_code == 200
    assert [e["id"] for e in client.get("/api/v1/expenses").json()] == [expense_id]
    monkeypatch.setattr(route, "signed_url", lambda *args: "https://example.com/receipt")
    assert client.get(path + "/receipt").status_code == 200
    assert client.put(path, json=body).status_code == 404
    assert client.post(path + "/receipt", files={"file": ("r.jpg", JPEG)}).status_code == 404
    db.rows["expense_members"].clear()
    assert client.get(path).status_code == 404
    assert client.get(path + "/receipt").status_code == 404
    assert client.get("/api/v1/expenses").json() == []


def test_joined_expenses_keep_event_filter_and_do_not_duplicate_owned_expenses(db, body):
    expense = create(body).json()
    db.rows["expense_members"].append({"expense_id": expense["id"], "user_id": USER})
    assert len(client.get("/api/v1/expenses").json()) == 1
    assert client.get(f"/api/v1/expenses?event_id={EVENT}").json() == []
