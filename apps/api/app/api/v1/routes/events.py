import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.core.config import get_settings
from app.db.supabase import get_supabase
from app.schemas.event import Event, EventCreate, EventHomeItem, EventUpdate
from app.schemas.invite import EventDetail, EventInvite, EventUser, InviteCreate
from app.schemas.photo import EventPhotoPreview
from app.services.event_invites import EventInvitesRepo, EventInvitesRepoDep
from app.services.event_photos import EventPhotosRepoDep
from app.services.friends import FriendsRepoDep
from app.services.people import accepted_friend, resolve_person
from app.services.storage import remove_files

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["events"])

PREVIEW_PHOTO_LIMIT = 3


def pick_preview_photos(
    event_photos: list[dict[str, Any]],
    urls: dict[str, str],
    *,
    limit: int = PREVIEW_PHOTO_LIMIT,
) -> list[EventPhotoPreview]:
    """Latest photos first. Skip missing files."""
    previews: list[EventPhotoPreview] = []
    for row in event_photos:  # already newest-first
        path = row.get("photo_path")
        if not path or path not in urls:
            continue
        previews.append(EventPhotoPreview(id=row["id"], url=urls[path]))
        if len(previews) >= limit:
            break
    return previews


@router.get("", response_model=list[EventHomeItem])
def list_events(
    user: CurrentUserDep, photos: EventPhotosRepoDep, friends: FriendsRepoDep
) -> list[EventHomeItem]:
    """Events the user is in, with members and up to 3 cover photos."""
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
    events = sorted(rows.values(), key=lambda row: row["created_at"], reverse=True)
    event_ids = [row["id"] for row in events]
    if not event_ids:
        return []

    member_rows = (
        db.table("event_members")
        .select("event_id,user_id")
        .in_("event_id", event_ids)
        .execute()
        .data
    )
    members_by_event: dict[str, list[str]] = {event_id: [] for event_id in event_ids}
    profile_ids: set[str] = set()
    for row in member_rows:
        members_by_event.setdefault(row["event_id"], []).append(row["user_id"])
        profile_ids.add(row["user_id"])
    profiles = {p["id"]: p for p in friends.get_profiles(list(profile_ids))}

    photo_rows = photos.list_photos_for_events(event_ids)
    photos_by_event: dict[str, list[dict[str, Any]]] = {event_id: [] for event_id in event_ids}
    for row in photo_rows:
        photos_by_event.setdefault(row["event_id"], []).append(row)

    paths = [row["photo_path"] for row in photo_rows if row.get("photo_path")]
    urls = photos.signed_urls(paths)

    return [
        EventHomeItem(
            id=event["id"],
            title=event["title"],
            description=event.get("description"),
            starts_at=event.get("starts_at"),
            ends_at=event.get("ends_at"),
            location=event.get("location"),
            created_by=event["created_by"],
            created_at=event["created_at"],
            photo_count=len(photos_by_event.get(event["id"], [])),
            preview_photos=pick_preview_photos(photos_by_event.get(event["id"], []), urls),
            members=[
                EventUser.lookup(profiles, member_id)
                for member_id in members_by_event.get(event["id"], [])
            ],
        )
        for event in events
    ]


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(body: EventCreate, user: CurrentUserDep, friends: FriendsRepoDep) -> Event:
    title = body.title.strip()
    if not title:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Event title is required")
    targets = {}
    for person in [
        *[InviteCreate(user_id=member_id) for member_id in body.member_ids],
        *[InviteCreate(username=username) for username in body.invite_usernames],
    ]:
        profile = resolve_person(person, friends)
        if profile["id"] != user.id:
            targets[profile["id"]] = accepted_friend(friends, user.id, profile["id"])

    db = get_supabase()
    db.table("profiles").upsert(
        {"id": user.id, "display_name": user.email or "Event creator"},
        on_conflict="id",
        ignore_duplicates=True,
    ).execute()

    created = (
        db.table("events")
        .insert(
            {
                "title": title,
                "description": body.description.strip() or None if body.description else None,
                "location": body.location.strip() or None if body.location else None,
                "starts_at": body.starts_at.isoformat() if body.starts_at else None,
                "ends_at": body.ends_at.isoformat() if body.ends_at else None,
                "created_by": user.id,
            }
        )
        .execute()
        .data[0]
    )

    member_ids = [user.id, *[target for target, accepted in targets.items() if accepted]]
    try:
        db.table("event_members").insert(
            [{"event_id": created["id"], "user_id": member_id} for member_id in member_ids]
        ).execute()
        invitations = [
            {"event_id": created["id"], "inviter_id": user.id, "invitee_id": target}
            for target, accepted in targets.items()
            if not accepted
        ]
        if invitations:
            db.table("event_invites").insert(invitations).execute()
    except Exception:
        db.table("events").delete().eq("id", created["id"]).execute()
        raise

    return Event(**created, member_ids=[UUID(member_id) for member_id in member_ids])


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


@router.put("/{event_id}", response_model=EventDetail)
def update_event(
    event_id: UUID,
    body: EventUpdate,
    user: CurrentUserDep,
    repo: EventInvitesRepoDep,
    friends: FriendsRepoDep,
) -> EventDetail:
    """Edit event details. Membership, expenses and photos are preserved."""
    event = get_member_event(repo, event_id, user.id)
    if event["created_by"] != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the event's host can edit it.")
    title = body.title.strip()
    if not title:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Event title cannot be blank.")
    values = body.model_dump(mode="json")
    values["title"] = title
    values["description"] = body.description.strip() or None if body.description else None
    values["location"] = body.location.strip() or None if body.location else None
    repo.update_event(str(event_id), user.id, values)
    return get_event(event_id, user, repo, friends)


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
