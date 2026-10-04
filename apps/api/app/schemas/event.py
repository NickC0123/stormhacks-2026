from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.person import EventUser
from app.schemas.photo import EventPhotoPreview


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    starts_at: datetime | None = None
    member_ids: list[UUID] = []


class Event(EventCreate):
    id: UUID
    created_by: UUID
    created_at: datetime


class EventHomeItem(BaseModel):
    """Event row for the home feed, with members and photo previews."""

    id: UUID
    title: str
    description: str | None = None
    starts_at: datetime | None = None
    created_by: UUID
    created_at: datetime
    photo_count: int = 0
    preview_photos: list[EventPhotoPreview] = []
    members: list[EventUser] = []
