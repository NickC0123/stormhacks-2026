import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.core.config import get_settings
from app.db.supabase import get_supabase
from app.schemas.event import Event, EventCreate
from app.schemas.invite import EventDetail, EventInvite, EventUser
from app.services.event_invites import EventInvitesRepo, EventInvitesRepoDep
from app.services.friends import FriendsRepoDep
from app.services.storage import remove_files

logger = logging.getLogger(__name__)
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
    event = repo.get_resource(str(event_id))
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
    invites = repo.list_resource_invites(event["id"])
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


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: UUID, user: CurrentUserDep, repo: EventInvitesRepoDep) -> None:
    """Deletes the event and everything in it. Only its creator can do this."""
    event = get_member_event(repo, event_id, user.id)
    if event["created_by"] != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the event's host can delete it.")

    db = get_supabase()
    event_id_str = str(event_id)
    expenses = (
        db.table("expenses")
        .select("id,receipt_image_path")
        .eq("event_id", event_id_str)
        .execute()
        .data
    )
    photos = db.table("memories").select("photo_path").eq("event_id", event_id_str).execute().data

    # Expenses and payments would otherwise outlive the event (their event_id is
    # set to null), so they are removed first. Members, invites, photos and
    # receipts cascade with the event row.
    db.table("expenses").delete().eq("event_id", event_id_str).execute()
    db.table("settlements").delete().eq("event_id", event_id_str).execute()
    db.table("events").delete().eq("id", event_id_str).eq("created_by", user.id).execute()

    settings = get_settings()
    remove_stored(
        settings.supabase_storage_bucket_receipts,
        [row["receipt_image_path"] for row in expenses if row.get("receipt_image_path")],
    )
    remove_stored(
        settings.supabase_storage_bucket_memories,
        [row["photo_path"] for row in photos if row.get("photo_path")],
    )


def remove_stored(bucket: str, paths: list[str]) -> None:
    if not paths:
        return
    try:
        remove_files(bucket, paths)
    except Exception:
        logger.warning("Could not remove %d files from %s", len(paths), bucket, exc_info=True)
