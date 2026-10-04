import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services.event_invites import DuplicateInviteError, EventInvitesRepo
from app.services.friends import FriendsRepo
from tests.test_friends import FakeRepo as FakeFriendsRepo

client = TestClient(app)

ALICE = str(uuid.uuid4())
BOB = str(uuid.uuid4())
CAROL = str(uuid.uuid4())
DAVE = str(uuid.uuid4())


class FakeInvitesRepo(EventInvitesRepo):
    def __init__(self) -> None:
        self.events: dict[str, dict] = {}
        self.members: list[tuple[str, str]] = []
        self.invites: dict[str, dict] = {}

    def add_event(self, owner: str) -> str:
        event_id = str(uuid.uuid4())
        self.events[event_id] = {
            "id": event_id,
            "title": "Trip",
            "description": None,
            "starts_at": None,
            "created_by": owner,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.members.append((event_id, owner))
        return event_id

    def get_event(self, event_id):
        return self.events.get(event_id)

    def get_events(self, event_ids):
        return [self.events[i] for i in event_ids if i in self.events]

    def list_member_ids(self, event_id):
        return [u for e, u in self.members if e == event_id]

    def is_member(self, event_id, user_id):
        return (event_id, user_id) in self.members

    def add_member(self, event_id, user_id):
        if not self.is_member(event_id, user_id):
            self.members.append((event_id, user_id))

    def get_invite(self, invite_id):
        return self.invites.get(invite_id)

    def list_event_invites(self, event_id):
        return [i for i in self.invites.values() if i["event_id"] == event_id]

    def list_incoming_invites(self, user_id):
        return [i for i in self.invites.values() if i["invitee_id"] == user_id]

    def create_invite(self, event_id, inviter_id, invitee_id):
        if any(
            i["event_id"] == event_id and i["invitee_id"] == invitee_id
            for i in self.invites.values()
        ):
            raise DuplicateInviteError
        row = {
            "id": str(uuid.uuid4()),
            "event_id": event_id,
            "inviter_id": inviter_id,
            "invitee_id": invitee_id,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.invites[row["id"]] = row
        return row

    def delete_invite(self, invite_id):
        self.invites.pop(invite_id, None)


@pytest.fixture
def friends():
    fake = FakeFriendsRepo()
    for user_id, username in [(ALICE, "alice"), (BOB, "bob"), (CAROL, "carol"), (DAVE, "dave")]:
        fake.add_profile(user_id, username)
    for a, b in [(ALICE, BOB), (ALICE, CAROL), (BOB, DAVE)]:
        fake.accept_friendship(fake.create_friendship(a, b)["id"])
    app.dependency_overrides[FriendsRepo] = lambda: fake
    yield fake
    app.dependency_overrides.clear()


@pytest.fixture
def repo(friends):
    fake = FakeInvitesRepo()
    app.dependency_overrides[EventInvitesRepo] = lambda: fake
    sign_in(ALICE)
    return fake


def sign_in(user_id: str) -> None:
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=user_id)


def invite(event_id: str, user_id: str):
    return client.post(f"/api/v1/events/{event_id}/invites", json={"user_id": user_id})


def test_invite_then_accept(repo: FakeInvitesRepo) -> None:
    event_id = repo.add_event(ALICE)
    res = invite(event_id, BOB)
    assert res.status_code == 201
    assert res.json()["user"]["username"] == "bob"
    assert res.json()["invited_by"]["username"] == "alice"

    detail = client.get(f"/api/v1/events/{event_id}").json()
    assert [m["username"] for m in detail["members"]] == ["alice"]
    assert [i["user"]["username"] for i in detail["invites"]] == ["bob"]

    sign_in(BOB)
    assert client.get(f"/api/v1/events/{event_id}").status_code == 404
    incoming = client.get("/api/v1/invites").json()
    assert [(i["event"]["title"], i["invited_by"]["username"]) for i in incoming] == [
        ("Trip", "alice")
    ]

    accepted = client.post(f"/api/v1/invites/{incoming[0]['id']}/accept")
    assert accepted.status_code == 200
    assert accepted.json()["id"] == event_id
    assert client.get("/api/v1/invites").json() == []
    detail = client.get(f"/api/v1/events/{event_id}").json()
    assert [m["username"] for m in detail["members"]] == ["alice", "bob"]
    assert detail["invites"] == []


def test_any_member_can_invite_their_own_friends(repo: FakeInvitesRepo) -> None:
    event_id = repo.add_event(ALICE)
    repo.add_member(event_id, BOB)
    sign_in(BOB)
    assert invite(event_id, DAVE).status_code == 201
    # Carol is Alice's friend, not Bob's.
    assert invite(event_id, CAROL).status_code == 403


def test_invite_rules(repo: FakeInvitesRepo) -> None:
    event_id = repo.add_event(ALICE)
    assert invite(event_id, ALICE).status_code == 400
    assert invite(event_id, DAVE).status_code == 403
    assert invite(event_id, str(uuid.uuid4())).status_code == 403
    assert invite(event_id, BOB).status_code == 201
    assert invite(event_id, BOB).status_code == 409

    repo.add_member(event_id, CAROL)
    assert invite(event_id, CAROL).status_code == 409

    sign_in(DAVE)
    assert invite(event_id, BOB).status_code == 404
    assert invite(str(uuid.uuid4()), BOB).status_code == 404


def test_decline_and_cancel(repo: FakeInvitesRepo) -> None:
    event_id = repo.add_event(ALICE)
    bob_invite = invite(event_id, BOB).json()["id"]
    carol_invite = invite(event_id, CAROL).json()["id"]

    sign_in(DAVE)
    assert client.delete(f"/api/v1/invites/{bob_invite}").status_code == 404

    sign_in(BOB)
    assert client.post(f"/api/v1/invites/{carol_invite}/accept").status_code == 404
    assert client.delete(f"/api/v1/invites/{bob_invite}").status_code == 204
    assert not repo.is_member(event_id, BOB)

    sign_in(ALICE)
    assert client.delete(f"/api/v1/invites/{carol_invite}").status_code == 204
    assert client.get(f"/api/v1/events/{event_id}").json()["invites"] == []
