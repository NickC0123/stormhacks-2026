from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.services.event_invites import EventInvitesRepo, ExpensePeopleRepo
from app.services.expense_splits import ExpenseBalancesRepo, balance_dashboard, equal_shares
from app.services.friends import FriendsRepo
from app.services.settlements import SettlementsRepo
from tests.test_event_invites import FakePeopleRepo
from tests.test_friends import FakeRepo as FakeFriendsRepo

client = TestClient(app)
ALICE, BOB, CAROL, DAVE = [str(uuid4()) for _ in range(4)]
EMPTY = {"totals": [], "people": [], "unconverted_currencies": []}


def expense(payer, amount, members, currency="CAD"):
    return {
        "id": str(uuid4()),
        "title": "Lunch",
        "created_by": payer,
        "amount": amount,
        "member_ids": members,
        "currency": currency,
    }


@pytest.mark.parametrize(
    "amount,count",
    [("90.00", 3), ("90.00", 4), ("10.00", 3), ("0.01", 3), ("0.00", 4), ("9999999999.99", 7)],
)
def test_shares_are_exact_deterministic_and_differ_by_at_most_one_cent(amount, count):
    ids = [str(uuid4()) for _ in range(count)]
    shares = equal_shares(Decimal(amount), ids)
    assert sum(shares.values()) == Decimal(amount)
    assert max(shares.values()) - min(shares.values()) <= Decimal("0.01")
    assert shares == equal_shares(Decimal(amount), list(reversed(ids)) + ids)


def test_no_people_is_rejected():
    with pytest.raises(ValueError, match="at least one"):
        equal_shares(Decimal("10.00"), [])


def test_pairwise_balances_net_out_but_currencies_stay_separate():
    rows = [
        expense(ALICE, "90.00", [ALICE, BOB, CAROL]),
        expense(BOB, "20.00", [ALICE, BOB]),
        expense(BOB, "12.00", [ALICE, BOB], "USD"),
    ]
    data = balance_dashboard(rows, ALICE, {}).model_dump(mode="json")
    assert data["totals"] == [
        {"currency": "CAD", "you_owe": "0.00", "owed_to_you": "50.00"},
        {"currency": "USD", "you_owe": "6.00", "owed_to_you": "0.00"},
    ]
    bob_cad = next(p for p in data["people"] if p["user"]["id"] == BOB and p["currency"] == "CAD")
    assert bob_cad["owed_to_you"] == "20.00"
    assert [e["amount"] for e in bob_cad["expenses"]] == ["30.00", "-10.00"]
    bob = balance_dashboard(rows, BOB, {}).model_dump(mode="json")
    assert bob["totals"] == [
        {"currency": "CAD", "you_owe": "20.00", "owed_to_you": "0.00"},
        {"currency": "USD", "you_owe": "0.00", "owed_to_you": "6.00"},
    ]


def test_payer_can_pay_without_a_personal_share():
    rows = [expense(ALICE, "90.00", [BOB, CAROL])]
    data = balance_dashboard(rows, ALICE, {})
    assert data.totals[0].owed_to_you == Decimal("90.00")
    assert all(p.owed_to_you == Decimal("45.00") for p in data.people)


class FakeBalancesRepo(ExpenseBalancesRepo):
    def __init__(self, people):
        self.people = people

    def list_inputs(self, user_id, event_id=None):
        return [
            {**row, "member_ids": self.people.list_member_ids(row["id"])}
            for row in self.people.resources.values()
            if (row["created_by"] == user_id or self.people.is_member(row["id"], user_id))
            and (event_id is None or row.get("event_id") == event_id)
        ]


class FakeSettlementsRepo(SettlementsRepo):
    def __init__(self):
        self.rows = []

    def list_for_user(self, user_id, event_id=None):
        return [
            row
            for row in self.rows
            if user_id in (row["from_user_id"], row["to_user_id"])
            and (event_id is None or row["event_id"] == event_id)
        ]

    def create(self, row):
        row = {**row, "id": str(uuid4()), "created_at": "2026-10-04T12:00:00Z"}
        self.rows.append(row)
        return row


@pytest.fixture
def setup():
    people = FakePeopleRepo("expense")
    friends = FakeFriendsRepo()
    for user_id, username in [(ALICE, "alice"), (BOB, "bob"), (CAROL, "carol"), (DAVE, "dave")]:
        friends.add_profile(user_id, username)
    for user_id in [BOB, CAROL]:
        friends.accept_friendship(friends.create_friendship(ALICE, user_id)["id"])
    expense_id = people.add_resource(ALICE)
    people.add_member(expense_id, BOB)
    people.add_member(expense_id, CAROL)
    app.dependency_overrides[ExpensePeopleRepo] = lambda: people
    app.dependency_overrides[ExpenseBalancesRepo] = lambda: FakeBalancesRepo(people)
    app.dependency_overrides[FriendsRepo] = lambda: friends
    settlements = FakeSettlementsRepo()
    app.dependency_overrides[SettlementsRepo] = lambda: settlements
    app.dependency_overrides[EventInvitesRepo] = lambda: FakePeopleRepo("event")
    sign_in(ALICE)
    yield people, expense_id
    app.dependency_overrides.clear()


