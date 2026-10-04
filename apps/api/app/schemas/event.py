from datetime import datetime
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, Field, model_validator

from app.schemas.person import EventUser
from app.schemas.photo import EventPhotoPreview


class EventFields(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    location: str | None = Field(default=None, max_length=500)
    starts_at: AwareDatetime | None = None
    ends_at: AwareDatetime | None = None

    @model_validator(mode="after")
    def valid_schedule(self) -> "EventFields":
        if self.ends_at and (not self.starts_at or self.ends_at <= self.starts_at):
            raise ValueError("End time must be after the start time.")
        return self


class EventCreate(EventFields):
    member_ids: list[UUID] = Field(default_factory=list, max_length=50)
    invite_usernames: list[str] = Field(default_factory=list, max_length=50)


class EventUpdate(EventFields):
    model_config = {"extra": "forbid"}


class Event(EventFields):
    member_ids: list[UUID] = Field(default_factory=list)
    id: UUID
    created_by: UUID
    created_at: datetime


class EventHomeItem(BaseModel):
    """Event row for the home feed, with members and photo previews."""

    id: UUID
    title: str
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    location: str | None = None
    created_by: UUID
    created_at: datetime
    photo_count: int = 0
    preview_photos: list[EventPhotoPreview] = []
    members: list[EventUser] = []
