"""iOS system accent names stored on profiles for initials avatars."""

from __future__ import annotations

import hashlib
import random
from typing import Final, Literal

AvatarColor = Literal[
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
    "yellow",
    "green",
    "mint",
    "teal",
    "cyan",
    "indigo",
    "brown",
]

AVATAR_COLORS: Final[tuple[AvatarColor, ...]] = (
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
    "yellow",
    "green",
    "mint",
    "teal",
    "cyan",
    "indigo",
    "brown",
)


def random_avatar_color() -> AvatarColor:
    return random.choice(AVATAR_COLORS)


def avatar_color_for_user(user_id: str) -> AvatarColor:
    """Stable fallback when a profile row is missing or has no color yet."""
    digest = hashlib.md5(user_id.encode("utf-8")).digest()
    return AVATAR_COLORS[digest[0] % len(AVATAR_COLORS)]


def coerce_avatar_color(value: object | None, *, user_id: str) -> AvatarColor:
    if isinstance(value, str) and value in AVATAR_COLORS:
        return value  # type: ignore[return-value]
    return avatar_color_for_user(user_id)
