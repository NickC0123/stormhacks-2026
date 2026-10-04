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
