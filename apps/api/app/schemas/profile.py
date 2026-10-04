from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.core.avatar_color import AvatarColor

ContactKind = Literal["instagram", "facebook", "whatsapp", "etransfer_email", "etransfer_phone"]
CONTACT_KINDS: tuple[ContactKind, ...] = (
    "instagram",
    "facebook",
    "whatsapp",
    "etransfer_email",
    "etransfer_phone",
)


class Profile(BaseModel):
    id: UUID
    username: str | None = None
    display_name: str
    avatar_color: AvatarColor


class UsernameUpdate(BaseModel):
    username: str


class ContactSetting(BaseModel):
    """One of the signed-in user's contact fields. Hidden from others unless `visible`."""

    kind: ContactKind
    value: str | None = None
    visible: bool = False


class ContactSettings(BaseModel):
    contacts: list[ContactSetting]


class Contact(BaseModel):
    kind: ContactKind
    value: str


class PublicProfile(BaseModel):
    """Another user's profile, with only the contacts they chose to show."""

    id: UUID
    username: str | None = None
    avatar_color: AvatarColor
    contacts: list[Contact]
