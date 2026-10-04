from typing import Literal
from uuid import UUID

from pydantic import BaseModel

ContactKind = Literal["instagram", "snapchat", "whatsapp", "etransfer_email", "etransfer_phone"]
CONTACT_KINDS: tuple[ContactKind, ...] = (
    "instagram",
    "snapchat",
    "whatsapp",
    "etransfer_email",
    "etransfer_phone",
)


class Profile(BaseModel):
    id: UUID
    username: str | None = None
    display_name: str


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
    contacts: list[Contact]
