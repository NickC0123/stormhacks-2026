from uuid import UUID

from fastapi import APIRouter

from app.api.v1.routes.events import get_member_event
from app.core.auth import CurrentUserDep
from app.schemas.split import BalanceDashboard
from app.services.event_invites import EventInvitesRepoDep
from app.services.exchange_rates import convert_to_cad
from app.services.expense_splits import ExpenseBalancesRepoDep, balance_dashboard
from app.services.friends import FriendsRepoDep

router = APIRouter(tags=["balances"])


def load_dashboard(user_id: str, repo, friends, event_id: str | None = None) -> BalanceDashboard:
    rows, unconverted = convert_to_cad(repo.list_inputs(user_id, event_id))
    ids = {row["created_by"] for row in rows}
    for row in rows:
        ids.update(row["member_ids"])
    profiles = {p["id"]: p for p in friends.get_profiles(list(ids))}
    dashboard = balance_dashboard(rows, user_id, profiles)
    dashboard.unconverted_currencies = unconverted
    return dashboard


@router.get("/balances", response_model=BalanceDashboard)
def my_balances(
    user: CurrentUserDep,
    repo: ExpenseBalancesRepoDep,
    friends: FriendsRepoDep,
) -> BalanceDashboard:
    return load_dashboard(user.id, repo, friends)


@router.get("/events/{event_id}/balances", response_model=BalanceDashboard)
def event_balances(
    event_id: UUID,
    user: CurrentUserDep,
    repo: ExpenseBalancesRepoDep,
    events: EventInvitesRepoDep,
    friends: FriendsRepoDep,
) -> BalanceDashboard:
    get_member_event(events, event_id, user.id)
    return load_dashboard(user.id, repo, friends, str(event_id))
