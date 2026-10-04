from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class EventUser(BaseModel):
    id: UUID
    username: str | None

    @classmethod
    def lookup(cls, profiles: dict[str, dict[str, Any]], user_id: str) -> "EventUser":
        profile = profiles.get(user_id)
        return cls(id=user_id, username=profile.get("username") if profile else None)


class EventSummary(BaseModel):
    id: UUID
    title: str
    starts_at: datetime | None = None


class InviteCreate(BaseModel):
    user_id: UUID


class EventInvite(BaseModel):
    """A pending invite as seen by members of the event."""

    id: UUID
    user: EventUser
    invited_by: EventUser
    created_at: datetime


class IncomingInvite(BaseModel):
    """A pending invite as seen by the person invited."""

    id: UUID
    event: EventSummary
    invited_by: EventUser
    created_at: datetime


class EventDetail(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    starts_at: datetime | None = None
    created_by: UUID
    created_at: datetime
    members: list[EventUser]
    invites: list[EventInvite]
