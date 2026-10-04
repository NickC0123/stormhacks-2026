import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services.friends import DuplicateFriendshipError, FriendsRepo, UsernameTakenError

client = TestClient(app)

ALICE = str(uuid.uuid4())
BOB = str(uuid.uuid4())
CAROL = str(uuid.uuid4())


class FakeRepo(FriendsRepo):
    def __init__(self) -> None:
        self.profiles: dict[str, dict] = {}
        self.friendships: dict[str, dict] = {}

    def add_profile(self, user_id: str, username: str | None) -> None:
        self.profiles[user_id] = {"id": user_id, "username": username, "display_name": "x"}

    def get_profile(self, user_id):
        return self.profiles.get(user_id)

    def get_profile_by_username(self, username):
        return next((p for p in self.profiles.values() if p["username"] == username), None)

    def get_profiles(self, user_ids):
        return [self.profiles[i] for i in user_ids if i in self.profiles]

    def save_username(self, user_id, username):
        owner = self.get_profile_by_username(username)
        if owner and owner["id"] != user_id:
            raise UsernameTakenError
        profile = self.profiles.setdefault(
            user_id, {"id": user_id, "username": None, "display_name": username}
        )
        profile["username"] = username
        return profile

    def get_friendship(self, friendship_id):
        return self.friendships.get(friendship_id)

    def find_friendship(self, user_a, user_b):
        pair = {user_a, user_b}
        return next(
            (
                f
                for f in self.friendships.values()
                if {f["requester_id"], f["addressee_id"]} == pair
            ),
            None,
        )

    def list_friendships(self, user_id):
        return [
            f
            for f in self.friendships.values()
            if user_id in (f["requester_id"], f["addressee_id"])
        ]

    def create_friendship(self, requester_id, addressee_id):
        if self.find_friendship(requester_id, addressee_id):
            raise DuplicateFriendshipError
        row = {
            "id": str(uuid.uuid4()),
            "requester_id": requester_id,
            "addressee_id": addressee_id,
            "status": "pending",
            "created_at": datetime.now(UTC).isoformat(),
            "accepted_at": None,
        }
        self.friendships[row["id"]] = row
        return row

    def accept_friendship(self, friendship_id):
        row = self.friendships[friendship_id]
        row.update(status="accepted", accepted_at=datetime.now(UTC).isoformat())
        return row

    def delete_friendship(self, friendship_id):
        self.friendships.pop(friendship_id, None)


@pytest.fixture
def repo():
    fake = FakeRepo()
    fake.add_profile(ALICE, "alice")
    fake.add_profile(BOB, "bob")
    app.dependency_overrides[FriendsRepo] = lambda: fake
    sign_in(ALICE)
    yield fake
    app.dependency_overrides.clear()


def sign_in(user_id: str) -> None:
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=user_id)


def send(username: str):
    return client.post("/api/v1/friends/requests", json={"username": username})


def overview():
    return client.get("/api/v1/friends").json()


def test_request_then_accept(repo: FakeRepo) -> None:
    res = send("@Bob")
    assert res.status_code == 201
    assert res.json()["status"] == "pending"
    assert overview()["outgoing"][0]["user"]["username"] == "bob"

    sign_in(BOB)
    incoming = overview()["incoming"]
    assert [f["user"]["username"] for f in incoming] == ["alice"]

    accepted = client.post(f"/api/v1/friends/requests/{incoming[0]['id']}/accept")
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "accepted"
    bob_view = overview()
    assert bob_view["incoming"] == []
    assert [f["user"]["username"] for f in bob_view["friends"]] == ["alice"]

    sign_in(ALICE)
    assert overview()["friends"][0]["user"]["username"] == "bob"


def test_sender_cannot_accept_own_request(repo: FakeRepo) -> None:
    request_id = send("bob").json()["id"]
    assert client.post(f"/api/v1/friends/requests/{request_id}/accept").status_code == 403


def test_duplicate_and_already_friends(repo: FakeRepo) -> None:
    send("bob")
    assert send("bob").status_code == 409

    sign_in(BOB)
    # Bob adding Alice back accepts her pending request.
    res = send("alice")
    assert res.status_code == 201
    assert res.json()["status"] == "accepted"
    assert send("alice").status_code == 409


def test_unknown_and_self(repo: FakeRepo) -> None:
    assert send("nobody").status_code == 404
    assert send("alice").status_code == 400
    assert send("no").status_code == 422


def test_requires_username_before_adding(repo: FakeRepo) -> None:
    repo.add_profile(CAROL, None)
    sign_in(CAROL)
    assert send("bob").status_code == 409


def test_decline_and_remove(repo: FakeRepo) -> None:
    request_id = send("bob").json()["id"]

    sign_in(CAROL)
    assert client.delete(f"/api/v1/friends/{request_id}").status_code == 404

    sign_in(BOB)
    assert client.delete(f"/api/v1/friends/{request_id}").status_code == 204
    assert overview()["incoming"] == []

    sign_in(ALICE)
    assert overview()["outgoing"] == []


def test_username_setup(repo: FakeRepo) -> None:
    sign_in(CAROL)
    me = client.get("/api/v1/me").json()
    assert me["username"] is None

    res = client.put("/api/v1/me/username", json={"username": "  Carol_99 "})
    assert res.status_code == 200
    assert res.json()["username"] == "carol_99"
    assert client.get("/api/v1/me").json()["username"] == "carol_99"


def test_username_rules(repo: FakeRepo) -> None:
    sign_in(CAROL)
    assert client.put("/api/v1/me/username", json={"username": "bob"}).status_code == 409
    assert client.put("/api/v1/me/username", json={"username": "a b"}).status_code == 422
    assert client.put("/api/v1/me/username", json={"username": "x" * 21}).status_code == 422
