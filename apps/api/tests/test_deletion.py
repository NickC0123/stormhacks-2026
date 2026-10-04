from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1.routes import events as events_route
from app.api.v1.routes import expenses as expenses_route
from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services import event_invites

HOST, GUEST, OUTSIDER = (str(uuid4()) for _ in range(3))
client = TestClient(app)


class Query:
    def __init__(self, db, table):
        self.db, self.table_name = db, table
        self.filters = []
        self.deleting = False

    def select(self, *args):
        return self

    def eq(self, name, value):
        self.filters.append(lambda row: row.get(name) == value)
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args):
        return self

    def delete(self):
        self.deleting = True
        return self

    def execute(self):
        table = self.db.rows[self.table_name]
        rows = [row for row in table if all(condition(row) for condition in self.filters)]
        if self.deleting:
            table[:] = [row for row in table if row not in rows]
        return SimpleNamespace(data=deepcopy(rows))


class DB:
    def __init__(self):
        self.rows = {
            name: []
            for name in (
                "events",
                "event_members",
                "expenses",
                "expense_members",
                "memories",
                "settlements",
            )
        }

    def table(self, name):
        return Query(self, name)


@pytest.fixture
def db(monkeypatch):
    db = DB()
    removed = []
    for module in (events_route, expenses_route, event_invites):
        monkeypatch.setattr(module, "get_supabase", lambda: db)
    monkeypatch.setattr(
        events_route, "remove_files", lambda bucket, paths: removed.append((bucket, paths))
    )
    monkeypatch.setattr(
        expenses_route, "remove_image", lambda path: removed.append(("receipts", [path]))
    )
    db.removed = removed
    event = str(uuid4())
    db.rows["events"].append({"id": event, "created_by": HOST})
    db.rows["event_members"] += [
        {"event_id": event, "user_id": HOST},
        {"event_id": event, "user_id": GUEST},
    ]
    db.event = event
    yield db
    app.dependency_overrides.clear()


def as_user(user_id):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=user_id)


def add_expense(db, owner, event=None, receipt=None):
    expense = {
        "id": str(uuid4()),
        "created_by": owner,
        "event_id": event,
        "receipt_image_path": receipt,
    }
    db.rows["expenses"].append(expense)
    return expense["id"]


def test_creator_deletes_expense_and_its_receipt_image(db):
    as_user(HOST)
    expense = add_expense(db, HOST, receipt="host/receipt.jpg")
    keep = add_expense(db, HOST)
    assert client.delete(f"/api/v1/expenses/{expense}").status_code == 204
    assert [row["id"] for row in db.rows["expenses"]] == [keep]
    assert db.removed == [("receipts", ["host/receipt.jpg"])]
    assert client.delete(f"/api/v1/expenses/{expense}").status_code == 404


def test_people_on_an_expense_cannot_delete_it(db):
    expense = add_expense(db, HOST)
    db.rows["expense_members"].append({"expense_id": expense, "user_id": GUEST})
    as_user(GUEST)
    assert client.delete(f"/api/v1/expenses/{expense}").status_code == 404
    assert len(db.rows["expenses"]) == 1


def test_host_deletes_event_with_its_expenses_payments_and_files(db):
    other_event = str(uuid4())
    in_event = add_expense(db, GUEST, db.event, receipt="guest/receipt.jpg")
    elsewhere = add_expense(db, HOST, other_event)
    personal = add_expense(db, HOST)
    db.rows["memories"].append({"event_id": db.event, "photo_path": f"{db.event}/photo.jpg"})
    db.rows["settlements"] += [
        {"id": "event", "event_id": db.event},
        {"id": "overall", "event_id": None},
    ]
    as_user(HOST)
    assert client.delete(f"/api/v1/events/{db.event}").status_code == 204
    assert db.rows["events"] == []
    assert in_event not in [row["id"] for row in db.rows["expenses"]]
    assert {row["id"] for row in db.rows["expenses"]} == {elsewhere, personal}
    assert [row["id"] for row in db.rows["settlements"]] == ["overall"]
    assert ("receipts", ["guest/receipt.jpg"]) in db.removed
    assert ("memories", [f"{db.event}/photo.jpg"]) in db.removed


def test_only_the_host_can_delete_an_event(db):
    add_expense(db, GUEST, db.event)
    as_user(GUEST)
    assert client.delete(f"/api/v1/events/{db.event}").status_code == 403
    as_user(OUTSIDER)
    assert client.delete(f"/api/v1/events/{db.event}").status_code == 404
    assert len(db.rows["events"]) == 1
    assert len(db.rows["expenses"]) == 1


def test_event_still_deleted_when_file_cleanup_fails(db, monkeypatch):
    def fail(bucket, paths):
        raise RuntimeError("storage down")

    monkeypatch.setattr(events_route, "remove_files", fail)
    db.rows["memories"].append({"event_id": db.event, "photo_path": "photo.jpg"})
    as_user(HOST)
    assert client.delete(f"/api/v1/events/{db.event}").status_code == 204
    assert db.rows["events"] == []
