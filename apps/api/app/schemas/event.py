from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    starts_at: datetime | None = None
    member_ids: list[UUID] = []


class Event(EventCreate):
    id: UUID
    created_by: UUID
    created_at: datetime
