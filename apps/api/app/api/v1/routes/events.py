from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.schemas.event import Event, EventCreate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[Event])
def list_events(user: CurrentUserDep) -> list[Event]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(body: EventCreate, user: CurrentUserDep) -> Event:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/{event_id}", response_model=Event)
def get_event(event_id: UUID, user: CurrentUserDep) -> Event:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
