from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class FriendUser(BaseModel):
    id: UUID
    username: str


class Friendship(BaseModel):
    """A friend or pending request, seen from the current user's side."""

    id: UUID
    user: FriendUser
    status: Literal["pending", "accepted"]
    created_at: datetime
    accepted_at: datetime | None = None


class FriendsOverview(BaseModel):
    friends: list[Friendship]
    incoming: list[Friendship]
    outgoing: list[Friendship]


class FriendRequestCreate(BaseModel):
    username: str