def sign_in(user_id):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=user_id)


def total():
    return client.get("/api/v1/balances").json()["totals"][0]


def test_add_remove_and_accept_immediately_recalculate_shares_and_both_dashboards(setup):
    people, expense_id = setup
    path = f"/api/v1/expenses/{expense_id}"
    assert total()["owed_to_you"] == "60.00"
    assert [s["amount"] for s in client.get(path + "/people").json()["split"]["shares"]] == [
        "30.00"
    ] * 3
    invite = client.post(path + "/invites", json={"user_id": DAVE}).json()["invite"]
    assert total()["owed_to_you"] == "60.00"  # Pending invite does not affect anyone's share.
    sign_in(DAVE)
    assert client.get("/api/v1/balances").json() == EMPTY
    assert client.post(f"/api/v1/expense-invites/{invite['id']}/accept").status_code == 200
    assert total()["you_owe"] == "22.50"
    sign_in(ALICE)
    assert total()["owed_to_you"] == "67.50"
    assert client.delete(path + f"/members/{BOB}").status_code == 204
    assert total()["owed_to_you"] == "60.00"
    sign_in(BOB)
    assert client.get("/api/v1/balances").json() == EMPTY
    sign_in(ALICE)
    assert client.post(path + "/invites", json={"user_id": BOB}).json()["status"] == "added"
    assert total()["owed_to_you"] == "67.50"
    people.resources[expense_id]["amount"] = "120.00"
    assert total()["owed_to_you"] == "90.00"


def test_balances_in_other_currencies_net_out_in_cad(setup):
    people, _ = setup  # Alice paid 90.00 CAD for Alice, Bob and Carol.
    usd = people.add_resource(BOB)
    people.resources[usd].update(amount="100.00", currency="USD")
    people.add_member(usd, ALICE)
    data = client.get("/api/v1/balances").json()
    # Bob owes 30.00; Alice owes Bob half of 142.46 CAD (100.00 USD), so she owes him 41.23.
    assert data["totals"] == [{"currency": "CAD", "you_owe": "41.23", "owed_to_you": "30.00"}]
    assert {p["user"]["id"]: (p["you_owe"], p["owed_to_you"]) for p in data["people"]} == {
        BOB: ("41.23", "0.00"),
        CAROL: ("0.00", "30.00"),
    }
    assert {p["currency"] for p in data["people"]} == {"CAD"}


def test_payer_can_exclude_and_include_their_share_but_cannot_remove_the_last_person(setup):
    _, expense_id = setup
    path = f"/api/v1/expenses/{expense_id}"
    assert client.delete(path + f"/members/{ALICE}").status_code == 204
    assert total()["owed_to_you"] == "90.00"
    assert client.post(path + "/invites", json={"user_id": ALICE}).status_code == 201
    assert total()["owed_to_you"] == "60.00"
    for user_id in [BOB, CAROL]:
        assert client.delete(path + f"/members/{user_id}").status_code == 204
    assert client.delete(path + f"/members/{ALICE}").status_code == 400
    assert client.get("/api/v1/balances").json() == EMPTY


def test_unrelated_users_and_unauthenticated_callers_cannot_read_balances_or_shares(setup):
    _, expense_id = setup
    sign_in(DAVE)
    assert client.get(f"/api/v1/expenses/{expense_id}/people").status_code == 404
    assert client.get("/api/v1/balances").json() == EMPTY
    app.dependency_overrides.pop(get_current_user)
    assert client.get("/api/v1/balances").status_code == 401


def settle(user_id, amount):
    return client.post("/api/v1/settlements", json={"user_id": user_id, "amount": amount})


def person(data, user_id):
    return next(p for p in data["people"] if p["user"]["id"] == user_id)


def test_settlements_reduce_balances_on_both_sides():
    rows = [expense(ALICE, "90.00", [ALICE, BOB, CAROL])]
    paid = [
        {
            "id": str(uuid4()),
            "from_user_id": BOB,
            "to_user_id": ALICE,
            "amount": "10.00",
            "currency": "CAD",
            "created_at": "2026-10-04T12:00:00Z",
        }
    ]
    alice = balance_dashboard(rows, ALICE, {}, paid).model_dump(mode="json")
    assert alice["totals"][0]["owed_to_you"] == "50.00"
    assert person(alice, BOB)["owed_to_you"] == "20.00"
    assert [s["amount"] for s in person(alice, BOB)["settlements"]] == ["-10.00"]
    bob = balance_dashboard(rows, BOB, {}, paid).model_dump(mode="json")
    assert bob["totals"][0]["you_owe"] == "20.00"
    assert [s["amount"] for s in person(bob, ALICE)["settlements"]] == ["10.00"]


