import re
from typing import Any

from app.schemas.profile import (
    CONTACT_KINDS,
    Contact,
    ContactKind,
    ContactSetting,
    ContactSettings,
)

HANDLE_PATTERN = re.compile(r"^[A-Za-z0-9._]{1,30}$")
FACEBOOK_PATTERN = re.compile(r"^[A-Za-z0-9.]{5,50}$")
FACEBOOK_URL_PREFIX = re.compile(r"^(https?://)?(www\.|m\.)?facebook\.com/", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9 ()-]{5,22}[0-9]$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_LENGTH = 100

LABELS: dict[ContactKind, str] = {
    "instagram": "Instagram",
    "facebook": "Facebook",
    "whatsapp": "WhatsApp",
    "etransfer_email": "E-transfer email",
    "etransfer_phone": "E-transfer phone",
}

Row = dict[str, Any]


def normalize_contact(kind: ContactKind, raw: str | None) -> str | None:
    """Trim and validate one contact value; blank means unset.

    Raises ValueError with a user-facing message.
    """
    value = (raw or "").strip()
    if not value:
        return None
    label = LABELS[kind]
    if kind == "instagram":
        value = value.removeprefix("@")
        if not HANDLE_PATTERN.fullmatch(value):
            raise ValueError(
                f"{label} usernames are up to 30 letters, numbers, periods, or underscores."
            )
    elif kind == "facebook":
        value = FACEBOOK_URL_PREFIX.sub("", value).removeprefix("@").rstrip("/")
        if not FACEBOOK_PATTERN.fullmatch(value):
            raise ValueError(f"{label} usernames are 5-50 letters, numbers, or periods.")
    elif kind in ("whatsapp", "etransfer_phone"):
        if not PHONE_PATTERN.fullmatch(value):
            raise ValueError(f"{label} must be a phone number, like +1 604 555 0123.")
    elif len(value) > MAX_LENGTH or not EMAIL_PATTERN.fullmatch(value):
        raise ValueError(f"{label} must be an email address.")
    return value


def to_columns(settings: ContactSettings) -> Row:
    """Profile columns for a contacts update. Kinds left out of the request are cleared."""
    by_kind = {setting.kind: setting for setting in settings.contacts}
    columns: Row = {}
    visible: list[str] = []
    for kind in CONTACT_KINDS:
        setting = by_kind.get(kind)
        value = normalize_contact(kind, setting.value if setting else None)
        columns[kind] = value
        if value and setting and setting.visible:
            visible.append(kind)
    columns["visible_contacts"] = visible
    return columns


def own_contacts(profile: Row | None) -> ContactSettings:
    profile = profile or {}
    visible = set(profile.get("visible_contacts") or [])
    return ContactSettings(
        contacts=[
            ContactSetting(kind=kind, value=profile.get(kind), visible=kind in visible)
            for kind in CONTACT_KINDS
        ]
    )


def shown_contacts(profile: Row) -> list[Contact]:
    """Only the contacts the owner chose to show and actually filled in."""
    visible = set(profile.get("visible_contacts") or [])
    return [
        Contact(kind=kind, value=profile[kind])
        for kind in CONTACT_KINDS
        if kind in visible and profile.get(kind)
    ]
