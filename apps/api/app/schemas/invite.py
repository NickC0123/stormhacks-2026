from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    model_config = ConfigDict(extra="forbid")

    user_id: UUID | None = None
    username: str | None = Field(default=None, max_length=21)

    @model_validator(mode="after")
    def one_person(self) -> "InviteCreate":
        if (self.user_id is None) == (self.username is None):
            raise ValueError("Provide either a user ID or a username")
        return self


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


class PersonAdded(BaseModel):
    status: Literal["added", "invited"]
    user: EventUser
    invite: EventInvite | None = None


class ExpenseSummary(BaseModel):
    id: UUID
    title: str


class IncomingExpenseInvite(BaseModel):
    id: UUID
    expense: ExpenseSummary
    invited_by: EventUser
    created_at: datetime


class ExpensePeople(BaseModel):
    created_by: UUID
    members: list[EventUser]
    invites: list[EventInvite]
