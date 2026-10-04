import pytest

from app.main import app
from app.services.event_invites import EventInvitesRepo
from app.services.friends import FriendsRepo
from tests.test_event_invites import ALICE, BOB, DAVE, FakePeopleRepo, client, sign_in
from tests.test_friends import FakeRepo as FakeFriendsRepo


class EditingRepo(FakePeopleRepo):
    def update_event(self, event_id, host_id, values):
        assert self.resources[event_id]["created_by"] == host_id
        self.resources[event_id].update(values)


@pytest.fixture
def event():
    repo = EditingRepo("event")
    event_id = repo.add_resource(ALICE)
    repo.add_member(event_id, BOB)
    friends = FakeFriendsRepo()
    friends.add_profile(ALICE, "alice")
    friends.add_profile(BOB, "bob")
    app.dependency_overrides[EventInvitesRepo] = lambda: repo
    app.dependency_overrides[FriendsRepo] = lambda: friends
    sign_in(ALICE)
    yield f"/api/v1/events/{event_id}", repo, event_id
    app.dependency_overrides.clear()


def test_host_edits_details_preserving_members_and_identity(event):
    url, repo, event_id = event
    before = repo.resources[event_id].copy()
    result = client.put(
        url,
        json={
            "title": "  New trip  ",
            "description": "  Updated plan  ",
            "starts_at": "2026-10-12T12:00:00Z",
        },
    )
    assert result.status_code == 200
    detail = result.json()
    assert detail["title"] == "New trip"
    assert detail["description"] == "Updated plan"
    assert detail["starts_at"].startswith("2026-10-12T12:00:00")
    assert detail["id"] == before["id"]
    assert detail["created_by"] == before["created_by"]
    assert detail["created_at"] == before["created_at"].replace("+00:00", "Z")
    assert {member["id"] for member in detail["members"]} == {ALICE, BOB}
    sign_in(BOB)
    assert client.get(url).json()["title"] == "New trip"


def test_optional_date_and_description_can_be_cleared(event):
    url, _, _ = event
    response = client.put(
        url,
        json={
            "title": "Trip",
            "description": "Plan",
            "starts_at": "2026-10-12T12:00:00Z",
        },
    )
    assert response.status_code == 200
    detail = client.put(url, json={"title": "Trip", "description": "  ", "starts_at": None}).json()
    assert detail["description"] is None
    assert detail["starts_at"] is None


@pytest.mark.parametrize("user,status", [(BOB, 403), (DAVE, 404)])
def test_only_host_can_edit(event, user, status):
    url, repo, event_id = event
    sign_in(user)
    assert client.put(url, json={"title": "Changed"}).status_code == status
    assert repo.resources[event_id]["title"] == "Trip"


@pytest.mark.parametrize(
    "body",
    [
        {"title": "   "},
        {"title": ""},
        {"title": "x" * 201},
        {"title": "Trip", "created_by": BOB},
        {"title": "Trip", "member_ids": [DAVE]},
        {"title": "Trip", "starts_at": "invalid-date"},
    ],
)
def test_invalid_or_protected_fields_rejected(event, body):
    url, repo, event_id = event
    assert client.put(url, json=body).status_code == 422
    assert repo.resources[event_id]["title"] == "Trip"
