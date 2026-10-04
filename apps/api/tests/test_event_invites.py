import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services.event_invites import (
    DuplicateInviteError,
    EventInvitesRepo,
    ExpensePeopleRepo,
    PeopleRepo,
)
from app.services.friends import FriendsRepo
from tests.test_friends import FakeRepo as FakeFriendsRepo

client = TestClient(app)
ALICE, BOB, CAROL, DAVE = [str(uuid.uuid4()) for _ in range(4)]


class FakePeopleRepo(PeopleRepo):
    def __init__(self, kind):
        self.resource_key = f"{kind}_id"
        self.resources = {}
        self.members = []
        self.invites = {}

    def add_resource(self, owner):
        resource_id = str(uuid.uuid4())
        self.resources[resource_id] = {
            "id": resource_id,
            "title": "Trip",
            "description": None,
            "starts_at": None,
            "created_by": owner,
            "created_at": datetime.now(UTC).isoformat(),
        }
        # An expense creator is an implicit member; events persist their creator as a member.
        if self.resource_key == "event_id":
            self.members.append((resource_id, owner))
        return resource_id

    def get_resource(self, resource_id):
        return self.resources.get(resource_id)

    def get_resources(self, resource_ids):
        return [self.resources[i] for i in resource_ids if i in self.resources]

    def list_member_ids(self, resource_id):
        return [u for r, u in self.members if r == resource_id]

    def is_member(self, resource_id, user_id):
        return (resource_id, user_id) in self.members

    def add_member(self, resource_id, user_id):
        if not self.is_member(resource_id, user_id):
            self.members.append((resource_id, user_id))

    def remove_member(self, resource_id, user_id):
        self.members.remove((resource_id, user_id))

    def get_invite(self, invite_id):
        return self.invites.get(invite_id)

    def list_resource_invites(self, resource_id):
        return [i for i in self.invites.values() if i[self.resource_key] == resource_id]

    def list_incoming_invites(self, user_id):
        return [i for i in self.invites.values() if i["invitee_id"] == user_id]

    def create_invite(self, resource_id, inviter_id, invitee_id):
        if any(i["invitee_id"] == invitee_id for i in self.list_resource_invites(resource_id)):
            raise DuplicateInviteError
        row = {
            "id": str(uuid.uuid4()),
            self.resource_key: resource_id,
            "inviter_id": inviter_id,
            "invitee_id": invitee_id,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.invites[row["id"]] = row
        return row

    def delete_invite(self, invite_id):
        self.invites.pop(invite_id, None)


class Flow:
    def __init__(self, kind, repo, friends):
        self.kind, self.repo, self.friends = kind, repo, friends
        self.id = repo.add_resource(ALICE)
        self.base = f"/api/v1/{'events' if kind == 'event' else 'expenses'}/{self.id}"
        self.incoming = f"/api/v1/{'invites' if kind == 'event' else 'expense-invites'}"

    def add(self, user_id):
        return client.post(self.base + "/invites", json={"user_id": user_id})

    def detail(self):
        return client.get(self.base + ("" if self.kind == "event" else "/people"))

    def remove(self, user_id):
        return client.delete(self.base + f"/members/{user_id}")


@pytest.fixture(params=["event", "expense"])
def flow(request):
    friends = FakeFriendsRepo()
    for user_id, username in [(ALICE, "alice"), (BOB, "bob"), (CAROL, "carol"), (DAVE, "dave")]:
        friends.add_profile(user_id, username)
    for a, b in [(ALICE, BOB), (ALICE, CAROL), (BOB, DAVE)]:
        friends.accept_friendship(friends.create_friendship(a, b)["id"])
    repo = FakePeopleRepo(request.param)
    app.dependency_overrides[FriendsRepo] = lambda: friends
    dep = EventInvitesRepo if request.param == "event" else ExpensePeopleRepo
    app.dependency_overrides[dep] = lambda: repo
    sign_in(ALICE)
    yield Flow(request.param, repo, friends)
    app.dependency_overrides.clear()


def sign_in(user_id):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=user_id)


def test_friends_added_and_removed_without_accepting(flow):
    res = flow.add(BOB)
    assert res.status_code == 201
    assert res.json() == {"status": "added", "user": {"id": BOB, "username": "bob"}, "invite": None}
    assert flow.repo.is_member(flow.id, BOB)
    assert flow.repo.invites == {}
    sign_in(BOB)
    assert flow.detail().status_code == 200
    assert client.get(flow.incoming).json() == []
    sign_in(ALICE)
    assert flow.remove(BOB).status_code == 204
    sign_in(BOB)
    assert flow.detail().status_code == 404


