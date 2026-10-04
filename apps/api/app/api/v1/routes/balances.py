from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.v1.routes.events import get_member_event
from app.core.auth import CurrentUserDep
from app.schemas.split import BalanceDashboard, SettleUpRequest
from app.services.event_invites import EventInvitesRepoDep
from app.services.exchange_rates import HOME_CURRENCY, convert_to_cad
from app.services.expense_splits import ExpenseBalancesRepoDep, balance_dashboard
from app.services.friends import FriendsRepoDep
from app.services.settlements import SettlementsRepoDep

router = APIRouter(tags=["balances"])


def load_dashboard(
    user_id: str, repo, friends, settlements, event_id: str | None = None
) -> BalanceDashboard:
    rows, unconverted = convert_to_cad(repo.list_inputs(user_id, event_id))
    payments, _ = convert_to_cad(settlements.list_for_user(user_id, event_id))
    ids = {row["created_by"] for row in rows}
    for row in rows:
        ids.update(row["member_ids"])
    for row in payments:
        ids.update((row["from_user_id"], row["to_user_id"]))
    profiles = {p["id"]: p for p in friends.get_profiles(list(ids))}
    dashboard = balance_dashboard(rows, user_id, profiles, payments)
    dashboard.unconverted_currencies = unconverted
    return dashboard


@router.get("/balances", response_model=BalanceDashboard)
def my_balances(
    user: CurrentUserDep,
    repo: ExpenseBalancesRepoDep,
    friends: FriendsRepoDep,
    settlements: SettlementsRepoDep,
) -> BalanceDashboard:
    return load_dashboard(user.id, repo, friends, settlements)


@router.get("/events/{event_id}/balances", response_model=BalanceDashboard)
def event_balances(
    event_id: UUID,
    user: CurrentUserDep,
    repo: ExpenseBalancesRepoDep,
    events: EventInvitesRepoDep,
    friends: FriendsRepoDep,
    settlements: SettlementsRepoDep,
) -> BalanceDashboard:
    get_member_event(events, event_id, user.id)
    return load_dashboard(user.id, repo, friends, settlements, str(event_id))


@router.post("/settlements", response_model=BalanceDashboard, status_code=status.HTTP_201_CREATED)
def settle_up(
    body: SettleUpRequest,
    user: CurrentUserDep,
    repo: ExpenseBalancesRepoDep,
    events: EventInvitesRepoDep,
    friends: FriendsRepoDep,
    settlements: SettlementsRepoDep,
) -> BalanceDashboard:
    """Record that the caller and another person paid off their whole balance.

    Either side can record it. Returns the updated balances in the same scope.
    """
    event_id = str(body.event_id) if body.event_id else None
    if event_id:
        get_member_event(events, body.event_id, user.id)
    other_id = str(body.user_id)
    dashboard = load_dashboard(user.id, repo, friends, settlements, event_id)
    person = next(
        (p for p in dashboard.people if str(p.user.id) == other_id and p.currency == HOME_CURRENCY),
        None,
    )
    if person is None or not (person.you_owe or person.owed_to_you):
        raise HTTPException(status.HTTP_409_CONFLICT, "You're already settled up.")
    amount = person.you_owe or person.owed_to_you
    if amount != body.amount:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This balance just changed. Check it and try again."
        )
    debtor, creditor = (user.id, other_id) if person.you_owe else (other_id, user.id)
    settlements.create(
        {
            "from_user_id": debtor,
            "to_user_id": creditor,
            "amount": str(amount),
            "currency": HOME_CURRENCY,
            "event_id": event_id,
            "recorded_by": user.id,
        }
    )
    return load_dashboard(user.id, repo, friends, settlements, event_id)
