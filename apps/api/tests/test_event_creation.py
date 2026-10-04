from copy import deepcopy
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1.routes import events as route
from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services.friends import FriendsRepo
from tests.test_friends import FakeRepo

HOST, FRIEND, GUEST = [str(uuid4()) for _ in range(3)]
client = TestClient(app, raise_server_exceptions=False)


class Query:
    def __init__(self, db, table):
        self.db, self.name = db, table
        self.action = "select"
        self.values = None
        self.filters = []

    def upsert(self, values, **kwargs):
        self.action, self.values = "upsert", values
        return self

    def insert(self, values):
        self.action, self.values = "insert", values
        return self

    def delete(self):
        self.action = "delete"
        return self

    def eq(self, name, value):
        self.filters.append((name, value))
        return self

    def execute(self):
        if self.action in ("upsert", "insert"):
            if self.name == self.db.fail_table:
                raise RuntimeError("Write failed")
            values = self.values if isinstance(self.values, list) else [self.values]
            rows = [
                {"id": str(uuid4()), "created_at": datetime.now(UTC).isoformat(), **row}
                for row in deepcopy(values)
            ]
            self.db.rows[self.name].extend(rows)
            return SimpleNamespace(data=rows)
        rows = [
            row
            for row in self.db.rows[self.name]
            if all(row.get(name) == value for name, value in self.filters)
        ]
        if self.action == "delete":
            self.db.rows[self.name] = [row for row in self.db.rows[self.name] if row not in rows]
            if self.name == "events":
                ids = {row["id"] for row in rows}
                for table in ("event_members", "event_invites"):
                    self.db.rows[table] = [
                        row for row in self.db.rows[table] if row["event_id"] not in ids
                    ]
        return SimpleNamespace(data=rows)


class DB:
    def __init__(self):
        self.rows = {name: [] for name in ("events", "profiles", "event_members", "event_invites")}
        self.fail_table = None

    def table(self, name):
        return Query(self, name)


@pytest.fixture
def db(monkeypatch):
    db = DB()
    friends = FakeRepo()
    for user_id, username in [(HOST, "host"), (FRIEND, "friend"), (GUEST, "guest")]:
        friends.add_profile(user_id, username)
    friends.accept_friendship(friends.create_friendship(HOST, FRIEND)["id"])
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=HOST)
    app.dependency_overrides[FriendsRepo] = lambda: friends
    monkeypatch.setattr(route, "get_supabase", lambda: db)
    yield db
    app.dependency_overrides.clear()


def test_create_with_location_schedule_friends_and_invitations(db):
    response = client.post(
        "/api/v1/events",
        json={
            "title": "  Dinner  ",
            "description": "  Bring snacks  ",
            "location": "  Main hall  ",
            "starts_at": "2026-10-12T18:30:00-07:00",
            "ends_at": "2026-10-12T21:00:00-07:00",
            "member_ids": [HOST, FRIEND, FRIEND],
            "invite_usernames": ["@guest", "FRIEND", "guest"],
        },
    )
    assert response.status_code == 201
    event = response.json()
    assert event["title"] == "Dinner"
    assert event["description"] == "Bring snacks"
    assert event["location"] == "Main hall"
    assert event["starts_at"].endswith("-07:00")
    assert event["ends_at"].endswith("-07:00")
    assert set(event["member_ids"]) == {HOST, FRIEND}
    assert {row["user_id"] for row in db.rows["event_members"]} == {HOST, FRIEND}
    assert len(db.rows["event_invites"]) == 1
    invite = db.rows["event_invites"][0]
    assert (invite["event_id"], invite["inviter_id"], invite["invitee_id"]) == (
        event["id"],
        HOST,
        GUEST,
    )


def test_simple_event_still_works_without_optional_details(db):
    response = client.post("/api/v1/events", json={"title": "Quick meetup"})
    assert response.status_code == 201
    assert response.json()["location"] is None
    assert response.json()["starts_at"] is None
    assert response.json()["ends_at"] is None
    assert response.json()["member_ids"] == [HOST]


@pytest.mark.parametrize(
    "fields",
    [
        {"starts_at": "2026-10-12T19:00:00Z", "ends_at": "2026-10-12T18:00:00Z"},
        {"starts_at": "2026-10-12T19:00:00Z", "ends_at": "2026-10-12T19:00:00Z"},
        {"ends_at": "2026-10-12T19:00:00Z"},
        {"starts_at": "2026-10-12T19:00:00"},
        {"location": "x" * 501},
    ],
)
def test_invalid_schedule_and_location_are_rejected_before_write(db, fields):
    assert client.post("/api/v1/events", json={"title": "Dinner", **fields}).status_code == 422
    assert db.rows["events"] == []


def test_unknown_invitee_does_not_leave_a_partial_event(db):
    response = client.post(
        "/api/v1/events", json={"title": "Dinner", "invite_usernames": ["nobody"]}
    )
    assert response.status_code == 404
    assert db.rows["events"] == []


@pytest.mark.parametrize("table", ["event_members", "event_invites"])
def test_people_write_failure_rolls_back_event_and_people(db, table):
    db.fail_table = table
    response = client.post(
        "/api/v1/events",
        json={
            "title": "Dinner",
            "member_ids": [FRIEND],
            "invite_usernames": ["guest"],
        },
    )
    assert response.status_code == 500
    assert db.rows["events"] == []
    assert db.rows["event_members"] == []
    assert db.rows["event_invites"] == []
