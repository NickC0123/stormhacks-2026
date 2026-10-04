import pytest

from app.main import app
from app.services.friends import FriendsRepo
from tests.test_friends import ALICE, BOB, CAROL, FakeRepo, client, sign_in


class ContactsRepo(FakeRepo):
    def __init__(self) -> None:
        super().__init__()
        self.shared_events: set[frozenset[str]] = set()

    def save_contacts(self, user_id, columns):
        profile = self.profiles.get(user_id)
        if profile is None:
            return None
        profile.update(columns)
        return profile

    def shares_event(self, user_a, user_b):
        return frozenset((user_a, user_b)) in self.shared_events


@pytest.fixture
def repo():
    fake = ContactsRepo()
    fake.add_profile(ALICE, "alice")
    fake.add_profile(BOB, "bob")
    fake.add_profile(CAROL, "carol")
    app.dependency_overrides[FriendsRepo] = lambda: fake
    sign_in(ALICE)
    yield fake
    app.dependency_overrides.clear()


def save(*contacts: dict):
    return client.put("/api/v1/me/contacts", json={"contacts": list(contacts)})


def befriend(repo: ContactsRepo, a: str, b: str) -> None:
    repo.accept_friendship(repo.create_friendship(a, b)["id"])


def test_contacts_default_to_empty_and_hidden(repo: ContactsRepo) -> None:
    contacts = client.get("/api/v1/me/contacts").json()["contacts"]
    assert [c["kind"] for c in contacts] == [
        "instagram",
        "facebook",
        "whatsapp",
        "etransfer_email",
        "etransfer_phone",
    ]
    assert all(c["value"] is None and c["visible"] is False for c in contacts)


def test_save_normalizes_and_only_shows_chosen_fields(repo: ContactsRepo) -> None:
    res = save(
        {"kind": "instagram", "value": " @alice.ig ", "visible": True},
        {"kind": "facebook", "value": "https://www.facebook.com/alice.fb/", "visible": False},
        {"kind": "etransfer_email", "value": "alice@example.com", "visible": True},
        {"kind": "whatsapp", "value": "", "visible": True},
    )
    assert res.status_code == 200
    by_kind = {c["kind"]: c for c in res.json()["contacts"]}
    assert by_kind["instagram"] == {"kind": "instagram", "value": "alice.ig", "visible": True}
    assert by_kind["facebook"] == {"kind": "facebook", "value": "alice.fb", "visible": False}
    # An empty field can't be visible.
    assert by_kind["whatsapp"] == {"kind": "whatsapp", "value": None, "visible": False}

    befriend(repo, ALICE, BOB)
    sign_in(BOB)
    profile = client.get(f"/api/v1/users/{ALICE}").json()
    assert profile["username"] == "alice"
    assert profile["contacts"] == [
        {"kind": "instagram", "value": "alice.ig"},
        {"kind": "etransfer_email", "value": "alice@example.com"},
    ]


def test_invalid_values_are_rejected(repo: ContactsRepo) -> None:
    assert save({"kind": "instagram", "value": "has space"}).status_code == 422
    assert save({"kind": "facebook", "value": "abc"}).status_code == 422
    assert save({"kind": "etransfer_email", "value": "nope"}).status_code == 422
    assert save({"kind": "etransfer_phone", "value": "call me"}).status_code == 422
    assert save({"kind": "etransfer_phone", "value": "604 555 012"}).status_code == 422
    assert save({"kind": "etransfer_phone", "value": "+44 20 7946 0958"}).status_code == 422


@pytest.mark.parametrize(
    "raw", ["6045550123", "(604) 555-0123", "+1 604-555-0123", "1.604.555.0123"]
)
def test_phone_numbers_use_one_format(repo: ContactsRepo, raw: str) -> None:
    res = save({"kind": "whatsapp", "value": raw}, {"kind": "etransfer_phone", "value": raw})
    assert res.status_code == 200
    by_kind = {c["kind"]: c["value"] for c in res.json()["contacts"]}
    assert by_kind["whatsapp"] == "+1 (604) 555-0123"
    assert by_kind["etransfer_phone"] == "+1 (604) 555-0123"


def test_only_friends_and_event_mates_can_view(repo: ContactsRepo) -> None:
    save({"kind": "facebook", "value": "alice.fb", "visible": True})

    sign_in(BOB)
    assert client.get(f"/api/v1/users/{ALICE}").status_code == 404

    # A pending request isn't enough.
    repo.create_friendship(BOB, ALICE)
    assert client.get(f"/api/v1/users/{ALICE}").status_code == 404

    repo.shared_events.add(frozenset((ALICE, CAROL)))
    sign_in(CAROL)
    assert client.get(f"/api/v1/users/{ALICE}").json()["contacts"] == [
        {"kind": "facebook", "value": "alice.fb"}
    ]

    sign_in(ALICE)
    assert client.get(f"/api/v1/users/{ALICE}").status_code == 200
