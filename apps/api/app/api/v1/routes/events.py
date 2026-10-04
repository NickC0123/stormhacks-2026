from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.db.supabase import get_supabase
from app.schemas.event import Event, EventCreate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[Event])
def list_events(user: CurrentUserDep) -> list[Event]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


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


@router.get("/{event_id}", response_model=Event)
def get_event(event_id: UUID, user: CurrentUserDep) -> Event:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
