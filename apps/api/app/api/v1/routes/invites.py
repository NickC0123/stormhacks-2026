from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.api.v1.routes.events import get_member_event
from app.core.auth import CurrentUserDep
from app.schemas.invite import (
    EventInvite,
    EventSummary,
    EventUser,
    IncomingInvite,
    InviteCreate,
)
from app.services.event_invites import DuplicateInviteError, EventInvitesRepoDep
from app.services.friends import FriendsRepoDep

router = APIRouter(tags=["invites"])


@router.post(
    "/events/{event_id}/invites", response_model=EventInvite, status_code=status.HTTP_201_CREATED
)
def invite_friend(
    event_id: UUID,
    body: InviteCreate,
    user: CurrentUserDep,
    repo: EventInvitesRepoDep,
    friends: FriendsRepoDep,
) -> EventInvite:
    """Any member can invite one of their accepted friends."""
    event = get_member_event(repo, event_id, user.id)
    invitee_id = str(body.user_id)
    if invitee_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You're already in this event.")

    friendship = friends.find_friendship(user.id, invitee_id)
    if friendship is None or friendship["status"] != "accepted":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only invite your friends.")

    profiles = {p["id"]: p for p in friends.get_profiles([user.id, invitee_id])}
    invitee = EventUser.lookup(profiles, invitee_id)
    name = f"@{invitee.username}" if invitee.username else "This person"
    if repo.is_member(event["id"], invitee_id):
        raise HTTPException(status.HTTP_409_CONFLICT, f"{name} is already in this event.")
    try:
        row = repo.create_invite(event["id"], user.id, invitee_id)
    except DuplicateInviteError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, f"{name} is already invited.") from exc

    return EventInvite(
        id=row["id"],
        user=invitee,
        invited_by=EventUser.lookup(profiles, user.id),
        created_at=row["created_at"],
    )


@router.get("/invites", response_model=list[IncomingInvite])
def list_invites(
    user: CurrentUserDep, repo: EventInvitesRepoDep, friends: FriendsRepoDep
) -> list[IncomingInvite]:
    """Pending invites sent to the signed-in user, newest first."""
    rows = repo.list_incoming_invites(user.id)
    events = {e["id"]: e for e in repo.get_events(list({r["event_id"] for r in rows}))}
    profiles = {p["id"]: p for p in friends.get_profiles(list({r["inviter_id"] for r in rows}))}
    return [
        IncomingInvite(
            id=row["id"],
            event=EventSummary(**events[row["event_id"]]),
            invited_by=EventUser.lookup(profiles, row["inviter_id"]),
            created_at=row["created_at"],
        )
        for row in rows
        if row["event_id"] in events
    ]


@router.post("/invites/{invite_id}/accept", response_model=EventSummary)
def accept_invite(invite_id: UUID, user: CurrentUserDep, repo: EventInvitesRepoDep) -> EventSummary:
    invite = repo.get_invite(str(invite_id))
    if invite is None or invite["invitee_id"] != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite not found.")
    event = repo.get_event(invite["event_id"])
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This event no longer exists.")
    repo.add_member(invite["event_id"], user.id)
    repo.delete_invite(invite["id"])
    return EventSummary(**event)


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_invite(invite_id: UUID, user: CurrentUserDep, repo: EventInvitesRepoDep) -> Response:
    """The invitee declines, or any event member cancels."""
    invite = repo.get_invite(str(invite_id))
    allowed = invite is not None and (
        invite["invitee_id"] == user.id or repo.is_member(invite["event_id"], user.id)
    )
    if not allowed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite not found.")
    repo.delete_invite(invite["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)
