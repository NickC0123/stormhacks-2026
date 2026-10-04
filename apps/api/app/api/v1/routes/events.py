from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.db.supabase import get_supabase
from app.schemas.event import Event, EventCreate
from app.schemas.invite import EventDetail, EventInvite, EventUser
from app.services.event_invites import EventInvitesRepo, EventInvitesRepoDep
from app.services.friends import FriendsRepoDep

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[Event])
def list_events(user: CurrentUserDep) -> list[Event]:
    db = get_supabase()
    owned = db.table("events").select("*").eq("created_by", user.id).execute().data
    memberships = db.table("event_members").select("event_id").eq("user_id", user.id).execute().data
    member_events = []
    if memberships:
        member_events = (
            db.table("events")
            .select("*")
            .in_("id", [row["event_id"] for row in memberships])
            .execute()
            .data
        )
    rows = {row["id"]: row for row in [*owned, *member_events]}
    return [
        Event(**row)
        for row in sorted(rows.values(), key=lambda row: row["created_at"], reverse=True)
    ]


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(body: EventCreate, user: CurrentUserDep) -> Event:
    title = body.title.strip()
    if not title:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Event title is required")
    if body.member_ids:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Adding members is not supported yet"
        )

    db = get_supabase()
    db.table("profiles").upsert(
        {"id": user.id, "display_name": user.email or "Event creator"},
        on_conflict="id",
        ignore_duplicates=True,
    ).execute()

    created = db.table("events").insert(
        {
            "title": title,
            "description": body.description,
            "starts_at": body.starts_at.isoformat() if body.starts_at else None,
            "created_by": user.id,
        }
    ).execute().data[0]

    try:
        db.table("event_members").insert(
            {"event_id": created["id"], "user_id": user.id}
        ).execute()
    except Exception:
        db.table("events").delete().eq("id", created["id"]).execute()
        raise

    return Event(**created, member_ids=[UUID(user.id)])


def get_member_event(repo: EventInvitesRepo, event_id: UUID, user_id: str) -> dict[str, Any]:
    """The event, or 404 if it doesn't exist or the user isn't a member."""
    event = repo.get_event(str(event_id))
    if event is None or not repo.is_member(event["id"], user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found.")
    return event


@router.get("/{event_id}", response_model=EventDetail)
def get_event(
    event_id: UUID, user: CurrentUserDep, repo: EventInvitesRepoDep, friends: FriendsRepoDep
) -> EventDetail:
    """Event details with members and pending invites. Members only."""
    event = get_member_event(repo, event_id, user.id)
    member_ids = repo.list_member_ids(event["id"])
    invites = repo.list_event_invites(event["id"])
    user_ids = {*member_ids}
    for invite in invites:
        user_ids.update((invite["invitee_id"], invite["inviter_id"]))
    profiles = {p["id"]: p for p in friends.get_profiles(list(user_ids))}
    return EventDetail(
        **event,
        members=[EventUser.lookup(profiles, member_id) for member_id in member_ids],
        invites=[
            EventInvite(
                id=invite["id"],
                user=EventUser.lookup(profiles, invite["invitee_id"]),
                invited_by=EventUser.lookup(profiles, invite["inviter_id"]),
                created_at=invite["created_at"],
            )
            for invite in invites
        ],
    )