def test_debtor_settles_up_and_both_balances_return_to_zero(setup):
    sign_in(BOB)
    res = settle(ALICE, "30.00")
    assert res.status_code == 201
    assert person(res.json(), ALICE)["you_owe"] == "0.00"
    assert res.json()["totals"][0]["you_owe"] == "0.00"
    sign_in(ALICE)
    data = client.get("/api/v1/balances").json()
    assert person(data, BOB)["owed_to_you"] == "0.00"
    assert person(data, CAROL)["owed_to_you"] == "30.00"
    assert settle(BOB, "30.00").status_code == 409  # Already settled.


def test_creditor_can_mark_a_debt_paid(setup):
    res = settle(CAROL, "30.00")
    assert res.status_code == 201
    assert person(res.json(), CAROL)["owed_to_you"] == "0.00"
    sign_in(CAROL)
    assert total()["you_owe"] == "0.00"


def test_new_expenses_after_settling_count_again(setup):
    people, expense_id = setup
    assert settle(BOB, "30.00").status_code == 201
    people.resources[expense_id]["amount"] = "120.00"
    assert person(client.get("/api/v1/balances").json(), BOB)["owed_to_you"] == "10.00"


def test_stale_amount_and_strangers_are_rejected(setup):
    assert settle(BOB, "25.00").status_code == 409
    assert settle(DAVE, "30.00").status_code == 409
    assert settle(BOB, "-30.00").status_code == 422
    sign_in(DAVE)
    assert settle(ALICE, "30.00").status_code == 409
    app.dependency_overrides.pop(get_current_user)
    assert settle(ALICE, "30.00").status_code == 401


def test_creditor_e_transfer_contact_is_shown_only_when_visible_and_owed(setup):
    friends = app.dependency_overrides[FriendsRepo]()
    friends.profiles[ALICE].update(
        etransfer_email="alice@example.com",
        instagram="alice",
        visible_contacts=["etransfer_email", "instagram"],
    )
    friends.profiles[CAROL].update(etransfer_email="carol@example.com", visible_contacts=[])
    sign_in(BOB)
    assert person(client.get("/api/v1/balances").json(), ALICE)["payment_contacts"] == [
        {"kind": "etransfer_email", "value": "alice@example.com"}
    ]
    sign_in(ALICE)
    data = client.get("/api/v1/balances").json()
    assert person(data, CAROL)["payment_contacts"] == []  # Carol owes Alice, not the reverse.
    sign_in(BOB)
    settle(ALICE, "30.00")
    assert person(client.get("/api/v1/balances").json(), ALICE)["payment_contacts"] == []


def test_event_overview_and_payments_are_scoped_to_one_event(setup):
    people, expense_id = setup
    events = FakePeopleRepo("event")
    event_a = events.add_resource(ALICE)
    event_b = events.add_resource(ALICE)
    events.add_member(event_a, BOB)
    events.add_member(event_b, BOB)
    app.dependency_overrides[EventInvitesRepo] = lambda: events
    people.resources[expense_id]["event_id"] = event_a
    second = people.add_resource(ALICE)
    people.resources[second]["event_id"] = event_b
    people.add_member(second, BOB)
    a_url = f"/api/v1/events/{event_a}/balances"
    b_url = f"/api/v1/events/{event_b}/balances"
    a = client.get(a_url).json()
    b = client.get(b_url).json()
    assert a["totals"][0]["owed_to_you"] == "60.00"
    assert b["totals"][0]["owed_to_you"] == "45.00"
    assert {expense["expense_id"] for person in a["people"] for expense in person["expenses"]} == {
        expense_id,
    }
    response = client.post(
        "/api/v1/settlements",
        json={
            "user_id": BOB,
            "amount": "30.00",
            "event_id": event_a,
        },
    )
    assert response.status_code == 201
    assert response.json()["totals"][0]["owed_to_you"] == "30.00"
    assert client.get(b_url).json() == b
    assert total()["owed_to_you"] == "75.00"
    sign_in(BOB)
    assert client.get(a_url).json()["totals"][0]["you_owe"] == "0.00"
    assert client.get(b_url).json()["totals"][0]["you_owe"] == "45.00"
    sign_in(DAVE)
    assert client.get(a_url).status_code == 404