def test_nonfriend_invited_then_added_only_on_accept(flow):
    res = flow.add(DAVE)
    assert res.status_code == 201
    assert res.json()["status"] == "invited"
    invite_id = res.json()["invite"]["id"]
    assert not flow.repo.is_member(flow.id, DAVE)
    assert [i["user"]["id"] for i in flow.detail().json()["invites"]] == [DAVE]
    sign_in(DAVE)
    assert flow.detail().status_code == 404
    incoming = client.get(flow.incoming).json()
    assert incoming[0][flow.kind]["id"] == flow.id
    assert incoming[0]["invited_by"]["username"] == "alice"
    accepted = client.post(f"{flow.incoming}/{invite_id}/accept")
    assert accepted.status_code == 200
    assert accepted.json()["id"] == flow.id
    assert flow.repo.is_member(flow.id, DAVE)
    assert flow.detail().status_code == 200
    assert client.get(flow.incoming).json() == []
    assert flow.friends.find_friendship(ALICE, DAVE) is None
    assert client.post(f"{flow.incoming}/{invite_id}/accept").status_code == 404


@pytest.mark.parametrize("incoming", [False, True])
def test_pending_friend_request_still_requires_invite_acceptance(flow, incoming):
    a, b = (DAVE, ALICE) if incoming else (ALICE, DAVE)
    friendship = flow.friends.create_friendship(a, b)
    res = flow.add(DAVE)
    assert res.json()["status"] == "invited"
    assert not flow.repo.is_member(flow.id, DAVE)
    sign_in(DAVE)
    invite_id = res.json()["invite"]["id"]
    assert client.post(f"{flow.incoming}/{invite_id}/accept").status_code == 200
    assert flow.repo.is_member(flow.id, DAVE)
    assert friendship["status"] == "pending"


def test_newly_accepted_friend_can_replace_pending_invitation(flow):
    flow.add(DAVE)
    flow.friends.accept_friendship(flow.friends.create_friendship(ALICE, DAVE)["id"])
    assert flow.add(DAVE).json()["status"] == "added"
    assert flow.repo.is_member(flow.id, DAVE)
    assert flow.repo.invites == {}


def test_member_uses_their_own_friendships(flow):
    flow.repo.add_member(flow.id, BOB)
    sign_in(BOB)
    assert flow.add(DAVE).json()["status"] == "added"
    assert flow.add(ALICE).status_code == 409
    # Carol is Alice's friend, so Bob must invite her.
    assert flow.add(CAROL).json()["status"] == "invited"
    assert flow.remove(DAVE).status_code == 204
    flow.repo.add_member(flow.id, CAROL)
    assert flow.remove(CAROL).status_code == 403
    assert flow.remove(ALICE).status_code == 403


def test_username_lookup_and_duplicate_rules(flow):
    res = client.post(flow.base + "/invites", json={"username": "@DAVE"})
    assert res.status_code == 201
    assert res.json()["user"]["id"] == DAVE
    assert flow.add(DAVE).status_code == 409
    assert flow.add(ALICE).status_code == 400
    assert flow.add(str(uuid.uuid4())).status_code == 404
    assert client.post(flow.base + "/invites", json={"username": "missing"}).status_code == 404
    for body in [{}, {"username": "!"}, {"username": "bob", "user_id": BOB}]:
        assert client.post(flow.base + "/invites", json=body).status_code == 422
    assert flow.add(BOB).status_code == 201
    assert flow.add(BOB).status_code == 409


def test_decline_cancel_and_permissions(flow):
    invite_id = flow.add(DAVE).json()["invite"]["id"]
    sign_in(CAROL)
    assert client.delete(f"{flow.incoming}/{invite_id}").status_code == 404
    assert client.post(f"{flow.incoming}/{invite_id}/accept").status_code == 404
    assert flow.add(BOB).status_code == 404
    assert flow.remove(BOB).status_code == 404
    sign_in(DAVE)
    assert client.delete(f"{flow.incoming}/{invite_id}").status_code == 204
    assert not flow.repo.is_member(flow.id, DAVE)
    sign_in(ALICE)
    invite_id = flow.add(DAVE).json()["invite"]["id"]
    assert client.delete(f"{flow.incoming}/{invite_id}").status_code == 204
    assert flow.repo.invites == {}
    assert flow.remove(ALICE).status_code == 403
    assert flow.remove(BOB).status_code == 404


def test_authentication_required(flow):
    app.dependency_overrides.pop(get_current_user)
    assert flow.add(BOB).status_code == 401
    assert flow.detail().status_code == 401
    assert client.get(flow.incoming).status_code == 401
    assert flow.remove(BOB).status_code == 401
