from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.core.auth import CurrentUserDep
from app.schemas.invite import (
    EventInvite,
    EventUser,
    ExpensePeople,
    ExpenseSummary,
    IncomingExpenseInvite,
    InviteCreate,
    PersonAdded,
)
from app.services.event_invites import ExpensePeopleRepo, ExpensePeopleRepoDep
from app.services.friends import FriendsRepoDep
from app.services.people import add_person, remove_person

router = APIRouter(tags=["expense people"])


def require_member(repo: ExpensePeopleRepo, expense_id: str, user_id: str) -> dict:
    expense = repo.get_resource(expense_id)
    if expense is None or (
        expense["created_by"] != user_id and not repo.is_member(expense_id, user_id)
    ):
        raise HTTPException(404, "Expense not found.")
    return expense


@router.get("/expenses/{expense_id}/people", response_model=ExpensePeople)
def get_people(
    expense_id: UUID,
    user: CurrentUserDep,
    repo: ExpensePeopleRepoDep,
    friends: FriendsRepoDep,
) -> ExpensePeople:
    expense = require_member(repo, str(expense_id), user.id)
    members = list(dict.fromkeys([expense["created_by"], *repo.list_member_ids(str(expense_id))]))
    invites = repo.list_resource_invites(str(expense_id))
    ids = set(members)
    for invite in invites:
        ids.update((invite["invitee_id"], invite["inviter_id"]))
    profiles = {p["id"]: p for p in friends.get_profiles(list(ids))}
    return ExpensePeople(
        created_by=expense["created_by"],
        members=[EventUser.lookup(profiles, member_id) for member_id in members],
        invites=[
            EventInvite(
                id=row["id"],
                user=EventUser.lookup(profiles, row["invitee_id"]),
                invited_by=EventUser.lookup(profiles, row["inviter_id"]),
                created_at=row["created_at"],
            )
            for row in invites
        ],
    )


@router.post(
    "/expenses/{expense_id}/invites",
    response_model=PersonAdded,
    status_code=status.HTTP_201_CREATED,
)
def add_expense_person(
    expense_id: UUID,
    body: InviteCreate,
    user: CurrentUserDep,
    repo: ExpensePeopleRepoDep,
    friends: FriendsRepoDep,
) -> PersonAdded:
    expense = require_member(repo, str(expense_id), user.id)
    target = add_person(expense["id"], body, user.id, repo, friends)
    return target


@router.delete("/expenses/{expense_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_expense_person(
    expense_id: UUID,
    member_id: UUID,
    user: CurrentUserDep,
    repo: ExpensePeopleRepoDep,
    friends: FriendsRepoDep,
) -> Response:
    expense = require_member(repo, str(expense_id), user.id)
    remove_person(expense, str(member_id), user.id, repo, friends)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/expense-invites", response_model=list[IncomingExpenseInvite])
def list_invites(
    user: CurrentUserDep,
    repo: ExpensePeopleRepoDep,
    friends: FriendsRepoDep,
) -> list[IncomingExpenseInvite]:
    rows = repo.list_incoming_invites(user.id)
    expenses = {e["id"]: e for e in repo.get_resources(list({r["expense_id"] for r in rows}))}
    profiles = {p["id"]: p for p in friends.get_profiles(list({r["inviter_id"] for r in rows}))}
    return [
        IncomingExpenseInvite(
            id=row["id"],
            expense=ExpenseSummary(**expenses[row["expense_id"]]),
            invited_by=EventUser.lookup(profiles, row["inviter_id"]),
            created_at=row["created_at"],
        )
        for row in rows
        if row["expense_id"] in expenses
    ]


@router.post("/expense-invites/{invite_id}/accept", response_model=ExpenseSummary)
def accept_invite(
    invite_id: UUID,
    user: CurrentUserDep,
    repo: ExpensePeopleRepoDep,
) -> ExpenseSummary:
    invite = repo.get_invite(str(invite_id))
    if invite is None or invite["invitee_id"] != user.id:
        raise HTTPException(404, "Invite not found.")
    expense = repo.get_resource(invite["expense_id"])
    if expense is None:
        raise HTTPException(404, "This expense no longer exists.")
    repo.add_member(expense["id"], user.id)
    repo.delete_invite(invite["id"])
    return ExpenseSummary(**expense)


@router.delete("/expense-invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_invite(
    invite_id: UUID,
    user: CurrentUserDep,
    repo: ExpensePeopleRepoDep,
) -> Response:
    invite = repo.get_invite(str(invite_id))
    if invite is None:
        raise HTTPException(404, "Invite not found.")
    expense = repo.get_resource(invite["expense_id"])
    allowed = invite["invitee_id"] == user.id or (
        expense is not None
        and (expense["created_by"] == user.id or repo.is_member(expense["id"], user.id))
    )
    if not allowed:
        raise HTTPException(404, "Invite not found.")
    repo.delete_invite(invite["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)
