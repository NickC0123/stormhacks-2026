from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.core.avatar_color import AvatarColor, coerce_avatar_color


class EventUser(BaseModel):
    id: UUID
    username: str | None
    avatar_color: AvatarColor

    @classmethod
    def lookup(cls, profiles: dict[str, dict[str, Any]], user_id: str) -> "EventUser":
        profile = profiles.get(user_id)
        return cls(
            id=user_id,
            username=profile.get("username") if profile else None,
            avatar_color=coerce_avatar_color(
                profile.get("avatar_color") if profile else None,
                user_id=user_id,
            ),
        )

    @classmethod
    def from_profile(cls, profile: dict[str, Any]) -> "EventUser":
        user_id = str(profile["id"])
        return cls(
            id=user_id,
            username=profile.get("username"),
            avatar_color=coerce_avatar_color(profile.get("avatar_color"), user_id=user_id),
        )
